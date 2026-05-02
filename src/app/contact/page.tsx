import type { Metadata } from 'next'
import Link from 'next/link'
import { Mail } from 'lucide-react'
import ContactForm from '@/components/contact/ContactForm'

export const metadata: Metadata = {
  title: 'Contact Us',
  description:
    'Get in touch with Tenant Financial Solutions. Questions about individual coaching, property manager partnerships, or non-profit programs — we\'d love to hear from you.',
  openGraph: {
    title: 'Contact Us | Tenant Financial Solutions',
    description: 'Questions? Ready to partner? Reach out and we\'ll respond within 1 business day.',
    url: '/contact',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Contact Us | Tenant Financial Solutions',
    description: 'Questions? Ready to partner? Reach out and we\'ll respond within 1 business day.',
  },
}

export default function ContactPage() {
  return (
    <>
      <section
        className="pt-32 pb-20 px-4 text-white text-center"
        style={{ background: 'linear-gradient(135deg, #1D9E75 0%, #1A2B4A 100%)' }}
      >
        <div className="max-w-2xl mx-auto">
          <h1 className="text-5xl font-serif font-bold mb-4">Get in Touch</h1>
          <p className="text-white text-xl mb-8">Questions? Ready to partner? We&apos;d love to hear from you.</p>
          <Link
            href="/register?tier=free"
            data-hero-cta="true"
            className="inline-block bg-tfs-gold text-tfs-navy font-bold text-lg px-10 py-4 rounded-xl shadow-lg hover:brightness-105 hover:scale-105 transition-all duration-200"
          >
            Step into your free Connection Session
          </Link>
        </div>
      </section>

      <section className="py-20 bg-white px-4">
        <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-14">
          <div>
            <h2 className="section-heading mb-6">Contact Information</h2>
            <div className="space-y-5 text-tfs-slate">
              <div className="flex items-center gap-3">
                <Mail className="text-tfs-teal shrink-0" size={20} />
                <a href="mailto:tenantfinancialsolutions@gmail.com" className="hover:text-tfs-teal transition-colors">
                  tenantfinancialsolutions@gmail.com
                </a>
              </div>
            </div>

            <div className="mt-10 p-6 rounded-2xl bg-tfs-teal-light">
              <h3 className="font-bold text-tfs-navy mb-3 font-serif">Looking for a specific team?</h3>
              <ul className="space-y-2 text-sm text-tfs-slate">
                <li>&bull; <strong>Individuals and/or Couples</strong> &mdash; select &quot;Individual and/or Couples Membership&quot; below</li>
                <li>&bull; <strong>Property Managers</strong> &mdash; select &quot;Property Manager Partnership&quot;</li>
                <li>&bull; <strong>Non-Profits</strong> &mdash; select &quot;Non-Profit Partnership&quot;</li>
              </ul>
            </div>
          </div>

          <div>
            <ContactForm />
          </div>
        </div>
      </section>
    </>
  )
}
