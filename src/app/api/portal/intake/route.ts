import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: { responses: Record<string, unknown>; language: string }
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const { responses, language } = body
  if (!responses || typeof responses !== 'object') {
    return NextResponse.json({ error: 'Responses are required' }, { status: 400 })
  }

  const service = createServiceClient()

  const { error: insertErr } = await service
    .from('intake_responses')
    .insert({ client_id: user.id, language: language ?? 'en', responses })

  if (insertErr) {
    return NextResponse.json({ error: insertErr.message }, { status: 500 })
  }

  const { error: profileErr } = await service
    .from('profiles')
    .update({ intake_completed_at: new Date().toISOString() })
    .eq('id', user.id)

  if (profileErr) {
    console.error('[intake] profile update failed:', profileErr.message)
  }

  return NextResponse.json({ ok: true })
}
