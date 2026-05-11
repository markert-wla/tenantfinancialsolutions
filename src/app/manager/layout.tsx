export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { LayoutDashboard, Users, Tag, ClipboardList, UserCircle } from 'lucide-react'
import SignOutButton from '@/components/portal/SignOutButton'
import DashboardShell from '@/components/layout/DashboardShell'

export default async function ManagerLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('first_name, last_name, role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'property_manager' && profile?.role !== 'admin') redirect('/login')

  const name = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || user.email

  const sidebar = (
    <>
      <div className="px-5 py-5 border-b border-white/10">
        <p className="font-semibold text-white text-sm truncate">{name}</p>
        <span className="mt-1 inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-purple-500/20 text-purple-300">
          Property Manager
        </span>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <NavLink href="/manager/dashboard"  icon={LayoutDashboard} label="Dashboard" />
        <NavLink href="/manager/tenants"    icon={Users}           label="My Tenants" />
        <NavLink href="/manager/codes"      icon={Tag}             label="Promo Codes" />
        <NavLink href="/manager/attendance" icon={ClipboardList}   label="Attendance" />
        <NavLink href="/manager/profile"    icon={UserCircle}      label="Profile" />
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

function NavLink({ href, icon: Icon, label }: { href: string; icon: React.ElementType; label: string }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 px-3 py-2 rounded-lg text-white/70 hover:text-white hover:bg-white/10 text-sm transition-colors"
    >
      <Icon size={16} />
      {label}
    </Link>
  )
}
