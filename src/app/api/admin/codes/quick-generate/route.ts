import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

function randomSlug() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // no ambiguous chars (0,O,1,I)
  return 'TFS-' + Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

export async function POST(req: Request) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase
      .from('profiles').select('role, first_name, last_name, partner_id').eq('id', user.id).single()
    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json().catch(() => ({}))
    const partnerName: string = body.partnerName?.trim()
      || [profile?.first_name, profile?.last_name].filter(Boolean).join(' ')
      || 'Property Manager'

    // Generate a unique code (retry up to 5 times on collision)
    let code = ''
    for (let i = 0; i < 5; i++) {
      const candidate = randomSlug()
      const { data: existing } = await supabase
        .from('promo_codes').select('code').eq('code', candidate).maybeSingle()
      if (!existing) { code = candidate; break }
    }
    if (!code) return NextResponse.json({ error: 'Could not generate unique code' }, { status: 500 })

    const expiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString()

    const { error } = await supabase.from('promo_codes').insert({
      code,
      partner_name:   partnerName,
      partner_type:   'property_management',
      assigned_tier:  'free',
      max_uses:       9999,
      is_active:      true,
      expires_at:     expiresAt,
      created_by:     user.id,
      partner_id:     profile?.partner_id ?? null,
      uses_count:     0,
    })
    if (error) throw error

    return NextResponse.json({ code, expires_at: expiresAt })
  } catch (err: unknown) {
    console.error('POST /api/admin/codes/quick-generate', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
