import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/resend'
import { brandedEmail, emailButton } from '@/lib/email-template'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://tenantfinancialsolutions.com'

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('portal_messages')
    .select('id, body, created_at')
    .eq('client_id', user.id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: { body: string }
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const text = body.body?.trim()
  if (!text)              return NextResponse.json({ error: 'Message cannot be empty' }, { status: 400 })
  if (text.length > 2000) return NextResponse.json({ error: 'Message too long (2000 characters max)' }, { status: 400 })

  // Look up the client's profile for the notification email
  const { data: clientProfile } = await supabase
    .from('profiles')
    .select('email, first_name, last_name')
    .eq('id', user.id)
    .single()

  const { data, error } = await supabase
    .from('portal_messages')
    .insert({ client_id: user.id, body: text })
    .select('id, body, created_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Send email notification to the client's coach (fire-and-forget — never block the response)
  try {
    // Find the coach assigned to this client via their most recent non-cancelled booking
    const { data: booking } = await supabase
      .from('bookings')
      .select('coach_id')
      .eq('client_id', user.id)
      .neq('status', 'cancelled')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (booking?.coach_id) {
      const { data: coachProfile } = await supabase
        .from('profiles')
        .select('email, first_name')
        .eq('id', booking.coach_id)
        .single()

      if (coachProfile?.email) {
        const clientName = [clientProfile?.first_name, clientProfile?.last_name].filter(Boolean).join(' ') || 'A client'
        const coachFirstName = coachProfile.first_name ?? 'there'
        await sendEmail({
          to: coachProfile.email,
          subject: `New message from ${clientName}`,
          html: brandedEmail(`
            <p style="margin:0 0 16px;">Hi ${coachFirstName},</p>
            <p style="margin:0 0 16px;"><strong>${clientName}</strong> has sent you a new message through their TFS portal.</p>
            <p style="margin:0 0 24px;">Log in to your coach dashboard to read it and reply.</p>
            ${emailButton(`${SITE_URL}/coach/messages`, 'View Message')}
            <p style="margin:24px 0 0;font-size:13px;color:#6B7E8F;">
              Questions? Reach us at
              <a href="mailto:hello@tenantfinancialsolutions.com" style="color:#1D9E75;">hello@tenantfinancialsolutions.com</a>.
            </p>
          `),
        })
      }
    }
  } catch (emailErr) {
    console.error('[portal/messages] Failed to send coach notification email:', emailErr)
  }

  return NextResponse.json(data, { status: 201 })
}
