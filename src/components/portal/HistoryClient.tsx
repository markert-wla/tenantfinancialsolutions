'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { CalendarX, CalendarPlus, XCircle, Edit3, X } from 'lucide-react'

type Booking = {
  id: string
  start_time_utc: string
  end_time_utc: string
  status: string
  client_notes: string | null
  client_message: string | null
  coaches: { display_name: string; zoom_link: string | null } | null
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
  const [bookings, setBookings]     = useState({ upcoming, past })
  const [cancelId, setCancelId]     = useState<string | null>(null)
  const [editingNote, setEditingNote] = useState<string | null>(null)
  const [noteText, setNoteText]     = useState('')
  const [savingNote, setSavingNote] = useState(false)
  const [cancelLoading, setCancelLoading] = useState(false)
  const [error, setError]           = useState('')
  const [noteError, setNoteError]   = useState('')

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

  function openNote(b: Booking) {
    setEditingNote(b.id)
    setNoteText(b.client_message ?? '')
    setNoteError('')
  }

  async function saveNote(id: string) {
    setSavingNote(true)
    setNoteError('')
    const res = await fetch(`/api/portal/bookings/${id}/notes`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_message: noteText || null }),
    })
    setSavingNote(false)
    if (res.ok) {
      const saved = noteText.trim() || null
      const update = (list: Booking[]) =>
        list.map(b => b.id === id ? { ...b, client_message: saved } : b)
      setBookings(prev => ({ upcoming: update(prev.upcoming), past: update(prev.past) }))
      setEditingNote(null)
    } else {
      const data = await res.json().catch(() => ({}))
      setNoteError(data.error ?? 'Failed to save note.')
    }
  }

  async function handleCancel(id: string) {
    setCancelLoading(true)
    setError('')
    const res = await fetch(`/api/portal/bookings/${id}/cancel`, { method: 'POST' })
    setCancelLoading(false)
    if (res.ok) {
      setCancelId(null)
      router.refresh()
    } else {
      const data = await res.json().catch(() => ({}))
      setError(data.error ?? 'Failed to cancel. Please try again.')
    }
  }

  const cancelTarget = bookings.upcoming.find(b => b.id === cancelId)

  function BookingCard({ b, dimmed = false }: { b: Booking; dimmed?: boolean }) {
    const badge = statusLabel(b)
    const isCancelled = b.status === 'cancelled'
    const isFuture = new Date(b.start_time_utc) > new Date()
    const isEditing = editingNote === b.id

    return (
      <div className={`card ${dimmed ? 'opacity-80' : ''}`}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-tfs-navy">
              {b.coaches?.display_name ?? 'TFS Coach'}
            </p>
            <p className="text-sm text-tfs-slate mt-0.5">
              {fmt(b.start_time_utc)}
              <span className="text-xs ml-1 opacity-60">({userTz})</span>
            </p>

            {/* Coach's note — read-only */}
            {b.client_notes && (
              <div className="mt-2 border-l-2 border-tfs-teal/50 pl-2">
                <p className="text-xs font-medium text-tfs-teal mb-0.5">Coach</p>
                <p className="text-sm text-tfs-slate italic">{b.client_notes}</p>
              </div>
            )}

            {/* Client's own message — read-only (shown when not editing) */}
            {b.client_message && !isEditing && (
              <div className="mt-2 border-l-2 border-gray-300 pl-2">
                <p className="text-xs font-medium text-tfs-slate mb-0.5">Me</p>
                <p className="text-sm text-tfs-slate italic">{b.client_message}</p>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {b.coaches?.zoom_link && isFuture && !isCancelled && (
              <a
                href={b.coaches.zoom_link}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs px-3 py-1 rounded-full bg-tfs-teal text-white font-medium hover:bg-tfs-teal/90 transition-colors"
              >
                Join
              </a>
            )}
            <span className={`text-xs px-2 py-1 rounded-full font-medium ${badge.cls}`}>
              {badge.label}
            </span>
            {!isCancelled && (
              <button
                onClick={() => openNote(b)}
                className="p-1.5 rounded-lg text-tfs-slate hover:text-tfs-teal hover:bg-tfs-teal/10 transition-colors"
                title={b.client_message ? 'Edit your note' : 'Add your note'}
              >
                <Edit3 size={15} />
              </button>
            )}
            {b.status === 'confirmed' && isFuture && (
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

        {isEditing && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <label className="block text-xs font-medium text-tfs-navy mb-1">My Note</label>
            <textarea
              value={noteText}
              onChange={e => setNoteText(e.target.value)}
              rows={4}
              placeholder="Jot down questions, action items, or anything you want to share with your coach…"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-tfs-teal resize-none mb-2"
              autoFocus
            />
            {noteError && (
              <p className="text-xs text-red-600 mb-2">{noteError}</p>
            )}
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setEditingNote(null)}
                className="text-sm text-tfs-slate hover:text-tfs-navy px-3 py-1.5 rounded-lg border border-gray-200"
              >
                <X size={13} className="inline mr-1" />Cancel
              </button>
              <button
                onClick={() => saveNote(b.id)}
                disabled={savingNote}
                className="btn-primary text-sm px-4 py-1.5"
              >
                {savingNote ? 'Saving…' : 'Save Note'}
              </button>
            </div>
          </div>
        )}
      </div>
    )
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
      {bookings.upcoming.length > 0 && (
        <section className="mb-10">
          <h2 className="text-lg font-semibold text-tfs-navy mb-4">Upcoming</h2>
          <div className="space-y-3">
            {bookings.upcoming.map(b => <BookingCard key={b.id} b={b} />)}
          </div>
        </section>
      )}

      {/* Past */}
      <section>
        <h2 className="text-lg font-semibold text-tfs-navy mb-4">Past Sessions</h2>
        {bookings.past.length === 0 ? (
          <div className="card flex flex-col items-center py-12 text-center">
            <CalendarX className="text-tfs-slate/40 mb-3" size={40} />
            <p className="text-tfs-slate">No past sessions yet.</p>
            {bookings.upcoming.length === 0 && (
              <Link href="/portal/book" className="btn-primary text-sm mt-4">
                Book Your First Session
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {bookings.past.map(b => <BookingCard key={b.id} b={b} dimmed />)}
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
                  disabled={cancelLoading}
                >
                  Keep Session
                </button>
                <button
                  onClick={() => handleCancel(cancelId)}
                  disabled={cancelLoading}
                  className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  {cancelLoading ? 'Cancelling…' : 'Cancel Session'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
