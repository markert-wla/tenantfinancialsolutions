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

/** Single source of truth for monthly session limits per plan tier — imported by
 *  the dashboard, book page, and booking API so they can't drift out of sync. */
export const SESSION_LIMITS: Record<string, number> = {
  free:      1,
  starter:   1,
  advantage: 2,
}
