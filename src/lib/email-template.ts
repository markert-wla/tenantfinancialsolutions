const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://tenantfinancialsolutions.com'

/**
 * Wraps email body content in the TFS branded shell.
 * bodyHtml should contain <p>, <ul>, buttons, etc. — no outer wrapper needed.
 */
export function brandedEmail(bodyHtml: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#E8F7F2;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#E8F7F2;padding:40px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">

        <tr><td style="background:#1A2B4A;border-radius:12px 12px 0 0;padding:32px 40px;text-align:center;">
          <img src="${SITE_URL}/images/logo.png" alt="Tenant Financial Solutions" height="44" style="height:44px;width:auto;">
        </td></tr>

        <tr><td style="background:#ffffff;padding:40px 40px 32px;border-radius:0 0 12px 12px;font-size:15px;color:#1A2B4A;line-height:1.6;">
          ${bodyHtml}
        </td></tr>

        <tr><td style="padding:24px 0;text-align:center;">
          <p style="margin:0;font-size:12px;color:#6B7E8F;">
            &copy; ${new Date().getFullYear()} Tenant Financial Solutions &nbsp;|&nbsp;
            <a href="${SITE_URL}" style="color:#1D9E75;text-decoration:none;">tenantfinancialsolutions.com</a>
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`
}

/** Teal CTA button */
export function emailButton(href: string, label: string): string {
  return `<div style="text-align:center;margin:32px 0;">
    <a href="${href}" style="display:inline-block;background:#1D9E75;color:#ffffff;font-size:15px;font-weight:bold;text-decoration:none;padding:14px 36px;border-radius:8px;letter-spacing:0.3px;">${label}</a>
  </div>`
}
