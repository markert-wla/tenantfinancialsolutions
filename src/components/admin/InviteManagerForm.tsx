'use client'
import { useState } from 'react'
import { CheckCircle2 } from 'lucide-react'

export default function InviteManagerForm() {
  const [form, setForm] = useState({ email: '', first_name: '', last_name: '' })
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [error, setError]   = useState('')

  function update(k: string, v: string) { setForm(f => ({ ...f, [k]: v })) }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('loading')
    setError('')
    try {
      const res = await fetch('/api/admin/managers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed')
      setStatus('done')
      setForm({ email: '', first_name: '', last_name: '' })
    } catch (err: any) {
      setError(err.message)
      setStatus('error')
    }
  }

  if (status === 'done') {
    return (
      <div className="text-center py-6">
        <CheckCircle2 className="text-tfs-teal mx-auto mb-2" size={32} />
        <p className="font-semibold text-tfs-navy">Invitation sent!</p>
        <p className="text-sm text-tfs-slate mt-1">They&apos;ll receive an email to set their password.</p>
        <button onClick={() => setStatus('idle')} className="mt-4 text-sm text-tfs-teal hover:underline">
          Invite another
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-tfs-navy mb-1">First Name *</label>
          <input required type="text" value={form.first_name} onChange={e => update('first_name', e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-tfs-teal" />
        </div>
        <div>
          <label className="block text-xs font-medium text-tfs-navy mb-1">Last Name *</label>
          <input required type="text" value={form.last_name} onChange={e => update('last_name', e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-tfs-teal" />
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium text-tfs-navy mb-1">Email *</label>
        <input required type="email" value={form.email} onChange={e => update('email', e.target.value)}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-tfs-teal" />
      </div>

      {status === 'error' && (
        <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
      )}

      <button type="submit" disabled={status === 'loading'} className="btn-primary w-full text-sm disabled:opacity-50">
        {status === 'loading' ? 'Sending…' : 'Send Invitation'}
      </button>
    </form>
  )
}
