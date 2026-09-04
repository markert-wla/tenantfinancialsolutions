export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/server'
import { ChevronRight, Users, Building2, HeartHandshake, UserCheck, Heart } from 'lucide-react'
import HeroCTAButton from '@/components/layout/HeroCTAButton'
import CoachCard from '@/components/public/CoachCard'

export const metadata: Metadata = {
  title: 'Tenant Financial Solutions — Tenant Focused, Community Impact',
  description:
    'Financial coaching for tenants, property managers, and non-profits. One-on-one sessions with dedicated coaches. Real People – Real Coaching.',
  openGraph: {
    title: 'Tenant Financial Solutions — Real People, Real Coaching',
    description:
      'Personal financial coaching for tenants. One-on-one sessions, TFS Community Connect, and property management partnerships.',
    url: '/',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Tenant Financial Solutions — Real People, Real Coaching',
    description:
      'Personal financial coaching for tenants. One-on-one sessions, TFS Community Connect, and property management partnerships.',
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
    const id = data?.value?.trim() ?? ''
    if (!id) return ''
    // Validate via oEmbed — returns 404 for unavailable/private, 401 for embed-restricted
    const check = await fetch(
      `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${encodeURIComponent(id)}&format=json`,
      { signal: AbortSignal.timeout(5000) }
    ).catch(() => null)
    return check?.ok ? id : ''
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
    bg: 'bg-tfs-teal-button',
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
    desc: 'Complimentary TFS Community Connect available',
  },
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
      {/* Below lg the photo sits on top with the text stacked under it (text over the
          furniture is unreadable on narrow screens); the gradient approximates the
          image's own background so the two blocks read as one scene. */}
      <section className="relative mt-20 overflow-hidden bg-gradient-to-b from-[#aecbe4] to-[#dceaf5]">
        {/* ── MOBILE image (hidden on lg+) ── */}
        <div className="relative aspect-[4/3] lg:hidden">
          <Image
            src="/images/home-hero-tree-of-life.webp"
            alt="A calm sitting area with a velvet armchair, marble side table, and a Tenant Financial Solutions mug"
            fill
            sizes="100vw"
            className="object-cover object-bottom select-none"
            priority
          />
          {/* TFS mug overlay — mobile */}
          <span
            aria-hidden="true"
            className="absolute font-bold tracking-widest text-tfs-navy select-none pointer-events-none"
            style={{ left: '61%', top: '64%', fontSize: '9px', letterSpacing: '0.12em' }}
          >
            TFS
          </span>
          {/* Free Session CTA on the empty wall beside the chair — slides into the
              navbar once scrolled past (Navbar watches [data-hero-cta]) */}
          <div className="absolute left-4 top-1/2 -translate-y-1/2 w-[45%] max-w-[220px] sm:hidden">
            <Link
              href="/register?tier=free"
              data-hero-cta="true"
              className="block bg-tfs-gold text-tfs-navy font-bold text-sm text-center px-4 py-3 rounded-xl shadow-lg hover:brightness-105 transition-all"
            >
              Step into your free Connection Session
            </Link>
          </div>
        </div>

        {/* ── DESKTOP background image (hidden below lg) — resized to object-center ── */}
        <div className="absolute inset-0 hidden lg:block" aria-hidden="true">
          <Image
            src="/images/home-hero-tree-of-life.webp"
            alt=""
            fill
            sizes="100vw"
            className="object-cover object-center select-none"
            priority
          />
          {/* TFS mug overlay — desktop */}
          <span
            aria-hidden="true"
            className="absolute font-bold tracking-widest text-tfs-navy select-none pointer-events-none"
            style={{ left: '61%', top: '64%', fontSize: '11px', letterSpacing: '0.14em' }}
          >
            TFS
          </span>
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-6 sm:px-8 grid lg:grid-cols-2">
          <div className="min-w-0 py-14 lg:py-16">
            <h1>
              <Image
                src="/images/build-financial-confidence.webp"
                alt="Helping Tenants Build Financial Confidence"
                width={1024}
                height={1024}
                sizes="(min-width: 640px) 28rem, 100vw"
                className="w-full max-w-md h-auto"
                priority
              />
            </h1>
            <div className="mt-5 h-px max-w-md bg-gradient-to-r from-tfs-gold-dark/70 to-transparent" aria-hidden="true" />
            <p className="mt-4 text-base sm:text-lg font-semibold text-tfs-gold-dark">
              Tenant Focused&ensp;&bull;&ensp;Community Impact
            </p>

            <ul className="mt-8 flex gap-4 sm:gap-10">
              {[
                { icon: UserCheck, label: 'Tenants & Couples', desc: 'Transformational Financial Coaching' },
                { icon: Building2, label: 'Property Management Groups', desc: 'Stronger Tenant Stability' },
                { icon: Heart, label: 'Non-Profit Organizations', desc: 'Continuing Therapeutic Progress' },
              ].map(({ icon: Icon, label, desc }) => (
                <li key={label} className="flex flex-col items-center text-center flex-1 min-w-0 sm:flex-none sm:w-36">
                  <span className="w-14 h-14 rounded-full border-2 border-tfs-gold-dark flex items-center justify-center mb-2">
                    <Icon className="w-6 h-6 text-tfs-gold-dark" aria-hidden="true" />
                  </span>
                  <span className="text-sm font-bold text-tfs-navy leading-snug">{label}</span>
                  <span className="mt-1 text-xs text-tfs-navy leading-snug">{desc}</span>
                </li>
              ))}
            </ul>

            <h2 className="mt-10 text-2xl sm:text-3xl font-extrabold tracking-wide text-tfs-navy uppercase">
              Why It Matters
            </h2>
            <div className="mt-3 h-1 w-16 bg-tfs-gold-dark" aria-hidden="true" />
            <p className="mt-5 text-tfs-navy max-w-md leading-relaxed">
              TFS equips individuals, property groups, and nonprofits with coaching that
              strengthens financial confidence and long-term stability. Through our monthly{' '}
              <strong>TFS Community Connect</strong>, clients celebrate wins, share progress,
              and receive guidance that keeps them moving forward &mdash; together.
            </p>

            {/* Hidden on mobile — the CTA lives in the navbar there */}
            <div className="mt-10 hidden sm:block">
              <HeroCTAButton />
            </div>
          </div>
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
