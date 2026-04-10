'use client'

import { useState, useEffect, useCallback } from 'react'
import { ChevronLeft, ChevronRight, Clock, User, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'

// ── Types ────────────────────────────────────────────────────────────────────

interface Coach {
  id: string
  displayName: string
}

interface Slot {
  coachId:   string
  coachName: string
  startUtc:  string
  endUtc:    string
}

interface SlotDay {
  date:  string
  label: string
  slots: Slot[]
}

interface Props {
  coaches:           Coach[]
  userTimezone:      string
  canBook:           boolean
  sessionsRemaining: number
  tier:              string
}

// ── Component ────────────────────────────────────────────────────────────────

export default function BookingClient({ coaches, userTimezone, canBook, sessionsRemaining, tier }: Props) {
  const [selectedCoachId, setSelectedCoachId] = useState<string>('any')
  const [weekOffset,      setWeekOffset]      = useState(0)
  const [slotDays,        setSlotDays]        = useState<SlotDay[]>([])
  const [loadingSlots,    setLoadingSlots]    = useState(false)
  const [selectedSlot,    setSelectedSlot]    = useState<Slot | null>(null)
  const [confirming,      setConfirming]      = useState(false)
  const [booked,          setBooked]          = useState(false)
  const [bookedSlot,      setBookedSlot]      = useState<Slot | null>(null)
  const [error,           setError]           = useState<string | null>(null)

  // Format a UTC ISO string in the user's local timezone
  function fmtTime(iso: string) {
    return new Intl.DateTimeFormat('en-US', {
      timeZone: userTimezone,
      hour:     'numeric',
      minute:   '2-digit',
      hour12:   true,
    }).format(new Date(iso))
  }

  // Load available slots whenever coach selection or week changes
  const loadSlots = useCallback(async () => {
    setLoadingSlots(true)
    setSelectedSlot(null)
    setError(null)
    try {
      const params = new URLSearchParams({ weekOffset: String(weekOffset) })
      if (selectedCoachId !== 'any') params.set('coachId', selectedCoachId)
      const res = await fetch(`/api/booking/slots?${params}`)
      if (!res.ok) throw new Error('Failed to load slots')
      const data: SlotDay[] = await res.json()
      setSlotDays(data)
    } catch {
      setError('Could not load available times. Please try again.')
      setSlotDays([])
    } finally {
      setLoadingSlots(false)
    }
  }, [selectedCoachId, weekOffset])

  useEffect(() => {
    if (canBook) loadSlots()
  }, [loadSlots, canBook])

  async function confirmBooking() {
    if (!selectedSlot) return
    setConfirming(true)
    setError(null)
    try {
      const res = await fetch('/api/booking', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          coachId:  selectedSlot.coachId,
          startUtc: selectedSlot.startUtc,
          endUtc:   selectedSlot.endUtc,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Booking failed. Please try again.')
      } else {
        setBookedSlot(selectedSlot)
        setBooked(true)
      }
    } catch {
      setError('Network error. Please check your connection and try again.')
    } finally {
      setConfirming(false)
    }
  }

  // ── Success state ─────────────────────────────────────────────────────────
  if (booked && bookedSlot) {
    return (
      <div className="flex flex-col items-center text-center py-16 px-4">
        <CheckCircle className="text-tfs-teal mb-4" size={56} />
        <h2 className="text-2xl font-serif font-bold text-tfs-navy mb-2">Session Booked!</h2>
        <p className="text-tfs-slate mb-1">
          <span className="font-semibold">{bookedSlot.coachName}</span>
        </p>
        <p className="text-tfs-slate mb-6">
          {new Intl.DateTimeFormat('en-US', {
            timeZone: userTimezone,
            weekday:  'long',
            month:    'long',
            day:      'numeric',
            hour:     'numeric',
            minute:   '2-digit',
            hour12:   true,
          }).format(new Date(bookedSlot.startUtc))}
          {' '}({userTimezone})
        </p>
        <p className="text-sm text-tfs-slate mb-8">A confirmation email has been sent to you.</p>
        <div className="flex gap-3">
          <a href="/portal/dashboard" className="btn-primary text-sm">Back to Dashboard</a>
          <button
            onClick={() => { setBooked(false); setBookedSlot(null); setSelectedSlot(null); loadSlots() }}
            className="btn-outline text-sm"
          >
            Book Another
          </button>
        </div>
      </div>
    )
  }

  // ── Plan gate ─────────────────────────────────────────────────────────────
  if (!canBook) {
    return (
      <div className="flex flex-col items-center text-center py-16 px-4">
        <AlertCircle className="text-tfs-gold mb-4" size={48} />
        <h2 className="text-2xl font-serif font-bold text-tfs-navy mb-2">
          {tier === 'free' ? 'Upgrade to Book Sessions' : 'Monthly Limit Reached'}
        </h2>
        <p className="text-tfs-slate mb-6 max-w-sm">
          {tier === 'free'
            ? 'Individual coaching sessions are available on Bronze, Silver, and Gold plans.'
            : `You've used all your sessions for this month. Upgrade for more, or check back next month.`}
        </p>
        <a href="/services" className="btn-primary text-sm">View Plans</a>
      </div>
    )
  }

  // ── Week label (Mon–Sun) ──────────────────────────────────────────────────
  const now        = new Date()
  const dow        = now.getUTCDay()
  const daysToMon  = dow === 0 ? -6 : 1 - dow
  const weekMonday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + daysToMon + weekOffset * 7))
  const weekSunday = new Date(weekMonday.getTime() + 6 * 86_400_000)
  const weekLabel  = `${weekMonday.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })} – ${weekSunday.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })}`

  return (
    <div className="max-w-3xl mx-auto">
      {/* Sessions remaining banner */}
      <div className="mb-6 px-4 py-3 rounded-lg bg-tfs-teal/10 border border-tfs-teal/20 text-tfs-teal text-sm font-medium">
        You have <strong>{sessionsRemaining}</strong> session{sessionsRemaining !== 1 ? 's' : ''} remaining this month.
      </div>

      {/* Coach selector */}
      <div className="card mb-6">
        <h2 className="font-semibold text-tfs-navy mb-3 flex items-center gap-2">
          <User size={16} />
          Who would you like to meet with?
        </h2>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedCoachId('any')}
            className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors ${
              selectedCoachId === 'any'
                ? 'bg-tfs-teal text-white border-tfs-teal'
                : 'bg-white text-tfs-navy border-gray-200 hover:border-tfs-teal'
            }`}
          >
            Any Available Coach
          </button>
          {coaches.map(c => (
            <button
              key={c.id}
              onClick={() => setSelectedCoachId(c.id)}
              className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors ${
                selectedCoachId === c.id
                  ? 'bg-tfs-teal text-white border-tfs-teal'
                  : 'bg-white text-tfs-navy border-gray-200 hover:border-tfs-teal'
              }`}
            >
              {c.displayName}
            </button>
          ))}
        </div>
      </div>

      {/* Week navigator */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => setWeekOffset(w => Math.max(0, w - 1))}
          disabled={weekOffset === 0}
          className="p-2 rounded-lg hover:bg-white border border-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          aria-label="Previous week"
        >
          <ChevronLeft size={18} />
        </button>
        <span className="text-sm font-semibold text-tfs-navy">{weekLabel}</span>
        <button
          onClick={() => setWeekOffset(w => Math.min(8, w + 1))}
          className="p-2 rounded-lg hover:bg-white border border-gray-200 transition-colors"
          aria-label="Next week"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      {/* Slot grid */}
      {loadingSlots ? (
        <div className="flex justify-center py-16">
          <Loader2 className="animate-spin text-tfs-teal" size={32} />
        </div>
      ) : slotDays.length === 0 ? (
        <div className="card text-center py-12">
          <Clock className="mx-auto text-tfs-slate/40 mb-3" size={36} />
          <p className="text-tfs-slate font-medium">No available slots this week.</p>
          <p className="text-tfs-slate text-sm mt-1">Try the next week or choose a different coach.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {slotDays.map(day => (
            <div key={day.date} className="card">
              <p className="font-semibold text-tfs-navy text-sm mb-3">{day.label}</p>
              <div className="flex flex-wrap gap-2">
                {day.slots.map(slot => {
                  const key      = `${slot.coachId}-${slot.startUtc}`
                  const isActive = selectedSlot?.startUtc === slot.startUtc && selectedSlot?.coachId === slot.coachId
                  return (
                    <button
                      key={key}
                      onClick={() => setSelectedSlot(isActive ? null : slot)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${
                        isActive
                          ? 'bg-tfs-teal text-white border-tfs-teal shadow-md scale-105'
                          : 'bg-white text-tfs-navy border-gray-200 hover:border-tfs-teal hover:bg-tfs-teal/5'
                      }`}
                    >
                      <span>{fmtTime(slot.startUtc)}</span>
                      {selectedCoachId === 'any' && (
                        <span className="ml-1 text-xs opacity-70">· {slot.coachName}</span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Selected slot + confirm */}
      {selectedSlot && (
        <div className="mt-6 card border-2 border-tfs-teal">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm text-tfs-slate mb-0.5">Selected session</p>
              <p className="font-semibold text-tfs-navy">
                {new Intl.DateTimeFormat('en-US', {
                  timeZone: userTimezone,
                  weekday:  'short',
                  month:    'short',
                  day:      'numeric',
                  hour:     'numeric',
                  minute:   '2-digit',
                  hour12:   true,
                }).format(new Date(selectedSlot.startUtc))}
                <span className="text-tfs-slate font-normal text-sm ml-1">({userTimezone})</span>
              </p>
              <p className="text-sm text-tfs-slate mt-0.5">with {selectedSlot.coachName}</p>
            </div>
            <button
              onClick={confirmBooking}
              disabled={confirming}
              className="btn-primary text-sm shrink-0 flex items-center gap-2"
            >
              {confirming && <Loader2 size={14} className="animate-spin" />}
              {confirming ? 'Confirming…' : 'Confirm Booking'}
            </button>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mt-4 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-2">
          <AlertCircle size={16} className="shrink-0 mt-0.5" />
          {error}
        </div>
      )}
    </div>
  )
}
