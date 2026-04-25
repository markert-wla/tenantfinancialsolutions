export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import CoachProfileForm from '@/components/settings/CoachProfileForm'

export const metadata: Metadata = { title: 'Profile Settings — Coach' }

export default async function CoachProfilePage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('first_name, last_name, timezone, contact_email, role')
    .eq('id', user.id)
    .single()

  if (!profile || (profile.role !== 'coach' && profile.role !== 'admin')) redirect('/login')

  const { data: coach } = await supabase
    .from('coaches')
    .select('display_name, bio, specialty, photo_url, timezone')
    .eq('id', user.id)
    .single()

  if (!coach) redirect('/coach/dashboard')

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-serif font-bold text-tfs-navy mb-1">Profile Settings</h1>
        <p className="text-sm text-tfs-slate">Update your public coach profile and notification preferences.</p>
      </div>
      <CoachProfileForm
        authEmail={user.email ?? ''}
        userId={user.id}
        profile={profile}
        coach={coach}
      />
    </div>
  )
}
