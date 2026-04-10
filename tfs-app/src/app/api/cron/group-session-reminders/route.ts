import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/resend'

export async function GET(req: NextRequest) {
  const secret = req.headers.get('authorization')?.replace('Bearer ', '')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const service = createServiceClient()

  // Find group sessions exactly 3 days from today
  const target = new Date()
  target.setUTCDate(target.getUTCDate() + 3)
  const targetDate = target.toISOString().split('T')[0]

  const { data: sessions } = await service
    .from('group_sessions')
    .select('id, session_date, join_link')
    .eq('session_date', targetDate)
    .eq('reminder_sent', false)

  if (!sessions?.length) {
    return NextResponse.json({ ok: true, sent: 0 })
  }

  // Get all active clients
  const { data: clients } = await service
    .from('profiles')
    .select('email, first_name')
    .eq('role', 'client')
    .eq('is_active', true)
    .neq('plan_tier', 'free')

  if (!clients?.length) {
    return NextResponse.json({ ok: true, sent: 0 })
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? ''
  let totalSent = 0

  for (const session of sessions) {
    const formattedDate = new Date(session.session_date + 'T00:00:00Z').toLocaleDateString('en-US', {
      weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC',
    })

    // Send to each active client
    for (const client of clients) {
      await sendEmail({
        to: client.email,
        subject: `Reminder: TFS Group Session on ${formattedDate}`,
        html: `
          <h2>Hi ${client.first_name},</h2>
          <p>Just a reminder that your monthly group coaching session is coming up in <strong>3 days</strong>.</p>
          <p><strong>Date:</strong> ${formattedDate}</p>
          ${session.join_link
            ? `<p><a href="${session.join_link}" style="background:#1D9E75;color:white;padding:10px 20px;border-radius:8px;text-decoration:none;display:inline-block;margin-top:8px;">Join Session</a></p>`
            : `<p>The join link will be available soon. Check your portal for updates.</p>`
          }
          <p style="margin-top:16px;">
            <a href="${siteUrl}/portal/dashboard">View your portal →</a>
          </p>
          <p>See you there!<br/>— The TFS Team</p>
        `,
      })
      totalSent++
    }

    // Mark as sent
    await service
      .from('group_sessions')
      .update({ reminder_sent: true })
      .eq('id', session.id)
  }

  return NextResponse.json({ ok: true, sent: totalSent })
}
