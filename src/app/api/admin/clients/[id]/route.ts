import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: actor } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (actor?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const service = createServiceClient()

  // Clean up related records that would block deletion (NO ACTION FKs)
  const { error: cleanupErr } = await service.rpc('delete_client_data', { target_user_id: params.id })
  if (cleanupErr) return NextResponse.json({ error: cleanupErr.message }, { status: 500 })

  // Delete the auth user — cascades to profiles, group_session_attendance
  const { error } = await service.auth.admin.deleteUser(params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
