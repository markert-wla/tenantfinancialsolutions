import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (!profile || (profile.role !== 'coach' && profile.role !== 'admin')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Distinct client IDs with at least one non-cancelled booking with this coach
  const { data: bookings } = await supabase
    .from('bookings')
    .select('client_id')
    .eq('coach_id', user.id)
    .neq('status', 'cancelled')

  const clientIds = Array.from(new Set((bookings ?? []).map((b: { client_id: string }) => b.client_id)))
  if (!clientIds.length) return NextResponse.json([])

  const { data: clients } = await supabase
    .from('profiles')
    .select('id, first_name, last_name, email, plan_tier, client_type, last_active_at, sessions_used_this_month, is_active')
    .in('id', clientIds)
    .order('last_name')

  return NextResponse.json(clients ?? [])
}
