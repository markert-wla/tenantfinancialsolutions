export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import SessionsClient from '@/components/coach/SessionsClient'

export const metadata: Metadata = { title: 'Sessions — Coach' }

export default async function CoachSessionsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('role, timezone, first_name').eq('id', user.id).single()
  if (!profile || (profile.role !== 'coach' && profile.role !== 'admin')) redirect('/login')

  const coachTz = profile.timezone ?? 'America/New_York'

  // All sessions for this coach — past 90 days + all future
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()
  const { data: sessions } = await supabase
    .from('bookings')
    .select('id, start_time_utc, end_time_utc, status, notes, attended, profiles!bookings_client_id_fkey(first_name, last_name, email, plan_tier)')
    .eq('coach_id', user.id)
    .gte('start_time_utc', ninetyDaysAgo)
    .order('start_time_utc', { ascending: false })

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-serif font-bold text-tfs-navy mb-1">Sessions</h1>
        <p className="text-sm text-tfs-slate">
          All sessions in your timezone ({coachTz}). Past 90 days + all upcoming.
        </p>
      </div>
      <SessionsClient sessions={(sessions ?? []) as any} coachTz={coachTz} />
    </div>
  )
}
