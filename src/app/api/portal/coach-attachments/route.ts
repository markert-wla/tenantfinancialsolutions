import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

// GET /api/portal/coach-attachments?messageIds=id1,id2,...
// Returns attachments with signed download URLs for messages sent by a coach to this client.
export async function GET(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const raw = req.nextUrl.searchParams.get('messageIds') ?? ''
  const messageIds = raw.split(',').map(s => s.trim()).filter(Boolean)
  if (messageIds.length === 0) return NextResponse.json({})

  // Use the authenticated client for the data query — RLS enforces client_id === user.id
  const { data, error } = await supabase
    .from('coach_message_attachments')
    .select('id, message_id, file_name, file_path, file_size, mime_type, created_at')
    .in('message_id', messageIds)
    .eq('client_id', user.id)
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Use the service client to generate signed URLs — files are stored under the coach's
  // user ID in the path, so the client's session alone cannot sign them.
  const serviceClient = createServiceClient()
  const result: Record<string, unknown[]> = {}

  await Promise.all(
    (data ?? []).map(async (a) => {
      const { data: signed } = await serviceClient.storage
        .from('coach-documents')
        .createSignedUrl(a.file_path, 3600)
      const item = {
        id: a.id,
        file_name: a.file_name,
        file_size: a.file_size,
        mime_type: a.mime_type,
        url: signed?.signedUrl ?? null,
      }
      if (!result[a.message_id]) result[a.message_id] = []
      result[a.message_id].push(item)
    })
  )

  return NextResponse.json(result)
}
