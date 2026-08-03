import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'image/jpeg',
  'image/png',
])

const IMAGE_MIME_TYPES = new Set(['image/jpeg', 'image/png'])
const MAX_IMAGE_COUNT = 5
const MAX_SIZE = 10 * 1024 * 1024 // 10 MB

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: docs, error } = await supabase
    .from('client_documents')
    .select('id, file_name, file_path, file_size, mime_type, uploaded_at')
    .eq('client_id', user.id)
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

export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 })
  }

  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

  // Type validation
  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    return NextResponse.json(
      { error: 'Unsupported file type. Please upload a PDF, DOCX, TXT, JPG, or PNG.' },
      { status: 400 }
    )
  }

  // Size validation
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: 'File exceeds the 10 MB limit.' }, { status: 400 })
  }

  // Image count validation
  if (IMAGE_MIME_TYPES.has(file.type)) {
    const { count, error: countError } = await supabase
      .from('client_documents')
      .select('id', { count: 'exact', head: true })
      .eq('client_id', user.id)
      .in('mime_type', Array.from(IMAGE_MIME_TYPES))

    if (!countError && (count ?? 0) >= MAX_IMAGE_COUNT) {
      return NextResponse.json(
        { error: `You have reached the maximum of ${MAX_IMAGE_COUNT} images. Remove one before uploading another.` },
        { status: 400 }
      )
    }
  }

  const timestamp = Date.now()
  const safeName  = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
  const filePath  = `${user.id}/${timestamp}-${safeName}`

  const arrayBuffer = await file.arrayBuffer()
  const { error: uploadError } = await supabase.storage
    .from('client-documents')
    .upload(filePath, arrayBuffer, {
      contentType: file.type || 'application/octet-stream',
      upsert: false,
    })

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 })
  }

  const { data: doc, error: dbError } = await supabase
    .from('client_documents')
    .insert({
      client_id: user.id,
      file_name: file.name,
      file_path: filePath,
      file_size: file.size,
      mime_type: file.type || null,
    })
    .select()
    .single()

  if (dbError) {
    await supabase.storage.from('client-documents').remove([filePath])
    return NextResponse.json({ error: dbError.message }, { status: 500 })
  }

  const { data: signedData } = await supabase.storage
    .from('client-documents')
    .createSignedUrl(filePath, 3600)

  return NextResponse.json({ ...doc, signed_url: signedData?.signedUrl ?? null })
}

export async function DELETE(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await request.json()
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const { data: doc, error: fetchError } = await supabase
    .from('client_documents')
    .select('file_path')
    .eq('id', id)
    .eq('client_id', user.id)
    .single()

  if (fetchError || !doc) {
    return NextResponse.json({ error: 'Document not found' }, { status: 404 })
  }

  await supabase.storage.from('client-documents').remove([doc.file_path])
  await supabase.from('client_documents').delete().eq('id', id).eq('client_id', user.id)

  return NextResponse.json({ success: true })
}
