import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

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
    bio?: string | null
    timezone?: string
    photo_url?: string | null
  }

  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const { email, display_name, specialty, bio, timezone, photo_url } = body
  if (!email || !display_name) {
    return NextResponse.json({ error: 'Email and display name are required' }, { status: 400 })
  }

  const service = createServiceClient()

  // Invite the coach — sends them an email to set their password
  const { data: invite, error: inviteErr } = await service.auth.admin.inviteUserByEmail(email, {
    data: { role: 'coach' },
  })

  if (inviteErr || !invite.user) {
    if (inviteErr?.message?.includes('already registered')) {
      return NextResponse.json({ error: 'A user with this email already exists.' }, { status: 409 })
    }
    return NextResponse.json({ error: inviteErr?.message ?? 'Failed to create coach account' }, { status: 500 })
  }

  const coachId = invite.user.id
  const tz = timezone ?? 'America/New_York'
  const nameParts = display_name.trim().split(/\s+/)

  // Trigger creates the profiles row; update it with coach role + name
  await service.from('profiles').update({
    role:       'coach',
    first_name: nameParts[0],
    last_name:  nameParts.slice(1).join(' ') || '',
    timezone:   tz,
    email,
  }).eq('id', coachId)

  // Create coaches row
  const { error: coachErr } = await service.from('coaches').insert({
    id:           coachId,
    email,
    display_name,
    specialty:    specialty ?? null,
    bio:          bio       ?? null,
    timezone:     tz,
    photo_url:    photo_url ?? null,
    is_active:    true,
  })

  if (coachErr) {
    return NextResponse.json({ error: coachErr.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, id: coachId })
}
