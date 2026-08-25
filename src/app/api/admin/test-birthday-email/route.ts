import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/resend'
import { brandedEmail } from '@/lib/email-template'

export const dynamic = 'force-dynamic'

/**
 * POST /api/admin/test-birthday-email
 * Body: { to: string }
 *
 * Admin-only endpoint to send a test birthday email to a specified address.
 * Sends the exact same template used by the automated cron job.
 */
export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const to: string = body?.to?.trim()
  if (!to || !to.includes('@')) {
    return NextResponse.json({ error: 'Invalid email address' }, { status: 400 })
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

  try {
    await sendEmail({ to: [to], subject, html })
    return NextResponse.json({ ok: true })
  } catch (err: any) {
    console.error('[test-birthday-email] Send failed:', err)
    return NextResponse.json({ error: err?.message ?? 'Send failed' }, { status: 500 })
  }
}
