'use client'
import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const PORTAL_PREFIXES = ['/admin', '/coach', '/portal', '/manager']

function IconInstagram() {
  return (
    <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
      <circle cx="12" cy="12" r="4"/>
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/>
    </svg>
  )
}
function IconFacebook() {
  return (
    <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
      <path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z"/>
    </svg>
  )
}

export default function Footer() {
  const pathname = usePathname()
  const isPortal = PORTAL_PREFIXES.some(p => pathname.startsWith(p))
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle'|'loading'|'done'|'error'>('idle')

  async function handleSubscribe(e: React.FormEvent) {
    e.preventDefault()
    setStatus('loading')
    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      setStatus(res.ok ? 'done' : 'error')
    } catch {
      setStatus('error')
    }
  }

  if (isPortal) {
    return (
      <footer className="bg-tfs-navy text-white">
        <div className="md:pl-56">
          <div className="px-6 py-4 flex flex-col sm:flex-row justify-between items-center gap-2 text-xs text-gray-400">
            <p>
              &copy; {new Date().getFullYear()} Tenant Financial Solutions. All rights reserved.{' '}
              <Link href="/privacy" className="hover:text-tfs-teal transition-colors underline underline-offset-2">Privacy Policy</Link>
              {' · '}
              <Link href="/terms" className="hover:text-tfs-teal transition-colors underline underline-offset-2">Terms of Service</Link>
            </p>
            <div className="flex gap-4">
              <a href="https://www.instagram.com/mjmfinancialcoaching/" target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="hover:text-tfs-teal transition-colors"><IconInstagram /></a>
              <a href="https://www.facebook.com/profile.php?id=61578631015293" target="_blank" rel="noopener noreferrer" aria-label="Facebook" className="hover:text-tfs-teal transition-colors"><IconFacebook /></a>
            </div>
          </div>
        </div>
      </footer>
    )
  }

  return (
    <footer className="bg-tfs-navy text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">

          {/* Brand */}
          <div className="md:col-span-1">
            <Image
              src="/images/logo.png"
              alt="Tenant Financial Solutions"
              width={160}
              height={48}
              className="h-10 w-auto object-contain mb-4 rounded"
            />
            <p className="text-sm text-gray-300 leading-relaxed">
              Tenant Focused &ndash; Community Impact.<br />
              Real People &ndash; Real Coaching.
            </p>
          </div>

          {/* About */}
          <div>
            <h3 className="font-semibold text-white mb-4 uppercase tracking-wider text-xs">About Us</h3>
            <ul className="space-y-2 text-sm text-gray-300">
              <li><Link href="/our-story" className="hover:text-tfs-teal transition-colors">Our Story</Link></li>
              <li><Link href="/services" className="hover:text-tfs-teal transition-colors">Services</Link></li>
              <li><Link href="/contact" className="hover:text-tfs-teal transition-colors">Contact Us</Link></li>
            </ul>
          </div>

          {/* Social */}
          <div>
            <h3 className="font-semibold text-white mb-4 uppercase tracking-wider text-xs">Follow Us</h3>
            <div className="flex gap-4">
              <a href="https://www.instagram.com/mjmfinancialcoaching/" target="_blank" rel="noopener noreferrer"
                 aria-label="Instagram" className="text-gray-300 hover:text-tfs-teal transition-colors">
                <IconInstagram />
              </a>
              <a href="https://www.facebook.com/profile.php?id=61578631015293" target="_blank" rel="noopener noreferrer"
                 aria-label="Facebook" className="text-gray-300 hover:text-tfs-teal transition-colors">
                <IconFacebook />
              </a>
            </div>
            <div className="mt-4 text-sm text-gray-300">
              <a href="mailto:michael@tenantfinancialsolutions.com" className="hover:text-tfs-teal transition-colors">
                michael@tenantfinancialsolutions.com
              </a>
            </div>
          </div>

          {/* Subscribe */}
          <div>
            <h3 className="font-semibold text-white mb-4 uppercase tracking-wider text-xs">Subscribe</h3>
            <p className="text-sm text-gray-300 mb-3">Sign up to receive news and updates.</p>
            {status === 'done' ? (
              <p className="text-tfs-gold text-sm font-medium">You&apos;re subscribed!</p>
            ) : (
              <form onSubmit={handleSubscribe} className="flex gap-2">
                <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="Email Address"
                  className="flex-1 min-w-0 px-3 py-2 rounded-lg text-sm text-tfs-navy bg-white
                             focus:outline-none focus:ring-2 focus:ring-tfs-teal" />
                <button type="submit" disabled={status === 'loading'}
                  className="px-4 py-2 rounded-lg border border-white text-white text-sm font-semibold
                             hover:bg-white hover:text-tfs-navy transition-colors disabled:opacity-50">
                  {status === 'loading' ? '...' : 'Sign Up'}
                </button>
              </form>
            )}
            {status === 'error' && (
              <p className="text-red-400 text-xs mt-1">Something went wrong. Try again.</p>
            )}
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-white/10 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-gray-400">
          <p>
            &copy; {new Date().getFullYear()} Tenant Financial Solutions. All rights reserved.{' '}
            <Link href="/privacy" className="hover:text-tfs-teal transition-colors underline underline-offset-2">
              Privacy Policy
            </Link>
            {' · '}
            <Link href="/terms" className="hover:text-tfs-teal transition-colors underline underline-offset-2">
              Terms of Service
            </Link>
          </p>
          <div className="flex gap-4">
            <a href="https://www.instagram.com/mjmfinancialcoaching/" target="_blank" rel="noopener noreferrer"
               aria-label="Instagram" className="hover:text-tfs-teal transition-colors"><IconInstagram /></a>
            <a href="https://www.facebook.com/profile.php?id=61578631015293" target="_blank" rel="noopener noreferrer"
               aria-label="Facebook" className="hover:text-tfs-teal transition-colors"><IconFacebook /></a>
          </div>
        </div>
      </div>
    </footer>
  )
}
