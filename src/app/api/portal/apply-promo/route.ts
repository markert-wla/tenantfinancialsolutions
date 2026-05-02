import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const service  = createServiceClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: { code?: string }
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const code = body.code?.trim().toUpperCase()
  if (!code) return NextResponse.json({ error: 'Promo code is required' }, { status: 400 })

  // Only free-tier clients can apply a promo code
  const { data: profile } = await supabase
    .from('profiles')
    .select('plan_tier, promo_code_used')
    .eq('id', user.id)
    .single()

  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
  if (profile.plan_tier !== 'free') {
    return NextResponse.json({ error: 'Promo codes can only be applied to free accounts.' }, { status: 400 })
  }

  // Validate the code
  const { data: promoCode, error: codeErr } = await supabase
    .from('promo_codes')
    .select('code, assigned_tier, code_type, is_active, uses_count, max_uses, expires_at, partner_id')
    .eq('code', code)
    .single()

  if (codeErr || !promoCode) {
    return NextResponse.json({ error: 'Invalid promo code.' }, { status: 400 })
  }
  if (!promoCode.is_active || promoCode.uses_count >= promoCode.max_uses) {
    return NextResponse.json({ error: 'This promo code is no longer available.' }, { status: 400 })
  }
  if (promoCode.expires_at && new Date(promoCode.expires_at) < new Date()) {
    return NextResponse.json({ error: 'This promo code has expired.' }, { status: 400 })
  }
  // Affiliate discount codes require Stripe checkout — not applicable here
  if (promoCode.code_type === 'affiliate_discount') {
    return NextResponse.json({ error: 'This code must be used at registration.' }, { status: 400 })
  }

  // Apply the upgrade (include partner_id so tenant appears in manager's My Tenants)
  const profilePatch: Record<string, any> = {
    plan_tier:       promoCode.assigned_tier,
    promo_code_used: code,
  }
  if (promoCode.partner_id) profilePatch.partner_id = promoCode.partner_id

  const { error: updateErr } = await service
    .from('profiles')
    .update(profilePatch)
    .eq('id', user.id)

  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 })

  await service
    .from('promo_codes')
    .update({ uses_count: promoCode.uses_count + 1 })
    .eq('code', code)

  return NextResponse.json({ ok: true, newTier: promoCode.assigned_tier })
}
