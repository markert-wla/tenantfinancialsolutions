'use client'
import { useState } from 'react'
import { Loader2 } from 'lucide-react'

export default function BuySessionButton() {
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  async function handleClick() {
    setLoading(true)
    setError('')
    try {
      const res  = await fetch('/api/portal/session-checkout', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed')
      window.location.href = data.checkoutUrl
    } catch (err: any) {
      setError(err.message ?? 'Something went wrong. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div>
      <button
        onClick={handleClick}
        disabled={loading}
        className="btn-primary text-sm flex items-center gap-2 disabled:opacity-50"
      >
        {loading && <Loader2 size={14} className="animate-spin" />}
        {loading ? 'Redirecting…' : 'Buy a Single Session'}
      </button>
      {error && <p className="text-red-600 text-sm mt-2">{error}</p>}
    </div>
  )
}
