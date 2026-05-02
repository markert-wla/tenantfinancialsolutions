import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/resend'
import { brandedEmail, emailButton } from '@/lib/email-template'

function esc(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

const TYPE_LABEL: Record<string, string> = {
  property_management: 'Property Management',
  nonprofit:           'Non-Profit',
  trial:               'Trial',
}

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  let body: { partner_name: string; partner_type: string; contact_name?: string | null; contact_email?: string | null; model?: string | null }
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  if (!body.partner_name || !body.partner_type) {
    return NextResponse.json({ error: 'Name and type are required' }, { status: 400 })
  }

  const service = createServiceClient()
  const { data, error } = await service.from('partners').insert({
    partner_name:  body.partner_name,
    partner_type:  body.partner_type,
    contact_name:  body.contact_name  ?? null,
    contact_email: body.contact_email ?? null,
    model:         body.model         ?? null,
  }).select('id').single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Send Supabase auth invite so the partner can log in with the correct role
  if (body.contact_email) {
    const siteUrl   = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://tenantfinancialsolutions.com'
    const nameParts = (body.contact_name ?? '').trim().split(/\s+/)
    const firstName = nameParts[0] ?? ''
    const lastName  = nameParts.slice(1).join(' ') ?? ''
    const typeLabel = TYPE_LABEL[body.partner_type] ?? body.partner_type

    // Generate the invite link without triggering Supabase's own email
    const { data: linkData, error: linkErr } = await service.auth.admin.generateLink({
      type:    'invite',
      email:   body.contact_email,
      options: {
        data:       { role: 'property_manager' },
        redirectTo: `${siteUrl}/auth/confirm`,
      },
    })

    if (!linkErr && linkData?.user) {
      await service.from('profiles').update({
        role:       'property_manager',
        first_name: firstName || null,
        last_name:  lastName  || null,
        partner_id: data.id,
      }).eq('id', linkData.user.id)
    } else if (linkErr && !linkErr.message?.toLowerCase().includes('already')) {
      console.error('[Partner invite] generateLink failed:', linkErr.message)
    }

    const inviteLink = linkData?.properties?.action_link ?? `${siteUrl}/login`

    // Single branded email with the invite link embedded
    sendEmail({
      to:      body.contact_email,
      subject: `Welcome to the TFS Partner Network — ${esc(body.partner_name)}`,
      html:    brandedEmail(`
        <h1 style="margin:0 0 8px;font-family:Georgia,serif;font-size:22px;color:#1A2B4A;">Welcome, ${esc(firstName || 'there')}!</h1>
        <p style="margin:0 0 16px;color:#6B7E8F;">
          We're excited to have <strong style="color:#1A2B4A;">${esc(body.partner_name)}</strong> join us as a
          <strong style="color:#1A2B4A;">${esc(typeLabel)}</strong> partner with Tenant Financial Solutions.
        </p>
        <p style="margin:0 0 16px;color:#6B7E8F;">
          Through this partnership, your residents and members will have access to personalised financial coaching
          designed to help them achieve clarity and confidence with their finances.
        </p>
        <p style="margin:0 0 24px;color:#6B7E8F;">
          Click below to set up your partner portal login. Once you're in, you'll be able to view tenant
          engagement and access promo codes to share with your community.
        </p>
        ${emailButton(inviteLink, 'Set Up Your Account')}
        <p style="margin:24px 0 0;font-size:13px;color:#6B7E8F;">This link expires in 24 hours.<br/>— The TFS Team</p>
      `),
    }).catch(err => console.error('[Partner invite] Email failed:', err))
  }

  return NextResponse.json({ ok: true, id: data.id })
}
