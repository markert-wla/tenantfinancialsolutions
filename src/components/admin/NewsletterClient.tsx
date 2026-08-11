'use client'

import { useState } from 'react'
import { Mail, Users, Send, CheckCircle, XCircle, RefreshCw, FlaskConical } from 'lucide-react'

type Subscriber = {
  id: string
  email: string
  name: string | null
  subscribed_at: string
  is_active: boolean
}

export default function NewsletterClient({ subscribers: initialSubscribers }: { subscribers: Subscriber[] }) {
  const [subscribers, setSubscribers] = useState(initialSubscribers)
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [testEmail, setTestEmail] = useState('')
  const [sendingTest, setSendingTest] = useState(false)
  const [result, setResult] = useState<{ ok: boolean; sent?: number; error?: string } | null>(null)
  const [testResult, setTestResult] = useState<{ ok: boolean; error?: string } | null>(null)
  const [syncResult, setSyncResult] = useState<{ ok: boolean; synced?: number; error?: string } | null>(null)

  const active = subscribers.filter(s => s.is_active)

  function buildHtml() {
    return body
      .split(/\n{2,}/)
      .map(p => p.trim())
      .filter(Boolean)
      .map(p => `<p style="margin:0 0 16px;">${p.replace(/\n/g, '<br>')}</p>`)
      .join('')
  }

  async function handleSync() {
    if (!confirm('Sync all active clients to the newsletter list? Anyone who previously unsubscribed will NOT be re-added.')) return
    setSyncing(true)
    setSyncResult(null)
    try {
      const res = await fetch('/api/admin/sync-clients-newsletter', { method: 'POST' })
      const data = await res.json()
      if (data.ok) {
        setSyncResult({ ok: true, synced: data.synced })
        setTimeout(() => window.location.reload(), 1500)
      } else {
        setSyncResult({ ok: false, error: data.error ?? 'Unknown error' })
      }
    } catch {
      setSyncResult({ ok: false, error: 'Network error — please try again' })
    } finally {
      setSyncing(false)
    }
  }

  async function handleSendTest() {
    if (!subject.trim() || !body.trim()) return
    if (!testEmail.trim()) return
    setSendingTest(true)
    setTestResult(null)
    try {
      const res = await fetch('/api/newsletter/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject: subject.trim(), html: buildHtml(), testEmail: testEmail.trim() }),
      })
      const data = await res.json()
      if (data.ok) {
        setTestResult({ ok: true })
      } else {
        setTestResult({ ok: false, error: data.error ?? 'Unknown error' })
      }
    } catch {
      setTestResult({ ok: false, error: 'Network error — please try again' })
    } finally {
      setSendingTest(false)
    }
  }

  async function handleSend() {
    if (!subject.trim() || !body.trim()) return
    if (!confirm(`Send this newsletter to ${active.length} subscriber${active.length !== 1 ? 's' : ''}?`)) return

    setSending(true)
    setResult(null)

    try {
      const res = await fetch('/api/newsletter/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject: subject.trim(), html: buildHtml() }),
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

      {/* Sync Clients */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-3">
        <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
          <RefreshCw size={18} /> Sync Clients to Newsletter
        </h2>
        <p className="text-sm text-slate-500">
          Adds all active coaching clients to the newsletter list. Clients who have previously
          unsubscribed will <strong>not</strong> be re-added.
        </p>
        {syncResult && (
          <div className={`flex items-center gap-2 text-sm px-4 py-3 rounded-lg ${
            syncResult.ok ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
          }`}>
            {syncResult.ok ? <CheckCircle size={16} /> : <XCircle size={16} />}
            {syncResult.ok
              ? `Synced ${syncResult.synced} client${syncResult.synced !== 1 ? 's' : ''} — refreshing…`
              : `Error: ${syncResult.error}`}
          </div>
        )}
        <button
          onClick={handleSync}
          disabled={syncing}
          className="flex items-center gap-2 bg-slate-700 text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <RefreshCw size={16} className={syncing ? 'animate-spin' : ''} />
          {syncing ? 'Syncing…' : 'Sync Active Clients Now'}
        </button>
      </div>

      {/* Compose */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
        <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
          <Send size={18} /> Compose Newsletter
        </h2>
        <p className="text-sm text-slate-500">Every newsletter will automatically include the <strong>Wednesday Wisdom from TFS</strong> heading at the top of the email.</p>

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

        {/* Send Test */}
        <div className="border border-slate-100 rounded-lg p-4 bg-slate-50 space-y-3">
          <p className="text-sm font-medium text-slate-700 flex items-center gap-2">
            <FlaskConical size={15} className="text-slate-400" /> Send a test email first
          </p>
          <div className="flex gap-2">
            <input
              type="email"
              value={testEmail}
              onChange={e => setTestEmail(e.target.value)}
              placeholder="your@email.com"
              className="flex-1 border border-slate-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-tfs-teal bg-white"
            />
            <button
              onClick={handleSendTest}
              disabled={sendingTest || !testEmail.trim() || !subject.trim() || !body.trim()}
              className="flex items-center gap-2 bg-slate-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
            >
              <FlaskConical size={14} />
              {sendingTest ? 'Sending…' : 'Send Test'}
            </button>
          </div>
          {testResult && (
            <div className={`flex items-center gap-2 text-sm px-3 py-2 rounded-lg ${
              testResult.ok ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
            }`}>
              {testResult.ok ? <CheckCircle size={14} /> : <XCircle size={14} />}
              {testResult.ok ? 'Test email sent! Check your inbox.' : `Error: ${testResult.error}`}
            </div>
          )}
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
            No subscribers yet. Sync your clients above or add a signup form to your site.
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
