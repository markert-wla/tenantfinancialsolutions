'use client'
import { useState } from 'react'
import { ArrowUpRight } from 'lucide-react'

const PLANS = [
  { tier: 'bronze', label: 'Starter Plan', price: '$50/mo' },
  { tier: 'silver', label: 'Advantage Plan', price: '$100/mo' },
] as const

export default function UpgradeButtons({ currentTier }: { currentTier: string }) {
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError]     = useState('')

  const plans = PLANS.filter(p => p.tier !== currentTier)

  async function handleUpgrade(tier: string) {
    setLoading(tier)
    setError('')
    try {
      const res  = await fetch('/api/portal/upgrade', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ tier }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed')
      window.location.href = data.checkoutUrl
    } catch (err: any) {
      setError(err.message ?? 'Could not start upgrade. Please try again.')
      setLoading(null)
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-tfs-slate">
        Upgrade to unlock more coaching sessions and priority scheduling.
      </p>
      <div className="flex flex-wrap gap-3">
        {plans.map(plan => (
          <button
            key={plan.tier}
            onClick={() => handleUpgrade(plan.tier)}
            disabled={!!loading}
            className="inline-flex items-center gap-2 btn-primary text-sm py-2 disabled:opacity-50"
          >
            <ArrowUpRight size={14} />
            {loading === plan.tier
              ? 'Redirecting…'
              : `Upgrade to ${plan.label} — ${plan.price}`}
          </button>
        ))}
      </div>
      {error && <p className="text-red-600 text-sm">{error}</p>}
    </div>
  )
}
