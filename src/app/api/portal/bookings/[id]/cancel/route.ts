import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: booking } = await supabase
    .from('bookings')
    .select('id, client_id, status, start_time_utc')
    .eq('id', params.id)
    .single()

  if (!booking) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (booking.client_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (booking.status !== 'confirmed') {
    return NextResponse.json({ error: 'Only confirmed bookings can be cancelled' }, { status: 400 })
  }
  if (new Date(booking.start_time_utc) <= new Date()) {
    return NextResponse.json({ error: 'Cannot cancel a session that has already started' }, { status: 400 })
  }

  const service = createServiceClient()
  const { error } = await service
    .from('bookings')
    .update({ status: 'cancelled' })
    .eq('id', params.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
