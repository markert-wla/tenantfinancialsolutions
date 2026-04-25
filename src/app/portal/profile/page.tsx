export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import PortalProfileForm from '@/components/settings/PortalProfileForm'

export const metadata: Metadata = { title: 'Profile Settings' }

export default async function PortalProfilePage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('first_name, last_name, timezone, unit_number, birthday_month, contact_email, client_type, plan_tier, photo_url, bio')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-serif font-bold text-tfs-navy mb-1">Profile Settings</h1>
        <p className="text-sm text-tfs-slate">Manage your personal info and notification preferences.</p>
      </div>
      <PortalProfileForm
        authEmail={user.email ?? ''}
        userId={user.id}
        profile={profile}
      />
    </div>
  )
}
