export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import {
  LayoutDashboard, Users, UserCheck, Tag,
  Calendar, Star, Video, Building2, Settings, Inbox, StickyNote,
} from 'lucide-react'
import SignOutButton from '@/components/portal/SignOutButton'
import AdminNavLink from '@/components/admin/AdminNavLink'
import DashboardShell from '@/components/layout/DashboardShell'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('first_name, last_name, role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') redirect('/login')

  const name = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || user.email

  const { count: newContactCount } = await supabase
    .from('contact_submissions')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'new')

  const sidebar = (
    <>
      <div className="px-5 py-5 border-b border-white/10">
        <p className="font-semibold text-white text-sm truncate">{name}</p>
        <span className="mt-1 inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-tfs-gold/20 text-tfs-gold">
          Admin
        </span>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <AdminNavLink href="/admin/dashboard">      <LayoutDashboard size={16} /> Dashboard      </AdminNavLink>
        <AdminNavLink href="/admin/contacts" badge={newContactCount ?? 0}>
                                                    <Inbox size={16} />           Contacts       </AdminNavLink>
        <AdminNavLink href="/admin/clients">        <Users size={16} />           Clients        </AdminNavLink>
        <AdminNavLink href="/admin/coaches">        <UserCheck size={16} />       Coaches        </AdminNavLink>
        <AdminNavLink href="/admin/codes">          <Tag size={16} />             Promo Codes    </AdminNavLink>
        <AdminNavLink href="/admin/bookings">       <Calendar size={16} />        Bookings       </AdminNavLink>
        <AdminNavLink href="/admin/notes">          <StickyNote size={16} />      Notes          </AdminNavLink>
        <AdminNavLink href="/admin/testimonials">   <Star size={16} />            Testimonials   </AdminNavLink>
        <AdminNavLink href="/admin/group-sessions"> <Video size={16} />           Group Sessions </AdminNavLink>
        <AdminNavLink href="/admin/partners">       <Building2 size={16} />       Partners       </AdminNavLink>
        <AdminNavLink href="/admin/settings">       <Settings size={16} />        Settings       </AdminNavLink>
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
