import { Resend } from 'resend'

export const FROM = process.env.RESEND_FROM_EMAIL ?? 'noreply@tenantfinancialsolutions.com'
export const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'tenantfinancialsolutions@gmail.com'

/** Stub: sends email when RESEND_API_KEY is set, silently no-ops otherwise. */
export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string | string[]
  subject: string
  html: string
}) {
  if (!process.env.RESEND_API_KEY) {
    console.log('[Resend stub] Email not sent — RESEND_API_KEY not set.')
    console.log('  To:', to, '\n  Subject:', subject)
    return
  }
  const resend = new Resend(process.env.RESEND_API_KEY)
  await resend.emails.send({ from: FROM, to, subject, html })
}
