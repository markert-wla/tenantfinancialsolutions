import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

// GET — load the current saved draft
export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const service = createServiceClient()
  const { data } = await service
    .from('newsletter_drafts')
    .select('*')
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  return NextResponse.json({ ok: true, draft: data ?? null })
}

// POST — save a new draft, or clear the existing one ({ clear: true })
export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json().catch(() => null) as
    | { subject?: string; body?: string; clear?: boolean }
    | null
  if (!body) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })

  const service = createServiceClient()

  if (body.clear) {
    // Delete all drafts (there should only ever be one)
    await service.from('newsletter_drafts').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    return NextResponse.json({ ok: true })
  }

  if (!body.subject?.trim() || !body.body?.trim()) {
    return NextResponse.json({ error: 'Missing subject or body' }, { status: 400 })
  }

  // Replace any existing draft with the new one (single-draft model)
  await service.from('newsletter_drafts').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  const { error } = await service.from('newsletter_drafts').insert({
    subject: body.subject.trim(),
    body: body.body.trim(),
  })

  if (error) {
    console.error('[Newsletter draft] Save error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
