export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'
import './globals.css'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import PopupManager from '@/components/public/PopupManager'
import { Analytics } from '@vercel/analytics/next'
import { SpeedInsights } from '@vercel/speed-insights/next'

export const metadata: Metadata = {
  title: {
    default: 'Tenant Financial Solutions — Tenant Focused, Community Impact',
    template: '%s | Tenant Financial Solutions',
  },
  applicationName: 'Tenant Financial Solutions',
  description:
    'Personal financial coaching for tenants. One-on-one sessions, group coaching, and property management partnerships. Real People – Real Coaching.',
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'https://tenantfinancialsolutions.com'),
  openGraph: {
    siteName: 'Tenant Financial Solutions',
    type: 'website',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Navbar />
        <main>{children}</main>
        <Footer />
        <PopupManager />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  )
}
