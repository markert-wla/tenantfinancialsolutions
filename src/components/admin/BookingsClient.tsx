'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { XCircle, StickyNote, Flag, FlagOff, Lock, Share2 } from 'lucide-react'

type Booking = {
  id: string
  start_time_utc: string
  end_time_utc: string
  status: 'pending' | 'confirmed' | 'cancelled'
  notes: string | null
  client_notes: string | null
  flagged: boolean
  flag_reason: string | null
  client: { first_name: string; last_name: string; email: string } | null
  coach:  { display_name: string } | null
}

const STATUS_COLORS: Record<string, string> = {
  confirmed: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100  text-red-700',
  pending:   'bg-yellow-100 text-yellow-700',
}

const ET = 'America/New_York'

function fmt(iso: string) {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: ET,
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit', hour12: true,
  }).format(new Date(iso))
}

type Filter = 'all' | 'confirmed' | 'cancelled' | 'pending' | 'flagged'

export default function BookingsClient({ bookings }: { bookings: Booking[] }) {
  const router = useRouter()
  const [cancelId, setCancelId]       = useState<string | null>(null)
  const [notesId,         setNotesId]         = useState<string | null>(null)
  const [coachNoteText,   setCoachNoteText]   = useState('')
  const [clientNoteText,  setClientNoteText]  = useState('')
  const [expandFlag, setExpandFlag]   = useState<string | null>(null)
  const [loading, setLoading]         = useState(false)
  const [filter, setFilter]           = useState<Filter>('all')

  const flaggedCount = bookings.filter(b => b.flagged).length

  const visible = filter === 'all'     ? bookings
    : filter === 'flagged'             ? bookings.filter(b => b.flagged)
    : bookings.filter(b => b.status === filter)

  async function patch(id: string, body: object) {
    setLoading(true)
    await fetch(`/api/admin/bookings/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    setLoading(false)
    router.refresh()
  }

  async function handleCancel(id: string) {
    await patch(id, { status: 'cancelled' })
    setCancelId(null)
  }

  function openNotes(b: Booking) {
    setNotesId(b.id)
    setCoachNoteText(b.notes ?? '')
    setClientNoteText(b.client_notes ?? '')
  }

  async function handleSaveNotes() {
    if (!notesId) return
    await patch(notesId, { notes: coachNoteText || null, client_notes: clientNoteText || null })
    setNotesId(null)
  }

  async function clearFlag(id: string) {
    await patch(id, { flagged: false })
    setExpandFlag(null)
  }

  const cancelTarget = bookings.find(b => b.id === cancelId)

  const FILTERS: { key: Filter; label: string; count?: number }[] = [
    { key: 'all',       label: 'All' },
    { key: 'confirmed', label: 'Confirmed' },
    { key: 'cancelled', label: 'Cancelled' },
    { key: 'pending',   label: 'Pending' },
    { key: 'flagged',   label: 'Flagged', count: flaggedCount || undefined },
  ]

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-serif font-bold text-tfs-navy">Bookings</h1>
        <div className="flex gap-2 flex-wrap">
          {FILTERS.map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${
                filter === f.key
                  ? 'bg-tfs-navy text-white'
                  : f.key === 'flagged' && f.count
                    ? 'bg-red-50 text-red-700 border border-red-200 hover:bg-red-100'
                    : 'bg-white text-tfs-slate border border-gray-200 hover:border-tfs-teal'
              }`}
            >
              {f.key === 'flagged' && <Flag size={11} />}
              {f.label}
              {f.count ? (
                <span className={`rounded-full px-1.5 py-0.5 text-xs font-bold ${
                  filter === f.key ? 'bg-white/20' : 'bg-red-500 text-white'
                }`}>{f.count}</span>
              ) : null}
            </button>
          ))}
        </div>
      </div>

      <div className="card overflow-hidden">
        {visible.length === 0 ? (
          <p className="text-tfs-slate text-sm py-4">No bookings found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-3 pr-4 font-medium text-tfs-slate">Date / Time (ET)</th>
                  <th className="text-left py-3 pr-4 font-medium text-tfs-slate">Client</th>
                  <th className="text-left py-3 pr-4 font-medium text-tfs-slate">Coach</th>
                  <th className="text-left py-3 pr-4 font-medium text-tfs-slate">Status</th>
                  <th className="text-left py-3 pr-4 font-medium text-tfs-slate">Notes / Flag</th>
                  <th className="text-right py-3 font-medium text-tfs-slate">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {visible.map(b => (
                  <>
                    <tr key={b.id} className={b.flagged ? 'bg-red-50/50' : ''}>
                      <td className="py-3 pr-4 text-tfs-navy text-xs whitespace-nowrap">
                        {fmt(b.start_time_utc)}
                      </td>
                      <td className="py-3 pr-4">
                        <p className="font-medium text-tfs-navy">
                          {b.client?.first_name} {b.client?.last_name}
                        </p>
                        <p className="text-xs text-tfs-slate">{b.client?.email}</p>
                      </td>
                      <td className="py-3 pr-4 text-tfs-slate">{b.coach?.display_name ?? '—'}</td>
                      <td className="py-3 pr-4">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${STATUS_COLORS[b.status]}`}>
                          {b.status}
                        </span>
                      </td>
                      <td className="py-3 pr-4 max-w-[220px]">
                        {b.flagged && (
                          <button
                            onClick={() => setExpandFlag(expandFlag === b.id ? null : b.id)}
                            className="flex items-center gap-1 text-xs text-red-600 font-semibold mb-1 hover:underline"
                          >
                            <Flag size={11} /> Flagged by coach
                          </button>
                        )}
                        {b.notes && (
                          <p className="text-xs text-tfs-slate truncate flex items-center gap-1">
                            <Lock size={10} className="shrink-0 text-gray-400" />{b.notes}
                          </p>
                        )}
                        {b.client_notes && (
                          <p className="text-xs text-tfs-teal truncate flex items-center gap-1 mt-0.5">
                            <Share2 size={10} className="shrink-0" />{b.client_notes}
                          </p>
                        )}
                        {!b.notes && !b.client_notes && !b.flagged && (
                          <span className="text-xs text-gray-300">—</span>
                        )}
                      </td>
                      <td className="py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openNotes(b)}
                            className="p-1.5 rounded-lg text-tfs-slate hover:text-tfs-teal hover:bg-tfs-teal/10 transition-colors"
                            title="Edit notes"
                          >
                            <StickyNote size={15} />
                          </button>
                          {b.flagged && (
                            <button
                              onClick={() => clearFlag(b.id)}
                              disabled={loading}
                              className="p-1.5 rounded-lg text-red-500 hover:text-gray-500 hover:bg-gray-50 transition-colors"
                              title="Clear flag"
                            >
                              <FlagOff size={15} />
                            </button>
                          )}
                          {b.status === 'confirmed' && (
                            <button
                              onClick={() => setCancelId(b.id)}
                              className="p-1.5 rounded-lg text-tfs-slate hover:text-red-600 hover:bg-red-50 transition-colors"
                              title="Cancel booking"
                            >
                              <XCircle size={15} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                    {/* Flag reason expand row */}
                    {b.flagged && expandFlag === b.id && (
                      <tr key={`${b.id}-flag`} className="bg-red-50">
                        <td colSpan={6} className="px-4 py-3">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <p className="text-xs font-semibold text-red-700 mb-1">Coach flag reason:</p>
                              <p className="text-sm text-red-800">{b.flag_reason ?? 'No reason provided.'}</p>
                            </div>
                            <button
                              onClick={() => clearFlag(b.id)}
                              disabled={loading}
                              className="shrink-0 flex items-center gap-1.5 text-xs bg-white border border-red-200 text-red-600 hover:bg-red-600 hover:text-white px-3 py-1.5 rounded-lg transition-colors"
                            >
                              <FlagOff size={12} /> Clear Flag
                            </button>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Cancel modal */}
      {cancelId && cancelTarget && (
        <Modal title="Cancel Booking" onClose={() => setCancelId(null)}>
          <p className="text-tfs-slate text-sm mb-2">
            Cancel the session for{' '}
            <strong>{cancelTarget.client?.first_name} {cancelTarget.client?.last_name}</strong> on{' '}
            <strong>{fmt(cancelTarget.start_time_utc)}</strong>?
          </p>
          <p className="text-tfs-slate text-sm mb-6">
            The client&apos;s session credit for this month will be restored.
          </p>
          <div className="flex gap-3 justify-end">
            <button onClick={() => setCancelId(null)} className="btn-outline">Keep Booking</button>
            <button
              onClick={() => handleCancel(cancelId)}
              disabled={loading}
              className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
            >
              {loading ? 'Cancelling…' : 'Cancel Booking'}
            </button>
          </div>
        </Modal>
      )}

      {/* Notes modal */}
      {notesId && (
        <Modal title="Session Notes" onClose={() => setNotesId(null)}>
          <div className="space-y-4 mb-4">
            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                <Lock size={11} /> Coach Notes <span className="font-normal normal-case text-gray-400">(internal)</span>
              </label>
              <textarea
                value={coachNoteText}
                onChange={e => setCoachNoteText(e.target.value)}
                rows={3}
                placeholder="Private notes visible only to coaches and admins…"
                className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-tfs-teal resize-none"
              />
            </div>
            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-tfs-teal uppercase tracking-wide mb-1.5">
                <Share2 size={11} /> Client Notes <span className="font-normal normal-case text-tfs-slate">(shared with client)</span>
              </label>
              <textarea
                value={clientNoteText}
                onChange={e => setClientNoteText(e.target.value)}
                rows={3}
                placeholder="Notes visible to the client, coach, and admin…"
                className="w-full border border-tfs-teal/40 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-tfs-teal resize-none"
              />
            </div>
          </div>
          <div className="flex gap-3 justify-end">
            <button onClick={() => setNotesId(null)} className="btn-outline">Cancel</button>
            <button onClick={handleSaveNotes} disabled={loading} className="btn-primary">
              {loading ? 'Saving…' : 'Save Notes'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="font-serif font-bold text-tfs-navy text-lg">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none" aria-label="Close">&times;</button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  )
}
