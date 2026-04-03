import { NextRequest, NextResponse } from 'next/server'
import { contactLimiter, checkRateLimit } from '@/lib/ratelimit'
import { sendEmail, ADMIN_EMAIL } from '@/lib/resend'

export async function POST(req: NextRequest) {
  // Rate limit by IP
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

  // Basic email validation
  if (!/^[^@]+@[^@]+\.[^@]+$/.test(email)) {
    return NextResponse.json({ error: 'Invalid email address' }, { status: 400 })
  }

  const inquiryLabels: Record<string, string> = {
    individual:        'Individual Membership',
    'property-manager':'Property Manager Partnership',
    nonprofit:         'Non-Profit Partnership',
    general:           'General Inquiry',
  }
  const inquiryLabel = inquiryLabels[type ?? ''] ?? type ?? 'Unknown'

  await sendEmail({
    to: ADMIN_EMAIL,
    subject: `[TFS Contact] ${inquiryLabel} — ${name}`,
    html: `
      <h2>New Contact Form Submission</h2>
      <table style="border-collapse:collapse;width:100%">
        <tr><td style="padding:8px;font-weight:bold">Name</td><td style="padding:8px">${name}</td></tr>
        <tr><td style="padding:8px;font-weight:bold">Email</td><td style="padding:8px"><a href="mailto:${email}">${email}</a></td></tr>
        <tr><td style="padding:8px;font-weight:bold">Phone</td><td style="padding:8px">${phone || 'Not provided'}</td></tr>
        <tr><td style="padding:8px;font-weight:bold">Inquiry Type</td><td style="padding:8px">${inquiryLabel}</td></tr>
        <tr><td style="padding:8px;font-weight:bold;vertical-align:top">Message</td><td style="padding:8px">${message.replace(/\n/g, '<br>')}</td></tr>
      </table>
    `,
  })

  return NextResponse.json({ ok: true })
}
