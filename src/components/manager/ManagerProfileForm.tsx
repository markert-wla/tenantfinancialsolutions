'use client'

import { useState } from 'react'
import { Lock } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function ManagerProfileForm({ authEmail }: { authEmail: string }) {
  const [next, setNext]       = useState('')
  const [confirm, setConfirm] = useState('')
  const [saving, setSaving]   = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError]     = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSuccess(false)

    if (next.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (next !== confirm) {
      setError('Passwords do not match.')
      return
    }

    setSaving(true)
    const supabase = createClient()
    const { error: updateErr } = await supabase.auth.updateUser({ password: next })
    setSaving(false)

    if (updateErr) {
      setError(updateErr.message)
      return
    }

    setSuccess(true)
    setNext('')
    setConfirm('')
  }

  return (
    <div className="space-y-6">
      <div className="card">
        <p className="text-sm text-tfs-slate mb-1">
          <span className="font-medium text-tfs-navy">Email:</span> {authEmail}
        </p>
        <p className="text-xs text-tfs-slate">Your email address is managed by your TFS administrator.</p>
      </div>

      <div className="card">
        <h2 className="font-serif font-bold text-tfs-navy text-lg mb-1 flex items-center gap-2">
          <Lock size={18} /> Set Password
        </h2>
        <p className="text-xs text-tfs-slate mb-5">
          Set a password so you can sign in with your email on future visits. If you already have a
          password and need to change it, use <strong>Forgot Password</strong> on the sign-in page.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-tfs-slate mb-1">New Password</label>
              <input
                type="password"
                value={next}
                onChange={e => { setNext(e.target.value); setError(''); setSuccess(false) }}
                required
                minLength={8}
                autoComplete="new-password"
                className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-tfs-teal"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-tfs-slate mb-1">Confirm Password</label>
              <input
                type="password"
                value={confirm}
                onChange={e => { setConfirm(e.target.value); setError(''); setSuccess(false) }}
                required
                autoComplete="new-password"
                className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-tfs-teal"
              />
            </div>
          </div>

          {error   && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">{error}</p>}
          {success && <p className="text-sm text-green-600 bg-green-50 border border-green-200 rounded-lg px-4 py-3">Password set successfully. You can now sign in with your email and this password.</p>}

          <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2">
            <Lock size={15} />
            {saving ? 'Saving…' : 'Set Password'}
          </button>
        </form>
      </div>
    </div>
  )
}
