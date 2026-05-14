export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import BillingPortalButton from '@/components/portal/BillingPortalButton'
import UpgradeButtons from '@/components/portal/UpgradeButtons'
import ApplyPromoCode from '@/components/portal/ApplyPromoCode'
import Link from 'next/link'
import { CreditCard } from 'lucide-react'

export const metadata: Metadata = { title: 'Billing — Portal' }

const TIER_LABEL: Record<string, string> = {
  free:   'Free',
  bronze: 'Starter Plan ($50/mo)',
  silver: 'Advantage Plan ($100/mo)',
}

export default async function PortalBillingPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('plan_tier, stripe_customer_id, free_trial_expires_at, promo_code_used')
    .eq('id', user.id)
    .single()

  const tier       = profile?.plan_tier ?? 'free'
  const isPaid     = tier !== 'free'
  const hasStripe  = !!profile?.stripe_customer_id
  const isPromoUser = isPaid && !hasStripe && !!profile?.promo_code_used

  const trialExpiry = profile?.free_trial_expires_at
    ? new Date(profile.free_trial_expires_at)
    : null
  const trialActive = trialExpiry ? trialExpiry > new Date() : false

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-serif font-bold text-tfs-navy mb-1">Billing</h1>
        <p className="text-sm text-tfs-slate">Manage your subscription and payment details.</p>
      </div>

      {/* Current plan card */}
      <div className="card mb-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg bg-tfs-teal/10">
            <CreditCard className="text-tfs-teal" size={20} />
          </div>
          <div>
            <p className="text-xs text-tfs-slate">Current plan</p>
            <p className="font-bold text-tfs-navy">{TIER_LABEL[tier] ?? tier}</p>
          </div>
        </div>

        {tier === 'free' && trialExpiry && (
          <p className="text-sm text-tfs-slate mb-4">
            {trialActive
              ? <>Free trial active — expires <strong className="text-tfs-navy">{trialExpiry.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</strong>.</>
              : <span className="text-red-600 font-medium">Your free trial has expired.</span>
            }
          </p>
        )}

        {isPaid && hasStripe ? (
          <div className="space-y-3">
            <BillingPortalButton />
            {tier === 'bronze' && <UpgradeButtons currentTier={tier} />}
          </div>
        ) : isPromoUser ? (
          <div className="space-y-3">
            <p className="text-sm text-tfs-slate">
              Your <strong className="text-tfs-navy">{TIER_LABEL[tier] ?? tier}</strong> plan is provided
              through your property manager at no charge.
            </p>
            {tier === 'bronze' && <UpgradeButtons currentTier={tier} />}
          </div>
        ) : isPaid && !hasStripe ? (
          <p className="text-sm text-tfs-slate">
            Billing portal not yet linked. Contact{' '}
            <Link href="/contact" className="text-tfs-teal hover:underline">support</Link>.
          </p>
        ) : (
          <UpgradeButtons currentTier={tier} />
        )}
      </div>

      <ApplyPromoCode />

      {isPaid && (
        <p className="text-xs text-tfs-slate text-center">
          Changes take effect at the start of your next billing cycle.
          Need help?{' '}
          <Link href="/contact" className="text-tfs-teal hover:underline">Contact us</Link>.
        </p>
      )}
    </div>
  )
}
