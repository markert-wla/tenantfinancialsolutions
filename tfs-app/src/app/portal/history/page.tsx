export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { CalendarX, CalendarPlus } from 'lucide-react'

export const metadata: Metadata = { title: 'My Sessions' }

export default async function HistoryPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('timezone')
    .eq('id', user.id)
    .single()

  const userTz = profile?.timezone ?? 'America/New_York'

  // Fetch all past + future sessions, ordered newest first
  const { data: bookings } = await supabase
    .from('bookings')
    .select(`
      id,
      start_time_utc,
      end_time_utc,
      status,
      notes,
      coaches ( display_name )
    `)
    .eq('client_id', user.id)
    .order('start_time_utc', { ascending: false })

  const now      = new Date()
  const upcoming = (bookings ?? []).filter((b: any) => new Date(b.start_time_utc) >= now && b.status !== 'cancelled')
  const past     = (bookings ?? []).filter((b: any) => new Date(b.start_time_utc) <  now || b.status === 'cancelled')

  function formatTime(iso: string) {
    return new Intl.DateTimeFormat('en-US', {
      timeZone: userTz,
      weekday:  'short',
      month:    'short',
      day:      'numeric',
      year:     'numeric',
      hour:     'numeric',
      minute:   '2-digit',
      hour12:   true,
    }).format(new Date(iso))
  }

  function statusBadge(status: string, startUtc: string) {
    if (status === 'cancelled') return { label: 'Cancelled', cls: 'bg-red-100 text-red-700' }
    if (new Date(startUtc) < now) return { label: 'Completed', cls: 'bg-tfs-teal/10 text-tfs-teal' }
    return { label: 'Confirmed', cls: 'bg-green-100 text-green-700' }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-serif font-bold text-tfs-navy">My Sessions</h1>
        <Link href="/portal/book" className="btn-primary text-sm flex items-center gap-2">
          <CalendarPlus size={16} />
          Book a Session
        </Link>
      </div>

      {/* Upcoming */}
      {upcoming.length > 0 && (
        <section className="mb-10">
          <h2 className="text-lg font-semibold text-tfs-navy mb-4">Upcoming</h2>
          <div className="space-y-3">
            {upcoming.map((b: any) => {
              const badge = statusBadge(b.status, b.start_time_utc)
              return (
                <div key={b.id} className="card flex items-start justify-between gap-4">
                  <div>
                    <p className="font-semibold text-tfs-navy">
                      {(b.coaches as any)?.display_name ?? 'TFS Coach'}
                    </p>
                    <p className="text-sm text-tfs-slate mt-0.5">
                      {formatTime(b.start_time_utc)}
                      <span className="text-xs ml-1 opacity-60">({userTz})</span>
                    </p>
                    {b.notes && (
                      <p className="text-sm text-tfs-slate mt-2 italic">"{b.notes}"</p>
                    )}
                  </div>
                  <span className={`shrink-0 text-xs px-2 py-1 rounded-full font-medium ${badge.cls}`}>
                    {badge.label}
                  </span>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* Past */}
      <section>
        <h2 className="text-lg font-semibold text-tfs-navy mb-4">Past Sessions</h2>
        {past.length === 0 ? (
          <div className="card flex flex-col items-center py-12 text-center">
            <CalendarX className="text-tfs-slate/40 mb-3" size={40} />
            <p className="text-tfs-slate">No past sessions yet.</p>
            {upcoming.length === 0 && (
              <Link href="/portal/book" className="btn-primary text-sm mt-4">
                Book Your First Session
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {past.map((b: any) => {
              const badge = statusBadge(b.status, b.start_time_utc)
              return (
                <div key={b.id} className="card flex items-start justify-between gap-4 opacity-80">
                  <div>
                    <p className="font-semibold text-tfs-navy">
                      {(b.coaches as any)?.display_name ?? 'TFS Coach'}
                    </p>
                    <p className="text-sm text-tfs-slate mt-0.5">
                      {formatTime(b.start_time_utc)}
                    </p>
                    {b.notes && (
                      <p className="text-sm text-tfs-slate mt-2 italic">"{b.notes}"</p>
                    )}
                  </div>
                  <span className={`shrink-0 text-xs px-2 py-1 rounded-full font-medium ${badge.cls}`}>
                    {badge.label}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
