import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

export async function GET() {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: actor } = await supabase
      .from('profiles').select('role').eq('id', user.id).single()
    if (actor?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const service = createServiceClient()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: rawResponses, error } = await service
      .from('intake_responses')
      .select('id, client_id, language, responses, created_at')
      .order('created_at', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows: any[] = rawResponses ?? []

    const clientIds = Array.from(new Set(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      rows.map((r: any) => r.client_id).filter((id: any) => typeof id === 'string')
    ))

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const profileMap: Record<string, any> = {}
    if (clientIds.length > 0) {
      const { data: profiles } = await service
        .from('profiles')
        .select('id, first_name, last_name, email')
        .in('id', clientIds)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      for (const p of (profiles ?? []) as any[]) {
        if (p.id) profileMap[p.id] = p
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = rows.map((r: any) => {
      const p = r.client_id ? profileMap[r.client_id] : null
      return {
        id: r.id,
        client_id: r.client_id,
        language: r.language,
        responses: r.responses,
        created_at: r.created_at,
        client_name: p ? `${String(p.first_name ?? '')} ${String(p.last_name ?? '')}`.trim() : 'Unknown',
        client_email: p ? String(p.email ?? '') : '',
      }
    })

    return NextResponse.json({ responses: result })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
