'use client'

import { useState } from 'react'
import { Send, MessageSquare, Download, FileText, Image } from 'lucide-react'

type Message = {
  id: string
  body: string
  created_at: string
}

type Attachment = {
  name: string
  path: string
  size: number
  mime_type: string
  signed_url: string | null
}

type CoachMessage = {
  id: string
  body: string
  created_at: string
  read_at: string | null
  attachments?: Attachment[]
}

const MAX = 2000

function fileIcon(mimeType: string) {
  if (mimeType === 'image/jpeg' || mimeType === 'image/png')
    return <Image size={14} className="text-tfs-teal-button flex-shrink-0" />
  return <FileText size={14} className="text-tfs-teal-button flex-shrink-0" />
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function PortalMessagesClient({
  initial,
  coachMessages,
}: {
  initial: Message[]
  coachMessages: CoachMessage[]
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

      {/* Messages from Coach */}
      {coachMessages.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <MessageSquare size={16} className="text-tfs-teal-button" />
            <h2 className="font-serif font-bold text-tfs-navy text-lg">Messages from Your Coach</h2>
          </div>
          <div className="space-y-3">
            {coachMessages.map(m => (
              <div key={m.id} className="card border-l-4 border-tfs-teal">
                <p className="text-sm text-tfs-navy whitespace-pre-wrap">{m.body}</p>

                {/* Attachments from coach */}
                {m.attachments && m.attachments.length > 0 && (
                  <div className="mt-3 space-y-2">
                    <p className="text-xs font-semibold text-tfs-navy">
                      Attached {m.attachments.length === 1 ? 'file' : 'files'} from your coach:
                    </p>
                    {m.attachments.map((att, i) => (
                      <div key={i} className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
                        {fileIcon(att.mime_type)}
                        <span className="text-xs text-tfs-navy flex-1 truncate">{att.name}</span>
                        <span className="text-xs text-tfs-slate">{formatBytes(att.size)}</span>
                        {att.signed_url ? (
                          <a
                            href={att.signed_url}
                            download={att.name}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-xs text-tfs-teal-button font-medium hover:underline"
                          >
                            <Download size={12} />
                            Download
                          </a>
                        ) : (
                          <span className="text-xs text-gray-400 italic">Unavailable</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                <p className="text-xs text-tfs-slate mt-2">{fmt(m.created_at)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

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

      {/* Previous messages from client */}
      <div>
        <h2 className="font-serif font-bold text-tfs-navy text-lg mb-3">Messages You&rsquo;ve Sent</h2>
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
