'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle, XCircle, Edit3, X } from 'lucide-react'

type Session = {
  id: string
  start_time_utc: string
  end_time_utc: string
  status: 'confirmed' | 'pending' | 'cancelled'
  notes: string | null
  attended: boolean | null
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
  const [sessions, setSessions] = useState(initial)
  const [editingNote, setEditingNote] = useState<string | null>(null)
  const [noteText, setNoteText] = useState('')
  const [updating, setUpdating] = useState<string | null>(null)
  const [filter, setFilter] = useState<'upcoming' | 'past' | 'all'>('upcoming')

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

  return (
    <div>
      {/* Filter tabs */}
      <div className="flex gap-2 mb-6">
        {(['upcoming', 'past', 'all'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium capitalize transition-colors ${
              filter === f ? 'bg-tfs-teal text-white' : 'bg-white text-tfs-slate border border-gray-200 hover:border-tfs-teal'
            }`}>
            {f}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="card text-center py-12 text-tfs-slate">
          <p>No {filter === 'all' ? '' : filter} sessions.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(s => {
            const isPast   = new Date(s.start_time_utc) < now
            const canAct   = s.status !== 'cancelled'
            const client   = s.profiles
            const isEditing = editingNote === s.id
            const busy     = updating === s.id

            return (
              <div key={s.id} className="card">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <p className="font-semibold text-tfs-navy text-sm">
                        {client?.first_name} {client?.last_name}
                      </p>
                      {client?.plan_tier && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-tfs-teal/10 text-tfs-teal font-medium">
                          {TIER_LABEL[client.plan_tier] ?? client.plan_tier}
                        </span>
                      )}
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${STATUS_BADGE[s.status]}`}>
                        {s.status}
                      </span>
                    </div>
                    <p className="text-xs text-tfs-teal font-medium">{fmt(s.start_time_utc)}</p>
                    <p className="text-xs text-tfs-slate">{client?.email}</p>

                    {/* Note */}
                    {isEditing ? (
                      <div className="mt-2 flex gap-2">
                        <input
                          autoFocus
                          value={noteText}
                          onChange={e => setNoteText(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') saveNote(s.id); if (e.key === 'Escape') setEditingNote(null) }}
                          className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-tfs-teal"
                          placeholder="Add a note…"
                        />
                        <button onClick={() => saveNote(s.id)} disabled={busy}
                          className="text-xs px-3 py-1.5 bg-tfs-teal text-white rounded-lg font-medium disabled:opacity-50">
                          Save
                        </button>
                        <button onClick={() => setEditingNote(null)}
                          className="text-xs px-2 py-1.5 text-tfs-slate hover:text-tfs-navy">
                          <X size={14} />
                        </button>
                      </div>
                    ) : s.notes ? (
                      <p className="text-xs text-tfs-slate mt-1 italic">
                        Note: {s.notes}{' '}
                        {canAct && (
                          <button onClick={() => { setEditingNote(s.id); setNoteText(s.notes ?? '') }}
                            className="text-tfs-teal not-italic hover:underline ml-1">edit</button>
                        )}
                      </p>
                    ) : canAct ? (
                      <button onClick={() => { setEditingNote(s.id); setNoteText('') }}
                        className="mt-1 flex items-center gap-1 text-xs text-tfs-slate hover:text-tfs-teal">
                        <Edit3 size={12} /> Add note
                      </button>
                    ) : null}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-2 items-end shrink-0">
                    {/* Attended flag — past sessions only */}
                    {isPast && canAct && (
                      <div className="flex gap-1">
                        <button
                          onClick={() => patch(s.id, { attended: true })}
                          disabled={busy}
                          title="Mark attended"
                          className={`p-1.5 rounded-lg transition-colors disabled:opacity-50 ${
                            s.attended === true ? 'text-green-600 bg-green-50' : 'text-gray-300 hover:text-green-600 hover:bg-green-50'
                          }`}>
                          <CheckCircle size={18} />
                        </button>
                        <button
                          onClick={() => patch(s.id, { attended: false })}
                          disabled={busy}
                          title="Mark no-show"
                          className={`p-1.5 rounded-lg transition-colors disabled:opacity-50 ${
                            s.attended === false ? 'text-red-500 bg-red-50' : 'text-gray-300 hover:text-red-500 hover:bg-red-50'
                          }`}>
                          <XCircle size={18} />
                        </button>
                      </div>
                    )}

                    {/* Cancel — future confirmed only */}
                    {!isPast && s.status === 'confirmed' && (
                      <button
                        onClick={() => { if (confirm('Cancel this session and restore the client\'s session credit?')) patch(s.id, { status: 'cancelled' }) }}
                        disabled={busy}
                        className="text-xs text-red-500 hover:text-red-700 hover:underline disabled:opacity-50">
                        Cancel
                      </button>
                    )}

                    {s.attended === true  && <span className="text-xs text-green-600 font-medium">Attended</span>}
                    {s.attended === false && <span className="text-xs text-red-500 font-medium">No-show</span>}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
