import type { SupabaseClient } from '@supabase/supabase-js'
import type Stripe from 'stripe'
import { tierForSubscription, VALID_TIERS } from '@/lib/stripe'

/**
 * Writing a Stripe subscription onto a profile, shared by the webhook and the
 * checkout-success reconciliation on the dashboard.
 *
 * Every outcome is reported rather than swallowed. The webhook used to fire
 * the update and move on; when production's STRIPE_WEBHOOK_SECRET was wrong
 * for four months, nothing on our side said so, and a client who paid for
 * Advantage stayed on the free tier until the owner noticed by hand.
 *
 * `retryable` tells the webhook whether to answer Stripe with a 5xx so the
 * event is redelivered (a database error) or a 2xx because retrying can never
 * help (missing metadata, unknown price, no such profile).
 */
export type SyncResult =
  | { ok: true; tier: string; userId: string }
  | { ok: false; reason: string; retryable: boolean }

export async function syncSubscriptionToProfile(
  supabase: SupabaseClient,
  sub: Stripe.Subscription,
  source: string
): Promise<SyncResult> {
  const userId = sub.metadata?.supabase_user_id
  if (!userId) {
    return fail(source, sub.id, 'no supabase_user_id in subscription metadata', false)
  }

  // Metadata first, price id as the fallback. An unresolvable tier is left
  // alone rather than defaulted to 'free' — downgrading a paying client on an
  // event we don't understand is worse than leaving plan_tier where it is.
  const tier = tierForSubscription(sub)
  if (!tier || !VALID_TIERS.includes(tier)) {
    return fail(source, sub.id, `could not resolve a tier (user ${userId}) — plan_tier left unchanged`, false)
  }

  const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer.id

  const { data, error } = await supabase
    .from('profiles')
    .update({
      plan_tier:              tier,
      stripe_subscription_id: sub.id,
      stripe_customer_id:     customerId,
    })
    .eq('id', userId)
    .select('id')

  if (error) {
    return fail(source, sub.id, `profile update failed for user ${userId}: ${error.message}`, true)
  }
  // A filter that matches nothing is not an error to PostgREST, so this is the
  // only way to notice that the metadata points at a profile that doesn't exist.
  if (!data || data.length === 0) {
    return fail(source, sub.id, `no profile row matched user ${userId} — nothing updated`, false)
  }

  console.log(`[stripe-sync] ${source}: user ${userId} → ${tier} (${sub.id})`)
  return { ok: true, tier, userId }
}

function fail(source: string, subId: string, reason: string, retryable: boolean): SyncResult {
  console.error(`[stripe-sync] ${source}: ${subId}: ${reason}${retryable ? ' (will ask Stripe to retry)' : ''}`)
  return { ok: false, reason, retryable }
}

/**
 * Belt-and-braces for the moment a client lands back on the site after paying.
 *
 * The checkout success URL carries Stripe's session id; we look the session
 * up ourselves and apply the same profile write the webhook would. If the
 * webhook already ran this is a harmless repeat; if it never arrives — a bad
 * signing secret, an endpoint someone forgot to subscribe to an event — the
 * client still sees the plan they paid for.
 *
 * Only subscription checkouts are reconciled here. One-off session purchases
 * create bookings and send emails, which the webhook handles idempotently;
 * duplicating that logic on a page load is not worth the risk.
 */
export async function reconcileCheckoutSession(
  stripe: Stripe,
  supabase: SupabaseClient,
  sessionId: string,
  userId: string
): Promise<SyncResult | null> {
  let session: Stripe.Checkout.Session
  try {
    session = await stripe.checkout.sessions.retrieve(sessionId, { expand: ['subscription'] })
  } catch (err) {
    console.error(`[stripe-sync] reconcile: could not retrieve ${sessionId}:`, (err as Error).message)
    return null
  }

  if (session.mode !== 'subscription' || session.payment_status !== 'paid') return null
  const sub = session.subscription
  if (!sub || typeof sub === 'string') return null

  // Only ever sync the signed-in client's own subscription. A session id that
  // belongs to someone else is ignored rather than acted on.
  if (sub.metadata?.supabase_user_id !== userId) {
    console.error(`[stripe-sync] reconcile: ${sessionId} belongs to a different user than ${userId} — ignored`)
    return null
  }

  return syncSubscriptionToProfile(supabase, sub, 'checkout-success')
}
