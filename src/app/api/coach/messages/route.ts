import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendEmail, FROM } from '@/lib/resend'

export async function GET(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (!profile || (profile.role !== 'coach' && profile.role !== 'admin'))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const clientId = req.nextUrl.searchParams.get('clientId')
  if (!clientId) return NextResponse.json({ error: 'clientId required' }, { status: 400 })

  const { data, error } = await supabase
    .from('coach_messages')
    .select('id, body, created_at, read_at')
    .eq('coach_id', user.id)
    .eq('client_id', clientId)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Fetch attachments for all returned messages and embed them
  const messageIds = (data ?? []).map(m => m.id)
  const attachmentsByMessage: Record<string, { id: string; file_name: string; file_path: string; file_size: number | null; mime_type: string | null; url: string | null }[]> = {}

  if (messageIds.length > 0) {
    const { data: atts } = await supabase
      .from('coach_message_attachments')
      .select('id, message_id, file_name, file_path, file_size, mime_type')
      .in('message_id', messageIds)
      .eq('coach_id', user.id)
      .order('created_at', { ascending: true })

    if (atts && atts.length > 0) {
      const attsWithUrls = await Promise.all(
        atts.map(async (a) => {
          const { data: signed } = await supabase.storage
            .from('coach-documents')
            .createSignedUrl(a.file_path, 3600)
          return { ...a, url: signed?.signedUrl ?? null }
        })
      )
      for (const a of attsWithUrls) {
        if (!attachmentsByMessage[a.message_id]) attachmentsByMessage[a.message_id] = []
        attachmentsByMessage[a.message_id].push(a)
      }
    }
  }

  const result = (data ?? []).map(m => ({
    ...m,
    attachments: attachmentsByMessage[m.id] ?? [],
  }))

  return NextResponse.json(result)
}

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: coachProfile } = await supabase
    .from('profiles').select('role, first_name, last_name').eq('id', user.id).single()
  if (!coachProfile || (coachProfile.role !== 'coach' && coachProfile.role !== 'admin'))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { clientId, body } = await req.json().catch(() => ({}))
  if (!clientId || !body?.trim())
    return NextResponse.json({ error: 'clientId and body are required' }, { status: 400 })

  const { data, error } = await supabase
    .from('coach_messages')
    .insert({ coach_id: user.id, client_id: clientId, body: body.trim() })
    .select('id, body, created_at, read_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Send email notification to the client
  try {
    const { data: clientProfile } = await supabase
      .from('profiles')
      .select('email, first_name')
      .eq('id', clientId)
      .single()

    if (clientProfile?.email) {
      const coachName = [coachProfile.first_name, coachProfile.last_name].filter(Boolean).join(' ') || 'Your coach'
      await sendEmail({
        to: clientProfile.email,
        subject: 'You have a new message from your TFS Coach',
        html: `
          <div style="font-family:sans-serif;max-width:520px;margin:0 auto;">
            <h2 style="color:#1a365d;">New message from ${coachName}</h2>
            <p>Hi ${clientProfile.first_name ?? 'there'},</p>
            <p>Your coach has sent you a new message on the Tenant Financial Solutions portal. Log in to read it and reply.</p>
            <a href="https://app.tenantfinancialsolutions.com/portal/messages"
               style="display:inline-block;margin-top:12px;padding:10px 20px;background:#2b6cb0;color:#fff;border-radius:6px;text-decoration:none;">View Message</a>
            <p style="margin-top:24px;font-size:12px;color:#718096;">Tenant Financial Solutions &bull; <a href="https://tenantfinancialsolutions.com" style="color:#718096;">tenantfinancialsolutions.com</a></p>
          </div>
        `,
      })
    }
  } catch (emailErr) {
    // Non-fatal — log but don't fail the request
    console.error('[coach/messages] Failed to send client notification email:', emailErr)
  }

  return NextResponse.json(data)
}
