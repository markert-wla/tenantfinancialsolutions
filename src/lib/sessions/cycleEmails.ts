import { emailButton } from '@/lib/email-template'
import { SESSION_LIMITS } from '@/lib/stripe'
import {
  type SessionCycle,
  formatCycleRange,
  formatCycleDeadline,
  formatCycleRenewal,
} from '@/lib/sessions/cycle'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://tenantfinancialsolutions.com'

const TIER_NAME: Record<string, string> = { starter: 'Starter', advantage: 'Advantage' }

function esc(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

/** The window facts, as a table — identical wording in both emails. */
function windowTable(rows: [string, string][]): string {
  return `<table cellpadding="0" cellspacing="0" style="width:100%;background:#F8FFFE;border:1px solid #D1EFE6;border-radius:8px;margin-bottom:24px;">
    ${rows.map(([label, value], i) => `<tr><td style="padding:12px 16px;${i > 0 ? 'border-top:1px solid #D1EFE6;' : ''}">
      <span style="font-size:12px;color:#6B7E8F;text-transform:uppercase;letter-spacing:0.5px;">${esc(label)}</span><br>
      <strong style="color:#1A2B4A;">${esc(value)}</strong>
    </td></tr>`).join('')}
  </table>`
}

/**
 * Sent the moment a client starts a paid plan: spells out how many sessions they
 * get, the exact dates of their first window, and that unused sessions do not
 * carry over.
 */
export function planWelcomeBody(opts: {
  firstName: string
  tier: string
  cycle: SessionCycle
  timezone: string
}): string {
  const { firstName, tier, cycle, timezone } = opts
  const limit = SESSION_LIMITS[tier] ?? 1
  const plan  = TIER_NAME[tier] ?? tier

  return `
    <h1 style="margin:0 0 8px;font-family:Georgia,serif;font-size:24px;color:#1A2B4A;">Welcome to the ${esc(plan)} Plan!</h1>
    <p style="margin:0 0 24px;color:#6B7E8F;">Hi ${esc(firstName)}, your plan is active. Here is exactly how your coaching sessions work, so nothing goes unused.</p>
    ${windowTable([
      ['Your plan', `${plan} — ${limit} coaching session${limit !== 1 ? 's' : ''} per month`],
      ['Your first month runs', formatCycleRange(cycle, timezone)],
      ['Book by', formatCycleDeadline(cycle, timezone)],
      [`Next ${limit} session${limit !== 1 ? 's' : ''} available`, formatCycleRenewal(cycle, timezone)],
    ])}
    <p style="margin:0 0 8px;color:#1A2B4A;"><strong>Your month runs from your own signup date</strong> — not from the 1st of the calendar month. You get a full month of use for every payment.</p>
    <p style="margin:0 0 24px;color:#6B7E8F;">Sessions do not carry over. Anything unused when your month ends is gone, so we will email you 3 days before your window closes if you still have a session left.</p>
    ${emailButton(`${SITE_URL}/portal/book`, 'Book My Session')}
    <p style="margin:24px 0 0;font-size:13px;color:#6B7E8F;">Questions? Just reply to this email. — The TFS Team</p>
  `
}

/**
 * Sent 72 hours before a client's window closes while they still have an unused
 * session.
 */
export function cycleReminderBody(opts: {
  firstName: string
  remaining: number
  cycle: SessionCycle
  timezone: string
  isComp: boolean
}): string {
  const { firstName, remaining, cycle, timezone, isComp } = opts
  const plural = remaining !== 1

  return `
    <h1 style="margin:0 0 8px;font-family:Georgia,serif;font-size:24px;color:#1A2B4A;">You have ${remaining} coaching session${plural ? 's' : ''} left — 3 days to use ${plural ? 'them' : 'it'}</h1>
    <p style="margin:0 0 24px;color:#6B7E8F;">Hi ${esc(firstName)}, your current coaching month is nearly over and ${plural ? 'these sessions have' : 'this session has'} not been booked yet.</p>
    ${windowTable([
      [plural ? 'Sessions remaining' : 'Session remaining', String(remaining)],
      ['Book by', formatCycleDeadline(cycle, timezone)],
      ['Your month runs', formatCycleRange(cycle, timezone)],
      ['Fresh sessions available', formatCycleRenewal(cycle, timezone)],
    ])}
    <p style="margin:0 0 24px;color:#6B7E8F;">
      Unused sessions do not carry over into next month${isComp ? '' : ', and your next payment starts a new month'}.
      Sessions must be booked at least 24 hours in advance, so it is worth picking a time today.
    </p>
    ${emailButton(`${SITE_URL}/portal/book`, plural ? 'Book My Sessions' : 'Book My Session')}
    <p style="margin:24px 0 0;font-size:13px;color:#6B7E8F;">— The TFS Team</p>
  `
}
