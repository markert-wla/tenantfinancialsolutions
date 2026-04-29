import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (!profile || (profile.role !== 'coach' && profile.role !== 'admin')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let body: { session_id: string; client_id: string; attended: boolean }
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const { session_id, client_id, attended } = body
  if (!session_id || !client_id || typeof attended !== 'boolean') {
    return NextResponse.json({ error: 'session_id, client_id, and attended are required' }, { status: 400 })
  }

  const service = createServiceClient()

  // Block marking attendance for future sessions
  const today = new Date().toISOString().split('T')[0]
  const { data: sessionRow } = await service
    .from('group_sessions')
    .select('session_date')
    .eq('id', session_id)
    .single()

  if (!sessionRow || sessionRow.session_date > today) {
    return NextResponse.json({ error: 'Attendance cannot be recorded for future sessions' }, { status: 400 })
  }
  const { error } = await service
    .from('group_session_attendance')
    .upsert({ session_id, client_id, attended }, { onConflict: 'session_id,client_id' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
