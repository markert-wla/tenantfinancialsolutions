export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import HistoryClient from '@/components/portal/HistoryClient'

export const metadata: Metadata = { title: 'My Sessions' }

export default async function HistoryPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('timezone')
    .eq('id', user.id)
    .single()

  const userTz = profile?.timezone ?? 'America/New_York'

  const { data: bookings } = await supabase
    .from('bookings')
    .select(`
      id,
      start_time_utc,
      end_time_utc,
      status,
      client_notes,
      coaches ( display_name )
    `)
    .eq('client_id', user.id)
    .order('start_time_utc', { ascending: false })

  const now      = new Date()
  const upcoming = (bookings ?? []).filter((b: any) => new Date(b.start_time_utc) >= now && b.status !== 'cancelled')
  const past     = (bookings ?? []).filter((b: any) => new Date(b.start_time_utc) <  now || b.status === 'cancelled')

  const normalize = (b: any) => ({
    id:             b.id,
    start_time_utc: b.start_time_utc,
    end_time_utc:   b.end_time_utc,
    status:         b.status,
    client_notes:   b.client_notes ?? null,
    coaches:        b.coaches ?? null,
  })

  return (
    <HistoryClient
      upcoming={upcoming.map(normalize)}
      past={past.map(normalize)}
      userTz={userTz}
    />
  )
}
