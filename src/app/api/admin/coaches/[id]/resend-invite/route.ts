import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/resend'
import { brandedEmail, emailButton } from '@/lib/email-template'

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: callerProfile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (callerProfile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const service = createServiceClient()

  const { data: coach } = await service
    .from('coaches')
    .select('email, display_name')
    .eq('id', params.id)
    .single()

  if (!coach) return NextResponse.json({ error: 'Coach not found' }, { status: 404 })

  const { data: { user: authUser } } = await service.auth.admin.getUserById(params.id)

  if (authUser?.email_confirmed_at) {
    return NextResponse.json(
      { error: 'This coach has already confirmed their account. They can log in at /login.' },
      { status: 400 }
    )
  }

  const { data: linkData, error: linkErr } = await service.auth.admin.generateLink({
    type: 'invite',
    email: coach.email,
    options: {
      data: { role: 'coach' },
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/confirm`,
    },
  })

  if (linkErr || !linkData?.properties?.action_link) {
    return NextResponse.json(
      { error: linkErr?.message ?? 'Failed to generate invite link' },
      { status: 500 }
    )
  }

  const firstName = coach.display_name.trim().split(/\s+/)[0]

  await sendEmail({
    to: coach.email,
    subject: "Your Invitation to Tenant Financial Solutions — Action Required",
    html: brandedEmail(`
      <h1 style="margin:0 0 8px;font-family:Georgia,serif;font-size:24px;color:#1A2B4A;">Welcome, ${firstName}!</h1>
      <p style="margin:0 0 20px;color:#6B7E8F;">
        Your coach account at Tenant Financial Solutions is ready and waiting.
        Click the button below to set your password and access your coach dashboard.
      </p>
      ${emailButton(linkData.properties.action_link, 'Set My Password & Get Started')}
      <p style="margin:24px 0 0;font-size:13px;color:#6B7E8F;">
        This link expires in <strong>24 hours</strong>. Please click it promptly.
        If you have any trouble, contact your administrator.
      </p>
    `),
  })

  return NextResponse.json({ ok: true })
}
