'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Pencil, PowerOff, Power, AlertTriangle, Send, CheckCircle } from 'lucide-react'

type Coach = {
  id: string
  display_name: string
  email: string
  specialty: string | null
  bio: string | null
  bio_short: string | null
  photo_url: string | null
  timezone: string
  is_active: boolean
  email_confirmed: boolean
}

const TIMEZONES = [
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Phoenix',
  'America/Anchorage',
  'Pacific/Honolulu',
]

function getSetupIssues(coach: Coach): string[] {
  const issues: string[] = []
  if (!coach.email_confirmed) issues.push('Invite not accepted')
  if (!coach.photo_url)       issues.push('No profile photo')
  if (!coach.bio)             issues.push('No bio')
  return issues
}

export default function CoachesClient({ coaches }: { coaches: Coach[] }) {
  const router = useRouter()
  const [showAdd, setShowAdd]           = useState(false)
  const [editCoach, setEditCoach]       = useState<Coach | null>(null)
  const [confirmDeactivate, setConfirm] = useState<Coach | null>(null)
  const [loading, setLoading]           = useState(false)
  const [error, setError]               = useState('')
  const [resendingId, setResendingId]   = useState<string | null>(null)
  const [resendDoneId, setResendDoneId] = useState<string | null>(null)

  function closeAdd()  { setShowAdd(false);  setError('') }
  function closeEdit() { setEditCoach(null); setError('') }

  async function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const fd = new FormData(e.currentTarget)
    const res = await fetch('/api/admin/coaches', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email:        fd.get('email'),
        display_name: fd.get('display_name'),
        specialty:    fd.get('specialty')  || null,
        bio_short:    fd.get('bio_short'),
        bio:          fd.get('bio'),
        timezone:     fd.get('timezone'),
      }),
    })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) { setError(data.error ?? 'Failed to create coach'); return }
    closeAdd()
    router.refresh()
  }

  async function handleEdit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!editCoach) return
    setError('')
    setLoading(true)
    const fd = new FormData(e.currentTarget)
    const res = await fetch(`/api/admin/coaches/${editCoach.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        display_name: fd.get('display_name'),
        specialty:    fd.get('specialty')  || null,
        bio_short:    fd.get('bio_short'),
        bio:          fd.get('bio'),
        timezone:     fd.get('timezone'),
      }),
    })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) { setError(data.error ?? 'Failed to update coach'); return }
    closeEdit()
    router.refresh()
  }

  async function toggleActive(coach: Coach, active: boolean) {
    setLoading(true)
    await fetch(`/api/admin/coaches/${coach.id}/deactivate`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active }),
    })
    setLoading(false)
    setConfirm(null)
    router.refresh()
  }

  async function handleResendInvite(coach: Coach) {
    setResendingId(coach.id)
    setError('')
    const res = await fetch(`/api/admin/coaches/${coach.id}/resend-invite`, { method: 'POST' })
    const data = await res.json()
    setResendingId(null)
    if (res.ok) {
      setResendDoneId(coach.id)
      setTimeout(() => setResendDoneId(null), 4000)
    } else {
      setError(data.error ?? 'Failed to resend invite')
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-serif font-bold text-tfs-navy">Coaches</h1>
        <button onClick={() => setShowAdd(true)} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> Add Coach
        </button>
      </div>

      {/* Resend success banner */}
      {resendDoneId && (
        <div className="mb-4 flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm text-green-800">
          <CheckCircle size={16} className="text-green-600 shrink-0" />
          Invite email resent successfully. Remind the coach to click the link within 24 hours.
        </div>
      )}

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="card overflow-hidden">
        {coaches.length === 0 ? (
          <p className="text-tfs-slate text-sm py-4">No coaches yet. Add your first coach above.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-3 pr-4 font-medium text-tfs-slate">Coach</th>
                  <th className="text-left py-3 pr-4 font-medium text-tfs-slate">Specialty</th>
                  <th className="text-left py-3 pr-4 font-medium text-tfs-slate">Timezone</th>
                  <th className="text-left py-3 pr-4 font-medium text-tfs-slate">Status</th>
                  <th className="text-right py-3 font-medium text-tfs-slate">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {coaches.map(coach => {
                  const issues  = getSetupIssues(coach)
                  const hasIssue = issues.length > 0
                  return (
                    <tr key={coach.id}>

                      {/* Name + email + warning */}
                      <td className="py-3 pr-4">
                        <div className="flex items-start gap-1.5">
                          {hasIssue && (
                            <span
                              title={`Setup incomplete — ${issues.join(' · ')}`}
                              className="mt-0.5 shrink-0"
                            >
                              <AlertTriangle size={14} className="text-amber-500" />
                            </span>
                          )}
                          <div>
                            <p className="font-medium text-tfs-navy">{coach.display_name}</p>
                            <p className="text-xs text-tfs-slate">{coach.email}</p>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 pr-4 text-tfs-slate">{coach.specialty ?? '—'}</td>
                      <td className="py-3 pr-4 text-xs text-tfs-slate">{coach.timezone}</td>

                      {/* Status: booking state + account state */}
                      <td className="py-3 pr-4">
                        <div className="flex flex-col gap-1 items-start">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            coach.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                          }`}>
                            {coach.is_active ? 'Active' : 'Inactive'}
                          </span>
                          {!coach.email_confirmed && (
                            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                              Invite Pending
                            </span>
                          )}
                          {coach.email_confirmed && !coach.photo_url && (
                            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-600">
                              No Photo
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3 text-right">
                        <div className="flex items-center justify-end gap-1">

                          {/* Resend invite — only for coaches who haven't confirmed */}
                          {!coach.email_confirmed && (
                            <button
                              onClick={() => handleResendInvite(coach)}
                              disabled={resendingId === coach.id}
                              className="p-1.5 rounded-lg text-tfs-slate hover:text-amber-600 hover:bg-amber-50 transition-colors disabled:opacity-50"
                              title="Resend invite email"
                            >
                              <Send size={14} className={resendingId === coach.id ? 'animate-pulse' : ''} />
                            </button>
                          )}

                          <button
                            onClick={() => setEditCoach(coach)}
                            className="p-1.5 rounded-lg text-tfs-slate hover:text-tfs-teal hover:bg-tfs-teal/10 transition-colors"
                            title="Edit"
                          >
                            <Pencil size={15} />
                          </button>

                          {coach.is_active ? (
                            <button
                              onClick={() => setConfirm(coach)}
                              className="p-1.5 rounded-lg text-tfs-slate hover:text-red-600 hover:bg-red-50 transition-colors"
                              title="Deactivate"
                            >
                              <PowerOff size={15} />
                            </button>
                          ) : (
                            <button
                              onClick={() => toggleActive(coach, true)}
                              disabled={loading}
                              className="p-1.5 rounded-lg text-tfs-slate hover:text-green-600 hover:bg-green-50 transition-colors"
                              title="Activate"
                            >
                              <Power size={15} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add modal */}
      {showAdd && (
        <Modal title="Add Coach" onClose={closeAdd}>
          <CoachForm onSubmit={handleAdd} loading={loading} error={error} />
        </Modal>
      )}

      {/* Edit modal */}
      {editCoach && (
        <Modal title="Edit Coach" onClose={closeEdit}>
          <CoachForm coach={editCoach} onSubmit={handleEdit} loading={loading} error={error} />
        </Modal>
      )}

      {/* Deactivate confirmation */}
      {confirmDeactivate && (
        <Modal title="Deactivate Coach" onClose={() => setConfirm(null)}>
          <p className="text-tfs-slate text-sm mb-2">
            <strong>{confirmDeactivate.display_name}</strong> will be hidden from the booking system and their
            availability slots will no longer appear to clients.
          </p>
          <p className="text-tfs-slate text-sm mb-6">
            All historical session and client data is preserved. This can be reversed at any time.
          </p>
          <div className="flex gap-3 justify-end">
            <button onClick={() => setConfirm(null)} className="btn-outline">Cancel</button>
            <button
              onClick={() => toggleActive(confirmDeactivate, false)}
              disabled={loading}
              className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
            >
              {loading ? 'Deactivating…' : 'Deactivate Coach'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}

function CoachForm({
  coach,
  onSubmit,
  loading,
  error,
}: {
  coach?: Coach
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void
  loading: boolean
  error: string
}) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {!coach && (
        <Field label="Email" name="email" type="email" required placeholder="coach@example.com" />
      )}
      <Field
        label="Display Name"
        name="display_name"
        defaultValue={coach?.display_name}
        required
        placeholder="Jane Smith"
      />
      <Field
        label="Specialty (optional)"
        name="specialty"
        defaultValue={coach?.specialty ?? ''}
        placeholder="e.g. Budgeting, Credit Repair"
      />
      <div>
        <label className="block text-sm font-medium text-tfs-navy mb-1">
          Summary Bio <span className="text-red-500">*</span>
        </label>
        <textarea
          name="bio_short"
          defaultValue={coach?.bio_short ?? ''}
          rows={2}
          required
          placeholder="1–2 sentence preview shown on the home page and /about…"
          className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-tfs-teal resize-none"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-tfs-navy mb-1">
          Bio <span className="text-red-500">*</span>
        </label>
        <textarea
          name="bio"
          defaultValue={coach?.bio ?? ''}
          rows={4}
          required
          placeholder="Full bio shown when a visitor clicks the coach's profile…"
          className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-tfs-teal resize-none"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-tfs-navy mb-1">
          Timezone <span className="text-red-500">*</span>
        </label>
        <select
          name="timezone"
          defaultValue={coach?.timezone ?? 'America/New_York'}
          required
          className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-tfs-teal"
        >
          {TIMEZONES.map(tz => (
            <option key={tz} value={tz}>
              {tz.replace('_', ' ')}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-4 py-3">{error}</p>
      )}

      <div className="flex justify-end pt-2">
        <button type="submit" disabled={loading} className="btn-primary">
          {loading ? 'Saving…' : coach ? 'Save Changes' : 'Invite Coach'}
        </button>
      </div>
    </form>
  )
}

function Field({
  label, name, type = 'text', defaultValue, required, placeholder,
}: {
  label: string
  name: string
  type?: string
  defaultValue?: string
  required?: boolean
  placeholder?: string
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-tfs-navy mb-1">{label}</label>
      <input
        type={type}
        name={name}
        defaultValue={defaultValue}
        required={required}
        placeholder={placeholder}
        className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-tfs-teal"
      />
    </div>
  )
}

function Modal({
  title,
  onClose,
  children,
}: {
  title: string
  onClose: () => void
  children: React.ReactNode
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="font-serif font-bold text-tfs-navy text-lg">{title}</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
            aria-label="Close"
          >
            &times;
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  )
}
