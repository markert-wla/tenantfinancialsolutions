export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Users, UserCheck, Calendar, AlertTriangle, Flag, XCircle } from 'lucide-react'
import Link from 'next/link'

export const metadata: Metadata = { title: 'Admin Dashboard' }

export default async function AdminDashboardPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const now = new Date()
  const firstOfMonth  = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString()

  const [
    { count: clientCount },
    { count: coachCount },
    { count: bookingCount },
    { data: inactiveClients },
    { data: flaggedSessions },
    { data: coachCancellations },
  ] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'client').eq('is_active', true),
    supabase.from('coaches').select('*', { count: 'exact', head: true }).eq('is_active', true),
    supabase.from('bookings').select('*', { count: 'exact', head: true }).gte('start_time_utc', firstOfMonth),
    supabase
      .from('profiles')
      .select('id, first_name, last_name, email, plan_tier, last_active_at')
      .eq('role', 'client')
      .eq('is_active', true)
      .lt('last_active_at', ninetyDaysAgo)
      .order('last_active_at', { ascending: true })
      .limit(25),
    supabase
      .from('bookings')
      .select('id, start_time_utc, flag_reason, profiles!bookings_client_id_fkey(first_name, last_name), coaches(display_name)')
      .eq('flagged', true)
      .order('start_time_utc', { ascending: false }),
    supabase
      .from('bookings')
      .select(`
        id, start_time_utc,
        client:profiles!bookings_client_id_fkey(id, first_name, last_name, email),
        coach:coaches!bookings_coach_id_fkey(display_name)
      `)
      .eq('cancelled_by', 'coach')
      .order('start_time_utc', { ascending: false })
      .limit(50),
  ])

  function daysSince(iso: string) {
    return Math.floor((now.getTime() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24))
  }

  const ET = 'America/New_York'
  function fmtET(iso: string) {
    return new Intl.DateTimeFormat('en-US', {
      timeZone: ET, month: 'short', day: 'numeric', year: 'numeric',
      hour: 'numeric', minute: '2-digit', hour12: true,
    }).format(new Date(iso))
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-serif font-bold text-tfs-navy mb-8">Admin Dashboard</h1>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 mb-10">
        <StatCard icon={Users}     label="Active Clients"       value={clientCount  ?? 0} color="teal" />
        <StatCard icon={UserCheck} label="Active Coaches"       value={coachCount   ?? 0} color="navy" />
        <StatCard icon={Calendar}  label="Bookings This Month"  value={bookingCount ?? 0} color="gold" />
        <StatCard icon={Flag}      label="Flagged Sessions"     value={flaggedSessions?.length ?? 0} color={flaggedSessions?.length ? 'red' : 'gray'} href="/admin/bookings?filter=flagged" />
      </div>

      {/* Coach cancellation alerts */}
      {(coachCancellations?.length ?? 0) > 0 && (
        <div className="card mb-6 border-l-4 border-l-orange-400">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <XCircle size={20} className="text-orange-500" />
              <h2 className="font-serif font-bold text-tfs-navy text-xl">Coach Cancellations</h2>
              <span className="text-sm text-tfs-slate">({coachCancellations?.length} total) — review and grant sessions as needed</span>
            </div>
            <Link href="/admin/clients" className="text-sm text-tfs-teal hover:underline">
              Grant Sessions →
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-2 pr-4 font-medium text-tfs-slate">Date (ET)</th>
                  <th className="text-left py-2 pr-4 font-medium text-tfs-slate">Client</th>
                  <th className="text-left py-2 pr-4 font-medium text-tfs-slate">Coach</th>
                  <th className="text-left py-2 font-medium text-tfs-slate">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {(coachCancellations ?? []).map((b: any) => (
                  <tr key={b.id}>
                    <td className="py-2.5 pr-4 text-xs text-tfs-navy whitespace-nowrap">
                      {fmtET(b.start_time_utc)}
                    </td>
                    <td className="py-2.5 pr-4 font-medium text-tfs-navy">
                      {b.client?.first_name} {b.client?.last_name}
                      <p className="text-xs font-normal text-tfs-slate">{b.client?.email}</p>
                    </td>
                    <td className="py-2.5 pr-4 text-tfs-slate">{b.coach?.display_name ?? '—'}</td>
                    <td className="py-2.5">
                      {b.client?.id && (
                        <Link
                          href="/admin/clients"
                          className="text-xs text-tfs-teal hover:underline"
                        >
                          Grant session →
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Flagged sessions */}
      {(flaggedSessions?.length ?? 0) > 0 && (
        <div className="card mb-6 border-l-4 border-l-red-400">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Flag size={20} className="text-red-500" />
              <h2 className="font-serif font-bold text-tfs-navy text-xl">Flagged Sessions</h2>
              <span className="text-sm text-tfs-slate">({flaggedSessions?.length} open)</span>
            </div>
            <Link href="/admin/bookings" className="text-sm text-tfs-teal hover:underline">
              View in Bookings →
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-2 pr-4 font-medium text-tfs-slate">Date (ET)</th>
                  <th className="text-left py-2 pr-4 font-medium text-tfs-slate">Client</th>
                  <th className="text-left py-2 pr-4 font-medium text-tfs-slate">Coach</th>
                  <th className="text-left py-2 font-medium text-tfs-slate">Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {(flaggedSessions ?? []).map((b: any) => (
                  <tr key={b.id}>
                    <td className="py-2.5 pr-4 text-xs text-tfs-navy whitespace-nowrap">
                      {fmtET(b.start_time_utc)}
                    </td>
                    <td className="py-2.5 pr-4 font-medium text-tfs-navy">
                      {b.profiles?.first_name} {b.profiles?.last_name}
                    </td>
                    <td className="py-2.5 pr-4 text-tfs-slate">{b.coaches?.display_name ?? '—'}</td>
                    <td className="py-2.5 text-tfs-slate text-xs max-w-xs truncate">
                      {b.flag_reason ?? '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Inactivity alerts */}
      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle size={20} className="text-orange-500" />
          <h2 className="font-serif font-bold text-tfs-navy text-xl">Inactivity Alerts</h2>
          <span className="text-sm text-tfs-slate">(90+ days since last activity)</span>
        </div>

        {!inactiveClients?.length ? (
          <p className="text-tfs-slate text-sm">All clients have been active within 90 days.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-2 pr-4 font-medium text-tfs-slate">Client</th>
                  <th className="text-left py-2 pr-4 font-medium text-tfs-slate">Email</th>
                  <th className="text-left py-2 pr-4 font-medium text-tfs-slate">Plan</th>
                  <th className="text-left py-2 font-medium text-tfs-slate">Last Active</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {inactiveClients.map((c: any) => {
                  const days = daysSince(c.last_active_at)
                  const isCritical = days >= 120
                  return (
                    <tr key={c.id}>
                      <td className="py-2.5 pr-4 font-medium text-tfs-navy">
                        {c.first_name} {c.last_name}
                      </td>
                      <td className="py-2.5 pr-4 text-tfs-slate">{c.email}</td>
                      <td className="py-2.5 pr-4 capitalize text-tfs-slate">{c.plan_tier}</td>
                      <td className="py-2.5">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                          isCritical ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'
                        }`}>
                          {days}d ago
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

function StatCard({
  icon: Icon,
  label,
  value,
  color,
  href,
}: {
  icon: React.ElementType
  label: string
  value: number
  color: 'teal' | 'navy' | 'gold' | 'red' | 'gray'
  href?: string
}) {
  const colors = {
    teal: 'text-tfs-teal bg-tfs-teal/10',
    navy: 'text-tfs-navy bg-tfs-navy/10',
    gold: 'text-tfs-gold bg-tfs-gold/10',
    red:  'text-red-500 bg-red-50',
    gray: 'text-gray-400 bg-gray-50',
  }
  const inner = (
    <>
      <div className={`p-3 rounded-xl ${colors[color]}`}>
        <Icon size={24} />
      </div>
      <div>
        <p className="text-sm text-tfs-slate">{label}</p>
        <p className="text-3xl font-bold text-tfs-navy">{value}</p>
      </div>
    </>
  )
  if (href) {
    return (
      <Link href={href} className="card flex items-center gap-4 hover:shadow-md transition-shadow">
        {inner}
      </Link>
    )
  }
  return <div className="card flex items-center gap-4">{inner}</div>
}
