'use client'
import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Menu, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/cn'

const NAV_LINKS = [
  { label: 'Home',     href: '/' },
  { label: 'About',    href: '/about' },
  { label: 'Services', href: '/services' },
  { label: 'Contact',  href: '/contact' },
]

const PUBLIC_PAGES = new Set(['/', '/about', '/services', '/contact'])

const FADE_START = 180
const FADE_END   = 380

export default function Navbar() {
  const pathname = usePathname()
  const [open, setOpen]             = useState(false)
  const [scrolled, setScrolled]     = useState(false)
  const [ctaOpacity, setCtaOpacity] = useState(0)
  const [user, setUser]             = useState<any>(null)
  const [role, setRole]             = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    const isPublic = PUBLIC_PAGES.has(pathname)
    if (!isPublic) { setCtaOpacity(0); return }

    function onScroll() {
      const y = window.scrollY
      setScrolled(y > 20)
      setCtaOpacity(Math.min(1, Math.max(0, (y - FADE_START) / (FADE_END - FADE_START))))
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener('scroll', onScroll)
  }, [pathname])

  useEffect(() => {
    async function loadUser() {
      const { data } = await supabase.auth.getUser()
      setUser(data.user ?? null)
      if (data.user) {
        const { data: profile } = await supabase
          .from('profiles').select('role').eq('id', data.user.id).single()
        setRole(profile?.role ?? 'client')
      } else {
        setRole(null)
      }
    }
    loadUser()
    const { data: listener } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null)
      if (!session?.user) setRole(null)
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  const dashboardHref =
    role === 'admin' ? '/admin/dashboard' :
    role === 'coach' ? '/coach/dashboard' :
    '/portal/dashboard'

  const dashboardLabel = role === 'client' || role === null ? 'My Portal' : 'Dashboard'
  const showSessionBtn  = !user && PUBLIC_PAGES.has(pathname)

  return (
    <header
      className={cn(
        'fixed top-0 inset-x-0 z-50 transition-all duration-300',
        scrolled ? 'bg-white/95 backdrop-blur shadow-sm' : 'bg-transparent'
      )}
    >
      {/* Three-column layout: logo | nav (centered) | auth */}
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center">

        {/* Left — Logo */}
        <div className="flex-1 flex items-center">
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/images/logo.png"
              alt="Tenant Financial Solutions"
              width={160}
              height={48}
              className="h-10 w-auto object-contain"
              priority
            />
          </Link>
        </div>

        {/* Center — Nav links + gradual Session CTA */}
        <ul className="hidden md:flex items-center gap-6">
          {NAV_LINKS.map(({ label, href }) => (
            <li key={href}>
              <Link
                href={href}
                className={cn(
                  'text-sm font-medium transition-colors',
                  scrolled ? 'text-tfs-navy hover:text-tfs-teal' : 'text-white hover:text-tfs-gold'
                )}
              >
                {label}
              </Link>
            </li>
          ))}

          {showSessionBtn && (
            <li
              style={{ opacity: ctaOpacity, pointerEvents: ctaOpacity > 0.1 ? 'auto' : 'none' }}
              aria-hidden={ctaOpacity < 0.1}
            >
              <Link
                href="/register?tier=free"
                tabIndex={ctaOpacity > 0.1 ? 0 : -1}
                className="bg-tfs-gold text-tfs-navy font-bold text-sm px-5 py-2 rounded-lg whitespace-nowrap hover:brightness-105 hover:scale-105 transition-transform duration-150"
              >
                Session
              </Link>
            </li>
          )}
        </ul>

        {/* Right — Auth */}
        <div className="flex-1 hidden md:flex items-center justify-end gap-3">
          {user ? (
            <Link href={dashboardHref} className="btn-primary text-sm py-2">
              {dashboardLabel}
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className={cn(
                  'text-sm font-medium transition-colors',
                  scrolled ? 'text-tfs-navy hover:text-tfs-teal' : 'text-white hover:text-tfs-gold'
                )}
              >
                Login
              </Link>
              <Link href="/register" className="btn-primary text-sm py-2">
                Get Started
              </Link>
            </>
          )}
        </div>

        {/* Mobile burger */}
        <button
          className="md:hidden ml-auto p-2 rounded-lg"
          onClick={() => setOpen(!open)}
          aria-label="Toggle menu"
        >
          {open
            ? <X className={scrolled ? 'text-tfs-navy' : 'text-white'} size={24} />
            : <Menu className={scrolled ? 'text-tfs-navy' : 'text-white'} size={24} />
          }
        </button>
      </nav>

      {/* Mobile drawer */}
      {open && (
        <div className="md:hidden bg-white border-t border-gray-100 px-4 py-4 space-y-3">
          {NAV_LINKS.map(({ label, href }) => (
            <Link
              key={href}
              href={href}
              className="block py-2 text-tfs-navy font-medium hover:text-tfs-teal"
              onClick={() => setOpen(false)}
            >
              {label}
            </Link>
          ))}
          <div className="pt-3 border-t border-gray-100 flex flex-col gap-2">
            {user ? (
              <Link href={dashboardHref} className="btn-primary text-sm text-center" onClick={() => setOpen(false)}>
                {dashboardLabel}
              </Link>
            ) : (
              <>
                <Link href="/login" className="btn-outline text-sm text-center" onClick={() => setOpen(false)}>
                  Login
                </Link>
                <Link
                  href="/register?tier=free"
                  className="block bg-tfs-gold text-tfs-navy font-bold text-sm text-center px-5 py-2.5 rounded-xl hover:brightness-105 transition-all"
                  onClick={() => setOpen(false)}
                >
                  Step into your free Connection Session
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  )
}
