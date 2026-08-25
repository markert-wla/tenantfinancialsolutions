'use client'

import { useState } from 'react'

export default function BirthdayTestButton() {
  const [email, setEmail] = useState('michael@tenantfinancialsolutions.com')
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  async function handleSend() {
    setStatus('sending')
    setErrorMsg('')
    try {
      const res = await fetch('/api/admin/test-birthday-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: email }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Unknown error')
      }
      setStatus('sent')
    } catch (err: any) {
      setErrorMsg(err.message)
      setStatus('error')
    }
  }

  return (
    <div className="mb-8 p-4 rounded-xl border border-tfs-teal bg-tfs-teal-light flex flex-col sm:flex-row sm:items-center gap-3">
      <div className="flex-1">
        <p className="text-sm font-semibold text-tfs-navy mb-0.5">Send a test birthday email</p>
        <p className="text-xs text-tfs-slate">
          Sends the exact email clients will receive. This button can be removed from Admin any time.
        </p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <input
          type="email"
          value={email}
          onChange={e => { setEmail(e.target.value); setStatus('idle') }}
          className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-tfs-navy focus:outline-none focus:ring-2 focus:ring-tfs-teal w-64"
          placeholder="Email address"
        />
        <button
          onClick={handleSend}
          disabled={status === 'sending' || !email.includes('@')}
          className="btn-primary text-sm px-4 py-1.5 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
        >
          {status === 'sending' ? 'Sending…' : 'Send Test'}
        </button>
      </div>
      {status === 'sent' && (
        <p className="text-xs text-green-600 font-medium sm:ml-2">✓ Sent! Check your inbox.</p>
      )}
      {status === 'error' && (
        <p className="text-xs text-red-600 sm:ml-2">Error: {errorMsg}</p>
      )}
    </div>
  )
}
