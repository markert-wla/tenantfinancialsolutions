'use client'

import { useState, useEffect, useRef } from 'react'
import { Send, Paperclip, X, FileText, Image as ImageIcon, ChevronDown, ChevronUp, Download, AlertTriangle } from 'lucide-react'

const ALLOWED_TYPES = [
  'image/jpeg',
  'image/png',
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
]
const IMAGE_TYPES = ['image/jpeg', 'image/png']
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB
const MAX_IMAGES    = 5
const MAX_MSG       = 2000

type Client = {
  id: string
  first_name: string
  last_name: string
  email: string
}

type Attachment = {
  id: string
  file_name: string
  file_size: number | null
  mime_type: string | null
  url: string | null
}

type Message = {
  id: string
  body: string
  created_at: string
  read_at: string | null
  attachments?: Attachment[]
}

export default function CoachMessagesClient({ clients }: { clients: Client[] }) {
  const [selectedId, setSelectedId] = useState('')
  const [messages, setMessages]     = useState<Message[]>([])
  const [loading, setLoading]       = useState(false)
  const [text, setText]             = useState('')
  const [sending, setSending]       = useState(false)
  const [error, setError]           = useState('')
  const [success, setSuccess]       = useState(false)
  const [stagedFiles, setStagedFiles] = useState<File[]>([])
  const [fileError, setFileError]   = useState('')
  const [showTips, setShowTips]     = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!selectedId) { setMessages([]); return }
    setLoading(true)
    fetch(`/api/coach/messages?clientId=${selectedId}`)
      .then(r => r.json())
      .then(data => { setMessages(Array.isArray(data) ? data : []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [selectedId])

  function addFiles(newFiles: File[]) {
    setFileError('')
    const updated = [...stagedFiles]

    for (const file of newFiles) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        setFileError(`"${file.name}" is not an allowed type. Use PDF, DOCX, TXT, JPG, or PNG.`)
        return
      }
      if (file.size > MAX_FILE_SIZE) {
        setFileError(`"${file.name}" exceeds the 10 MB limit.`)
        return
      }
      if (IMAGE_TYPES.includes(file.type)) {
        const imgCount = updated.filter(f => IMAGE_TYPES.includes(f.type)).length
        if (imgCount >= MAX_IMAGES) {
          setFileError(`Maximum ${MAX_IMAGES} images per message.`)
          return
        }
      }
      updated.push(file)
    }
    setStagedFiles(updated)
  }

  function removeFile(idx: number) {
    setStagedFiles(prev => prev.filter((_, i) => i !== idx))
    setFileError('')
  }

  async function send() {
    if (!text.trim() || !selectedId) return
    setSending(true)
    setError('')
    setSuccess(false)

    // Step 1 — insert the message
    const res = await fetch('/api/coach/messages', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ clientId: selectedId, body: text.trim() }),
    })
    if (!res.ok) {
      const d = await res.json().catch(() => ({}))
      setError(d.error ?? 'Failed to send message.')
      setSending(false)
      return
    }
    const created: Message = await res.json()
    created.attachments = []

    // Step 2 — upload each staged file
    for (const file of stagedFiles) {
      const fd = new FormData()
      fd.append('messageId', created.id)
      fd.append('clientId', selectedId)
      fd.append('file', file)
      const ures = await fetch('/api/coach/messages/attachments', { method: 'POST', body: fd })
      if (ures.ok) {
        const att: Attachment = await ures.json()
        created.attachments!.push(att)
      }
    }

    setMessages(prev => [created, ...prev])
    setText('')
    setStagedFiles([])
    setSuccess(true)
    setTimeout(() => setSuccess(false), 3000)
    setSending(false)
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

  const hasImages       = stagedFiles.some(f => IMAGE_TYPES.includes(f.type))
  const selectedClient  = clients.find(c => c.id === selectedId)
  const imageCount      = stagedFiles.filter(f => IMAGE_TYPES.includes(f.type)).length

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
              setStagedFiles([])
              setError('')
              setFileError('')
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
              onChange={e => setText(e.target.value.slice(0, MAX_MSG))}
              rows={5}
              placeholder="Write your message here…"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-tfs-teal resize-none"
            />

            {/* File attach area */}
            <div className="mt-3 space-y-2">
              <div className="flex items-center gap-3 flex-wrap">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1.5 text-xs text-tfs-slate border border-gray-200 rounded-lg px-3 py-1.5 hover:border-tfs-teal hover:text-tfs-teal transition-colors"
                >
                  <Paperclip size={13} />
                  Attach file
                </button>
                <span className="text-xs text-tfs-slate">
                  PDF, DOCX, TXT, JPG, PNG · 10 MB max
                  {imageCount > 0 && (
                    <span className={imageCount >= MAX_IMAGES ? ' text-amber-600 font-medium' : ''}>
                      {' '}· {imageCount}/{MAX_IMAGES} images used
                    </span>
                  )}
                </span>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx,.txt,.jpg,.jpeg,.png"
                multiple
                className="hidden"
                onChange={e => {
                  if (e.target.files) addFiles(Array.from(e.target.files))
                  e.target.value = ''
                }}
              />

              {/* Staged files list */}
              {stagedFiles.length > 0 && (
                <div className="space-y-1.5">
                  {stagedFiles.map((f, i) => (
                    <div key={i} className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-1.5">
                      {fileIcon(f.type)}
                      <span className="text-xs text-tfs-navy flex-1 truncate">{f.name}</span>
                      <span className="text-xs text-tfs-slate">{formatSize(f.size)}</span>
                      <button
                        type="button"
                        onClick={() => removeFile(i)}
                        className="text-tfs-slate hover:text-red-500 transition-colors"
                        aria-label="Remove file"
                      >
                        <X size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Photo tips toggle (only shown when images are staged) */}
              {hasImages && (
                <div>
                  <button
                    type="button"
                    onClick={() => setShowTips(t => !t)}
                    className="flex items-center gap-1 text-xs text-tfs-teal-button font-medium"
                  >
                    {showTips ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                    Photo upload tips
                  </button>
                  {showTips && (
                    <ul className="mt-1.5 text-xs text-tfs-slate space-y-1 pl-4 list-disc">
                      <li>Clear, well-lit photo — no shadows or glare</li>
                      <li>Entire document visible — no cropped corners</li>
                      <li>No handwritten forms unless extremely neat</li>
                      <li>Don&apos;t send multiple photos of the same document — stitch into one PDF instead</li>
                    </ul>
                  )}
                </div>
              )}

              {fileError && <p className="text-xs text-red-600">{fileError}</p>}

              {/* PII / retention notice */}
              <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-800">
                <AlertTriangle size={13} className="shrink-0 mt-0.5" />
                <p>
                  <span className="font-semibold">Privacy notice:</span> message attachments are not
                  certified for sensitive personal information — do not send tax documents, Social
                  Security numbers, or account details, and remind clients not to share them either.
                  Files you send stay available for <span className="font-semibold">as long as the client is active
                  on TFS</span>. Documents a client sends you are{' '}
                  <span className="font-semibold">deleted 30 days after upload</span>, so download or print those
                  within the window. Everything is destroyed once a client is no longer active.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between mt-3">
              <span className={`text-xs ${text.length >= MAX_MSG ? 'text-red-500' : 'text-tfs-slate'}`}>
                {text.length} / {MAX_MSG}
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

                    {/* Attachments on this message */}
                    {m.attachments && m.attachments.length > 0 && (
                      <div className="mt-2 space-y-1.5">
                        {m.attachments.map(a => (
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
