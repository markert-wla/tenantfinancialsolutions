export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import PartnersClient from '@/components/admin/PartnersClient'

export const metadata: Metadata = { title: 'Partners — Admin' }

export default async function AdminPartnersPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: partners } = await supabase
    .from('partners')
    .select('id, partner_name, partner_type, contact_name, contact_email, model, created_at')
    .order('partner_name', { ascending: true })

  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      <PartnersClient partners={partners ?? []} />
    </div>
  )
}
