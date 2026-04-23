'use client'
import { useState } from 'react'
import { CheckCircle2, MessageSquare } from 'lucide-react'

export default function TestimonialForm({ defaultName }: { defaultName: string }) {
  const [quote, setQuote]         = useState('')
  const [displayName, setDisplay] = useState(defaultName)
  const [status, setStatus]       = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [error, setError]         = useState('')

  if (status === 'done') {
    return (
      <div className="card text-center py-12">
        <CheckCircle2 className="text-tfs-teal mx-auto mb-3" size={40} />
        <h2 className="text-xl font-bold text-tfs-navy font-serif mb-2">Thank you!</h2>
        <p className="text-tfs-slate text-sm">
          Your story is pending review and will appear on our homepage once approved.
        </p>
      </div>
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!quote.trim()) return
    setStatus('loading')
    setError('')
    try {
      const res = await fetch('/api/portal/testimonial', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quote: quote.trim(), client_name: displayName.trim() || defaultName }),
      })
      if (!res.ok) throw new Error((await res.json()).error ?? 'Failed')
      setStatus('done')
    } catch (err: any) {
      setError(err.message ?? 'Something went wrong. Please try again.')
      setStatus('error')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card space-y-5">
      <div className="flex items-center gap-2 mb-2">
        <MessageSquare size={20} className="text-tfs-teal" />
        <span className="font-semibold text-tfs-navy">Your testimonial</span>
      </div>

      <div>
        <label className="block text-sm font-medium text-tfs-navy mb-1">
          Your story <span className="text-red-500">*</span>
        </label>
        <textarea
          required
          rows={5}
          value={quote}
          onChange={e => setQuote(e.target.value)}
          maxLength={500}
          placeholder="Tell us how coaching has helped you…"
          className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-tfs-teal resize-none"
        />
        <p className="text-xs text-tfs-slate mt-1">{quote.length}/500 characters</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-tfs-navy mb-1">Display name</label>
        <input
          type="text"
          value={displayName}
          onChange={e => setDisplay(e.target.value)}
          className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-tfs-teal"
        />
        <p className="text-xs text-tfs-slate mt-1">This name will appear with your testimonial.</p>
      </div>

      {status === 'error' && (
        <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-4 py-3">{error}</p>
      )}

      <button
        type="submit"
        disabled={status === 'loading' || !quote.trim()}
        className="btn-primary w-full disabled:opacity-50"
      >
        {status === 'loading' ? 'Submitting…' : 'Submit Testimonial'}
      </button>
    </form>
  )
}
