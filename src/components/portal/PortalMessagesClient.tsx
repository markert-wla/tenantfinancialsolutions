'use client'

import { useState, useEffect } from 'react'
import { Send, MessageSquare, FileText, Image as ImageIcon, Download, AlertTriangle } from 'lucide-react'

type Message = {
  id: string
  body: string
  created_at: string
}

type CoachMessage = {
  id: string
  body: string
  created_at: string
  read_at: string | null
}

type Attachment = {
  id: string
  file_name: string
  file_size: number | null
  mime_type: string | null
  url: string | null
}

const IMAGE_TYPES = ['image/jpeg', 'image/png']
const MAX = 2000

export default function PortalMessagesClient({
  initial,
  coachMessages,
}: {
  initial: Message[]
  coachMessages: CoachMessage[]
}) {
  const [messages, setMessages]   = useState(initial)
  const [text, setText]           = useState('')
  const [sending, setSending]     = useState(false)
  const [error, setError]         = useState('')
  const [success, setSuccess]     = useState(false)
  const [attachmentsByMsg, setAttachmentsByMsg] = useState<Record<string, Attachment[]>>({})

  // Load attachments for all coach messages
  useEffect(() => {
    if (coachMessages.length === 0) return
    const ids = coachMessages.map(m => m.id).join(',')
    fetch(`/api/portal/coach-attachments?messageIds=${ids}`)
      .then(r => r.json())
      .then(data => {
        if (data && typeof data === 'object' && !data.error) {
          setAttachmentsByMsg(data as Record<string, Attachment[]>)
        }
      })
      .catch(() => {/* silently fail — attachments are supplementary */})
  }, [coachMessages])

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

  function fileIcon(mime: string | null) {
    if (mime && IMAGE_TYPES.includes(mime)) return <ImageIcon size={13} />
    return <FileText size={13} />
  }

  function formatSize(bytes: number | null) {
    if (!bytes) return ''
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
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
          <p className="text-xs text-tfs-slate mb-3">
            Files your coach sends you stay here for as long as your account is active on TFS, and are
            destroyed if your account closes — download or print anything you want to keep for good.
          </p>
          <div className="space-y-3">
            {coachMessages.map(m => {
              const atts = attachmentsByMsg[m.id] ?? []
              return (
                <div key={m.id} className="card border-l-4 border-tfs-teal">
                  <p className="text-sm text-tfs-navy whitespace-pre-wrap">{m.body}</p>

                  {/* Attachments sent by coach */}
                  {atts.length > 0 && (
                    <div className="mt-2 space-y-1.5">
                      {atts.map(a => (
                        <div key={a.id} className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-1.5">
                          {fileIcon(a.mime_type)}
                          <span className="text-xs text-tfs-navy flex-1 truncate">{a.file_name}</span>
                          <span className="text-xs text-tfs-slate">{formatSize(a.file_size)}</span>
                          {a.url && (
                            <a
                              href={a.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              download={a.file_name}
                              className="text-tfs-teal-button hover:opacity-70 transition-opacity"
                              aria-label={`Download ${a.file_name}`}
                            >
                              <Download size={13} />
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  <p className="text-xs text-tfs-slate mt-2">{fmt(m.created_at)}</p>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Compose */}
      <div className="card mb-8">
        <label className="block text-sm font-semibold text-tfs-navy mb-2">New Message</label>
        <div className="mb-2 flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-800">
          <AlertTriangle size={13} className="shrink-0 mt-0.5" />
          <p>
            <span className="font-semibold">Privacy notice:</span> messaging is not certified for
            sensitive personal information — please do not share tax details, Social Security
            numbers, bank or account numbers, or similar sensitive information with your coach here.
          </p>
        </div>
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
