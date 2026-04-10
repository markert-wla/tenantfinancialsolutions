import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

/**
 * POST /api/cron/reset-sessions
 *
 * Resets sessions_used_this_month to 0 for all clients.
 * Called automatically on the 1st of each month via Vercel Cron.
 * Secured with the CRON_SECRET env var that Vercel injects.
 */
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  const secret     = process.env.CRON_SECRET

  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()
  const { error } = await supabase.rpc('reset_monthly_sessions')

  if (error) {
    console.error('[cron/reset-sessions] RPC error:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  console.log('[cron/reset-sessions] Monthly session counts reset successfully.')
  return NextResponse.json({ ok: true, resetAt: new Date().toISOString() })
}
