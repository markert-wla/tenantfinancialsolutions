import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * PATCH /api/admin/clients/trial
 * Body (one of):
 *   { clientIds: string[], expiresAt: string | null }   — explicit list
 *   { pmCode: string,      expiresAt: string | null }   — resolve all tenants under a PM code
 */
export async function PATCH(req: Request) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: actor } = await supabase
      .from('profiles').select('role').eq('id', user.id).single()
    if (actor?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    const { expiresAt, clientIds, pmCode } = body as {
      expiresAt: string | null
      clientIds?: string[]
      pmCode?: string
    }

    // Validate expiresAt (null = clear; otherwise must be a date string)
    if (expiresAt !== null && expiresAt !== undefined) {
      if (typeof expiresAt !== 'string' || isNaN(Date.parse(expiresAt))) {
        return NextResponse.json({ error: 'Invalid expiresAt date' }, { status: 400 })
      }
    }

    let ids: string[] = []

    if (pmCode) {
      // Resolve all free-tier clients who used this promo code
      const { data: tenants } = await supabase
        .from('profiles')
        .select('id')
        .eq('promo_code_used', pmCode)
        .eq('role', 'client')
      ids = (tenants ?? []).map(t => t.id)
    } else if (Array.isArray(clientIds) && clientIds.length > 0) {
      ids = clientIds
    } else {
      return NextResponse.json({ error: 'Provide clientIds or pmCode' }, { status: 400 })
    }

    if (!ids.length) return NextResponse.json({ updated: 0 })

    const { error, count } = await supabase
      .from('profiles')
      .update({ free_trial_expires_at: expiresAt ?? null })
      .in('id', ids)
      .eq('role', 'client')

    if (error) throw error

    return NextResponse.json({ updated: count ?? ids.length })
  } catch (err: unknown) {
    console.error('PATCH /api/admin/clients/trial', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
