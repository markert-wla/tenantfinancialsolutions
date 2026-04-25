import { NextRequest, NextResponse } from 'next/server'
import { contactLimiter, checkRateLimit } from '@/lib/ratelimit'
import { sendEmail, ADMIN_EMAIL } from '@/lib/resend'
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
    html: `
      <h2>New Contact Form Submission</h2>
      <table style="border-collapse:collapse;width:100%">
        <tr><td style="padding:8px;font-weight:bold">Name</td><td style="padding:8px">${esc(name)}</td></tr>
        <tr><td style="padding:8px;font-weight:bold">Email</td><td style="padding:8px"><a href="mailto:${esc(email)}">${esc(email)}</a></td></tr>
        <tr><td style="padding:8px;font-weight:bold">Phone</td><td style="padding:8px">${phone ? esc(phone) : 'Not provided'}</td></tr>
        <tr><td style="padding:8px;font-weight:bold">Inquiry Type</td><td style="padding:8px">${esc(inquiryLabel)}</td></tr>
        <tr><td style="padding:8px;font-weight:bold;vertical-align:top">Message</td><td style="padding:8px">${esc(message).replace(/\n/g, '<br>')}</td></tr>
      </table>
      <p style="margin-top:16px;font-size:12px;color:#666">Manage this in the <a href="${process.env.NEXT_PUBLIC_SITE_URL}/admin/contacts">Admin Contacts inbox</a>.</p>
    `,
  })

  return NextResponse.json({ ok: true })
}
