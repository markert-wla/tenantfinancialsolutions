export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ManagerProfileForm from '@/components/manager/ManagerProfileForm'

export const metadata: Metadata = { title: 'Profile — Property Manager' }

export default async function ManagerProfilePage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('first_name, last_name, role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'property_manager' && profile?.role !== 'admin') redirect('/login')

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-serif font-bold text-tfs-navy mb-1">My Profile</h1>
        <p className="text-sm text-tfs-slate">Set a password so you can sign in on future visits.</p>
      </div>
      <ManagerProfileForm authEmail={user.email ?? ''} />
    </div>
  )
}
