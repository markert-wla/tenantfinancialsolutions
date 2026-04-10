import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  let body: { partner_name: string; partner_type: string; contact_name?: string | null; contact_email?: string | null; model?: string | null }
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  if (!body.partner_name || !body.partner_type) {
    return NextResponse.json({ error: 'Name and type are required' }, { status: 400 })
  }

  const service = createServiceClient()
  const { error } = await service.from('partners').insert({
    partner_name:  body.partner_name,
    partner_type:  body.partner_type,
    contact_name:  body.contact_name  ?? null,
    contact_email: body.contact_email ?? null,
    model:         body.model         ?? null,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
