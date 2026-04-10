export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { CalendarCheck, Users } from 'lucide-react'
import Link from 'next/link'

export const metadata: Metadata = { title: 'Coach Dashboard' }

export default async function CoachDashboardPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('first_name, timezone')
    .eq('id', user.id)
    .single()

  const coachTz = profile?.timezone ?? 'America/New_York'

  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()

  // Upcoming confirmed bookings for this coach
  const { data: upcoming } = await supabase
    .from('bookings')
    .select('id, start_time_utc, end_time_utc, status, notes, profiles!bookings_client_id_fkey(first_name, last_name, email, plan_tier)')
    .eq('coach_id', user.id)
    .eq('status', 'confirmed')
    .gte('start_time_utc', startOfToday)
    .order('start_time_utc', { ascending: true })
    .limit(20)

  // Count of sessions this month
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const { count: monthCount } = await supabase
    .from('bookings')
    .select('*', { count: 'exact', head: true })
    .eq('coach_id', user.id)
    .gte('start_time_utc', firstOfMonth)

  function formatTime(iso: string) {
    return new Intl.DateTimeFormat('en-US', {
      timeZone:  coachTz,
      weekday:   'short',
      month:     'short',
      day:       'numeric',
      hour:      'numeric',
      minute:    '2-digit',
      hour12:    true,
    }).format(new Date(iso))
  }

  const todaySessions = upcoming?.filter(b => {
    const d = new Date(b.start_time_utc)
    return d >= now && d < new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
  }) ?? []

  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-serif font-bold text-tfs-navy mb-1">
          Welcome, {profile?.first_name ?? 'Coach'}!
        </h1>
        <p className="text-sm text-tfs-slate">Timezone: {coachTz}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
        <div className="card flex items-center gap-4">
          <div className="p-3 rounded-xl text-tfs-teal bg-tfs-teal/10">
            <CalendarCheck size={24} />
          </div>
          <div>
            <p className="text-sm text-tfs-slate">Sessions This Month</p>
            <p className="text-3xl font-bold text-tfs-navy">{monthCount ?? 0}</p>
          </div>
        </div>
        <div className="card flex items-center gap-4">
          <div className="p-3 rounded-xl text-tfs-navy bg-tfs-navy/10">
            <Users size={24} />
          </div>
          <div>
            <p className="text-sm text-tfs-slate">Today&apos;s Sessions</p>
            <p className="text-3xl font-bold text-tfs-navy">{todaySessions.length}</p>
          </div>
        </div>
      </div>

      {/* Upcoming sessions */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-serif font-bold text-tfs-navy text-xl flex items-center gap-2">
            <CalendarCheck size={20} />
            Upcoming Sessions
          </h2>
          <Link href="/coach/availability" className="text-sm text-tfs-teal hover:underline">
            Manage availability →
          </Link>
        </div>

        {!upcoming?.length ? (
          <p className="text-tfs-slate text-sm">
            No upcoming sessions.{' '}
            <Link href="/coach/availability" className="text-tfs-teal hover:underline">
              Set your availability
            </Link>{' '}
            so clients can book with you.
          </p>
        ) : (
          <div className="divide-y divide-gray-100">
            {upcoming.map((b: any) => {
              const client = b.profiles
              return (
                <div key={b.id} className="py-3 flex items-start justify-between gap-4">
                  <div>
                    <p className="font-medium text-tfs-navy text-sm">
                      {client?.first_name} {client?.last_name}
                      <span className="ml-2 text-xs text-tfs-slate font-normal capitalize">
                        ({client?.plan_tier} plan)
                      </span>
                    </p>
                    <p className="text-xs text-tfs-slate mt-0.5">{client?.email}</p>
                    <p className="text-xs text-tfs-teal mt-1 font-medium">
                      {formatTime(b.start_time_utc)} — {new Intl.DateTimeFormat('en-US', {
                        timeZone: coachTz, hour: 'numeric', minute: '2-digit', hour12: true,
                      }).format(new Date(b.end_time_utc))}
                    </p>
                    {b.notes && (
                      <p className="text-xs text-tfs-slate mt-1 italic">{b.notes}</p>
                    )}
                  </div>
                  <span className="shrink-0 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                    Confirmed
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
