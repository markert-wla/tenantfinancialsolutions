'use client'

import { useEffect, useState } from 'react'
import { X } from 'lucide-react'

interface Popup {
  id: string
  type: 'youtube' | 'text'
  content: string
  label: string | null
}

function extractYouTubeId(input: string): string {
  try {
    const url = new URL(input)
    if (url.hostname.includes('youtu.be')) return url.pathname.slice(1).split('?')[0]
    const v = url.searchParams.get('v')
    if (v) return v
  } catch { /* bare id */ }
  return input.trim()
}

export default function PopupManager() {
  const [popups,    setPopups]   = useState<Popup[]>([])
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetch('/api/public/popups')
      .then(r => r.ok ? r.json() : [])
      .then(setPopups)
      .catch(() => {})
  }, [])

  const visible = popups.filter(p => !dismissed.has(p.id))
  if (visible.length === 0) return null

  function dismiss(id: string) {
    setDismissed(prev => new Set([...prev, id]))
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-3 items-end pointer-events-none">
      {visible.map(popup => (
        <div
          key={popup.id}
          className="pointer-events-auto w-80 rounded-xl shadow-2xl border border-white/20 bg-tfs-navy/95 backdrop-blur-sm text-white overflow-hidden animate-in slide-in-from-right-4 fade-in duration-300"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/10">
            <p className="text-xs font-semibold tracking-wide uppercase text-tfs-gold">
              {popup.label || (popup.type === 'youtube' ? 'Watch' : 'Message')}
            </p>
            <button
              onClick={() => dismiss(popup.id)}
              className="text-white/50 hover:text-white transition-colors"
              aria-label="Dismiss"
            >
              <X size={14} />
            </button>
          </div>

          {/* Body */}
          {popup.type === 'youtube' ? (
            <div className="aspect-video w-full">
              <iframe
                src={`https://www.youtube.com/embed/${extractYouTubeId(popup.content)}?rel=0`}
                title={popup.label ?? 'Video'}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="w-full h-full"
              />
            </div>
          ) : (
            <div className="px-4 py-3">
              <p className="text-sm text-white/90 leading-relaxed whitespace-pre-line">{popup.content}</p>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
