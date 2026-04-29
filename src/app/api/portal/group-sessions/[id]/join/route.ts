import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.redirect(new URL('/login', process.env.NEXT_PUBLIC_SITE_URL))

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'client') {
    return NextResponse.redirect(new URL('/login', process.env.NEXT_PUBLIC_SITE_URL))
  }

  const service = createServiceClient()
  const { data: session } = await service
    .from('group_sessions')
    .select('id, session_date, join_link')
    .eq('id', params.id)
    .single()

  if (!session?.join_link) {
    return NextResponse.redirect(new URL('/portal/group-sessions', process.env.NEXT_PUBLIC_SITE_URL))
  }

  // Only mark attended on or after the session date
  const today = new Date().toISOString().split('T')[0]
  if (session.session_date <= today) {
    await service
      .from('group_session_attendance')
      .upsert(
        { session_id: session.id, client_id: user.id, attended: true },
        { onConflict: 'session_id,client_id' }
      )
  }

  return NextResponse.redirect(session.join_link)
}
