import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

async function getCoachUser() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { user: null, supabase }
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'coach' && profile?.role !== 'admin') return { user: null, supabase }
  return { user, supabase }
}

export async function GET() {
  const { user } = await getCoachUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createClient()
  const { data } = await supabase
    .from('coach_unavailable_dates')
    .select('id, date, note')
    .eq('coach_id', user.id)
    .order('date')

  return NextResponse.json(data ?? [])
}

export async function POST(req: NextRequest) {
  const { user } = await getCoachUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: { date: string; note?: string }
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  if (!body.date || !/^\d{4}-\d{2}-\d{2}$/.test(body.date)) {
    return NextResponse.json({ error: 'Invalid date format (expected YYYY-MM-DD)' }, { status: 400 })
  }

  const service = createServiceClient()
  const { error } = await service
    .from('coach_unavailable_dates')
    .upsert({ coach_id: user.id, date: body.date, note: body.note ?? null }, { onConflict: 'coach_id,date' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const { user } = await getCoachUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: { id: string }
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const service = createServiceClient()
  const { error } = await service
    .from('coach_unavailable_dates')
    .delete()
    .eq('id', body.id)
    .eq('coach_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
