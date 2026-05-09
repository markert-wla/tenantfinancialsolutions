export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import CoachesClient from '@/components/admin/CoachesClient'

export const metadata: Metadata = { title: 'Coaches — Admin' }

export default async function AdminCoachesPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: coaches } = await supabase
    .from('coaches')
    .select('id, display_name, email, specialty, bio_short, bio, photo_url, timezone, is_active')
    .order('display_name', { ascending: true })

  const coachList = coaches ?? []

  // Fetch auth confirmation status for each coach (service client bypasses RLS)
  const service = createServiceClient()
  const authResults = coachList.length > 0
    ? await Promise.all(coachList.map(c => service.auth.admin.getUserById(c.id)))
    : []

  const enriched = coachList.map((c, i) => ({
    ...c,
    email_confirmed: !!authResults[i]?.data?.user?.email_confirmed_at,
  }))

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      <CoachesClient coaches={enriched} />
    </div>
  )
}
