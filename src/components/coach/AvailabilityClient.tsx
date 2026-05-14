'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash2, Save } from 'lucide-react'

type Slot = {
  id?: string
  day_of_week: number
  start_time_utc: string
  end_time_utc: string
}

type LocalSlot = {
  key: string
  day_of_week: number
  start_local: string
  end_local: string
}

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

/** Get current UTC offset in ms for a timezone (uses today's DST state) */
function getUtcOffsetMs(tz: string): number {
  const now = new Date()
  const utcMs  = new Date(now.toLocaleString('en-US', { timeZone: 'UTC' })).getTime()
  const localMs = new Date(now.toLocaleString('en-US', { timeZone: tz })).getTime()
  return localMs - utcMs
}

function localToUtc(hhmm: string, tz: string): string {
  const [h, m] = hhmm.split(':').map(Number)
  const offsetMs = getUtcOffsetMs(tz)
  const localMinutes = h * 60 + m
  let utcMinutes = localMinutes - offsetMs / 60000
  // Wrap to 0–1439
  utcMinutes = ((utcMinutes % 1440) + 1440) % 1440
  const uh = Math.floor(utcMinutes / 60)
  const um = utcMinutes % 60
  return `${String(uh).padStart(2, '0')}:${String(um).padStart(2, '0')}`
}

function utcToLocal(hhmm: string, tz: string): string {
  const [h, m] = hhmm.split(':').map(Number)
  const offsetMs = getUtcOffsetMs(tz)
  const utcMinutes = h * 60 + m
  let localMinutes = utcMinutes + offsetMs / 60000
  localMinutes = ((localMinutes % 1440) + 1440) % 1440
  const lh = Math.floor(localMinutes / 60)
  const lm = localMinutes % 60
  return `${String(lh).padStart(2, '0')}:${String(lm).padStart(2, '0')}`
}

function makeKey() {
  return Math.random().toString(36).slice(2)
}

function slotsToLocal(slots: Slot[], tz: string): LocalSlot[] {
  return slots.map(s => ({
    key:         s.id ?? makeKey(),
    day_of_week: s.day_of_week,
    start_local: utcToLocal(s.start_time_utc, tz),
    end_local:   utcToLocal(s.end_time_utc, tz),
  }))
}

export default function AvailabilityClient({
  initialSlots,
  timezone,
}: {
  initialSlots: Slot[]
  timezone: string
}) {
  const router = useRouter()
  const [slots, setSlots]   = useState<LocalSlot[]>(slotsToLocal(initialSlots, timezone))
  const [saving, setSaving] = useState(false)
  const [saved, setSaved]   = useState(false)
  const [error, setError]   = useState('')

  function addSlot(day: number) {
    setSlots(prev => [...prev, { key: makeKey(), day_of_week: day, start_local: '09:00', end_local: '17:00' }])
    setSaved(false)
  }

  function removeSlot(key: string) {
    setSlots(prev => prev.filter(s => s.key !== key))
    setSaved(false)
  }

  function updateSlot(key: string, field: 'start_local' | 'end_local', value: string) {
    setSlots(prev => prev.map(s => s.key === key ? { ...s, [field]: value } : s))
    setSaved(false)
  }

  async function handleSave() {
    setError('')
    setSaving(true)

    // Validate: start < end for each slot
    for (const s of slots) {
      if (s.start_local >= s.end_local) {
        setError(`On ${DAYS[s.day_of_week]}: start time must be before end time.`)
        setSaving(false)
        return
      }
    }

    const payload = slots.map(s => ({
      day_of_week:    s.day_of_week,
      start_time_utc: localToUtc(s.start_local, timezone),
      end_time_utc:   localToUtc(s.end_local,   timezone),
    }))

    const res = await fetch('/api/coach/availability', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    setSaving(false)
    if (!res.ok) {
      const data = await res.json()
      setError(data.error ?? 'Failed to save')
      return
    }

    setSaved(true)
    router.refresh()
  }

  return (
    <div className="space-y-4">
      {DAYS.map((dayName, dayIndex) => {
        const daySlots = slots.filter(s => s.day_of_week === dayIndex)
        return (
          <div key={dayIndex} className="card">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-tfs-navy">{dayName}</h3>
              <button
                onClick={() => addSlot(dayIndex)}
                className="flex items-center gap-1 text-xs text-tfs-teal hover:text-tfs-teal/80 font-medium transition-colors"
              >
                <Plus size={14} /> Add block
              </button>
            </div>

            {daySlots.length === 0 ? (
              <p className="text-sm text-tfs-slate italic">No availability — clients cannot book on this day.</p>
            ) : (
              <div className="space-y-2">
                {daySlots.map(slot => (
                  <div key={slot.key} className="flex items-center gap-3">
                    <input
                      type="time"
                      value={slot.start_local}
                      onChange={e => updateSlot(slot.key, 'start_local', e.target.value)}
                      className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-tfs-teal"
                    />
                    <span className="text-tfs-slate text-sm">to</span>
                    <input
                      type="time"
                      value={slot.end_local}
                      onChange={e => updateSlot(slot.key, 'end_local', e.target.value)}
                      className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-tfs-teal"
                    />
                    <button
                      onClick={() => removeSlot(slot.key)}
                      className="p-1.5 rounded-lg text-tfs-slate hover:text-red-600 hover:bg-red-50 transition-colors"
                      aria-label="Remove block"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}

      {error && (
        <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-4 py-3">{error}</p>
      )}

      <div className="flex items-center gap-4 pt-2">
        <button
          onClick={handleSave}
          disabled={saving}
          className="btn-primary flex items-center gap-2"
        >
          <Save size={16} />
          {saving ? 'Saving…' : 'Save Schedule'}
        </button>
        {saved && <span className="text-sm text-green-600 font-medium">Schedule saved!</span>}
      </div>

      <p className="text-xs text-tfs-slate pt-1">
        Times are in your local timezone ({timezone}). The system converts them to UTC automatically.
        If your timezone observes daylight saving time, re-save after the clock change to keep slots accurate.
      </p>
    </div>
  )
}
