import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  let body: { type: string; content: string; label?: string }
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  if (!body.type || !body.content?.trim()) {
    return NextResponse.json({ error: 'type and content are required' }, { status: 400 })
  }
  if (!['youtube', 'text'].includes(body.type)) {
    return NextResponse.json({ error: 'type must be youtube or text' }, { status: 400 })
  }

  const service = createServiceClient()
  const { data, error } = await service
    .from('public_popups')
    .insert({ type: body.type, content: body.content.trim(), label: body.label?.trim() || null })
    .select('id')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, id: data.id })
}
