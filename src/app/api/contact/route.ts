import { NextRequest, NextResponse } from 'next/server'
import { contactLimiter, checkRateLimit } from '@/lib/ratelimit'
import { sendEmail, ADMIN_EMAIL } from '@/lib/resend'
import { brandedEmail } from '@/lib/email-template'
import { createServiceClient } from '@/lib/supabase/server'

function esc(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

const inquiryLabels: Record<string, string> = {
  individual:         'Individual Membership',
  'property-manager': 'Property Manager Partnership',
  nonprofit:          'Non-Profit Partnership',
  workshops:          'In-Person Workshops',
  general:            'General Inquiry',
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') ?? '127.0.0.1'
  const { allowed } = await checkRateLimit(contactLimiter, ip)
  if (!allowed) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
  }

  let body: { name?: string; email?: string; phone?: string; type?: string; message?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { name, email, phone, type, message } = body

  if (!name || !email || !message) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }
  if (!/^[^@]+@[^@]+\.[^@]+$/.test(email)) {
    return NextResponse.json({ error: 'Invalid email address' }, { status: 400 })
  }

  const inquiryLabel = inquiryLabels[type ?? ''] ?? type ?? 'Unknown'

  // Save to DB — don't fail the request if this errors
  try {
    const supabase = createServiceClient()
    await supabase.from('contact_submissions').insert({
      name,
      email,
      phone:        phone || null,
      inquiry_type: type || 'general',
      message,
    })
  } catch (dbErr) {
    console.error('[Contact] DB save failed:', dbErr)
  }

  await sendEmail({
    to: ADMIN_EMAIL,
    subject: `[TFS Contact] ${inquiryLabel} — ${name}`,
    html: brandedEmail(`
      <h1 style="margin:0 0 24px;font-family:Georgia,serif;font-size:24px;color:#1A2B4A;">New Contact Form Submission</h1>
      <table cellpadding="0" cellspacing="0" style="width:100%;background:#F8FFFE;border:1px solid #D1EFE6;border-radius:8px;margin-bottom:24px;">
        <tr><td style="padding:12px 16px;border-bottom:1px solid #D1EFE6;">
          <span style="font-size:12px;color:#6B7E8F;text-transform:uppercase;letter-spacing:0.5px;">Name</span><br>
          <strong style="color:#1A2B4A;">${esc(name)}</strong>
        </td></tr>
        <tr><td style="padding:12px 16px;border-bottom:1px solid #D1EFE6;">
          <span style="font-size:12px;color:#6B7E8F;text-transform:uppercase;letter-spacing:0.5px;">Email</span><br>
          <a href="mailto:${esc(email)}" style="color:#1D9E75;">${esc(email)}</a>
        </td></tr>
        <tr><td style="padding:12px 16px;border-bottom:1px solid #D1EFE6;">
          <span style="font-size:12px;color:#6B7E8F;text-transform:uppercase;letter-spacing:0.5px;">Phone</span><br>
          <strong style="color:#1A2B4A;">${phone ? esc(phone) : 'Not provided'}</strong>
        </td></tr>
        <tr><td style="padding:12px 16px;border-bottom:1px solid #D1EFE6;">
          <span style="font-size:12px;color:#6B7E8F;text-transform:uppercase;letter-spacing:0.5px;">Inquiry Type</span><br>
          <strong style="color:#1A2B4A;">${esc(inquiryLabel)}</strong>
        </td></tr>
        <tr><td style="padding:12px 16px;">
          <span style="font-size:12px;color:#6B7E8F;text-transform:uppercase;letter-spacing:0.5px;">Message</span><br>
          <p style="margin:8px 0 0;color:#1A2B4A;">${esc(message).replace(/\n/g, '<br>')}</p>
        </td></tr>
      </table>
      <p style="margin:0;font-size:13px;color:#6B7E8F;">
        <a href="${process.env.NEXT_PUBLIC_SITE_URL}/admin/dashboard" style="color:#1D9E75;">View in Admin Dashboard →</a>
      </p>
    `),
  })

  return NextResponse.json({ ok: true })
}
