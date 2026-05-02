export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AdminClientsClient from '@/components/admin/AdminClientsClient'

export const metadata: Metadata = { title: 'Clients — Admin' }

export default async function AdminClientsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: actor } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (actor?.role !== 'admin') redirect('/login')

  const [{ data: clients }, { data: pmCodes }] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, first_name, last_name, email, plan_tier, client_type, promo_code_used, free_trial_expires_at, sessions_used_this_month, extra_sessions, last_active_at, is_active, created_at')
      .eq('role', 'client')
      .order('last_active_at', { ascending: true }),

    supabase
      .from('promo_codes')
      .select('code, partner_name')
      .eq('partner_type', 'property_manager')
      .eq('is_active', true)
      .order('partner_name'),
  ])

  const activeCount   = clients?.filter(c => c.is_active).length ?? 0
  const inactiveCount = clients?.filter(c => !c.is_active).length ?? 0
  const freeCount     = clients?.filter(c => c.plan_tier === 'free').length ?? 0

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-serif font-bold text-tfs-navy">Clients</h1>
          <p className="text-sm text-tfs-slate mt-1">
            {activeCount} active · {inactiveCount} inactive · {freeCount} on free tier
          </p>
        </div>
      </div>

      <AdminClientsClient
        clients={(clients ?? []) as any}
        pmCodes={(pmCodes ?? []) as any}
      />
    </div>
  )
}
