export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AttendanceClient from '@/components/coach/AttendanceClient'

export const metadata: Metadata = { title: 'Attendance — Coach' }

export default async function CoachAttendancePage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (!profile || (profile.role !== 'coach' && profile.role !== 'admin')) redirect('/login')

  // Group sessions — past 3 months + upcoming
  const threeMonthsAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
    .toISOString().split('T')[0]

  const { data: groupSessions } = await supabase
    .from('group_sessions')
    .select('id, session_date')
    .gte('session_date', threeMonthsAgo)
    .order('session_date', { ascending: false })
    .limit(20)

  // Coach's distinct clients
  const { data: bookings } = await supabase
    .from('bookings')
    .select('client_id')
    .eq('coach_id', user.id)
    .neq('status', 'cancelled')

  const clientIds = Array.from(new Set((bookings ?? []).map((b: { client_id: string }) => b.client_id)))

  const clients = clientIds.length > 0
    ? (await supabase
        .from('profiles')
        .select('id, first_name, last_name, plan_tier')
        .in('id', clientIds)
        .eq('is_active', true)
        .order('last_name')
      ).data ?? []
    : []

  // Existing attendance records for these sessions + clients
  const sessionIds = (groupSessions ?? []).map(s => s.id)
  const attendance = (sessionIds.length > 0 && clientIds.length > 0)
    ? (await supabase
        .from('group_session_attendance')
        .select('session_id, client_id, attended')
        .in('session_id', sessionIds)
        .in('client_id', clientIds)
      ).data ?? []
    : []

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-serif font-bold text-tfs-navy mb-1">Group Session Attendance</h1>
        <p className="text-sm text-tfs-slate">
          Mark attendance for your clients across group sessions.
        </p>
      </div>
      <AttendanceClient
        groupSessions={(groupSessions ?? []) as { id: string; session_date: string }[]}
        clients={(clients ?? []) as { id: string; first_name: string; last_name: string; plan_tier: string }[]}
        attendance={(attendance ?? []) as { session_id: string; client_id: string; attended: boolean }[]}
      />
    </div>
  )
}
