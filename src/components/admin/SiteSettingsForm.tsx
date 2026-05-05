'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Video, Save } from 'lucide-react'

const INPUT = 'w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-tfs-teal'

type VideoStatus = 'idle' | 'checking' | 'ok' | 'error'

async function checkOembed(id: string): Promise<VideoStatus> {
  if (!id) return 'idle'
  try {
    const res = await fetch(
      `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${encodeURIComponent(id)}&format=json`
    )
    return res.ok ? 'ok' : 'error'
  } catch {
    return 'error'
  }
}

export default function SiteSettingsForm({ youtubeVideoId }: { youtubeVideoId: string }) {
  const router = useRouter()
  const [videoInput,   setVideoInput]   = useState(youtubeVideoId)
  const [saving,       setSaving]       = useState(false)
  const [saved,        setSaved]        = useState(false)
  const [error,        setError]        = useState('')
  const [videoStatus,  setVideoStatus]  = useState<VideoStatus>('idle')

  // Check the currently-saved video on mount
  useEffect(() => {
    const id = extractId(youtubeVideoId)
    if (!id) return
    setVideoStatus('checking')
    checkOembed(id).then(setVideoStatus)
  }, [youtubeVideoId])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    const res = await fetch('/api/admin/site-settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ youtube_video_id: videoInput }),
    })
    setSaving(false)
    if (!res.ok) {
      const d = await res.json()
      setError(d.error ?? 'Save failed')
      return
    }
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
    // Validate the newly-saved video
    const id = extractId(videoInput)
    if (id) {
      setVideoStatus('checking')
      checkOembed(id).then(setVideoStatus)
    } else {
      setVideoStatus('idle')
    }
    router.refresh()
  }

  return (
    <div className="card mt-8">
      <h2 className="font-serif font-bold text-tfs-navy text-xl mb-1 flex items-center gap-2">
        <Video size={20} className="text-tfs-teal" /> Site Content Settings
      </h2>
      <p className="text-sm text-tfs-slate mb-6">Control content that appears publicly on the home page.</p>

      <form onSubmit={handleSave} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-tfs-navy mb-1">
            Featured YouTube Video
          </label>
          <input
            type="text"
            value={videoInput}
            onChange={e => setVideoInput(e.target.value)}
            placeholder="Paste a YouTube URL or video ID"
            className={INPUT}
          />
          <p className="text-xs text-tfs-slate mt-1">
            Accepts a full YouTube URL or bare video ID. Leave blank to hide the video section.
          </p>
          {videoInput.trim() && (
            <p className="text-xs text-tfs-teal mt-1 font-mono">
              Video ID: {extractId(videoInput)}
            </p>
          )}
          {videoStatus === 'checking' && (
            <p className="text-xs text-tfs-slate mt-1">Checking video availability…</p>
          )}
          {videoStatus === 'ok' && (
            <p className="text-xs text-green-600 mt-1">✓ Video is accessible — section is live on the homepage.</p>
          )}
          {videoStatus === 'error' && (
            <p className="text-xs text-amber-600 mt-1 font-medium">
              ⚠ Video is unavailable or embedding is restricted. The video section is hidden on the homepage until a valid video is set.
            </p>
          )}
        </div>

        {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">{error}</p>}

        <div className="flex items-center gap-3 pt-1">
          <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2">
            <Save size={15} />
            {saving ? 'Saving…' : 'Save Settings'}
          </button>
          {saved && <span className="text-sm text-tfs-teal font-medium">Saved!</span>}
        </div>
      </form>
    </div>
  )
}

function extractId(input: string): string {
  const trimmed = input.trim()
  try {
    const url = new URL(trimmed)
    if (url.hostname.includes('youtu.be')) return url.pathname.slice(1).split('?')[0]
    const v = url.searchParams.get('v')
    if (v) return v
  } catch { /* bare id */ }
  return trimmed.split('?')[0].split('&')[0]
}
