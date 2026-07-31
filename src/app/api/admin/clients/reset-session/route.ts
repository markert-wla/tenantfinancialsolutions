import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

// PATCH /api/admin/clients/reset-session
// body: { clientId: string }
// Resets sessions_used_this_month to 0 for a free-plan client, allowing them to rebook.
export async function PATCH(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: actor } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (actor?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  let body: { clientId: string }
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  if (!body.clientId) {
    return NextResponse.json({ error: 'clientId is required' }, { status: 400 })
  }

  const service = createServiceClient()

  const { data: client } = await service
    .from('profiles')
    .select('plan_tier, sessions_used_this_month, first_name, last_name')
    .eq('id', body.clientId)
    .eq('role', 'client')
    .single()

  if (!client) return NextResponse.json({ error: 'Client not found' }, { status: 404 })

  if (client.plan_tier !== 'free') {
    return NextResponse.json(
      { error: 'Session reset is only available for free-plan clients' },
      { status: 400 }
    )
  }

  const { error } = await service
    .from('profiles')
    .update({ sessions_used_this_month: 0 })
    .eq('id', body.clientId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
