import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { getStripe, PLAN_PRICE_IDS } from '@/lib/stripe'
import { sendEmail } from '@/lib/resend'
import { brandedEmail, emailButton } from '@/lib/email-template'
import { authLimiter, checkRateLimit } from '@/lib/ratelimit'

function esc(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? '')
  .split(',').map(e => e.trim().toLowerCase()).filter(Boolean)

const VALID_CLIENT_TYPES = ['individual', 'couple', 'property_tenant', 'nonprofit_individual'] as const
type ClientType = typeof VALID_CLIENT_TYPES[number]

const TIER_DISPLAY: Record<string, string> = {
  free:   'Free',
  bronze: 'Starter Plan',
  silver: 'Advantage Plan',
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') ?? '127.0.0.1'
  const { allowed } = await checkRateLimit(authLimiter, ip)
  if (!allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  let body: {
    email: string
    password: string
    firstName: string
    lastName: string
    partnerFirstName?: string | null
    partnerLastName?: string | null
    timezone: string
    tier: string
    clientType?: ClientType
    promoCode?: string | null
    unitNumber?: string | null
    birthdayMonth?: number | null
    anniversaryMonth?: number | null
    coachId?: string | null
  }

  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const { email, password, firstName, lastName, partnerFirstName, partnerLastName, timezone, tier, clientType, promoCode, unitNumber, birthdayMonth, anniversaryMonth, coachId } = body

  if (!email || !password || !firstName || !lastName) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 })
  }
  if (password.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
  }

  const validTiers = ['free', 'bronze', 'silver']
  if (tier && !validTiers.includes(tier)) {
    return NextResponse.json({ error: 'Invalid tier' }, { status: 400 })
  }

  const supabase = createServiceClient()

  // 1. Validate promo code server-side if provided
  let effectiveTier = (tier && ['free', 'bronze', 'silver'].includes(tier)) ? tier : 'free'
  let codeType = 'tier_assignment'
  let discountPercent: number | null = null
  let promoPartnerId: string | null = null

  if (promoCode) {
    const { data: code, error: codeErr } = await supabase
      .from('promo_codes')
      .select('*')
      .eq('code', promoCode)
      .single()

    if (codeErr || !code || !code.is_active || code.uses_count >= code.max_uses) {
      return NextResponse.json({ error: 'Promo code is invalid or fully used' }, { status: 400 })
    }
    if (code.expires_at && new Date(code.expires_at) < new Date()) {
      return NextResponse.json({ error: 'Promo code has expired' }, { status: 400 })
    }

    // null assigned_tier means "all tiers" — keep the user's chosen tier
    effectiveTier   = code.assigned_tier ?? effectiveTier
    codeType        = code.code_type ?? 'tier_assignment'
    discountPercent = code.discount_percent ?? null
    promoPartnerId  = code.partner_id ?? null

    await supabase
      .from('promo_codes')
      .update({ uses_count: code.uses_count + 1 })
      .eq('code', promoCode)
  }

  // Determine whether this signup requires Stripe checkout.
  // Affiliate discount codes bill normally (with coupon). All other promo codes grant
  // tier access directly — no checkout. Free signups have no Stripe flow at all.
  const billedTier = codeType === 'affiliate_discount' ? effectiveTier : (promoCode ? 'free' : (tier ?? 'free'))

  // 2. Create Supabase auth user
  const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      first_name: firstName,
      last_name: lastName,
      role: ADMIN_EMAILS.includes(email.toLowerCase()) ? 'admin' : 'client',
      plan_tier: billedTier !== 'free' ? 'free' : effectiveTier,
      client_type: (clientType && VALID_CLIENT_TYPES.includes(clientType)) ? clientType : 'individual',
      timezone: timezone || 'America/New_York',
    },
  })

  if (authErr || !authData.user) {
    if (authErr?.message?.toLowerCase().includes('already')) {
      return NextResponse.json({ error: 'An account with this email already exists.' }, { status: 409 })
    }
    return NextResponse.json({ error: authErr?.message ?? 'Registration failed' }, { status: 500 })
  }

  const userId = authData.user.id
  const isAdmin = ADMIN_EMAILS.includes(email.toLowerCase())

  // 3. Build profile update
  // For paid checkouts (billedTier !== 'free'), set plan_tier to 'free' initially.
  // The webhook updates it to the paid tier once payment is confirmed.
  // Comp/tier_assignment codes grant the tier directly (billedTier === 'free') — keep effectiveTier.
  const profileUpdate: Record<string, unknown> = {
    first_name: firstName,
    last_name:  lastName,
    timezone,
    plan_tier:  billedTier !== 'free' ? 'free' : effectiveTier,
    ...(isAdmin && { role: 'admin' }),
  }

  const resolvedClientType: ClientType = (clientType && VALID_CLIENT_TYPES.includes(clientType))
    ? clientType
    : 'individual'
  profileUpdate.client_type = resolvedClientType

  // Set free trial window — applies to free tier and paid-pending-checkout (they're free until payment clears)
  if (billedTier !== 'free' || effectiveTier === 'free') {
    const trialExpiry = new Date()
    trialExpiry.setDate(trialExpiry.getDate() + 30)
    profileUpdate.free_trial_expires_at = trialExpiry.toISOString()
  }

  if (promoCode)        profileUpdate.promo_code_used   = promoCode
  if (promoPartnerId)   profileUpdate.partner_id         = promoPartnerId
  if (unitNumber)       profileUpdate.unit_number        = unitNumber
  if (coachId) {
    const { data: coachExists } = await supabase.from('coaches').select('id').eq('id', coachId).eq('is_active', true).single()
    if (coachExists) profileUpdate.coach_id = coachId
  }
  if (birthdayMonth)    profileUpdate.birthday_month     = birthdayMonth
  if (partnerFirstName) profileUpdate.partner_first_name = partnerFirstName
  if (partnerLastName)  profileUpdate.partner_last_name  = partnerLastName
  if (anniversaryMonth) profileUpdate.anniversary_month  = anniversaryMonth

  const { error: profileErr } = await supabase.from('profiles').update(profileUpdate).eq('id', userId)
  if (profileErr) console.error('[Register] Profile update failed:', profileErr.message, profileErr.details, profileErr.hint)

  // 4. Stripe — only for paid checkouts
  let checkoutUrl: string | undefined

  if (billedTier !== 'free') {
    const priceId = PLAN_PRICE_IDS[billedTier]
    if (priceId) {
      try {
        const stripe   = getStripe()
        const siteUrl  = process.env.NEXT_PUBLIC_SITE_URL ?? ''

        const customer = await stripe.customers.create({
          email,
          name: `${firstName} ${lastName}`,
          metadata: { supabase_user_id: userId },
        })

        // Save customer ID now; subscription ID arrives via webhook after payment
        const { error: custErr } = await supabase
          .from('profiles')
          .update({ stripe_customer_id: customer.id })
          .eq('id', userId)
        if (custErr) {
          console.error('[Stripe] Customer ID save failed:', custErr.message)
        } else {
          console.log('[Stripe] Customer created:', customer.id, 'for user:', userId)
        }

        let stripeCouponId: string | undefined
        if (codeType === 'affiliate_discount' && discountPercent) {
          const couponId = `tfs-affiliate-${discountPercent}pct`
          try {
            await stripe.coupons.retrieve(couponId)
          } catch {
            await stripe.coupons.create({
              id: couponId,
              percent_off: discountPercent,
              duration: 'once',
              name: `TFS Affiliate ${discountPercent}% First Month`,
            })
          }
          stripeCouponId = couponId
        }

        const session = await stripe.checkout.sessions.create({
          customer: customer.id,
          mode: 'subscription',
          line_items: [{ price: priceId, quantity: 1 }],
          success_url: `${siteUrl}/portal/dashboard?welcome=1`,
          cancel_url:  `${siteUrl}/api/auth/cancel-checkout?uid=${userId}`,
          subscription_data: {
            metadata: { supabase_user_id: userId, tier: billedTier },
          },
          ...(stripeCouponId ? { discounts: [{ coupon: stripeCouponId }] } : {}),
        })

        if (session.url) {
          checkoutUrl = session.url
          console.log('[Stripe] Checkout session created:', session.id, 'for user:', userId)
        }
      } catch (stripeErr: unknown) {
        console.error('[Stripe] Checkout session creation failed:', (stripeErr as Error).message)
      }
    }
  }

  // 5. Welcome email
  const tierDisplay = TIER_DISPLAY[effectiveTier] ?? effectiveTier
  await sendEmail({
    to: email,
    subject: 'Welcome to Tenant Financial Solutions!',
    html: brandedEmail(`
      <h1 style="margin:0 0 8px;font-family:Georgia,serif;font-size:24px;color:#1A2B4A;">Welcome, ${esc(firstName)}!</h1>
      ${checkoutUrl
        ? `<p style="margin:0 0 16px;color:#6B7E8F;">Your account has been created. Complete your payment below to activate your <strong style="color:#1A2B4A;">${esc(tierDisplay)}</strong> membership.</p>
           <p style="margin:0 0 24px;color:#6B7E8F;">Once payment is processed, you&rsquo;ll have full access to schedule coaching sessions and join group sessions.</p>
           ${emailButton(checkoutUrl, 'Complete Payment')}`
        : `<p style="margin:0 0 16px;color:#6B7E8F;">Your account has been created with the <strong style="color:#1A2B4A;">${esc(tierDisplay)}</strong> plan.</p>
           ${effectiveTier === 'free'
             ? `<p style="margin:0 0 24px;color:#6B7E8F;">Your free Connection Session and group session access are ready &mdash; log in and book your first session.</p>`
             : `<p style="margin:0 0 24px;color:#6B7E8F;">Your membership is active. Log in to schedule your coaching sessions and start your financial journey.</p>`
           }
           ${emailButton(`${process.env.NEXT_PUBLIC_SITE_URL}/portal/dashboard`, 'Go to My Portal')}`
      }
      <p style="margin:24px 0 0;font-size:13px;color:#6B7E8F;">We&rsquo;re excited to be part of your financial journey.<br/>— The TFS Team</p>
    `),
  })

  return NextResponse.json({ ok: true, ...(checkoutUrl ? { checkoutUrl } : {}) })
}
