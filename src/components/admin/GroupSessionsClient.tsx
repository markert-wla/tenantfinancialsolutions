'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Link as LinkIcon, Video } from 'lucide-react'

type GroupSession = {
  id: string
  session_date: string
  join_link: string | null
  recording_url: string | null
  reminder_sent: boolean
  created_at: string
}

function fmtDate(dateStr: string) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC',
  })
}

export default function GroupSessionsClient({ sessions }: { sessions: GroupSession[] }) {
  const router = useRouter()
  const [showAdd, setShowAdd]         = useState(false)
  const [editId, setEditId]           = useState<string | null>(null)
  const [editField, setEditField]     = useState<'join_link' | 'recording_url'>('join_link')
  const [editValue, setEditValue]     = useState('')
  const [loading, setLoading]         = useState(false)
  const [error, setError]             = useState('')

  const now = new Date().toISOString().split('T')[0]
  const upcoming = sessions.filter(s => s.session_date >= now)
  const past     = sessions.filter(s => s.session_date <  now)

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const fd = new FormData(e.currentTarget)
    const res = await fetch('/api/admin/group-sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_date: fd.get('session_date'),
        join_link:    fd.get('join_link') || null,
      }),
    })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) { setError(data.error ?? 'Failed to create session'); return }
    setShowAdd(false)
    router.refresh()
  }

  function openEdit(session: GroupSession, field: 'join_link' | 'recording_url') {
    setEditId(session.id)
    setEditField(field)
    setEditValue(field === 'join_link' ? (session.join_link ?? '') : (session.recording_url ?? ''))
  }

  async function handleEditSave() {
    if (!editId) return
    setLoading(true)
    await fetch(`/api/admin/group-sessions/${editId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [editField]: editValue || null }),
    })
    setLoading(false)
    setEditId(null)
    router.refresh()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-serif font-bold text-tfs-navy">Group Sessions</h1>
        <button onClick={() => setShowAdd(true)} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> Schedule Session
        </button>
      </div>

      <SessionList
        title="Upcoming"
        sessions={upcoming}
        emptyMessage="No upcoming group sessions scheduled."
        onEditLink={s => openEdit(s, 'join_link')}
        onEditRecording={s => openEdit(s, 'recording_url')}
        showActions
      />

      {past.length > 0 && (
        <div className="mt-6">
          <SessionList
            title="Past Sessions"
            sessions={past.slice(0, 10)}
            emptyMessage=""
            onEditLink={s => openEdit(s, 'join_link')}
            onEditRecording={s => openEdit(s, 'recording_url')}
            showActions={false}
          />
        </div>
      )}

      {/* Create modal */}
      {showAdd && (
        <Modal title="Schedule Group Session" onClose={() => { setShowAdd(false); setError('') }}>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-tfs-navy mb-1">Session Date</label>
              <input
                type="date"
                name="session_date"
                required
                min={now}
                className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-tfs-teal"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-tfs-navy mb-1">Join Link (optional — add now or later)</label>
              <input
                type="url"
                name="join_link"
                placeholder="https://zoom.us/j/…"
                className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-tfs-teal"
              />
            </div>
            {error && (
              <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-4 py-3">{error}</p>
            )}
            <div className="flex justify-end pt-2">
              <button type="submit" disabled={loading} className="btn-primary">
                {loading ? 'Saving…' : 'Schedule Session'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Edit link/recording modal */}
      {editId && (
        <Modal
          title={editField === 'join_link' ? 'Update Join Link' : 'Add Recording URL'}
          onClose={() => setEditId(null)}
        >
          <div className="space-y-4">
            <input
              type="url"
              value={editValue}
              onChange={e => setEditValue(e.target.value)}
              placeholder={editField === 'join_link' ? 'https://zoom.us/j/…' : 'https://…'}
              className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-tfs-teal"
            />
            <div className="flex gap-3 justify-end">
              <button onClick={() => setEditId(null)} className="btn-outline">Cancel</button>
              <button onClick={handleEditSave} disabled={loading} className="btn-primary">
                {loading ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

function SessionList({
  title, sessions, emptyMessage, onEditLink, onEditRecording, showActions,
}: {
  title: string
  sessions: GroupSession[]
  emptyMessage: string
  onEditLink: (s: GroupSession) => void
  onEditRecording: (s: GroupSession) => void
  showActions: boolean
}) {
  return (
    <div className="card">
      <h2 className="font-serif font-bold text-tfs-navy text-xl mb-4">{title}</h2>
      {sessions.length === 0 ? (
        <p className="text-tfs-slate text-sm">{emptyMessage}</p>
      ) : (
        <div className="divide-y divide-gray-100">
          {sessions.map(s => (
            <div key={s.id} className="py-4 flex items-start justify-between gap-4">
              <div>
                <p className="font-medium text-tfs-navy">{fmtDate(s.session_date)}</p>
                <div className="flex items-center gap-4 mt-1.5">
                  {s.join_link ? (
                    <a href={s.join_link} target="_blank" rel="noopener noreferrer"
                       className="flex items-center gap-1 text-xs text-tfs-teal hover:underline">
                      <LinkIcon size={12} /> Join link
                    </a>
                  ) : (
                    <span className="text-xs text-tfs-slate italic">No join link yet</span>
                  )}
                  {s.recording_url && (
                    <a href={s.recording_url} target="_blank" rel="noopener noreferrer"
                       className="flex items-center gap-1 text-xs text-tfs-teal hover:underline">
                      <Video size={12} /> Recording
                    </a>
                  )}
                </div>
                {s.reminder_sent && (
                  <span className="text-xs text-green-600 mt-1 block">Reminder sent</span>
                )}
              </div>
              {showActions && (
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => onEditLink(s)}
                    className="px-2.5 py-1 rounded-lg border border-gray-200 text-xs text-tfs-slate hover:border-tfs-teal hover:text-tfs-teal transition-colors"
                  >
                    {s.join_link ? 'Edit link' : 'Add link'}
                  </button>
                  <button
                    onClick={() => onEditRecording(s)}
                    className="px-2.5 py-1 rounded-lg border border-gray-200 text-xs text-tfs-slate hover:border-tfs-teal hover:text-tfs-teal transition-colors"
                  >
                    {s.recording_url ? 'Edit recording' : 'Add recording'}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="font-serif font-bold text-tfs-navy text-lg">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none" aria-label="Close">&times;</button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  )
}
