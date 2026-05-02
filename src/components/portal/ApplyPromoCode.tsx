'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Tag, CheckCircle } from 'lucide-react'

const TIER_LABEL: Record<string, string> = {
  bronze: 'Starter Plan',
  silver: 'Advantage Plan',
}

export default function ApplyPromoCode() {
  const router = useRouter()
  const [code, setCode]       = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const [success, setSuccess] = useState('')

  async function handleApply(e: React.FormEvent) {
    e.preventDefault()
    if (!code.trim()) return
    setLoading(true)
    setError('')
    setSuccess('')

    const res = await fetch('/api/portal/apply-promo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: code.trim().toUpperCase() }),
    })
    const data = await res.json()
    setLoading(false)

    if (!res.ok) {
      setError(data.error ?? 'Failed to apply code.')
    } else {
      const label = TIER_LABEL[data.newTier] ?? data.newTier
      setSuccess(`Code applied! Your plan has been upgraded to ${label}.`)
      setCode('')
      router.refresh()
    }
  }

  return (
    <div className="card mt-6">
      <div className="flex items-center gap-2 mb-3">
        <Tag size={16} className="text-tfs-teal" />
        <p className="font-semibold text-tfs-navy text-sm">Have a promo code?</p>
      </div>
      <p className="text-xs text-tfs-slate mb-4">
        If your property manager or organisation provided a code, enter it here to unlock your plan.
      </p>

      {success ? (
        <div className="flex items-center gap-2 text-green-700 bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-sm">
          <CheckCircle size={16} className="shrink-0" />
          {success}
        </div>
      ) : (
        <form onSubmit={handleApply} className="flex gap-2">
          <input
            type="text"
            value={code}
            onChange={e => { setCode(e.target.value.toUpperCase()); setError('') }}
            placeholder="Enter code"
            className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm uppercase tracking-wider focus:outline-none focus:ring-2 focus:ring-tfs-teal"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !code.trim()}
            className="btn-primary text-sm px-4 py-2 disabled:opacity-50"
          >
            {loading ? 'Applying…' : 'Apply'}
          </button>
        </form>
      )}

      {error && (
        <p className="mt-2 text-xs text-red-600">{error}</p>
      )}
    </div>
  )
}
