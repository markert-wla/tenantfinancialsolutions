'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { CalendarX, CalendarPlus, XCircle } from 'lucide-react'

type Booking = {
  id: string
  start_time_utc: string
  end_time_utc: string
  status: string
  notes: string | null
  coaches: { display_name: string } | null
}

const STATUS_COLORS: Record<string, string> = {
  confirmed: 'bg-green-100 text-green-700',
  cancelled:  'bg-red-100 text-red-700',
  completed:  'bg-tfs-teal/10 text-tfs-teal',
}

export default function HistoryClient({
  upcoming,
  past,
  userTz,
}: {
  upcoming: Booking[]
  past: Booking[]
  userTz: string
}) {
  const router = useRouter()
  const [cancelId, setCancelId] = useState<string | null>(null)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')

  function fmt(iso: string) {
    return new Intl.DateTimeFormat('en-US', {
      timeZone: userTz,
      weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
      hour: 'numeric', minute: '2-digit', hour12: true,
    }).format(new Date(iso))
  }

  function statusLabel(b: Booking): { label: string; cls: string } {
    if (b.status === 'cancelled') return { label: 'Cancelled', cls: STATUS_COLORS.cancelled }
    if (new Date(b.start_time_utc) < new Date()) return { label: 'Completed', cls: STATUS_COLORS.completed }
    return { label: 'Confirmed', cls: STATUS_COLORS.confirmed }
  }

  async function handleCancel(id: string) {
    setLoading(true)
    setError('')
    const res = await fetch(`/api/portal/bookings/${id}/cancel`, { method: 'POST' })
    setLoading(false)
    if (res.ok) {
      setCancelId(null)
      router.refresh()
    } else {
      const data = await res.json().catch(() => ({}))
      setError(data.error ?? 'Failed to cancel. Please try again.')
    }
  }

  const cancelTarget = upcoming.find(b => b.id === cancelId)

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
            {upcoming.map(b => {
              const badge = statusLabel(b)
              return (
                <div key={b.id} className="card flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <p className="font-semibold text-tfs-navy">
                      {b.coaches?.display_name ?? 'TFS Coach'}
                    </p>
                    <p className="text-sm text-tfs-slate mt-0.5">
                      {fmt(b.start_time_utc)}
                      <span className="text-xs ml-1 opacity-60">({userTz})</span>
                    </p>
                    {b.notes && (
                      <p className="text-sm text-tfs-slate mt-2 italic">&ldquo;{b.notes}&rdquo;</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${badge.cls}`}>
                      {badge.label}
                    </span>
                    {b.status === 'confirmed' && new Date(b.start_time_utc) > new Date() && (
                      <button
                        onClick={() => setCancelId(b.id)}
                        className="p-1.5 rounded-lg text-tfs-slate hover:text-red-600 hover:bg-red-50 transition-colors"
                        title="Cancel this session"
                      >
                        <XCircle size={16} />
                      </button>
                    )}
                  </div>
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
            {past.map(b => {
              const badge = statusLabel(b)
              return (
                <div key={b.id} className="card flex items-start justify-between gap-4 opacity-80">
                  <div>
                    <p className="font-semibold text-tfs-navy">
                      {b.coaches?.display_name ?? 'TFS Coach'}
                    </p>
                    <p className="text-sm text-tfs-slate mt-0.5">{fmt(b.start_time_utc)}</p>
                    {b.notes && (
                      <p className="text-sm text-tfs-slate mt-2 italic">&ldquo;{b.notes}&rdquo;</p>
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

      {/* Cancel confirmation modal */}
      {cancelId && cancelTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="font-serif font-bold text-tfs-navy text-lg">Cancel Session</h3>
              <button
                onClick={() => { setCancelId(null); setError('') }}
                className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
                aria-label="Close"
              >&times;</button>
            </div>
            <div className="px-6 py-5">
              <p className="text-tfs-slate text-sm mb-2">
                Cancel your session on <strong>{fmt(cancelTarget.start_time_utc)}</strong> with{' '}
                <strong>{cancelTarget.coaches?.display_name ?? 'TFS Coach'}</strong>?
              </p>
              <p className="text-tfs-slate text-sm mb-4">
                Your session credit for this month will be restored. This cannot be undone.
              </p>
              {error && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2 mb-4">{error}</p>
              )}
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => { setCancelId(null); setError('') }}
                  className="btn-outline"
                  disabled={loading}
                >
                  Keep Session
                </button>
                <button
                  onClick={() => handleCancel(cancelId)}
                  disabled={loading}
                  className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  {loading ? 'Cancelling…' : 'Cancel Session'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
