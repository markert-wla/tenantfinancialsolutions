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

  // Messages the coach sent to this client
  // Note: attachments are fetched client-side via /api/portal/coach-attachments
  // using the service role — do NOT try to embed or sign them here.
  const { data: coachMessages } = await supabase
    .from('coach_messages')
    .select('id, body, created_at, read_at')
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

  return (
    <PortalMessagesClient
      initial={messages ?? []}
      coachMessages={coachMessages ?? []}
    />
  )
}
