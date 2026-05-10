'use client'
import { useState, useEffect, useMemo } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Menu, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/cn'

const NAV_LINKS = [
  { label: 'Home',      href: '/' },
  { label: 'About',     href: '/about' },
  { label: 'Our Story', href: '/our-story' },
  { label: 'Services',  href: '/services' },
  { label: 'Contact',   href: '/contact' },
]

const PUBLIC_PAGES = new Set(['/', '/about', '/our-story', '/services', '/contact'])

// Portal links shown in place of public nav when logged in as admin
const ADMIN_PORTAL_LINKS = [
  { label: 'Admin Dashboard', href: '/admin/dashboard',   bg: 'bg-tfs-purple', text: 'text-white'     },
  { label: 'Coach View',      href: '/coach/dashboard',   bg: 'bg-tfs-teal',   text: 'text-white'     },
  { label: 'Client View',     href: '/portal/dashboard',  bg: 'bg-tfs-navy',   text: 'text-white'     },
  { label: 'Manager View',    href: '/manager/dashboard', bg: 'bg-tfs-gold',   text: 'text-tfs-navy'  },
]

export default function Navbar() {
  const pathname = usePathname()
  const [open, setOpen]               = useState(false)
  const [scrolled, setScrolled]       = useState(false)
  const [sessionVisible, setSessionVisible] = useState(false)
  const [user, setUser]               = useState<{ id: string; email?: string } | null>(null)
  const [role, setRole]               = useState<string | null>(null)
  const supabase = useMemo(() => createClient(), [])

  // Navbar background — tracks any scroll
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Session button — slides into the nav the moment [data-hero-cta] scrolls
  // behind the navbar. Uses getBoundingClientRect on every scroll tick rather
  // than IntersectionObserver, which avoids querySelector-timing races entirely.
  // Note: only shown for logged-out visitors on public pages (showSessionBtn below).
  useEffect(() => {
    setSessionVisible(false)
    if (!PUBLIC_PAGES.has(pathname)) return

    const checkCta = () => {
      const el = document.querySelector('[data-hero-cta]')
      if (!el) { setSessionVisible(false); return }
      // Session appears when the CTA button's bottom edge enters the navbar zone
      setSessionVisible(el.getBoundingClientRect().bottom < 100)
    }

    window.addEventListener('scroll', checkCta, { passive: true })
    // Run once after paint so the initial state is correct even without scrolling
    const timer = setTimeout(checkCta, 50)

    return () => {
      window.removeEventListener('scroll', checkCta)
      clearTimeout(timer)
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

  // Show the sliding Session button on public pages for all visitors.
  // Logged-in users who click it are redirected to their dashboard anyway.
  const showSessionBtn = PUBLIC_PAGES.has(pathname)
  const sessionActive  = showSessionBtn && sessionVisible

  const isAdmin = role === 'admin'

  return (
    <header
      className={cn(
        'fixed top-0 inset-x-0 z-50 transition-all duration-300',
        scrolled ? 'bg-white/95 backdrop-blur shadow-sm' : 'bg-tfs-navy/80 backdrop-blur-sm'
      )}
    >
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center gap-6">

        {/* Left — Logo (always) */}
        <div className="flex flex-col items-start gap-0.5 shrink-0">
          <div className="flex items-center gap-2">
            <Link href="/">
              <Image
                src="/images/logo.png"
                alt="Tenant Financial Solutions"
                width={220}
                height={64}
                className="h-14 w-auto object-contain"
                priority
              />
            </Link>
            {showSessionBtn && !user && (
              <Link
                href="/register?tier=free"
                className="sm:hidden bg-tfs-gold text-tfs-navy text-xs font-bold px-3 py-1.5 rounded-lg whitespace-nowrap hover:brightness-105 transition-all"
              >
                Free Session
              </Link>
            )}
          </div>
          <span className="text-[9px] sm:text-[10px] font-semibold tracking-widest uppercase leading-none pl-0.5 text-tfs-gold">
            Tenant Focused – Community Impact
          </span>
        </div>

        {isAdmin ? (
          /* ── ADMIN PORTAL SWITCHER ────────────────────────── */
          <>
            {/* Desktop portal links */}
            <ul className="hidden md:flex items-center gap-2 ml-auto">
              <li className="mr-2">
                <span className={cn(
                  'text-xs font-semibold tracking-widest uppercase',
                  scrolled ? 'text-tfs-slate' : 'text-white/60'
                )}>
                  View as:
                </span>
              </li>
              {ADMIN_PORTAL_LINKS.map(({ label, href, bg, text }) => {
                const isActive = pathname.startsWith(href.split('/').slice(0, 3).join('/'))
                return (
                  <li key={href}>
                    <Link
                      href={href}
                      className={cn(
                        'inline-flex items-center px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-150',
                        bg, text,
                        isActive ? 'ring-2 ring-white/60 ring-offset-1 ring-offset-transparent' : 'opacity-80 hover:opacity-100 hover:scale-105'
                      )}
                    >
                      {label}
                    </Link>
                  </li>
                )
              })}
            </ul>

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
          </>
        ) : (
          /* ── STANDARD PUBLIC NAV ──────────────────────────── */
          <>
            {/* Center — Nav links + sliding Session CTA */}
            <ul className="hidden md:flex items-center gap-6 mx-auto">
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
            <div className="hidden md:flex items-center gap-3 ml-auto">
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
          </>
        )}
      </nav>

      {/* Mobile drawer */}
      {open && (
        <div className="md:hidden bg-white border-t border-gray-100 px-4 py-4 space-y-3">
          {isAdmin ? (
            <>
              <p className="text-xs font-semibold text-tfs-slate uppercase tracking-widest pb-1">View as:</p>
              {ADMIN_PORTAL_LINKS.map(({ label, href, bg, text }) => (
                <Link
                  key={href}
                  href={href}
                  className={cn('block py-2.5 px-4 rounded-xl font-semibold text-sm text-center', bg, text)}
                  onClick={() => setOpen(false)}
                >
                  {label}
                </Link>
              ))}
              <div className="pt-2 border-t border-gray-100">
                <Link href="/" className="block py-2 text-tfs-navy font-medium hover:text-tfs-teal text-sm" onClick={() => setOpen(false)}>
                  ← Public Site
                </Link>
              </div>
            </>
          ) : (
            <>
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
            </>
          )}
        </div>
      )}
    </header>
  )
}
