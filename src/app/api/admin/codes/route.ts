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
    partner_id: string
    assigned_tier: string
    code_type: string
    discount_percent?: number | null
    max_uses: number
    expires_at?: string | null
  }

  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const { code, partner_id, assigned_tier, code_type, discount_percent, max_uses, expires_at } = body

  if (!code || !partner_id || !assigned_tier) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const validTiers = ['free', 'bronze', 'silver']
  if (!validTiers.includes(assigned_tier)) {
    return NextResponse.json({ error: 'Gold tier cannot be assigned via promo code' }, { status: 400 })
  }

  const validCodeTypes = ['tier_assignment', 'affiliate_discount', 'full_comp', 'group_comp']
  const resolvedCodeType = validCodeTypes.includes(code_type) ? code_type : 'tier_assignment'

  if (resolvedCodeType === 'affiliate_discount' && (!discount_percent || discount_percent <= 0 || discount_percent > 100)) {
    return NextResponse.json({ error: 'Affiliate discount codes require a valid discount percentage (1–100).' }, { status: 400 })
  }

  const service = createServiceClient()

  // Look up partner to get canonical name and type
  const { data: partner, error: partnerErr } = await service
    .from('partners')
    .select('partner_name, partner_type')
    .eq('id', partner_id)
    .single()

  if (partnerErr || !partner) {
    return NextResponse.json({ error: 'Partner not found' }, { status: 400 })
  }

  const { error } = await service.from('promo_codes').insert({
    code:             code.toUpperCase().trim(),
    partner_id,
    partner_name:     partner.partner_name,
    partner_type:     partner.partner_type,
    assigned_tier,
    code_type:        resolvedCodeType,
    discount_percent: resolvedCodeType === 'affiliate_discount' ? Number(discount_percent) : null,
    max_uses:         Math.max(1, Number(max_uses)),
    expires_at:       expires_at || null,
    created_by:       user.id,
  })

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'A code with that name already exists.' }, { status: 409 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
