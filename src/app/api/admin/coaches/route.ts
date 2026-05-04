import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/resend'
import { brandedEmail, emailButton } from '@/lib/email-template'

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  let body: {
    email: string
    display_name: string
    specialty?: string | null
    bio_short?: string | null
    bio?: string | null
    timezone?: string
  }

  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const { email, display_name, specialty, bio_short, bio, timezone } = body
  if (!email || !display_name) {
    return NextResponse.json({ error: 'Email and display name are required' }, { status: 400 })
  }
  if (!bio_short || !bio) {
    return NextResponse.json({ error: 'Summary Bio and Bio are required' }, { status: 400 })
  }

  const service = createServiceClient()

  const tz = timezone ?? 'America/New_York'
  const nameParts = display_name.trim().split(/\s+/)

  // Check if a user with this email already exists
  const { data: { users: existingUsers } } = await service.auth.admin.listUsers()
  const existingUser = existingUsers.find(u => u.email?.toLowerCase() === email.toLowerCase())

  let coachId: string

  if (existingUser) {
    const { data: existingProfile } = await service
      .from('profiles')
      .select('role')
      .eq('id', existingUser.id)
      .single()

    // Only allow promoting admins — don't silently reassign clients or PMs
    if (existingProfile?.role !== 'admin') {
      return NextResponse.json({ error: 'A user with this email already exists.' }, { status: 409 })
    }

    coachId = existingUser.id

    // Check if already in coaches table
    const { data: existingCoach } = await service.from('coaches').select('id').eq('id', coachId).single()
    if (existingCoach) {
      return NextResponse.json({ error: 'This admin is already set up as a coach.' }, { status: 409 })
    }

    // Don't change the admin's role — just add the coaches row
  } else {
    // New user — create the account then send invite via Resend
    const { data: linkData, error: linkErr } = await service.auth.admin.generateLink({
      type: 'invite',
      email,
      options: {
        data: { role: 'coach' },
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/confirm`,
      },
    })

    if (linkErr || !linkData?.user || !linkData?.properties?.action_link) {
      return NextResponse.json({ error: linkErr?.message ?? 'Failed to create coach account' }, { status: 500 })
    }

    coachId = linkData.user.id

    await service.from('profiles').update({
      role:       'coach',
      first_name: nameParts[0],
      last_name:  nameParts.slice(1).join(' ') || '',
      timezone:   tz,
      email,
    }).eq('id', coachId)

    const firstName = nameParts[0]
    await sendEmail({
      to: email,
      subject: "You've been invited to join Tenant Financial Solutions as a Coach",
      html: brandedEmail(`
        <h1 style="margin:0 0 8px;font-family:Georgia,serif;font-size:24px;color:#1A2B4A;">Welcome, ${firstName}!</h1>
        <p style="margin:0 0 20px;color:#6B7E8F;">
          You've been invited to join Tenant Financial Solutions as a financial coach.
          Click the button below to set your password and access your coach dashboard.
        </p>
        ${emailButton(linkData.properties.action_link, 'Accept Invitation & Set Password')}
        <p style="margin:24px 0 0;font-size:13px;color:#6B7E8F;">
          This link expires in 24 hours. If you didn't expect this email, you can safely ignore it.
        </p>
      `),
    })
  }

  // Create coaches row
  const { error: coachErr } = await service.from('coaches').insert({
    id:           coachId,
    email,
    display_name,
    specialty:    specialty  ?? null,
    bio_short:    bio_short  ?? null,
    bio:          bio        ?? null,
    timezone:     tz,
    is_active:    true,
  })

  if (coachErr) {
    return NextResponse.json({ error: coachErr.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, id: coachId })
}
