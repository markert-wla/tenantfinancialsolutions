'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { AlertCircle } from 'lucide-react'

function roleToPath(role: string | undefined) {
  if (role === 'admin')            return '/admin/dashboard'
  if (role === 'coach')            return '/coach/dashboard'
  if (role === 'property_manager') return '/manager/dashboard'
  return '/portal/dashboard'
}

export default function SetPasswordPage() {
  const router   = useRouter()
  const supabase = createClient()

  const [password,  setPassword]  = useState('')
  const [confirm,   setConfirm]   = useState('')
  const [error,     setError]     = useState('')
  const [loading,   setLoading]   = useState(false)
  const [ready,     setReady]     = useState(false)

  // Guard: must already have a session (set by /auth/confirm before redirect here).
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.replace('/login')
      } else {
        setReady(true)
      }
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)
    const { error: updateErr } = await supabase.auth.updateUser({ password })
    if (updateErr) {
      setError(updateErr.message)
      setLoading(false)
      return
    }

    // Fetch the session again to get role for redirect
    const { data: { session } } = await supabase.auth.getSession()
    const role = (session?.user.user_metadata?.role ?? session?.user.app_metadata?.role) as string | undefined
    router.replace(roleToPath(role))
  }

  if (!ready) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center px-4"
        style={{ background: 'linear-gradient(135deg, #1D9E75 0%, #1A2B4A 100%)' }}
      >
        <Image src="/images/logo.png" alt="Tenant Financial Solutions" width={180} height={54} className="h-12 w-auto mb-8" />
        <div className="flex items-center gap-3 text-white">
          <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          <span className="text-lg font-medium">Loading…</span>
        </div>
      </div>
    )
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4"
      style={{ background: 'linear-gradient(135deg, #1D9E75 0%, #1A2B4A 100%)' }}
    >
      <Image src="/images/logo.png" alt="Tenant Financial Solutions" width={180} height={54} className="h-12 w-auto mb-8" />

      <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl p-8">
        <h1 className="text-2xl font-serif font-bold text-tfs-navy mb-1">Create Your Password</h1>
        <p className="text-tfs-slate text-sm mb-6">
          Choose a password to secure your new account.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-tfs-navy mb-1">Password</label>
            <input
              required
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              minLength={8}
              placeholder="Minimum 8 characters"
              className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-tfs-teal"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-tfs-navy mb-1">Confirm Password</label>
            <input
              required
              type="password"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              minLength={8}
              placeholder="Re-enter your password"
              className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-tfs-teal"
            />
          </div>

          {error && (
            <div className="flex items-start gap-2 text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-4 py-3">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full py-3 disabled:opacity-50"
          >
            {loading ? 'Saving…' : 'Set Password & Continue'}
          </button>
        </form>
      </div>
    </div>
  )
}
