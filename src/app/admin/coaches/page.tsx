export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import CoachesClient from '@/components/admin/CoachesClient'

export const metadata: Metadata = { title: 'Coaches — Admin' }

export default async function AdminCoachesPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: coaches } = await supabase
    .from('coaches')
    .select('id, display_name, email, specialty, bio_short, bio, timezone, is_active')
    .order('display_name', { ascending: true })

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      <CoachesClient coaches={coaches ?? []} />
    </div>
  )
}
