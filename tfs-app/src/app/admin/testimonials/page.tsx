export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import TestimonialsClient from '@/components/admin/TestimonialsClient'

export const metadata: Metadata = { title: 'Testimonials — Admin' }

export default async function AdminTestimonialsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: testimonials } = await supabase
    .from('testimonials')
    .select('id, client_name, quote, plan_tier, approved, submitted_at')
    .order('approved', { ascending: true })   // pending first
    .order('submitted_at', { ascending: false })

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <TestimonialsClient testimonials={testimonials ?? []} />
    </div>
  )
}
