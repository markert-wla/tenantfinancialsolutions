'use client'
import { useState, useEffect } from 'react'
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

export default function Navbar() {
  const [open, setOpen]         = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [user, setUser]         = useState<any>(null)
  const supabase = createClient()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user))
    const { data: listener } = supabase.auth.onAuthStateChange((_, session) =>
      setUser(session?.user ?? null)
    )
    return () => listener.subscription.unsubscribe()
  }, [])

  return (
    <header
      className={cn(
        'fixed top-0 inset-x-0 z-50 transition-all duration-300',
        scrolled ? 'bg-white/95 backdrop-blur shadow-sm' : 'bg-transparent'
      )}
    >
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <Image
            src="/images/logo.png"
            alt="Tenant Financial Solutions"
            width={160}
            height={48}
            className="h-10 w-auto object-contain"
            priority
          />
        </Link>

        {/* Desktop nav */}
        <ul className="hidden md:flex items-center gap-8">
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
        </ul>

        {/* Auth CTA */}
        <div className="hidden md:flex items-center gap-3">
          {user ? (
            <Link href="/portal/dashboard" className="btn-primary text-sm py-2">
              My Portal
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
          className="md:hidden p-2 rounded-lg"
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
              <Link href="/portal/dashboard" className="btn-primary text-sm text-center">My Portal</Link>
            ) : (
              <>
                <Link href="/login" className="btn-outline text-sm text-center" onClick={() => setOpen(false)}>Login</Link>
                <Link href="/register" className="btn-primary text-sm text-center" onClick={() => setOpen(false)}>Get Started</Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  )
}
