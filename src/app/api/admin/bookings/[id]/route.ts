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

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  let body: { status?: string; notes?: string | null; client_notes?: string | null; flagged?: boolean }
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const service = createServiceClient()

  if (body.status === 'cancelled') {
    const { data: booking } = await service
      .from('bookings')
      .select(`
        id, client_id, coach_id, start_time_utc, status,
        client:profiles!bookings_client_id_fkey(first_name, last_name, email, timezone),
        coach:profiles!bookings_coach_id_fkey(first_name, last_name, email, timezone)
      `)
      .eq('id', params.id)
      .single()

    if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    if (booking.status === 'cancelled') return NextResponse.json({ ok: true })

    const { error } = await service.from('bookings').update({ status: 'cancelled', cancelled_by: 'admin' }).eq('id', params.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const client = booking.client as any
    const coach  = booking.coach as any
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? ''

    const emailPromises = []

    if (client?.email) {
      const sessionTime = fmtTime(booking.start_time_utc, client.timezone ?? 'America/New_York')
      emailPromises.push(sendEmail({
        to: client.email,
        subject: 'Your Session Has Been Cancelled',
        html: brandedEmail(`
          <h1 style="margin:0 0 8px;font-family:Georgia,serif;font-size:22px;color:#1A2B4A;">Session Cancelled</h1>
          <p style="margin:0 0 16px;color:#6B7E8F;">
            Your upcoming session has been cancelled by Tenant Financial Solutions.
          </p>
          <p style="margin:0 0 24px;color:#6B7E8F;">
            <strong style="color:#1A2B4A;">Cancelled session:</strong> ${sessionTime}
          </p>
          <p style="margin:0 0 24px;color:#6B7E8F;">
            Please log in or contact us if you have any questions about rescheduling.
          </p>
          ${emailButton(`${siteUrl}/portal/dashboard`, 'Book a New Session')}
          <p style="margin:24px 0 0;font-size:13px;color:#6B7E8F;">— The TFS Team</p>
        `),
      }).catch(err => console.error('[Admin cancel] Client email failed:', err)))
    }

    if (coach?.email) {
      const sessionTime = fmtTime(booking.start_time_utc, coach.timezone ?? 'America/New_York')
      const clientName = `${client?.first_name ?? ''} ${client?.last_name ?? ''}`.trim() || 'A client'
      emailPromises.push(sendEmail({
        to: coach.email,
        subject: 'Session Cancelled by Admin',
        html: brandedEmail(`
          <h1 style="margin:0 0 8px;font-family:Georgia,serif;font-size:22px;color:#1A2B4A;">Session Cancelled</h1>
          <p style="margin:0 0 16px;color:#6B7E8F;">
            A session with <strong style="color:#1A2B4A;">${clientName}</strong> has been cancelled by an administrator.
          </p>
          <p style="margin:0 0 24px;color:#6B7E8F;">
            <strong style="color:#1A2B4A;">Cancelled session:</strong> ${sessionTime}
          </p>
          ${emailButton(`${siteUrl}/coach/sessions`, 'View Your Sessions')}
          <p style="margin:24px 0 0;font-size:13px;color:#6B7E8F;">— The TFS Team</p>
        `),
      }).catch(err => console.error('[Admin cancel] Coach email failed:', err)))
    }

    await Promise.all(emailPromises)
    return NextResponse.json({ ok: true })
  }

  if ('notes' in body || 'client_notes' in body) {
    const update: Record<string, string | null> = {}
    if ('notes' in body)        update.notes        = body.notes        ?? null
    if ('client_notes' in body) update.client_notes = body.client_notes ?? null
    const { error } = await service.from('bookings').update(update).eq('id', params.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  if (body.flagged === false) {
    const { error } = await service
      .from('bookings')
      .update({ flagged: false, flag_reason: null })
      .eq('id', params.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
}
