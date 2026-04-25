'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Save, Mail, User } from 'lucide-react'
import { TIMEZONES } from '@/lib/timezones'
import ChangePasswordForm from '@/components/settings/ChangePasswordForm'
import PhotoUpload from '@/components/settings/PhotoUpload'

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
]

const CLIENT_TYPE_LABELS: Record<string, string> = {
  individual:          'Individual',
  couple:              'Couple',
  nonprofit_individual:'Non-Profit',
  property_tenant:     'Property Tenant',
}

type Props = {
  authEmail: string
  userId: string
  profile: {
    first_name: string
    last_name: string
    timezone: string
    unit_number: string | null
    birthday_month: number | null
    contact_email: string | null
    client_type: string | null
    plan_tier: string
    photo_url: string | null
    bio: string | null
  }
}

const INPUT = 'w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-tfs-teal'

export default function PortalProfileForm({ authEmail, userId, profile }: Props) {
  const router = useRouter()
  const [form, setForm] = useState({
    first_name:     profile.first_name,
    last_name:      profile.last_name,
    timezone:       profile.timezone,
    unit_number:    profile.unit_number ?? '',
    birthday_month: profile.birthday_month ? String(profile.birthday_month) : '',
    contact_email:  profile.contact_email ?? '',
    photo_url:      profile.photo_url ?? '',
    bio:            profile.bio ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  function set(key: string, value: string) {
    setForm(f => ({ ...f, [key]: value }))
    setSuccess(false)
    setError('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    setSuccess(false)

    const res = await fetch('/api/portal/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        first_name:     form.first_name.trim(),
        last_name:      form.last_name.trim(),
        timezone:       form.timezone,
        unit_number:    form.unit_number.trim() || null,
        birthday_month: form.birthday_month ? Number(form.birthday_month) : null,
        contact_email:  form.contact_email.trim() || null,
        photo_url:      form.photo_url.trim() || null,
        bio:            form.bio.trim() || null,
      }),
    })

    setSaving(false)
    if (res.ok) {
      setSuccess(true)
      router.refresh()
    } else {
      const data = await res.json().catch(() => ({}))
      setError(data.error ?? 'Failed to save. Please try again.')
    }
  }

  return (
    <div className="space-y-8">
    <form onSubmit={handleSubmit} className="space-y-8">

      {/* Account info (read-only) */}
      <div className="card">
        <h2 className="font-serif font-bold text-tfs-navy text-lg mb-4 flex items-center gap-2">
          <Mail size={18} /> Account
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-tfs-slate mb-1">Login Email</label>
            <p className="text-sm text-tfs-navy font-medium bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5">
              {authEmail}
            </p>
            <p className="text-xs text-tfs-slate mt-1">This is your sign-in email and cannot be changed here.</p>
          </div>
          <div>
            <label className="block text-xs font-medium text-tfs-slate mb-1">Contact / Notification Email <span className="font-normal">(optional)</span></label>
            <input
              type="email"
              value={form.contact_email}
              onChange={e => set('contact_email', e.target.value)}
              placeholder="your@businessemail.com"
              className={INPUT}
            />
            <p className="text-xs text-tfs-slate mt-1">Used for session reminders. Leave blank to use your login email.</p>
          </div>
        </div>

        {profile.client_type && (
          <div className="mt-4 flex items-center gap-2">
            <span className="text-xs font-medium text-tfs-slate">Account type:</span>
            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-tfs-teal/10 text-tfs-teal">
              {CLIENT_TYPE_LABELS[profile.client_type] ?? profile.client_type}
            </span>
            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-tfs-gold/20 text-tfs-navy capitalize ml-1">
              {profile.plan_tier} plan
            </span>
          </div>
        )}
      </div>

      {/* Personal info */}
      <div className="card">
        <h2 className="font-serif font-bold text-tfs-navy text-lg mb-4 flex items-center gap-2">
          <User size={18} /> Personal Info
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-tfs-slate mb-1">First Name *</label>
            <input
              type="text"
              value={form.first_name}
              onChange={e => set('first_name', e.target.value)}
              required
              className={INPUT}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-tfs-slate mb-1">Last Name *</label>
            <input
              type="text"
              value={form.last_name}
              onChange={e => set('last_name', e.target.value)}
              required
              className={INPUT}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-tfs-slate mb-1">Timezone *</label>
            <select value={form.timezone} onChange={e => set('timezone', e.target.value)} className={INPUT}>
              {TIMEZONES.map(tz => (
                <option key={tz} value={tz}>{tz.replace('America/', '').replace(/_/g, ' ')}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-tfs-slate mb-1">Unit Number <span className="font-normal">(optional)</span></label>
            <input
              type="text"
              value={form.unit_number}
              onChange={e => set('unit_number', e.target.value)}
              placeholder="e.g. 4B"
              className={INPUT}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-tfs-slate mb-1">Birthday Month <span className="font-normal">(optional)</span></label>
            <select value={form.birthday_month} onChange={e => set('birthday_month', e.target.value)} className={INPUT}>
              <option value="">— Select —</option>
              {MONTHS.map((m, i) => (
                <option key={m} value={String(i + 1)}>{m}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-tfs-slate mb-1">Profile Photo <span className="font-normal">(optional)</span></label>
            <PhotoUpload
              userId={userId}
              currentUrl={form.photo_url || null}
              onUpload={url => set('photo_url', url)}
              onRemove={() => set('photo_url', '')}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-tfs-slate mb-1">Short Bio <span className="font-normal">(optional)</span></label>
            <textarea
              value={form.bio}
              onChange={e => set('bio', e.target.value)}
              rows={3}
              placeholder="A brief note about yourself…"
              className={INPUT + ' resize-y'}
            />
          </div>
        </div>
      </div>

      {/* Save */}
      <div className="flex items-center gap-4">
        <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2">
          <Save size={16} />
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
        {success && <p className="text-sm text-green-600 font-medium">Profile saved!</p>}
        {error   && <p className="text-sm text-red-600">{error}</p>}
      </div>
    </form>
    <ChangePasswordForm authEmail={authEmail} />
    </div>
  )
}
