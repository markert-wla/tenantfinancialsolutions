import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/resend'
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

  // Welcome email to subscriber
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

  // Admin notification — look up all admin users from the database and notify them
  try {
    const { data: adminProfiles } = await supabase
      .from('profiles')
      .select('email, first_name')
      .eq('role', 'admin')
      .not('email', 'is', null)

    if (adminProfiles && adminProfiles.length > 0) {
      const adminEmails = adminProfiles
        .map(p => p.email as string)
        .filter(Boolean)

      if (adminEmails.length > 0) {
        await sendEmail({
          to: adminEmails,
          subject: 'New Newsletter Subscriber',
          html: brandedEmail(`
            <h1 style="margin:0 0 16px;font-family:Georgia,serif;font-size:24px;color:#1A2B4A;">New Newsletter Subscriber</h1>
            <p style="margin:0 0 8px;"><strong>Email:</strong> ${email.toLowerCase().trim()}</p>
            ${name ? `<p style="margin:0 0 8px;"><strong>Name:</strong> ${name.trim()}</p>` : ''}
            <p style="margin:0 0 16px;font-size:13px;color:#6B7E8F;">This person just subscribed to the TFS newsletter.</p>
            ${emailButton('https://tenantfinancialsolutions.com/admin/newsletter', 'View All Subscribers')}
          `),
        })
        console.log(`[Subscribe] Admin notification sent to ${adminEmails.join(', ')}`)
      }
    } else {
      console.warn('[Subscribe] No admin profiles found to notify.')
    }
  } catch (err: unknown) {
    console.error('[Subscribe] Admin notify error:', err)
  }

  return NextResponse.json({ ok: true })
}
