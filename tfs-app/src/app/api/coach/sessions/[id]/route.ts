import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (!profile || (profile.role !== 'coach' && profile.role !== 'admin')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Verify this booking belongs to this coach
  const { data: booking } = await supabase
    .from('bookings')
    .select('id, coach_id, client_id, status, start_time_utc')
    .eq('id', params.id)
    .single()

  if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
  if (booking.coach_id !== user.id && profile.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let body: Record<string, unknown>
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const update: Record<string, unknown> = {}

  if ('notes' in body) {
    update.notes = typeof body.notes === 'string' ? body.notes.trim().slice(0, 2000) || null : null
  }
  if ('attended' in body && typeof body.attended === 'boolean') {
    update.attended = body.attended
  }
  if (body.status === 'cancelled') {
    if (booking.status === 'cancelled') {
      return NextResponse.json({ error: 'Already cancelled' }, { status: 400 })
    }
    if (new Date(booking.start_time_utc) < new Date()) {
      return NextResponse.json({ error: 'Cannot cancel a past session' }, { status: 400 })
    }
    update.status = 'cancelled'
  }

  if (!Object.keys(update).length) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
  }

  const service = createServiceClient()
  const { error } = await service.from('bookings').update(update).eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Restore session credit when cancelling a future session
  if (update.status === 'cancelled') {
    const { data: clientProfile } = await service
      .from('profiles')
      .select('sessions_used_this_month')
      .eq('id', booking.client_id)
      .single()
    if (clientProfile) {
      const restored = Math.max(0, (clientProfile.sessions_used_this_month ?? 0) - 1)
      await service.from('profiles')
        .update({ sessions_used_this_month: restored })
        .eq('id', booking.client_id)
    }
  }

  return NextResponse.json({ ok: true })
}
