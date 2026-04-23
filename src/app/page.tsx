export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/server'
import { ChevronRight, Users, Building2, HeartHandshake } from 'lucide-react'
import HeroCTAButton from '@/components/layout/HeroCTAButton'

export const metadata: Metadata = {
  title: 'Tenant Focused – Community Impact | Tenant Financial Solutions',
  description:
    'Financial coaching for tenants, property managers, and non-profits. One-on-one sessions with dedicated coaches. Real People – Real Coaching.',
  openGraph: {
    title: 'Tenant Financial Solutions — Real People, Real Coaching',
    description:
      'Personal financial coaching for tenants. One-on-one sessions, group coaching, and property management partnerships.',
    url: '/',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Tenant Financial Solutions — Real People, Real Coaching',
    description:
      'Personal financial coaching for tenants. One-on-one sessions, group coaching, and property management partnerships.',
  },
}

async function getCoaches() {
  try {
    const supabase = createClient()
    const { data } = await supabase
      .from('coaches')
      .select('id, display_name, photo_url, bio, specialty')
      .eq('is_active', true)
      .limit(3)
    return data ?? []
  } catch {
    return []
  }
}

async function getApprovedTestimonials() {
  try {
    const supabase = createClient()
    const { data } = await supabase
      .from('testimonials')
      .select('id, client_name, quote, plan_tier')
      .eq('approved', true)
      .limit(6)
    return data ?? []
  } catch {
    return []
  }
}

const AUDIENCE_CARDS = [
  {
    icon: Users,
    label: "I'm an Individual and/or Couple",
    href: '/services#individual',
    bg: 'bg-tfs-teal',
    desc: 'Personal coaching plans starting free',
  },
  {
    icon: Building2,
    label: 'I Manage Properties',
    href: '/services#property-management',
    bg: 'bg-tfs-navy',
    desc: 'Reduce delinquencies, support tenants',
  },
  {
    icon: HeartHandshake,
    label: 'I Represent a Non-Profit',
    href: '/services#nonprofit',
    bg: 'bg-tfs-purple',
    desc: 'Complimentary group coaching available',
  },
]

const COACH_BENEFITS = [
  'Build financial clarity',
  'Reduce financial stress',
  'Improve decision making',
]

const MGMT_BENEFITS = [
  'Fewer delinquencies',
  'Improved tenant relationships',
  'More time for core responsibilities',
]

