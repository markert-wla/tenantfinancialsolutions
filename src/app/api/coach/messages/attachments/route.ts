import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const ALLOWED_TYPES = [
  'image/jpeg',
  'image/png',
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
]
const IMAGE_TYPES  = ['image/jpeg', 'image/png']
const MAX_SIZE     = 10 * 1024 * 1024 // 10 MB
const MAX_IMAGES   = 5

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (!profile || (profile.role !== 'coach' && profile.role !== 'admin'))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const formData = await req.formData().catch(() => null)
  if (!formData) return NextResponse.json({ error: 'Invalid form data' }, { status: 400 })

  const messageId = formData.get('messageId') as string | null
  const clientId  = formData.get('clientId')  as string | null
  const file      = formData.get('file')       as File | null

  if (!messageId || !clientId || !file)
    return NextResponse.json({ error: 'messageId, clientId, and file are required' }, { status: 400 })

  // The message must be one this coach sent to this client — otherwise a coach
  // could attach files into another coach's conversation.
  const { data: message } = await supabase
    .from('coach_messages')
    .select('id')
    .eq('id', messageId)
    .eq('coach_id', user.id)
    .eq('client_id', clientId)
    .single()
  if (!message)
    return NextResponse.json({ error: 'Message not found' }, { status: 404 })

  if (!ALLOWED_TYPES.includes(file.type))
    return NextResponse.json({ error: 'File type not allowed. Use PDF, DOCX, TXT, JPG, or PNG.' }, { status: 400 })

  if (file.size > MAX_SIZE)
    return NextResponse.json({ error: 'File exceeds 10 MB limit.' }, { status: 400 })

  // Enforce max 5 images per message
  if (IMAGE_TYPES.includes(file.type)) {
    const { count } = await supabase
      .from('coach_message_attachments')
      .select('id', { count: 'exact', head: true })
      .eq('message_id', messageId)
      .in('mime_type', IMAGE_TYPES)
    if ((count ?? 0) >= MAX_IMAGES)
      return NextResponse.json({ error: `Maximum ${MAX_IMAGES} images allowed per message.` }, { status: 400 })
  }

  // Upload to storage
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
  const path     = `${user.id}/${clientId}/${Date.now()}_${safeName}`
  const buffer   = Buffer.from(await file.arrayBuffer())

  const { error: uploadError } = await supabase.storage
    .from('coach-documents')
    .upload(path, buffer, { contentType: file.type, upsert: false })

  if (uploadError)
    return NextResponse.json({ error: uploadError.message }, { status: 500 })

  // Insert attachment record
  const { data, error } = await supabase
    .from('coach_message_attachments')
    .insert({
      message_id: messageId,
      coach_id:   user.id,
      client_id:  clientId,
      file_name:  file.name,
      file_path:  path,
      file_size:  file.size,
      mime_type:  file.type,
    })
    .select('id, file_name, file_size, mime_type, created_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Return with a fresh signed URL so the coach can see it immediately
  const { data: signed } = await supabase.storage
    .from('coach-documents')
    .createSignedUrl(path, 3600)

  return NextResponse.json({ ...data, url: signed?.signedUrl ?? null })
}

export async function GET(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (!profile || (profile.role !== 'coach' && profile.role !== 'admin'))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const messageId = req.nextUrl.searchParams.get('messageId')
  if (!messageId) return NextResponse.json({ error: 'messageId required' }, { status: 400 })

  const { data, error } = await supabase
    .from('coach_message_attachments')
    .select('id, file_name, file_path, file_size, mime_type, created_at')
    .eq('message_id', messageId)
    .eq('coach_id', user.id)
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const withUrls = await Promise.all(
    (data ?? []).map(async (a) => {
      const { data: signed } = await supabase.storage
        .from('coach-documents')
        .createSignedUrl(a.file_path, 3600)
      return { ...a, url: signed?.signedUrl ?? null }
    })
  )

  return NextResponse.json(withUrls)
}
