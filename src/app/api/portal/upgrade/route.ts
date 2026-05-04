import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { getStripe, PLAN_PRICE_IDS } from '@/lib/stripe'

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
  if (!['bronze', 'silver'].includes(tier)) {
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
  if (profile.plan_tier === tier) return NextResponse.json({ error: 'Already on this plan' }, { status: 400 })

  let stripe: ReturnType<typeof getStripe>
  try {
    stripe = getStripe()
  } catch (err: unknown) {
    console.error('[upgrade] Stripe init failed:', (err as Error).message)
    return NextResponse.json({ error: 'Payment system not configured' }, { status: 500 })
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? ''

  try {
    let customerId = profile.stripe_customer_id

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
