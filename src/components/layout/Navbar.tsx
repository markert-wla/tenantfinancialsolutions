'use client'
import { useState, useEffect, useMemo } from 'react'
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

export default function Navbar() {
  const pathname = usePathname()
  const [open, setOpen]               = useState(false)
  const [scrolled, setScrolled]       = useState(false)
  const [sessionVisible, setSessionVisible] = useState(false)
  const [user, setUser]               = useState<any>(null)
  const [role, setRole]               = useState<string | null>(null)
  const supabase = useMemo(() => createClient(), [])

  // Navbar background — tracks any scroll
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Session button — uses IntersectionObserver on the hero CTA button
  // When [data-hero-cta] leaves the viewport the nav Session button fades in
  useEffect(() => {
    setSessionVisible(false)
    if (!PUBLIC_PAGES.has(pathname)) return

    let observer: IntersectionObserver | null = null

    // rAF defers until after new page content has painted
    const raf = requestAnimationFrame(() => {
      const heroCtaEl = document.querySelector('[data-hero-cta]')
      if (!heroCtaEl) return

      observer = new IntersectionObserver(
        ([entry]) => setSessionVisible(!entry.isIntersecting),
        // rootMargin top offset = navbar height so the trigger fires when
        // the button slides behind the navbar, not when it hits the raw top
        { rootMargin: '-80px 0px 0px 0px', threshold: 0 }
      )
      observer.observe(heroCtaEl)
    })

    return () => {
      cancelAnimationFrame(raf)
      observer?.disconnect()
    }
  }, [pathname])

  // Auth state — getSession() reads the local cookie without a network call,
  // avoiding lock contention with concurrent server-side token refreshes.
  useEffect(() => {
    async function loadUser() {
      const { data: { session } } = await supabase.auth.getSession()
      setUser(session?.user ?? null)
      if (session?.user) {
        const { data: profile } = await supabase
          .from('profiles').select('role').eq('id', session.user.id).single()
        setRole(profile?.role ?? 'client')
      } else {
        setRole(null)
      }
    }
    loadUser()
    const { data: listener } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        supabase.from('profiles').select('role').eq('id', session.user.id).single()
          .then(({ data: profile }) => setRole(profile?.role ?? 'client'))
      } else {
        setRole(null)
      }
    })
    return () => listener.subscription.unsubscribe()
  }, [supabase])

  const dashboardHref =
    role === 'admin' ? '/admin/dashboard' :
    role === 'coach' ? '/coach/dashboard' :
    '/portal/dashboard'

  const dashboardLabel = role === 'client' || role === null ? 'My Portal' : 'Dashboard'

  // Show the sliding Session button only for logged-out users on public pages
  const showSessionBtn = !user && PUBLIC_PAGES.has(pathname)
  const sessionActive  = showSessionBtn && sessionVisible

  return (
    <header
      className={cn(
        'fixed top-0 inset-x-0 z-50 transition-all duration-300',
        scrolled ? 'bg-white/95 backdrop-blur shadow-sm' : 'bg-transparent'
      )}
    >
      {/* Three-column layout: logo | nav (centered) | auth */}
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center">

        {/* Left — Logo */}
        <div className="flex-1 flex items-center">
          <Link href="/" className="flex flex-col items-start gap-0.5">
            <Image
              src="/images/logo.png"
              alt="Tenant Financial Solutions"
              width={220}
              height={64}
              className="h-14 w-auto object-contain"
              priority
            />
            <span className={cn(
              'text-[9px] sm:text-[10px] font-semibold tracking-widest uppercase leading-none pl-0.5',
              scrolled ? 'text-tfs-gold' : 'text-tfs-gold'
            )}>
              Tenant Focused – Community Impact
            </span>
          </Link>
        </div>

        {/* Center — Nav links + sliding Session CTA */}
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

          {/*
            Always in the DOM so the CSS transition has a start state.
            max-w-0 → max-w-[140px] slides open and pushes nav links left.
            opacity-0 → opacity-100 fades it in simultaneously.
          */}
          <li
            className={cn(
              'overflow-hidden flex-shrink-0 transition-all duration-300 ease-in-out',
              sessionActive
                ? 'max-w-[140px] opacity-100 pointer-events-auto'
                : 'max-w-0 opacity-0 pointer-events-none'
            )}
            aria-hidden={!sessionActive}
          >
            <Link
              href="/register?tier=free"
              tabIndex={sessionActive ? 0 : -1}
              className="bg-tfs-gold text-tfs-navy font-bold text-sm px-5 py-2 rounded-lg whitespace-nowrap hover:brightness-105 hover:scale-105 block"
            >
              Session
            </Link>
          </li>
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
