'use client'

import { useState, useEffect, useRef } from 'react'
import { Send, Paperclip, X, FileText, Image, ChevronDown, ChevronUp } from 'lucide-react'

type Client = {
  id: string
  first_name: string
  last_name: string
  email: string
}

type Attachment = {
  name: string
  path: string
  size: number
  mime_type: string
}

type Message = {
  id: string
  body: string
  created_at: string
  read_at: string | null
  attachments?: Attachment[]
}

const MAX_BODY         = 2000
const MAX_FILE_SIZE    = 10 * 1024 * 1024 // 10 MB
const MAX_IMAGES       = 5
const ALLOWED_TYPES    = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'image/jpeg',
  'image/png',
])
const IMAGE_TYPES      = new Set(['image/jpeg', 'image/png'])

function fileIcon(mimeType: string) {
  if (IMAGE_TYPES.has(mimeType)) return <Image size={14} className="text-tfs-teal-button" />
  return <FileText size={14} className="text-tfs-teal-button" />
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function CoachMessagesClient({ clients }: { clients: Client[] }) {
  const [selectedId, setSelectedId]   = useState('')
  const [messages, setMessages]       = useState<Message[]>([])
  const [loading, setLoading]         = useState(false)
  const [text, setText]               = useState('')
  const [sending, setSending]         = useState(false)
  const [error, setError]             = useState('')
  const [success, setSuccess]         = useState(false)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [showTips, setShowTips]       = useState(false)
  const fileInputRef                  = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!selectedId) { setMessages([]); return }
    setLoading(true)
    fetch(`/api/coach/messages?clientId=${selectedId}`)
      .then(r => r.json())
      .then(data => { setMessages(Array.isArray(data) ? data : []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [selectedId])

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (!files.length) return

    const existing      = selectedFiles
    const currentImages = existing.filter(f => IMAGE_TYPES.has(f.type)).length
    const newErrors: string[] = []
    const valid: File[] = []

    for (const f of files) {
      if (!ALLOWED_TYPES.has(f.type)) {
        newErrors.push(`"${f.name}" is not a supported type (PDF, DOCX, TXT, JPG, PNG only).`)
        continue
      }
      if (f.size > MAX_FILE_SIZE) {
        newErrors.push(`"${f.name}" exceeds the 10 MB limit.`)
        continue
      }
      if (IMAGE_TYPES.has(f.type) && currentImages + valid.filter(v => IMAGE_TYPES.has(v.type)).length >= MAX_IMAGES) {
        newErrors.push(`Maximum of ${MAX_IMAGES} images per message.`)
        continue
      }
      valid.push(f)
    }

    if (newErrors.length) setError(newErrors[0])
    setSelectedFiles(prev => [...prev, ...valid])

    // Reset the input so the same file can be re-selected after removal
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function removeFile(index: number) {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index))
    setError('')
  }

  async function send() {
    if (!text.trim() || !selectedId) return
    setSending(true)
    setError('')
    setSuccess(false)

    // Upload attachments first
    const uploadedAttachments: Attachment[] = []

    for (const file of selectedFiles) {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('clientId', selectedId)
      if (IMAGE_TYPES.has(file.type)) {
        fd.append('currentImageCount', String(
          uploadedAttachments.filter(a => IMAGE_TYPES.has(a.mime_type)).length
        ))
      }

      const res = await fetch('/api/coach/message-attachments', { method: 'POST', body: fd })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error ?? `Failed to upload "${file.name}".`)
        setSending(false)
        return
      }
      uploadedAttachments.push(await res.json())
    }

    // Send the message with attachments
    const res = await fetch('/api/coach/messages', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        clientId:    selectedId,
        body:        text.trim(),
        attachments: uploadedAttachments,
      }),
    })
    setSending(false)

    if (res.ok) {
      const created: Message = await res.json()
      setMessages(prev => [created, ...prev])
      setText('')
      setSelectedFiles([])
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

  const selectedClient  = clients.find(c => c.id === selectedId)
  const imageCount      = selectedFiles.filter(f => IMAGE_TYPES.has(f.type)).length
  const hasImages       = imageCount > 0

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
              setSelectedFiles([])
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
              onChange={e => setText(e.target.value.slice(0, MAX_BODY))}
              rows={5}
              placeholder="Write your message here…"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-tfs-teal resize-none"
            />

            {/* Attach files row */}
            <div className="mt-3 flex items-center gap-3">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={sending}
                className="flex items-center gap-1.5 text-xs font-medium text-tfs-teal-button border border-tfs-teal rounded-lg px-3 py-1.5 hover:bg-tfs-teal/5 transition-colors disabled:opacity-50"
              >
                <Paperclip size={13} />
                Attach Files
              </button>
              <span className="text-xs text-tfs-slate">
                PDF, DOCX, TXT, JPG, PNG · max 10 MB · max {MAX_IMAGES} images
              </span>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx,.txt,.jpg,.jpeg,.png,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,image/jpeg,image/png"
                multiple
                className="hidden"
                onChange={handleFileChange}
              />
            </div>

            {/* Selected files list */}
            {selectedFiles.length > 0 && (
              <div className="mt-3 space-y-2">
                {selectedFiles.map((f, i) => (
                  <div key={i} className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
                    {fileIcon(f.type)}
                    <span className="text-xs text-tfs-navy flex-1 truncate">{f.name}</span>
                    <span className="text-xs text-tfs-slate">{formatBytes(f.size)}</span>
                    <button
                      type="button"
                      onClick={() => removeFile(i)}
                      className="text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <X size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Photo tips (shown when images are selected) */}
            {hasImages && (
              <div className="mt-3">
                <button
                  type="button"
                  onClick={() => setShowTips(v => !v)}
                  className="flex items-center gap-1 text-xs text-tfs-teal-button font-medium"
                >
                  {showTips ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                  Photo upload tips
                </button>
                {showTips && (
                  <ul className="mt-2 space-y-1 text-xs text-tfs-slate pl-4 list-disc">
                    <li>Photo should be clear and well-lit</li>
                    <li>Entire document must be visible — no cropped corners</li>
                    <li>Avoid shadows or glare across the page</li>
                    <li>Handwritten documents should be extremely neat</li>
                    <li>Do not upload multiple photos of the same document — stitch into a single PDF instead</li>
                  </ul>
                )}
              </div>
            )}

            {/* Send row */}
            <div className="flex items-center justify-between mt-3">
              <span className={`text-xs ${text.length >= MAX_BODY ? 'text-red-500' : 'text-tfs-slate'}`}>
                {text.length} / {MAX_BODY}
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
                  {sending ? (selectedFiles.length > 0 ? 'Uploading…' : 'Sending…') : 'Send'}
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
                    {m.attachments && m.attachments.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {m.attachments.map((a, i) => (
                          <div key={i} className="flex items-center gap-2 text-xs text-tfs-slate">
                            {fileIcon(a.mime_type)}
                            <span className="truncate">{a.name}</span>
                            <span className="text-gray-400">({formatBytes(a.size)})</span>
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
