export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { CheckCircle2, XCircle, Minus } from 'lucide-react'

export const metadata: Metadata = { title: 'Attendance — PM' }

export default async function ManagerAttendancePage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('role, partner_id').eq('id', user.id).single()
  if (profile?.role !== 'property_manager' && profile?.role !== 'admin') redirect('/login')

  // PM's codes → tenant IDs
  const { data: codes } = profile?.partner_id
    ? await supabase.from('promo_codes').select('code').eq('partner_id', profile.partner_id)
    : { data: [] }
  const myCodes = (codes ?? []).map(c => c.code)

  const tenantIds = myCodes.length > 0
    ? ((await supabase
        .from('profiles').select('id, first_name, last_name')
        .in('promo_code_used', myCodes).eq('role', 'client')
      ).data ?? [])
    : []

  const ids = tenantIds.map(t => t.id)
  const nameMap = Object.fromEntries(tenantIds.map(t => [t.id, `${t.first_name} ${t.last_name}`]))

  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  // Group session attendance
  const { data: groupAttendance } = ids.length > 0
    ? await supabase
        .from('group_session_attendance')
        .select('client_id, attended, session_id, group_sessions(session_date)')
        .in('client_id', ids)
        .order('session_id')
    : { data: [] }

  // 1-on-1 bookings with attended flag
  const { data: bookings } = ids.length > 0
    ? await supabase
        .from('bookings')
        .select('client_id, attended, start_time_utc, status')
        .in('client_id', ids)
        .not('attended', 'is', null)
        .gte('start_time_utc', ninetyDaysAgo + 'T00:00:00Z')
        .order('start_time_utc', { ascending: false })
    : { data: [] }

  function fmtDate(iso: string) {
    return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      .format(new Date(iso))
  }

  const AttBadge = ({ attended }: { attended: boolean | null }) => {
    if (attended === true)  return <span className="flex items-center gap-1 text-green-600 text-xs"><CheckCircle2 size={13} /> Attended</span>
    if (attended === false) return <span className="flex items-center gap-1 text-red-500 text-xs"><XCircle size={13} /> No-show</span>
    return <span className="flex items-center gap-1 text-gray-400 text-xs"><Minus size={13} /> Not marked</span>
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-serif font-bold text-tfs-navy mb-1">Attendance</h1>
        <p className="text-sm text-tfs-slate">Session attendance for your tenants (last 90 days)</p>
      </div>

      {ids.length === 0 ? (
        <div className="card text-center py-16 text-tfs-slate text-sm">No tenants enrolled yet.</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Group sessions */}
          <div className="card">
            <h2 className="font-serif font-bold text-tfs-navy text-lg mb-4">Group Sessions</h2>
            {!groupAttendance?.length ? (
              <p className="text-sm text-tfs-slate">No group session records yet.</p>
            ) : (
              <div className="divide-y divide-gray-100">
                {(groupAttendance as any[]).map((a, i) => (
                  <div key={i} className="py-2.5 flex items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium text-tfs-navy">{nameMap[a.client_id] ?? 'Unknown'}</p>
                      <p className="text-xs text-tfs-slate">
                        {a.group_sessions?.session_date ? fmtDate(a.group_sessions.session_date) : '—'}
                      </p>
                    </div>
                    <AttBadge attended={a.attended} />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 1-on-1 sessions */}
          <div className="card">
            <h2 className="font-serif font-bold text-tfs-navy text-lg mb-4">1-on-1 Sessions</h2>
            {!bookings?.length ? (
              <p className="text-sm text-tfs-slate">No 1-on-1 attendance records yet.</p>
            ) : (
              <div className="divide-y divide-gray-100">
                {(bookings as any[]).map(b => (
                  <div key={b.id ?? b.start_time_utc + b.client_id} className="py-2.5 flex items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium text-tfs-navy">{nameMap[b.client_id] ?? 'Unknown'}</p>
                      <p className="text-xs text-tfs-slate">{fmtDate(b.start_time_utc)}</p>
                    </div>
                    <AttBadge attended={b.attended} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
