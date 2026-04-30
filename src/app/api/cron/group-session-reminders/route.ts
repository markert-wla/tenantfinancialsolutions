import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/resend'
import { brandedEmail, emailButton } from '@/lib/email-template'

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  const authHeader = req.headers.get('authorization')
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const service = createServiceClient()

  // Find group sessions exactly 3 days from today
  const target = new Date()
  target.setUTCDate(target.getUTCDate() + 3)
  const targetDate = target.toISOString().split('T')[0]

  const { data: sessions } = await service
    .from('group_sessions')
    .select('id, session_date, join_link, partner_ids')
    .eq('session_date', targetDate)
    .eq('reminder_sent', false)

  if (!sessions?.length) {
    return NextResponse.json({ ok: true, sent: 0 })
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? ''
  let totalSent = 0

  for (const session of sessions) {
    const formattedDate = new Date(session.session_date + 'T00:00:00Z').toLocaleDateString('en-US', {
      weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC',
    })

    // Determine which clients to notify
    let clients: { email: string; first_name: string | null }[] | null = null

    if (session.partner_ids && session.partner_ids.length > 0) {
      // Targeted: only tenants whose promo code links to one of the partner groups
      const { data: matchingCodes } = await service
        .from('promo_codes')
        .select('code')
        .in('partner_id', session.partner_ids)

      const codelist = matchingCodes?.map(c => c.code) ?? []

      if (codelist.length > 0) {
        const { data } = await service
          .from('profiles')
          .select('email, first_name')
          .eq('role', 'client')
          .eq('is_active', true)
          .neq('plan_tier', 'free')
          .in('promo_code_used', codelist)
        clients = data
      }
    } else {
      // Open to all active paid clients
      const { data } = await service
        .from('profiles')
        .select('email, first_name')
        .eq('role', 'client')
        .eq('is_active', true)
        .neq('plan_tier', 'free')
      clients = data
    }

    if (!clients?.length) {
      await service.from('group_sessions').update({ reminder_sent: true }).eq('id', session.id)
      continue
    }

    // Send to each qualifying client
    for (const client of clients) {
      await sendEmail({
        to: client.email,
        subject: `Reminder: TFS Group Session on ${formattedDate}`,
        html: brandedEmail(`
          <h1 style="margin:0 0 8px;font-family:Georgia,serif;font-size:24px;color:#1A2B4A;">Group Session Reminder</h1>
          <p style="margin:0 0 24px;color:#6B7E8F;">Hi ${client.first_name}, your monthly group coaching session is coming up in <strong style="color:#1A2B4A;">3 days</strong>.</p>
          <table cellpadding="0" cellspacing="0" style="width:100%;background:#F8FFFE;border:1px solid #D1EFE6;border-radius:8px;margin-bottom:24px;">
            <tr><td style="padding:12px 16px;">
              <span style="font-size:12px;color:#6B7E8F;text-transform:uppercase;letter-spacing:0.5px;">Date</span><br>
              <strong style="color:#1A2B4A;">${formattedDate}</strong>
            </td></tr>
          </table>
          ${session.join_link
            ? emailButton(session.join_link, 'Join Session')
            : `<p style="margin:0 0 24px;color:#6B7E8F;">The join link will be available soon. Check your portal for updates.</p>${emailButton(`${siteUrl}/portal/dashboard`, 'View My Portal')}`
          }
          <p style="margin:24px 0 0;font-size:13px;color:#6B7E8F;">See you there! — The TFS Team</p>
        `),
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
