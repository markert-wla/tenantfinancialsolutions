'use client'
import { useState } from 'react'
import { ExternalLink } from 'lucide-react'

export default function BillingPortalButton() {
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  async function handleClick() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/portal/billing-portal')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed')
      window.location.href = data.url
    } catch (err: any) {
      setError(err.message ?? 'Could not open billing portal. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className="space-y-2">
      <button
        onClick={handleClick}
        disabled={loading}
        className="inline-flex items-center gap-2 btn-primary text-sm py-2 disabled:opacity-50"
      >
        <ExternalLink size={14} />
        {loading ? 'Opening…' : 'Manage Subscription'}
      </button>
      {error && <p className="text-red-600 text-sm">{error}</p>}
    </div>
  )
}
