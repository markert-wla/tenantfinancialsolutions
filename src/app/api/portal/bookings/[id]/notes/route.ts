import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: { client_notes?: string | null }
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const clientNotes = typeof body.client_notes === 'string'
    ? body.client_notes.trim().slice(0, 2000) || null
    : null

  // Verify this booking belongs to the client, then update
  const { error } = await supabase
    .from('bookings')
    .update({ client_notes: clientNotes })
    .eq('id', params.id)
    .eq('client_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
