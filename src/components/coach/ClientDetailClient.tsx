'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Lock, Share2, Edit3, X, CheckCircle, Trash2, Plus, FileText } from 'lucide-react'

type Client = {
  id: string
  first_name: string
  last_name: string
  email: string
  plan_tier: string
  client_type: string
  sessions_used_this_month: number
  is_active: boolean
  last_active_at: string
}

type Booking = {
  id: string
  start_time_utc: string
  status: 'confirmed' | 'pending' | 'cancelled'
  notes: string | null
  client_notes: string | null
  attended: boolean | null
  flagged: boolean
  flag_reason: string | null
}

type ClientNote = {
  id: string
  note: string
  created_at: string
}

const TIER_LABEL: Record<string, string> = { free: 'Free', bronze: 'Starter', silver: 'Advantage' }
const STATUS_BADGE: Record<string, string> = {
  confirmed: 'bg-green-100 text-green-700',
  pending:   'bg-yellow-100 text-yellow-700',
  cancelled: 'bg-red-100 text-red-600',
}

export default function ClientDetailClient({
  client,
  bookings: initial,
  clientNotes: initialNotes,
  coachTz,
}: {
  client:       Client
  bookings:     Booking[]
  clientNotes:  ClientNote[]
  coachTz:      string
}) {
  const router = useRouter()

  // Session note editing state
  const [bookings,       setBookings]       = useState(initial)
  const [editingId,      setEditingId]      = useState<string | null>(null)
  const [coachNoteText,  setCoachNoteText]  = useState('')
  const [clientNoteText, setClientNoteText] = useState('')
  const [updating,       setUpdating]       = useState<string | null>(null)
  const [sessionError,   setSessionError]   = useState('')

  // General client notes state
  const [notes,        setNotes]        = useState<ClientNote[]>(initialNotes)
  const [newNote,      setNewNote]      = useState('')
  const [addingNote,   setAddingNote]   = useState(false)
  const [deletingId,   setDeletingId]   = useState<string | null>(null)
  const [noteError,    setNoteError]    = useState('')

  function fmt(iso: string) {
    return new Intl.DateTimeFormat('en-US', {
      timeZone: coachTz, weekday: 'short', month: 'short',
      day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true,
    }).format(new Date(iso))
  }

  function fmtDate(iso: string) {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: 'numeric', minute: '2-digit', hour12: true,
    }).format(new Date(iso))
  }

  // Session notes
  function openEdit(b: Booking) {
    setEditingId(b.id)
    setCoachNoteText(b.notes ?? '')
    setClientNoteText(b.client_notes ?? '')
  }

  async function saveNotes(id: string) {
    setUpdating(id)
    setSessionError('')
    const res = await fetch(`/api/coach/sessions/${id}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ notes: coachNoteText || null, client_notes: clientNoteText || null }),
    })
    setUpdating(null)
    if (res.ok) {
      setBookings(prev => prev.map(b =>
        b.id === id ? { ...b, notes: coachNoteText || null, client_notes: clientNoteText || null } : b
      ))
      setEditingId(null)
      router.refresh()
    } else {
      const data = await res.json().catch(() => ({}))
      setSessionError(data.error ?? 'Failed to save notes')
    }
  }

  // General client notes
  async function addNote() {
    if (!newNote.trim()) return
    setAddingNote(true)
    setNoteError('')
    const res = await fetch('/api/coach/client-notes', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ clientId: client.id, note: newNote.trim() }),
    })
    setAddingNote(false)
    if (res.ok) {
      const created = await res.json()
      setNotes(prev => [created, ...prev])
      setNewNote('')
    } else {
      const data = await res.json().catch(() => ({}))
      setNoteError(data.error ?? 'Failed to save note')
    }
  }

  async function deleteNote(id: string) {
    setDeletingId(id)
    const res = await fetch(`/api/coach/client-notes/${id}`, { method: 'DELETE' })
    setDeletingId(null)
    if (res.ok) {
      setNotes(prev => prev.filter(n => n.id !== id))
    }
  }

  const past     = bookings.filter(b => new Date(b.start_time_utc) < new Date())
  const upcoming = bookings.filter(b => new Date(b.start_time_utc) >= new Date())
  const total    = bookings.filter(b => b.status !== 'cancelled').length

  return (
    <div className="space-y-6">
      {/* Client summary card */}
      <div className="card">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-xs text-tfs-slate mb-0.5">Plan</p>
            <p className="font-semibold text-tfs-navy">{TIER_LABEL[client.plan_tier] ?? client.plan_tier}</p>
          </div>
          <div>
            <p className="text-xs text-tfs-slate mb-0.5">Sessions this month</p>
            <p className="font-semibold text-tfs-navy">{client.sessions_used_this_month}</p>
          </div>
          <div>
            <p className="text-xs text-tfs-slate mb-0.5">Total sessions with you</p>
            <p className="font-semibold text-tfs-navy">{total}</p>
          </div>
          <div>
            <p className="text-xs text-tfs-slate mb-0.5">Status</p>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${client.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
              {client.is_active ? 'Active' : 'Inactive'}
            </span>
          </div>
        </div>
      </div>

      {/* General client notes */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <FileText size={16} className="text-tfs-teal" />
          <h2 className="font-serif font-bold text-tfs-navy text-lg">Client Notes</h2>
          <span className="text-xs text-tfs-slate">General notes about this client</span>
        </div>

        <div className="card space-y-4">
          {/* Add note */}
          <div>
            <textarea
              value={newNote}
              onChange={e => setNewNote(e.target.value)}
              rows={3}
              placeholder="Add a general note about this client…"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-tfs-teal resize-none"
            />
            {noteError && <p className="text-xs text-red-600 mt-1">{noteError}</p>}
            <div className="flex justify-end mt-2">
              <button
                onClick={addNote}
                disabled={addingNote || !newNote.trim()}
                className="btn-primary text-sm px-4 py-1.5 flex items-center gap-1.5 disabled:opacity-50"
              >
                <Plus size={13} />
                {addingNote ? 'Saving…' : 'Add Note'}
              </button>
            </div>
          </div>

          {/* Notes list */}
          {notes.length === 0 ? (
            <p className="text-sm text-tfs-slate italic">No general notes yet.</p>
          ) : (
            <div className="space-y-3 pt-2 border-t border-gray-100">
              {notes.map(n => (
                <div key={n.id} className="flex items-start gap-3 group">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-tfs-navy whitespace-pre-wrap">{n.note}</p>
                    <p className="text-xs text-tfs-slate mt-0.5">{fmtDate(n.created_at)}</p>
                  </div>
                  <button
                    onClick={() => deleteNote(n.id)}
                    disabled={deletingId === n.id}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded text-gray-300 hover:text-red-500 transition-all shrink-0"
                    title="Delete note"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {sessionError && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">{sessionError}</p>
      )}

      {/* Upcoming sessions */}
      {upcoming.length > 0 && (
        <section>
          <h2 className="font-serif font-bold text-tfs-navy text-lg mb-3">Upcoming Sessions</h2>
          <SessionList bookings={upcoming} fmt={fmt} editingId={editingId} updating={updating}
            coachNoteText={coachNoteText} clientNoteText={clientNoteText}
            setCoachNoteText={setCoachNoteText} setClientNoteText={setClientNoteText}
            onEdit={openEdit} onCancel={() => setEditingId(null)} onSave={saveNotes} />
        </section>
      )}

      {/* Past sessions */}
      {past.length > 0 && (
        <section>
          <h2 className="font-serif font-bold text-tfs-navy text-lg mb-3">Past Sessions</h2>
          <SessionList bookings={past} fmt={fmt} editingId={editingId} updating={updating}
            coachNoteText={coachNoteText} clientNoteText={clientNoteText}
            setCoachNoteText={setCoachNoteText} setClientNoteText={setClientNoteText}
            onEdit={openEdit} onCancel={() => setEditingId(null)} onSave={saveNotes} />
        </section>
      )}

      {bookings.length === 0 && (
        <p className="text-tfs-slate text-sm">No sessions found with this client.</p>
      )}
    </div>
  )
}

function SessionList({
  bookings, fmt, editingId, updating,
  coachNoteText, clientNoteText, setCoachNoteText, setClientNoteText,
  onEdit, onCancel, onSave,
}: {
  bookings: Booking[]
  fmt: (iso: string) => string
  editingId: string | null
  updating: string | null
  coachNoteText: string
  clientNoteText: string
  setCoachNoteText: (v: string) => void
  setClientNoteText: (v: string) => void
  onEdit: (b: Booking) => void
  onCancel: () => void
  onSave: (id: string) => void
}) {
  return (
    <div className="space-y-3">
      {bookings.map(b => (
        <div key={b.id} className={`card ${b.flagged ? 'border-l-4 border-l-red-500' : ''}`}>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <p className="text-sm font-semibold text-tfs-navy">{fmt(b.start_time_utc)}</p>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_BADGE[b.status]}`}>
                  {b.status}
                </span>
                {b.attended != null && b.status !== 'cancelled' && (
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${b.attended ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                    {b.attended ? 'Attended' : 'No-show'}
                  </span>
                )}
              </div>
              {b.notes && (
                <p className="text-xs text-tfs-slate italic mt-1 border-l-2 border-gray-200 pl-2 flex items-start gap-1">
                  <Lock size={10} className="shrink-0 mt-0.5 text-gray-400" />{b.notes}
                </p>
              )}
              {b.client_notes && (
                <p className="text-xs text-tfs-teal italic mt-1 border-l-2 border-tfs-teal/40 pl-2 flex items-start gap-1">
                  <Share2 size={10} className="shrink-0 mt-0.5" />{b.client_notes}
                </p>
              )}
            </div>
            <button
              onClick={() => onEdit(b)}
              className="p-1.5 rounded-lg text-tfs-slate hover:text-tfs-teal hover:bg-tfs-teal/10 transition-colors shrink-0"
              title="Edit notes"
            >
              <Edit3 size={15} />
            </button>
          </div>

          {editingId === b.id && (
            <div className="mt-4 pt-4 border-t border-gray-100 space-y-3">
              <div>
                <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                  <Lock size={11} /> Coach Notes <span className="font-normal normal-case text-gray-400">(internal — admin only)</span>
                </label>
                <textarea
                  value={coachNoteText}
                  onChange={e => setCoachNoteText(e.target.value)}
                  rows={2}
                  placeholder="Private notes visible only to coaches and admins…"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-tfs-teal resize-none"
                />
              </div>
              <div>
                <label className="flex items-center gap-1.5 text-xs font-semibold text-tfs-teal uppercase tracking-wide mb-1">
                  <Share2 size={11} /> Client Notes <span className="font-normal normal-case text-tfs-slate">(shared with client)</span>
                </label>
                <textarea
                  value={clientNoteText}
                  onChange={e => setClientNoteText(e.target.value)}
                  rows={2}
                  placeholder="Notes visible to the client, coach, and admin…"
                  className="w-full border border-tfs-teal/40 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-tfs-teal resize-none"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <button onClick={onCancel} className="text-sm text-tfs-slate hover:text-tfs-navy px-3 py-1.5 rounded-lg border border-gray-200">
                  <X size={13} className="inline mr-1" />Cancel
                </button>
                <button
                  onClick={() => onSave(b.id)}
                  disabled={updating === b.id}
                  className="btn-primary text-sm px-4 py-1.5 flex items-center gap-1.5"
                >
                  <CheckCircle size={13} />
                  {updating === b.id ? 'Saving…' : 'Save Notes'}
                </button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
