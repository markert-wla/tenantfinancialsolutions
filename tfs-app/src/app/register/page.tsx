'use client'
import { useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Check, AlertCircle, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/cn'
import { createClient } from '@/lib/supabase/client'

type Path = 'individual' | 'partner' | 'nonprofit'

const TIMEZONES = [
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Phoenix',
  'America/Anchorage',
  'Pacific/Honolulu',
]

const TIER_LABELS: Record<string, string> = {
  free: 'Free',
  bronze: 'Bronze ($50/mo)',
  silver: 'Silver ($100/mo)',
  gold: 'Gold ($150/mo)',
}

function RegisterInner() {
  const params   = useSearchParams()
  const router   = useRouter()
  const supabase = createClient()

  const preselectedTier = params.get('tier') ?? 'free'

  const [path, setPath]         = useState<Path | null>(null)
  const [tier, setTier]         = useState(preselectedTier)
  const [form, setForm]         = useState({
    firstName: '', lastName: '', email: '', password: '', timezone: 'America/New_York',
    promoCode: '', unitNumber: '', birthdayMonth: '',
  })
  const [codeStatus, setCodeStatus]   = useState<'idle'|'checking'|'valid'|'invalid'>('idle')
  const [codeInfo, setCodeInfo]       = useState<any>(null)
  const [error, setError]             = useState('')
  const [loading, setLoading]         = useState(false)

  function update(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function validateCode() {
    if (!form.promoCode.trim()) return
    setCodeStatus('checking')
    setCodeInfo(null)
    try {
      const res = await fetch('/api/codes/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: form.promoCode.trim().toUpperCase() }),
      })
      const data = await res.json()
      if (res.ok && data.valid) {
        setCodeStatus('valid')
        setCodeInfo(data)
        setTier(data.assigned_tier)
      } else {
        setCodeStatus('invalid')
      }
    } catch {
      setCodeStatus('invalid')
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    // Promo code required for partner/nonprofit paths
    if ((path === 'partner' || path === 'nonprofit') && codeStatus !== 'valid') {
      setError('Please enter and validate your promo code.')
      return
    }
    // Unit # required for PM tenants
    if (path === 'partner' && !form.unitNumber.trim()) {
      setError('Unit number is required for property management tenants.')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: form.email,
          password: form.password,
          firstName: form.firstName,
          lastName: form.lastName,
          timezone: form.timezone,
          tier: path === 'individual' ? tier : (codeInfo?.assigned_tier ?? 'free'),
          promoCode: (path === 'partner' || path === 'nonprofit') ? form.promoCode.trim().toUpperCase() : null,
          unitNumber: path === 'partner' ? form.unitNumber.trim() : null,
          birthdayMonth: form.birthdayMonth ? parseInt(form.birthdayMonth) : null,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? 'Registration failed. Please try again.')
        return
      }

      // Account created server-side — now sign in to establish a browser session
      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email: form.email,
        password: form.password,
      })

      if (signInErr) {
        // Account exists but sign-in failed — send to login
        router.push('/login?registered=1')
        return
      }

      router.push('/portal/dashboard')
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // ── Step 1: choose path ─────────────────────────────────────
  if (!path) {
    return (
      <div
        className="min-h-screen flex items-center justify-center px-4 py-20"
        style={{ background: 'linear-gradient(135deg, #1D9E75 0%, #1A2B4A 100%)' }}
      >
        <div className="w-full max-w-2xl">
          <div className="text-center mb-10">
            <h1 className="text-4xl font-serif font-bold text-white mb-3">Create Your Account</h1>
            <p className="text-white/70 text-lg">How are you joining Tenant Financial Solutions?</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { id: 'individual', title: 'Individual and/or Couples', desc: 'I\'m signing up for myself or with my partner', note: 'Free, Bronze, Silver, or Gold plan' },
              { id: 'partner',    title: 'Property Tenant', desc: 'My property manager provided a code', note: 'Requires promo code + unit #' },
              { id: 'nonprofit',  title: 'Non-Profit Resident', desc: 'My organization provided a code', note: 'Requires promo code' },
            ].map(opt => (
              <button
                key={opt.id}
                onClick={() => setPath(opt.id as Path)}
                className="bg-white/10 hover:bg-white/20 border-2 border-white/20 hover:border-white/50
                           rounded-2xl p-6 text-left text-white transition-all group"
              >
                <p className="font-bold text-lg mb-1">{opt.title}</p>
                <p className="text-sm text-white/70 mb-3">{opt.desc}</p>
                <p className="text-xs text-white/50">{opt.note}</p>
                <ChevronRight className="mt-4 text-white/50 group-hover:text-white transition-colors" size={18} />
              </button>
            ))}
          </div>

          <p className="text-center text-white/50 text-sm mt-8">
            Already have an account?{' '}
            <Link href="/login" className="text-white hover:underline">Log in</Link>
          </p>
        </div>
      </div>
    )
  }

  // ── Step 2: registration form ───────────────────────────────
  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-20"
      style={{ background: 'linear-gradient(135deg, #1D9E75 0%, #1A2B4A 100%)' }}
    >
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl p-8 md:p-10">
        <button
          onClick={() => { setPath(null); setCodeStatus('idle'); setCodeInfo(null) }}
          className="text-tfs-teal text-sm mb-6 hover:underline"
        >
          ← Back
        </button>

        <h2 className="text-2xl font-serif font-bold text-tfs-navy mb-1">
          {path === 'individual' ? 'Individual and/or Couples Registration' :
           path === 'partner'   ? 'Property Tenant Registration' :
                                  'Non-Profit Resident Registration'}
        </h2>
        <p className="text-tfs-slate text-sm mb-6">
          {path === 'individual' ? 'Choose a plan after filling in your info.' :
           'Enter your promo code first, then complete registration.'}
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Promo code (partner/nonprofit only) */}
          {(path === 'partner' || path === 'nonprofit') && (
            <div>
              <label className="block text-sm font-medium text-tfs-navy mb-1">Promo Code *</label>
              <div className="flex gap-2">
                <input
                  required
                  type="text"
                  value={form.promoCode}
                  onChange={e => { update('promoCode', e.target.value.toUpperCase()); setCodeStatus('idle'); setCodeInfo(null) }}
                  placeholder="Enter your code"
                  className="flex-1 border border-gray-200 rounded-lg px-4 py-2.5 text-sm uppercase
                             focus:outline-none focus:ring-2 focus:ring-tfs-teal"
                />
                <button
                  type="button"
                  onClick={validateCode}
                  disabled={codeStatus === 'checking' || !form.promoCode.trim()}
                  className="px-4 py-2.5 bg-tfs-teal text-white text-sm rounded-lg font-medium
                             hover:bg-tfs-teal-dark transition-colors disabled:opacity-50"
                >
                  {codeStatus === 'checking' ? '...' : 'Validate'}
                </button>
              </div>

              {codeStatus === 'valid' && (
                <div className="mt-2 flex items-center gap-2 text-green-600 text-sm">
                  <Check size={16} />
                  Code valid — {TIER_LABELS[codeInfo?.assigned_tier] ?? codeInfo?.assigned_tier} tier assigned
                </div>
              )}
              {codeStatus === 'invalid' && (
                <div className="mt-2 flex items-center gap-2 text-red-600 text-sm">
                  <AlertCircle size={16} />
                  Invalid, expired, or fully used code. You can{' '}
                  <button
                    type="button"
                    onClick={() => setPath('individual')}
                    className="underline"
                  >
                    continue as individual/couple
                  </button>
                  .
                </div>
              )}
            </div>
          )}

          {/* Unit # (PM tenants only) */}
          {path === 'partner' && codeStatus === 'valid' && (
            <div>
              <label className="block text-sm font-medium text-tfs-navy mb-1">Unit Number *</label>
              <input
                required
                type="text"
                value={form.unitNumber}
                onChange={e => update('unitNumber', e.target.value)}
                placeholder="e.g. 4B or 214"
                className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm
                           focus:outline-none focus:ring-2 focus:ring-tfs-teal"
              />
              <p className="text-xs text-gray-400 mt-1">Used only for eligibility verification if needed.</p>
            </div>
          )}

          {/* Individual tier picker */}
          {path === 'individual' && (
            <div>
              <label className="block text-sm font-medium text-tfs-navy mb-2">Select a Plan</label>
              <div className="grid grid-cols-2 gap-2">
                {['free','bronze','silver','gold'].map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTier(t)}
                    className={cn(
                      'p-3 rounded-lg border-2 text-sm font-medium transition-colors',
                      tier === t
                        ? 'border-tfs-teal bg-tfs-teal/10 text-tfs-teal'
                        : 'border-gray-200 text-tfs-slate hover:border-tfs-teal/50'
                    )}
                  >
                    {TIER_LABELS[t]}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Name row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-tfs-navy mb-1">First Name *</label>
              <input required type="text" value={form.firstName}
                onChange={e => update('firstName', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-tfs-teal" />
            </div>
            <div>
              <label className="block text-sm font-medium text-tfs-navy mb-1">Last Name *</label>
              <input required type="text" value={form.lastName}
                onChange={e => update('lastName', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-tfs-teal" />
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-tfs-navy mb-1">Email *</label>
            <input required type="email" value={form.email}
              onChange={e => update('email', e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-tfs-teal" />
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-tfs-navy mb-1">Password *</label>
            <input required type="password" value={form.password}
              onChange={e => update('password', e.target.value)}
              minLength={8}
              placeholder="Minimum 8 characters"
              className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-tfs-teal" />
          </div>

          {/* Timezone */}
          <div>
            <label className="block text-sm font-medium text-tfs-navy mb-1">Your Timezone *</label>
            <select value={form.timezone} onChange={e => update('timezone', e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-tfs-teal">
              {TIMEZONES.map(tz => (
                <option key={tz} value={tz}>{tz.replace('America/', '').replace('_', ' ')}</option>
              ))}
            </select>
          </div>

          {/* Birthday month (optional) */}
          <div>
            <label className="block text-sm font-medium text-tfs-navy mb-1">
              Birthday Month <span className="text-gray-400">(optional — unlocks your annual gift session)</span>
            </label>
            <select value={form.birthdayMonth} onChange={e => update('birthdayMonth', e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-tfs-teal">
              <option value="">Select month</option>
              {['January','February','March','April','May','June',
                'July','August','September','October','November','December'].map((m, i) => (
                <option key={m} value={i + 1}>{m}</option>
              ))}
            </select>
          </div>

          {error && (
            <div className="flex items-start gap-2 text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-4 py-3">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              {error}
            </div>
          )}

          <button type="submit" disabled={loading} className="btn-primary w-full text-base py-3">
            {loading ? 'Creating account…' : 'Create Account'}
          </button>
        </form>

        <p className="text-center text-tfs-slate text-sm mt-5">
          Already have an account?{' '}
          <Link href="/login" className="text-tfs-teal hover:underline font-medium">Log in</Link>
        </p>
      </div>
    </div>
  )
}

export default function RegisterPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center"
        style={{ background: 'linear-gradient(135deg, #1D9E75 0%, #1A2B4A 100%)' }}>
        <p className="text-white text-lg">Loading&hellip;</p>
      </div>
    }>
      <RegisterInner />
    </Suspense>
  )
}
