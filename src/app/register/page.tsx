'use client'
import { useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Check, AlertCircle, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/cn'
import { createClient } from '@/lib/supabase/client'
import { TIMEZONES } from '@/lib/timezones'

type Path = 'individual' | 'partner' | 'nonprofit'

const TIER_LABELS: Record<string, string> = {
  free:   'Free',
  bronze: 'Starter Plan ($50/mo)',
  silver: 'Advantage Plan ($100/mo)',
}

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
]

const INPUT = 'w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-tfs-teal'

function RegisterInner() {
  const params   = useSearchParams()
  const router   = useRouter()
  const supabase = createClient()

  const preselectedTier = (['free','bronze','silver'].includes(params.get('tier') ?? ''))
    ? (params.get('tier') as string)
    : 'free'

  const preselectedCoach = params.get('coach') ?? null

  const [path, setPath]         = useState<Path | null>(null)
  const [isCouple, setIsCouple] = useState(false)
  const [tier, setTier]         = useState(preselectedTier)
  const [form, setForm]         = useState({
    firstName: '', lastName: '', partnerFirstName: '', partnerLastName: '',
    email: '', password: '', timezone: 'America/New_York',
    promoCode: '', unitNumber: '', birthdayMonth: '', anniversaryMonth: '',
  })
  const [codeStatus, setCodeStatus] = useState<'idle'|'checking'|'valid'|'invalid'>('idle')
  const [codeInfo, setCodeInfo]     = useState<{ assigned_tier: string; discount_percent: number | null; partner_name: string | null } | null>(null)
  const [error, setError]           = useState(
    params.get('cancelled') === '1'
      ? 'Payment was cancelled. You can try again or choose a free plan.'
      : ''
  )
  const [loading, setLoading]       = useState(false)

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

  function clientType(): string {
    if (path === 'partner')   return 'property_tenant'
    if (path === 'nonprofit') return 'nonprofit_individual'
    return isCouple ? 'couple' : 'individual'
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if ((path === 'partner' || path === 'nonprofit') && codeStatus !== 'valid') {
      setError('Please enter and validate your promo code.')
      return
    }
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
          email:              form.email,
          password:           form.password,
          firstName:          form.firstName,
          lastName:           form.lastName,
          partnerFirstName:   isCouple ? form.partnerFirstName : null,
          partnerLastName:    isCouple ? form.partnerLastName  : null,
          timezone:           form.timezone,
          tier:               path === 'individual' ? tier : (codeInfo?.assigned_tier ?? 'free'),
          clientType:         clientType(),
          promoCode:          (path === 'partner' || path === 'nonprofit') ? form.promoCode.trim().toUpperCase() : null,
          unitNumber:         path === 'partner' ? form.unitNumber.trim() : null,
          birthdayMonth:      !isCouple && form.birthdayMonth ? parseInt(form.birthdayMonth) : null,
          anniversaryMonth:   isCouple && form.anniversaryMonth ? parseInt(form.anniversaryMonth) : null,
          coachId:            preselectedCoach,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? 'Registration failed. Please try again.')
        return
      }

      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email: form.email,
        password: form.password,
      })

      if (signInErr) {
        router.push('/login?registered=1')
        return
      }

      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl
        return
      }

      window.location.href = '/portal/dashboard'
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
            {preselectedCoach && (
              <p className="mt-3 text-tfs-gold text-sm font-medium">
                You&apos;ll be paired with your selected coach after signing up.
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { id: 'individual', couple: false, title: 'Individual',          desc: "I'm signing up for myself",               note: 'Free, Starter, or Advantage plan' },
              { id: 'individual', couple: true,  title: 'Couples',             desc: "I'm signing up with my partner",          note: 'Free, Starter, or Advantage plan' },
              { id: 'partner',    couple: false, title: 'Property Tenant',     desc: 'My property manager provided a code',     note: 'Requires promo code + unit #' },
              { id: 'nonprofit',  couple: false, title: 'Non-Profit Resident', desc: 'My organization provided a code',         note: 'Requires promo code' },
            ].map(opt => (
              <button
                key={`${opt.id}-${opt.couple}`}
                onClick={() => { setPath(opt.id as Path); setIsCouple(opt.couple) }}
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
          onClick={() => { setPath(null); setIsCouple(false); setCodeStatus('idle'); setCodeInfo(null) }}
          className="text-tfs-teal text-sm mb-6 hover:underline"
        >
          ← Back
        </button>

        <h2 className="text-2xl font-serif font-bold text-tfs-navy mb-1">
          {path === 'individual' && !isCouple ? 'Individual Registration' :
           path === 'individual' && isCouple  ? 'Couples Registration' :
           path === 'partner'                 ? 'Property Tenant Registration' :
                                                'Non-Profit Resident Registration'}
        </h2>
        <p className="text-tfs-slate text-sm mb-6">
          {path === 'individual' ? 'Start free — your first Connection Session is on us.' :
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
                  {codeStatus === 'checking' ? '…' : 'Validate'}
                </button>
              </div>

              {codeStatus === 'valid' && (
                <div className="mt-2 flex items-center gap-2 text-green-600 text-sm">
                  <Check size={16} />
                  Code valid — {codeInfo ? (TIER_LABELS[codeInfo.assigned_tier] ?? codeInfo.assigned_tier) : ''} assigned
                </div>
              )}
              {codeStatus === 'invalid' && (
                <div className="mt-2 flex items-center gap-2 text-red-600 text-sm">
                  <AlertCircle size={16} />
                  Invalid, expired, or fully used code.{' '}
                  <button type="button" onClick={() => setPath('individual')} className="underline">
                    Continue as individual
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
                className={INPUT}
              />
              <p className="text-xs text-gray-400 mt-1">Used only for eligibility verification if needed.</p>
            </div>
          )}

          {/* Individual: plan picker */}
          {path === 'individual' && (
            <>
              <div>
                <label className="block text-sm font-medium text-tfs-navy mb-2">Select a Plan</label>
                <div className="grid grid-cols-1 gap-2">
                  {(['free','bronze','silver'] as const).map(t => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setTier(t)}
                      className={cn(
                        'p-3 rounded-lg border-2 text-sm font-medium transition-colors text-left',
                        tier === t
                          ? 'border-tfs-teal bg-tfs-teal/10 text-tfs-teal'
                          : 'border-gray-200 text-tfs-slate hover:border-tfs-teal/50'
                      )}
                    >
                      {TIER_LABELS[t]}
                      {t === 'free' && (
                        <span className="block text-xs font-normal mt-0.5 opacity-75">
                          Includes 1 free Connection Session + 1 group session
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Name */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-tfs-navy mb-1">
                {isCouple ? 'Your First Name' : 'First Name'} *
              </label>
              <input required type="text" value={form.firstName}
                onChange={e => update('firstName', e.target.value)} className={INPUT} />
            </div>
            <div>
              <label className="block text-sm font-medium text-tfs-navy mb-1">
                {isCouple ? 'Your Last Name' : 'Last Name'} *
              </label>
              <input required type="text" value={form.lastName}
                onChange={e => update('lastName', e.target.value)} className={INPUT} />
            </div>
          </div>

          {/* Partner name (couples only) */}
          {isCouple && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-tfs-navy mb-1">Partner&apos;s First Name *</label>
                <input required type="text" value={form.partnerFirstName}
                  onChange={e => update('partnerFirstName', e.target.value)} className={INPUT} />
              </div>
              <div>
                <label className="block text-sm font-medium text-tfs-navy mb-1">Partner&apos;s Last Name *</label>
                <input required type="text" value={form.partnerLastName}
                  onChange={e => update('partnerLastName', e.target.value)} className={INPUT} />
              </div>
            </div>
          )}

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-tfs-navy mb-1">Email *</label>
            <input required type="email" value={form.email}
              onChange={e => update('email', e.target.value)}
              pattern="[^\s@]+@[^\s@]+\.[^\s@]+"
              title="Please enter a valid email address (e.g. name@example.com)"
              className={INPUT} />
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-tfs-navy mb-1">Password *</label>
            <input required type="password" value={form.password}
              onChange={e => update('password', e.target.value)}
              minLength={8} placeholder="Minimum 8 characters" className={INPUT} />
          </div>

          {/* Timezone */}
          <div>
            <label className="block text-sm font-medium text-tfs-navy mb-1">Your Timezone *</label>
            <select value={form.timezone} onChange={e => update('timezone', e.target.value)}
              className={INPUT + ' bg-white'}>
              {TIMEZONES.map(tz => (
                <option key={tz} value={tz}>{tz.replace('America/', '').replace(/_/g, ' ')}</option>
              ))}
            </select>
          </div>

          {/* Birthday / Anniversary month */}
          <div>
            <label className="block text-sm font-medium text-tfs-navy mb-1">
              {isCouple ? 'Anniversary Month' : 'Birthday Month'}{' '}
              <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <select
              value={isCouple ? form.anniversaryMonth : form.birthdayMonth}
              onChange={e => update(isCouple ? 'anniversaryMonth' : 'birthdayMonth', e.target.value)}
              className={INPUT + ' bg-white'}
            >
              <option value="">Select month</option>
              {MONTHS.map((m, i) => (
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
            {loading
              ? 'Creating account…'
              : path === 'individual' && tier !== 'free'
                ? 'Create Account & Continue to Payment'
                : 'Create Account'}
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
        <p className="text-white text-lg">Loading…</p>
      </div>
    }>
      <RegisterInner />
    </Suspense>
  )
}
