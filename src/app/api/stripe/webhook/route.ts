import { NextRequest, NextResponse } from 'next/server'
import { getStripe, listLiveSubscriptions, tierForSubscription, VALID_TIERS } from '@/lib/stripe'
import { syncSubscriptionToProfile } from '@/lib/stripe-sync'
import { createServiceClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/resend'
import { brandedEmail, emailButton } from '@/lib/email-template'
import Stripe from 'stripe'

// Raw body required for Stripe signature verification
export const dynamic = 'force-dynamic'

/**
 * Thrown when a write we depend on failed for a reason a retry could fix (the
 * database was unreachable, Stripe's API timed out). The route answers 500 so
 * Stripe redelivers the event — for up to three days, with each failed attempt
 * visible in the Stripe dashboard. Before this the route answered 200 no
 * matter what happened after signature verification, so a failed write was
 * indistinguishable from a successful one.
 *
 * Deterministic problems (missing metadata, unknown price) are logged and
 * answered 200: retrying would just fail the same way.
 */
class RetryLater extends Error {}

type WriteResult = { error: { message: string } | null }

/** Await a Supabase write and turn a failure into a retry. */
async function mustSucceed(label: string, write: PromiseLike<WriteResult>) {
  const { error } = await write
  if (error) throw new RetryLater(`${label}: ${error.message}`)
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text()
  const sig     = req.headers.get('stripe-signature') ?? ''

  let event: Stripe.Event
  try {
    const stripe = getStripe()
    event = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err: unknown) {
    // Stripe only shows the response body in its own dashboard, so without this
    // a rejected delivery is invisible in the Vercel logs. The usual cause is
    // the endpoint's signing secret not matching STRIPE_WEBHOOK_SECRET — which
    // happens whenever a destination is recreated rather than edited.
    //
    // The id/type below come from an *unverified* payload and are logged purely
    // so a log line can be matched against a delivery in the Stripe dashboard.
    // Nothing downstream reads them.
    let claimed = 'unparseable'
    try {
      const parsed = JSON.parse(rawBody) as { id?: string; type?: string }
      claimed = `${parsed.type ?? 'unknown'} ${parsed.id ?? ''}`.trim()
    } catch { /* body wasn't JSON — leave as unparseable */ }

    // Stripe's message is multi-line; flatten it so each failure is one
    // greppable log line with the diagnostic fields up front.
    const reason = (err as Error).message.replace(/\s+/g, ' ').trim()
    console.error(
      `[webhook] Signature verification FAILED` +
      ` | claimed event: ${claimed}` +
      ` | signature header: ${sig ? 'present' : 'MISSING'}` +
      ` | STRIPE_WEBHOOK_SECRET: ${process.env.STRIPE_WEBHOOK_SECRET ? 'set' : 'NOT SET'}` +
      ` | reason: ${reason}`
    )
    return NextResponse.json({ error: `Webhook Error: ${(err as Error).message}` }, { status: 400 })
  }

  console.log(`[webhook] Received ${event.type} (${event.id})`)

  try {
    await handleEvent(event)
  } catch (err: unknown) {
    if (err instanceof RetryLater) {
      console.error(`[webhook] ${event.type} (${event.id}) NOT applied — ${err.message} — answering 500 so Stripe retries`)
      return NextResponse.json({ error: err.message }, { status: 500 })
    }
    console.error(`[webhook] ${event.type} (${event.id}) threw:`, err)
    return NextResponse.json({ error: 'Webhook handler error' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}

async function handleEvent(event: Stripe.Event) {
  const supabase = createServiceClient()

  switch (event.type) {
    case 'customer.subscription.created':
    case 'customer.subscription.updated': {
      const sub    = event.data.object as Stripe.Subscription
      const result = await syncSubscriptionToProfile(supabase, sub, event.type)
      if (!result.ok && result.retryable) throw new RetryLater(result.reason)
      break
    }

    case 'customer.subscription.deleted': {
      const sub        = event.data.object as Stripe.Subscription
      const customerId = sub.customer as string

      // Ask Stripe what's left before downgrading anyone. Cancelling one of two
      // duplicate subscriptions is a *cleanup*, not a cancellation, and the
      // legacy customer-only match below would read it as the latter and drop a
      // still-paying client to free. Every paid profile whose
      // stripe_subscription_id was never recorded is exposed to that.
      let remaining: Stripe.Subscription[]
      try {
        remaining = await listLiveSubscriptions(getStripe(), customerId)
      } catch (err) {
        // Can't confirm what's left, so take the cautious branch: only touch the
        // profile if it names this exact subscription.
        console.error(`[webhook] could not list subscriptions for ${customerId}:`, err)
        await mustSucceed(
          `downgrade ${customerId} (exact match)`,
          supabase
            .from('profiles')
            .update({ plan_tier: 'free', stripe_subscription_id: null })
            .eq('stripe_customer_id', customerId)
            .eq('stripe_subscription_id', sub.id)
        )
        break
      }

      if (remaining.length > 0) {
        if (remaining.length > 1) {
          console.error(
            `[webhook] ${customerId} still has ${remaining.length} live subscriptions after ${sub.id} ` +
            `was cancelled: ${remaining.map(s => `${s.id}:${s.status}`).join(', ')}`
          )
        }
        // Point the profile at what is actually still billing, which also
        // backfills stripe_subscription_id for rows that never had one.
        const survivor = remaining[0]
        const tier     = tierForSubscription(survivor)
        if (tier && VALID_TIERS.includes(tier)) {
          await mustSucceed(
            `repoint ${customerId} at ${survivor.id}`,
            supabase
              .from('profiles')
              .update({ plan_tier: tier, stripe_subscription_id: survivor.id })
              .eq('stripe_customer_id', customerId)
          )
        } else {
          console.error(
            `[webhook] ${sub.id} cancelled but surviving ${survivor.id} has no resolvable tier ` +
            `— plan_tier left unchanged for ${customerId}`
          )
        }
        break
      }

      // Nothing left running — a real cancellation. Rows with no recorded
      // subscription id are legacy/manual upgrades, matched on customer alone so
      // they still downgrade.
      await mustSucceed(
        `downgrade ${customerId}`,
        supabase
          .from('profiles')
          .update({ plan_tier: 'free', stripe_subscription_id: null })
          .eq('stripe_customer_id', customerId)
          .or(`stripe_subscription_id.eq.${sub.id},stripe_subscription_id.is.null`)
      )
      console.log(`[webhook] ${customerId} downgraded to free after ${sub.id} was cancelled`)
      break
    }

    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session

      // Subscription upgrades (free → Starter / Advantage). This is the same
      // write customer.subscription.created performs; whichever event lands
      // first does the work and the other is a harmless repeat.
      if (session.mode === 'subscription' && session.subscription) {
        let sub: Stripe.Subscription
        try {
          sub = await getStripe().subscriptions.retrieve(session.subscription as string)
        } catch (err) {
          throw new RetryLater(`could not retrieve ${session.subscription}: ${(err as Error).message}`)
        }
        const result = await syncSubscriptionToProfile(supabase, sub, event.type)
        if (!result.ok && result.retryable) throw new RetryLater(result.reason)
      }

      // One-off session credit purchases
      if (session.mode === 'payment' && session.metadata?.type === 'session_credit') {
        const userId   = session.metadata.supabase_user_id
        const coachId  = session.metadata.coach_id  ?? null
        const startUtc = session.metadata.start_utc ?? null
        const endUtc   = session.metadata.end_utc   ?? null

        if (!userId) {
          console.error(`[webhook] session_credit checkout ${session.id} has no supabase_user_id — nothing granted`)
          break
        }

        if (coachId && startUtc && endUtc) {
          // Slot was pre-selected — create the booking directly.
          //
          // Stripe delivers an event more than once whenever a previous
          // attempt failed (or, rarely, at random), so check for the booking
          // before creating it. Without this, a retry would double-book the
          // slot and charge a second session against the client's count.
          const { data: existing, error: existingErr } = await supabase
            .from('bookings')
            .select('id')
            .eq('client_id', userId)
            .eq('coach_id', coachId)
            .eq('start_time_utc', startUtc)
            .neq('status', 'cancelled')
            .limit(1)
          if (existingErr) throw new RetryLater(`booking lookup: ${existingErr.message}`)
          if (existing && existing.length > 0) {
            console.log(`[webhook] session_credit ${session.id}: booking ${existing[0].id} already exists — skipping`)
            break
          }

          const { data: profile } = await supabase
            .from('profiles')
            .select('first_name, last_name, email, timezone, sessions_used_this_month, coach_id')
            .eq('id', userId)
            .single()

          const { data: coach } = await supabase
            .from('coaches')
            .select('display_name, email')
            .eq('id', coachId)
            .single()

          // Coaches can set a notification email (profiles.contact_email) that overrides their login email
          const { data: coachProfile } = await supabase
            .from('profiles')
            .select('contact_email')
            .eq('id', coachId)
            .single()
          const coachNotifyEmail = coachProfile?.contact_email ?? coach?.email

          await mustSucceed(
            `create booking for ${userId}`,
            supabase.from('bookings').insert({
              client_id:      userId,
              coach_id:       coachId,
              start_time_utc: startUtc,
              end_time_utc:   endUtc,
              status:         'confirmed',
            })
          )

          // Deliberately not retried: the booking above now exists, and a
          // redelivery would stop at the duplicate check without ever reaching
          // this line. Loud log instead so an admin can correct the count.
          const { error: countErr } = await supabase.from('profiles').update({
            sessions_used_this_month: (profile?.sessions_used_this_month ?? 0) + 1,
            ...(!profile?.coach_id ? { coach_id: coachId } : {}),
          }).eq('id', userId)
          if (countErr) {
            console.error(`[webhook] session_credit ${session.id}: booking created but session count NOT incremented for ${userId}: ${countErr.message}`)
          }

          // Confirmation emails — never fail the event over these.
          if (profile && coach) {
            const clientTz  = profile.timezone ?? 'America/New_York'
            const startDate = new Date(startUtc)
            const fmt = new Intl.DateTimeFormat('en-US', {
              timeZone: clientTz, weekday: 'long', month: 'long',
              day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true,
            })
            const displayTime = fmt.format(startDate)
            const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? ''

            try {
              await Promise.all([
                sendEmail({
                  to: profile.email,
                  subject: `Session Confirmed — ${displayTime}`,
                  html: brandedEmail(`
                    <h1 style="margin:0 0 8px;font-family:Georgia,serif;font-size:24px;color:#1A2B4A;">Your Session is Confirmed!</h1>
                    <p style="margin:0 0 24px;color:#6B7E8F;">Hi ${profile.first_name}, your coaching session with <strong>${coach.display_name}</strong> on <strong>${displayTime} (${clientTz})</strong> is confirmed.</p>
                    ${emailButton(`${siteUrl}/portal/dashboard`, 'View My Sessions')}
                    <p style="margin:24px 0 0;font-size:13px;color:#6B7E8F;">See you then! — The TFS Team</p>
                  `),
                }),
                sendEmail({
                  to: coachNotifyEmail ?? coach.email,
                  subject: `New Session Booked — ${displayTime}`,
                  html: brandedEmail(`
                    <h1 style="margin:0 0 8px;font-family:Georgia,serif;font-size:24px;color:#1A2B4A;">New Session Booked</h1>
                    <p style="margin:0 0 24px;color:#6B7E8F;">Hi ${coach.display_name}, a new session has been booked with you on <strong>${displayTime}</strong>.</p>
                    <p style="margin:0 0 24px;color:#6B7E8F;">Client: <strong>${profile.first_name} ${profile.last_name}</strong></p>
                    ${emailButton(`${siteUrl}/coach/dashboard`, 'View Coach Dashboard')}
                    <p style="margin:24px 0 0;font-size:13px;color:#6B7E8F;">— The TFS Team</p>
                  `),
                }),
              ])
            } catch (err) {
              console.error(`[webhook] session_credit ${session.id}: confirmation email failed:`, err)
            }
          }
          console.log(`[webhook] session_credit ${session.id}: booking created for ${userId} with ${coachId} at ${startUtc}`)
        } else {
          // No slot selected — grant a session credit to use later
          const { data: profile, error: readErr } = await supabase
            .from('profiles')
            .select('extra_sessions')
            .eq('id', userId)
            .single()
          if (readErr) throw new RetryLater(`read extra_sessions for ${userId}: ${readErr.message}`)
          await mustSucceed(
            `grant session credit to ${userId}`,
            supabase
              .from('profiles')
              .update({ extra_sessions: (profile?.extra_sessions ?? 0) + 1 })
              .eq('id', userId)
          )
          console.log(`[webhook] session_credit ${session.id}: credit granted to ${userId}`)
        }
      }
      break
    }

    case 'invoice.payment_failed': {
      const invoice    = event.data.object as Stripe.Invoice
      const customerId = invoice.customer as string
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('email, first_name')
        .eq('stripe_customer_id', customerId)
        .single()

      if (error || !profile?.email) {
        console.error(`[webhook] invoice.payment_failed: no profile email for ${customerId}${error ? `: ${error.message}` : ''}`)
        break
      }

      try {
        await sendEmail({
          to: profile.email,
          subject: 'Action needed: Payment failed for your TFS membership',
          html: brandedEmail(`
            <h1 style="margin:0 0 8px;font-family:Georgia,serif;font-size:24px;color:#1A2B4A;">Payment Failed</h1>
            <p style="margin:0 0 24px;color:#6B7E8F;">Hi ${profile.first_name}, we were unable to process your recent payment for your Tenant Financial Solutions membership.</p>
            <p style="margin:0 0 24px;color:#6B7E8F;">Please update your payment method to continue your coaching sessions.</p>
            ${emailButton(`${process.env.NEXT_PUBLIC_SITE_URL}/portal/billing`, 'Update Payment Method')}
            <p style="margin:24px 0 0;font-size:13px;color:#6B7E8F;">
              If you have questions, reply to this email or contact us at
              <a href="mailto:michael@tenantfinancialsolutions.com" style="color:#1D9E75;">michael@tenantfinancialsolutions.com</a>.
            </p>
          `),
        })
      } catch (err) {
        console.error(`[webhook] invoice.payment_failed: email to ${customerId} failed:`, err)
      }
      break
    }
  }
}
