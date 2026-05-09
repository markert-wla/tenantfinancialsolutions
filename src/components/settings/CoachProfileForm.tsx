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
  }
  coach: {
    display_name: string
    bio: string | null
    bio_short: string | null
    specialty: string | null
    photo_url: string | null
    timezone: string
    zoom_link: string | null
  }
}

const INPUT = 'w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-tfs-teal'

export default function CoachProfileForm({ authEmail, userId, profile, coach }: Props) {
  const router = useRouter()
  const [form, setForm] = useState({
    first_name:    profile.first_name,
    last_name:     profile.last_name,
    contact_email: profile.contact_email ?? '',
    display_name:  coach.display_name,
    bio:           coach.bio ?? '',
    bio_short:     coach.bio_short ?? '',
    specialty:     coach.specialty ?? '',
    photo_url:     coach.photo_url ?? '',
    timezone:      coach.timezone || profile.timezone,
    zoom_link:     coach.zoom_link ?? '',
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

    const res = await fetch('/api/coach/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        first_name:    form.first_name.trim(),
        last_name:     form.last_name.trim(),
        contact_email: form.contact_email.trim() || null,
        display_name:  form.display_name.trim(),
        bio:           form.bio.trim() || null,
        bio_short:     form.bio_short.trim() || null,
        specialty:     form.specialty.trim() || null,
        photo_url:     form.photo_url.trim() || null,
        zoom_link:     form.zoom_link.trim() || null,
        timezone:      form.timezone,
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
            <p className="text-xs text-tfs-slate mt-1">Used for booking notifications. Leave blank to use your login email.</p>
          </div>
        </div>
      </div>

      {/* Public profile */}
      <div className="card">
        <h2 className="font-serif font-bold text-tfs-navy text-lg mb-4 flex items-center gap-2">
          <User size={18} /> Coach Profile
        </h2>
        <p className="text-sm text-tfs-slate mb-4">This information is visible to clients when booking.</p>
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
            <label className="block text-xs font-medium text-tfs-slate mb-1">Display Name * <span className="font-normal">(shown to clients)</span></label>
            <input type="text" value={form.display_name} onChange={e => set('display_name', e.target.value)} required className={INPUT} placeholder="e.g. Coach Sarah" />
          </div>
          <div>
            <label className="block text-xs font-medium text-tfs-slate mb-1">Specialty <span className="font-normal">(optional)</span></label>
            <input type="text" value={form.specialty} onChange={e => set('specialty', e.target.value)} placeholder="e.g. Budgeting & Credit Repair" className={INPUT} />
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
            <label className="block text-xs font-medium text-tfs-slate mb-1">
              Short Summary <span className="font-normal">(optional — shown on coach cards)</span>
            </label>
            <textarea
              value={form.bio_short}
              onChange={e => set('bio_short', e.target.value.slice(0, 200))}
              rows={2}
              maxLength={200}
              placeholder="One or two sentences that capture your coaching style and focus area."
              className={INPUT + ' resize-none'}
            />
            <p className="text-xs text-tfs-slate mt-1 text-right">{form.bio_short.length}/200</p>
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-tfs-slate mb-1">
              Personal Zoom Link <span className="font-normal">(optional — sent to clients in booking confirmation emails)</span>
            </label>
            <input
              type="url"
              value={form.zoom_link}
              onChange={e => set('zoom_link', e.target.value)}
              placeholder="https://zoom.us/j/your-meeting-id"
              className={INPUT}
            />
            <p className="text-xs text-tfs-slate mt-1">Clients will receive this link in their booking confirmation so they can join without waiting for you to send it.</p>
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-tfs-slate mb-1">
              Full Bio <span className="font-normal">(optional — shown when clients click your card)</span>
            </label>
            <textarea
              value={form.bio}
              onChange={e => set('bio', e.target.value)}
              rows={5}
              placeholder="Your full background, approach, and what clients can expect working with you."
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
