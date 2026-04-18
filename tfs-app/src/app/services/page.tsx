import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { Check, Building2, HeartHandshake, Users, ArrowRight } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Services & Membership Plans',
  description:
    'Financial coaching for individuals, couples, property managers, and non-profits. Starter Plan $50/mo, Advantage Plan $100/mo. Start free — no credit card required.',
}

const INDIVIDUAL_PLANS = [
  {
    name: 'Free',
    price: 0,
    tier: 'free',
    tagline: 'Start with no commitment',
    color: 'border-gray-200',
    badge: '',
    features: [
      'Free Connection Session with your selected coach',
      'One group coaching session during the first week of the month',
    ],
    cta: 'Step into your free Connection Session',
    ctaHref: '/register?tier=free',
    ctaStyle: 'btn-primary text-sm text-center',
  },
  {
    name: 'Starter Plan',
    price: 50,
    tier: 'bronze',
    tagline: 'Best for tenants new to coaching',
    color: 'border-amber-400',
    badge: 'amber',
    features: [
      '1 individual coaching session per month',
      '1 complimentary group coaching session per month',
    ],
    cta: 'Get Started',
    ctaHref: '/register?tier=bronze',
    ctaStyle: 'btn-primary text-sm text-center',
  },
  {
    name: 'Advantage Plan',
    price: 100,
    tier: 'silver',
    tagline: 'For tenants who want real momentum',
    color: 'border-tfs-teal',
    badge: 'teal',
    popular: true,
    features: [
      '2 individual coaching sessions per month',
      '1 complimentary group coaching session per month',
      'Priority scheduling',
      'Text check-ins',
    ],
    cta: 'Get Started',
    ctaHref: '/register?tier=silver',
    ctaStyle: 'btn-primary text-sm text-center',
  },
]

const BADGE_STYLES: Record<string, string> = {
  amber: 'bg-amber-100 text-amber-700',
  teal:  'bg-tfs-teal/10 text-tfs-teal',
}

const NONPROFIT_ORGS = [
  'Domestic violence shelters',
  'Drug & alcohol treatment centers',
  'Homeless shelters',
  'Welfare organizations',
  'Red Cross',
  'Churches',
  'Partial care programs',
]

