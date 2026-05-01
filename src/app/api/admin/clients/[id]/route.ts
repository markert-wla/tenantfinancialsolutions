import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: actor } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (actor?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // delete_client_account is SECURITY DEFINER — handles cleanup + auth.users deletion,
  // no service role key required from the application layer.
  const { error } = await supabase.rpc('delete_client_account', { target_user_id: params.id })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
