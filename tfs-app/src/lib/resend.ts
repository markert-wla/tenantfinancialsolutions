import { Resend } from 'resend'

export const FROM = process.env.RESEND_FROM_EMAIL ?? 'noreply@tenantfinancialsolutions.com'
const ADMIN_EMAILS_LIST = (process.env.ADMIN_EMAILS ?? 'tenantfinancialsolutions@gmail.com')
  .split(',')
  .map(e => e.trim())
  .filter(Boolean)
export const ADMIN_EMAIL = ADMIN_EMAILS_LIST[0]

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
