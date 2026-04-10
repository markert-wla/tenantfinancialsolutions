import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  let body: {
    code: string
    partner_type: string
    partner_name: string
    assigned_tier: string
    max_uses: number
    expires_at?: string | null
  }

  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const { code, partner_type, partner_name, assigned_tier, max_uses, expires_at } = body

  if (!code || !partner_type || !partner_name || !assigned_tier) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const validTiers = ['free', 'bronze', 'silver']
  if (!validTiers.includes(assigned_tier)) {
    return NextResponse.json({ error: 'Gold tier cannot be assigned via promo code' }, { status: 400 })
  }

  const service = createServiceClient()
  const { error } = await service.from('promo_codes').insert({
    code:          code.toUpperCase().trim(),
    partner_type,
    partner_name,
    assigned_tier,
    max_uses:      Math.max(1, Number(max_uses)),
    expires_at:    expires_at || null,
    created_by:    user.id,
  })

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'A code with that name already exists.' }, { status: 409 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
