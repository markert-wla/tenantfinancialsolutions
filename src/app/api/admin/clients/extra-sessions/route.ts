import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

// PATCH /api/admin/clients/extra-sessions
// body: { clientId: string, amount: number }
// Sets extra_sessions += amount (amount can be negative to subtract, floor at 0)
export async function PATCH(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  let body: { clientId: string; amount: number }
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const amount = Math.round(body.amount)
  if (!body.clientId || typeof amount !== 'number' || amount === 0 || !isFinite(amount)) {
    return NextResponse.json({ error: 'clientId and non-zero amount required' }, { status: 400 })
  }
  if (Math.abs(amount) > 50) {
    return NextResponse.json({ error: 'Amount cannot exceed 50' }, { status: 400 })
  }

  const service = createServiceClient()

  // Get current value
  const { data: client } = await service
    .from('profiles')
    .select('extra_sessions, first_name, last_name')
    .eq('id', body.clientId)
    .eq('role', 'client')
    .single()

  if (!client) return NextResponse.json({ error: 'Client not found' }, { status: 404 })

  const newValue = Math.max(0, (client.extra_sessions ?? 0) + amount)

  const { error } = await service
    .from('profiles')
    .update({ extra_sessions: newValue })
    .eq('id', body.clientId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true, extra_sessions: newValue })
}
