export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/server'
import NewsletterClient from '@/components/admin/NewsletterClient'

export const metadata: Metadata = { title: 'Newsletter — Coach' }

export default async function CoachNewsletterPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('first_name, last_name, role')
    .eq('id', user.id)
    .single()

  // Only Amanda Butler (coach) may access this page
  const isAmanda =
    profile?.first_name === 'Amanda' && profile?.last_name === 'Butler'

  if (!isAmanda) redirect('/coach/dashboard')

  const service = createServiceClient()
  const { data: subscribers } = await service
    .from('newsletter_subscribers')
    .select('id, email, name, subscribed_at, is_active')
    .order('subscribed_at', { ascending: false })

  return (
    <main className="max-w-5xl mx-auto px-4 py-12">
      <NewsletterClient subscribers={subscribers ?? []} />
    </main>
  )
}
