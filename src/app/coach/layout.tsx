export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { LayoutDashboard, Clock, UserCircle, Users, CalendarDays, ClipboardList } from 'lucide-react'
import SignOutButton from '@/components/portal/SignOutButton'
import AdminNavLink from '@/components/admin/AdminNavLink'
import DashboardShell from '@/components/layout/DashboardShell'

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

  const sidebar = (
    <>
      <div className="px-5 py-5 border-b border-white/10">
        <p className="font-semibold text-white text-sm truncate">{name}</p>
        <span className="mt-1 inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-tfs-teal/30 text-tfs-teal">
          Coach
        </span>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <AdminNavLink href="/coach/dashboard">    <LayoutDashboard size={16} /> Dashboard    </AdminNavLink>
        <AdminNavLink href="/coach/clients">      <Users size={16} />           Clients      </AdminNavLink>
        <AdminNavLink href="/coach/sessions">     <CalendarDays size={16} />    Sessions     </AdminNavLink>
        <AdminNavLink href="/coach/attendance">   <ClipboardList size={16} />   Attendance   </AdminNavLink>
        <AdminNavLink href="/coach/availability"> <Clock size={16} />           Availability </AdminNavLink>
        <AdminNavLink href="/coach/profile">      <UserCircle size={16} />      Profile      </AdminNavLink>
      </nav>
      <div className="px-3 py-4 border-t border-white/10">
        <SignOutButton />
      </div>
    </>
  )

  return (
    <DashboardShell sidebar={sidebar}>
      {children}
    </DashboardShell>
  )
}
