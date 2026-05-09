import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/resend'
import { brandedEmail, emailButton } from '@/lib/email-template'

function esc(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

export const dynamic = 'force-dynamic'

const PLAN_LIMITS: Record<string, number> = {
  bronze: 1,
  silver: 2,
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
  if (startDate.getTime() < Date.now() + 12 * 60 * 60_000) {
    return NextResponse.json({ error: 'Sessions must be booked at least 12 hours in advance.' }, { status: 400 })
  }
  if (endDate.getTime() - startDate.getTime() !== 60 * 60_000) {
    return NextResponse.json({ error: 'Slot must be exactly 60 minutes' }, { status: 400 })
  }

  // --- Load client profile ---
  const { data: profile, error: profileErr } = await supabase
    .from('profiles')
    .select('first_name, last_name, email, plan_tier, sessions_used_this_month, timezone, free_trial_expires_at, coach_id, extra_sessions, applied_code_type, promo_expires_at')
    .eq('id', user.id)
    .single()

  if (profileErr || !profile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
  }

  const tier          = profile.plan_tier ?? 'free'
  const used          = profile.sessions_used_this_month ?? 0
  const extraSessions = profile.extra_sessions ?? 0

  // --- Promo code type enforcement ---
  const promoActive = !profile.promo_expires_at || new Date(profile.promo_expires_at) >= new Date()
  const activeCodeType = promoActive ? (profile.applied_code_type ?? null) : null

  if (activeCodeType === 'group_comp') {
    return NextResponse.json(
      { error: 'Your plan includes group coaching sessions only. Contact us to upgrade for individual coaching.' },
      { status: 403 }
    )
  }

  // --- Plan / free trial check ---
  // full_comp and extra purchased sessions bypass normal plan limits.
  if (activeCodeType === 'full_comp' || extraSessions > 0) {
    // Allow — full comp or purchased credit covers this booking.
  } else if (tier === 'free') {
    const trialExpiry = profile.free_trial_expires_at
      ? new Date(profile.free_trial_expires_at)
      : null

    if (!trialExpiry || trialExpiry < new Date()) {
      return NextResponse.json(
        { error: 'Your 30-day free trial has expired. Upgrade to a Starter or Advantage Plan to continue booking sessions.', upgrade: true },
        { status: 403 }
      )
    }
    if (used >= 1) {
      return NextResponse.json(
        { error: "You've already used your free Connection Session. Upgrade to book more sessions.", upgrade: true },
        { status: 403 }
      )
    }
  } else {
    const limit = PLAN_LIMITS[tier] ?? 0
    if (limit === 0) {
      return NextResponse.json(
        { error: 'Your current plan does not include individual sessions. Please upgrade.', upgrade: true },
        { status: 403 }
      )
    }
    if (used >= limit) {
      return NextResponse.json(
        { error: `You've used all ${limit} session${limit !== 1 ? 's' : ''} for this month. Upgrade or wait for the monthly reset.`, upgrade: true },
        { status: 403 }
      )
    }
  }

  // --- Validate coach exists ---
  const { data: coach, error: coachErr } = await supabase
    .from('coaches')
    .select('id, display_name, email, timezone, zoom_link')
    .eq('id', coachId)
    .eq('is_active', true)
    .single()

  if (coachErr || !coach) {
    return NextResponse.json({ error: 'Coach not found' }, { status: 404 })
  }

  // --- Validate slot is within coach availability ---
  const utcDow        = startDate.getUTCDay()
  const slotStartTime = `${String(startDate.getUTCHours()).padStart(2,'0')}:${String(startDate.getUTCMinutes()).padStart(2,'0')}:00`
  const slotEndTime   = `${String(endDate.getUTCHours()).padStart(2,'0')}:${String(endDate.getUTCMinutes()).padStart(2,'0')}:00`

  const { data: availBlocks } = await supabase
    .from('availability')
    .select('start_time_utc, end_time_utc')
    .eq('coach_id', coachId)
    .eq('day_of_week', utcDow)

  const inAvailability = (availBlocks ?? []).some(
    (b: { start_time_utc: string; end_time_utc: string }) => b.start_time_utc <= slotStartTime && b.end_time_utc >= slotEndTime
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

  // --- Insert booking ---
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

  // --- Update session counters; save coach_id on first booking ---
  await service
    .from('profiles')
    .update({
      sessions_used_this_month: used + 1,
      ...(extraSessions > 0 ? { extra_sessions: extraSessions - 1 } : {}),
      ...(!profile.coach_id ? { coach_id: coachId } : {}),
    })
    .eq('id', user.id)

  // --- Format display time for emails ---
  const clientTz = profile.timezone ?? 'America/New_York'
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

  const sessionLabel = tier === 'free' ? 'Connection Session' : 'coaching session'
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://tenantfinancialsolutions.com'

  await Promise.all([
    sendEmail({
      to: profile.email,
      subject: `Session Confirmed — ${displayTime}`,
      html: brandedEmail(`
        <h1 style="margin:0 0 8px;font-family:Georgia,serif;font-size:24px;color:#1A2B4A;">Your ${esc(sessionLabel)} is Confirmed!</h1>
        <p style="margin:0 0 24px;color:#6B7E8F;">Hi ${esc(profile.first_name)}, your coaching session has been scheduled.</p>
        <table cellpadding="0" cellspacing="0" style="width:100%;background:#F8FFFE;border:1px solid #D1EFE6;border-radius:8px;margin-bottom:24px;">
          <tr><td style="padding:12px 16px;">
            <span style="font-size:12px;color:#6B7E8F;text-transform:uppercase;letter-spacing:0.5px;">Coach</span><br>
            <strong style="color:#1A2B4A;">${esc(coach.display_name)}</strong>
          </td></tr>
          <tr><td style="padding:12px 16px;border-top:1px solid #D1EFE6;">
            <span style="font-size:12px;color:#6B7E8F;text-transform:uppercase;letter-spacing:0.5px;">Date &amp; Time</span><br>
            <strong style="color:#1A2B4A;">${esc(displayTime)} (${esc(clientTz)})</strong>
          </td></tr>
          ${coach.zoom_link ? `<tr><td style="padding:12px 16px;border-top:1px solid #D1EFE6;">
            <span style="font-size:12px;color:#6B7E8F;text-transform:uppercase;letter-spacing:0.5px;">Session Link</span><br>
            <a href="${esc(coach.zoom_link)}" style="color:#1D9E75;font-weight:600;text-decoration:none;">Join Session →</a>
          </td></tr>` : ''}
        </table>
        ${emailButton(`${siteUrl}/portal/dashboard`, 'View My Sessions')}
        <p style="margin:24px 0 0;font-size:13px;color:#6B7E8F;">See you then! — The TFS Team</p>
      `),
    }),
    sendEmail({
      to: coach.email,
      subject: `New Session Booked — ${displayTime}`,
      html: brandedEmail(`
        <h1 style="margin:0 0 8px;font-family:Georgia,serif;font-size:24px;color:#1A2B4A;">New Session Booked</h1>
        <p style="margin:0 0 24px;color:#6B7E8F;">Hi ${esc(coach.display_name)}, a new session has been booked with you.</p>
        <table cellpadding="0" cellspacing="0" style="width:100%;background:#F8FFFE;border:1px solid #D1EFE6;border-radius:8px;margin-bottom:24px;">
          <tr><td style="padding:12px 16px;border-bottom:1px solid #D1EFE6;">
            <span style="font-size:12px;color:#6B7E8F;text-transform:uppercase;letter-spacing:0.5px;">Client</span><br>
            <strong style="color:#1A2B4A;">${esc(profile.first_name)} ${esc(profile.last_name)}</strong>
          </td></tr>
          <tr><td style="padding:12px 16px;">
            <span style="font-size:12px;color:#6B7E8F;text-transform:uppercase;letter-spacing:0.5px;">Date &amp; Time</span><br>
            <strong style="color:#1A2B4A;">${esc(displayTime)} (${esc(clientTz)})</strong>
          </td></tr>
        </table>
        ${emailButton(`${siteUrl}/coach/dashboard`, 'View Coach Dashboard')}
        <p style="margin:24px 0 0;font-size:13px;color:#6B7E8F;">— The TFS Team</p>
      `),
    }),
  ])

  return NextResponse.json({ ok: true, bookingId: booking.id })
}
