import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/resend'

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

  const { data, error } = await supabase
    .from('portal_messages')
    .insert({ client_id: user.id, body: text })
    .select('id, body, created_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Send email notification to the assigned coach
  try {
    const { data: clientProfile } = await supabase
      .from('profiles')
      .select('first_name, last_name, email')
      .eq('id', user.id)
      .single()

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
        await sendEmail({
          to: coachProfile.email,
          subject: `New message from ${clientName}`,
          html: `
            <div style="font-family:sans-serif;max-width:520px;margin:0 auto;">
              <h2 style="color:#1a365d;">New message from ${clientName}</h2>
              <p>Hi ${coachProfile.first_name ?? 'there'},</p>
              <p>${clientName} has sent you a new message on the Tenant Financial Solutions portal. Log in to read it and reply.</p>
              <a href="https://app.tenantfinancialsolutions.com/coach/messages"
                 style="display:inline-block;margin-top:12px;padding:10px 20px;background:#2b6cb0;color:#fff;border-radius:6px;text-decoration:none;">View Message</a>
              <p style="margin-top:24px;font-size:12px;color:#718096;">Tenant Financial Solutions &bull; <a href="https://tenantfinancialsolutions.com" style="color:#718096;">tenantfinancialsolutions.com</a></p>
            </div>
          `,
        })
      }
    }
  } catch (emailErr) {
    // Non-fatal — log but don't fail the request
    console.error('[portal/messages] Failed to send coach notification email:', emailErr)
  }

  return NextResponse.json(data, { status: 201 })
}
