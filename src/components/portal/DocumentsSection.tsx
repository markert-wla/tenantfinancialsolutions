'use client'

import { useState, useEffect, useRef } from 'react'
import { Upload, FileText, Image as ImageIcon, Download, Trash2, Loader2, AlertCircle, Info } from 'lucide-react'

type Doc = {
  id: string
  file_name: string
  file_size: number | null
  mime_type: string | null
  uploaded_at: string
  signed_url: string | null
}

const ALLOWED_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'image/jpeg',
  'image/png',
]

const IMAGE_TYPES = ['image/jpeg', 'image/png']
const MAX_IMAGES = 5

function isImage(mime: string | null) {
  return mime ? IMAGE_TYPES.includes(mime) : false
}

function formatBytes(bytes: number | null): string {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function fmtDate(iso: string) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit', hour12: true,
  }).format(new Date(iso))
}

export default function DocumentsSection() {
  const [docs,       setDocs]       = useState<Doc[]>([])
  const [loading,    setLoading]    = useState(true)
  const [uploading,  setUploading]  = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [error,      setError]      = useState('')
  const [showGuide,  setShowGuide]  = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => { fetchDocs() }, [])

  async function fetchDocs() {
    setLoading(true)
    const res = await fetch('/api/portal/documents')
    if (res.ok) setDocs(await res.json())
    setLoading(false)
  }

  const imageCount = docs.filter(d => isImage(d.mime_type)).length
  const atImageLimit = imageCount >= MAX_IMAGES

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setError('')

    // Client-side type check
    if (!ALLOWED_TYPES.includes(file.type)) {
      setError('Unsupported file type. Please upload a PDF, DOCX, TXT, JPG, or PNG.')
      if (fileRef.current) fileRef.current.value = ''
      return
    }

    // Client-side image count check
    if (IMAGE_TYPES.includes(file.type) && atImageLimit) {
      setError(`You have reached the maximum of ${MAX_IMAGES} images. Remove one before uploading another.`)
      if (fileRef.current) fileRef.current.value = ''
      return
    }

    setUploading(true)
    const form = new FormData()
    form.append('file', file)

    const res = await fetch('/api/portal/documents', { method: 'POST', body: form })
    setUploading(false)
    if (fileRef.current) fileRef.current.value = ''

    if (res.ok) {
      const newDoc = await res.json()
      setDocs(prev => [newDoc, ...prev])
    } else {
      const data = await res.json().catch(() => ({}))
      setError(data.error ?? 'Upload failed — please try again.')
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Remove this document? This cannot be undone.')) return
    setDeletingId(id)
    const res = await fetch('/api/portal/documents', {
      method:  'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ id }),
    })
    setDeletingId(null)
    if (res.ok) setDocs(prev => prev.filter(d => d.id !== id))
  }

  return (
    <div className="space-y-4">
      {/* Upload card */}
      <div className="card">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h2 className="font-serif font-bold text-tfs-navy text-lg mb-0.5">Upload a Document</h2>
            <p className="text-sm text-tfs-slate">
              PDF, DOCX, or TXT files (up to 10 MB) · JPG or PNG photos (up to 10 MB, max {MAX_IMAGES} images).
              Your coach can view everything you upload here.
            </p>
          </div>
          <div>
            <input
              ref={fileRef}
              id="doc-upload"
              type="file"
              className="hidden"
              accept=".pdf,.docx,.txt,.jpg,.jpeg,.png"
              onChange={handleUpload}
              disabled={uploading}
            />
            <label
              htmlFor="doc-upload"
              className={`btn-primary text-sm flex items-center gap-2 cursor-pointer select-none ${
                uploading ? 'opacity-60 pointer-events-none' : ''
              }`}
            >
              {uploading
                ? <><Loader2 size={15} className="animate-spin" /> Uploading&hellip;</>
                : <><Upload size={15} /> Choose File</>}
            </label>
          </div>
        </div>

        {/* PII / retention notice */}
        <div className="mt-3 flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5 text-xs text-amber-800">
          <AlertCircle size={14} className="shrink-0 mt-0.5" />
          <p>
            <span className="font-semibold">Privacy notice:</span> This upload area is not certified
            for storing sensitive personal information. Please do not upload tax returns, Social
            Security numbers, bank statements, or other sensitive personal or financial documents.
            All uploaded files are <span className="font-semibold">automatically deleted after 14 days</span>.
          </p>
        </div>

        {/* Image guardrails toggle */}
        <div className="mt-3">
          <button
            onClick={() => setShowGuide(g => !g)}
            className="flex items-center gap-1.5 text-xs text-tfs-slate hover:text-tfs-teal-button transition-colors"
          >
            <Info size={13} />
            {showGuide ? 'Hide' : 'Show'} photo upload tips
          </button>
          {showGuide && (
            <div className="mt-2 bg-blue-50 border border-blue-100 rounded-lg px-4 py-3 text-xs text-blue-800 space-y-1">
              <p className="font-semibold mb-1">📷 For best results when uploading phone photos:</p>
              <ul className="list-disc list-inside space-y-0.5">
                <li>Photo must be clear and well-lit — no shadows or glare</li>
                <li>The entire document must be visible — no cropped corners</li>
                <li>Handwritten forms must be extremely neat and legible</li>
                <li>If a document spans multiple pages, scan or stitch them into a single PDF instead of multiple photos</li>
                <li>Max {MAX_IMAGES} images total · Max 10 MB per file</li>
              </ul>
            </div>
          )}
        </div>

        {/* Image count indicator */}
        {imageCount > 0 && (
          <p className="mt-2 text-xs text-tfs-slate">
            <ImageIcon size={11} className="inline mr-1" />
            {imageCount} of {MAX_IMAGES} images used
            {atImageLimit && <span className="text-amber-600 font-medium"> — limit reached. Remove an image to upload another.</span>}
          </p>
        )}

        {error && (
          <div className="mt-3 flex items-center gap-2 text-red-600 text-sm bg-red-50 rounded-lg px-3 py-2">
            <AlertCircle size={14} /> {error}
          </div>
        )}
      </div>

      {/* Documents list */}
      <div className="card">
        <h2 className="font-serif font-bold text-tfs-navy text-lg mb-4">Your Documents</h2>
        {loading ? (
          <div className="flex items-center gap-2 text-tfs-slate text-sm py-4">
            <Loader2 size={16} className="animate-spin" /> Loading&hellip;
          </div>
        ) : docs.length === 0 ? (
          <p className="text-tfs-slate text-sm">No documents uploaded yet.</p>
        ) : (
          <div className="divide-y divide-gray-100">
            {docs.map(doc => (
              <div key={doc.id} className="py-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  {isImage(doc.mime_type)
                    ? <ImageIcon size={18} className="text-tfs-teal-button shrink-0" />
                    : <FileText size={18} className="text-tfs-teal-button shrink-0" />}
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-tfs-navy truncate">{doc.file_name}</p>
                    <p className="text-xs text-tfs-slate mt-0.5">
                      {formatBytes(doc.file_size)}{doc.file_size ? ' · ' : ''}{fmtDate(doc.uploaded_at)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {doc.signed_url && (
                    <a
                      href={doc.signed_url}
                      download={doc.file_name}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 rounded-lg text-tfs-slate hover:text-tfs-teal-button hover:bg-tfs-teal/10 transition-colors"
                      title="Download"
                    >
                      <Download size={15} />
                    </a>
                  )}
                  <button
                    onClick={() => handleDelete(doc.id)}
                    disabled={deletingId === doc.id}
                    className="p-1.5 rounded-lg text-tfs-slate hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
                    title="Remove document"
                  >
                    {deletingId === doc.id
                      ? <Loader2 size={15} className="animate-spin" />
                      : <Trash2 size={15} />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
