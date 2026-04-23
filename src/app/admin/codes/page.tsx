export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import CodesClient from '@/components/admin/CodesClient'

export const metadata: Metadata = { title: 'Promo Codes — Admin' }

export default async function AdminCodesPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: codes } = await supabase
    .from('promo_codes')
    .select('code, partner_type, partner_name, assigned_tier, max_uses, uses_count, is_active, expires_at, created_at')
    .order('created_at', { ascending: false })

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      <CodesClient codes={codes ?? []} />
    </div>
  )
}
