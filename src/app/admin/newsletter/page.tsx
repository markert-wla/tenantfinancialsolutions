export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import NewsletterClient from '@/components/admin/NewsletterClient'

export const metadata: Metadata = { title: 'Newsletter — Admin' }

export default async function AdminNewsletterPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: subscribers } = await supabase
    .from('newsletter_subscribers')
    .select('id, email, name, subscribed_at, is_active')
    .order('subscribed_at', { ascending: false })

  return (
    <main className="max-w-5xl mx-auto px-4 py-12">
      <NewsletterClient subscribers={subscribers ?? []} />
    </main>
  )
}
