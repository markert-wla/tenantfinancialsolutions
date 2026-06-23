export const dynamic = 'force-dynamic'

// ⚠️ INTENTIONAL BUILD ERROR — safe to delete this branch
// This import references a module that does not exist, triggering a
// "Module not found" error during `next build` to test the error flow.
import { INTENTIONAL_BUILD_ERROR_DO_NOT_SHIP } from '@/this-module-does-not-exist'

import type { Metadata } from 'next'
import './globals.css'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import PopupManager from '@/components/public/PopupManager'
import { Analytics } from '@vercel/analytics/next'
import { SpeedInsights } from '@vercel/speed-insights/next'
import ConsoleCapture from '@/components/ConsoleCapture'

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
        <ConsoleCapture />
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
