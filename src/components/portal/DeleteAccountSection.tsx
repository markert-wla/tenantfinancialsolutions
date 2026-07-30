'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { AlertTriangle, Trash2, Undo2 } from 'lucide-react'

function fmtDate(iso: string) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
  }).format(new Date(iso))
}

export default function DeleteAccountSection({
  deletionScheduledFor,
}: {
  deletionScheduledFor: string | null
}) {
  const router = useRouter()
  const [confirming, setConfirming] = useState(false)
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState('')
  const [scheduledFor, setScheduledFor] = useState<string | null>(deletionScheduledFor)

  async function submit(action: 'request' | 'restore') {
    setLoading(true)
    setError('')
    try {
      const res  = await fetch('/api/portal/delete-account', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ action }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error ?? 'Something went wrong. Please try again.')
      setScheduledFor(action === 'request' ? (data.scheduledFor ?? null) : null)
      setConfirming(false)
      router.refresh()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (scheduledFor) {
    return (
      <div className="mt-10 border border-amber-300 bg-amber-50 rounded-2xl p-6">
        <div className="flex items-start gap-3">
          <AlertTriangle className="text-amber-600 shrink-0 mt-0.5" size={20} />
          <div className="flex-1">
            <h2 className="font-semibold text-amber-900 mb-1">Account scheduled for deletion</h2>
            <p className="text-sm text-amber-800 mb-1">
              Your account and all of your data will be permanently deleted on{' '}
              <strong>{fmtDate(scheduledFor)}</strong>. Nothing has been removed yet.
            </p>
            <p className="text-sm text-amber-800 mb-4">
              Changed your mind? Restore your account below. If you&rsquo;d like your
              information deleted sooner, <Link href="/contact" className="underline font-medium">contact us</Link>{' '}
              and we&rsquo;ll take care of it right away.
            </p>
            {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
            <button
              onClick={() => submit('restore')}
              disabled={loading}
              className="inline-flex items-center gap-2 btn-primary text-sm py-2 disabled:opacity-50"
            >
              <Undo2 size={14} />
              {loading ? 'Restoring…' : 'Restore My Account'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="mt-10 border border-gray-200 rounded-2xl p-6">
      <h2 className="font-semibold text-tfs-navy mb-1">Delete Account</h2>
      <p className="text-sm text-tfs-slate mb-4">
        Request deletion of your account and personal data. You&rsquo;ll have a 30-day
        grace period to change your mind before anything is permanently removed.
      </p>

      {!confirming ? (
        <button
          onClick={() => { setConfirming(true); setError('') }}
          className="inline-flex items-center gap-2 text-sm font-medium text-red-600 border border-red-200 rounded-lg px-4 py-2 hover:bg-red-50 transition-colors"
        >
          <Trash2 size={14} />
          Delete My Account
        </button>
      ) : (
        <div className="border border-red-200 bg-red-50 rounded-xl p-4">
          <p className="text-sm text-red-800 mb-2">
            <strong>Are you sure?</strong> Your account will be scheduled for deletion:
          </p>
          <ul className="text-sm text-red-800 list-disc pl-5 space-y-1 mb-3">
            <li>Your data stays untouched for <strong>30 days</strong> — log in any time before then and click &ldquo;Restore My Account&rdquo; to cancel.</li>
            <li>After 30 days, your account, sessions, messages, and personal information are <strong>permanently deleted</strong> and cannot be recovered.</li>
            <li>Want it gone sooner? <Link href="/contact" className="underline font-medium">Contact us</Link> to request immediate permanent deletion.</li>
          </ul>
          {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
          <div className="flex gap-3">
            <button
              onClick={() => setConfirming(false)}
              disabled={loading}
              className="btn-outline text-sm py-2"
            >
              Keep My Account
            </button>
            <button
              onClick={() => submit('request')}
              disabled={loading}
              className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
            >
              {loading ? 'Submitting…' : 'Yes, Delete My Account'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
