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

  const testimonials = await getApprovedTestimonials()

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

      {/* ── WELCOME SECTION ──────────────────────────────────── */}
      <section className="py-20 bg-white px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="section-heading text-center mb-10">Welcome to Tenant Financial Solutions</h2>
          <div className="space-y-5 text-tfs-slate text-base md:text-lg leading-relaxed mb-10">
            <p>
              Money stress doesn't have to define your tenants' lives. With{' '}
              <strong className="text-tfs-teal">one-on-one coaching</strong>, they gain clarity, confidence, and control.
            </p>
            <p>
              Tenant Financial Solutions gives your community a powerful amenity: coaches who help
              residents change behaviors, shift perspectives, and build financial peace that lasts.
            </p>
            <p>
              Your residents want clarity. Your team wants fewer financial emergencies.
              Our <strong className="text-tfs-teal">individual financial coaching</strong> delivers both.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="rounded-xl border border-tfs-teal/30 bg-tfs-teal/5 px-6 py-5">
              <p className="font-bold text-tfs-navy font-serif text-lg leading-snug">
                Financial Clarity That Supports On-Time Payments.
              </p>
            </div>
            <div className="rounded-xl border border-tfs-navy/20 bg-tfs-navy/5 px-6 py-5">
              <p className="font-bold text-tfs-navy font-serif text-lg leading-snug">
                Coaching That Lightens the Load on Management.
              </p>
            </div>
          </div>
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
