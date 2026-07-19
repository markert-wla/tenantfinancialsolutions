'use client'

import { useState } from 'react'
import { Mail, Users, Send, CheckCircle, XCircle } from 'lucide-react'

type Subscriber = {
  id: string
  email: string
  name: string | null
  subscribed_at: string
  is_active: boolean
}

export default function NewsletterClient({ subscribers }: { subscribers: Subscriber[] }) {
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<{ ok: boolean; sent?: number; error?: string } | null>(null)

  const active = subscribers.filter(s => s.is_active)

  async function handleSend() {
    if (!subject.trim() || !body.trim()) return
    if (!confirm(`Send this newsletter to ${active.length} subscriber${active.length !== 1 ? 's' : ''}?`)) return

    setSending(true)
    setResult(null)

    try {
      const paragraphs = body
        .split(/\n{2,}/)
        .map(p => p.trim())
        .filter(Boolean)
        .map(p => `<p style="margin:0 0 16px;">${p.replace(/\n/g, '<br>')}</p>`)
        .join('')

      const res = await fetch('/api/newsletter/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject: subject.trim(), html: paragraphs }),
      })
      const data = await res.json()
      if (data.ok) {
        setResult({ ok: true, sent: data.sent })
        setSubject('')
        setBody('')
      } else {
        setResult({ ok: false, error: data.error ?? 'Unknown error' })
      }
    } catch {
      setResult({ ok: false, error: 'Network error — please try again' })
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <Mail className="text-tfs-teal" size={28} />
        <h1 className="text-2xl font-bold text-slate-800">Newsletter</h1>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5 text-center">
          <p className="text-3xl font-bold text-tfs-teal">{active.length}</p>
          <p className="text-sm text-slate-500 mt-1">Active subscribers</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5 text-center">
          <p className="text-3xl font-bold text-slate-400">{subscribers.filter(s => !s.is_active).length}</p>
          <p className="text-sm text-slate-500 mt-1">Unsubscribed</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5 text-center">
          <p className="text-3xl font-bold text-slate-700">{subscribers.length}</p>
          <p className="text-sm text-slate-500 mt-1">Total all-time</p>
        </div>
      </div>

      {/* Compose */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
        <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
          <Send size={18} /> Compose Newsletter
        </h2>

        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1">Subject line</label>
          <input
            type="text"
            value={subject}
            onChange={e => setSubject(e.target.value)}
            placeholder="e.g. Your Monthly Financial Tips from TFS"
            className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-tfs-teal"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1">Message body</label>
          <textarea
            value={body}
            onChange={e => setBody(e.target.value)}
            rows={10}
            placeholder="Write your newsletter here. Separate paragraphs with a blank line."
            className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-tfs-teal resize-y"
          />
          <p className="text-xs text-slate-400 mt-1">Plain text — blank lines become new paragraphs. Your email will arrive in the TFS branded template.</p>
        </div>

        {result && (
          <div className={`flex items-center gap-2 text-sm px-4 py-3 rounded-lg ${
            result.ok ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
          }`}>
            {result.ok ? <CheckCircle size={16} /> : <XCircle size={16} />}
            {result.ok
              ? `Sent to ${result.sent} subscriber${result.sent !== 1 ? 's' : ''} successfully!`
              : `Error: ${result.error}`}
          </div>
        )}

        <button
          onClick={handleSend}
          disabled={sending || !subject.trim() || !body.trim() || active.length === 0}
          className="flex items-center gap-2 bg-tfs-teal text-white px-6 py-2.5 rounded-lg text-sm font-semibold hover:bg-tfs-teal/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Send size={16} />
          {sending ? 'Sending…' : `Send to ${active.length} subscriber${active.length !== 1 ? 's' : ''}`}
        </button>
      </div>

      {/* Subscriber list */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
          <Users size={18} className="text-slate-500" />
          <h2 className="font-semibold text-slate-800">Subscribers</h2>
        </div>
        {subscribers.length === 0 ? (
          <p className="px-6 py-10 text-center text-slate-400 text-sm">
            No subscribers yet. Once you add a signup form to your site, they'll appear here.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-slate-500 uppercase tracking-wider bg-slate-50 border-b border-slate-100">
                  <th className="px-6 py-3 font-medium">Email</th>
                  <th className="px-6 py-3 font-medium">Name</th>
                  <th className="px-6 py-3 font-medium">Subscribed</th>
                  <th className="px-6 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {subscribers.map(s => (
                  <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-3 text-slate-700">{s.email}</td>
                    <td className="px-6 py-3 text-slate-500">{s.name || '—'}</td>
                    <td className="px-6 py-3 text-slate-400">
                      {new Date(s.subscribed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    <td className="px-6 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        s.is_active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
                      }`}>
                        {s.is_active ? 'Active' : 'Unsubscribed'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
