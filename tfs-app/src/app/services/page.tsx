import type { Metadata } from 'next'
import Link from 'next/link'
import { Check, Building2, HeartHandshake, Users, ArrowRight } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Services & Membership Plans',
  description:
    'Financial coaching membership plans for individuals and/or couples, property management partners, and non-profits. Bronze $50/mo, Silver $100/mo, Gold $150/mo.',
}

const INDIVIDUAL_PLANS = [
  {
    name: 'Free',
    price: 0,
    tier: 'free',
    tagline: 'Start your journey',
    color: 'border-gray-200',
    badge: '',
    features: [
      'Permanent — no expiry, no forced upgrade',
      'Access to self-help financial tools',
      'Pay-per-session at full price (no discount)',
      'Account stays open until you close it',
    ],
    cta: 'Sign up free',
    ctaHref: '/register?tier=free',
  },
  {
    name: 'Bronze',
    price: 50,
    tier: 'bronze',
    tagline: 'Great for getting started',
    color: 'border-amber-400',
    badge: 'amber',
    features: [
      '1 × 45-min individual coaching session/mo',
      'Monthly group coaching session',
      'Birthday gift — 1 free redeemable session code',
    ],
    cta: 'Start Bronze',
    ctaHref: '/register?tier=bronze',
  },
  {
    name: 'Silver',
    price: 100,
    tier: 'silver',
    tagline: 'Most popular',
    color: 'border-tfs-teal',
    badge: 'teal',
    popular: true,
    features: [
      '2 × 45-min individual coaching sessions/mo',
      'Monthly group coaching session',
      'Birthday gift — 1 free redeemable session code',
    ],
    cta: 'Start Silver',
    ctaHref: '/register?tier=silver',
  },
  {
    name: 'Gold',
    price: 150,
    tier: 'gold',
    tagline: 'Maximum coaching coverage',
    color: 'border-yellow-400',
    badge: 'gold',
    features: [
      'Up to 4 × 45-min individual sessions/mo',
      'Monthly group coaching session',
      'Birthday gift — 1 free redeemable session code',
      'Individual and/or Couples direct-pay only',
    ],
    cta: 'Start Gold',
    ctaHref: '/register?tier=gold',
  },
]

const BADGE_STYLES: Record<string, string> = {
  amber: 'bg-amber-100 text-amber-700',
  teal:  'bg-tfs-teal/10 text-tfs-teal',
  gold:  'bg-yellow-100 text-yellow-700',
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
        className="pt-28 pb-20 px-4 text-white text-center"
        style={{ background: 'linear-gradient(135deg, #1D9E75 0%, #1A2B4A 100%)' }}
      >
        <div className="max-w-3xl mx-auto">
          <h1 className="text-5xl font-serif font-bold mb-4">Services & Plans</h1>
          <p className="text-white/80 text-xl">
            Coaching plans for individuals and/or couples, property managers, and community organizations.
            Transparent pricing. No hidden fees.
          </p>
        </div>
      </section>

      {/* ── INDIVIDUAL PLANS ─────────────────────────────────── */}
      <section id="individual" className="py-20 bg-white px-4 scroll-mt-16">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-3 mb-4">
            <Users className="text-tfs-teal" size={28} />
            <h2 className="section-heading">Individual and/or Couples Membership Plans</h2>
          </div>
          <p className="text-tfs-slate mb-12 text-lg max-w-2xl">
            Choose the plan that fits your coaching needs. Sessions do not roll over —
            they reset on the 1st of each month.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
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

                <Link href={plan.ctaHref} className="btn-primary text-sm text-center">
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>

          <p className="text-center text-tfs-slate text-sm mt-8">
            * Sessions reset the 1st of every month. Unused sessions do not carry over.
            Birthday gift session code issued in your birthday month.
          </p>
        </div>
      </section>

      {/* ── PROPERTY MANAGEMENT ──────────────────────────────── */}
      <section id="property-management" className="py-20 px-4 scroll-mt-16"
        style={{ background: 'linear-gradient(135deg, #1A2B4A, #1D9E75)' }}>
        <div className="max-w-5xl mx-auto text-white">
          <div className="flex items-center gap-3 mb-4">
            <Building2 className="text-white/80" size={28} />
            <h2 className="text-3xl md:text-4xl font-serif font-bold">Property Management Partners</h2>
          </div>
          <p className="text-white/80 text-lg mb-12 max-w-2xl">
            Two partnership models. Both reduce delinquencies, improve tenant relationships,
            and free up your team to focus on core responsibilities.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
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
              <p className="text-tfs-slate text-sm mb-5">You pay — your tenants get Silver coaching</p>
              <ul className="space-y-3 text-tfs-slate text-sm mb-6">
                <li className="flex gap-2"><Check size={16} className="text-tfs-teal shrink-0 mt-0.5" /> Admin generates promo codes — 1 per unit</li>
                <li className="flex gap-2"><Check size={16} className="text-tfs-teal shrink-0 mt-0.5" /> Tenants register with their code → Silver tier unlocked</li>
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
    </>
  )
}
