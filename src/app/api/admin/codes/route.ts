import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/resend'
import { brandedEmail } from '@/lib/email-template'

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  let body: {
    code: string
    partner_id: string
    assigned_tier: string | null
    code_type: string
    discount_percent?: number | null
    max_uses: number
    expires_at?: string | null
  }

  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const { code, partner_id, assigned_tier, code_type, discount_percent, max_uses, expires_at } = body

  if (!code || !partner_id) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const validCodeTypes = ['tier_assignment', 'affiliate_discount', 'full_comp', 'group_comp']
  const resolvedCodeType = validCodeTypes.includes(code_type) ? code_type : 'tier_assignment'

  // affiliate_discount allows null assigned_tier ("all tiers"); other types require a specific tier
  const validTiers = ['free', 'bronze', 'silver']
  if (resolvedCodeType !== 'affiliate_discount' && (!assigned_tier || !validTiers.includes(assigned_tier))) {
    return NextResponse.json({ error: 'Missing or invalid assigned tier.' }, { status: 400 })
  }
  if (resolvedCodeType === 'affiliate_discount' && assigned_tier && !validTiers.includes(assigned_tier)) {
    return NextResponse.json({ error: 'Gold tier cannot be assigned via promo code' }, { status: 400 })
  }

  if (resolvedCodeType === 'affiliate_discount' && (!discount_percent || discount_percent <= 0 || discount_percent > 100)) {
    return NextResponse.json({ error: 'Affiliate discount codes require a valid discount percentage (1–100).' }, { status: 400 })
  }

  const service = createServiceClient()

  // Look up partner to get canonical name, type, and contact email
  const { data: partner, error: partnerErr } = await service
    .from('partners')
    .select('partner_name, partner_type, contact_email, contact_name')
    .eq('id', partner_id)
    .single()

  if (partnerErr || !partner) {
    return NextResponse.json({ error: 'Partner not found' }, { status: 400 })
  }

  const resolvedTier = (resolvedCodeType === 'affiliate_discount' && !assigned_tier) ? null : assigned_tier

  const { error } = await service.from('promo_codes').insert({
    code:             code.toUpperCase().trim(),
    partner_id,
    partner_name:     partner.partner_name,
    partner_type:     partner.partner_type,
    assigned_tier:    resolvedTier,
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

  // Email the partner contact with their new code
  if (partner.contact_email) {
    const siteUrl     = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://tenantfinancialsolutions.com'
    const firstName   = (partner.contact_name as string | null)?.split(' ')[0] ?? 'there'
    const tierLabels: Record<string, string> = { free: 'Free', bronze: 'Starter Plan', silver: 'Advantage Plan' }
    const tierLabel   = resolvedTier ? (tierLabels[resolvedTier] ?? resolvedTier) : 'All Plans'
    const expiryLine  = expires_at
      ? `<p style="margin:0 0 16px;color:#6B7E8F;"><strong style="color:#1A2B4A;">Expires:</strong> ${new Date(expires_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>`
      : ''

    sendEmail({
      to:      partner.contact_email as string,
      subject: `Your TFS Promo Code — ${code.toUpperCase().trim()}`,
      html:    brandedEmail(`
        <h1 style="margin:0 0 8px;font-family:Georgia,serif;font-size:22px;color:#1A2B4A;">Your Promo Code is Ready</h1>
        <p style="margin:0 0 16px;color:#6B7E8F;">Hi ${firstName}, a new promo code has been generated for <strong style="color:#1A2B4A;">${partner.partner_name}</strong>.</p>
        <table cellpadding="0" cellspacing="0" style="width:100%;background:#F8FFFE;border:1px solid #D1EFE6;border-radius:8px;margin-bottom:24px;">
          <tr><td style="padding:16px 20px;border-bottom:1px solid #D1EFE6;">
            <span style="font-size:11px;color:#6B7E8F;text-transform:uppercase;letter-spacing:0.5px;">Promo Code</span><br>
            <strong style="font-size:22px;letter-spacing:2px;color:#1A2B4A;">${code.toUpperCase().trim()}</strong>
          </td></tr>
          <tr><td style="padding:12px 20px;border-bottom:1px solid #D1EFE6;">
            <span style="font-size:11px;color:#6B7E8F;text-transform:uppercase;letter-spacing:0.5px;">Plan Unlocked</span><br>
            <strong style="color:#1A2B4A;">${tierLabel}</strong>
          </td></tr>
          <tr><td style="padding:12px 20px;">
            <span style="font-size:11px;color:#6B7E8F;text-transform:uppercase;letter-spacing:0.5px;">Max Uses</span><br>
            <strong style="color:#1A2B4A;">${max_uses}</strong>
          </td></tr>
        </table>
        ${expiryLine}
        <p style="margin:0 0 24px;color:#6B7E8F;">
          Share this code with your residents or members. They'll enter it at registration on the TFS website to unlock their plan at no cost to them.
        </p>
        <a href="${siteUrl}/register" style="display:inline-block;background:#1D9E75;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;font-size:15px;">
          Registration Page
        </a>
        <p style="margin:24px 0 0;font-size:13px;color:#6B7E8F;">— The TFS Team</p>
      `),
    }).catch(err => console.error('[Promo code] Partner email failed:', err))
  }

  return NextResponse.json({ ok: true })
}
