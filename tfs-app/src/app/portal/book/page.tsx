export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import BookingClient from '@/components/portal/BookingClient'

export const metadata: Metadata = { title: 'Book a Session' }

const LIMITS: Record<string, number> = { free: 0, bronze: 1, silver: 2, gold: 4 }

export default async function BookPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('plan_tier, sessions_used_this_month, timezone')
    .eq('id', user.id)
    .single()

  const tier      = profile?.plan_tier ?? 'free'
  const used      = profile?.sessions_used_this_month ?? 0
  const limit     = LIMITS[tier] ?? 0
  const canBook   = tier !== 'free' && used < limit
  const remaining = Math.max(0, limit - used)
  const userTz    = profile?.timezone ?? 'America/New_York'

  // Active coaches
  const { data: coachRows } = await supabase
    .from('coaches')
    .select('id, display_name')
    .eq('is_active', true)
    .order('display_name', { ascending: true })

  const coaches = (coachRows ?? []).map((c: any) => ({
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

      <BookingClient
        coaches={coaches}
        userTimezone={userTz}
        canBook={canBook}
        sessionsRemaining={remaining}
        tier={tier}
      />
    </div>
  )
}
