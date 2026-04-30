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
  } catch (err: any) {
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 })
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
              <a href="mailto:tenantfinancialsolutions@gmail.com" style="color:#1D9E75;">tenantfinancialsolutions@gmail.com</a>.
            </p>
          `),
        })
      }
      break
    }
  }

  return NextResponse.json({ received: true })
}
