import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

function extractYouTubeId(input: string): string {
  const trimmed = input.trim()
  if (!trimmed) return ''
  try {
    const url = new URL(trimmed)
    if (url.hostname.includes('youtu.be')) {
      return url.pathname.slice(1).split('?')[0]
    }
    const v = url.searchParams.get('v')
    if (v) return v
  } catch {
    // not a URL — treat as bare ID
  }
  return trimmed.split('?')[0].split('&')[0]
}

export async function PATCH(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  let body: { youtube_video_id?: string }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid request' }, { status: 400 }) }

  if (typeof body.youtube_video_id === 'string') {
    const videoId = extractYouTubeId(body.youtube_video_id)
    const { error } = await supabase
      .from('site_settings')
      .upsert({ key: 'youtube_video_id', value: videoId })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
