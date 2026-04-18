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
      {/* ── VISION SECTION ───────────────────────────────────── */}
      <section
        className="relative min-h-[60vh] flex items-center justify-center overflow-hidden pt-16"
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

        <div className="relative z-10 max-w-3xl mx-auto text-white text-center px-4 py-10">
          <p className="text-xs sm:text-sm font-semibold tracking-[0.2em] uppercase text-tfs-gold mb-4">
            Our Vision
          </p>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-serif font-bold leading-tight">
            To create a world where millions of tenants take ownership of their financial futures
          </h1>
          <div className="mt-8">
            <Link
              href="/register?tier=free"
              className="inline-block bg-tfs-gold text-tfs-navy font-bold text-lg px-10 py-4 rounded-xl shadow-lg hover:brightness-105 hover:scale-105 transition-all duration-200"
            >
              Step into your free Connection Session
            </Link>
          </div>
        </div>
      </section>

      {/* ── CORE VALUES ──────────────────────────────────────── */}
      <section className="py-20 bg-white px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="section-heading mb-4">Our Core Values</h2>
            <p className="text-tfs-slate text-lg max-w-xl mx-auto">
              Everything we do is anchored in the <strong>COACHES</strong> framework.
            </p>
          </div>

          {/* Teal chalkboard image */}
          <div className="mb-12 rounded-2xl overflow-hidden shadow-xl">
            <Image
              src="/images/core-values-optimized.webp"
              alt="COACHES Core Values — Courage, Openness, Authenticity, Compassion, Honesty, Excellence, Service"
              width={1152}
              height={768}
              sizes="(max-width: 1280px) 100vw, 1152px"
              className="w-full object-cover"
            />
          </div>

          {/* Card grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {CORE_VALUES.map(({ letter, word, desc }) => (
              <div
                key={word}
                className="card hover:shadow-lg transition-shadow group"
              >
                <div className="w-10 h-10 rounded-lg bg-tfs-teal flex items-center justify-center mb-3">
                  <span className="text-white font-bold text-lg font-serif">{letter}</span>
                </div>
                <h3 className="font-bold text-tfs-navy text-lg mb-2 font-serif">{word}</h3>
                <p className="text-tfs-slate text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── COACHES ──────────────────────────────────────────── */}
      <section className="py-20 bg-tfs-teal-light px-4" id="coaches">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="section-heading mb-4">Meet the Coaches</h2>
            <p className="text-tfs-slate text-lg max-w-xl mx-auto">
              Real people. Real coaching. Each coach brings unique expertise and a genuine desire
              to help tenants achieve lasting financial peace.
            </p>
          </div>

          {coaches.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
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
                    <p className="text-tfs-teal text-sm font-medium mb-3">{coach.specialty}</p>
                  )}
                  {coach.bio && (
                    <p className="text-tfs-slate text-sm leading-relaxed mb-3">{coach.bio}</p>
                  )}
                  {coach.timezone && (
                    <span className="inline-block text-xs px-3 py-1 rounded-full bg-tfs-teal/10 text-tfs-teal">
                      {coach.timezone.replace('_', ' ')}
                    </span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16 text-tfs-slate">
              <p className="text-lg mb-2">Coach profiles coming soon.</p>
              <p className="text-sm">Check back shortly — we&apos;re adding our team now.</p>
            </div>
          )}
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────── */}
      <section
        className="relative py-16 px-4 text-white text-center overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #1D9E75, #1A2B4A)' }}
      >
        <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
          <Image
            src="/images/logo.png"
            alt=""
            fill
            className="object-contain select-none opacity-[0.10] mix-blend-screen"
            style={{ filter: 'grayscale(1) invert(1)' }}
          />
        </div>
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
