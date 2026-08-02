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

/** Single source of truth for monthly session limits per plan tier — imported by
 *  the dashboard, book page, and booking API so they can't drift out of sync. */
export const SESSION_LIMITS: Record<string, number> = {
  free:      1,
  starter:   1,
  advantage: 2,
}
