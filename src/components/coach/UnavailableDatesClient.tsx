'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CalendarX, Plus, Trash2 } from 'lucide-react'

type UnavailableDate = {
  id:   string
  date: string
  note: string | null
}

export default function UnavailableDatesClient({
  initialDates,
}: {
  initialDates: UnavailableDate[]
}) {
  const router = useRouter()
  const [dates,   setDates]   = useState<UnavailableDate[]>(initialDates)
  const [newDate, setNewDate] = useState('')
  const [newNote, setNewNote] = useState('')
  const [saving,  setSaving]  = useState(false)
  const [error,   setError]   = useState('')

  async function handleAdd() {
    if (!newDate) return
    setError('')
    setSaving(true)
    const res  = await fetch('/api/coach/unavailable-dates', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ date: newDate, note: newNote.trim() || undefined }),
    })
    setSaving(false)
    if (!res.ok) {
      const data = await res.json()
      setError(data.error ?? 'Failed to add date')
      return
    }
    setNewDate('')
    setNewNote('')
    router.refresh()
    // Optimistic update while refresh runs
    const fakeId = Math.random().toString(36).slice(2)
    setDates(prev => [...prev, { id: fakeId, date: newDate, note: newNote.trim() || null }]
      .sort((a, b) => a.date.localeCompare(b.date)))
  }

  async function handleRemove(id: string) {
    setError('')
    const res = await fetch('/api/coach/unavailable-dates', {
      method:  'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ id }),
    })
    if (!res.ok) {
      const data = await res.json()
      setError(data.error ?? 'Failed to remove date')
      return
    }
    setDates(prev => prev.filter(d => d.id !== id))
  }

  function formatDate(iso: string) {
    // Parse as local date to avoid timezone shifting
    const [y, m, d] = iso.split('-').map(Number)
    return new Date(y, m - 1, d).toLocaleDateString('en-US', {
      weekday: 'short', month: 'long', day: 'numeric', year: 'numeric',
    })
  }

  // Minimum date is today
  const today = new Date().toISOString().split('T')[0]

  return (
    <div className="card">
      <div className="flex items-center gap-2 mb-4">
        <CalendarX className="text-tfs-navy" size={18} />
        <h2 className="font-semibold text-tfs-navy text-lg">Unavailable Days</h2>
      </div>
      <p className="text-sm text-tfs-slate mb-5">
        Block out specific dates — these override your regular weekly schedule and hide all slots on those days.
      </p>

      {/* Existing blocked dates */}
      {dates.length === 0 ? (
        <p className="text-sm text-tfs-slate italic mb-5">No blocked dates.</p>
      ) : (
        <ul className="space-y-2 mb-5">
          {dates.map(d => (
            <li key={d.id} className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg bg-red-50 border border-red-100">
              <div>
                <span className="text-sm font-medium text-tfs-navy">{formatDate(d.date)}</span>
                {d.note && <span className="text-xs text-tfs-slate ml-2">— {d.note}</span>}
              </div>
              <button
                onClick={() => handleRemove(d.id)}
                className="p-1.5 rounded-lg text-tfs-slate hover:text-red-600 hover:bg-red-100 transition-colors shrink-0"
                aria-label="Remove date"
              >
                <Trash2 size={15} />
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Add new date */}
      <div className="flex flex-wrap items-end gap-3 border-t border-gray-100 pt-4">
        <div>
          <label className="block text-xs font-medium text-tfs-navy mb-1">Date</label>
          <input
            type="date"
            min={today}
            value={newDate}
            onChange={e => setNewDate(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-tfs-teal"
          />
        </div>
        <div className="flex-1 min-w-[160px]">
          <label className="block text-xs font-medium text-tfs-navy mb-1">Note <span className="text-gray-400 font-normal">(optional)</span></label>
          <input
            type="text"
            value={newNote}
            onChange={e => setNewNote(e.target.value)}
            placeholder="e.g. Vacation, sick day"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-tfs-teal"
          />
        </div>
        <button
          onClick={handleAdd}
          disabled={!newDate || saving}
          className="flex items-center gap-1.5 btn-primary text-sm py-2 disabled:opacity-50"
        >
          <Plus size={15} />
          {saving ? 'Adding…' : 'Block Date'}
        </button>
      </div>

      {error && <p className="text-red-600 text-sm mt-3">{error}</p>}
    </div>
  )
}
