export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Users, CalendarCheck, UserCheck, Tag } from 'lucide-react'
import Link from 'next/link'

export const metadata: Metadata = { title: 'PM Dashboard' }

export default async function ManagerDashboardPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('first_name, role, partner_id').eq('id', user.id).single()
  if (profile?.role !== 'property_manager' && profile?.role !== 'admin') redirect('/login')

  // This PM's promo codes via their partner record
  const { data: codes } = profile?.partner_id
    ? await supabase
        .from('promo_codes')
        .select('code, uses_count, partner_name')
        .eq('partner_id', profile.partner_id)
        .eq('is_active', true)
    : { data: [] }

  const myCodes = (codes ?? []).map(c => c.code)

  // Tenants who used one of this PM's codes
  const { data: tenants } = myCodes.length > 0
    ? await supabase
        .from('profiles')
        .select('id, is_active, sessions_used_this_month')
        .in('promo_code_used', myCodes)
        .eq('role', 'client')
    : { data: [] }

  const totalTenants  = tenants?.length ?? 0
  const activeTenants = tenants?.filter(t => t.is_active).length ?? 0
  const sessionsMonth = tenants?.reduce((sum, t) => sum + (t.sessions_used_this_month ?? 0), 0) ?? 0
  const totalUses     = codes?.reduce((sum, c) => sum + c.uses_count, 0) ?? 0

  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-serif font-bold text-tfs-navy mb-1">
          Welcome, {profile?.first_name ?? 'Manager'}!
        </h1>
        <p className="text-sm text-tfs-slate">Your tenant enrollment overview.</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { icon: Users,        label: 'Tenants Enrolled', value: totalTenants,  color: 'text-tfs-teal bg-tfs-teal/10' },
          { icon: UserCheck,    label: 'Active Tenants',   value: activeTenants, color: 'text-tfs-navy bg-tfs-navy/10' },
          { icon: CalendarCheck,label: 'Sessions This Mo', value: sessionsMonth, color: 'text-tfs-gold bg-tfs-gold/10' },
          { icon: Tag,          label: 'Code Uses (total)',value: totalUses,     color: 'text-purple-500 bg-purple-50' },
        ].map(({ icon: Icon, label, value, color }) => (
          <div key={label} className="card flex items-center gap-4">
            <div className={`p-3 rounded-xl ${color}`}>
              <Icon size={22} />
            </div>
            <div>
              <p className="text-xs text-tfs-slate">{label}</p>
              <p className="text-2xl font-bold text-tfs-navy">{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 gap-6">
        <div className="card">
          <h2 className="font-serif font-bold text-tfs-navy text-lg mb-3 flex items-center gap-2">
            <Users size={18} className="text-tfs-teal" /> My Promo Codes
          </h2>
          {myCodes.length === 0 ? (
            <p className="text-sm text-tfs-slate">No active codes yet.</p>
          ) : (
            <ul className="divide-y divide-gray-100 text-sm">
              {(codes ?? []).slice(0, 4).map(c => (
                <li key={c.code} className="py-2 flex items-center justify-between">
                  <span className="font-mono font-bold text-tfs-navy">{c.code}</span>
                  <span className="text-tfs-slate text-xs">{c.uses_count} use{c.uses_count !== 1 ? 's' : ''}</span>
                </li>
              ))}
            </ul>
          )}
          <Link href="/manager/codes" className="mt-3 block text-sm text-tfs-teal hover:underline">
            View all codes →
          </Link>
        </div>
      </div>
    </div>
  )
}
