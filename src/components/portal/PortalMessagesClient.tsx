'use client'

import { useState } from 'react'
import { Send } from 'lucide-react'

type Message = {
  id: string
  body: string
  created_at: string
}

const MAX = 2000

export default function PortalMessagesClient({
  initial,
}: {
  initial: Message[]
}) {
  const [messages, setMessages] = useState(initial)
  const [text, setText]         = useState('')
  const [sending, setSending]   = useState(false)
  const [error, setError]       = useState('')
  const [success, setSuccess]   = useState(false)

  async function send() {
    if (!text.trim()) return
    setSending(true)
    setError('')
    setSuccess(false)
    const res = await fetch('/api/portal/messages', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ body: text.trim() }),
    })
    setSending(false)
    if (res.ok) {
      const created: Message = await res.json()
      setMessages(prev => [created, ...prev])
      setText('')
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } else {
      const data = await res.json().catch(() => ({}))
      setError(data.error ?? 'Failed to send message.')
    }
  }

  function fmt(iso: string) {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: 'numeric', minute: '2-digit', hour12: true,
    }).format(new Date(iso))
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-serif font-bold text-tfs-navy mb-2">Message Your Coach</h1>
      <p className="text-sm text-tfs-slate mb-8">
        Have a question, share an update, or let your coach know something between sessions.
        Your coach will see your message when they next review your profile.
      </p>

      {/* Compose */}
      <div className="card mb-8">
        <label className="block text-sm font-semibold text-tfs-navy mb-2">New Message</label>
        <textarea
          value={text}
          onChange={e => setText(e.target.value.slice(0, MAX))}
          rows={5}
          placeholder="Write your note here…"
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-tfs-teal resize-none"
        />
        <div className="flex items-center justify-between mt-2">
          <span className={`text-xs ${text.length >= MAX ? 'text-red-500' : 'text-tfs-slate'}`}>
            {text.length} / {MAX}
          </span>
          <div className="flex items-center gap-3">
            {success && <span className="text-xs text-green-600 font-medium">Message sent!</span>}
            {error   && <span className="text-xs text-red-600">{error}</span>}
            <button
              onClick={send}
              disabled={sending || !text.trim()}
              className="btn-primary text-sm px-4 py-1.5 flex items-center gap-1.5 disabled:opacity-50"
            >
              <Send size={13} />
              {sending ? 'Sending…' : 'Send'}
            </button>
          </div>
        </div>
      </div>

      {/* Previous messages */}
      <div>
        <h2 className="font-serif font-bold text-tfs-navy text-lg mb-3">Previous Messages</h2>
        {messages.length === 0 ? (
          <p className="text-sm text-tfs-slate italic">You haven&rsquo;t sent any messages yet.</p>
        ) : (
          <div className="space-y-3">
            {messages.map(m => (
              <div key={m.id} className="card">
                <p className="text-sm text-tfs-navy whitespace-pre-wrap">{m.body}</p>
                <p className="text-xs text-tfs-slate mt-2">{fmt(m.created_at)}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
