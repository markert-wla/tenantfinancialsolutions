export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import BookingClient from '@/components/portal/BookingClient'

export const metadata: Metadata = { title: 'Book a Session' }

const LIMITS: Record<string, number> = { free: 1, bronze: 1, silver: 2, gold: 4 }

export default async function BookPage({
  searchParams,
}: {
  searchParams: { coachId?: string; session_purchased?: string; buy?: string }
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('plan_tier, sessions_used_this_month, timezone, coach_id, extra_sessions')
    .eq('id', user.id)
    .single()

  const tier            = profile?.plan_tier ?? 'free'
  const used            = profile?.sessions_used_this_month ?? 0
  const extraSessions   = profile?.extra_sessions ?? 0
  const limit           = LIMITS[tier] ?? 0
  const canBook         = extraSessions > 0 || (limit > 0 && used < limit)
  const remaining       = extraSessions > 0 ? extraSessions : Math.max(0, limit - used)
  const userTz          = profile?.timezone ?? 'America/New_York'
  // Prefer coach from post-purchase redirect, then profile's saved coach
  const defaultCoachId  = searchParams.coachId ?? profile?.coach_id ?? null
  const assignedCoachId = profile?.coach_id ?? null
  const buyMode         = searchParams.buy === '1'

  // Active coaches
  const { data: coachRows } = await supabase
    .from('coaches')
    .select('id, display_name')
    .eq('is_active', true)
    .order('display_name', { ascending: true })

  const coaches = (coachRows ?? []).map((c: { id: string; display_name: string }) => ({
    id:          c.id,
    displayName: c.display_name,
  }))

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-serif font-bold text-tfs-navy mb-1">Book a Session</h1>
        <p className="text-tfs-slate text-sm">
          Sessions are 60 minutes. Times shown in your timezone ({userTz}).
        </p>
      </div>

      {searchParams.session_purchased === '1' && (
        <div className="mb-6 flex items-start gap-3 bg-green-50 border border-green-200 rounded-xl px-5 py-4">
          <span className="text-green-600 text-xl leading-none mt-0.5">✓</span>
          <div>
            <p className="font-semibold text-green-800">Session purchased — pick your time below!</p>
            <p className="text-sm text-green-700 mt-0.5">Your extra session credit is ready. Choose a coach and time slot to confirm your booking.</p>
          </div>
        </div>
      )}

      <BookingClient
        coaches={coaches}
        userTimezone={userTz}
        canBook={buyMode ? true : canBook}
        sessionsRemaining={remaining}
        tier={tier}
        defaultCoachId={defaultCoachId}
        assignedCoachId={assignedCoachId}
        buyMode={buyMode}
      />
    </div>
  )
}
