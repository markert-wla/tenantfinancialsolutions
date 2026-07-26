import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import HeroCTAButton from '@/components/layout/HeroCTAButton'

export const metadata: Metadata = {
  title: 'Our Story',
  description:
    'Learn how Tenant Financial Solutions was built on a passion for community, sustainable coaching, and lasting financial change for tenants everywhere.',
  openGraph: {
    title: 'Our Story | Tenant Financial Solutions',
    description: 'Coaching — the most sustainable way to assist tenants financially. Real people, lasting change.',
    url: '/our-story',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Our Story | Tenant Financial Solutions',
    description: 'Coaching — the most sustainable way to assist tenants financially. Real people, lasting change.',
  },
}

export default function OurStoryPage() {
  return (
    <>
      {/* ── HERO ─────────────────────────────────────────────── */}
      <section
        className="relative pt-32 pb-20 px-4 text-white overflow-hidden"
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

        <div className="relative z-10 max-w-3xl mx-auto text-center">
          <p className="text-xs sm:text-sm font-semibold tracking-[0.2em] uppercase text-tfs-gold mb-3">
            Who We Are
          </p>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-serif font-bold text-white leading-tight mb-6">
            Our Story
          </h1>
          <p className="text-white/80 text-lg leading-relaxed">
            Built on a belief that every tenant deserves a real partner on their financial journey.
          </p>
          <div className="mt-8">
            <HeroCTAButton />
          </div>
        </div>
      </section>

      {/* ── STORY CONTENT ────────────────────────────────────── */}
      <section className="py-20 bg-white px-4">
        <div className="max-w-3xl mx-auto space-y-10">

          <div className="flex gap-5 items-start">
            <div className="mt-1.5 shrink-0 w-1 self-stretch rounded-full bg-tfs-teal" aria-hidden="true" />
            <p className="text-tfs-slate text-lg leading-relaxed">
              Welcome to Tenant Financial Solutions — a place built for you. We&apos;re here to support
              you in the most sustainable way possible: financial coaching designed around your real life.
              Money stress doesn&apos;t disappear overnight, and there&apos;s no quick fix. But you do have
              dedicated coaches who care deeply about your success and walk with you as you build new habits,
              new processes, new perspectives, and stronger financial confidence.
            </p>
          </div>

          <div className="flex gap-5 items-start">
            <div className="mt-1.5 shrink-0 w-1 self-stretch rounded-full bg-tfs-gold" aria-hidden="true" />
            <p className="text-tfs-slate text-lg leading-relaxed">
              Imagine having a trusted resource you can turn to the moment you feel overwhelmed or unsure.
              A place where you can get clarity, guidance, and a plan — without judgment. That&apos;s exactly
              what TFS provides. Coaching is an amenity created for your peace of mind, giving you support
              that lasts far beyond any physical asset. We take the time to understand your needs and your
              goals so you feel equipped, encouraged, and never alone in your financial journey.
            </p>
          </div>

          <div className="flex gap-5 items-start">
            <div className="mt-1.5 shrink-0 w-1 self-stretch rounded-full bg-tfs-teal" aria-hidden="true" />
            <p className="text-tfs-slate text-lg leading-relaxed">
              You&apos;ll also be invited to join our monthly TFS Community Connect session — a powerful
              space where tenants come together to celebrate wins, share progress, and encourage one another.
              It&apos;s a supportive, corporate&#8209;style gathering designed to help you feel part of a
              community that&apos;s growing financially stronger every month. During these sessions, coaches
              highlight broader financial topics, offer practical insights, and create an environment where
              everyone can learn from each other&apos;s experiences. It&apos;s your chance to be inspired,
              stay motivated, and see firsthand that you&apos;re not walking this journey alone.
            </p>
          </div>
        </div>
      </section>

      {/* ── PULL QUOTE ───────────────────────────────────────── */}
      <section
        className="py-16 px-4 text-white text-center"
        style={{ background: 'linear-gradient(135deg, #1A2B4A 0%, #1D9E75 100%)' }}
      >
        <div className="max-w-2xl mx-auto">
          <p className="text-2xl sm:text-3xl font-serif font-bold leading-snug mb-2">
            &ldquo;Coaching is an amenity that has the power to provide lasting peace.&rdquo;
          </p>
          <p className="text-tfs-gold text-sm font-semibold tracking-widest uppercase mt-4">
            — Tenant Financial Solutions
          </p>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────── */}
      <section className="py-20 bg-white px-4 text-center">
        <div className="max-w-xl mx-auto">
          <h2 className="text-3xl font-serif font-bold text-tfs-navy mb-4">
            Ready to be part of the story?
          </h2>
          <p className="text-tfs-slate text-lg mb-8">
            Start with a free Connection Session and meet a coach who&apos;s genuinely invested in your future.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/register?tier=free" className="btn-primary px-8 py-4">
              Step into your free Connection Session
            </Link>
            <Link href="/about#coaches" className="btn-outline px-8 py-4">
              Meet the Coaches
            </Link>
          </div>
        </div>
      </section>
    </>
  )
}
