import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Sign Up Free',
  description:
    'Create your free account at Tenant Financial Solutions. Start with a free Connection Session — no credit card required.',
  openGraph: {
    title: 'Sign Up Free | Tenant Financial Solutions',
    description: 'Start your financial coaching journey. Your first Connection Session is on us.',
    url: '/register',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Sign Up Free | Tenant Financial Solutions',
    description: 'Start your financial coaching journey. Your first Connection Session is on us.',
  },
}

export default function RegisterLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
