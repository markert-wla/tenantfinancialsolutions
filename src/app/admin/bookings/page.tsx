export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import BookingsClient from '@/components/admin/BookingsClient'

export const metadata: Metadata = { title: 'Bookings — Admin' }

export default async function AdminBookingsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: bookings } = await supabase
    .from('bookings')
    .select(`
      id, start_time_utc, end_time_utc, status, notes,
      profiles!bookings_client_id_fkey ( first_name, last_name, email ),
      coaches ( display_name )
    `)
    .order('start_time_utc', { ascending: false })
    .limit(200)

  // Normalize join shape for the client component
  const normalized = (bookings ?? []).map((b: any) => ({
    id:             b.id,
    start_time_utc: b.start_time_utc,
    end_time_utc:   b.end_time_utc,
    status:         b.status,
    notes:          b.notes,
    client:         b.profiles ?? null,
    coach:          b.coaches  ?? null,
  }))

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <BookingsClient bookings={normalized} />
    </div>
  )
}
