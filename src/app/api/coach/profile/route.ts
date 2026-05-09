import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { TIMEZONES } from '@/lib/timezones'

export async function PATCH(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || (profile.role !== 'coach' && profile.role !== 'admin')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let body: Record<string, unknown>
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const profileUpdate: Record<string, unknown> = {}
  const coachUpdate: Record<string, unknown> = {}

  if (typeof body.first_name === 'string') profileUpdate.first_name = body.first_name.trim().slice(0, 100)
  if (typeof body.last_name  === 'string') profileUpdate.last_name  = body.last_name.trim().slice(0, 100)

  if (body.contact_email === null || body.contact_email === '') {
    profileUpdate.contact_email = null
  } else if (typeof body.contact_email === 'string') {
    const email = body.contact_email.trim().toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Invalid contact email' }, { status: 400 })
    }
    profileUpdate.contact_email = email
  }

  if (typeof body.timezone === 'string' && TIMEZONES.includes(body.timezone)) {
    profileUpdate.timezone = body.timezone
    coachUpdate.timezone   = body.timezone
  }

  if (typeof body.display_name === 'string') coachUpdate.display_name = body.display_name.trim().slice(0, 150)
  if (typeof body.bio          === 'string') coachUpdate.bio          = body.bio.trim().slice(0, 2000) || null
  if (typeof body.bio_short    === 'string') coachUpdate.bio_short    = body.bio_short.trim().slice(0, 200) || null
  if (typeof body.specialty    === 'string') coachUpdate.specialty    = body.specialty.trim().slice(0, 200) || null
  if (typeof body.photo_url    === 'string') coachUpdate.photo_url    = body.photo_url.trim() || null
  if (typeof body.zoom_link    === 'string') coachUpdate.zoom_link    = body.zoom_link.trim().slice(0, 500) || null
  else if (body.zoom_link === null)          coachUpdate.zoom_link    = null

  if (!coachUpdate.display_name) {
    return NextResponse.json({ error: 'Display name is required' }, { status: 400 })
  }

  const service = createServiceClient()

  if (Object.keys(profileUpdate).length > 0) {
    const { error } = await service.from('profiles').update(profileUpdate).eq('id', user.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (Object.keys(coachUpdate).length > 0) {
    const { error } = await service.from('coaches').update(coachUpdate).eq('id', user.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
