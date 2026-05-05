import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { getStripe, PLAN_PRICE_IDS } from '@/lib/stripe'

const NEXT_TIER: Record<string, string | undefined> = {
  free:   'bronze',
  bronze: 'silver',
}

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const service  = createServiceClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: { code?: string }
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const code = body.code?.trim().toUpperCase()
  if (!code) return NextResponse.json({ error: 'Promo code is required' }, { status: 400 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('plan_tier, promo_code_used, stripe_customer_id')
    .eq('id', user.id)
    .single()

  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

  const { data: promoCode, error: codeErr } = await supabase
    .from('promo_codes')
    .select('code, assigned_tier, code_type, discount_percent, is_active, uses_count, max_uses, expires_at, partner_id')
    .eq('code', code)
    .single()

  if (codeErr || !promoCode) {
    return NextResponse.json({ error: 'Invalid promo code.' }, { status: 400 })
  }
  if (!promoCode.is_active || promoCode.uses_count >= promoCode.max_uses) {
    return NextResponse.json({ error: 'This promo code is no longer available.' }, { status: 400 })
  }
  if (promoCode.expires_at && new Date(promoCode.expires_at) < new Date()) {
    return NextResponse.json({ error: 'This promo code has expired.' }, { status: 400 })
  }

  const isPaid = profile.plan_tier !== 'free'

  // Affiliate discount codes → Stripe checkout with coupon
  if (promoCode.code_type === 'affiliate_discount') {
    const discountPercent = promoCode.discount_percent
    if (!discountPercent) {
      return NextResponse.json({ error: 'Invalid discount code.' }, { status: 400 })
    }

    // Determine which tier to charge for
    let targetTier: string
    if (promoCode.assigned_tier) {
      targetTier = promoCode.assigned_tier
    } else {
      // "all tiers" — pick next tier up from current plan
      const next = NEXT_TIER[profile.plan_tier]
      if (!next) {
        return NextResponse.json({ error: 'You are already on the highest plan.' }, { status: 400 })
      }
      targetTier = next
    }

    if (targetTier === profile.plan_tier) {
      return NextResponse.json({ error: 'You are already on this plan.' }, { status: 400 })
    }

    const priceId = PLAN_PRICE_IDS[targetTier]
    if (!priceId) {
      return NextResponse.json({ error: 'Plan not configured.' }, { status: 400 })
    }

    let stripe: ReturnType<typeof getStripe>
    try { stripe = getStripe() } catch {
      return NextResponse.json({ error: 'Payment system not configured.' }, { status: 500 })
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? ''

    let customerId = profile.stripe_customer_id
    if (!customerId) {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      const customer = await stripe.customers.create({
        email: authUser?.email,
        metadata: { supabase_user_id: user.id },
      })
      customerId = customer.id
      await service.from('profiles').update({ stripe_customer_id: customerId }).eq('id', user.id)
    }

    const couponId = `tfs-affiliate-${discountPercent}pct`
    try {
      await stripe.coupons.retrieve(couponId)
    } catch {
      await stripe.coupons.create({
        id:          couponId,
        percent_off: discountPercent,
        duration:    'once',
        name:        `TFS Affiliate ${discountPercent}% First Month`,
      })
    }

    const session = await stripe.checkout.sessions.create({
      customer:   customerId,
      mode:       'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${siteUrl}/portal/dashboard?welcome=1`,
      cancel_url:  `${siteUrl}/portal/billing`,
      subscription_data: {
        metadata: { supabase_user_id: user.id, tier: targetTier },
      },
      discounts: [{ coupon: couponId }],
    })

    // Increment uses now (payment confirmed via webhook later)
    await service
      .from('promo_codes')
      .update({ uses_count: promoCode.uses_count + 1 })
      .eq('code', code)

    await service
      .from('profiles')
      .update({ promo_code_used: code, ...(promoCode.partner_id ? { partner_id: promoCode.partner_id } : {}) })
      .eq('id', user.id)

    return NextResponse.json({ ok: true, checkoutUrl: session.url })
  }

  // Non-discount codes (tier_assignment, full_comp, group_comp) — only for free users
  if (isPaid) {
    return NextResponse.json({ error: 'This code type can only be applied to free accounts.' }, { status: 400 })
  }

  const profilePatch: Record<string, unknown> = {
    plan_tier:         promoCode.assigned_tier,
    promo_code_used:   code,
    applied_code_type: promoCode.code_type,
    promo_expires_at:  promoCode.expires_at ?? null,
  }
  if (promoCode.partner_id) profilePatch.partner_id = promoCode.partner_id

  const { error: updateErr } = await service
    .from('profiles')
    .update(profilePatch)
    .eq('id', user.id)

  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 })

  await service
    .from('promo_codes')
    .update({ uses_count: promoCode.uses_count + 1 })
    .eq('code', code)

  return NextResponse.json({ ok: true, newTier: promoCode.assigned_tier })
}
