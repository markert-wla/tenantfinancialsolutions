export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AvailabilityClient from '@/components/coach/AvailabilityClient'

export const metadata: Metadata = { title: 'Availability — Coach' }

export default async function CoachAvailabilityPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('timezone')
    .eq('id', user.id)
    .single()

  const { data: slots } = await supabase
    .from('availability')
    .select('id, day_of_week, start_time_utc, end_time_utc')
    .eq('coach_id', user.id)
    .order('day_of_week')
    .order('start_time_utc')

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-serif font-bold text-tfs-navy mb-1">Availability</h1>
        <p className="text-sm text-tfs-slate">
          Set your recurring weekly schedule. Enter times in your local timezone ({profile?.timezone ?? 'America/New_York'}).
          Clients will see open 60-minute slots based on this schedule.
        </p>
      </div>
      <AvailabilityClient
        initialSlots={slots ?? []}
        timezone={profile?.timezone ?? 'America/New_York'}
      />
    </div>
  )
}
