'use client'
import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Send } from 'lucide-react'

const INQUIRY_TYPES = [
  { value: 'individual',        label: 'Individual and/or Couples Membership' },
  { value: 'property-manager',  label: 'Property Manager Partnership' },
  { value: 'nonprofit',         label: 'Non-Profit Partnership' },
  { value: 'workshops',         label: 'In-Person Workshops' },
  { value: 'general',           label: 'General Inquiry' },
]

function ContactFormInner() {
  const params = useSearchParams()
  const [form, setForm] = useState({
    name: '', email: '', phone: '', type: 'general', message: '',
  })
  const [status, setStatus] = useState<'idle'|'loading'|'done'|'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    const t = params.get('type')
    if (t) setForm(f => ({ ...f, type: t }))
  }, [params])

  function update(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('loading')
    setErrorMsg('')
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (res.status === 429) {
        setErrorMsg('Too many requests. Please try again later.')
        setStatus('error')
        return
      }
      if (!res.ok) throw new Error()
      setStatus('done')
    } catch {
      setErrorMsg('Something went wrong. Please try again or email us directly.')
      setStatus('error')
    }
  }

  if (status === 'done') {
    return (
      <div className="card text-center py-12">
        <div className="w-14 h-14 rounded-full bg-tfs-teal/10 flex items-center justify-center mx-auto mb-4">
          <Send className="text-tfs-teal" size={24} />
        </div>
        <h3 className="text-xl font-bold text-tfs-navy mb-2 font-serif">Message Received!</h3>
        <p className="text-tfs-slate">We&apos;ll be in touch within 1 business day.</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-tfs-navy mb-1">Full Name *</label>
          <input required type="text" value={form.name} onChange={e => update('name', e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-tfs-teal" />
        </div>
        <div>
          <label className="block text-sm font-medium text-tfs-navy mb-1">Email *</label>
          <input required type="email" value={form.email} onChange={e => update('email', e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-tfs-teal" />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-tfs-navy mb-1">Phone</label>
        <input type="tel" value={form.phone} onChange={e => update('phone', e.target.value)}
          className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-tfs-teal" />
      </div>

      <div>
        <label className="block text-sm font-medium text-tfs-navy mb-1">Inquiry Type *</label>
        <select required value={form.type} onChange={e => update('type', e.target.value)}
          className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-tfs-teal bg-white">
          {INQUIRY_TYPES.map(t => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-tfs-navy mb-1">Message *</label>
        <textarea required rows={5} value={form.message} onChange={e => update('message', e.target.value)}
          className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-tfs-teal resize-none" />
      </div>

      {errorMsg && (
        <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-4 py-3">{errorMsg}</p>
      )}

      <button type="submit" disabled={status === 'loading'} className="btn-primary w-full">
        {status === 'loading' ? 'Sending\u2026' : 'Send Message'}
      </button>
    </form>
  )
}

export default function ContactForm() {
  return (
    <Suspense fallback={<div className="text-tfs-slate text-sm">Loading form&hellip;</div>}>
      <ContactFormInner />
    </Suspense>
  )
}
