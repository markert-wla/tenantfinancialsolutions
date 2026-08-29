import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: actor } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (actor?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // Stored files are not covered by the database cascade, so they must be
  // removed while their rows still exist to name the paths. Both directions go:
  // documents the client uploaded, and attachments their coach sent them.
  const service = createServiceClient()
  for (const [table, bucket] of [
    ['client_documents', 'client-documents'],
    ['coach_message_attachments', 'coach-documents'],
  ] as const) {
    const { data: rows, error: listErr } = await service
      .from(table)
      .select('file_path')
      .eq('client_id', params.id)
    if (listErr) {
      console.error(`[admin delete client] could not list ${table} for ${params.id}:`, listErr.message)
      continue
    }
    const paths = (rows ?? []).map(r => r.file_path).filter(Boolean)
    if (paths.length === 0) continue
    const { error: removeErr } = await service.storage.from(bucket).remove(paths)
    if (removeErr) {
      console.error(`[admin delete client] could not remove ${bucket} files for ${params.id}:`, removeErr.message)
    }
  }

  // delete_client_account is SECURITY DEFINER — handles cleanup + auth.users deletion,
  // no service role key required from the application layer.
  const { error } = await supabase.rpc('delete_client_account', { target_user_id: params.id })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
