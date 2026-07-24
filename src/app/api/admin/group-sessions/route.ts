import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  let body: { session_date: string; session_time?: string | null; session_timezone?: string | null; join_link?: string | null; partner_ids?: string[] | null }
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  if (!body.session_date) {
    return NextResponse.json({ error: 'session_date is required' }, { status: 400 })
  }

  const service = createServiceClient()
  const { error } = await service.from('group_sessions').insert({
    session_date:     body.session_date,
    session_time:     body.session_time ?? null,
    session_timezone: body.session_time ? body.session_timezone ?? null : null,
    join_link:        body.join_link    ?? null,
    partner_ids:  body.partner_ids?.length ? body.partner_ids : null,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
