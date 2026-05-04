export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'
import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import ClientDetailClient from '@/components/coach/ClientDetailClient'

export const metadata: Metadata = { title: 'Client Detail — Coach' }

export default async function CoachClientDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('role, timezone').eq('id', user.id).single()
  if (!profile || (profile.role !== 'coach' && profile.role !== 'admin')) redirect('/login')

  // Client profile
  const { data: client } = await supabase
    .from('profiles')
    .select('id, first_name, last_name, email, plan_tier, client_type, sessions_used_this_month, is_active, last_active_at')
    .eq('id', params.id)
    .single()

  if (!client) notFound()

  // All bookings between this coach and client
  const { data: bookings } = await supabase
    .from('bookings')
    .select('id, start_time_utc, end_time_utc, status, notes, client_notes, attended, flagged, flag_reason')
    .eq('coach_id', user.id)
    .eq('client_id', params.id)
    .order('start_time_utc', { ascending: false })

  // General notes about this client
  const { data: clientNotes } = await supabase
    .from('coach_client_notes')
    .select('id, note, created_at')
    .eq('coach_id', user.id)
    .eq('client_id', params.id)
    .order('created_at', { ascending: false })

  const coachTz = profile.timezone ?? 'America/New_York'

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <Link href="/coach/clients" className="inline-flex items-center gap-1.5 text-sm text-tfs-teal hover:underline mb-6">
        <ChevronLeft size={15} /> Back to Clients
      </Link>

      <div className="mb-8">
        <h1 className="text-3xl font-serif font-bold text-tfs-navy mb-1">
          {client.first_name} {client.last_name}
        </h1>
        <p className="text-sm text-tfs-slate">{client.email}</p>
      </div>

      <ClientDetailClient
        client={client as { id: string; first_name: string; last_name: string; email: string; plan_tier: string; client_type: string; sessions_used_this_month: number; is_active: boolean; last_active_at: string }}
        bookings={(bookings ?? []) as { id: string; start_time_utc: string; status: 'confirmed' | 'pending' | 'cancelled'; notes: string | null; client_notes: string | null; attended: boolean | null; flagged: boolean; flag_reason: string | null }[]}
        clientNotes={(clientNotes ?? []) as { id: string; note: string; created_at: string }[]}
        coachTz={coachTz}
      />
    </div>
  )
}
