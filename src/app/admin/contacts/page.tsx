export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ContactsClient from '@/components/admin/ContactsClient'

export const metadata: Metadata = { title: 'Contact Submissions — Admin' }

export default async function AdminContactsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: submissions }, { data: coaches }] = await Promise.all([
    supabase
      .from('contact_submissions')
      .select('*, coaches(display_name, email)')
      .order('submitted_at', { ascending: false }),
    supabase
      .from('coaches')
      .select('id, display_name')
      .eq('is_active', true)
      .order('display_name'),
  ])

  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      <ContactsClient submissions={submissions ?? []} coaches={coaches ?? []} />
    </div>
  )
}
