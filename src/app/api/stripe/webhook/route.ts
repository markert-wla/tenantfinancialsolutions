import { NextRequest, NextResponse } from 'next/server'
import { getStripe } from '@/lib/stripe'
import { createServiceClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/resend'
import { brandedEmail, emailButton } from '@/lib/email-template'
import Stripe from 'stripe'

// Raw body required for Stripe signature verification
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const rawBody = await req.text()
  const sig     = req.headers.get('stripe-signature') ?? ''

  let event: Stripe.Event
  try {
    const stripe = getStripe()
    event = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err: unknown) {
    return NextResponse.json({ error: `Webhook Error: ${(err as Error).message}` }, { status: 400 })
  }

  const supabase = createServiceClient()

  switch (event.type) {
    case 'customer.subscription.created':
    case 'customer.subscription.updated': {
      const sub  = event.data.object as Stripe.Subscription
      const meta = sub.metadata
      const tier = meta?.tier ?? 'free'
      if (meta?.supabase_user_id) {
        await supabase
          .from('profiles')
          .update({
            plan_tier:              tier,
            stripe_subscription_id: sub.id,
            stripe_customer_id:     sub.customer as string,
          })
          .eq('id', meta.supabase_user_id)
      }
      break
    }

    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription
      await supabase
        .from('profiles')
        .update({ plan_tier: 'free', stripe_subscription_id: null })
        .eq('stripe_customer_id', (sub.customer as string))
      break
    }

    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session
      if (session.mode === 'payment' && session.metadata?.type === 'session_credit') {
        const userId   = session.metadata.supabase_user_id
        const coachId  = session.metadata.coach_id  ?? null
        const startUtc = session.metadata.start_utc ?? null
        const endUtc   = session.metadata.end_utc   ?? null

        if (userId) {
          if (coachId && startUtc && endUtc) {
            // Slot was pre-selected — create the booking directly
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

            await supabase.from('bookings').insert({
              client_id:      userId,
              coach_id:       coachId,
              start_time_utc: startUtc,
              end_time_utc:   endUtc,
              status:         'confirmed',
            })

            await supabase.from('profiles').update({
              sessions_used_this_month: (profile?.sessions_used_this_month ?? 0) + 1,
              ...(!profile?.coach_id ? { coach_id: coachId } : {}),
            }).eq('id', userId)

            // Confirmation emails
            if (profile && coach) {
              const clientTz  = profile.timezone ?? 'America/New_York'
              const startDate = new Date(startUtc)
              const fmt = new Intl.DateTimeFormat('en-US', {
                timeZone: clientTz, weekday: 'long', month: 'long',
                day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true,
              })
              const displayTime = fmt.format(startDate)
              const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? ''

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
                  to: coach.email,
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
            }
          } else {
            // No slot selected — grant a session credit to use later
            const { data: profile } = await supabase
              .from('profiles')
              .select('extra_sessions')
              .eq('id', userId)
              .single()
            await supabase
              .from('profiles')
              .update({ extra_sessions: (profile?.extra_sessions ?? 0) + 1 })
              .eq('id', userId)
          }
        }
      }
      break
    }

    case 'invoice.payment_failed': {
      const invoice    = event.data.object as Stripe.Invoice
      const customerId = invoice.customer as string
      const { data: profile } = await supabase
        .from('profiles')
        .select('email, first_name')
        .eq('stripe_customer_id', customerId)
        .single()

      if (profile?.email) {
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
      }
      break
    }
  }

  return NextResponse.json({ received: true })
}
