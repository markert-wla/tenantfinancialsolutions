import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

async function getCoachUser() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { user: null, supabase }
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'coach' && profile?.role !== 'admin') return { user: null, supabase }
  return { user, supabase }
}

export async function GET() {
  const { user, supabase } = await getCoachUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data } = await supabase
    .from('coach_unavailable_dates')
    .select('id, date, note, all_day, start_time, end_time')
    .eq('coach_id', user.id)
    .order('date')

  return NextResponse.json(data ?? [])
}

export async function POST(req: NextRequest) {
  const { user, supabase } = await getCoachUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: { date: string; note?: string; all_day?: boolean; start_time?: string; end_time?: string }
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  if (!body.date || !/^\d{4}-\d{2}-\d{2}$/.test(body.date)) {
    return NextResponse.json({ error: 'Invalid date format (expected YYYY-MM-DD)' }, { status: 400 })
  }

  const allDay = body.all_day !== false

  if (!allDay && (!body.start_time || !body.end_time)) {
    return NextResponse.json({ error: 'start_time and end_time required for time blocks' }, { status: 400 })
  }

  const { error } = await supabase
    .from('coach_unavailable_dates')
    .insert({
      coach_id:   user.id,
      date:       body.date,
      note:       body.note?.trim() || null,
      all_day:    allDay,
      start_time: allDay ? null : body.start_time,
      end_time:   allDay ? null : body.end_time,
    })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const { user, supabase } = await getCoachUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: { id: string }
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const { error } = await supabase
    .from('coach_unavailable_dates')
    .delete()
    .eq('id', body.id)
    .eq('coach_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
