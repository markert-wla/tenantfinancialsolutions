import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

const EXTEND_DAYS = 30

// PATCH /api/admin/clients/deletion
// body: { clientId: string, action: 'extend' }
// Pushes a pending account deletion's purge date out by 30 more days.
// Immediate deletion reuses the existing DELETE /api/admin/clients/[id].
export async function PATCH(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: actor } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (actor?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  let body: { clientId?: string; action?: string }
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
  if (!body.clientId || body.action !== 'extend') {
    return NextResponse.json({ error: 'clientId and action=extend required' }, { status: 400 })
  }

  const service = createServiceClient()
  const { data: client } = await service
    .from('profiles')
    .select('deletion_scheduled_for')
    .eq('id', body.clientId)
    .eq('role', 'client')
    .single()

  if (!client) return NextResponse.json({ error: 'Client not found' }, { status: 404 })
  if (!client.deletion_scheduled_for) {
    return NextResponse.json({ error: 'No pending deletion for this client' }, { status: 400 })
  }

  // Extend from the later of (current schedule, now) so an overdue date
  // still gains a full 30 days rather than remaining in the past.
  const base = Math.max(new Date(client.deletion_scheduled_for).getTime(), Date.now())
  const newDate = new Date(base + EXTEND_DAYS * 24 * 60 * 60 * 1000).toISOString()

  const { error } = await service
    .from('profiles')
    .update({ deletion_scheduled_for: newDate })
    .eq('id', body.clientId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true, scheduledFor: newDate })
}
