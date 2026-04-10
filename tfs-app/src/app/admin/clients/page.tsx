export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = { title: 'Clients — Admin' }

const TIER_COLORS: Record<string, string> = {
  free:   'bg-gray-100 text-gray-600',
  bronze: 'bg-orange-100 text-orange-700',
  silver: 'bg-slate-100 text-slate-600',
  gold:   'bg-yellow-100 text-yellow-700',
}

export default async function AdminClientsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: clients } = await supabase
    .from('profiles')
    .select('id, first_name, last_name, email, plan_tier, sessions_used_this_month, last_active_at, created_at, is_active')
    .eq('role', 'client')
    .order('last_active_at', { ascending: true })

  const now = new Date()

  function daysSince(iso: string) {
    return Math.floor((now.getTime() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24))
  }

  const activeCount   = clients?.filter(c => c.is_active).length ?? 0
  const inactiveCount = clients?.filter(c => !c.is_active).length ?? 0

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-serif font-bold text-tfs-navy">Clients</h1>
          <p className="text-sm text-tfs-slate mt-1">
            {activeCount} active{inactiveCount > 0 && `, ${inactiveCount} inactive`}
          </p>
        </div>
      </div>

      <div className="card overflow-hidden">
        {!clients?.length ? (
          <p className="text-tfs-slate text-sm py-4">No clients yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-3 pr-4 font-medium text-tfs-slate">Name</th>
                  <th className="text-left py-3 pr-4 font-medium text-tfs-slate">Email</th>
                  <th className="text-left py-3 pr-4 font-medium text-tfs-slate">Plan</th>
                  <th className="text-left py-3 pr-4 font-medium text-tfs-slate">Sessions</th>
                  <th className="text-left py-3 pr-4 font-medium text-tfs-slate">Last Active</th>
                  <th className="text-left py-3 font-medium text-tfs-slate">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {clients.map((c: any) => {
                  const days = daysSince(c.last_active_at)
                  const flag = days >= 120 ? 'critical' : days >= 90 ? 'warning' : null
                  return (
                    <tr key={c.id} className={!c.is_active ? 'opacity-50' : ''}>
                      <td className="py-3 pr-4 font-medium text-tfs-navy">
                        {c.first_name} {c.last_name}
                        {!c.is_active && (
                          <span className="ml-2 text-xs text-gray-400 font-normal">(inactive)</span>
                        )}
                      </td>
                      <td className="py-3 pr-4 text-tfs-slate">{c.email}</td>
                      <td className="py-3 pr-4">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${TIER_COLORS[c.plan_tier] ?? ''}`}>
                          {c.plan_tier}
                        </span>
                      </td>
                      <td className="py-3 pr-4 text-tfs-slate">{c.sessions_used_this_month}</td>
                      <td className="py-3 pr-4">
                        <span className={`text-xs font-medium ${
                          flag === 'critical' ? 'text-red-600' :
                          flag === 'warning'  ? 'text-orange-600' :
                          'text-tfs-slate'
                        }`}>
                          {flag === 'critical' && '🔴 '}
                          {flag === 'warning'  && '🟡 '}
                          {days}d ago
                        </span>
                      </td>
                      <td className="py-3 text-xs text-tfs-slate">
                        {new Date(c.created_at).toLocaleDateString('en-US', {
                          month: 'short', day: 'numeric', year: 'numeric',
                        })}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
