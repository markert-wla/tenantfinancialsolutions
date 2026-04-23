export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = {
  title: 'About Us',
  description:
    'Meet the coaches and learn our vision at Tenant Financial Solutions. COACHES core values: Courage, Openness, Authenticity, Compassion, Honesty, Excellence, Service.',
  openGraph: {
    title: 'About Us | Tenant Financial Solutions',
    description: 'Meet the coaches behind TFS. Real people committed to changing lives through financial coaching.',
    url: '/about',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'About Us | Tenant Financial Solutions',
    description: 'Meet the coaches behind TFS. Real people committed to changing lives through financial coaching.',
  },
}

const CORE_VALUES = [
  { letter: 'C', word: 'Courage',        desc: 'We face money conversations head-on, without judgment.' },
  { letter: 'O', word: 'Openness',       desc: 'We approach every client situation with a beginner\'s mind.' },
  { letter: 'A', word: 'Authenticity',   desc: 'Real talk — no scripts, no selling, just honest guidance.' },
  { letter: 'C', word: 'Compassion',     desc: 'We meet clients where they are, always.' },
  { letter: 'H', word: 'Honesty',        desc: 'Truth is the foundation of lasting financial change.' },
  { letter: 'E', word: 'Excellence',     desc: 'We commit to best-in-class coaching at every session.' },
  { letter: 'S', word: 'Service',        desc: 'Community impact is why we show up every day.' },
]

async function getCoaches() {
  try {
    const supabase = createClient()
    const { data } = await supabase
      .from('coaches')
      .select('id, display_name, photo_url, bio, specialty, timezone')
      .eq('is_active', true)
    return data ?? []
  } catch {
    return []
  }
}

