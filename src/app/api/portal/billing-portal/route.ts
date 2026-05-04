import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getStripe } from '@/lib/stripe'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id, plan_tier')
      .eq('id', user.id)
      .single()

    if (!profile?.stripe_customer_id) {
      return NextResponse.json({ error: 'No billing account found' }, { status: 404 })
    }

    const stripe  = getStripe()
    const session = await stripe.billingPortal.sessions.create({
      customer:   profile.stripe_customer_id,
      return_url: `${process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'}/portal/billing`,
    })

    return NextResponse.json({ url: session.url })
  } catch (err: unknown) {
    console.error('GET /api/portal/billing-portal', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
