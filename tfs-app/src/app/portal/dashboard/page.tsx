import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export default async function PortalDashboard() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('first_name, last_name, plan_tier, sessions_used_this_month')
    .eq('id', user.id)
    .single()

  const LIMITS: Record<string, number> = { free: 0, bronze: 1, silver: 2, gold: 4 }
  const tier = profile?.plan_tier ?? 'free'
  const used = profile?.sessions_used_this_month ?? 0
  const limit = LIMITS[tier]

  return (
    <div className="min-h-screen bg-tfs-teal-light pt-20">
      <div className="max-w-5xl mx-auto px-4 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-serif font-bold text-tfs-navy mb-1">
            Welcome back, {profile?.first_name ?? 'there'}!
          </h1>
          <span className="inline-block px-3 py-1 rounded-full text-sm font-semibold capitalize
                           bg-tfs-teal text-white">
            {tier} Plan
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <div className="card">
            <p className="text-sm text-tfs-slate mb-1">Sessions this month</p>
            <p className="text-3xl font-bold text-tfs-navy">
              {used}
              <span className="text-lg font-normal text-tfs-slate"> / {limit === 0 ? '—' : limit}</span>
            </p>
            {tier === 'free' && (
              <p className="text-xs text-tfs-slate mt-1">Upgrade to book individual sessions</p>
            )}
          </div>

          <div className="card col-span-2 flex items-center justify-between">
            <div>
              <p className="text-sm text-tfs-slate mb-1">Ready to book?</p>
              {used >= limit && tier !== 'free' ? (
                <p className="text-tfs-navy font-medium text-sm">
                  Monthly sessions used. Book an additional session or{' '}
                  <Link href="/services" className="text-tfs-teal hover:underline">upgrade your plan</Link>.
                </p>
              ) : tier === 'free' ? (
                <p className="text-tfs-navy font-medium text-sm">
                  <Link href="/services" className="text-tfs-teal hover:underline">Upgrade your plan</Link>{' '}
                  to book individual sessions.
                </p>
              ) : (
                <p className="text-tfs-navy font-medium">
                  You have {limit - used} session{limit - used !== 1 ? 's' : ''} remaining this month.
                </p>
              )}
            </div>
            <Link href="/portal/book"
              className={used >= limit && tier === 'free'
                ? 'btn-outline text-sm opacity-50 pointer-events-none'
                : 'btn-primary text-sm'}>
              Book a Session
            </Link>
          </div>
        </div>

        <div className="card">
          <h2 className="font-serif font-bold text-tfs-navy text-xl mb-4">Your Upcoming Sessions</h2>
          <p className="text-tfs-slate text-sm">No upcoming sessions. Book one above!</p>
        </div>
      </div>
    </div>
  )
}
