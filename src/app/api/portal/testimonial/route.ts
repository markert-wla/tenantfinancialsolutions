import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { quote, client_name } = await req.json()
    if (!quote || typeof quote !== 'string' || !quote.trim()) {
      return NextResponse.json({ error: 'Quote is required' }, { status: 400 })
    }
    if (quote.length > 500) {
      return NextResponse.json({ error: 'Quote must be 500 characters or fewer' }, { status: 400 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('plan_tier, first_name, last_name')
      .eq('id', user.id)
      .single()

    const name = (typeof client_name === 'string' && client_name.trim())
      ? client_name.trim()
      : [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || 'Anonymous'

    const { error } = await supabase.from('testimonials').insert({
      client_name: name,
      quote:       quote.trim(),
      plan_tier:   profile?.plan_tier ?? null,
      approved:    false,
    })
    if (error) throw error

    return NextResponse.json({ ok: true })
  } catch (err: unknown) {
    console.error('POST /api/portal/testimonial', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
