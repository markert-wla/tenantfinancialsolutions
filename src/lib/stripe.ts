import Stripe from 'stripe'

let _stripe: Stripe | null = null

/** Returns the Stripe client, initializing it lazily. Throws if STRIPE_SECRET_KEY is not set. */
export function getStripe(): Stripe {
  if (!_stripe) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY is not configured')
    }
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2026-03-25.dahlia',
    })
  }
  return _stripe
}

// STRIPE_PRICE_BRONZE / STRIPE_PRICE_SILVER are the legacy env var names for
// these plans (pre-rename); fall back to them so existing deployments keep working.
export const PLAN_PRICE_IDS: Record<string, string | undefined> = {
  starter:   process.env.STRIPE_PRICE_STARTER   ?? process.env.STRIPE_PRICE_BRONZE,
  advantage: process.env.STRIPE_PRICE_ADVANTAGE ?? process.env.STRIPE_PRICE_SILVER,
}

export const SESSION_PRICE_ID = process.env.STRIPE_PRICE_SESSION

// Subscriptions created before the tier rename still carry the old slugs in
// their Stripe metadata, and renewals re-send them on every billing cycle.
const LEGACY_TIER_SLUGS: Record<string, string> = { bronze: 'starter', silver: 'advantage' }

export const VALID_TIERS = ['free', 'starter', 'advantage']

export function normalizeTier(tier: string | null | undefined): string | null {
  if (!tier) return null
  return LEGACY_TIER_SLUGS[tier] ?? tier
}

/** Reverse lookup of PLAN_PRICE_IDS, for subscriptions that carry no tier metadata. */
export function tierFromPriceId(priceId: string | null | undefined): string | null {
  if (!priceId) return null
  for (const [tier, id] of Object.entries(PLAN_PRICE_IDS)) {
    if (id && id === priceId) return tier
  }
  return null
}

/** The tier a subscription represents. Metadata is authoritative — it's what the
 *  webhook writes to profiles — with the price id as a fallback for anything
 *  created outside the app, e.g. by hand in the Stripe dashboard. */
export function tierForSubscription(sub: Stripe.Subscription): string | null {
  return normalizeTier(sub.metadata?.tier) ?? tierFromPriceId(sub.items.data[0]?.price?.id)
}

/** Statuses where the customer is still on the hook for the subscription.
 *  `incomplete` is deliberately excluded: a checkout whose payment never
 *  succeeded expires on its own after ~23h, and counting it as live would lock
 *  the client out of retrying. */
const LIVE_SUB_STATUSES = new Set(['active', 'trialing', 'past_due', 'unpaid', 'paused'])

/** Every subscription this customer is currently paying for. More than one means
 *  they've been double-billed — callers must treat that as an error, not pick one. */
export async function listLiveSubscriptions(
  stripe: Stripe,
  customerId: string
): Promise<Stripe.Subscription[]> {
  const subs = await stripe.subscriptions.list({ customer: customerId, status: 'all', limit: 20 })
  return subs.data.filter(s => LIVE_SUB_STATUSES.has(s.status))
}

/** What a customer is currently paying for, as far as any flow that changes a
 *  plan is concerned.
 *
 *  Every route that could create a subscription must go through this first.
 *  /portal/upgrade grew this guard on its own and /portal/apply-promo didn't,
 *  which let a paying client redeem an affiliate code and end up billed for two
 *  plans at once. Sharing one implementation is what stops that recurring. */
export type PlanChangeTarget =
  /** Nothing live — a Checkout is the correct way to start a subscription. */
  | { kind: 'none' }
  /** Already double-billed. A human has to decide what gets refunded. */
  | { kind: 'duplicate'; detail: string }
  /** Live, but we can't tell which plan it is, so we can't safely swap the price. */
  | { kind: 'unresolvable'; sub: Stripe.Subscription; reason: string }
  /** Live and understood — change the plan in place, never open a Checkout. */
  | { kind: 'current'; sub: Stripe.Subscription; tier: string; item: Stripe.SubscriptionItem }

export async function resolvePlanChangeTarget(
  stripe: Stripe,
  customerId: string
): Promise<PlanChangeTarget> {
  const live = await listLiveSubscriptions(stripe, customerId)

  if (live.length === 0) return { kind: 'none' }
  if (live.length > 1) {
    return { kind: 'duplicate', detail: live.map(s => `${s.id}:${s.status}`).join(', ') }
  }

  const sub  = live[0]
  const tier = tierForSubscription(sub)
  if (!tier) return { kind: 'unresolvable', sub, reason: `unrecognised plan on ${sub.id}` }

  const item = sub.items.data[0]
  if (!item) return { kind: 'unresolvable', sub, reason: `no line items on ${sub.id}` }

  return { kind: 'current', sub, tier, item }
}

/** Single source of truth for monthly session limits per plan tier — imported by
 *  the dashboard, book page, and booking API so they can't drift out of sync. */
export const SESSION_LIMITS: Record<string, number> = {
  free:      1,
  starter:   1,
  advantage: 2,
}
