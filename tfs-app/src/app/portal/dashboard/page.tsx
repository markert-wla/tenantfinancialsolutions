export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { CalendarPlus, Users, CalendarCheck } from 'lucide-react'

export const metadata: Metadata = { title: 'Dashboard' }

const LIMITS: Record<string, number> = { free: 1, bronze: 1, silver: 2 }

export default async function PortalDashboard() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('first_name, plan_tier, sessions_used_this_month, timezone')
    .eq('id', user.id)
    .single()

  const tier   = profile?.plan_tier ?? 'free'
  const used   = profile?.sessions_used_this_month ?? 0
  const limit  = LIMITS[tier] ?? 0
  const userTz = profile?.timezone ?? 'America/New_York'

  // Upcoming confirmed bookings
  const { data: upcomingBookings } = await supabase
    .from('bookings')
    .select('id, start_time_utc, end_time_utc, coaches ( display_name )')
    .eq('client_id', user.id)
    .eq('status', 'confirmed')
    .gte('start_time_utc', new Date().toISOString())
    .order('start_time_utc', { ascending: true })
    .limit(3)

  // Next group session
  const { data: nextGroup } = await supabase
    .from('group_sessions')
    .select('id, session_date, join_link')
    .gte('session_date', new Date().toISOString().split('T')[0])
    .order('session_date', { ascending: true })
    .limit(1)
    .maybeSingle()

  function formatTime(iso: string) {
    return new Intl.DateTimeFormat('en-US', {
      timeZone: userTz,
      weekday:  'short',
      month:    'short',
      day:      'numeric',
      hour:     'numeric',
      minute:   '2-digit',
      hour12:   true,
    }).format(new Date(iso))
  }

  const canBook  = tier !== 'free' && used < limit
  const atLimit  = tier !== 'free' && used >= limit

  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-serif font-bold text-tfs-navy mb-1">
          Welcome back, {profile?.first_name ?? 'there'}!
        </h1>
        <span className="inline-block px-3 py-1 rounded-full text-sm font-semibold capitalize bg-tfs-teal text-white">
          {tier} Plan
        </span>
      </div>

      {/* Stat row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Sessions used */}
        <div className="card">
          <p className="text-sm text-tfs-slate mb-1">Sessions this month</p>
          <p className="text-3xl font-bold text-tfs-navy">
            {used}
            <span className="text-lg font-normal text-tfs-slate"> / {limit === 0 ? '—' : limit}</span>
          </p>
          {tier === 'free' && (
            <p className="text-xs text-tfs-slate mt-1">
              <Link href="/services" className="text-tfs-teal hover:underline">Upgrade</Link> to book sessions
            </p>
          )}
          {atLimit && (
            <p className="text-xs text-orange-600 mt-1">Monthly limit reached</p>
          )}
        </div>

        {/* Book CTA */}
        <div className="card col-span-2 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm text-tfs-slate mb-1">Ready to meet with a coach?</p>
            {tier === 'free' ? (
              <p className="text-tfs-navy font-medium text-sm">
                <Link href="/services" className="text-tfs-teal hover:underline">Upgrade your plan</Link>{' '}
                to book individual sessions.
              </p>
            ) : atLimit ? (
              <p className="text-tfs-navy font-medium text-sm">
                Monthly sessions used.{' '}
                <Link href="/services" className="text-tfs-teal hover:underline">Upgrade</Link> or wait for the monthly reset.
              </p>
            ) : (
              <p className="text-tfs-navy font-medium">
                You have{' '}
                <span className="text-tfs-teal font-bold">{limit - used}</span>{' '}
                session{limit - used !== 1 ? 's' : ''} remaining this month.
              </p>
            )}
          </div>
          <Link
            href="/portal/book"
            className={canBook ? 'btn-primary text-sm shrink-0' : 'btn-outline text-sm shrink-0 opacity-50 pointer-events-none'}
            aria-disabled={!canBook}
          >
            <CalendarPlus size={16} className="mr-1 inline-block" />
            Book a Session
          </Link>
        </div>
      </div>

      {/* Upcoming sessions */}
      <div className="card mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-serif font-bold text-tfs-navy text-xl flex items-center gap-2">
            <CalendarCheck size={20} />
            Upcoming Sessions
          </h2>
          <Link href="/portal/history" className="text-sm text-tfs-teal hover:underline">
            View all
          </Link>
        </div>

        {!upcomingBookings?.length ? (
          <p className="text-tfs-slate text-sm">
            No upcoming sessions.{' '}
            {canBook && (
              <Link href="/portal/book" className="text-tfs-teal hover:underline">Book one now →</Link>
            )}
          </p>
        ) : (
          <div className="divide-y divide-gray-100">
            {upcomingBookings.map((b: any) => (
              <div key={b.id} className="py-3 flex items-center justify-between">
                <div>
                  <p className="font-medium text-tfs-navy text-sm">
                    {(b.coaches as any)?.display_name ?? 'TFS Coach'}
                  </p>
                  <p className="text-xs text-tfs-slate mt-0.5">{formatTime(b.start_time_utc)}</p>
                </div>
                <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700 font-medium">
                  Confirmed
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Group session */}
      <div className="card">
        <div className="flex items-center gap-2 mb-3">
          <Users size={20} className="text-tfs-teal" />
          <h2 className="font-serif font-bold text-tfs-navy text-xl">Monthly Group Session</h2>
        </div>
        {nextGroup ? (
          <div className="flex items-center justify-between">
            <div>
              <p className="text-tfs-navy font-medium">
                {new Date(nextGroup.session_date + 'T00:00:00').toLocaleDateString('en-US', {
                  weekday: 'long',
                  month:   'long',
                  day:     'numeric',
                  year:    'numeric',
                  timeZone: 'UTC',
                })}
              </p>
              <p className="text-sm text-tfs-slate mt-0.5">
                Complimentary for all members — multiple coaches present.
              </p>
            </div>
            {nextGroup.join_link ? (
              <a
                href={nextGroup.join_link}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary text-sm shrink-0"
              >
                Join Session
              </a>
            ) : (
              <span className="text-xs text-tfs-slate italic">Link coming soon</span>
            )}
          </div>
        ) : (
          <p className="text-tfs-slate text-sm">
            No group sessions scheduled yet. Check back soon!
          </p>
        )}
      </div>
    </div>
  )
}
