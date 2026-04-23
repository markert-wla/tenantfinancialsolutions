export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = { title: 'My Clients — Coach' }

const TIER_LABEL: Record<string, string>  = { free: 'Free', bronze: 'Starter', silver: 'Advantage' }
const TIER_COLOR: Record<string, string>  = {
  free:   'bg-gray-100 text-gray-600',
  bronze: 'bg-amber-100 text-amber-700',
  silver: 'bg-slate-200 text-slate-700',
}
const CLIENT_TYPE_LABEL: Record<string, string> = {
  individual:          'Individual',
  couple:              'Couple',
  property_tenant:     'PM Tenant',
  nonprofit_individual:'Non-Profit',
}
const CLIENT_TYPE_COLOR: Record<string, string> = {
  individual:          'bg-blue-100 text-blue-700',
  couple:              'bg-purple-100 text-purple-700',
  property_tenant:     'bg-orange-100 text-orange-700',
  nonprofit_individual:'bg-green-100 text-green-700',
}

export default async function CoachClientsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('role, timezone').eq('id', user.id).single()
  if (!profile || (profile.role !== 'coach' && profile.role !== 'admin')) redirect('/login')

  // Distinct client IDs
  const { data: bookings } = await supabase
    .from('bookings')
    .select('client_id')
    .eq('coach_id', user.id)
    .neq('status', 'cancelled')

  const clientIds = Array.from(new Set((bookings ?? []).map((b: any) => b.client_id as string)))

  const clients = clientIds.length > 0
    ? (await supabase
        .from('profiles')
        .select('id, first_name, last_name, email, plan_tier, client_type, last_active_at, sessions_used_this_month, is_active')
        .in('id', clientIds)
        .order('last_name')
      ).data ?? []
    : []

  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)

  function fmtDate(iso: string) {
    return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      .format(new Date(iso))
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-serif font-bold text-tfs-navy mb-1">My Clients</h1>
        <p className="text-sm text-tfs-slate">{clients.length} client{clients.length !== 1 ? 's' : ''} with sessions booked with you</p>
      </div>

      {clients.length === 0 ? (
        <div className="card text-center py-16 text-tfs-slate">
          <p className="text-lg mb-2">No clients yet.</p>
          <p className="text-sm">Clients appear here once they book a session with you.</p>
        </div>
      ) : (
        <div className="card overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-tfs-teal-light text-tfs-navy border-b border-gray-100">
                <tr>
                  <th className="text-left px-5 py-3 font-semibold">Client</th>
                  <th className="text-left px-4 py-3 font-semibold">Type</th>
                  <th className="text-left px-4 py-3 font-semibold">Plan</th>
                  <th className="text-left px-4 py-3 font-semibold">Sessions / mo</th>
                  <th className="text-left px-4 py-3 font-semibold">Last Active</th>
                  <th className="text-left px-4 py-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {(clients as any[]).map(c => {
                  const lastActive  = new Date(c.last_active_at)
                  const isInactive  = lastActive < ninetyDaysAgo
                  return (
                    <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3">
                        <p className="font-medium text-tfs-navy">{c.first_name} {c.last_name}</p>
                        <p className="text-xs text-tfs-slate">{c.email}</p>
                      </td>
                      <td className="px-4 py-3">
                        {c.client_type && (
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${CLIENT_TYPE_COLOR[c.client_type] ?? 'bg-gray-100 text-gray-600'}`}>
                            {CLIENT_TYPE_LABEL[c.client_type] ?? c.client_type}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TIER_COLOR[c.plan_tier] ?? 'bg-gray-100 text-gray-600'}`}>
                          {TIER_LABEL[c.plan_tier] ?? c.plan_tier}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-tfs-navy font-semibold text-center">
                        {c.sessions_used_this_month ?? 0}
                      </td>
                      <td className="px-4 py-3">
                        <span className={isInactive ? 'text-red-500 font-medium' : 'text-tfs-slate'}>
                          {fmtDate(c.last_active_at)}
                        </span>
                        {isInactive && <span className="block text-xs text-red-400">90+ days</span>}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${c.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                          {c.is_active ? 'Active' : 'Inactive'}
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
