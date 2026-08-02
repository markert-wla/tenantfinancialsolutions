export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import DocumentsSection from '@/components/portal/DocumentsSection'

export const metadata: Metadata = { title: 'My Documents' }

export default async function DocumentsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-serif font-bold text-tfs-navy mb-1">My Documents</h1>
        <p className="text-tfs-slate text-sm">
          Upload files to share with your coach. Accepted: PDF, Word, images, plain text — up to 5 MB each.
        </p>
      </div>
      <DocumentsSection />
    </div>
  )
}
