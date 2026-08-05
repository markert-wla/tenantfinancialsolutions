export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import PortalMessagesClient from '@/components/portal/PortalMessagesClient'

export const metadata: Metadata = { title: 'Message My Coach' }

export default async function PortalMessagesPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Messages the client sent to their coach
  const { data: messages } = await supabase
    .from('portal_messages')
    .select('id, body, created_at')
    .eq('client_id', user.id)
    .order('created_at', { ascending: false })

  // Messages the coach sent to this client (including attachments)
  const { data: coachMessages } = await supabase
    .from('coach_messages')
    .select('id, body, created_at, read_at, attachments')
    .eq('client_id', user.id)
    .order('created_at', { ascending: false })

  // Mark unread coach messages as read now that client is viewing them
  const unreadIds = (coachMessages ?? [])
    .filter((m: { read_at: string | null }) => !m.read_at)
    .map((m: { id: string }) => m.id)

  if (unreadIds.length > 0) {
    await supabase
      .from('coach_messages')
      .update({ read_at: new Date().toISOString() })
      .in('id', unreadIds)
      .eq('client_id', user.id)
  }

  // Generate signed URLs for any file attachments so the client can download them
  type RawAttachment = { name: string; path: string; size: number; mime_type: string }
  const coachMessagesWithUrls = await Promise.all(
    (coachMessages ?? []).map(async (msg: {
      id: string
      body: string
      created_at: string
      read_at: string | null
      attachments?: RawAttachment[]
    }) => {
      const attachments: RawAttachment[] = Array.isArray(msg.attachments) ? msg.attachments : []
      if (attachments.length === 0) return { ...msg, attachments: [] }

      const withUrls = await Promise.all(
        attachments.map(async (att) => {
          const { data: signedData } = await supabase.storage
            .from('coach-documents')
            .createSignedUrl(att.path, 3600)
          return { ...att, signed_url: signedData?.signedUrl ?? null }
        })
      )
      return { ...msg, attachments: withUrls }
    })
  )

  return (
    <PortalMessagesClient
      initial={messages ?? []}
      coachMessages={coachMessagesWithUrls}
    />
  )
}
