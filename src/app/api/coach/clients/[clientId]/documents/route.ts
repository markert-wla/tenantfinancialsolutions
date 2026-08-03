import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  _req: Request,
  { params }: { params: { clientId: string } }
) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (!profile || !['coach', 'admin'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data: docs, error } = await supabase
    .from('client_documents')
    .select('id, file_name, file_path, file_size, mime_type, uploaded_at')
    .eq('client_id', params.clientId)
    .order('uploaded_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const withUrls = await Promise.all((docs ?? []).map(async (doc) => {
    const { data: signedData } = await supabase.storage
      .from('client-documents')
      .createSignedUrl(doc.file_path, 3600)
    return { ...doc, signed_url: signedData?.signedUrl ?? null }
  }))

  return NextResponse.json(withUrls)
}
