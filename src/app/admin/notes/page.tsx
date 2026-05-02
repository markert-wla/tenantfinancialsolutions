export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AdminNotesClient from '@/components/admin/AdminNotesClient'

export const metadata: Metadata = { title: 'Notes — Admin' }

export default async function AdminNotesPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/login')

  // Session notes (coach notes + client notes on bookings)
  const { data: sessionNotes } = await supabase
    .from('bookings')
    .select(`
      id,
      start_time_utc,
      notes,
      client_notes,
      client:profiles!bookings_client_id_fkey(id, first_name, last_name, email),
      coach:coaches!bookings_coach_id_fkey(display_name)
    `)
    .or('notes.not.is.null,client_notes.not.is.null')
    .order('start_time_utc', { ascending: false })

  // General client notes
  const { data: generalNotes } = await supabase
    .from('coach_client_notes')
    .select(`
      id,
      note,
      created_at,
      client:profiles!coach_client_notes_client_id_fkey(id, first_name, last_name, email),
      coach:profiles!coach_client_notes_coach_id_fkey(first_name, last_name)
    `)
    .order('created_at', { ascending: false })

  const normalizeSession = (b: any) => ({
    id:             b.id,
    start_time_utc: b.start_time_utc,
    notes:          b.notes ?? null,
    client_notes:   b.client_notes ?? null,
    client:         b.client ?? null,
    coach_name:     b.coach?.display_name ?? null,
  })

  const normalizeGeneral = (n: any) => ({
    id:         n.id,
    note:       n.note,
    created_at: n.created_at,
    client:     n.client ?? null,
    coach_name: n.coach ? `${n.coach.first_name ?? ''} ${n.coach.last_name ?? ''}`.trim() : null,
  })

  return (
    <div className="max-w-5xl mx-auto px-6 py-12">
      <AdminNotesClient
        sessionNotes={(sessionNotes ?? []).map(normalizeSession)}
        generalNotes={(generalNotes ?? []).map(normalizeGeneral)}
      />
    </div>
  )
}
