import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  let active: boolean
  try {
    const body = await req.json()
    active = Boolean(body.active)
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const service = createServiceClient()
  await Promise.all([
    service.from('coaches').update({ is_active: active }).eq('id', params.id),
    service.from('profiles').update({ is_active: active }).eq('id', params.id),
  ])

  return NextResponse.json({ ok: true })
}
