export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = { title: 'My Tenants — PM' }

const TIER_LABEL: Record<string, string> = { free: 'Free', bronze: 'Starter', silver: 'Advantage' }
const TIER_COLOR: Record<string, string> = {
  free:   'bg-gray-100 text-gray-600',
  bronze: 'bg-amber-100 text-amber-700',
  silver: 'bg-slate-200 text-slate-700',
}

export default async function ManagerTenantsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('role, partner_id').eq('id', user.id).single()
  if (profile?.role !== 'property_manager' && profile?.role !== 'admin') redirect('/login')

  // Codes belonging to this PM's partner record
  const { data: codes } = profile?.partner_id
    ? await supabase.from('promo_codes').select('code').eq('partner_id', profile.partner_id)
    : { data: [] }
  const myCodes = (codes ?? []).map(c => c.code)

  const tenants = myCodes.length > 0
    ? ((await supabase
        .from('profiles')
        .select('id, first_name, last_name, email, plan_tier, sessions_used_this_month, last_active_at, is_active, promo_code_used')
        .in('promo_code_used', myCodes)
        .eq('role', 'client')
        .order('last_name')
      ).data ?? [])
    : []

  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)

  function fmtDate(iso: string) {
    return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      .format(new Date(iso))
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-serif font-bold text-tfs-navy mb-1">My Tenants</h1>
        <p className="text-sm text-tfs-slate">
          {tenants.length} tenant{tenants.length !== 1 ? 's' : ''} enrolled via your promo codes
        </p>
      </div>

      {tenants.length === 0 ? (
        <div className="card text-center py-16 text-tfs-slate">
          <p className="text-lg mb-2">No tenants enrolled yet.</p>
          <p className="text-sm">Share your promo code so tenants can register at sign-up.</p>
        </div>
      ) : (
        <div className="card overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-tfs-teal-light text-tfs-navy border-b border-gray-100">
                <tr>
                  <th className="text-left px-5 py-3 font-semibold">Tenant</th>
                  <th className="text-left px-4 py-3 font-semibold">Code Used</th>
                  <th className="text-left px-4 py-3 font-semibold">Plan</th>
                  <th className="text-left px-4 py-3 font-semibold">Sessions/mo</th>
                  <th className="text-left px-4 py-3 font-semibold">Last Active</th>
                  <th className="text-left px-4 py-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {(tenants as { id: string; first_name: string; last_name: string; email: string; promo_code_used: string | null; plan_tier: string; sessions_used_this_month: number; last_active_at: string; is_active: boolean }[]).map(t => {
                  const lastActive = new Date(t.last_active_at)
                  const isInactive = lastActive < ninetyDaysAgo
                  return (
                    <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3">
                        <p className="font-medium text-tfs-navy">{t.first_name} {t.last_name}</p>
                        <p className="text-xs text-tfs-slate">{t.email}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs text-tfs-slate">{t.promo_code_used}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TIER_COLOR[t.plan_tier] ?? 'bg-gray-100 text-gray-600'}`}>
                          {TIER_LABEL[t.plan_tier] ?? t.plan_tier}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-tfs-navy font-semibold text-center">
                        {t.sessions_used_this_month ?? 0}
                      </td>
                      <td className="px-4 py-3">
                        <span className={isInactive ? 'text-red-500 font-medium' : 'text-tfs-slate'}>
                          {fmtDate(t.last_active_at)}
                        </span>
                        {isInactive && <span className="block text-xs text-red-400">90+ days</span>}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${t.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                          {t.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
