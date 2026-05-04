import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { getStripe, SESSION_PRICE_ID } from '@/lib/stripe'

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!SESSION_PRICE_ID) {
    return NextResponse.json({ error: 'Session pricing not configured' }, { status: 500 })
  }

  let coachId:  string | null = null
  let startUtc: string | null = null
  let endUtc:   string | null = null
  try {
    const body = await req.json()
    coachId  = body.coachId  ?? null
    startUtc = body.startUtc ?? null
    endUtc   = body.endUtc   ?? null
  } catch { /* all stay null */ }

  const service = createServiceClient()
  const { data: profile } = await service
    .from('profiles')
    .select('first_name, last_name, email, stripe_customer_id')
    .eq('id', user.id)
    .single()

  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

  let stripe: ReturnType<typeof getStripe>
  try {
    stripe = getStripe()
  } catch {
    return NextResponse.json({ error: 'Payment system not configured' }, { status: 500 })
  }

  try {
    let customerId = profile.stripe_customer_id

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: profile.email,
        name:  `${profile.first_name} ${profile.last_name}`,
        metadata: { supabase_user_id: user.id },
      })
      customerId = customer.id
      await service.from('profiles').update({ stripe_customer_id: customerId }).eq('id', user.id)
    }

    const siteUrl    = process.env.NEXT_PUBLIC_SITE_URL ?? ''
    const hasSlot    = coachId && startUtc && endUtc
    const successUrl = hasSlot
      ? `${siteUrl}/portal/dashboard?welcome=1`
      : `${siteUrl}/portal/book?session_purchased=1`

    const session = await stripe.checkout.sessions.create({
      customer:    customerId,
      mode:        'payment',
      line_items:  [{ price: SESSION_PRICE_ID, quantity: 1 }],
      success_url: successUrl,
      cancel_url:  `${siteUrl}/portal/book?buy=1`,
      metadata:    {
        supabase_user_id: user.id,
        type:             'session_credit',
        ...(hasSlot ? { coach_id: coachId!, start_utc: startUtc!, end_utc: endUtc! } : {}),
      },
    })

    return NextResponse.json({ checkoutUrl: session.url })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Stripe error'
    console.error('[session-checkout]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
