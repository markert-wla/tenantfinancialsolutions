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

export const PLAN_PRICE_IDS: Record<string, string | undefined> = {
  bronze: process.env.STRIPE_PRICE_BRONZE,
  silver: process.env.STRIPE_PRICE_SILVER,
  gold:   process.env.STRIPE_PRICE_GOLD,
}

export const SESSION_PRICE_ID = process.env.STRIPE_PRICE_SESSION

export const PLAN_SESSION_LIMITS: Record<string, number> = {
  free:   0,
  bronze: 1,
  silver: 2,
  gold:   4,
}
