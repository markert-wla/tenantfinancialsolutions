export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { CheckCircle2, XCircle } from 'lucide-react'

export const metadata: Metadata = { title: 'Promo Codes — PM' }

export default async function ManagerCodesPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('role, first_name, last_name, partner_id').eq('id', user.id).single()
  if (profile?.role !== 'property_manager' && profile?.role !== 'admin') redirect('/login')

  const { data: codes } = profile?.partner_id
    ? await supabase
        .from('promo_codes')
        .select('code, partner_name, assigned_tier, uses_count, max_uses, expires_at, is_active, created_at')
        .eq('partner_id', profile.partner_id)
        .order('created_at', { ascending: false })
    : { data: [] }

  function fmtDate(iso: string | null) {
    if (!iso) return 'No expiry'
    return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      .format(new Date(iso))
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-serif font-bold text-tfs-navy mb-1">Promo Codes</h1>
        <p className="text-sm text-tfs-slate">{codes?.length ?? 0} code{codes?.length !== 1 ? 's' : ''} assigned to your account</p>
      </div>

      {!codes?.length ? (
        <div className="card text-center py-16 text-tfs-slate">
          <p className="text-lg mb-2">No codes assigned yet.</p>
          <p className="text-sm">Contact your administrator to have promo codes assigned to your account.</p>
        </div>
      ) : (
        <div className="card overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-tfs-teal-light text-tfs-navy border-b border-gray-100">
                <tr>
                  <th className="text-left px-5 py-3 font-semibold">Code</th>
                  <th className="text-left px-4 py-3 font-semibold">Tier</th>
                  <th className="text-left px-4 py-3 font-semibold">Uses</th>
                  <th className="text-left px-4 py-3 font-semibold">Expires</th>
                  <th className="text-left px-4 py-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {(codes as any[]).map(c => {
                  const isExpired = c.expires_at && new Date(c.expires_at) < new Date()
                  return (
                    <tr key={c.code} className="hover:bg-gray-50">
                      <td className="px-5 py-3">
                        <p className="font-mono font-bold text-tfs-navy tracking-wider">{c.code}</p>
                        <p className="text-xs text-tfs-slate">{c.partner_name}</p>
                      </td>
                      <td className="px-4 py-3 capitalize text-tfs-slate">{c.assigned_tier}</td>
                      <td className="px-4 py-3 text-tfs-slate">
                        {c.uses_count} / {c.max_uses >= 9999 ? '∞' : c.max_uses}
                      </td>
                      <td className="px-4 py-3">
                        <span className={isExpired ? 'text-red-500 font-medium' : 'text-tfs-slate'}>
                          {fmtDate(c.expires_at)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {c.is_active && !isExpired
                          ? <span className="flex items-center gap-1 text-green-600 text-xs font-medium"><CheckCircle2 size={13} /> Active</span>
                          : <span className="flex items-center gap-1 text-gray-400 text-xs font-medium"><XCircle size={13} /> {isExpired ? 'Expired' : 'Inactive'}</span>
                        }
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
