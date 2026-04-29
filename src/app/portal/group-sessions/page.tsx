export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Video, ExternalLink, CalendarDays, CheckCircle2, XCircle, Clock } from 'lucide-react'
import Link from 'next/link'

export const metadata: Metadata = { title: 'Group Sessions — Portal' }

export default async function PortalGroupSessionsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const today = new Date().toISOString().split('T')[0]
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  // Resolve client's partner_id via their promo code (if any)
  const { data: profile } = await supabase
    .from('profiles')
    .select('promo_code_used')
    .eq('id', user.id)
    .single()

  let clientPartnerId: string | null = null
  if (profile?.promo_code_used) {
    const { data: codeRow } = await supabase
      .from('promo_codes')
      .select('partner_id')
      .eq('code', profile.promo_code_used)
      .maybeSingle()
    clientPartnerId = codeRow?.partner_id ?? null
  }

  // Sessions visible to this client: partner_ids IS NULL (open to all)
  // OR partner_ids contains their partner_id (if they have one)
  const partnerFilter = clientPartnerId
    ? `partner_ids.is.null,partner_ids.cs.{${clientPartnerId}}`
    : 'partner_ids.is.null'

  // Upcoming sessions (today and forward)
  const { data: upcoming } = await supabase
    .from('group_sessions')
    .select('id, session_date, join_link, recording_url')
    .or(partnerFilter)
    .gte('session_date', today)
    .order('session_date', { ascending: true })
    .limit(12)

  // Past sessions (last 90 days)
  const { data: past } = await supabase
    .from('group_sessions')
    .select('id, session_date, recording_url')
    .or(partnerFilter)
    .gte('session_date', ninetyDaysAgo)
    .lt('session_date', today)
    .order('session_date', { ascending: false })
    .limit(20)

  const allIds = [
    ...(upcoming ?? []).map(s => s.id),
    ...(past ?? []).map(s => s.id),
  ]

  // This client's attendance records
  const { data: attendance } = allIds.length > 0
    ? await supabase
        .from('group_session_attendance')
        .select('session_id, attended')
        .eq('client_id', user.id)
        .in('session_id', allIds)
    : { data: [] }

  const attendanceMap = Object.fromEntries(
    (attendance ?? []).map(a => [a.session_id, a.attended])
  )

  function fmtDate(dateStr: string) {
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
    }).format(new Date(dateStr + 'T12:00:00')) // noon to avoid tz edge cases
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-serif font-bold text-tfs-navy mb-1">Group Sessions</h1>
        <p className="text-sm text-tfs-slate">
          Group coaching runs the first week of each month. All active members are welcome.
        </p>
      </div>

      {/* ── UPCOMING ── */}
      <section className="mb-10">
        <h2 className="text-lg font-bold text-tfs-navy font-serif mb-4 flex items-center gap-2">
          <CalendarDays size={18} className="text-tfs-teal" /> Upcoming Sessions
        </h2>

        {!upcoming?.length ? (
          <div className="card text-center py-10 text-tfs-slate text-sm">
            No upcoming group sessions scheduled yet. Check back soon.
          </div>
        ) : (
          <div className="space-y-3">
            {upcoming.map(s => (
              <div key={s.id} className="card flex items-center justify-between gap-4">
                <div>
                  <p className="font-medium text-tfs-navy">{fmtDate(s.session_date)}</p>
                  <p className="text-xs text-tfs-slate mt-0.5">Group Coaching Session</p>
                </div>
                <div className="shrink-0 flex items-center gap-2">
                  {s.recording_url && (
                    <a
                      href={s.recording_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 border border-tfs-teal text-tfs-teal text-sm font-semibold px-4 py-2 rounded-lg hover:bg-tfs-teal hover:text-white transition-colors"
                    >
                      <Video size={14} /> Preview Recording
                    </a>
                  )}
                  {s.join_link ? (
                    <a
                      href={`/api/portal/group-sessions/${s.id}/join`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 bg-tfs-teal text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-tfs-teal-dark transition-colors"
                    >
                      <ExternalLink size={14} /> Join
                    </a>
                  ) : (
                    <span className="text-xs text-tfs-slate flex items-center gap-1">
                      <Clock size={13} /> Link coming soon
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── PAST ── */}
      <section>
        <h2 className="text-lg font-bold text-tfs-navy font-serif mb-4 flex items-center gap-2">
          <Video size={18} className="text-tfs-teal" /> Past Sessions (last 90 days)
        </h2>

        {!past?.length ? (
          <div className="card text-center py-10 text-tfs-slate text-sm">
            No past sessions in the last 90 days.
          </div>
        ) : (
          <div className="space-y-3">
            {past.map(s => {
              const attended = attendanceMap[s.id]
              return (
                <div key={s.id} className="card flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    {attended === true && <CheckCircle2 size={18} className="text-green-500 shrink-0" />}
                    {attended === false && <XCircle size={18} className="text-red-400 shrink-0" />}
                    {attended === undefined && <div className="w-4.5 shrink-0" />}
                    <div>
                      <p className="font-medium text-tfs-navy">{fmtDate(s.session_date)}</p>
                      <p className="text-xs text-tfs-slate mt-0.5">
                        {attended === true ? 'You attended' : attended === false ? 'Marked absent' : 'Attendance not recorded'}
                      </p>
                    </div>
                  </div>
                  {s.recording_url ? (
                    <a
                      href={s.recording_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 inline-flex items-center gap-1.5 border border-tfs-teal text-tfs-teal text-sm font-semibold px-4 py-2 rounded-lg hover:bg-tfs-teal hover:text-white transition-colors"
                    >
                      <Video size={14} /> Watch
                    </a>
                  ) : (
                    <span className="shrink-0 text-xs text-tfs-slate">No recording</span>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </section>

      <p className="mt-8 text-xs text-tfs-slate text-center">
        Questions about group sessions?{' '}
        <Link href="/contact" className="text-tfs-teal hover:underline">Contact us</Link>.
      </p>
    </div>
  )
}
