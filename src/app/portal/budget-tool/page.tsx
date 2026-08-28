export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import BudgetToolClient, { type BudgetRow } from '@/components/portal/BudgetToolClient'
import type { BucketKey } from '@/lib/budget/rentStabilityScore'

export const metadata: Metadata = {
  title: 'Tenant Money Compass',
  robots: { index: false, follow: false },
}

export default async function BudgetToolPage() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const now = new Date()
  const monthISO = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
  const monthDate = new Date(now.getFullYear(), now.getMonth(), 1)
  const monthLabelEn = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(monthDate)
  const monthLabelEs = new Intl.DateTimeFormat('es-US', { month: 'long', year: 'numeric' }).format(monthDate)

  const { data: monthRow } = await supabase
    .from('budget_months')
    .select('id, monthly_income, rent_amount')
    .eq('client_id', user.id)
    .eq('month', monthISO)
    .maybeSingle()

  let initialRows: BudgetRow[] = []
  if (monthRow?.id) {
    const { data: entries } = await supabase
      .from('budget_entries')
      .select('id, bucket, label, amount')
      .eq('budget_month_id', monthRow.id)
      .order('sort_order', { ascending: true })

    initialRows = (entries ?? []).map((e) => ({
      id: String(e.id),
      bucket: e.bucket as BucketKey,
      label: e.label ?? '',
      amount: Number(e.amount) || 0,
    }))
  }

  return (
    <BudgetToolClient
      monthISO={monthISO}
      monthLabelEn={monthLabelEn}
      monthLabelEs={monthLabelEs}
      initialIncome={Number(monthRow?.monthly_income) || 0}
      initialRent={Number(monthRow?.rent_amount) || 0}
      initialRows={initialRows}
    />
  )
}
