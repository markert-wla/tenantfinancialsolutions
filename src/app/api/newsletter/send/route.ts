import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/resend'
import { brandedEmail } from '@/lib/email-template'

export async function POST(req: NextRequest) {
  // Auth check — admin only
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const rawBody = await req.json().catch(() => null) as { subject?: string; html?: string; testEmail?: string } | null
  if (!rawBody) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })

  const { subject, html, testEmail } = rawBody
  if (!subject?.trim() || !html?.trim()) {
    return NextResponse.json({ error: 'Missing subject or content' }, { status: 400 })
  }

  // Prepend the Wednesday Wisdom heading to every newsletter
  const titledHtml = `<h2 style="margin:0 0 24px;font-size:22px;font-weight:700;color:#1A2B4A;text-align:center;letter-spacing:0.2px;">Wednesday Wisdom from TFS</h2>${html}`
  const wrappedHtml = brandedEmail(titledHtml)

  // Test send — one address only
  if (testEmail?.trim()) {
    await sendEmail({ to: [testEmail.trim()], subject: `[TEST] ${subject.trim()}`, html: wrappedHtml })
    return NextResponse.json({ ok: true, sent: 1, test: true })
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
