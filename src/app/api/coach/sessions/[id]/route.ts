import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/resend'
import { brandedEmail, emailButton } from '@/lib/email-template'

function fmtTime(iso: string, tz: string) {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: tz, weekday: 'short', month: 'long', day: 'numeric',
    year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true,
  }).format(new Date(iso))
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles').select('role, first_name, last_name').eq('id', user.id).single()
  if (!profile || (profile.role !== 'coach' && profile.role !== 'admin')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data: booking } = await supabase
    .from('bookings')
    .select(`
      id, coach_id, client_id, status, start_time_utc,
      client:profiles!bookings_client_id_fkey(first_name, last_name, email, timezone)
    `)
    .eq('id', params.id)
    .single()

  if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
  if (booking.coach_id !== user.id && profile.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let body: Record<string, unknown>
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const update: Record<string, unknown> = {}

  if ('notes' in body) {
    update.notes = typeof body.notes === 'string' ? body.notes.trim().slice(0, 2000) || null : null
  }
  if ('attended' in body && typeof body.attended === 'boolean') {
    update.attended = body.attended
  }
  if (body.flagged === true && typeof body.flag_reason === 'string') {
    update.flagged     = true
    update.flag_reason = body.flag_reason.trim().slice(0, 1000) || null
  }
  if (body.status === 'cancelled') {
    if (booking.status === 'cancelled') {
      return NextResponse.json({ error: 'Already cancelled' }, { status: 400 })
    }
    if (new Date(booking.start_time_utc) < new Date()) {
      return NextResponse.json({ error: 'Cannot cancel a past session' }, { status: 400 })
    }
    update.status = 'cancelled'
  }

  if (!Object.keys(update).length) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
  }

  const { error } = await supabase.from('bookings').update(update).eq('id', params.id)
  if (error) {
    console.error('[Sessions PATCH] Update failed:', error.message, error.details)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Email client when coach cancels a future session
  if (update.status === 'cancelled') {
    const client = booking.client as any
    if (client?.email) {
      const sessionTime = fmtTime(booking.start_time_utc, client.timezone ?? 'America/New_York')
      const coachName = `${profile.first_name ?? ''} ${profile.last_name ?? ''}`.trim() || 'Your coach'
      await sendEmail({
        to: client.email,
        subject: 'Your Session Has Been Cancelled',
        html: brandedEmail(`
          <h1 style="margin:0 0 8px;font-family:Georgia,serif;font-size:22px;color:#1A2B4A;">Session Cancelled</h1>
          <p style="margin:0 0 16px;color:#6B7E8F;">
            We wanted to let you know that <strong style="color:#1A2B4A;">${coachName}</strong> has cancelled your upcoming session.
          </p>
          <p style="margin:0 0 24px;color:#6B7E8F;">
            <strong style="color:#1A2B4A;">Cancelled session:</strong> ${sessionTime}
          </p>
          <p style="margin:0 0 24px;color:#6B7E8F;">
            Your session credit has been restored. Please log in to book a new time that works for you.
          </p>
          ${emailButton(`${process.env.NEXT_PUBLIC_SITE_URL}/portal/dashboard`, 'Book a New Session')}
          <p style="margin:24px 0 0;font-size:13px;color:#6B7E8F;">— The TFS Team</p>
        `),
      }).catch(err => console.error('[Cancel] Client email failed:', err))
    }
  }

  return NextResponse.json({ ok: true })
}
