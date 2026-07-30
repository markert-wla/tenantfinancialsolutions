import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { sendEmail, ADMIN_EMAIL } from '@/lib/resend'
import { brandedEmail } from '@/lib/email-template'

export const dynamic = 'force-dynamic'

/**
 * GET /api/cron/purge-deleted-accounts
 *
 * Permanently deletes client accounts whose self-service deletion request
 * has passed its scheduled purge date (default 30 days after the request;
 * admins can push deletion_scheduled_for further out per account).
 *
 * Cleanup mirrors the delete_client_account() DB function: bookings and
 * promo_codes.created_by have NO ACTION FKs and must be handled explicitly;
 * everything else cascades from the auth.users delete. Also removes the
 * newsletter row for the account's email, since a deletion request is a
 * clear signal to stop contacting them.
 *
 * Vercel Cron always dispatches a GET request — this must stay GET, not POST.
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  const secret     = process.env.CRON_SECRET

  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const service = createServiceClient()

  const { data: due, error: dueErr } = await service
    .from('profiles')
    .select('id, first_name, last_name, email, deletion_requested_at, deletion_scheduled_for')
    .eq('role', 'client')
    .not('deletion_scheduled_for', 'is', null)
    .lte('deletion_scheduled_for', new Date().toISOString())

  if (dueErr) return NextResponse.json({ error: dueErr.message }, { status: 500 })
  if (!due || due.length === 0) return NextResponse.json({ purged: 0 })

  const purged: string[] = []
  const failed: string[] = []

  for (const p of due) {
    const name = [p.first_name, p.last_name].filter(Boolean).join(' ') || p.email
    try {
      await service.from('bookings').delete().eq('client_id', p.id)
      await service.from('promo_codes').update({ created_by: null }).eq('created_by', p.id)
      if (p.email) {
        await service.from('newsletter_subscribers').delete().eq('email', p.email)
      }
      const { error: delErr } = await service.auth.admin.deleteUser(p.id)
      if (delErr) throw delErr
      purged.push(name)
    } catch (err) {
      console.error(`[Purge] Failed to delete account ${p.id}:`, err)
      failed.push(name)
    }
  }

  if (purged.length > 0 || failed.length > 0) {
    await sendEmail({
      to: ADMIN_EMAIL,
      subject: `Account Purge — ${purged.length} deleted${failed.length ? `, ${failed.length} failed` : ''}`,
      html: brandedEmail(`
        <h1 style="margin:0 0 8px;font-family:Georgia,serif;font-size:22px;color:#1A2B4A;">Scheduled Account Deletions Completed</h1>
        <p style="margin:0 0 16px;color:#6B7E8F;">
          The following client accounts passed their 30-day grace period and were
          permanently deleted, per their request:
        </p>
        <p style="margin:0 0 16px;color:#1A2B4A;"><strong>${purged.join(', ') || 'None'}</strong></p>
        ${failed.length ? `<p style="margin:0 0 16px;color:#B91C1C;">Failed (needs attention): <strong>${failed.join(', ')}</strong></p>` : ''}
        <p style="margin:24px 0 0;font-size:13px;color:#6B7E8F;">— TFS System</p>
      `),
    }).catch(err => console.error('[Purge] Admin summary email failed:', err))
  }

  return NextResponse.json({ purged: purged.length, failed: failed.length })
}
