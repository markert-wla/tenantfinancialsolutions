'use client'

import { useState, useEffect } from 'react'
import { Send } from 'lucide-react'

type Client = {
  id: string
  first_name: string
  last_name: string
  email: string
}

type Message = {
  id: string
  body: string
  created_at: string
  read_at: string | null
}

const MAX = 2000

export default function CoachMessagesClient({ clients }: { clients: Client[] }) {
  const [selectedId, setSelectedId] = useState('')
  const [messages, setMessages]     = useState<Message[]>([])
  const [loading, setLoading]       = useState(false)
  const [text, setText]             = useState('')
  const [sending, setSending]       = useState(false)
  const [error, setError]           = useState('')
  const [success, setSuccess]       = useState(false)

  useEffect(() => {
    if (!selectedId) { setMessages([]); return }
    setLoading(true)
    fetch(`/api/coach/messages?clientId=${selectedId}`)
      .then(r => r.json())
      .then(data => { setMessages(Array.isArray(data) ? data : []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [selectedId])

  async function send() {
    if (!text.trim() || !selectedId) return
    setSending(true)
    setError('')
    setSuccess(false)
    const res = await fetch('/api/coach/messages', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ clientId: selectedId, body: text.trim() }),
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

  const selectedClient = clients.find(c => c.id === selectedId)

  return (
    <div>
      {/* Client selector */}
      <div className="card mb-6">
        <label className="block text-sm font-semibold text-tfs-navy mb-2">Select Client</label>
        {clients.length === 0 ? (
          <p className="text-sm text-tfs-slate italic">
            No clients yet. Clients appear here once they book a session with you.
          </p>
        ) : (
          <select
            value={selectedId}
            onChange={e => {
              setSelectedId(e.target.value)
              setText('')
              setError('')
              setSuccess(false)
            }}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-tfs-teal"
          >
            <option value="">— Choose a client —</option>
            {clients.map(c => (
              <option key={c.id} value={c.id}>
                {c.first_name} {c.last_name} ({c.email})
              </option>
            ))}
          </select>
        )}
      </div>

      {selectedId && (
        <>
          {/* Compose */}
          <div className="card mb-6">
            <label className="block text-sm font-semibold text-tfs-navy mb-2">
              New Message to {selectedClient?.first_name} {selectedClient?.last_name}
            </label>
            <textarea
              value={text}
              onChange={e => setText(e.target.value.slice(0, MAX))}
              rows={5}
              placeholder="Write your message here…"
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

          {/* Sent messages */}
          <div>
            <h2 className="font-serif font-bold text-tfs-navy text-lg mb-3">Sent Messages</h2>
            {loading ? (
              <p className="text-sm text-tfs-slate italic">Loading…</p>
            ) : messages.length === 0 ? (
              <p className="text-sm text-tfs-slate italic">No messages sent to this client yet.</p>
            ) : (
              <div className="space-y-3">
                {messages.map(m => (
                  <div key={m.id} className="card">
                    <p className="text-sm text-tfs-navy whitespace-pre-wrap">{m.body}</p>
                    <div className="flex items-center justify-between mt-2">
                      <p className="text-xs text-tfs-slate">{fmt(m.created_at)}</p>
                      {m.read_at ? (
                        <span className="text-xs text-green-600 font-medium">Read</span>
                      ) : (
                        <span className="text-xs text-tfs-slate">Unread</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
