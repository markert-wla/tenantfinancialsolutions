import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  let body: { status?: string; notes?: string; flagged?: boolean }
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const service = createServiceClient()

  if (body.status === 'cancelled') {
    // Fetch the booking to get client_id and start time
    const { data: booking } = await service
      .from('bookings')
      .select('client_id, start_time_utc, status')
      .eq('id', params.id)
      .single()

    if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    if (booking.status === 'cancelled') return NextResponse.json({ ok: true }) // already cancelled

    await service.from('bookings').update({ status: 'cancelled' }).eq('id', params.id)

    // Restore session credit if the booking is in the current month
    const bookingDate = new Date(booking.start_time_utc)
    const now = new Date()
    const sameMonth =
      bookingDate.getUTCFullYear() === now.getUTCFullYear() &&
      bookingDate.getUTCMonth()    === now.getUTCMonth()

    if (sameMonth) {
      const { data: clientProfile } = await service
        .from('profiles')
        .select('sessions_used_this_month')
        .eq('id', booking.client_id)
        .single()

      const current = clientProfile?.sessions_used_this_month ?? 0
      if (current > 0) {
        await service
          .from('profiles')
          .update({ sessions_used_this_month: current - 1 })
          .eq('id', booking.client_id)
      }
    }

    return NextResponse.json({ ok: true })
  }

  if ('notes' in body) {
    const { error } = await service
      .from('bookings')
      .update({ notes: body.notes ?? null })
      .eq('id', params.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  // Admin can clear a flag (coaches cannot)
  if (body.flagged === false) {
    const { error } = await service
      .from('bookings')
      .update({ flagged: false, flag_reason: null })
      .eq('id', params.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
}
