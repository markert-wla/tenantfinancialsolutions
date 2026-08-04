import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function DELETE(_req: NextRequest, { params }: { params: { code: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const service = createServiceClient()
  const { error } = await service
    .from('promo_codes')
    .delete()
    .eq('code', params.code)
    .eq('is_active', false) // safety: only allow deleting inactive codes

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function PATCH(req: NextRequest, { params }: { params: { code: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const { code_type, assigned_tier, expires_at, discount_percent, partner_type } = body

  const service = createServiceClient()

  // Build the promo code update payload
  const codeUpdate: Record<string, unknown> = {}
  if (code_type !== undefined)        codeUpdate.code_type = code_type
  if (assigned_tier !== undefined)    codeUpdate.assigned_tier = assigned_tier || null
  if (expires_at !== undefined)       codeUpdate.expires_at = expires_at || null
  if (discount_percent !== undefined) codeUpdate.discount_percent = discount_percent || null

  if (Object.keys(codeUpdate).length > 0) {
    const { error } = await service
      .from('promo_codes')
      .update(codeUpdate)
      .eq('code', params.code)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // If a new partner_type was provided, update the partner record too
  if (partner_type !== undefined) {
    // First get the partner_id for this code
    const { data: codeRow } = await service
      .from('promo_codes')
      .select('partner_id')
      .eq('code', params.code)
      .single()
    if (codeRow?.partner_id) {
      const { error: pErr } = await service
        .from('partners')
        .update({ partner_type })
        .eq('id', codeRow.partner_id)
      if (pErr) return NextResponse.json({ error: pErr.message }, { status: 500 })
    }
  }

  return NextResponse.json({ ok: true })
}
