'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash2, Eye, EyeOff, MessageSquare, Video } from 'lucide-react'

interface Popup {
  id: string
  type: 'youtube' | 'text'
  content: string
  label: string | null
  is_active: boolean
}

const INPUT = 'w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-tfs-teal'

export default function PopupsManagerForm({ initialPopups }: { initialPopups: Popup[] }) {
  const router  = useRouter()
  const [popups,  setPopups]  = useState<Popup[]>(initialPopups)
  const [type,    setType]    = useState<'youtube' | 'text'>('text')
  const [content, setContent] = useState('')
  const [label,   setLabel]   = useState('')
  const [adding,  setAdding]  = useState(false)
  const [error,   setError]   = useState('')

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setAdding(true)
    const res = await fetch('/api/admin/popups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, content, label }),
    })
    const data = await res.json()
    setAdding(false)
    if (!res.ok) { setError(data.error ?? 'Failed to add popup'); return }
    setContent('')
    setLabel('')
    router.refresh()
    // Optimistically add to list
    setPopups(prev => [...prev, { id: data.id, type, content, label: label || null, is_active: true }])
  }

  async function toggleActive(popup: Popup) {
    await fetch(`/api/admin/popups/${popup.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !popup.is_active }),
    })
    setPopups(prev => prev.map(p => p.id === popup.id ? { ...p, is_active: !p.is_active } : p))
  }

  async function handleDelete(id: string) {
    await fetch(`/api/admin/popups/${id}`, { method: 'DELETE' })
    setPopups(prev => prev.filter(p => p.id !== id))
  }

  return (
    <div className="card mt-8">
      <h2 className="font-serif font-bold text-tfs-navy text-xl mb-1 flex items-center gap-2">
        <MessageSquare size={20} className="text-tfs-teal" /> Public Page Popups
      </h2>
      <p className="text-sm text-tfs-slate mb-6">
        Add YouTube videos or text messages that appear as subtle slide-in panels on public pages. Visitors can dismiss them.
      </p>

      {/* Existing popups */}
      {popups.length > 0 && (
        <div className="space-y-2 mb-6">
          {popups.map(popup => (
            <div key={popup.id} className="flex items-start gap-3 p-3 rounded-lg border border-gray-100 bg-gray-50">
              <div className="mt-0.5 text-tfs-teal shrink-0">
                {popup.type === 'youtube' ? <Video size={16} /> : <MessageSquare size={16} />}
              </div>
              <div className="flex-1 min-w-0">
                {popup.label && <p className="text-xs font-semibold text-tfs-navy mb-0.5">{popup.label}</p>}
                <p className="text-sm text-tfs-slate truncate">{popup.content}</p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => toggleActive(popup)}
                  title={popup.is_active ? 'Hide' : 'Show'}
                  className={`p-1.5 rounded-lg transition-colors ${popup.is_active ? 'text-tfs-teal hover:bg-tfs-teal/10' : 'text-gray-400 hover:bg-gray-200'}`}
                >
                  {popup.is_active ? <Eye size={15} /> : <EyeOff size={15} />}
                </button>
                <button
                  onClick={() => handleDelete(popup.id)}
                  title="Delete"
                  className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add new popup */}
      <form onSubmit={handleAdd} className="space-y-4 border-t border-gray-100 pt-5">
        <p className="text-sm font-medium text-tfs-navy">Add a new popup</p>

        {/* Type toggle */}
        <div className="flex gap-2">
          {(['text', 'youtube'] as const).map(t => (
            <button
              key={t}
              type="button"
              onClick={() => setType(t)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium border transition-colors ${
                type === t
                  ? 'bg-tfs-teal text-white border-tfs-teal'
                  : 'bg-white text-tfs-navy border-gray-200 hover:border-tfs-teal'
              }`}
            >
              {t === 'youtube' ? <Video size={14} /> : <MessageSquare size={14} />}
              {t === 'youtube' ? 'YouTube Video' : 'Text Message'}
            </button>
          ))}
        </div>

        <div>
          <label className="block text-sm font-medium text-tfs-navy mb-1">
            Label <span className="text-tfs-slate font-normal">(optional — shown as popup title)</span>
          </label>
          <input
            type="text"
            value={label}
            onChange={e => setLabel(e.target.value)}
            placeholder={type === 'youtube' ? 'e.g. Watch Our Story' : 'e.g. Welcome!'}
            className={INPUT}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-tfs-navy mb-1">
            {type === 'youtube' ? 'YouTube URL or Video ID' : 'Message'}
            <span className="text-red-500 ml-0.5">*</span>
          </label>
          {type === 'youtube' ? (
            <input
              type="text"
              value={content}
              onChange={e => setContent(e.target.value)}
              required
              placeholder="https://www.youtube.com/watch?v=..."
              className={INPUT}
            />
          ) : (
            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              required
              rows={3}
              placeholder="Enter the message to show visitors…"
              className={`${INPUT} resize-none`}
            />
          )}
        </div>

        {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">{error}</p>}

        <button type="submit" disabled={adding} className="btn-primary flex items-center gap-2">
          <Plus size={15} />
          {adding ? 'Adding…' : 'Add Popup'}
        </button>
      </form>
    </div>
  )
}
