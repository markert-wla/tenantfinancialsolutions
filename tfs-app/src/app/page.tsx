export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/server'
import { ChevronRight, Users, Building2, HeartHandshake } from 'lucide-react'

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
    label: "I'm an Individual",
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
    bg: 'bg-tfs-teal-dark',
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

export default async function HomePage() {
  const testimonials = await getApprovedTestimonials()

  return (
    <>
      {/* ── HERO ─────────────────────────────────────────────── */}
      <section
        className="relative min-h-screen flex flex-col items-center justify-center text-white text-center px-4"
        style={{
          background: 'linear-gradient(135deg, #1D9E75 0%, #1A2B4A 60%, #0F1B30 100%)',
        }}
      >
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
          <span className="inline-block mb-4 px-4 py-1 rounded-full bg-white/10 text-tfs-gold text-sm font-medium tracking-wide uppercase">
            Learn to Live in Financial Peace
          </span>
          <h1 className="text-5xl sm:text-6xl md:text-7xl font-serif font-bold leading-tight mb-6">
            Tenant Focused –<br />Community Impact
          </h1>
          <p className="text-lg sm:text-xl text-white/80 max-w-2xl mx-auto mb-10 leading-relaxed">
            Our mission is to deliver the best financial counsel to the maximum number of tenants
            by providing direct access to a{' '}
            <span className="font-semibold text-white">personal finance coach</span>.
          </p>

          {/* Three CTA cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl mx-auto">
            {AUDIENCE_CARDS.map(({ icon: Icon, label, href, bg, desc }) => (
              <Link
                key={href}
                href={href}
                className={`${bg} rounded-xl p-6 text-left hover:scale-105 transition-transform duration-200 group`}
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

        {/* Scroll cue */}
        <div className="absolute bottom-8 inset-x-0 flex justify-center animate-bounce">
          <div className="w-6 h-10 rounded-full border-2 border-white/40 flex items-start justify-center p-1">
            <div className="w-1 h-2 bg-white/60 rounded-full" />
          </div>
        </div>
      </section>

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

      {/* ── WELCOME SECTION ──────────────────────────────────── */}
      <section className="py-20 bg-white px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="section-heading text-center mb-10">Welcome to Tenant Financial Solutions</h2>
          <div className="space-y-6 text-tfs-slate text-base md:text-lg leading-relaxed">
            <p>
              Welcome to Tenant Financial Solutions, your partner in assisting tenants financially in
              the most sustainable way possible – <strong className="text-tfs-teal">COACHING!</strong> We
              are passionate about seeing your community thrive through the relief of money stress. There
              is no quick fix here. There are only dedicated coaches who desire the success of each and
              every client through behavioral changes, process changes, perspective changes, and people
              changes.
            </p>
            <p>
              Imagine a world where there was a direct resource for your tenant population to go to first
              when facing financial challenges or seeking financial clarity – IMAGINE NO LONGER! A market
              differentiator in the form of an amenity outside of a physical asset. Coaching is an amenity
              that has the power to provide lasting peace. Tenant Financial Solutions understands this
              transformative power. We work diligently to understand the needs of the tenant and the
              management staff.
            </p>
            <p>
              In addition to the individual coaching, members have access to one complimentary group
              session lesson per month with multiple coaches present during the call. This is a great time
              to interact outside of a one on one environment and a time to learn about topical discussions
              and present day financial trends.
            </p>
          </div>
        </div>
      </section>

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
            Start for free. No credit card required. Your first group session is on us.
          </p>
          <Link href="/register" className="btn-primary text-base px-8 py-4">
            Start Your Journey
          </Link>
        </div>
      </section>
    </>
  )
}
