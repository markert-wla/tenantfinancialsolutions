export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AdminProfileForm from '@/components/settings/AdminProfileForm'

export const metadata: Metadata = { title: 'Settings — Admin' }

export default async function AdminSettingsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('first_name, last_name, timezone, contact_email, role, photo_url, bio')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'admin') redirect('/login')

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-serif font-bold text-tfs-navy mb-1">Account Settings</h1>
        <p className="text-sm text-tfs-slate">Manage your admin profile and notification preferences.</p>
      </div>
      <AdminProfileForm
        authEmail={user.email ?? ''}
        userId={user.id}
        profile={profile}
      />
    </div>
  )
}
