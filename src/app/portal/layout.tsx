export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { LayoutDashboard, CalendarPlus, History, UserCircle, Users, MessageSquare, CreditCard } from 'lucide-react'
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

  // Non-admin non-clients don't belong in the portal
  if (profile?.role === 'coach')            redirect('/coach/dashboard')
  if (profile?.role === 'property_manager') redirect('/manager/dashboard')

  const isAdminPreview = profile?.role === 'admin'

  const tier = profile?.plan_tier ?? 'free'
  const TIER_LABEL: Record<string, string> = { free: 'Free', bronze: 'Starter Plan', silver: 'Advantage Plan' }
  const tierLabel = TIER_LABEL[tier] ?? tier
  const name = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || user.email

  return (
    <div className="flex min-h-screen pt-16">
      {/* Sidebar — fixed, sits below the global Navbar */}
      <aside className="w-56 shrink-0 bg-tfs-navy text-white flex flex-col fixed left-0 top-16 bottom-0 z-40">
        <div className="px-5 py-5 border-b border-white/10">
          <p className="font-semibold text-white text-sm truncate">{name}</p>
          <span className="mt-1 inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-tfs-teal/40 text-tfs-gold">
            {tierLabel}
          </span>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          <NavLink href="/portal/dashboard"      icon={LayoutDashboard} label="Dashboard" />
          <NavLink href="/portal/book"          icon={CalendarPlus}    label="Book a Session" />
          <NavLink href="/portal/history"       icon={History}         label="My Sessions" />
          <NavLink href="/portal/group-sessions" icon={Users}          label="Group Sessions" />
          <NavLink href="/portal/profile"       icon={UserCircle}      label="Profile" />
          <NavLink href="/portal/testimonial"   icon={MessageSquare}   label="Share Story" />
          <NavLink href="/portal/billing"       icon={CreditCard}      label="Billing" />
        </nav>

        <div className="px-3 py-4 border-t border-white/10">
          <SignOutButton />
        </div>
      </aside>

      {/* Main content area */}
      <div className="flex-1 ml-56 bg-tfs-teal-light min-h-screen">
        {isAdminPreview && (
          <div className="bg-amber-400 text-amber-900 text-xs font-semibold text-center py-1.5 tracking-wide">
            Admin Preview — viewing client portal as admin
          </div>
        )}
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
