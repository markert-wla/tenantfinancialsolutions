import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import {
  getStripe,
  PLAN_PRICE_IDS,
  listLiveSubscriptions,
  tierForSubscription,
} from '@/lib/stripe'

/** Mid-cycle plan changes bill the difference on the next invoice instead of
 *  charging straight away — that's what /portal/billing promises the client
 *  ("Changes take effect at the start of your next billing cycle"). */
const PRORATION_BEHAVIOR = 'create_prorations' as const

const CONTACT_SUPPORT =
  'Please contact support at michael@tenantfinancialsolutions.com before changing plans.'

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: { tier: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const { tier } = body
  if (!['starter', 'advantage'].includes(tier)) {
    return NextResponse.json({ error: 'Invalid tier' }, { status: 400 })
  }

  const priceId = PLAN_PRICE_IDS[tier]
  if (!priceId) {
    return NextResponse.json({ error: 'Plan not configured' }, { status: 400 })
  }

  const service = createServiceClient()
  const { data: profile } = await service
    .from('profiles')
    .select('first_name, last_name, email, plan_tier, stripe_customer_id')
    .eq('id', user.id)
    .single()

  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

  let stripe: ReturnType<typeof getStripe>
  try {
    stripe = getStripe()
  } catch (err: unknown) {
    console.error('[upgrade] Stripe init failed:', (err as Error).message)
    return NextResponse.json({ error: 'Payment system not configured' }, { status: 500 })
  }

  /** Keep profiles in step with Stripe without waiting on the webhook. A dropped
   *  delivery used to leave plan_tier stale, which is how a client could be shown
   *  an upgrade button for a plan they were already paying for and buy it twice. */
  async function syncProfile(subId: string | null, customerId: string) {
    await service
      .from('profiles')
      .update({
        plan_tier:              tier,
        stripe_subscription_id: subId,
        stripe_customer_id:     customerId,
      })
      .eq('id', user!.id)
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? ''

  try {
    let customerId = profile.stripe_customer_id

    // ---- Guard: never open a second Checkout for someone Stripe already bills ----
    if (customerId) {
      const live = await listLiveSubscriptions(stripe, customerId)

      if (live.length > 1) {
        // The state this guard exists to prevent. Don't touch anything — a human
        // has to decide which subscription survives and which gets refunded.
        console.error(
          `[upgrade] ${live.length} live subscriptions for ${customerId} (user ${user.id}): ` +
          live.map(s => `${s.id}:${s.status}`).join(', ')
        )
        return NextResponse.json(
          { error: `Your account has more than one active subscription, so we've stopped this change to avoid charging you again. ${CONTACT_SUPPORT}` },
          { status: 409 }
        )
      }

      const current = live[0]
      if (current) {
        const currentTier = tierForSubscription(current)

        if (!currentTier) {
          // Can't tell what they're paying for, so we can't safely swap the price.
          console.error(`[upgrade] Unrecognised subscription ${current.id} for ${customerId}`)
          return NextResponse.json(
            { error: `We couldn't verify your current plan. ${CONTACT_SUPPORT}` },
            { status: 409 }
          )
        }

        if (currentTier === tier) {
          // Stripe says they already pay for this tier — the profile was just stale.
          await syncProfile(current.id, customerId)
          return NextResponse.json(
            { error: 'You are already subscribed to this plan. Refresh the page to see your current plan.' },
            { status: 400 }
          )
        }

        // A genuine plan change on an existing subscription: swap the price in
        // place. Creating a fresh Checkout here would leave the old subscription
        // running alongside the new one and bill the client for both.
        const item = current.items.data[0]
        if (!item) {
          console.error(`[upgrade] Subscription ${current.id} has no line items`)
          return NextResponse.json({ error: `We couldn't update your plan. ${CONTACT_SUPPORT}` }, { status: 500 })
        }

        const updated = await stripe.subscriptions.update(current.id, {
          items: [{ id: item.id, price: priceId }],
          proration_behavior: PRORATION_BEHAVIOR,
          // Choosing a new plan means they intend to keep the service.
          cancel_at_period_end: false,
          // The webhook reads the tier off subscription metadata; leaving it
          // stale would make customer.subscription.updated revert plan_tier.
          metadata: { ...current.metadata, supabase_user_id: user.id, tier },
        })

        await syncProfile(updated.id, customerId)
        return NextResponse.json({ switched: true, tier })
      }
    }

    // ---- No live subscription: first-time purchase, Checkout is correct ----

    // Comped/promo rows have a paid tier with nothing behind it in Stripe, so
    // the profile is the only thing left to check.
    if (profile.plan_tier === tier) {
      return NextResponse.json({ error: 'Already on this plan' }, { status: 400 })
    }

    if (!customerId) {
      const emailForStripe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email ?? '')
        ? profile.email
        : user.email   // fall back to auth email if profile email is malformed
      const customer = await stripe.customers.create({
        ...(emailForStripe ? { email: emailForStripe } : {}),
        name:  `${profile.first_name} ${profile.last_name}`,
        metadata: { supabase_user_id: user.id },
      })
      customerId = customer.id
      await service.from('profiles').update({ stripe_customer_id: customerId }).eq('id', user.id)
    }

    const session = await stripe.checkout.sessions.create({
      customer:  customerId,
      mode:      'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${siteUrl}/portal/dashboard?welcome=1`,
      cancel_url:  `${siteUrl}/portal/billing`,
      subscription_data: {
        metadata: { supabase_user_id: user.id, tier },
      },
    })

    return NextResponse.json({ checkoutUrl: session.url })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Stripe error'
    console.error('[upgrade] Stripe error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
