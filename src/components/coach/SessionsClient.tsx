'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle, XCircle, Edit3, X, Flag } from 'lucide-react'

type Session = {
  id: string
  start_time_utc: string
  end_time_utc: string
  status: 'confirmed' | 'pending' | 'cancelled'
  notes: string | null
  attended: boolean | null
  flagged: boolean
  flag_reason: string | null
  profiles: { first_name: string; last_name: string; email: string; plan_tier: string } | null
}

const STATUS_BADGE: Record<string, string> = {
  confirmed: 'bg-green-100 text-green-700',
  pending:   'bg-yellow-100 text-yellow-700',
  cancelled: 'bg-red-100 text-red-600',
}

const TIER_LABEL: Record<string, string> = {
  free:   'Free',
  bronze: 'Starter',
  silver: 'Advantage',
}

type Props = { sessions: Session[]; coachTz: string }

export default function SessionsClient({ sessions: initial, coachTz }: Props) {
  const router = useRouter()
  const [sessions, setSessions]       = useState(initial)
  const [editingNote, setEditingNote] = useState<string | null>(null)
  const [noteText, setNoteText]       = useState('')
  const [flaggingId, setFlaggingId]   = useState<string | null>(null)
  const [flagReason, setFlagReason]   = useState('')
  const [updating, setUpdating]       = useState<string | null>(null)
  const [filter, setFilter]           = useState<'upcoming' | 'past' | 'all'>('upcoming')

  const now = new Date()

  const filtered = sessions.filter(s => {
    const start = new Date(s.start_time_utc)
    if (filter === 'upcoming') return start >= now && s.status !== 'cancelled'
    if (filter === 'past')     return start < now
    return true
  }).sort((a, b) => {
    if (filter === 'past') return new Date(b.start_time_utc).getTime() - new Date(a.start_time_utc).getTime()
    return new Date(a.start_time_utc).getTime() - new Date(b.start_time_utc).getTime()
  })

  function fmt(iso: string) {
    return new Intl.DateTimeFormat('en-US', {
      timeZone: coachTz, weekday: 'short', month: 'short', day: 'numeric',
      hour: 'numeric', minute: '2-digit', hour12: true,
    }).format(new Date(iso))
  }

  async function patch(id: string, payload: Record<string, unknown>) {
    setUpdating(id)
    const res = await fetch(`/api/coach/sessions/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    setUpdating(null)
    if (res.ok) {
      setSessions(prev => prev.map(s => s.id === id ? { ...s, ...payload } : s))
      router.refresh()
    }
  }

  async function saveNote(id: string) {
    await patch(id, { notes: noteText || null })
    setEditingNote(null)
  }

  async function submitFlag() {
    if (!flaggingId || !flagReason.trim()) return
    await patch(flaggingId, { flagged: true, flag_reason: flagReason.trim() })
    setFlaggingId(null)
    setFlagReason('')
  }

  return (
    <div>
      {/* Filter tabs */}
      <div className="flex gap-2 mb-6">
        {(['upcoming', 'past', 'all'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-colors ${
              filter === f
                ? 'bg-tfs-navy text-white'
                : 'bg-white text-tfs-slate border border-gray-200 hover:border-tfs-teal'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="text-tfs-slate text-sm">No sessions found.</p>
      ) : (
        <div className="space-y-3">
          {filtered.map(s => {
            const client = s.profiles
            return (
              <div
                key={s.id}
                className={`card ${s.flagged ? 'border-l-4 border-l-red-500' : ''}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <p className="font-semibold text-tfs-navy">
                        {client?.first_name} {client?.last_name}
                      </p>
                      {client?.plan_tier && (
                        <span className="text-xs text-tfs-slate">
                          ({TIER_LABEL[client.plan_tier] ?? client.plan_tier})
                        </span>
                      )}
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_BADGE[s.status]}`}>
                        {s.status}
                      </span>
                      {s.flagged && (
                        <span className="text-xs bg-red-100 text-red-700 font-semibold px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Flag size={10} /> Flagged for admin
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-tfs-teal font-medium mb-1">{fmt(s.start_time_utc)}</p>
                    {client?.email && (
                      <p className="text-xs text-tfs-slate">{client.email}</p>
                    )}
                    {s.notes && (
                      <p className="text-xs text-tfs-slate italic mt-1 border-l-2 border-gray-200 pl-2">{s.notes}</p>
                    )}
                    {s.flagged && s.flag_reason && (
                      <p className="text-xs text-red-600 mt-1 border-l-2 border-red-300 pl-2 italic">
                        Flag reason: {s.flag_reason}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {/* Attended toggle — only for past sessions */}
                    {new Date(s.start_time_utc) < now && s.status !== 'cancelled' && (
                      <button
                        onClick={() => patch(s.id, { attended: !s.attended })}
                        disabled={updating === s.id}
                        title={s.attended ? 'Mark no-show' : 'Mark attended'}
                        className={`p-1.5 rounded-lg transition-colors ${
                          s.attended
                            ? 'text-green-600 hover:text-green-700 bg-green-50'
                            : 'text-gray-400 hover:text-green-600 hover:bg-green-50'
                        }`}
                      >
                        <CheckCircle size={16} />
                      </button>
                    )}

                    {/* Edit note */}
                    <button
                      onClick={() => { setEditingNote(s.id); setNoteText(s.notes ?? '') }}
                      className="p-1.5 rounded-lg text-tfs-slate hover:text-tfs-teal hover:bg-tfs-teal/10 transition-colors"
                      title="Edit note"
                    >
                      <Edit3 size={15} />
                    </button>

                    {/* Flag button — only if not already flagged */}
                    {!s.flagged && s.status !== 'cancelled' && (
                      <button
                        onClick={() => { setFlaggingId(s.id); setFlagReason('') }}
                        className="p-1.5 rounded-lg text-tfs-slate hover:text-red-600 hover:bg-red-50 transition-colors"
                        title="Flag for admin"
                      >
                        <Flag size={15} />
                      </button>
                    )}

                    {/* Cancel */}
                    {s.status === 'confirmed' && new Date(s.start_time_utc) > now && (
                      <button
                        onClick={() => patch(s.id, { status: 'cancelled' })}
                        disabled={updating === s.id}
                        className="p-1.5 rounded-lg text-tfs-slate hover:text-red-600 hover:bg-red-50 transition-colors"
                        title="Cancel session"
                      >
                        <XCircle size={15} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Inline note editor */}
                {editingNote === s.id && (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <textarea
                      value={noteText}
                      onChange={e => setNoteText(e.target.value)}
                      rows={3}
                      placeholder="Session notes…"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-tfs-teal resize-none mb-2"
                    />
                    <div className="flex gap-2 justify-end">
                      <button onClick={() => setEditingNote(null)} className="text-sm text-tfs-slate hover:text-tfs-navy px-3 py-1.5 rounded-lg border border-gray-200">
                        <X size={13} className="inline mr-1" />Cancel
                      </button>
                      <button
                        onClick={() => saveNote(s.id)}
                        disabled={updating === s.id}
                        className="btn-primary text-sm px-4 py-1.5"
                      >
                        {updating === s.id ? 'Saving…' : 'Save'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Flag modal */}
      {flaggingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="font-serif font-bold text-tfs-navy flex items-center gap-2">
                <Flag size={16} className="text-red-500" /> Flag Session for Admin
              </h3>
              <button onClick={() => setFlaggingId(null)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
            </div>
            <div className="px-6 py-5">
              <p className="text-sm text-tfs-slate mb-4">
                Describe the issue. Once flagged, the admin will be notified. Flags cannot be removed by coaches.
              </p>
              <textarea
                value={flagReason}
                onChange={e => setFlagReason(e.target.value)}
                rows={4}
                placeholder="Describe the concern or issue…"
                className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 resize-none mb-4"
                autoFocus
              />
              <div className="flex gap-3 justify-end">
                <button onClick={() => setFlaggingId(null)} className="btn-outline">Cancel</button>
                <button
                  onClick={submitFlag}
                  disabled={!flagReason.trim() || !!updating}
                  className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  {updating ? 'Flagging…' : 'Submit Flag'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
