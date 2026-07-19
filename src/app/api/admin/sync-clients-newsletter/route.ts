import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function POST() {
  // Admin auth check
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const service = createServiceClient()

  // Fetch all active clients
  const { data: clients, error } = await service
    .from('profiles')
    .select('email, first_name, last_name')
    .eq('role', 'client')
    .eq('is_active', true)

  if (error) {
    console.error('[sync-clients-newsletter] DB error:', error)
    return NextResponse.json({ error: 'Could not load clients' }, { status: 500 })
  }

  if (!clients || clients.length === 0) {
    return NextResponse.json({ ok: true, synced: 0 })
  }

  // Upsert into newsletter_subscribers.
  // ignoreDuplicates: true = only INSERT new rows; rows that already exist (including
  // previously-unsubscribed ones) are left completely untouched.
  const rows = clients.map(c => ({
    email: c.email.toLowerCase().trim(),
    name: `${c.first_name} ${c.last_name}`.trim() || null,
    is_active: true,
    unsubscribed_at: null,
  }))

  const { error: upsertError } = await service
    .from('newsletter_subscribers')
    .upsert(rows, { onConflict: 'email', ignoreDuplicates: true })

  if (upsertError) {
    console.error('[sync-clients-newsletter] Upsert error:', upsertError)
    return NextResponse.json({ error: 'Could not sync subscribers' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, synced: clients.length })
}
