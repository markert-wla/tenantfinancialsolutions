import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/resend'
import { brandedEmail, emailButton } from '@/lib/email-template'

function fmtTime(iso: string, tz: string) {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: tz, weekday: 'short', month: 'long', day: 'numeric',
    year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true,
  }).format(new Date(iso))
}

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // No profile embeds here: bookings.coach_id references coaches(id), so
  // PostgREST rejects a profiles join through that FK (the tables are 1:1 by
  // id, but there is no FK between them). Coach/client details for the email
  // are fetched below via the service client — the client's RLS can't read
  // other users' profiles anyway.
  const { data: booking } = await supabase
    .from('bookings')
    .select('id, client_id, coach_id, status, start_time_utc, used_extra_session')
    .eq('id', params.id)
    .single()

  if (!booking) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (booking.client_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (booking.status !== 'confirmed') {
    return NextResponse.json({ error: 'Only confirmed bookings can be cancelled' }, { status: 400 })
  }
  if (new Date(booking.start_time_utc) <= new Date()) {
    return NextResponse.json({ error: 'Cannot cancel a session that has already started' }, { status: 400 })
  }

  // Company policy (Terms §5): cancelling with at least 24 hours' notice
  // returns the session credit; later cancellations count as used.
  const creditRestored =
    new Date(booking.start_time_utc).getTime() - Date.now() >= 24 * 60 * 60_000

  const { error } = await supabase
    .from('bookings')
    .update({ status: 'cancelled', cancelled_by: 'client' })
    .eq('id', params.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const service = createServiceClient()

  if (creditRestored) {
    // The RPC is service-role only; clients cannot update their own counters.
    const { error: refundErr } = await service.rpc('refund_session_credit', {
      p_client_id:     booking.client_id,
      p_restore_extra: booking.used_extra_session === true,
    })
    if (refundErr) console.error('[Cancel] Credit refund failed:', refundErr.message)
  }

  // Email coach — coaches.id doubles as the coach's profiles id
  const [{ data: coach }, { data: client }] = await Promise.all([
    service.from('profiles')
      .select('first_name, last_name, email, contact_email, timezone')
      .eq('id', booking.coach_id).single(),
    service.from('profiles')
      .select('first_name, last_name')
      .eq('id', booking.client_id).single(),
  ])
  if (coach?.email) {
    const sessionTime = fmtTime(booking.start_time_utc, coach.timezone ?? 'America/New_York')
    const clientName = `${client?.first_name ?? ''} ${client?.last_name ?? ''}`.trim() || 'A client'
    await sendEmail({
      to: coach.contact_email ?? coach.email,
      subject: 'Session Cancelled by Client',
      html: brandedEmail(`
        <h1 style="margin:0 0 8px;font-family:Georgia,serif;font-size:22px;color:#1A2B4A;">Session Cancelled</h1>
        <p style="margin:0 0 16px;color:#6B7E8F;">
          <strong style="color:#1A2B4A;">${clientName}</strong> has cancelled their upcoming session with you.
        </p>
        <p style="margin:0 0 24px;color:#6B7E8F;">
          <strong style="color:#1A2B4A;">Cancelled session:</strong> ${sessionTime}
        </p>
        <p style="margin:0 0 24px;color:#6B7E8F;">
          That time slot is now available for other clients to book.
        </p>
        ${emailButton(`${process.env.NEXT_PUBLIC_SITE_URL}/coach/sessions`, 'View Your Sessions')}
        <p style="margin:24px 0 0;font-size:13px;color:#6B7E8F;">— The TFS Team</p>
      `),
    }).catch(err => console.error('[Cancel] Coach email failed:', err))
  }

  return NextResponse.json({ ok: true, creditRestored })
}
