import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { getStripe, PLAN_PRICE_IDS, resolvePlanChangeTarget, type PlanChangeTarget } from '@/lib/stripe'

const NEXT_TIER: Record<string, string | undefined> = {
  free:   'starter',
  starter: 'advantage',
}

const CONTACT_SUPPORT =
  'Please contact support at michael@tenantfinancialsolutions.com before changing plans.'

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

  const { data: promoCode, error: codeErr } = await service
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

  // Affiliate discount codes → a paid plan, with the coupon applied.
  if (promoCode.code_type === 'affiliate_discount') {
    const discountPercent = promoCode.discount_percent
    if (!discountPercent) {
      return NextResponse.json({ error: 'Invalid discount code.' }, { status: 400 })
    }

    let stripe: ReturnType<typeof getStripe>
    try { stripe = getStripe() } catch {
      return NextResponse.json({ error: 'Payment system not configured.' }, { status: 500 })
    }

    const existingCustomerId = profile.stripe_customer_id

    // Stripe — not the profile — decides what they're already paying for. A
    // dropped webhook leaves plan_tier stale, and a stale 'free' here used to be
    // enough to open a second Checkout alongside a live subscription.
    const target: PlanChangeTarget = existingCustomerId
      ? await resolvePlanChangeTarget(stripe, existingCustomerId)
      : { kind: 'none' }

    if (target.kind === 'duplicate') {
      console.error(
        `[apply-promo] multiple live subscriptions for ${existingCustomerId} (user ${user.id}): ${target.detail}`
      )
      return NextResponse.json(
        { error: `Your account has more than one active subscription, so we've stopped this change to avoid charging you again. ${CONTACT_SUPPORT}` },
        { status: 409 }
      )
    }

    if (target.kind === 'unresolvable') {
      console.error(`[apply-promo] ${target.reason} for ${existingCustomerId} (user ${user.id})`)
      return NextResponse.json(
        { error: `We couldn't verify your current plan. ${CONTACT_SUPPORT}` },
        { status: 409 }
      )
    }

    const currentTier = target.kind === 'current' ? target.tier : profile.plan_tier

    // Determine which tier to charge for
    let targetTier: string
    if (promoCode.assigned_tier) {
      targetTier = promoCode.assigned_tier
    } else {
      // "all tiers" — pick next tier up from current plan
      const next = NEXT_TIER[currentTier]
      if (!next) {
        return NextResponse.json({ error: 'You are already on the highest plan.' }, { status: 400 })
      }
      targetTier = next
    }

    if (targetTier === currentTier) {
      return NextResponse.json({ error: 'You are already on this plan.' }, { status: 400 })
    }

    const priceId = PLAN_PRICE_IDS[targetTier]
    if (!priceId) {
      return NextResponse.json({ error: 'Plan not configured.' }, { status: 400 })
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

    const redeemCode = () =>
      service.from('promo_codes').update({ uses_count: promoCode.uses_count + 1 }).eq('code', code)

    const partnerPatch = promoCode.partner_id ? { partner_id: promoCode.partner_id } : {}

    // ---- Already subscribed: change the plan in place, never open a Checkout ----
    if (target.kind === 'current') {
      const updated = await stripe.subscriptions.update(target.sub.id, {
        items: [{ id: target.item.id, price: priceId }],
        discounts: [{ coupon: couponId }],
        proration_behavior: 'create_prorations',
        // Redeeming a code means they intend to keep the service.
        cancel_at_period_end: false,
        // customer.subscription.updated reads the tier off metadata; leaving it
        // stale would revert plan_tier on the next billing cycle.
        metadata: { ...target.sub.metadata, supabase_user_id: user.id, tier: targetTier },
      })

      await service
        .from('profiles')
        .update({
          plan_tier:              targetTier,
          stripe_subscription_id: updated.id,
          stripe_customer_id:     existingCustomerId,
          promo_code_used:        code,
          ...partnerPatch,
        })
        .eq('id', user.id)

      await redeemCode()

      return NextResponse.json({ ok: true, switched: true, newTier: targetTier })
    }

    // ---- No live subscription: first-time purchase, Checkout is correct ----
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? ''

    let customerId = existingCustomerId
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { supabase_user_id: user.id },
      })
      customerId = customer.id
      await service.from('profiles').update({ stripe_customer_id: customerId }).eq('id', user.id)
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
    await redeemCode()

    await service
      .from('profiles')
      .update({ promo_code_used: code, ...partnerPatch })
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
