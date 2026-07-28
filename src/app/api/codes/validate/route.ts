import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { codeLimiter, checkRateLimit } from '@/lib/ratelimit'

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') ?? '127.0.0.1'
  const { allowed } = await checkRateLimit(codeLimiter, ip)
  if (!allowed) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
  }

  const { code } = await req.json()
  if (!code || typeof code !== 'string') {
    return NextResponse.json({ valid: false, error: 'No code provided' }, { status: 400 })
  }

  // Service client: promo_codes is no longer publicly readable. This route is
  // rate limited and looks up one caller-supplied code, returning only the
  // fields the signup form needs — never a listing.
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('promo_codes')
    .select('code, partner_type, partner_name, partner_id, assigned_tier, max_uses, uses_count, is_active, expires_at, partner:partners(partner_name, partner_type)')
    .eq('code', code.trim().toUpperCase())
    .single()

  if (error || !data) {
    return NextResponse.json({ valid: false }, { status: 200 })
  }

  if (!data.is_active || data.uses_count >= data.max_uses) {
    return NextResponse.json({ valid: false, reason: 'exhausted' }, { status: 200 })
  }

  if (data.expires_at && new Date(data.expires_at) < new Date()) {
    return NextResponse.json({ valid: false, reason: 'expired' }, { status: 200 })
  }

  const partnerRow = Array.isArray(data.partner) ? data.partner[0] : data.partner
  return NextResponse.json({
    valid: true,
    assigned_tier: data.assigned_tier,
    partner_type:  partnerRow?.partner_type ?? data.partner_type,
    partner_name:  partnerRow?.partner_name ?? data.partner_name,
  })
}
