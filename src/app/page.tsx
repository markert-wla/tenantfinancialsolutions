export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/server'
import { ChevronRight, Users, Building2, HeartHandshake } from 'lucide-react'
import HeroCTAButton from '@/components/layout/HeroCTAButton'
import CoachCard from '@/components/public/CoachCard'

export const metadata: Metadata = {
  title: 'Tenant Financial Solutions — Tenant Focused, Community Impact',
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
  const supabase = createClient()
  const { data, error } = await supabase
    .from('coaches')
    .select('id, display_name, photo_url, bio, bio_short, specialty')
    .eq('is_active', true)
    .order('display_name')
    .limit(6)
  if (error) console.error('[getCoaches] Supabase error:', error.message, error.details)
  return data ?? []
}

async function getYouTubeVideoId() {
  try {
    const supabase = createClient()
    const { data } = await supabase.from('site_settings').select('value').eq('key', 'youtube_video_id').single()
    return data?.value?.trim() ?? ''
  } catch {
    return ''
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

  const [testimonials, coaches, youtubeVideoId] = await Promise.all([
    getApprovedTestimonials(),
    getCoaches(),
    getYouTubeVideoId(),
  ])

  return (
    <>
      {/* ── HERO ─────────────────────────────────────────────── */}
      <section className="relative mt-20 h-[calc(100vh+80px)] overflow-hidden">
        <Image
          src="/images/homepage-image.webp"
          alt="Tenant Financial Solutions — Real People, Real Coaching"
          fill
          className="object-cover object-center select-none"
          priority
        />
        {/* Narrow gradient at very top only — keeps nav links readable over any image */}
        <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/50 to-transparent pointer-events-none" aria-hidden="true" />
        {/* CTA pinned to bottom of the image */}
        <div className="absolute bottom-0 inset-x-0 z-10 pb-12 flex justify-center">
          <HeroCTAButton />
        </div>
      </section>

      <div className="h-px bg-gradient-to-r from-transparent via-tfs-gold/50 to-transparent" />

      {/* ── HOW IT WORKS ─────────────────────────────────────── */}
      <section className="py-20 bg-white px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="section-heading mb-4">How It Works</h2>
          <p className="text-tfs-slate text-lg mb-12 max-w-xl mx-auto">
            3 Simple Steps towards your desired future.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {[
              { step: '1', title: 'Book Your Free Session', desc: 'Start with a no-cost Connection Session to meet your coach and set your goals.' },
              { step: '2', title: 'Choose Your Path', desc: 'Select the coaching plan that fits your needs — individual, group, or property management.' },
              { step: '3', title: 'Create Change with Your Coach', desc: 'Work with your coach to build clarity, confidence, and lasting financial habits.' },
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

      {/* ── FEATURED VIDEO ───────────────────────────────────── */}
      {youtubeVideoId && (
        <>
          <section className="py-20 bg-white px-4">
            <div className="max-w-4xl mx-auto text-center">
              <h2 className="section-heading mb-4">See How TFS Coaching Works</h2>
              <p className="text-tfs-slate text-lg mb-10 max-w-xl mx-auto">
                Watch how our coaches help tenants build lasting financial clarity.
              </p>
              <div className="relative w-full rounded-2xl overflow-hidden shadow-xl" style={{ paddingBottom: '56.25%' }}>
                <iframe
                  src={`https://www.youtube.com/embed/${youtubeVideoId}`}
                  title="TFS Featured Video"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="absolute inset-0 w-full h-full"
                />
              </div>
            </div>
          </section>
          <div className="h-px bg-gradient-to-r from-transparent via-tfs-gold/50 to-transparent" />
        </>
      )}

      {/* ── MEET THE COACHES ─────────────────────────────────── */}
      <section className="py-20 bg-tfs-teal-light px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-3xl md:text-4xl font-serif font-bold text-tfs-navy mb-2">
              <span className="line-through">Money Stigma</span> – No More
            </p>
            <p className="text-tfs-slate text-lg mb-6">
              Real People – Real Coaching
            </p>
            <h2 className="section-heading mb-4">Meet the Coaches</h2>
          </div>
          {coaches.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {coaches.map((coach: { id: string; display_name: string; photo_url: string | null; bio: string | null; bio_short: string | null; specialty: string | null }) => (
                <CoachCard key={coach.id} coach={coach} />
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
                • Coaching that lightens the load on management by:
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
              <Icon className="mb-4 text-white" size={32} />
              <p className="font-bold text-white text-xl mb-2">{label}</p>
              <p className="text-sm text-white mb-4">{desc}</p>
              <span className="inline-flex items-center text-white text-sm font-medium group-hover:gap-2 gap-1 transition-all">
                Learn more <ChevronRight size={16} />
              </span>
            </Link>
          ))}
        </div>
      </section>

      <div className="h-px bg-gradient-to-r from-transparent via-tfs-gold/50 to-transparent" />

      {/* ── TESTIMONIALS ─────────────────────────────────────── */}
      {testimonials.length > 0 && (
        <>
          <section className="py-20 bg-white px-4">
            <div className="max-w-6xl mx-auto">
              <h2 className="section-heading text-center mb-12">What Our Clients Say</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {testimonials.map((t: { id: string; quote: string; client_name: string }) => (
                  <div key={t.id} className="rounded-2xl p-6 bg-tfs-navy shadow-md">
                    <p className="text-white italic mb-4 leading-relaxed">&ldquo;{t.quote}&rdquo;</p>
                    <p className="font-semibold text-tfs-gold text-lg">{t.client_name}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
          <div className="h-px bg-gradient-to-r from-transparent via-tfs-gold/50 to-transparent" />
        </>
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
          <p className="text-white text-lg mb-8">
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
