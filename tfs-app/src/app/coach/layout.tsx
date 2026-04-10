export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { LayoutDashboard, Clock } from 'lucide-react'
import SignOutButton from '@/components/portal/SignOutButton'
import AdminNavLink from '@/components/admin/AdminNavLink'

export default async function CoachLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('first_name, last_name, role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'coach' && profile?.role !== 'admin') redirect('/login')

  const name = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || user.email

  return (
    <div className="flex min-h-screen pt-16">
      <aside className="w-56 shrink-0 bg-tfs-navy text-white flex flex-col fixed left-0 top-16 bottom-0 z-40">
        <div className="px-5 py-5 border-b border-white/10">
          <p className="font-semibold text-white text-sm truncate">{name}</p>
          <span className="mt-1 inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-tfs-teal/30 text-tfs-teal">
            Coach
          </span>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          <AdminNavLink href="/coach/dashboard"    icon={LayoutDashboard} label="Dashboard" />
          <AdminNavLink href="/coach/availability" icon={Clock}           label="Availability" />
        </nav>

        <div className="px-3 py-4 border-t border-white/10">
          <SignOutButton />
        </div>
      </aside>

      <div className="flex-1 ml-56 bg-tfs-teal-light min-h-screen">
        {children}
      </div>
    </div>
  )
}
