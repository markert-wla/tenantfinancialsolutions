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
const MAX_IMAGES       = 5  // per message, enforced client-side; server re-validates
const MAX_SIZE         = 10 * 1024 * 1024 // 10 MB

export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (!profile || (profile.role !== 'coach' && profile.role !== 'admin'))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 })
  }

  const file     = formData.get('file') as File | null
  const clientId = formData.get('clientId') as string | null

  if (!file)     return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  if (!clientId) return NextResponse.json({ error: 'clientId required' }, { status: 400 })

  // Type check
  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    return NextResponse.json(
      { error: 'Unsupported file type. Please upload a PDF, DOCX, TXT, JPG, or PNG.' },
      { status: 400 }
    )
  }

  // Size check
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: 'File exceeds the 10 MB limit.' }, { status: 400 })
  }

  // Re-validate image count from the pending files list sent by client
  const imageLimitStr = formData.get('currentImageCount') as string | null
  if (IMAGE_MIME_TYPES.has(file.type) && imageLimitStr) {
    const currentCount = parseInt(imageLimitStr, 10)
    if (!isNaN(currentCount) && currentCount >= MAX_IMAGES) {
      return NextResponse.json(
        { error: `Maximum of ${MAX_IMAGES} images per message.` },
        { status: 400 }
      )
    }
  }

  const timestamp = Date.now()
  const safeName  = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
  // Path: {coachId}/{clientId}/{timestamp}-{filename}
  const filePath  = `${user.id}/${clientId}/${timestamp}-${safeName}`

  const arrayBuffer = await file.arrayBuffer()
  const { error: uploadError } = await supabase.storage
    .from('coach-documents')
    .upload(filePath, arrayBuffer, {
      contentType: file.type || 'application/octet-stream',
      upsert: false,
    })

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 })
  }

  return NextResponse.json({
    name:      file.name,
    path:      filePath,
    size:      file.size,
    mime_type: file.type,
  })
}
