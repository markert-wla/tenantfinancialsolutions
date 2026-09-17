import { sendEmail } from '@/lib/resend'
import { brandedEmail, emailButton } from '@/lib/email-template'

/**
 * Admin alert for a client starting a paid plan or moving up a plan.
 *
 * Deliberately only fires when the tier actually moves *up* (free → Starter,
 * free → Advantage, Starter → Advantage). Renewals re-send
 * customer.subscription.updated every billing cycle with the same tier, so
 * comparing against the tier already on the profile is what stops the owner's
 * inbox filling with duplicates. It is also what de-duplicates the two events
 * Stripe sends for one purchase (checkout.session.completed and
 * customer.subscription.created): whichever lands first writes the new tier,
 * and the second sees no change.
 *
 * Never throws — an alert that fails must not fail the payment flow that
 * triggered it.
 */

/** Where new-plan / upgrade alerts are sent. */
const PLAN_ALERT_TO = 'michael@tenantfinancialsolutions.com'

const TIER_RANK: Record<string, number> = { free: 0, starter: 1, advantage: 2 }

const TIER_LABEL: Record<string, string> = {
  free:      'Free',
  starter:   'Starter Plan',
  advantage: 'Advantage Plan',
}

function label(tier: string | null | undefined): string {
  if (!tier) return 'None'
  return TIER_LABEL[tier] ?? tier
}

function esc(value: string | null | undefined): string {
  return (value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export type PlanAlertInput = {
  userId: string
  previousTier: string | null | undefined
  newTier: string
  firstName?: string | null
  lastName?: string | null
  email?: string | null
  /** Where the change came from, for the log line only. */
  source: string
}

export async function notifyAdminOfPlanChange(input: PlanAlertInput): Promise<void> {
  const { userId, previousTier, newTier, source } = input

  const from = TIER_RANK[previousTier ?? 'free'] ?? 0
  const to   = TIER_RANK[newTier]
  if (to === undefined || to <= from) return   // renewal, downgrade or unknown tier — nothing to announce

  const isNew   = from === 0
  const name    = `${input.firstName ?? ''} ${input.lastName ?? ''}`.trim() || 'A client'
  const heading = isNew ? 'New Paid Plan' : 'Plan Upgrade'
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://tenantfinancialsolutions.com'
  const when    = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York', weekday: 'long', month: 'long', day: 'numeric',
    year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true,
  }).format(new Date())

  try {
    await sendEmail({
      to: PLAN_ALERT_TO,
      subject: isNew
        ? `New ${label(newTier)} subscriber — ${name}`
        : `Plan upgrade: ${label(previousTier)} → ${label(newTier)} — ${name}`,
      html: brandedEmail(`
        <h1 style="margin:0 0 8px;font-family:Georgia,serif;font-size:24px;color:#1A2B4A;">${heading}</h1>
        <p style="margin:0 0 24px;color:#6B7E8F;">
          <strong>${esc(name)}</strong> is now on the <strong>${label(newTier)}</strong>.
        </p>
        <table cellpadding="0" cellspacing="0" style="width:100%;font-size:14px;color:#1A2B4A;">
          <tr><td style="padding:4px 0;color:#6B7E8F;width:120px;">Client</td><td style="padding:4px 0;">${esc(name)}</td></tr>
          <tr><td style="padding:4px 0;color:#6B7E8F;">Email</td><td style="padding:4px 0;">${esc(input.email) || '—'}</td></tr>
          <tr><td style="padding:4px 0;color:#6B7E8F;">Previous plan</td><td style="padding:4px 0;">${label(previousTier)}</td></tr>
          <tr><td style="padding:4px 0;color:#6B7E8F;">New plan</td><td style="padding:4px 0;"><strong>${label(newTier)}</strong></td></tr>
          <tr><td style="padding:4px 0;color:#6B7E8F;">When</td><td style="padding:4px 0;">${when} ET</td></tr>
        </table>
        ${emailButton(`${siteUrl}/admin/clients`, 'View Clients')}
        <p style="margin:24px 0 0;font-size:13px;color:#6B7E8F;">— Tenant Financial Solutions</p>
      `),
    })
    console.log(`[plan-alert] ${source}: ${userId} ${previousTier ?? 'none'} → ${newTier} — admin notified`)
  } catch (err) {
    console.error(`[plan-alert] ${source}: admin notification for ${userId} failed:`, err)
  }
}
