import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Privacy Policy | Tenant Financial Solutions',
  description: 'How Tenant Financial Solutions collects, uses, and protects your personal information.',
}

export default function PrivacyPage() {
  const updated = 'April 26, 2026'

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-20">
      <h1 className="text-4xl font-serif font-bold text-tfs-navy mb-2">Privacy Policy</h1>
      <p className="text-sm text-tfs-slate mb-10">Last updated: {updated}</p>

      <div className="prose prose-slate max-w-none space-y-8 text-tfs-slate leading-relaxed">

        <section>
          <h2 className="text-xl font-serif font-bold text-tfs-navy mb-3">1. Who We Are</h2>
          <p>
            Tenant Financial Solutions (&ldquo;TFS,&rdquo; &ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;) is a
            financial coaching service operated by MJM Financial Coaching. We provide one-on-one and group financial
            coaching sessions to individuals, couples, property management tenants, and nonprofit residents.
          </p>
          <p className="mt-3">
            Questions about this policy can be directed to:{' '}
            <a href="mailto:tenantfinancialsolutions@gmail.com" className="text-tfs-teal hover:underline">
              tenantfinancialsolutions@gmail.com
            </a>
          </p>
        </section>

        <section>
          <h2 className="text-xl font-serif font-bold text-tfs-navy mb-3">2. Information We Collect</h2>
          <p>We collect information you provide directly when you create an account or use our services:</p>
          <ul className="list-disc pl-6 mt-3 space-y-1">
            <li>Name (first and last; partner name for couples accounts)</li>
            <li>Email address and password</li>
            <li>Phone number (optional, contact form only)</li>
            <li>Timezone</li>
            <li>Birthday month or anniversary month (optional, used for personalized outreach)</li>
            <li>Unit number (property management tenants only, for eligibility verification)</li>
            <li>Promo or referral codes used at registration</li>
            <li>Session booking history and attendance records</li>
            <li>Testimonials you choose to submit</li>
            <li>Contact form messages</li>
          </ul>
          <p className="mt-3">
            If you subscribe to a paid plan, we collect billing information through our payment processor, Stripe.
            We do not store your full payment card details on our servers.
          </p>
          <p className="mt-3">
            If you sign in with Google, we receive your name and email address from Google. We do not receive your
            Google password or access to your Google data beyond basic profile information.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-serif font-bold text-tfs-navy mb-3">3. How We Use Your Information</h2>
          <ul className="list-disc pl-6 space-y-1">
            <li>Create and manage your coaching account</li>
            <li>Schedule, confirm, and manage coaching sessions</li>
            <li>Send booking confirmations, reminders, and cancellation notices</li>
            <li>Process subscription billing and manage your plan</li>
            <li>Respond to contact form inquiries</li>
            <li>Send service updates and educational content (you may unsubscribe at any time)</li>
            <li>Display approved testimonials on our public website (only with your submission)</li>
            <li>Improve our services and user experience</li>
          </ul>
          <p className="mt-3">
            We do not use your information for automated decision-making or profiling beyond what is necessary
            to deliver coaching services.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-serif font-bold text-tfs-navy mb-3">4. Third-Party Services</h2>
          <p>We use the following trusted third-party services to operate TFS. Each has its own privacy policy:</p>
          <ul className="list-disc pl-6 mt-3 space-y-2">
            <li>
              <strong>Supabase</strong> — database and authentication hosting.{' '}
              <a href="https://supabase.com/privacy" target="_blank" rel="noopener noreferrer" className="text-tfs-teal hover:underline">supabase.com/privacy</a>
            </li>
            <li>
              <strong>Stripe</strong> — payment processing and subscription management.{' '}
              <a href="https://stripe.com/privacy" target="_blank" rel="noopener noreferrer" className="text-tfs-teal hover:underline">stripe.com/privacy</a>
            </li>
            <li>
              <strong>Resend</strong> — transactional email delivery.{' '}
              <a href="https://resend.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-tfs-teal hover:underline">resend.com/legal/privacy-policy</a>
            </li>
            <li>
              <strong>Google OAuth</strong> — optional sign-in via Google account.{' '}
              <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="text-tfs-teal hover:underline">policies.google.com/privacy</a>
            </li>
            <li>
              <strong>Vercel</strong> — website hosting and deployment.{' '}
              <a href="https://vercel.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-tfs-teal hover:underline">vercel.com/legal/privacy-policy</a>
            </li>
          </ul>
          <p className="mt-3">
            We do not sell, rent, or share your personal information with third parties for their own marketing purposes.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-serif font-bold text-tfs-navy mb-3">5. Data Retention</h2>
          <p>
            We retain your account information for as long as your account is active. If you request account deletion,
            we will remove your personal data within 30 days, except where we are required to retain it for legal or
            financial compliance purposes (e.g., billing records).
          </p>
          <p className="mt-3">
            Session and attendance records may be retained for up to 3 years for service quality and compliance purposes.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-serif font-bold text-tfs-navy mb-3">6. Your Rights</h2>
          <p>You have the right to:</p>
          <ul className="list-disc pl-6 mt-3 space-y-1">
            <li>Access the personal information we hold about you</li>
            <li>Correct inaccurate or incomplete information via your profile settings</li>
            <li>Request deletion of your account and associated data</li>
            <li>Opt out of non-essential email communications at any time</li>
            <li>Request a copy of your data in a portable format</li>
          </ul>
          <p className="mt-3">
            To exercise any of these rights, contact us at{' '}
            <a href="mailto:tenantfinancialsolutions@gmail.com" className="text-tfs-teal hover:underline">
              tenantfinancialsolutions@gmail.com
            </a>.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-serif font-bold text-tfs-navy mb-3">7. Security</h2>
          <p>
            We take reasonable technical and organizational measures to protect your information, including encrypted
            data storage, secure HTTPS connections, and row-level security on our database. However, no method of
            transmission over the internet is 100% secure, and we cannot guarantee absolute security.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-serif font-bold text-tfs-navy mb-3">8. Children&apos;s Privacy</h2>
          <p>
            Our services are intended for adults 18 and older. We do not knowingly collect personal information
            from children under 13. If you believe a child has provided us with personal information, please
            contact us and we will delete it promptly.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-serif font-bold text-tfs-navy mb-3">9. Changes to This Policy</h2>
          <p>
            We may update this Privacy Policy from time to time. When we do, we will update the &ldquo;Last updated&rdquo;
            date at the top of this page. Continued use of our services after changes are posted constitutes
            acceptance of the updated policy.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-serif font-bold text-tfs-navy mb-3">10. Contact Us</h2>
          <p>
            If you have any questions or concerns about this Privacy Policy, please contact us:
          </p>
          <div className="mt-3">
            <p className="font-medium text-tfs-navy">Tenant Financial Solutions</p>
            <p>
              Email:{' '}
              <a href="mailto:tenantfinancialsolutions@gmail.com" className="text-tfs-teal hover:underline">
                tenantfinancialsolutions@gmail.com
              </a>
            </p>
            <p>Website: <Link href="/" className="text-tfs-teal hover:underline">tenantfinancialsolutions.com</Link></p>
          </div>
        </section>

      </div>
    </div>
  )
}
