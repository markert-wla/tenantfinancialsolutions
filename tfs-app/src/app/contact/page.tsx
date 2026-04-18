'use client'
import { Suspense, useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Mail, Send } from 'lucide-react'

const INQUIRY_TYPES = [
  { value: 'individual',        label: 'Individual and/or Couples Membership' },
  { value: 'property-manager',  label: 'Property Manager Partnership' },
  { value: 'nonprofit',         label: 'Non-Profit Partnership' },
  { value: 'general',           label: 'General Inquiry' },
]

function ContactForm() {
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

export default function ContactPage() {
  return (
    <>
      <section
        className="pt-28 pb-20 px-4 text-white text-center"
        style={{ background: 'linear-gradient(135deg, #1D9E75 0%, #1A2B4A 100%)' }}
      >
        <div className="max-w-2xl mx-auto">
          <h1 className="text-5xl font-serif font-bold mb-4">Get in Touch</h1>
          <p className="text-white/80 text-xl mb-8">Questions? Ready to partner? We&apos;d love to hear from you.</p>
          <Link
            href="/register?tier=free"
            className="inline-block bg-tfs-gold text-tfs-navy font-bold text-lg px-10 py-4 rounded-xl shadow-lg hover:brightness-105 hover:scale-105 transition-all duration-200"
          >
            Step into your free Connection Session
          </Link>
        </div>
      </section>

      <section className="py-20 bg-white px-4">
        <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-14">
          <div>
            <h2 className="section-heading mb-6">Contact Information</h2>
            <div className="space-y-5 text-tfs-slate">
              <div className="flex items-center gap-3">
                <Mail className="text-tfs-teal shrink-0" size={20} />
                <a href="mailto:tenantfinancialsolutions@gmail.com" className="hover:text-tfs-teal transition-colors">
                  tenantfinancialsolutions@gmail.com
                </a>
              </div>
            </div>

            <div className="mt-10 p-6 rounded-2xl bg-tfs-teal-light">
              <h3 className="font-bold text-tfs-navy mb-3 font-serif">Looking for a specific team?</h3>
              <ul className="space-y-2 text-sm text-tfs-slate">
                <li>&bull; <strong>Individuals and/or Couples</strong> &mdash; select &quot;Individual and/or Couples Membership&quot; below</li>
                <li>&bull; <strong>Property Managers</strong> &mdash; select &quot;Property Manager Partnership&quot;</li>
                <li>&bull; <strong>Non-Profits</strong> &mdash; select &quot;Non-Profit Partnership&quot;</li>
              </ul>
            </div>
          </div>

          <div>
            <Suspense fallback={<div className="text-tfs-slate text-sm">Loading form&hellip;</div>}>
              <ContactForm />
            </Suspense>
          </div>
        </div>
      </section>
    </>
  )
}
