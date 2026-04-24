import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { getStripe, PLAN_PRICE_IDS } from '@/lib/stripe'
import { sendEmail } from '@/lib/resend'
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
    timezone: string
    tier: string
    clientType?: ClientType
    promoCode?: string | null
    unitNumber?: string | null
    birthdayMonth?: number | null
  }

  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const { email, password, firstName, lastName, timezone, tier, clientType, promoCode, unitNumber, birthdayMonth } = body

  if (!email || !password || !firstName || !lastName) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
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
  let effectiveTier = 'free'
  let codeType = 'tier_assignment'
  let discountPercent: number | null = null

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

    effectiveTier  = code.assigned_tier
    codeType       = code.code_type ?? 'tier_assignment'
    discountPercent = code.discount_percent ?? null

    await supabase
      .from('promo_codes')
      .update({ uses_count: code.uses_count + 1 })
      .eq('code', promoCode)
  }

  // 2. Create Supabase auth user
  const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      first_name: firstName,
      last_name: lastName,
      role: ADMIN_EMAILS.includes(email.toLowerCase()) ? 'admin' : 'client',
      plan_tier: effectiveTier,
    },
  })

  if (authErr || !authData.user) {
    if (authErr?.message?.includes('already registered')) {
      return NextResponse.json({ error: 'An account with this email already exists.' }, { status: 409 })
    }
    return NextResponse.json({ error: authErr?.message ?? 'Registration failed' }, { status: 500 })
  }

  const userId = authData.user.id
  const isAdmin = ADMIN_EMAILS.includes(email.toLowerCase())

  // 3. Build profile update
  const profileUpdate: Record<string, any> = {
    first_name: firstName,
    last_name:  lastName,
    timezone,
    plan_tier:  effectiveTier,
    ...(isAdmin && { role: 'admin' }),
  }

  // Set client_type — default to 'individual' if not provided
  const resolvedClientType: ClientType = (clientType && VALID_CLIENT_TYPES.includes(clientType))
    ? clientType
    : 'individual'
  profileUpdate.client_type = resolvedClientType

  // Set free trial window for free-tier signups
  if (effectiveTier === 'free') {
    const trialExpiry = new Date()
    trialExpiry.setDate(trialExpiry.getDate() + 30)
    profileUpdate.free_trial_expires_at = trialExpiry.toISOString()
  }

  if (promoCode)    profileUpdate.promo_code_used = promoCode
  if (unitNumber)   profileUpdate.unit_number     = unitNumber
  if (birthdayMonth) profileUpdate.birthday_month = birthdayMonth

  await supabase.from('profiles').update(profileUpdate).eq('id', userId)

  // 4. Stripe subscription
  // Affiliate discount codes: bill normally but apply a coupon for first month
  // All other promo codes (comp, tier_assignment): no billing — access is granted via tier only
  const billedTier = codeType === 'affiliate_discount' ? effectiveTier : (promoCode ? 'free' : (tier ?? 'free'))
  if (billedTier !== 'free') {
    const priceId = PLAN_PRICE_IDS[billedTier]
    if (priceId) {
      try {
        const stripe = getStripe()
        const customer = await stripe.customers.create({
          email,
          name: `${firstName} ${lastName}`,
          metadata: { supabase_user_id: userId },
        })

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

        const subscription = await stripe.subscriptions.create({
          customer: customer.id,
          items: [{ price: priceId }],
          payment_behavior: 'default_incomplete',
          payment_settings: { save_default_payment_method: 'on_subscription' },
          expand: ['latest_invoice.payment_intent'],
          metadata: { supabase_user_id: userId, tier: billedTier },
          ...(stripeCouponId ? { discounts: [{ coupon: stripeCouponId }] } : {}),
        })

        await supabase
          .from('profiles')
          .update({ stripe_customer_id: customer.id, stripe_subscription_id: subscription.id })
          .eq('id', userId)
      } catch (stripeErr: any) {
        console.error('[Stripe] Subscription creation failed:', stripeErr.message)
      }
    }
  }

  // 5. Welcome email
  const tierDisplay = TIER_DISPLAY[effectiveTier] ?? effectiveTier
  await sendEmail({
    to: email,
    subject: 'Welcome to Tenant Financial Solutions!',
    html: `
      <h2>Welcome, ${esc(firstName)}!</h2>
      <p>Your account has been created with the <strong>${esc(tierDisplay)}</strong> plan.</p>
      ${effectiveTier === 'free' ? '<p>Your free Connection Session and group session access are ready to go — log in and book your first session!</p>' : ''}
      <p>Log in to access your coaching portal: <a href="${process.env.NEXT_PUBLIC_SITE_URL}/login">Sign In</a></p>
      <p>We&apos;re excited to be part of your financial journey.<br/>— The TFS Team</p>
    `,
  })

  return NextResponse.json({ ok: true })
}
