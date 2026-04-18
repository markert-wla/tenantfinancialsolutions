import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: actor } = await supabase
      .from('profiles').select('role').eq('id', user.id).single()
    if (actor?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { email, first_name, last_name, company_name } = await req.json()
    if (!email || !first_name || !last_name) {
      return NextResponse.json({ error: 'Email, first name, and last name are required' }, { status: 400 })
    }

    const service = createServiceClient()

    const { data: invite, error: inviteErr } = await service.auth.admin.inviteUserByEmail(email, {
      data: { role: 'property_manager' },
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
    })

    if (inviteErr || !invite.user) {
      if (inviteErr?.message?.includes('already registered')) {
        return NextResponse.json({ error: 'A user with this email already exists.' }, { status: 409 })
      }
      return NextResponse.json({ error: inviteErr?.message ?? 'Failed to create account' }, { status: 500 })
    }

    const pmId = invite.user.id

    await service.from('profiles').update({
      role:       'property_manager',
      first_name: first_name.trim(),
      last_name:  last_name.trim(),
      email,
    }).eq('id', pmId)

    return NextResponse.json({ ok: true, id: pmId })
  } catch (err: any) {
    console.error('POST /api/admin/managers', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function GET() {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: actor } = await supabase
      .from('profiles').select('role').eq('id', user.id).single()
    if (actor?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { data: managers } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, email, is_active, created_at')
      .eq('role', 'property_manager')
      .order('last_name')

    return NextResponse.json(managers ?? [])
  } catch (err: any) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
