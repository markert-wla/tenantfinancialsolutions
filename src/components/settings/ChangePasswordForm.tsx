'use client'

import { useState } from 'react'
import { Lock } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function ChangePasswordForm({ authEmail }: { authEmail: string }) {
  const [form, setForm] = useState({ current: '', next: '', confirm: '' })
  const [saving, setSaving]   = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError]     = useState('')

  function set(key: string, value: string) {
    setForm(f => ({ ...f, [key]: value }))
    setSuccess(false)
    setError('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSuccess(false)

    if (form.next.length < 8) {
      setError('New password must be at least 8 characters.')
      return
    }
    if (form.next !== form.confirm) {
      setError('New passwords do not match.')
      return
    }

    setSaving(true)
    const supabase = createClient()

    // Re-authenticate with current password to verify identity
    const { error: signInErr } = await supabase.auth.signInWithPassword({
      email: authEmail,
      password: form.current,
    })

    if (signInErr) {
      setSaving(false)
      setError('Current password is incorrect.')
      return
    }

    const { error: updateErr } = await supabase.auth.updateUser({ password: form.next })
    setSaving(false)

    if (updateErr) {
      setError(updateErr.message)
      return
    }

    setSuccess(true)
    setForm({ current: '', next: '', confirm: '' })
  }

  return (
    <div className="card">
      <h2 className="font-serif font-bold text-tfs-navy text-lg mb-4 flex items-center gap-2">
        <Lock size={18} /> Change Password
      </h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-tfs-slate mb-1">Current Password *</label>
            <input
              type="password"
              value={form.current}
              onChange={e => set('current', e.target.value)}
              required
              autoComplete="current-password"
              className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-tfs-teal"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-tfs-slate mb-1">New Password *</label>
            <input
              type="password"
              value={form.next}
              onChange={e => set('next', e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
              className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-tfs-teal"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-tfs-slate mb-1">Confirm New Password *</label>
            <input
              type="password"
              value={form.confirm}
              onChange={e => set('confirm', e.target.value)}
              required
              autoComplete="new-password"
              className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-tfs-teal"
            />
          </div>
        </div>

        {error   && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">{error}</p>}
        {success && <p className="text-sm text-green-600 bg-green-50 border border-green-200 rounded-lg px-4 py-3">Password updated successfully.</p>}

        <div>
          <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2">
            <Lock size={15} />
            {saving ? 'Updating…' : 'Update Password'}
          </button>
        </div>
      </form>
    </div>
  )
}
