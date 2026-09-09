import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/resend'
import { brandedEmail } from '@/lib/email-template'

// This endpoint is called by Vercel cron every Wednesday at 10am EST (15:00 UTC).
// It reads the saved draft, sends it to all active subscribers, then clears the draft.
// If no draft is saved, it skips silently — nothing goes out that week.
export async function GET(req: NextRequest) {
  // Verify the request is from Vercel cron
  const authHeader = req.headers.get('authorization')
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const service = createServiceClient()

  // Load the saved draft
  const { data: draft, error: draftError } = await service
    .from('newsletter_drafts')
    .select('*')
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (draftError) {
    console.error('[Newsletter cron] Error loading draft:', draftError)
    return NextResponse.json({ error: 'Could not load draft' }, { status: 500 })
  }

  if (!draft) {
    console.log('[Newsletter cron] No draft saved — skipping this week.')
    return NextResponse.json({ ok: true, skipped: true, reason: 'No draft saved' })
  }

  // Build HTML from plain-text body
  const paragraphs = (draft.body as string)
    .split(/\n{2,}/)
    .map((p: string) => p.trim())
    .filter(Boolean)
    .map((p: string) => `<p style="margin:0 0 16px;">${p.replace(/\n/g, '<br>')}</p>`)
    .join('')

  const titledHtml = `
    <h1 style="font-family:Georgia,serif;font-size:26px;font-weight:bold;color:#1a3a4a;text-align:center;margin:0 0 24px;padding-bottom:16px;border-bottom:2px solid #e2e8f0;">
      Wednesday Wisdom from TFS
    </h1>
    ${paragraphs}
  `
  const wrappedHtml = brandedEmail(titledHtml)

  // Load all active subscribers
  const { data: subscribers, error: subError } = await service
    .from('newsletter_subscribers')
    .select('email')
    .eq('is_active', true)

  if (subError) {
    console.error('[Newsletter cron] Error loading subscribers:', subError)
    return NextResponse.json({ error: 'Could not load subscribers' }, { status: 500 })
  }

  if (!subscribers || subscribers.length === 0) {
    console.log('[Newsletter cron] No active subscribers — clearing draft.')
    await service.from('newsletter_drafts').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    return NextResponse.json({ ok: true, sent: 0 })
  }

  const emails = subscribers.map((s: { email: string }) => s.email)

  // Send one email per subscriber so no recipient can see any other address
  let sent = 0
  let failed = 0
  for (const email of emails) {
    try {
      await sendEmail({ to: [email], subject: draft.subject as string, html: wrappedHtml })
      sent += 1
    } catch (err) {
      failed += 1
      console.error('[Newsletter cron] Send failed for one subscriber:', err)
    }
  }

  if (sent === 0 && failed > 0) {
    console.error('[Newsletter cron] All sends failed — keeping draft.')
    return NextResponse.json({ error: 'Send failed', sent, failed }, { status: 500 })
  }

  // Clear the draft — so next week it only sends if a new draft is saved
  await service.from('newsletter_drafts').delete().neq('id', '00000000-0000-0000-0000-000000000000')

  console.log(`[Newsletter cron] Successfully sent to ${sent} subscribers (${failed} failed).`)
  return NextResponse.json({ ok: true, sent, failed })
}
