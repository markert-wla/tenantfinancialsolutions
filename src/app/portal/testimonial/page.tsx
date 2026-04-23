export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import TestimonialForm from '@/components/portal/TestimonialForm'

export const metadata: Metadata = { title: 'Share Your Story — Portal' }

export default async function PortalTestimonialPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('first_name, last_name')
    .eq('id', user.id)
    .single()

  const defaultName = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ')

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-serif font-bold text-tfs-navy mb-1">Share Your Story</h1>
        <p className="text-sm text-tfs-slate">
          Your experience inspires others. Testimonials are reviewed before appearing on our site.
        </p>
      </div>
      <TestimonialForm defaultName={defaultName} />
    </div>
  )
}
