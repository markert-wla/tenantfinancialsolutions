export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import InviteManagerForm from '@/components/admin/InviteManagerForm'
import ManagersTable from '@/components/admin/ManagersTable'

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
          <ManagersTable managers={managers ?? []} codesByPM={codesByPM} />
        </div>
      </div>
    </div>
  )
}
