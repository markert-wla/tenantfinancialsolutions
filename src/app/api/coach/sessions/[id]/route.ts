import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

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
  // Coaches can flag; only admin can clear — enforced here and in admin API
  if (body.flagged === true && typeof body.flag_reason === 'string') {
    update.flagged     = true
    update.flag_reason = body.flag_reason.trim().slice(0, 1000) || null
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

  // Use regular client for the update — coach UPDATE policy now allows this
  const { error } = await supabase.from('bookings').update(update).eq('id', params.id)
  if (error) {
    console.error('[Sessions PATCH] Update failed:', error.message, error.details)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  // Credit restoration on cancellation is handled by the DB trigger
  // trg_restore_session_credit (SECURITY DEFINER, bypasses RLS)

  return NextResponse.json({ ok: true })
}
