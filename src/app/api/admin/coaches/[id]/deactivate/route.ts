import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/resend'
import { brandedEmail, emailButton } from '@/lib/email-template'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  let active: boolean
  try {
    const body = await req.json()
    active = Boolean(body.active)
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const service = createServiceClient()

  if (active) {
    // Look up the coach's email so we can re-send the invite
    const { data: coach, error: coachErr } = await service
      .from('coaches')
      .select('email, display_name')
      .eq('id', params.id)
      .single()

    if (coachErr || !coach?.email) {
      return NextResponse.json({ error: 'Coach not found' }, { status: 404 })
    }

    // Generate the invite link via Supabase, then deliver it through Resend
    // so it goes through our verified sending domain rather than Supabase's default mailer.
    const { data: linkData, error: linkErr } = await service.auth.admin.generateLink({
      type: 'invite',
      email: coach.email,
      options: {
        data: { role: 'coach' },
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/confirm`,
      },
    })

    if (linkErr || !linkData?.properties?.action_link) {
      return NextResponse.json({ error: linkErr?.message ?? 'Failed to generate invite link' }, { status: 500 })
    }

    const inviteUrl = linkData.properties.action_link
    const firstName = coach.display_name?.split(' ')[0] ?? 'Coach'

    await sendEmail({
      to: coach.email,
      subject: 'You've been reactivated — set your password to get started',
      html: brandedEmail(`
        <h1 style="margin:0 0 8px;font-family:Georgia,serif;font-size:24px;color:#1A2B4A;">Welcome back, ${firstName}!</h1>
        <p style="margin:0 0 20px;color:#6B7E8F;">
          Your Tenant Financial Solutions coach account has been reactivated.
          Click the button below to set your password and log back in.
        </p>
        ${emailButton(inviteUrl, 'Set Your Password')}
        <p style="margin:24px 0 0;font-size:13px;color:#6B7E8F;">
          This link expires in 24 hours. If you didn't expect this email, you can safely ignore it.
        </p>
      `),
    })
  }

  await Promise.all([
    service.from('coaches').update({ is_active: active }).eq('id', params.id),
    service.from('profiles').update({ is_active: active }).eq('id', params.id),
  ])

  return NextResponse.json({ ok: true })
}
