import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/resend'
import { brandedEmail } from '@/lib/email-template'

export const dynamic = 'force-dynamic'

/**
 * GET /api/cron/birthday-emails
 *
 * Runs on the 1st of every month at 6am EST (11:00 UTC).
 * Sends a birthday email to every client on the Starter or Advantage plan
 * whose birthday_month matches the current month.
 *
 * Vercel Cron always dispatches a GET request — this must stay GET, not POST.
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  const secret = process.env.CRON_SECRET

  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Current month in Eastern Standard Time (UTC-5)
  const nowUTC = new Date()
  const nowEST = new Date(nowUTC.getTime() - 5 * 60 * 60 * 1000)
  const currentMonth = nowEST.getMonth() + 1 // 1–12

  const service = createServiceClient()

  const { data: clients, error } = await service
    .from('profiles')
    .select('id, first_name, last_name, email')
    .eq('role', 'client')
    .eq('is_active', true)
    .eq('birthday_month', currentMonth)
    .in('plan_tier', ['starter', 'advantage'])
    .not('email', 'is', null)

  if (error) {
    console.error('[cron/birthday-emails] DB error:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!clients || clients.length === 0) {
    console.log(`[cron/birthday-emails] No Starter/Advantage clients with birthday in month ${currentMonth}.`)
    return NextResponse.json({ ok: true, sent: 0 })
  }

  const subject = 'Happy Birthday from TFS! 🎉'

  const bodyHtml = `
    <h1 style="font-family:Georgia,serif;font-size:26px;font-weight:bold;color:#1a3a4a;text-align:center;margin:0 0 24px;padding-bottom:16px;border-bottom:2px solid #e2e8f0;">
      Happy Birthday from TFS!
    </h1>
    <p style="margin:0 0 16px;color:#1A2B4A;font-size:16px;line-height:1.7;">
      Your Financial Story Matters, and we're grateful to be part of it. As our gift to you, enjoy a
      <strong>free birthday coaching session</strong> this month. We're celebrating your growth and your future.
    </p>
    <p style="margin:24px 0 0;font-size:13px;color:#6B7E8F;">— The TFS Team</p>
  `

  const html = brandedEmail(bodyHtml)

  let sent = 0
  const failed: string[] = []

  for (const client of clients) {
    const name = [client.first_name, client.last_name].filter(Boolean).join(' ') || client.email
    try {
      await sendEmail({ to: [client.email], subject, html })
      sent++
      console.log(`[cron/birthday-emails] Sent to ${name} (${client.email})`)
    } catch (err) {
      console.error(`[cron/birthday-emails] Failed for ${name}:`, err)
      failed.push(name)
    }
  }

  return NextResponse.json({ ok: true, sent, failed: failed.length, month: currentMonth })
}
