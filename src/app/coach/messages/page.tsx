export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import CoachMessagesClient from '@/components/coach/CoachMessagesClient'

export const metadata: Metadata = { title: 'Message Client — Coach' }

export default async function CoachMessagesPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (!profile || (profile.role !== 'coach' && profile.role !== 'admin')) redirect('/login')

  // Get unique client IDs from non-cancelled bookings
  const { data: bookings } = await supabase
    .from('bookings')
    .select('client_id')
    .eq('coach_id', user.id)
    .neq('status', 'cancelled')

  const clientIds = Array.from(
    new Set((bookings ?? []).map((b: { client_id: string }) => b.client_id))
  )

  const clients =
    clientIds.length > 0
      ? ((await supabase
          .from('profiles')
          .select('id, first_name, last_name, email')
          .in('id', clientIds)
          .order('last_name')
        ).data ?? [])
      : []

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-serif font-bold text-tfs-navy mb-1">Message Client</h1>
        <p className="text-sm text-tfs-slate">
          Select a client and send them a message. They&rsquo;ll see it in their portal under &ldquo;Message Coach&rdquo;.
        </p>
      </div>
      <CoachMessagesClient
        clients={
          clients as { id: string; first_name: string; last_name: string; email: string }[]
        }
      />
    </div>
  )
}