export default async function HomePage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined }
}) {
  // Supabase occasionally sends the OAuth ?code= to the Site URL (root) instead
  // of /auth/callback when redirectTo validation fails. Catch it here as a
  // second layer behind the middleware redirect.
  if (searchParams.code) {
    const { redirect } = await import('next/navigation')
    const code = Array.isArray(searchParams.code) ? searchParams.code[0] : searchParams.code
    redirect(`/auth/callback?code=${encodeURIComponent(code)}`)
  }

  const [testimonials, coaches] = await Promise.all([
    getApprovedTestimonials(),
    getCoaches(),
  ])

  return (
    <>
      {/* ── HERO ─────────────────────────────────────────────── */}
      <section
        className="relative min-h-screen flex flex-col items-center justify-center text-white text-center px-4 overflow-hidden pt-16"
        style={{
          background: 'linear-gradient(135deg, #1D9E75 0%, #1A2B4A 60%, #0F1B30 100%)',
        }}
      >
        {/* Logo watermark background */}
        <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
          <Image
            src="/images/logo.png"
            alt=""
            fill
            className="object-contain select-none opacity-[0.13] mix-blend-screen"
            style={{ filter: 'grayscale(1) invert(1)' }}
            priority
          />
        </div>

        {/* subtle grid overlay */}
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              'radial-gradient(circle at 25% 25%, white 1px, transparent 1px), radial-gradient(circle at 75% 75%, white 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />

        <div className="relative z-10 max-w-4xl mx-auto">
          {/* Vision statement */}
          <p className="text-xs sm:text-sm font-semibold tracking-[0.2em] uppercase text-tfs-gold mb-3">
            Our Vision
          </p>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-serif font-bold leading-tight mb-6">
            To create a world where millions of tenants take ownership of their financial futures
          </h1>
          {/* Primary CTA */}
          <div className="mb-8">
            <HeroCTAButton />
          </div>

          {/* Three CTA cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl mx-auto">
            {AUDIENCE_CARDS.map(({ icon: Icon, label, href, desc }) => (
              <Link
                key={href}
                href={href}
                className={`rounded-xl p-6 text-left hover:scale-105 transition-transform duration-200 group bg-white/10 backdrop-blur-sm border border-white/20`}
              >
                <Icon className="mb-3 text-white/80" size={28} />
                <p className="font-semibold text-white text-base mb-1">{label}</p>
                <p className="text-sm text-white/70">{desc}</p>
                <ChevronRight
                  className="mt-3 text-white/60 group-hover:text-white transition-colors"
                  size={16}
                />
              </Link>
            ))}
          </div>
        </div>

      </section>

      <div className="h-px bg-gradient-to-r from-transparent via-tfs-gold/50 to-transparent" />

      {/* ── HOW IT WORKS ─────────────────────────────────────── */}
      <section className="py-20 bg-white px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="section-heading mb-4">How It Works</h2>
          <p className="text-tfs-slate text-lg mb-12 max-w-xl mx-auto">
            Three simple steps to financial peace.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {[
              { step: '1', title: 'Book Your Free Session', desc: 'Start with a no-cost Connection Session to meet your coach and set your goals.' },
              { step: '2', title: 'Choose Your Path', desc: 'Select the coaching plan that fits your needs — individual, group, or property management.' },
              { step: '3', title: 'Build Financial Peace', desc: 'Work with your coach to build clarity, confidence, and lasting financial habits.' },
            ].map(({ step, title, desc }) => (
              <div key={step} className="flex flex-col items-center text-center">
                <div className="w-14 h-14 rounded-full bg-tfs-teal text-white font-bold text-2xl font-serif flex items-center justify-center mb-4 shadow-md">
                  {step}
                </div>
                <h3 className="font-bold text-tfs-navy text-xl font-serif mb-2">{title}</h3>
                <p className="text-tfs-slate text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
          <div className="mt-12">
            <Link href="/register?tier=free" className="btn-primary px-8 py-4">
              Start with a Free Connection Session
            </Link>
          </div>
        </div>
      </section>

      <div className="h-px bg-gradient-to-r from-transparent via-tfs-gold/50 to-transparent" />

      {/* ── MEET THE COACHES ─────────────────────────────────── */}
      <section className="py-20 bg-tfs-teal-light px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="section-heading mb-4">Meet the Coaches</h2>
            <p className="text-tfs-slate text-lg max-w-xl mx-auto">
              Real people. Real coaching. Dedicated to your financial peace.
            </p>
          </div>
          {coaches.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {coaches.map((coach: any) => (
                <div key={coach.id} className="card text-center hover:shadow-lg transition-shadow">
                  <div className="w-24 h-24 rounded-full bg-tfs-teal/20 mx-auto mb-4 overflow-hidden">
                    {coach.photo_url ? (
                      <Image
                        src={coach.photo_url}
                        alt={coach.display_name}
                        width={96}
                        height={96}
                        sizes="96px"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="text-3xl font-bold text-tfs-teal font-serif">
                          {coach.display_name?.charAt(0) ?? '?'}
                        </span>
                      </div>
                    )}
                  </div>
                  <h3 className="font-bold text-tfs-navy text-xl mb-1 font-serif">{coach.display_name}</h3>
                  {coach.specialty && (
                    <p className="text-tfs-teal text-sm font-medium">{coach.specialty}</p>
                  )}
                  {coach.bio && (
                    <p className="text-tfs-slate text-sm leading-relaxed mt-2 line-clamp-3">{coach.bio}</p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-10 text-tfs-slate">
              <p className="text-lg mb-2">Coach profiles coming soon.</p>
              <p className="text-sm">Check back shortly — we&apos;re adding our team now.</p>
            </div>
          )}
          <div className="text-center mt-10">
            <Link href="/about#coaches" className="btn-navy">
              Learn More About Our Team
            </Link>
          </div>
        </div>
      </section>

      <div className="h-px bg-gradient-to-r from-transparent via-tfs-gold/50 to-transparent" />

      {/* ── BENEFITS ─────────────────────────────────────────── */}
      <section className="relative">
        {/* Lighthouse-style full-width teal-to-navy section */}
        <div
          className="py-20 px-4 text-white"
          style={{ background: 'linear-gradient(180deg, #1A2B4A 0%, #1D9E75 100%)' }}
        >
          <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-12">
            <div>
              <h2 className="text-3xl md:text-4xl font-serif font-bold mb-6">
                • Coaching empowers tenants to:
              </h2>
              <ul className="space-y-3">
                {COACH_BENEFITS.map(b => (
                  <li key={b} className="flex items-center gap-3 text-lg text-white/90">
                    <span className="w-2 h-2 rounded-full bg-tfs-gold shrink-0" />
                    {b}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h2 className="text-3xl md:text-4xl font-serif font-bold mb-6">
                • Management benefits through:
              </h2>
              <ul className="space-y-3">
                {MGMT_BENEFITS.map(b => (
                  <li key={b} className="flex items-center gap-3 text-lg text-white/90">
                    <span className="w-2 h-2 rounded-full bg-tfs-gold shrink-0" />
                    {b}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      <div className="h-px bg-gradient-to-r from-transparent via-tfs-gold/50 to-transparent" />

      {/* ── AUDIENCE CARDS (repeated lower) ──────────────────── */}
      <section className="py-20 bg-tfs-teal-light px-4">
        <div className="max-w-5xl mx-auto text-center mb-12">
          <h2 className="section-heading mb-4">Who We Serve</h2>
          <p className="text-tfs-slate text-lg max-w-xl mx-auto">
            Three paths — one mission. Find the right fit for you.
          </p>
        </div>
        <div className="max-w-5xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-6">
          {AUDIENCE_CARDS.map(({ icon: Icon, label, href, bg, desc }) => (
            <Link
              key={href}
              href={href}
              className={`${bg} rounded-2xl p-8 text-left hover:scale-105 transition-transform duration-200 group`}
            >
              <Icon className="mb-4 text-white/80" size={32} />
              <p className="font-bold text-white text-xl mb-2">{label}</p>
              <p className="text-sm text-white/80 mb-4">{desc}</p>
              <span className="inline-flex items-center text-white text-sm font-medium group-hover:gap-2 gap-1 transition-all">
                Learn more <ChevronRight size={16} />
              </span>
            </Link>
          ))}
        </div>
      </section>

      <div className="h-px bg-gradient-to-r from-transparent via-tfs-gold/50 to-transparent" />

      {/* ── MONEY STIGMA ─────────────────────────────────────── */}
      <section
        className="py-20 px-4 text-center"
        style={{ background: '#7A909F' }}
      >
        <div className="max-w-3xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-serif font-bold text-tfs-navy mb-4">
            <span className="line-through opacity-60">Money Stigma</span> – No More
          </h2>
          <p className="text-tfs-navy text-lg mb-8">
            Real People – Real Coaching
          </p>
          <Link href="/about" className="btn-navy">
            Meet the Coaches
          </Link>
        </div>
      </section>

      <div className="h-px bg-gradient-to-r from-transparent via-tfs-gold/50 to-transparent" />

      {/* ── TESTIMONIALS ─────────────────────────────────────── */}
      {testimonials.length > 0 && (
        <section className="py-20 bg-tfs-teal-light px-4">
          <div className="max-w-6xl mx-auto">
            <h2 className="section-heading text-center mb-12">What Our Clients Say</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {testimonials.map((t: any) => (
                <div key={t.id} className="card">
                  <p className="text-tfs-slate italic mb-4 leading-relaxed">"{t.quote}"</p>
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-tfs-navy text-sm">{t.client_name}</p>
                    {t.plan_tier && (
                      <span className="text-xs px-2 py-1 rounded-full bg-tfs-teal/10 text-tfs-teal capitalize font-medium">
                        {t.plan_tier}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      <div className="h-px bg-gradient-to-r from-transparent via-tfs-gold/50 to-transparent" />

      {/* ── FINAL CTA ────────────────────────────────────────── */}
      <section
        className="py-20 px-4 text-white text-center"
        style={{ background: 'linear-gradient(135deg, #1D9E75, #1A2B4A)' }}
      >
        <div className="max-w-2xl mx-auto">
          <h2 className="text-4xl font-serif font-bold mb-4">
            Ready to Take Ownership of Your Financial Future?
          </h2>
          <p className="text-white/80 text-lg mb-8">
            Start for free. No credit card required. Your first Connection Session is on us.
          </p>
          <Link href="/register" className="btn-primary text-base px-8 py-4">
            Step into your free Connection Session
          </Link>
        </div>
      </section>
    </>
  )
}
