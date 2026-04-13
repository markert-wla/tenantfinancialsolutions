import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/resend'

function esc(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

export const dynamic = 'force-dynamic'

const PLAN_LIMITS: Record<string, number> = {
  free:   0,
  bronze: 1,
  silver: 2,
  gold:   4,
}

export async function POST(req: NextRequest) {
  // --- Auth ---
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: { coachId: string; startUtc: string; endUtc: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { coachId, startUtc, endUtc } = body
  if (!coachId || !startUtc || !endUtc) {
    return NextResponse.json({ error: 'coachId, startUtc, and endUtc are required' }, { status: 400 })
  }

  const startDate = new Date(startUtc)
  const endDate   = new Date(endUtc)

  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    return NextResponse.json({ error: 'Invalid date format' }, { status: 400 })
  }
  if (startDate <= new Date()) {
    return NextResponse.json({ error: 'Cannot book a slot in the past' }, { status: 400 })
  }
  if (endDate.getTime() - startDate.getTime() !== 60 * 60_000) {
    return NextResponse.json({ error: 'Slot must be exactly 60 minutes' }, { status: 400 })
  }

  // --- Load client profile ---
  const { data: profile, error: profileErr } = await supabase
    .from('profiles')
    .select('first_name, last_name, email, plan_tier, sessions_used_this_month, timezone')
    .eq('id', user.id)
    .single()

  if (profileErr || !profile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
  }

  // --- Plan limit check ---
  const tier  = profile.plan_tier ?? 'free'
  const limit = PLAN_LIMITS[tier] ?? 0
  const used  = profile.sessions_used_this_month ?? 0

  if (limit === 0) {
    return NextResponse.json(
      { error: 'Your current plan does not include individual sessions. Please upgrade.' },
      { status: 403 }
    )
  }
  if (used >= limit) {
    return NextResponse.json(
      { error: `You have used all ${limit} session(s) for this month. Upgrade or wait for the monthly reset.` },
      { status: 403 }
    )
  }

  // --- Validate coach exists ---
  const { data: coach, error: coachErr } = await supabase
    .from('coaches')
    .select('id, display_name, email, timezone')
    .eq('id', coachId)
    .eq('is_active', true)
    .single()

  if (coachErr || !coach) {
    return NextResponse.json({ error: 'Coach not found' }, { status: 404 })
  }

  // --- Validate slot is within coach availability ---
  const utcDow       = startDate.getUTCDay()
  const slotStartTime = `${String(startDate.getUTCHours()).padStart(2,'0')}:${String(startDate.getUTCMinutes()).padStart(2,'0')}:00`
  const slotEndTime   = `${String(endDate.getUTCHours()).padStart(2,'0')}:${String(endDate.getUTCMinutes()).padStart(2,'0')}:00`

  const { data: availBlocks } = await supabase
    .from('availability')
    .select('start_time_utc, end_time_utc')
    .eq('coach_id', coachId)
    .eq('day_of_week', utcDow)

  const inAvailability = (availBlocks ?? []).some(
    (b: any) => b.start_time_utc <= slotStartTime && b.end_time_utc >= slotEndTime
  )
  if (!inAvailability) {
    return NextResponse.json({ error: 'Selected slot is outside coach availability' }, { status: 400 })
  }

  // --- Coach conflict check ---
  const { data: coachConflict } = await supabase
    .from('bookings')
    .select('id')
    .eq('coach_id', coachId)
    .neq('status', 'cancelled')
    .lt('start_time_utc', endUtc)
    .gt('end_time_utc', startUtc)
    .limit(1)

  if (coachConflict?.length) {
    return NextResponse.json({ error: 'That time slot is no longer available. Please choose another.' }, { status: 409 })
  }

  // --- Client conflict check ---
  const { data: clientConflict } = await supabase
    .from('bookings')
    .select('id')
    .eq('client_id', user.id)
    .neq('status', 'cancelled')
    .lt('start_time_utc', endUtc)
    .gt('end_time_utc', startUtc)
    .limit(1)

  if (clientConflict?.length) {
    return NextResponse.json({ error: 'You already have a session booked at that time.' }, { status: 409 })
  }

  // --- Insert booking (use service client to bypass RLS insert check for this server context) ---
  const service = createServiceClient()
  const { data: booking, error: bookingErr } = await service
    .from('bookings')
    .insert({
      client_id:      user.id,
      coach_id:       coachId,
      start_time_utc: startUtc,
      end_time_utc:   endUtc,
      status:         'confirmed',
    })
    .select('id')
    .single()

  if (bookingErr || !booking) {
    console.error('[booking] insert error:', bookingErr?.message)
    return NextResponse.json({ error: 'Failed to create booking. Please try again.' }, { status: 500 })
  }

  // --- Increment sessions_used_this_month ---
  await service
    .from('profiles')
    .update({ sessions_used_this_month: used + 1 })
    .eq('id', user.id)

  // --- Format display time for emails ---
  const clientTz  = profile.timezone ?? 'America/New_York'
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: clientTz,
    weekday:  'long',
    month:    'long',
    day:      'numeric',
    year:     'numeric',
    hour:     'numeric',
    minute:   '2-digit',
    hour12:   true,
  })
  const displayTime = fmt.format(startDate)

  // --- Confirmation emails (no-op if Resend key not set) ---
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://tenantfinancialsolutions.com'

  await Promise.all([
    sendEmail({
      to: profile.email,
      subject: `Session Confirmed — ${displayTime}`,
      html: `
        <h2>Your Session is Confirmed!</h2>
        <p>Hi ${esc(profile.first_name)},</p>
        <p>Your coaching session has been scheduled:</p>
        <ul>
          <li><strong>Coach:</strong> ${esc(coach.display_name)}</li>
          <li><strong>Date &amp; Time:</strong> ${esc(displayTime)} (${esc(clientTz)})</li>
        </ul>
        <p>You can view your upcoming sessions in your <a href="${siteUrl}/portal/dashboard">portal</a>.</p>
        <p>See you then!<br/>— The TFS Team</p>
      `,
    }),
    sendEmail({
      to: coach.email,
      subject: `New Session Booked — ${displayTime}`,
      html: `
        <h2>New Session Booked</h2>
        <p>Hi ${esc(coach.display_name)},</p>
        <p>A new session has been booked with you:</p>
        <ul>
          <li><strong>Client:</strong> ${esc(profile.first_name)} ${esc(profile.last_name)}</li>
          <li><strong>Date &amp; Time:</strong> ${esc(displayTime)} (${esc(clientTz)})</li>
        </ul>
        <p>View details in your <a href="${siteUrl}/coach/dashboard">coach dashboard</a>.</p>
        <p>— The TFS Team</p>
      `,
    }),
  ])

  return NextResponse.json({ ok: true, bookingId: booking.id })
}
