'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Save, Mail, User } from 'lucide-react'
import { TIMEZONES } from '@/lib/timezones'
import ChangePasswordForm from '@/components/settings/ChangePasswordForm'
import PhotoUpload from '@/components/settings/PhotoUpload'

type Props = {
  authEmail: string
  userId: string
  profile: {
    first_name: string
    last_name: string
    timezone: string
    contact_email: string | null
    photo_url: string | null
    bio: string | null
  }
}

const INPUT = 'w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-tfs-teal'

export default function AdminProfileForm({ authEmail, userId, profile }: Props) {
  const router = useRouter()
  const [form, setForm] = useState({
    first_name:    profile.first_name,
    last_name:     profile.last_name,
    timezone:      profile.timezone,
    contact_email: profile.contact_email ?? '',
    photo_url:     profile.photo_url ?? '',
    bio:           profile.bio ?? '',
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

    const res = await fetch('/api/admin/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        first_name:    form.first_name.trim(),
        last_name:     form.last_name.trim(),
        timezone:      form.timezone,
        contact_email: form.contact_email.trim() || null,
        photo_url:     form.photo_url.trim() || null,
        bio:           form.bio.trim() || null,
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

      {/* Account */}
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
            <p className="text-xs text-tfs-slate mt-1">Your sign-in email — cannot be changed here.</p>
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
            <p className="text-xs text-tfs-slate mt-1">Used for system notifications. Leave blank to use your login email.</p>
          </div>
        </div>
      </div>

      {/* Personal */}
      <div className="card">
        <h2 className="font-serif font-bold text-tfs-navy text-lg mb-4 flex items-center gap-2">
          <User size={18} /> Personal Info
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-tfs-slate mb-1">First Name *</label>
            <input type="text" value={form.first_name} onChange={e => set('first_name', e.target.value)} required className={INPUT} />
          </div>
          <div>
            <label className="block text-xs font-medium text-tfs-slate mb-1">Last Name *</label>
            <input type="text" value={form.last_name} onChange={e => set('last_name', e.target.value)} required className={INPUT} />
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
            <label className="block text-xs font-medium text-tfs-slate mb-1">Profile Photo <span className="font-normal">(optional)</span></label>
            <PhotoUpload
              userId={userId}
              currentUrl={form.photo_url || null}
              onUpload={url => set('photo_url', url)}
              onRemove={() => set('photo_url', '')}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-tfs-slate mb-1">Bio <span className="font-normal">(optional)</span></label>
            <textarea
              value={form.bio}
              onChange={e => set('bio', e.target.value)}
              rows={3}
              placeholder="A short bio…"
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
        {success && <p className="text-sm text-green-600 font-medium">Settings saved!</p>}
        {error   && <p className="text-sm text-red-600">{error}</p>}
      </div>
    </form>
    <ChangePasswordForm authEmail={authEmail} />
    </div>
  )
}
