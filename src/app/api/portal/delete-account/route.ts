import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { sendEmail, ADMIN_EMAIL } from '@/lib/resend'
import { brandedEmail, emailButton } from '@/lib/email-template'

const GRACE_DAYS = 30

function fmtDate(iso: string) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'long', day: 'numeric', year: 'numeric', timeZone: 'America/New_York',
  }).format(new Date(iso))
}

// POST /api/portal/delete-account
// body: { action: 'request' | 'restore' }
export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: { action?: string }
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
  if (body.action !== 'request' && body.action !== 'restore') {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, first_name, last_name, email, deletion_requested_at')
    .eq('id', user.id)
    .single()

  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
  // Only real clients can self-delete — keeps an admin previewing the portal
  // from scheduling their own admin account for the purge cron.
  if (profile.role !== 'client') {
    return NextResponse.json({ error: 'Only client accounts can be deleted here.' }, { status: 403 })
  }

  const service = createServiceClient()
  const name    = [profile.first_name, profile.last_name].filter(Boolean).join(' ') || profile.email
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? ''

  if (body.action === 'request') {
    if (profile.deletion_requested_at) {
      return NextResponse.json({ error: 'Deletion already requested' }, { status: 400 })
    }

    const requestedAt   = new Date()
    const scheduledFor  = new Date(requestedAt.getTime() + GRACE_DAYS * 24 * 60 * 60 * 1000)

    const { error } = await service
      .from('profiles')
      .update({
        deletion_requested_at: requestedAt.toISOString(),
        deletion_scheduled_for: scheduledFor.toISOString(),
      })
      .eq('id', user.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const dateLabel = fmtDate(scheduledFor.toISOString())

    await Promise.all([
      profile.email ? sendEmail({
        to: profile.email,
        subject: 'Your Account Deletion Request',
        html: brandedEmail(`
          <h1 style="margin:0 0 8px;font-family:Georgia,serif;font-size:22px;color:#1A2B4A;">Account Deletion Requested</h1>
          <p style="margin:0 0 16px;color:#6B7E8F;">
            Hi ${profile.first_name ?? 'there'}, we received your request to delete your
            Tenant Financial Solutions account.
          </p>
          <p style="margin:0 0 16px;color:#6B7E8F;">
            Your account and all of its data will be <strong style="color:#1A2B4A;">permanently
            deleted on ${dateLabel}</strong>. Until then, nothing is removed — if you change
            your mind, just log in and choose <strong style="color:#1A2B4A;">Restore My
            Account</strong> on your Profile page.
          </p>
          <p style="margin:0 0 24px;color:#6B7E8F;">
            If you would like your information permanently deleted sooner, reply to this
            email or use our contact page and we will take care of it right away.
          </p>
          ${emailButton(`${siteUrl}/portal/profile`, 'Restore My Account')}
          <p style="margin:24px 0 0;font-size:13px;color:#6B7E8F;">— The TFS Team</p>
        `),
      }).catch(err => console.error('[Delete account] Client email failed:', err)) : Promise.resolve(),
      sendEmail({
        to: ADMIN_EMAIL,
        subject: `Account Deletion Requested — ${name}`,
        html: brandedEmail(`
          <h1 style="margin:0 0 8px;font-family:Georgia,serif;font-size:22px;color:#1A2B4A;">Client Requested Account Deletion</h1>
          <p style="margin:0 0 16px;color:#6B7E8F;">
            <strong style="color:#1A2B4A;">${name}</strong> (${profile.email}) has requested
            deletion of their account.
          </p>
          <p style="margin:0 0 24px;color:#6B7E8F;">
            Their data will be <strong style="color:#1A2B4A;">permanently deleted on
            ${dateLabel}</strong> unless they restore their account first. From the Clients
            page you can extend the retention period or delete their data immediately.
          </p>
          ${emailButton(`${siteUrl}/admin/clients`, 'Manage in Admin')}
          <p style="margin:24px 0 0;font-size:13px;color:#6B7E8F;">— TFS System</p>
        `),
      }).catch(err => console.error('[Delete account] Admin email failed:', err)),
    ])

    return NextResponse.json({ ok: true, scheduledFor: scheduledFor.toISOString() })
  }

  // action === 'restore'
  if (!profile.deletion_requested_at) {
    return NextResponse.json({ error: 'No deletion request to cancel' }, { status: 400 })
  }

  const { error } = await service
    .from('profiles')
    .update({ deletion_requested_at: null, deletion_scheduled_for: null })
    .eq('id', user.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await Promise.all([
    profile.email ? sendEmail({
      to: profile.email,
      subject: 'Your Account Has Been Restored',
      html: brandedEmail(`
        <h1 style="margin:0 0 8px;font-family:Georgia,serif;font-size:22px;color:#1A2B4A;">Welcome Back!</h1>
        <p style="margin:0 0 24px;color:#6B7E8F;">
          Hi ${profile.first_name ?? 'there'}, your account deletion request has been
          cancelled. Your account and all of your data remain exactly as they were.
        </p>
        ${emailButton(`${siteUrl}/portal/dashboard`, 'Go to My Dashboard')}
        <p style="margin:24px 0 0;font-size:13px;color:#6B7E8F;">— The TFS Team</p>
      `),
    }).catch(err => console.error('[Delete account] Restore email failed:', err)) : Promise.resolve(),
    sendEmail({
      to: ADMIN_EMAIL,
      subject: `Account Restored — ${name}`,
      html: brandedEmail(`
        <p style="margin:0 0 8px;color:#6B7E8F;">
          <strong style="color:#1A2B4A;">${name}</strong> (${profile.email}) cancelled their
          account deletion request. No action needed.
        </p>
      `),
    }).catch(err => console.error('[Delete account] Admin restore email failed:', err)),
  ])

  return NextResponse.json({ ok: true })
}
