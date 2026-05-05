'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CalendarX, Plus, Trash2 } from 'lucide-react'

const TZ = 'America/New_York'

// Convert "HH:MM" Eastern time on a given date to "HH:MM" UTC
function etToUtcTime(dateStr: string, etTime: string): string {
  const [y, mo, d] = dateStr.split('-').map(Number)
  const [h, m]     = etTime.split(':').map(Number)
  // Use noon UTC as reference to get the ET offset for this date (avoids DST edge cases)
  const noonUtc    = new Date(Date.UTC(y, mo - 1, d, 12, 0))
  const nyNoonH    = Number(new Intl.DateTimeFormat('en-US', { timeZone: TZ, hour: '2-digit', hour12: false }).format(noonUtc))
  const offsetH    = 12 - nyNoonH          // e.g. 5 in EST, 4 in EDT
  const utc        = new Date(Date.UTC(y, mo - 1, d, h + offsetH, m))
  return `${String(utc.getUTCHours()).padStart(2, '0')}:${String(utc.getUTCMinutes()).padStart(2, '0')}`
}

// Convert "HH:MM:SS" UTC (from DB) on a given date to a display string in ET
function utcToEtDisplay(dateStr: string, utcTime: string): string {
  const [y, mo, d] = dateStr.split('-').map(Number)
  const [h, m]     = utcTime.split(':').map(Number)
  const utcDate    = new Date(Date.UTC(y, mo - 1, d, h, m))
  return new Intl.DateTimeFormat('en-US', {
    timeZone: TZ, hour: 'numeric', minute: '2-digit', hour12: true,
  }).format(utcDate)
}

type UnavailableDate = {
  id:         string
  date:       string
  note:       string | null
  all_day:    boolean
  start_time: string | null
  end_time:   string | null
}

export default function UnavailableDatesClient({
  initialDates,
}: {
  initialDates: UnavailableDate[]
}) {
  const router = useRouter()
  const [dates,     setDates]     = useState<UnavailableDate[]>(initialDates)
  const [newDate,   setNewDate]   = useState('')
  const [newNote,   setNewNote]   = useState('')
  const [allDay,    setAllDay]    = useState(true)
  const [startTime, setStartTime] = useState('')
  const [endTime,   setEndTime]   = useState('')
  const [saving,    setSaving]    = useState(false)
  const [error,     setError]     = useState('')

  async function handleAdd() {
    if (!newDate) return
    if (!allDay && (!startTime || !endTime)) {
      setError('Start and end times are required for time blocks')
      return
    }
    setError('')
    setSaving(true)
    // Convert ET picker values to UTC before sending
    const startUtc = allDay ? undefined : etToUtcTime(newDate, startTime)
    const endUtc   = allDay ? undefined : etToUtcTime(newDate, endTime)
    const res = await fetch('/api/coach/unavailable-dates', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        date:       newDate,
        note:       newNote.trim() || undefined,
        all_day:    allDay,
        start_time: startUtc,
        end_time:   endUtc,
      }),
    })
    setSaving(false)
    if (!res.ok) {
      const data = await res.json()
      setError(data.error ?? 'Failed to add date')
      return
    }
    setNewDate('')
    setNewNote('')
    setStartTime('')
    setEndTime('')
    router.refresh()
    const fakeId = crypto.randomUUID()
    setDates(prev => [...prev, {
      id:         fakeId,
      date:       newDate,
      note:       newNote.trim() || null,
      all_day:    allDay,
      start_time: allDay ? null : (startUtc ?? null),
      end_time:   allDay ? null : (endUtc   ?? null),
    }].sort((a, b) => a.date.localeCompare(b.date)))
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
    const [y, m, d] = iso.split('-').map(Number)
    return new Date(y, m - 1, d).toLocaleDateString('en-US', {
      weekday: 'short', month: 'long', day: 'numeric', year: 'numeric',
    })
  }

  const today = new Date().toISOString().split('T')[0]

  return (
    <div className="card">
      <div className="flex items-center gap-2 mb-4">
        <CalendarX className="text-tfs-navy" size={18} />
        <h2 className="font-semibold text-tfs-navy text-lg">Unavailable Days</h2>
      </div>
      <p className="text-sm text-tfs-slate mb-5">
        Block out specific dates or time windows — these override your regular weekly schedule. Time blocks only suppress slots on days you have availability set up.
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
                {d.all_day
                  ? <span className="text-xs text-tfs-slate ml-2">All day</span>
                  : d.start_time && d.end_time && (
                      <span className="text-xs text-tfs-slate ml-2">
                        {utcToEtDisplay(d.date, d.start_time)} – {utcToEtDisplay(d.date, d.end_time)} ET
                      </span>
                    )
                }
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
      <div className="border-t border-gray-100 pt-4 space-y-3">
        <div className="flex flex-wrap items-end gap-3">
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
            <label className="block text-xs font-medium text-tfs-navy mb-1">
              Note <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <input
              type="text"
              value={newNote}
              onChange={e => setNewNote(e.target.value)}
              placeholder="e.g. Vacation, sick day"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-tfs-teal"
            />
          </div>
        </div>

        {/* All-day toggle */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setAllDay(v => !v)}
            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${allDay ? 'bg-tfs-teal' : 'bg-gray-200'}`}
          >
            <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${allDay ? 'translate-x-4' : 'translate-x-0.5'}`} />
          </button>
          <span className="text-sm text-tfs-navy">All day</span>
        </div>

        {/* Time pickers — Eastern Time, converted to UTC on save */}
        {!allDay && (
          <div className="flex flex-wrap gap-3">
            <div>
              <label className="block text-xs font-medium text-tfs-navy mb-1">
                Start Time <span className="text-tfs-slate font-normal">(Eastern Time)</span>
              </label>
              <input
                type="time"
                value={startTime}
                onChange={e => setStartTime(e.target.value)}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-tfs-teal"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-tfs-navy mb-1">
                End Time <span className="text-tfs-slate font-normal">(Eastern Time)</span>
              </label>
              <input
                type="time"
                value={endTime}
                onChange={e => setEndTime(e.target.value)}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-tfs-teal"
              />
            </div>
          </div>
        )}

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
