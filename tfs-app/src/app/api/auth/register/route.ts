import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { getStripe, PLAN_PRICE_IDS } from '@/lib/stripe'
import { sendEmail, ADMIN_EMAIL } from '@/lib/resend'
import { authLimiter, checkRateLimit } from '@/lib/ratelimit'

function esc(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? '')
  .split(',').map(e => e.trim().toLowerCase()).filter(Boolean)

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
    promoCode?: string | null
    unitNumber?: string | null
    birthdayMonth?: number | null
  }

  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const { email, password, firstName, lastName, timezone, tier, promoCode, unitNumber, birthdayMonth } = body

  if (!email || !password || !firstName || !lastName) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }
  if (password.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
  }

  const validTiers = ['free', 'bronze', 'silver', 'gold']
  if (tier && !validTiers.includes(tier)) {
    return NextResponse.json({ error: 'Invalid tier' }, { status: 400 })
  }

  const supabase = createServiceClient()

  // 1. If promo code provided — re-validate server-side and derive tier from DB (never trust client-supplied tier)
  // effectiveTier: promo path uses DB's assigned_tier; Stripe path starts as 'free' (webhook upgrades on payment)
  let effectiveTier = 'free'

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

    effectiveTier = code.assigned_tier

    // Increment uses
    await supabase
      .from('promo_codes')
      .update({ uses_count: code.uses_count + 1 })
      .eq('code', promoCode)
  }
  // For Stripe-paid tiers (no promo code), leave effectiveTier as 'free'.
  // The Stripe webhook sets plan_tier once payment is confirmed.

  // 2. Create Supabase auth user
  const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,   // skip email confirmation for now — adjust if you want verification
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

  // 3. Update profile with full details (trigger creates the base row)
  const isAdmin = ADMIN_EMAILS.includes(email.toLowerCase())
  const profileUpdate: Record<string, any> = {
    first_name: firstName,
    last_name: lastName,
    timezone,
    plan_tier: effectiveTier,
    ...(isAdmin && { role: 'admin' }),
  }
  if (promoCode) profileUpdate.promo_code_used = promoCode
  if (unitNumber) profileUpdate.unit_number = unitNumber
  if (birthdayMonth) profileUpdate.birthday_month = birthdayMonth

  await supabase.from('profiles').update(profileUpdate).eq('id', userId)

  // 4. Stripe subscription (skip for free tier or if no price ID configured)
  let stripeCustomerId: string | null = null
  let stripeSubId: string | null = null

  if (tier && tier !== 'free') {
    const priceId = PLAN_PRICE_IDS[tier]
    if (priceId) {
      try {
        const stripe = getStripe()
        const customer = await stripe.customers.create({
          email,
          name: `${firstName} ${lastName}`,
          metadata: { supabase_user_id: userId },
        })
        stripeCustomerId = customer.id

        const subscription = await stripe.subscriptions.create({
          customer: customer.id,
          items: [{ price: priceId }],
          payment_behavior: 'default_incomplete',
          payment_settings: { save_default_payment_method: 'on_subscription' },
          expand: ['latest_invoice.payment_intent'],
          metadata: { supabase_user_id: userId, tier: tier },
        })
        stripeSubId = subscription.id

        await supabase
          .from('profiles')
          .update({ stripe_customer_id: stripeCustomerId, stripe_subscription_id: stripeSubId })
          .eq('id', userId)
      } catch (stripeErr: any) {
        // Non-fatal at registration — log and continue. Webhook will sync later.
        console.error('[Stripe] Subscription creation failed:', stripeErr.message)
      }
    }
  }

  // 5. Welcome email (stub — fires if Resend is configured)
  await sendEmail({
    to: email,
    subject: 'Welcome to Tenant Financial Solutions!',
    html: `
      <h2>Welcome, ${esc(firstName)}!</h2>
      <p>Your account has been created with the <strong>${esc(effectiveTier)}</strong> plan.</p>
      <p>Log in to access your coaching portal: <a href="${process.env.NEXT_PUBLIC_SITE_URL}/login">Sign In</a></p>
      <p>We're excited to be part of your financial journey.<br/>— The TFS Team</p>
    `,
  })

  return NextResponse.json({ ok: true })
}
