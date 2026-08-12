import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/resend'
import { brandedEmail } from '@/lib/email-template'

export async function POST(req: NextRequest) {
  // Auth check — admin by role, or a coach granted the newsletter permission
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, can_manage_newsletter')
    .eq('id', user.id)
    .single()

  const isAdmin = profile?.role === 'admin'
  const isNewsletterCoach = profile?.role === 'coach' && profile?.can_manage_newsletter === true

  if (!isAdmin && !isNewsletterCoach) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const rawBody = await req.json().catch(() => null) as { subject?: string; html?: string; testEmail?: string } | null
  if (!rawBody) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })

  const { subject, html, testEmail } = rawBody
  if (!subject?.trim() || !html?.trim()) {
    return NextResponse.json({ error: 'Missing subject or content' }, { status: 400 })
  }

  // Prepend the Wednesday Wisdom title banner
  const titledHtml = `
    <h1 style="font-family:Georgia,serif;font-size:26px;font-weight:bold;color:#1a3a4a;text-align:center;margin:0 0 24px;padding-bottom:16px;border-bottom:2px solid #e2e8f0;">
      Wednesday Wisdom from TFS
    </h1>
    ${html}
  `
  const wrappedHtml = brandedEmail(titledHtml)

  // Test send — one address only, skip subscriber list
  if (testEmail?.trim()) {
    try {
      await sendEmail({ to: [testEmail.trim()], subject: `[TEST] ${subject.trim()}`, html: wrappedHtml })
      return NextResponse.json({ ok: true, sent: 1, test: true })
    } catch (err) {
      console.error('[Newsletter test send] Error:', err)
      return NextResponse.json({ error: 'Failed to send test email' }, { status: 500 })
    }
  }

  // Get all active subscribers
  const service = createServiceClient()
  const { data: subscribers, error } = await service
    .from('newsletter_subscribers')
    .select('email')
    .eq('is_active', true)

  if (error) {
    console.error('[Newsletter send] DB error:', error)
    return NextResponse.json({ error: 'Could not load subscribers' }, { status: 500 })
  }

  if (!subscribers || subscribers.length === 0) {
    return NextResponse.json({ ok: true, sent: 0 })
  }

  const emails = subscribers.map(s => s.email)

  // Send in batches of 50 to respect Resend limits
  const BATCH = 50
  let sent = 0
  for (let i = 0; i < emails.length; i += BATCH) {
    const batch = emails.slice(i, i + BATCH)
    await sendEmail({ to: batch, subject: subject.trim(), html: wrappedHtml })
    sent += batch.length
  }

  return NextResponse.json({ ok: true, sent })
}
