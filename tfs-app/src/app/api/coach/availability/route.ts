import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'coach' && profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data } = await supabase
    .from('availability')
    .select('id, day_of_week, start_time_utc, end_time_utc')
    .eq('coach_id', user.id)
    .order('day_of_week')
    .order('start_time_utc')

  return NextResponse.json(data ?? [])
}

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'coach' && profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let slots: Array<{ day_of_week: number; start_time_utc: string; end_time_utc: string }>
  try {
    slots = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  // Validate
  for (const s of slots) {
    if (s.day_of_week < 0 || s.day_of_week > 6) {
      return NextResponse.json({ error: 'Invalid day_of_week' }, { status: 400 })
    }
    if (s.start_time_utc >= s.end_time_utc) {
      return NextResponse.json({ error: 'Start time must be before end time' }, { status: 400 })
    }
  }

  const service = createServiceClient()

  // Replace all availability for this coach
  await service.from('availability').delete().eq('coach_id', user.id)

  if (slots.length > 0) {
    const { error } = await service.from('availability').insert(
      slots.map(s => ({ coach_id: user.id, ...s }))
    )
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
