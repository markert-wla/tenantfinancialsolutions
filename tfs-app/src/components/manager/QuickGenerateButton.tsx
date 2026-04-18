'use client'
import { useState } from 'react'
import { Zap, Copy, Check, Loader2 } from 'lucide-react'

export default function QuickGenerateButton({ partnerName }: { partnerName: string }) {
  const [code, setCode]       = useState('')
  const [loading, setLoading] = useState(false)
  const [copied, setCopied]   = useState(false)
  const [error, setError]     = useState('')

  async function generate() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/admin/codes/quick-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ partnerName }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed')
      setCode(data.code)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  async function copy() {
    if (!code) return
    await navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-3">
      <button
        onClick={generate}
        disabled={loading}
        className="btn-primary text-sm py-2 flex items-center gap-2 disabled:opacity-50"
      >
        {loading ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
        Generate Code
      </button>

      {code && (
        <div className="flex items-center gap-2 bg-tfs-teal-light border border-tfs-teal/30 rounded-lg px-4 py-3">
          <span className="font-mono font-bold text-tfs-navy text-lg tracking-widest flex-1">{code}</span>
          <button
            onClick={copy}
            className="shrink-0 text-tfs-teal hover:text-tfs-teal-dark transition-colors"
            aria-label="Copy code"
          >
            {copied ? <Check size={18} /> : <Copy size={18} />}
          </button>
        </div>
      )}

      {error && <p className="text-red-600 text-sm">{error}</p>}
    </div>
  )
}
