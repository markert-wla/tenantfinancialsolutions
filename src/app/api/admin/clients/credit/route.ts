import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { getStripe } from '@/lib/stripe'

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: actor } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (actor?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  let body: { clientId: string; amountDollars: number; note?: string }
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const { clientId, amountDollars, note } = body
  if (!clientId || !amountDollars || amountDollars <= 0) {
    return NextResponse.json({ error: 'Missing or invalid fields' }, { status: 400 })
  }

  const service = createServiceClient()
  const { data: profile } = await service
    .from('profiles')
    .select('stripe_customer_id, first_name, last_name')
    .eq('id', clientId)
    .single()

  if (!profile?.stripe_customer_id) {
    return NextResponse.json({ error: 'Client has no Stripe account — use extra sessions instead.' }, { status: 400 })
  }

  let stripe: ReturnType<typeof getStripe>
  try { stripe = getStripe() } catch {
    return NextResponse.json({ error: 'Payment system not configured' }, { status: 500 })
  }

  // Negative amount = credit applied to next invoice
  const amountCents = -Math.round(amountDollars * 100)
  await stripe.customers.createBalanceTransaction(profile.stripe_customer_id, {
    amount:      amountCents,
    currency:    'usd',
    description: note?.trim() || `Admin credit for ${profile.first_name} ${profile.last_name}`,
  })

  return NextResponse.json({ ok: true })
}