export default async function AboutPage() {
  const coaches = await getCoaches()

  return (
    <>
      {/* ── WELCOME ──────────────────────────────────────────── */}
      <section
        className="relative pt-32 pb-16 px-4 text-white overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #1D9E75 0%, #1A2B4A 60%, #0F1B30 100%)' }}
      >
        {/* Logo watermark */}
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

        <div className="relative z-10 max-w-4xl mx-auto">
          {/* Vision statement */}
          <div className="text-center mb-8">
            <p className="text-xs sm:text-sm font-semibold tracking-[0.2em] uppercase text-tfs-gold mb-3">
              Our Vision
            </p>
            <h2 className="text-2xl sm:text-3xl font-serif font-bold text-white leading-tight">
              To create a world where millions of tenants take ownership of their financial futures
            </h2>
          </div>

          <h1 className="text-3xl sm:text-4xl font-serif font-bold text-white text-center mb-6">
            Welcome to Tenant Financial Solutions
          </h1>

          {/* CTA above the fold so IntersectionObserver starts visible → nav Session btn stays hidden on load */}
          <div className="text-center mb-10">
            <Link
              href="/register?tier=free"
              data-hero-cta="true"
              className="inline-block bg-tfs-gold text-tfs-navy font-bold text-lg px-10 py-4 rounded-xl shadow-lg hover:brightness-105 hover:scale-105 transition-all duration-200"
            >
              Step into your free Connection Session
            </Link>
          </div>

          <div className="space-y-5 text-white/85 text-base md:text-lg leading-relaxed mb-10">
            <p>
              Money stress doesn&apos;t have to define your tenants&apos; lives. With{' '}
              <strong className="text-tfs-gold">one-on-one coaching</strong>, they gain clarity, confidence, and control.
            </p>
          </div>
          <div className="rounded-xl border border-white/20 bg-white/10 backdrop-blur-sm px-6 py-5 max-w-sm">
            <p className="font-bold text-white font-serif text-lg leading-snug">
              Financial Clarity That Supports On-Time Payments.
            </p>
          </div>
        </div>
      </section>

      {/* ── CORE VALUES + COACHES (shared lighthouse bg) ────── */}
      <section className="relative px-4 text-white overflow-hidden" id="coaches">
        {/* Lighthouse image — object-top shows the top of the image first */}
        <Image
          src="/images/lighthouse-image-optimized.webp"
          alt=""
          fill
          className="object-cover object-top select-none"
          aria-hidden="true"
        />
        {/* Dark overlay */}
        <div className="absolute inset-0 bg-tfs-navy/82" aria-hidden="true" />

        {/* Core Values */}
        <div className="relative z-10 max-w-6xl mx-auto pt-[40rem] pb-16 px-4">
          <div className="flex flex-col gap-3 max-w-xl">
            {CORE_VALUES.map(({ letter, word, desc }) => (
              <div
                key={word}
                className="bg-white/90 backdrop-blur-sm border border-white/60 rounded-xl px-5 py-4 hover:bg-white/95 transition-colors"
              >
                <div className="flex items-center gap-3 mb-1">
                  <div className="w-9 h-9 rounded-lg bg-tfs-gold flex items-center justify-center shrink-0">
                    <span className="text-tfs-navy font-bold text-base font-serif">{letter}</span>
                  </div>
                  <h3 className="font-bold text-tfs-navy text-base font-serif">{word}</h3>
                </div>
                <p className="text-gray-600 text-sm leading-relaxed pl-12">{desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Meet the Coaches — light panel so black text reads against the lighthouse bg */}
        <div className="relative z-10 max-w-6xl mx-auto pb-12 pt-8">
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl px-8 py-8">
            <div className="text-center mb-6">
              <h2 className="text-2xl sm:text-3xl font-serif font-bold text-tfs-navy mb-3">Meet the Coaches</h2>
              <p className="text-gray-700 text-base max-w-xl mx-auto">
                Real people. Real coaching. Each coach brings unique expertise and a genuine desire
                to help tenants achieve their financial goals.
              </p>
            </div>

            {coaches.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {coaches.map((coach: any) => (
                  <div key={coach.id} className="rounded-xl border border-gray-200 bg-white p-6 text-center hover:shadow-md transition-shadow">
                    <div className="w-20 h-20 rounded-full bg-tfs-teal/20 mx-auto mb-3 overflow-hidden">
                      {coach.photo_url ? (
                        <Image
                          src={coach.photo_url}
                          alt={coach.display_name}
                          width={80}
                          height={80}
                          sizes="80px"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <span className="text-2xl font-bold text-tfs-teal font-serif">
                            {coach.display_name?.charAt(0) ?? '?'}
                          </span>
                        </div>
                      )}
                    </div>
                    <h3 className="font-bold text-tfs-navy text-lg mb-1 font-serif">{coach.display_name}</h3>
                    {coach.specialty && (
                      <p className="text-tfs-teal text-sm font-medium mb-2">{coach.specialty}</p>
                    )}
                    {coach.bio && (
                      <p className="text-gray-600 text-sm leading-relaxed">{coach.bio}</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-gray-500 py-2">
                <p className="text-base mb-1 text-gray-800">Coach profiles coming soon.</p>
                <p className="text-sm">Check back shortly — we&apos;re adding our team now.</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────── */}
      <section
        className="relative py-16 px-4 text-white text-center overflow-hidden"
        style={{ background: 'radial-gradient(ellipse at 60% 0%, #1D9E75 0%, #1A2B4A 55%, #0F1B30 100%)' }}
      >
        {/* Subtle dot pattern */}
        <div
          className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
            backgroundSize: '32px 32px',
          }}
          aria-hidden="true"
        />
        <div className="relative z-10 max-w-2xl mx-auto">
          <h2 className="text-3xl font-serif font-bold mb-4">
            Ready to work with one of our coaches?
          </h2>
          <p className="text-white/80 mb-8">No credit card required. Your first Connection Session is on us.</p>
          <Link href="/register" className="btn-primary px-8 py-4">
            Step into your free Connection Session
          </Link>
        </div>
      </section>
    </>
  )
}
