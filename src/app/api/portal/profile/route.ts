import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { TIMEZONES } from '@/lib/timezones'

const ALLOWED_MONTHS = Array.from({ length: 12 }, (_, i) => i + 1)

export async function PATCH(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'client') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let body: Record<string, unknown>
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const update: Record<string, unknown> = {}

  if (typeof body.first_name === 'string') update.first_name = body.first_name.trim().slice(0, 100)
  if (typeof body.last_name  === 'string') update.last_name  = body.last_name.trim().slice(0, 100)
  if (typeof body.unit_number === 'string') update.unit_number = body.unit_number.trim().slice(0, 50) || null
  if (body.contact_email === null || body.contact_email === '') {
    update.contact_email = null
  } else if (typeof body.contact_email === 'string') {
    const email = body.contact_email.trim().toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Invalid contact email' }, { status: 400 })
    }
    update.contact_email = email
  }
  if (typeof body.timezone === 'string' && TIMEZONES.includes(body.timezone)) {
    update.timezone = body.timezone
  }
  if (body.birthday_month === null) {
    update.birthday_month = null
  } else if (typeof body.birthday_month === 'number' && ALLOWED_MONTHS.includes(body.birthday_month)) {
    update.birthday_month = body.birthday_month
  }

  if (!update.first_name || !update.last_name) {
    return NextResponse.json({ error: 'First and last name are required' }, { status: 400 })
  }

  const service = createServiceClient()
  const { error } = await service.from('profiles').update(update).eq('id', user.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
