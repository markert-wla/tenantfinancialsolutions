export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import InviteManagerForm from '@/components/admin/InviteManagerForm'
import { CheckCircle2, XCircle } from 'lucide-react'

export const metadata: Metadata = { title: 'Property Managers — Admin' }

export default async function AdminManagersPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: actor } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (actor?.role !== 'admin') redirect('/login')

  const { data: managers } = await supabase
    .from('profiles')
    .select('id, first_name, last_name, email, is_active, created_at')
    .eq('role', 'property_manager')
    .order('last_name')

  // Code counts per manager
  const { data: codeCounts } = await supabase
    .from('promo_codes')
    .select('created_by, code')
    .eq('partner_type', 'property_manager')

  const codesByPM: Record<string, number> = {}
  ;(codeCounts ?? []).forEach(c => {
    if (c.created_by) codesByPM[c.created_by] = (codesByPM[c.created_by] ?? 0) + 1
  })

  function fmtDate(iso: string) {
    return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      .format(new Date(iso))
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-serif font-bold text-tfs-navy mb-1">Property Managers</h1>
        <p className="text-sm text-tfs-slate">{managers?.length ?? 0} manager{managers?.length !== 1 ? 's' : ''} invited</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Invite form */}
        <div className="lg:col-span-1">
          <div className="card">
            <h2 className="font-serif font-bold text-tfs-navy text-lg mb-4">Invite Property Manager</h2>
            <InviteManagerForm />
          </div>
        </div>

        {/* Manager list */}
        <div className="lg:col-span-2">
          {!managers?.length ? (
            <div className="card text-center py-16 text-tfs-slate text-sm">
              No property managers invited yet.
            </div>
          ) : (
            <div className="card overflow-hidden p-0">
              <table className="w-full text-sm">
                <thead className="bg-tfs-teal-light text-tfs-navy border-b border-gray-100">
                  <tr>
                    <th className="text-left px-5 py-3 font-semibold">Manager</th>
                    <th className="text-left px-4 py-3 font-semibold">Codes</th>
                    <th className="text-left px-4 py-3 font-semibold">Invited</th>
                    <th className="text-left px-4 py-3 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {(managers as any[]).map(m => (
                    <tr key={m.id} className="hover:bg-gray-50">
                      <td className="px-5 py-3">
                        <p className="font-medium text-tfs-navy">{m.first_name} {m.last_name}</p>
                        <p className="text-xs text-tfs-slate">{m.email}</p>
                      </td>
                      <td className="px-4 py-3 text-tfs-slate text-center">
                        {codesByPM[m.id] ?? 0}
                      </td>
                      <td className="px-4 py-3 text-xs text-tfs-slate">
                        {fmtDate(m.created_at)}
                      </td>
                      <td className="px-4 py-3">
                        {m.is_active
                          ? <span className="flex items-center gap-1 text-green-600 text-xs"><CheckCircle2 size={13} /> Active</span>
                          : <span className="flex items-center gap-1 text-gray-400 text-xs"><XCircle size={13} /> Inactive</span>
                        }
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
