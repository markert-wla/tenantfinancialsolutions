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

  let body: { subject?: string; html?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { subject, html } = body
  if (!subject?.trim() || !html?.trim()) {
    return NextResponse.json({ error: 'Missing subject or content' }, { status: 400 })
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
  const wrappedHtml = brandedEmail(html)

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
