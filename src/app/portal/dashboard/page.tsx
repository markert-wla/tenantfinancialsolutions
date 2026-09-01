export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { CalendarPlus, Users, CalendarCheck, MessageSquare, Clock } from 'lucide-react'
import ExtraSessionCard from '@/components/portal/ExtraSessionCard'
import { SESSION_LIMITS } from '@/lib/stripe'
import { getSessionCycle, sessionsUsedThisCycle, formatCycleDeadline, formatCycleRenewal, formatCycleRange, hoursUntilCycleEnd } from '@/lib/sessions/cycle'
import { tzShort } from '@/lib/timezones'

export const metadata: Metadata = { title: 'Dashboard' }

const TIER_LABEL: Record<string, string> = {
  free:   'Free',
  starter: 'Starter Plan',
  advantage: 'Advantage Plan',
}

export default async function PortalDashboard({ searchParams }: { searchParams: { welcome?: string; upgraded?: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const now = new Date()

  const { data: profile } = await supabase
    .from('profiles')
    .select('first_name, plan_tier, sessions_used_this_month, extra_sessions, timezone, applied_code_type, promo_expires_at, client_type, uses_anniversary_cycle, session_cycle_anchor, session_cycle_started_at')
    .eq('id', user.id)
    .single()

  const tier    = profile?.plan_tier ?? 'free'
  const extras  = profile?.extra_sessions ?? 0
  const userTz  = profile?.timezone ?? 'America/New_York'
  const isTopTier = tier === 'advantage'

  // The client's current session window — their own monthly date if they joined
  // after that change, otherwise the calendar month.
  const cycle    = getSessionCycle(profile, now)
  const used     = sessionsUsedThisCycle(profile, now)
  const useByDay = formatCycleDeadline(cycle, userTz, { withYear: false })
  const renewsOn = formatCycleRenewal(cycle, userTz)

  const promoActive = !profile?.promo_expires_at || new Date(profile.promo_expires_at) >= new Date()
  const activeCodeType = promoActive ? (profile?.applied_code_type ?? null) : null

  const isGroupComp    = activeCodeType === 'group_comp'
  const isFullComp     = activeCodeType === 'full_comp'
  const isTenantPartner = profile?.client_type === 'property_tenant'

  const limit = isGroupComp ? 0
    : (isFullComp && isTenantPartner) ? 2
    : isFullComp ? 99
    : (SESSION_LIMITS[tier] ?? 0)

  // Upcoming confirmed bookings
  const { data: upcomingBookings } = await supabase
    .from('bookings')
    .select('id, start_time_utc, end_time_utc, coaches ( display_name, zoom_link )')
    .eq('client_id', user.id)
    .eq('status', 'confirmed')
    .gte('start_time_utc', now.toISOString())
    .order('start_time_utc', { ascending: true })
    .limit(3)

  // Count completed sessions in the current window (past start time, confirmed)
  const firstOfMonth = cycle.start.toISOString()
  const { count: completedThisMonth } = await supabase
    .from('bookings')
    .select('*', { count: 'exact', head: true })
    .eq('client_id', user.id)
    .eq('status', 'confirmed')
    .gte('start_time_utc', firstOfMonth)
    .lt('start_time_utc', now.toISOString())

  // Unread messages from coach
  const { data: unreadCoachMessages } = await supabase
    .from('coach_messages')
    .select('id, body, created_at')
    .eq('client_id', user.id)
    .is('read_at', null)
    .order('created_at', { ascending: false })

  // Next group session
  const { data: nextGroup } = await supabase
    .from('group_sessions')
    .select('id, session_date, session_time, session_timezone, join_link')
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

  const canBook  = (isFullComp && !isTenantPartner) || (limit > 0 && used < limit) || extras > 0
  const atLimit  = !(isFullComp && !isTenantPartner) && !isGroupComp && limit > 0 && used >= limit && extras === 0

  // Countdown to the end of the current window: how long the client still has
  // to use this period's sessions before they expire. Rounded up, so a window
  // with any part of today left still reads as a day they can book in.
  const daysLeft  = Math.max(0, Math.ceil(hoursUntilCycleEnd(cycle, now) / 24))
  const remaining = Math.max(0, limit - used)

  // Whether this is the last of several — an Advantage client who has used one
  // of their two reads "your final session for this period".
  const countdownSubject = remaining === 1
    ? (limit > 1 ? 'your final session for this period' : 'your session')
    : `your ${remaining} sessions`

  const countdownText = daysLeft <= 1
    ? `Today is the last day to book ${countdownSubject} — after today ${remaining === 1 ? 'it expires' : 'they expire'}.`
    : `You have ${daysLeft} days to book ${countdownSubject} before ${remaining === 1 ? 'it expires' : 'they expire'}.`

  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      {searchParams.welcome === '1' && (
        <div className="mb-6 flex items-start gap-3 bg-green-50 border border-green-200 rounded-xl px-5 py-4">
          <span className="text-green-600 text-xl leading-none mt-0.5">✓</span>
          <div>
            <p className="font-semibold text-green-800">Payment successful — welcome aboard!</p>
            <p className="text-sm text-green-700 mt-0.5">Your plan is now active. Book your first coaching session whenever you&rsquo;re ready.</p>
          </div>
        </div>
      )}
      {searchParams.upgraded === '1' && (
        <div className="mb-6 flex items-start gap-3 bg-green-50 border border-green-200 rounded-xl px-5 py-4">
          <span className="text-green-600 text-xl leading-none mt-0.5">✓</span>
          <div>
            <p className="font-semibold text-green-800">Your plan has been updated.</p>
            <p className="text-sm text-green-700 mt-0.5">Your new session allowance is available right away. The difference in price will appear on your next invoice — you haven&rsquo;t been charged twice.</p>
          </div>
        </div>
      )}

      {/* Unread coach message alerts */}
      {unreadCoachMessages && unreadCoachMessages.length > 0 && (
        <div className="mb-6 space-y-3">
          {unreadCoachMessages.map((msg: { id: string; body: string; created_at: string }) => (
            <div key={msg.id} className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-xl px-5 py-4">
              <MessageSquare size={20} className="text-blue-600 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-blue-900 text-sm mb-1">New message from your coach</p>
                <p className="text-blue-800 text-sm whitespace-pre-wrap">{msg.body}</p>
                <div className="flex items-center justify-between mt-2">
                  <p className="text-xs text-blue-600">
                    {new Intl.DateTimeFormat('en-US', {
                      month: 'short', day: 'numeric', year: 'numeric',
                      hour: 'numeric', minute: '2-digit', hour12: true,
                    }).format(new Date(msg.created_at))}
                  </p>
                  <Link href="/portal/messages" className="text-xs font-semibold text-blue-700 hover:underline">
                    View in Messages →
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mb-8">
        <h1 className="text-3xl font-serif font-bold text-tfs-navy mb-1">
          Welcome back, {profile?.first_name ?? 'there'}!
        </h1>
        <span className="inline-block px-3 py-1 rounded-full text-sm font-semibold bg-tfs-teal text-white">
          {TIER_LABEL[tier] ?? tier}
        </span>
      </div>

      {/* Stat row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Sessions used */}
        <div className="card">
          <p className="text-sm text-tfs-slate mb-1">
            Sessions this month
            {!isGroupComp && !(isFullComp && !isTenantPartner) && (
              <span className="block text-xs text-tfs-slate/80 mt-0.5">{formatCycleRange(cycle, userTz)}</span>
            )}
          </p>
          {isGroupComp ? (
            <p className="text-sm text-tfs-slate italic mt-1">TFS Community Connect plan — individual sessions not included.</p>
          ) : (
            <>
              <p className="text-3xl font-bold text-tfs-navy">
                {used}
                <span className="text-lg font-normal text-tfs-slate"> / {(isFullComp && !isTenantPartner) ? '∞' : limit === 0 ? '—' : limit}</span>
              </p>
              {atLimit && (
                <p className="text-xs text-orange-600 mt-1">
                  Renews {renewsOn}{!isTopTier && !isTenantPartner && (
                    <> — <Link href="/portal/billing" className="underline">Upgrade</Link></>
                  )}
                </p>
              )}
              {isFullComp && !isTenantPartner && (
                <p className="text-xs text-tfs-teal-button font-medium mt-1">Complimentary coaching included</p>
              )}
              {isTenantPartner && isFullComp && (
                <p className="text-xs text-tfs-teal-button font-medium mt-1">Tenant Partner benefit — 2 sessions/month</p>
              )}
              {extras > 0 && (
                <p className="text-xs text-tfs-teal-button font-medium mt-1">
                  + {extras} gifted from admin
                </p>
              )}
              {!isFullComp && used > 0 && (
                <p className="text-xs text-tfs-slate mt-1">
                  {completedThisMonth ?? 0} completed · {Math.max(0, used - (completedThisMonth ?? 0))} upcoming
                </p>
              )}
            </>
          )}
        </div>

        {/* Book CTA */}
        <div className="card col-span-2 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm text-tfs-slate mb-1">Ready to meet with a coach?</p>
            {isGroupComp ? (
              <p className="text-tfs-navy font-medium text-sm">
                Your plan includes TFS Community Connect. Join a session below or{' '}
                <Link href="/portal/billing" className="text-tfs-teal-button hover:underline">upgrade</Link> for individual sessions.
              </p>
            ) : isFullComp && !isTenantPartner ? (
              <p className="text-tfs-navy font-medium">
                Individual coaching is included in your partnership plan.
              </p>
            ) : atLimit ? (
              isTopTier ? (
                <p className="text-tfs-navy font-medium text-sm">
                  Sessions used for this month. Buy a single session, or your next ones unlock {renewsOn}.
                </p>
              ) : (
                <p className="text-tfs-navy font-medium text-sm">
                  Sessions used for this month.{' '}
                  <Link href="/portal/billing" className="text-tfs-teal-button hover:underline">Upgrade</Link> or wait until {renewsOn}.
                </p>
              )
            ) : (
              <>
                <p className="text-tfs-navy font-medium">
                  You have{' '}
                  <span className="text-tfs-teal-button font-bold">{extras > 0 ? extras : limit - used}</span>{' '}
                  session{(extras > 0 ? extras : limit - used) !== 1 ? 's' : ''} remaining this month.
                </p>
                {extras === 0 && remaining > 0 && (
                  <p className={`text-sm font-semibold mt-1.5 flex items-start gap-1.5 ${daysLeft <= 7 ? 'text-orange-600' : 'text-tfs-teal-button'}`}>
                    <Clock size={15} className="shrink-0 mt-0.5" />
                    <span>{countdownText}</span>
                  </p>
                )}
                {extras === 0 && (
                  <p className="text-xs text-tfs-slate mt-1">
                    Book by <strong className="text-tfs-navy">{useByDay}</strong> — unused sessions don&apos;t carry over.
                  </p>
                )}
              </>
            )}
          </div>
          {!isGroupComp && (atLimit && isTopTier ? (
            <Link href="/portal/book?buy=1" className="btn-primary text-sm shrink-0">
              <CalendarPlus size={16} className="mr-1 inline-block" />
              Buy a Single Session
            </Link>
          ) : (
            <Link
              href="/portal/book"
              className={canBook ? 'btn-primary text-sm shrink-0' : 'btn-outline text-sm shrink-0'}
            >
              <CalendarPlus size={16} className="mr-1 inline-block" />
              Book a Session
            </Link>
          ))}
        </div>
      </div>

      {/* Upcoming sessions */}
      <div className="card mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-serif font-bold text-tfs-navy text-xl flex items-center gap-2">
            <CalendarCheck size={20} />
            Upcoming Sessions
          </h2>
          <Link href="/portal/history" className="text-sm text-tfs-teal-button hover:underline">
            View all
          </Link>
        </div>

        {!upcomingBookings?.length ? (
          <p className="text-tfs-slate text-sm">
            No upcoming sessions.{' '}
            {canBook && (
              <Link href="/portal/book" className="text-tfs-teal-button hover:underline">Book one now →</Link>
            )}
          </p>
        ) : (
          <div className="divide-y divide-gray-100">
            {(upcomingBookings as unknown as { id: string; start_time_utc: string; coaches: { display_name: string; zoom_link: string | null } | null }[]).map((b) => (
              <div key={b.id} className="py-3 flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-tfs-navy text-sm">
                    {b.coaches?.display_name ?? 'TFS Coach'}
                  </p>
                  <p className="text-xs text-tfs-slate mt-0.5">{formatTime(b.start_time_utc)}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {b.coaches?.zoom_link && (
                    <a
                      href={b.coaches.zoom_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs px-3 py-1 rounded-full bg-tfs-teal text-white font-medium hover:bg-tfs-teal/90 transition-colors"
                    >
                      Join Session
                    </a>
                  )}
                  <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700 font-medium">
                    Confirmed
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* TFS Community Connect */}
      <div className="card">
        <div className="flex items-center gap-2 mb-3">
          <Users size={20} className="text-tfs-teal-button" />
          <h2 className="font-serif font-bold text-tfs-navy text-xl">TFS Community Connect</h2>
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
              {nextGroup.session_time && (
                <p className="text-sm text-tfs-teal-button font-medium mt-0.5">
                  {nextGroup.session_time}{nextGroup.session_timezone ? ` ${tzShort(nextGroup.session_timezone)}` : ''}
                </p>
              )}
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
            No TFS Community Connect sessions scheduled yet. Check back soon!
          </p>
        )}
      </div>

      <ExtraSessionCard />
    </div>
  )
}
