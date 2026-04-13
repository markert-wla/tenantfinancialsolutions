export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { LayoutDashboard, CalendarPlus, History } from 'lucide-react'
import SignOutButton from '@/components/portal/SignOutButton'

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('first_name, last_name, plan_tier, role')
    .eq('id', user.id)
    .single()

  // Admins and coaches shouldn't be in the client portal
  if (profile?.role === 'admin') redirect('/admin/dashboard')
  if (profile?.role === 'coach') redirect('/coach/dashboard')

  const tier = profile?.plan_tier ?? 'free'
  const name = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || user.email

  return (
    <div className="flex min-h-screen pt-16">
      {/* Sidebar — fixed, sits below the global Navbar */}
      <aside className="w-56 shrink-0 bg-tfs-navy text-white flex flex-col fixed left-0 top-16 bottom-0 z-40">
        <div className="px-5 py-5 border-b border-white/10">
          <p className="font-semibold text-white text-sm truncate">{name}</p>
          <span className="mt-1 inline-block px-2 py-0.5 rounded-full text-xs font-medium capitalize bg-tfs-teal/40 text-tfs-gold">
            {tier} plan
          </span>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          <NavLink href="/portal/dashboard" icon={LayoutDashboard} label="Dashboard" />
          <NavLink href="/portal/book"      icon={CalendarPlus}    label="Book a Session" />
          <NavLink href="/portal/history"   icon={History}         label="My Sessions" />
        </nav>

        <div className="px-3 py-4 border-t border-white/10">
          <SignOutButton />
        </div>
      </aside>

      {/* Main content area */}
      <div className="flex-1 ml-56 bg-tfs-teal-light min-h-screen">
        {children}
      </div>
    </div>
  )
}

function NavLink({
  href,
  icon: Icon,
  label,
}: {
  href: string
  icon: React.ElementType
  label: string
}) {
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
