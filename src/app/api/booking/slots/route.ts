import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

// Slot duration in minutes
const SLOT_MINUTES = 60

interface Slot {
  coachId: string
  coachName: string
  startUtc: string
  endUtc: string
}

interface SlotDay {
  date: string   // YYYY-MM-DD
  label: string  // e.g. "Mon, Apr 14"
  slots: Slot[]
}

/**
 * GET /api/booking/slots?coachId=xxx&weekOffset=0
 *
 * Returns available 60-min booking slots for the requested week.
 * weekOffset=0 → current week (Mon–Sun), 1 → next week, etc.
 * coachId is optional; omit to show slots across all active coaches.
 */
export async function GET(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const coachId    = searchParams.get('coachId') ?? undefined
  const weekOffset = parseInt(searchParams.get('weekOffset') ?? '0', 10)

  // --- Build date window (Mon–Sun of target week, UTC) ---
  const now   = new Date()
  const dayMs = 86_400_000
  // Get Monday of current UTC week
  const dayOfWeek = now.getUTCDay() // 0=Sun … 6=Sat
  const daysToMon = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
  const weekStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + daysToMon + weekOffset * 7)
  )
  const weekEnd = new Date(weekStart.getTime() + 7 * dayMs)

  // --- Fetch coaches ---
  let coachQuery = supabase
    .from('coaches')
    .select('id, display_name')
    .eq('is_active', true)

  if (coachId) coachQuery = coachQuery.eq('id', coachId)

  const { data: coaches, error: coachErr } = await coachQuery
  if (coachErr || !coaches?.length) {
    return NextResponse.json([], { status: 200 })
  }

  const coachIds = coaches.map((c: any) => c.id)
  const coachMap: Record<string, string> = {}
  coaches.forEach((c: any) => { coachMap[c.id] = c.display_name })

  // --- Fetch availability blocks ---
  const { data: availability } = await supabase
    .from('availability')
    .select('coach_id, day_of_week, start_time_utc, end_time_utc')
    .in('coach_id', coachIds)

  if (!availability?.length) return NextResponse.json([], { status: 200 })

  // --- Fetch existing confirmed bookings in the window ---
  const { data: existingBookings } = await supabase
    .from('bookings')
    .select('coach_id, start_time_utc, end_time_utc')
    .in('coach_id', coachIds)
    .neq('status', 'cancelled')
    .gte('start_time_utc', weekStart.toISOString())
    .lt('start_time_utc', weekEnd.toISOString())

  // --- Fetch unavailable dates in the window ---
  const weekStartDate = weekStart.toISOString().split('T')[0]
  const weekEndDate   = new Date(weekEnd.getTime() - 1).toISOString().split('T')[0]
  const { data: unavailableDates } = await supabase
    .from('coach_unavailable_dates')
    .select('coach_id, date')
    .in('coach_id', coachIds)
    .gte('date', weekStartDate)
    .lte('date', weekEndDate)

  // Build a set of "coachId|YYYY-MM-DD" for O(1) lookup
  const unavailableSet = new Set<string>(
    (unavailableDates ?? []).map((r: any) => `${r.coach_id}|${r.date}`)
  )

  // Build a set of booked intervals per coach for quick lookup
  const bookedByCoach: Record<string, Array<{ start: Date; end: Date }>> = {}
  for (const b of existingBookings ?? []) {
    if (!bookedByCoach[b.coach_id]) bookedByCoach[b.coach_id] = []
    bookedByCoach[b.coach_id].push({
      start: new Date(b.start_time_utc),
      end:   new Date(b.end_time_utc),
    })
  }

  // --- Generate slots ---
  const resultDays: SlotDay[] = []

  for (let d = 0; d < 7; d++) {
    const dayDate = new Date(weekStart.getTime() + d * dayMs)
    const utcDow  = dayDate.getUTCDay() // 0=Sun … 6=Sat
    const dateStr = dayDate.toISOString().split('T')[0]
    const label   = dayDate.toLocaleDateString('en-US', {
      timeZone: 'UTC',
      weekday: 'short',
      month:   'short',
      day:     'numeric',
    })

    const daySlots: Slot[] = []

    for (const block of availability) {
      if (block.day_of_week !== utcDow) continue
      if (unavailableSet.has(`${block.coach_id}|${dateStr}`)) continue

      // Parse HH:MM:SS start/end times for this block
      const [sh, sm] = block.start_time_utc.split(':').map(Number)
      const [eh, em] = block.end_time_utc.split(':').map(Number)

      let slotStart = new Date(Date.UTC(
        dayDate.getUTCFullYear(), dayDate.getUTCMonth(), dayDate.getUTCDate(), sh, sm
      ))
      const blockEnd = new Date(Date.UTC(
        dayDate.getUTCFullYear(), dayDate.getUTCMonth(), dayDate.getUTCDate(), eh, em
      ))

      while (slotStart.getTime() + SLOT_MINUTES * 60_000 <= blockEnd.getTime()) {
        const slotEnd = new Date(slotStart.getTime() + SLOT_MINUTES * 60_000)

        // Require 12-hour advance notice
        if (slotStart.getTime() > Date.now() + 12 * 60 * 60_000) {
          // Check for booking conflict on this coach
          const conflicts = bookedByCoach[block.coach_id] ?? []
          const hasConflict = conflicts.some(
            bk => bk.start < slotEnd && bk.end > slotStart
          )

          if (!hasConflict) {
            daySlots.push({
              coachId:   block.coach_id,
              coachName: coachMap[block.coach_id] ?? 'Coach',
              startUtc:  slotStart.toISOString(),
              endUtc:    slotEnd.toISOString(),
            })
          }
        }

        slotStart = slotEnd
      }
    }

    // Sort slots by start time
    daySlots.sort((a, b) => a.startUtc.localeCompare(b.startUtc))

    if (daySlots.length > 0 || weekOffset > 0) {
      // Only include days that have slots (or always show full week for future weeks)
      if (daySlots.length > 0) {
        resultDays.push({ date: dateStr, label, slots: daySlots })
      }
    }
  }

  return NextResponse.json(resultDays)
}
