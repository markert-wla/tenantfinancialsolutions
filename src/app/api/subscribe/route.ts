import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { sendEmail, ADMIN_EMAIL } from '@/lib/resend'
import { brandedEmail, emailButton } from '@/lib/email-template'
import { subscribeLimiter, checkRateLimit } from '@/lib/ratelimit'

export async function POST(req: NextRequest) {
  // Unauthenticated and sends an email per call — rate limit before any work.
  const ip = req.headers.get('x-forwarded-for') ?? '127.0.0.1'
  const { allowed } = await checkRateLimit(subscribeLimiter, ip)
  if (!allowed) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
  }

  const rawBody = await req.json().catch(() => null) as { email?: string; name?: string } | null
  if (!rawBody) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })

  const { email, name } = rawBody

  if (!email || !/^[^@]+@[^@]+\.[^@]+$/.test(email)) {
    return NextResponse.json({ error: 'Invalid email' }, { status: 400 })
  }

  const supabase = createServiceClient()

  // Upsert — re-activates if they previously unsubscribed
  const { error } = await supabase
    .from('newsletter_subscribers')
    .upsert(
      {
        email: email.toLowerCase().trim(),
        name: name?.trim() || null,
        is_active: true,
        unsubscribed_at: null,
      },
      { onConflict: 'email', ignoreDuplicates: false }
    )

  if (error) {
    console.error('[Subscribe] DB error:', error)
    return NextResponse.json({ error: 'Could not save subscription' }, { status: 500 })
  }

  const displayName = name?.trim() || null

  // Welcome email to the subscriber
  await sendEmail({
    to: email,
    subject: 'Welcome to the TFS Newsletter!',
    html: brandedEmail(`
      <h1 style="margin:0 0 16px;font-family:Georgia,serif;font-size:24px;color:#1A2B4A;">You're subscribed!</h1>
      <p style="margin:0 0 16px;">Hi${displayName ? ` ${displayName}` : ''},</p>
      <p style="margin:0 0 16px;">Thanks for subscribing to the <strong>Tenant Financial Solutions</strong> newsletter. You'll receive financial tips, resources, and updates directly in your inbox.</p>
      ${emailButton('https://tenantfinancialsolutions.com', 'Visit Our Website')}
      <p style="margin:0;font-size:13px;color:#6B7E8F;">If you ever want to unsubscribe, just reply to any newsletter with "unsubscribe" in the subject line and we'll remove you right away.</p>
    `),
  })

  // Admin notification email
  await sendEmail({
    to: ADMIN_EMAIL,
    subject: 'New Newsletter Subscriber',
    html: brandedEmail(`
      <h1 style="margin:0 0 16px;font-family:Georgia,serif;font-size:24px;color:#1A2B4A;">New Newsletter Subscriber</h1>
      <p style="margin:0 0 16px;">Someone just signed up for the TFS newsletter.</p>
      <table style="width:100%;border-collapse:collapse;margin:0 0 24px;">
        <tr>
          <td style="padding:8px 12px;background:#F0F4F8;font-weight:600;width:120px;border-radius:4px 0 0 4px;">Name</td>
          <td style="padding:8px 12px;background:#F8FAFC;border-radius:0 4px 4px 0;">${displayName ?? '—'}</td>
        </tr>
        <tr>
          <td style="padding:8px 12px;background:#F0F4F8;font-weight:600;border-radius:4px 0 0 4px;">Email</td>
          <td style="padding:8px 12px;background:#F8FAFC;border-radius:0 4px 4px 0;">${email.toLowerCase().trim()}</td>
        </tr>
      </table>
      ${emailButton('https://tenantfinancialsolutions.com/admin/newsletter', 'View Newsletter Dashboard')}
    `),
  }).catch((err) => console.error('[Subscribe] Admin notify error:', err))

  return NextResponse.json({ ok: true })
}
