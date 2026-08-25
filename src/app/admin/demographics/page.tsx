export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export const metadata: Metadata = { title: 'Client Demographics — Admin' }

const MONTHS = [
  '', 'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

const TYPE_LABEL: Record<string, string> = {
  individual:           'Individual',
  couple:               'Couple',
  property_tenant:      'PM Tenant',
  nonprofit_individual: 'Non-Profit',
}

const TYPE_COLOR: Record<string, string> = {
  individual:           'bg-blue-100 text-blue-700',
  couple:               'bg-purple-100 text-purple-700',
  property_tenant:      'bg-orange-100 text-orange-700',
  nonprofit_individual: 'bg-green-100 text-green-700',
}

export default async function AdminDemographicsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: actor } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (actor?.role !== 'admin') redirect('/login')

  const service = createServiceClient()
  const { data: clients } = await service
    .from('profiles')
    .select(`
      id,
      first_name,
      last_name,
      email,
      client_type,
      timezone,
      birthday_month,
      anniversary_month,
      partner_first_name,
      partner_last_name,
      unit_number,
      promo_code_used,
      plan_tier,
      created_at
    `)
    .eq('role', 'client')
    .order('created_at', { ascending: false })

  const total = clients?.length ?? 0
  const withBirthday = clients?.filter(c => c.birthday_month).length ?? 0
  const withAnniversary = clients?.filter(c => c.anniversary_month).length ?? 0
  const couples = clients?.filter(c => c.client_type === 'couple').length ?? 0

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-serif font-bold text-tfs-navy">Client Demographics</h1>
        <p className="text-sm text-tfs-slate mt-1">
          {total} clients · {couples} couples · {withBirthday} birthday months on file · {withAnniversary} anniversary months on file
        </p>
      </div>

      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-tfs-teal-light text-tfs-navy border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-3 font-semibold">Client</th>
                <th className="text-left px-4 py-3 font-semibold">Type</th>
                <th className="text-left px-4 py-3 font-semibold">Partner Name</th>
                <th className="text-left px-4 py-3 font-semibold">Timezone</th>
                <th className="text-left px-4 py-3 font-semibold">Birthday Month</th>
                <th className="text-left px-4 py-3 font-semibold">Anniversary Month</th>
                <th className="text-left px-4 py-3 font-semibold">Unit #</th>
                <th className="text-left px-4 py-3 font-semibold">Promo Code</th>
                <th className="text-left px-4 py-3 font-semibold">Member Since</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {(!clients || clients.length === 0) && (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-tfs-slate text-sm">
                    No clients found.
                  </td>
                </tr>
              )}
              {(clients ?? []).map(c => (
                <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium text-tfs-navy">{c.first_name} {c.last_name}</p>
                    <p className="text-xs text-tfs-slate">{c.email}</p>
                  </td>
                  <td className="px-4 py-3">
                    {c.client_type ? (
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_COLOR[c.client_type] ?? 'bg-gray-100 text-gray-600'}`}>
                        {TYPE_LABEL[c.client_type] ?? c.client_type}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-300">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-tfs-slate">
                    {c.partner_first_name || c.partner_last_name
                      ? `${c.partner_first_name ?? ''} ${c.partner_last_name ?? ''}`.trim()
                      : <span className="text-gray-300">—</span>
                    }
                  </td>
                  <td className="px-4 py-3 text-tfs-slate text-xs">
                    {c.timezone
                      ? c.timezone.replace('America/', '').replace(/_/g, ' ')
                      : <span className="text-gray-300">—</span>
                    }
                  </td>
                  <td className="px-4 py-3 text-tfs-slate">
                    {c.birthday_month
                      ? MONTHS[c.birthday_month] ?? c.birthday_month
                      : <span className="text-gray-300">—</span>
                    }
                  </td>
                  <td className="px-4 py-3 text-tfs-slate">
                    {c.anniversary_month
                      ? MONTHS[c.anniversary_month] ?? c.anniversary_month
                      : <span className="text-gray-300">—</span>
                    }
                  </td>
                  <td className="px-4 py-3 text-tfs-slate font-mono text-xs">
                    {c.unit_number || <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-3 text-tfs-slate font-mono text-xs">
                    {c.promo_code_used || <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-3 text-tfs-slate text-xs">
                    {c.created_at
                      ? new Date(c.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                      : '—'
                    }
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
