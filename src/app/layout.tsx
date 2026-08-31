export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'
import localFont from 'next/font/local'
import './globals.css'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import PopupManager from '@/components/public/PopupManager'
import { Analytics } from '@vercel/analytics/next'
import { SpeedInsights } from '@vercel/speed-insights/next'
import ConsoleCapture from '@/components/ConsoleCapture'

// Playfair Display Black powers the word "Impact" in the tagline under the logo.
// The font file is self-hosted from /public/fonts (SIL Open Font License, see
// PlayfairDisplay-OFL.txt alongside it) rather than pulled from a font CDN, so the
// page makes no third-party request and renders identically on every network.
const playfair = localFont({
  src: '../../public/fonts/PlayfairDisplay-Black.woff2',
  weight: '900',
  style: 'normal',
  display: 'swap',
  variable: '--font-playfair',
})

export const metadata: Metadata = {
  title: {
    default: 'Tenant Financial Solutions — Tenant Focused, Community Impact',
    template: '%s | Tenant Financial Solutions',
  },
  applicationName: 'Tenant Financial Solutions',
  description:
    'Personal financial coaching for tenants. One-on-one sessions, TFS Community Connect, and property management partnerships. Real People – Real Coaching.',
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'https://tenantfinancialsolutions.com'),
  openGraph: {
    siteName: 'Tenant Financial Solutions',
    type: 'website',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={playfair.variable}>
      <body>
        <ConsoleCapture />
        <Navbar />
        <main>{children}</main>
        <Footer />
        <PopupManager />
        <Analytics />
        <SpeedInsights />
        {/* Web Launch Academy analytics */}
        <script defer src="https://www.weblaunchacademy.com/beacon.js" data-site="cbb96ea5-f384-47cf-b603-109ab43e8ad0"></script>
      </body>
    </html>
  )
}
