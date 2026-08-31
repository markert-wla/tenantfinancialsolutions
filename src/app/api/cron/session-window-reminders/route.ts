import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/resend'
import { brandedEmail } from '@/lib/email-template'
import { SESSION_LIMITS } from '@/lib/stripe'
import { getSessionCycle, sessionsUsedThisCycle, hoursUntilCycleEnd } from '@/lib/sessions/cycle'
import { cycleReminderBody } from '@/lib/sessions/cycleEmails'

export const dynamic = 'force-dynamic'

const WARN_WITHIN_HOURS = 72

/**
 * GET /api/cron/session-window-reminders
 *
 * Emails a client 72 hours before their coaching month closes, if they still
 * have an unused session. Runs daily; `cycle_reminder_sent_for` records the
 * window a client was last warned about, so each client hears from us once per
 * window rather than once a day for three days.
 *
 * Who is in scope:
 *   - Starter and Advantage clients (1 and 2 sessions a month).
 *   - Full-comp Tenant Partners, who get 2 sessions a month at no charge — they
 *     have the same clock, just no payment attached.
 *   - Both the new per-client windows and the legacy 1st-of-the-month reset, so
 *     existing clients are warned before month end too.
 *
 * Deliberately out of scope: TFS Community Connect (group_comp, no individual
 * sessions), non-tenant full-comp partners (unlimited, no clock), and free-trial
 * clients, whose deadline is their trial expiry rather than a session window.
 *
 * Vercel Cron always dispatches a GET request — this must stay GET, not POST.
 */

type ReminderProfile = {
  id: string
  first_name: string | null
  email: string | null
  timezone: string | null
  plan_tier: string | null
  client_type: string | null
  applied_code_type: string | null
  promo_expires_at: string | null
  sessions_used_this_month: number | null
  extra_sessions: number | null
  uses_anniversary_cycle: boolean | null
  session_cycle_anchor: string | null
  session_cycle_started_at: string | null
  cycle_reminder_sent_for: string | null
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  const secret     = process.env.CRON_SECRET

  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const service = createServiceClient()
  const now     = new Date()

  const { data: rows, error } = await service
    .from('profiles')
    .select(
      'id, first_name, email, timezone, plan_tier, client_type, applied_code_type, promo_expires_at, ' +
      'sessions_used_this_month, extra_sessions, uses_anniversary_cycle, session_cycle_anchor, ' +
      'session_cycle_started_at, cycle_reminder_sent_for'
    )
    .eq('role', 'client')
    .eq('is_active', true)
    .is('deletion_requested_at', null)

  if (error) {
    console.error('[cron/session-window-reminders] query error:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  let sent    = 0
  let failed  = 0
  let skipped = 0

  for (const profile of (rows ?? []) as ReminderProfile[]) {
    const promoActive    = !profile.promo_expires_at || new Date(profile.promo_expires_at) >= now
    const activeCodeType = promoActive ? (profile.applied_code_type ?? null) : null
    const isTenant       = profile.client_type === 'property_tenant'
    const tier           = profile.plan_tier ?? 'free'

    // How many sessions this client's window holds. null = no clock to warn about.
    let limit: number | null = null
    if (activeCodeType === 'group_comp')            limit = null
    else if (activeCodeType === 'full_comp')        limit = isTenant ? 2 : null
    else if (tier === 'starter' || tier === 'advantage') limit = SESSION_LIMITS[tier] ?? null

    if (limit === null) { skipped++; continue }

    const cycle     = getSessionCycle(profile, now)
    const used      = sessionsUsedThisCycle(profile, now)
    const remaining = Math.max(0, limit - used)
    if (remaining === 0) { skipped++; continue }

    const hoursLeft = hoursUntilCycleEnd(cycle, now)
    if (hoursLeft < 0 || hoursLeft > WARN_WITHIN_HOURS) { skipped++; continue }

    // Already warned about this window.
    const lastWarned = profile.cycle_reminder_sent_for ? new Date(profile.cycle_reminder_sent_for) : null
    if (lastWarned && !isNaN(lastWarned.getTime()) && lastWarned.getTime() >= cycle.start.getTime()) {
      skipped++
      continue
    }

    if (!profile.email) { skipped++; continue }

    try {
      await sendEmail({
        to: profile.email,
        subject: `${remaining} coaching session${remaining !== 1 ? 's' : ''} left — 3 days to book`,
        html: brandedEmail(cycleReminderBody({
          firstName: profile.first_name ?? 'there',
          remaining,
          cycle,
          timezone: profile.timezone ?? 'America/New_York',
          isComp: activeCodeType === 'full_comp',
        })),
      })

      await service
        .from('profiles')
        .update({ cycle_reminder_sent_for: cycle.start.toISOString() })
        .eq('id', profile.id)

      sent++
    } catch (err) {
      failed++
      console.error(`[cron/session-window-reminders] failed for ${profile.id}:`, err)
    }
  }

  const result = { sent, failed, skipped, ranAt: now.toISOString() }
  if (failed) console.error('[cron/session-window-reminders] incomplete run:', JSON.stringify(result))
  return NextResponse.json(result)
}
