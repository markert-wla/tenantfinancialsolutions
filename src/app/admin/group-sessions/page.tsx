export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import GroupSessionsClient from '@/components/admin/GroupSessionsClient'

export const metadata: Metadata = { title: 'Group Sessions — Admin' }

export default async function AdminGroupSessionsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: sessions }, { data: partners }] = await Promise.all([
    supabase
      .from('group_sessions')
      .select('id, session_date, join_link, recording_url, reminder_sent, partner_ids, created_at')
      .order('session_date', { ascending: false }),
    supabase
      .from('partners')
      .select('id, partner_name, partner_type')
      .order('partner_name', { ascending: true }),
  ])

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <GroupSessionsClient sessions={sessions ?? []} partners={partners ?? []} />
    </div>
  )
}