export default function ServicesPage() {
  return (
    <>
      {/* ── HERO ─────────────────────────────────────────────── */}
      <section
        className="relative pt-28 pb-20 px-4 text-white text-center overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #1D9E75 0%, #1A2B4A 100%)' }}
      >
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
        <div className="relative z-10 max-w-3xl mx-auto">
          <h1 className="text-5xl font-serif font-bold mb-4">Services & Plans</h1>
          <p className="text-white/80 text-xl mb-8">
            Coaching plans for individuals, couples, property managers, and community organizations.
            Transparent pricing. No hidden fees.
          </p>
          <Link
            href="/register?tier=free"
            className="inline-block bg-tfs-gold text-tfs-navy font-bold text-lg px-10 py-4 rounded-xl shadow-lg hover:brightness-105 hover:scale-105 transition-all duration-200"
          >
            Step into your free Connection Session
          </Link>
        </div>
      </section>

      {/* ── WHAT FREE INCLUDES ───────────────────────────────── */}
      <section className="py-14 bg-tfs-teal-light px-4 border-b border-tfs-teal/20">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl font-serif font-bold text-tfs-navy mb-2">What Free Includes</h2>
          <p className="text-tfs-teal font-semibold mb-6">Individuals / Couples — Start for Free</p>
          <div className="inline-flex flex-col gap-3 text-left mx-auto">
            <div className="flex items-start gap-3">
              <Check className="text-tfs-teal shrink-0 mt-0.5" size={18} />
              <span className="text-tfs-slate text-base">
                <strong className="text-tfs-navy">Free Connection Session</strong> with your selected coach
              </span>
            </div>
            <div className="flex items-start gap-3">
              <Check className="text-tfs-teal shrink-0 mt-0.5" size={18} />
              <span className="text-tfs-slate text-base">
                <strong className="text-tfs-navy">One group coaching session</strong> during the first week of the month
              </span>
            </div>
          </div>
          <div className="mt-8">
            <Link href="/register?tier=free" className="btn-primary px-8 py-3">
              Step into your free Connection Session
            </Link>
          </div>
        </div>
      </section>

      {/* ── INDIVIDUAL PLANS ─────────────────────────────────── */}
      <section id="individual" className="py-20 bg-white px-4 scroll-mt-16">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-3 mb-4">
            <Users className="text-tfs-teal" size={28} />
            <h2 className="section-heading">Individual and/or Couples Membership Plans</h2>
          </div>
          <p className="text-tfs-slate mb-12 text-lg max-w-2xl">
            Choose the plan that fits your coaching needs. Sessions reset on the 1st of each month and do not roll over.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {INDIVIDUAL_PLANS.map(plan => (
              <div
                key={plan.tier}
                className={`relative flex flex-col rounded-2xl border-2 ${plan.color} p-7 shadow-sm
                            hover:shadow-lg transition-shadow ${plan.popular ? 'ring-2 ring-tfs-teal ring-offset-2' : ''}`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 inset-x-0 flex justify-center">
                    <span className="bg-tfs-teal text-white text-xs font-bold px-4 py-1 rounded-full uppercase tracking-wide">
                      Most Popular
                    </span>
                  </div>
                )}

                <div className="mb-5">
                  {plan.badge && (
                    <span className={`text-xs font-semibold px-3 py-1 rounded-full ${BADGE_STYLES[plan.badge]} mb-3 inline-block`}>
                      {plan.name}
                    </span>
                  )}
                  <h3 className="text-2xl font-serif font-bold text-tfs-navy mb-1">{plan.name}</h3>
                  <p className="text-tfs-slate text-sm">{plan.tagline}</p>
                </div>

                <div className="mb-6">
                  {plan.price === 0 ? (
                    <p className="text-4xl font-bold text-tfs-navy">Free</p>
                  ) : (
                    <p className="text-4xl font-bold text-tfs-navy">
                      ${plan.price}
                      <span className="text-base font-normal text-tfs-slate">/mo</span>
                    </p>
                  )}
                </div>

                <ul className="space-y-3 flex-1 mb-7">
                  {plan.features.map(f => (
                    <li key={f} className="flex gap-2 text-sm text-tfs-slate">
                      <Check className="text-tfs-teal shrink-0 mt-0.5" size={16} />
                      {f}
                    </li>
                  ))}
                </ul>

                <Link href={plan.ctaHref} className={plan.ctaStyle}>
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>

          <p className="text-center text-tfs-slate text-sm mt-8">
            * Sessions reset the 1st of every month. Unused sessions do not carry over.
          </p>
        </div>
      </section>

      {/* ── PROPERTY MANAGEMENT ──────────────────────────────── */}
      <section id="property-management" className="relative py-20 px-4 scroll-mt-16 overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #1A2B4A, #1D9E75)' }}>
        <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
          <Image
            src="/images/logo.png"
            alt=""
            fill
            className="object-contain select-none opacity-[0.07] mix-blend-screen"
            style={{ filter: 'grayscale(1) invert(1)' }}
          />
        </div>
        <div className="relative z-10 max-w-5xl mx-auto text-white">
          <div className="flex items-center gap-3 mb-4">
            <Building2 className="text-white/80" size={28} />
            <h2 className="text-3xl md:text-4xl font-serif font-bold">Property Management Partners</h2>
          </div>
          <div className="text-white/80 text-lg mb-8 max-w-3xl space-y-3">
            <p>
              Money stress doesn't have to define your tenants' lives. With{' '}
              <strong className="text-white">one-on-one coaching</strong>, they gain clarity, confidence, and control.
            </p>
            <p>
              Tenant Financial Solutions gives your community a powerful amenity: coaches who help residents change behaviors, shift perspectives, and build financial peace that lasts.
            </p>
            <p className="font-semibold text-white">
              Financial Clarity That Supports On-Time Payments. &nbsp;·&nbsp; Coaching That Lightens the Load on Management.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-10">
            {/* Affiliate */}
            <div className="bg-white/10 backdrop-blur rounded-2xl p-8 border border-white/20">
              <h3 className="text-xl font-bold font-serif mb-2">Affiliate Model</h3>
              <p className="text-white/60 text-sm mb-5">No cost to you</p>
              <ul className="space-y-3 text-white/90 text-sm mb-6">
                <li className="flex gap-2"><Check size={16} className="text-tfs-gold shrink-0 mt-0.5" /> Refer tenants to TFS via marketing materials</li>
                <li className="flex gap-2"><Check size={16} className="text-tfs-gold shrink-0 mt-0.5" /> Tenants sign up and pay their own plan</li>
                <li className="flex gap-2"><Check size={16} className="text-tfs-gold shrink-0 mt-0.5" /> You benefit indirectly through more on-time rent payments</li>
                <li className="flex gap-2"><Check size={16} className="text-tfs-gold shrink-0 mt-0.5" /> No administrative burden</li>
              </ul>
              <Link
                href="/contact?type=property-manager"
                className="inline-flex items-center gap-2 text-tfs-gold font-semibold text-sm hover:gap-3 transition-all"
              >
                Become an affiliate partner <ArrowRight size={16} />
              </Link>
            </div>

            {/* Paying */}
            <div className="bg-white rounded-2xl p-8 text-tfs-navy">
              <h3 className="text-xl font-bold font-serif mb-2">Tenant Partner Membership</h3>
              <p className="text-tfs-teal font-semibold text-lg mb-1">Custom Pricing</p>
              <p className="text-tfs-slate text-sm mb-5">You pay — your tenants get Advantage Plan coaching</p>
              <ul className="space-y-3 text-tfs-slate text-sm mb-6">
                <li className="flex gap-2"><Check size={16} className="text-tfs-teal shrink-0 mt-0.5" /> Admin generates promo codes — 1 per unit</li>
                <li className="flex gap-2"><Check size={16} className="text-tfs-teal shrink-0 mt-0.5" /> Tenants register with their code → Advantage Plan unlocked</li>
                <li className="flex gap-2"><Check size={16} className="text-tfs-teal shrink-0 mt-0.5" /> 2 individual sessions + group session per tenant/mo</li>
                <li className="flex gap-2"><Check size={16} className="text-tfs-teal shrink-0 mt-0.5" /> No cost or billing to your tenants</li>
              </ul>
              <Link href="/contact?type=property-manager" className="btn-primary text-sm">
                Contact us for pricing
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── NON-PROFIT ───────────────────────────────────────── */}
      <section id="nonprofit" className="py-20 bg-tfs-teal-light px-4 scroll-mt-16">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-3 mb-4">
            <HeartHandshake className="text-tfs-teal" size={28} />
            <h2 className="section-heading">Non-Profit & Community Partners</h2>
          </div>
          <p className="text-tfs-slate text-lg mb-12 max-w-2xl">
            We believe financial empowerment should reach every community, especially the most
            vulnerable. Eligible organizations receive complimentary access for their residents.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-start">
            <div>
              <h3 className="font-bold text-tfs-navy text-lg mb-4 font-serif">Eligible Organizations</h3>
              <ul className="space-y-2">
                {NONPROFIT_ORGS.map(org => (
                  <li key={org} className="flex gap-2 text-tfs-slate">
                    <Check className="text-tfs-teal shrink-0 mt-0.5" size={16} />
                    {org}
                  </li>
                ))}
              </ul>
            </div>

            <div className="card">
              <h3 className="font-bold text-tfs-navy text-xl mb-4 font-serif">What Your Residents Get</h3>
              <ul className="space-y-3 text-tfs-slate text-sm mb-6">
                <li className="flex gap-2"><Check size={16} className="text-tfs-teal shrink-0 mt-0.5" /> Complimentary group coaching session with your organization&apos;s promo code</li>
                <li className="flex gap-2"><Check size={16} className="text-tfs-teal shrink-0 mt-0.5" /> Custom pricing options available for individual coaching thereafter</li>
                <li className="flex gap-2"><Check size={16} className="text-tfs-teal shrink-0 mt-0.5" /> Register with a non-profit code — no billing to resident</li>
                <li className="flex gap-2"><Check size={16} className="text-tfs-teal shrink-0 mt-0.5" /> Private group session link provided to your organization</li>
              </ul>
              <Link href="/contact?type=nonprofit" className="btn-primary text-sm block text-center">
                Partner with us
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── BOTTOM CTA ───────────────────────────────────────── */}
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
          <h2 className="text-3xl font-serif font-bold mb-4">Ready to get started?</h2>
          <p className="text-white/80 mb-8">No credit card required. Your first Connection Session is on us.</p>
          <Link href="/register" className="btn-primary px-8 py-4">
            Step into your free Connection Session
          </Link>
        </div>
      </section>
    </>
  )
}
