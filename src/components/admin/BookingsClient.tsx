'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { XCircle, StickyNote } from 'lucide-react'

type Booking = {
  id: string
  start_time_utc: string
  end_time_utc: string
  status: 'pending' | 'confirmed' | 'cancelled'
  notes: string | null
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

export default function BookingsClient({ bookings }: { bookings: Booking[] }) {
  const router = useRouter()
  const [cancelId, setCancelId]   = useState<string | null>(null)
  const [notesId, setNotesId]     = useState<string | null>(null)
  const [notesText, setNotesText] = useState('')
  const [loading, setLoading]     = useState(false)
  const [filter, setFilter]       = useState<'all' | 'confirmed' | 'cancelled' | 'pending'>('all')

  const visible = filter === 'all' ? bookings : bookings.filter(b => b.status === filter)

  async function handleCancel(id: string) {
    setLoading(true)
    await fetch(`/api/admin/bookings/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'cancelled' }),
    })
    setLoading(false)
    setCancelId(null)
    router.refresh()
  }

  function openNotes(b: Booking) {
    setNotesId(b.id)
    setNotesText(b.notes ?? '')
  }

  async function handleSaveNotes() {
    if (!notesId) return
    setLoading(true)
    await fetch(`/api/admin/bookings/${notesId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes: notesText }),
    })
    setLoading(false)
    setNotesId(null)
    router.refresh()
  }

  const cancelTarget = bookings.find(b => b.id === cancelId)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-serif font-bold text-tfs-navy">Bookings</h1>
        <div className="flex gap-2">
          {(['all', 'confirmed', 'cancelled', 'pending'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${
                filter === f
                  ? 'bg-tfs-navy text-white'
                  : 'bg-white text-tfs-slate border border-gray-200 hover:border-tfs-teal'
              }`}
            >
              {f}
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
                  <th className="text-left py-3 pr-4 font-medium text-tfs-slate">Notes</th>
                  <th className="text-right py-3 font-medium text-tfs-slate">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {visible.map(b => (
                  <tr key={b.id}>
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
                    <td className="py-3 pr-4 text-xs text-tfs-slate max-w-[180px] truncate">
                      {b.notes ?? '—'}
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
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Cancel confirmation */}
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
          <textarea
            value={notesText}
            onChange={e => setNotesText(e.target.value)}
            rows={4}
            placeholder="Add internal notes about this session…"
            className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-tfs-teal resize-none mb-4"
          />
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
