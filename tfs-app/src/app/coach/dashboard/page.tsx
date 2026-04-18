export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { CalendarCheck, Users, AlertTriangle, Clock } from 'lucide-react'
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
  const now     = new Date()

  // Sessions this month
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const { count: monthCount } = await supabase
    .from('bookings')
    .select('*', { count: 'exact', head: true })
    .eq('coach_id', user.id)
    .neq('status', 'cancelled')
    .gte('start_time_utc', firstOfMonth)

  // Upcoming confirmed sessions (next 20)
  const { data: upcoming } = await supabase
    .from('bookings')
    .select('id, start_time_utc, end_time_utc, notes, profiles!bookings_client_id_fkey(first_name, last_name, email, plan_tier)')
    .eq('coach_id', user.id)
    .eq('status', 'confirmed')
    .gte('start_time_utc', now.toISOString())
    .order('start_time_utc', { ascending: true })
    .limit(20)

  // Total distinct clients
  const { data: allBookings } = await supabase
    .from('bookings')
    .select('client_id')
    .eq('coach_id', user.id)
    .neq('status', 'cancelled')

  const uniqueClientIds = Array.from(new Set((allBookings ?? []).map((b: any) => b.client_id as string)))
  const totalClients = uniqueClientIds.length

  // Inactivity alerts — clients inactive 90+ days
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()
  const { data: inactiveClients } = uniqueClientIds.length > 0
    ? await supabase
        .from('profiles')
        .select('id, first_name, last_name, last_active_at')
        .in('id', uniqueClientIds)
        .lt('last_active_at', ninetyDaysAgo)
        .eq('is_active', true)
    : { data: [] }

  // Today's sessions
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString()
  const todayCount = (upcoming ?? []).filter(
    b => new Date(b.start_time_utc) < new Date(endOfToday)
  ).length

  function fmt(iso: string) {
    return new Intl.DateTimeFormat('en-US', {
      timeZone: coachTz, weekday: 'short', month: 'short', day: 'numeric',
      hour: 'numeric', minute: '2-digit', hour12: true,
    }).format(new Date(iso))
  }

  function daysInactive(iso: string) {
    return Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24))
  }

  const TIER_LABEL: Record<string, string> = { free: 'Free', bronze: 'Starter', silver: 'Advantage' }

  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-serif font-bold text-tfs-navy mb-1">
          Welcome, {profile?.first_name ?? 'Coach'}!
        </h1>
        <p className="text-sm text-tfs-slate">Timezone: {coachTz}</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { icon: CalendarCheck, label: 'Sessions This Month', value: monthCount ?? 0,  color: 'text-tfs-teal bg-tfs-teal/10' },
          { icon: Users,         label: 'Total Clients',       value: totalClients,      color: 'text-tfs-navy bg-tfs-navy/10' },
          { icon: Clock,         label: "Today's Sessions",    value: todayCount,        color: 'text-tfs-gold bg-tfs-gold/10' },
          { icon: AlertTriangle, label: 'Inactivity Alerts',   value: inactiveClients?.length ?? 0, color: inactiveClients?.length ? 'text-red-500 bg-red-50' : 'text-gray-400 bg-gray-50' },
        ].map(({ icon: Icon, label, value, color }) => (
          <div key={label} className="card flex items-center gap-4">
            <div className={`p-3 rounded-xl ${color}`}>
              <Icon size={22} />
            </div>
            <div>
              <p className="text-xs text-tfs-slate">{label}</p>
              <p className="text-2xl font-bold text-tfs-navy">{value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upcoming sessions */}
        <div className="lg:col-span-2 card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-serif font-bold text-tfs-navy text-xl flex items-center gap-2">
              <CalendarCheck size={20} /> Upcoming Sessions
            </h2>
            <Link href="/coach/sessions" className="text-sm text-tfs-teal hover:underline">
              View all →
            </Link>
          </div>

          {!upcoming?.length ? (
            <p className="text-tfs-slate text-sm">
              No upcoming sessions.{' '}
              <Link href="/coach/availability" className="text-tfs-teal hover:underline">
                Set your availability
              </Link>
              {' '}so clients can book with you.
            </p>
          ) : (
            <div className="divide-y divide-gray-100">
              {(upcoming ?? []).slice(0, 8).map((b: any) => {
                const client = b.profiles
                return (
                  <div key={b.id} className="py-3 flex items-start justify-between gap-4">
                    <div>
                      <p className="font-medium text-tfs-navy text-sm">
                        {client?.first_name} {client?.last_name}
                        {client?.plan_tier && (
                          <span className="ml-2 text-xs text-tfs-slate font-normal">
                            ({TIER_LABEL[client.plan_tier] ?? client.plan_tier})
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-tfs-teal mt-0.5 font-medium">{fmt(b.start_time_utc)}</p>
                      {b.notes && <p className="text-xs text-tfs-slate mt-0.5 italic">{b.notes}</p>}
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

        {/* Inactivity alerts */}
        <div className="card">
          <h2 className="font-serif font-bold text-tfs-navy text-lg mb-4 flex items-center gap-2">
            <AlertTriangle size={18} className="text-amber-500" /> Inactivity Alerts
          </h2>
          {!inactiveClients?.length ? (
            <p className="text-tfs-slate text-sm">No clients inactive 90+ days.</p>
          ) : (
            <div className="divide-y divide-gray-100">
              {inactiveClients.map((c: any) => (
                <div key={c.id} className="py-2.5">
                  <p className="text-sm font-medium text-tfs-navy">
                    {c.first_name} {c.last_name}
                  </p>
                  <p className="text-xs text-red-500 mt-0.5">
                    {daysInactive(c.last_active_at)} days inactive
                  </p>
                </div>
              ))}
            </div>
          )}
          <Link href="/coach/clients" className="mt-4 block text-sm text-tfs-teal hover:underline">
            View all clients →
          </Link>
        </div>
      </div>
    </div>
  )
}
