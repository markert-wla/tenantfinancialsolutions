import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/resend'
import { brandedEmail, emailButton } from '@/lib/email-template'

export async function POST(req: NextRequest) {
  let body: { email?: string; name?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { email, name } = body

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

  // Welcome email
  await sendEmail({
    to: email,
    subject: 'Welcome to the TFS Newsletter!',
    html: brandedEmail(`
      <h1 style="margin:0 0 16px;font-family:Georgia,serif;font-size:24px;color:#1A2B4A;">You're subscribed!</h1>
      <p style="margin:0 0 16px;">Hi${name ? ` ${name.trim()}` : ''},</p>
      <p style="margin:0 0 16px;">Thanks for subscribing to the <strong>Tenant Financial Solutions</strong> newsletter. You'll receive financial tips, resources, and updates directly in your inbox.</p>
      ${emailButton('https://tenantfinancialsolutions.com', 'Visit Our Website')}
      <p style="margin:0;font-size:13px;color:#6B7E8F;">If you ever want to unsubscribe, just reply to any newsletter with "unsubscribe" in the subject line and we'll remove you right away.</p>
    `),
  })

  return NextResponse.json({ ok: true })
}
