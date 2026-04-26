import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Terms of Service | Tenant Financial Solutions',
  description: 'Terms and conditions governing use of Tenant Financial Solutions coaching services.',
}

export default function TermsPage() {
  const updated = 'April 26, 2026'

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-20">
      <h1 className="text-4xl font-serif font-bold text-tfs-navy mb-2">Terms of Service</h1>
      <p className="text-sm text-tfs-slate mb-10">Last updated: {updated}</p>

      <div className="prose prose-slate max-w-none space-y-8 text-tfs-slate leading-relaxed">

        <section>
          <h2 className="text-xl font-serif font-bold text-tfs-navy mb-3">1. Agreement to Terms</h2>
          <p>
            By accessing or using the Tenant Financial Solutions website and coaching services
            (&ldquo;Services&rdquo;), you agree to be bound by these Terms of Service (&ldquo;Terms&rdquo;).
            If you do not agree, please do not use our Services.
          </p>
          <p className="mt-3">
            These Terms apply to all users, including individuals, couples, property management tenants,
            and nonprofit residents. References to &ldquo;TFS,&rdquo; &ldquo;we,&rdquo; &ldquo;us,&rdquo;
            or &ldquo;our&rdquo; refer to Tenant Financial Solutions, operated by MJM Financial Coaching.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-serif font-bold text-tfs-navy mb-3">2. Description of Services</h2>
          <p>
            Tenant Financial Solutions provides personal financial coaching services, including one-on-one
            coaching sessions, group sessions, and educational resources. Our coaches are financial educators,
            not licensed financial advisors, investment advisors, attorneys, or accountants.
          </p>
          <p className="mt-3 font-medium text-tfs-navy">
            Nothing provided through our Services constitutes financial, legal, tax, or investment advice.
            All coaching content is educational in nature. You are solely responsible for any financial
            decisions you make.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-serif font-bold text-tfs-navy mb-3">3. Accounts</h2>
          <p>
            To access coaching services, you must create an account with accurate and complete information.
            You are responsible for maintaining the confidentiality of your login credentials and for all
            activity that occurs under your account.
          </p>
          <p className="mt-3">
            You must be at least 18 years old to create an account. By registering, you confirm that you
            meet this age requirement.
          </p>
          <p className="mt-3">
            We reserve the right to suspend or terminate accounts that violate these Terms, engage in
            abusive behavior toward coaches or staff, or provide false information during registration.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-serif font-bold text-tfs-navy mb-3">4. Subscriptions and Billing</h2>
          <p>
            Paid plans (Starter and Advantage) are billed on a monthly recurring basis through Stripe.
            By subscribing, you authorize us to charge your payment method on a monthly cycle until you cancel.
          </p>
          <ul className="list-disc pl-6 mt-3 space-y-1">
            <li>Subscriptions renew automatically each month unless cancelled before the renewal date</li>
            <li>You may cancel at any time through your billing portal; access continues until the end of the paid period</li>
            <li>We do not offer refunds for partial months or unused sessions</li>
            <li>Free plan accounts include a 30-day trial period with 1 complimentary coaching session</li>
            <li>Promo codes and affiliate discounts are applied at registration and may not be combined</li>
          </ul>
          <p className="mt-3">
            Pricing may change with 30 days&apos; notice. Continued use after a price change constitutes acceptance.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-serif font-bold text-tfs-navy mb-3">5. Session Policies</h2>
          <p>Sessions are subject to the following policies:</p>
          <ul className="list-disc pl-6 mt-3 space-y-1">
            <li>Sessions are 60 minutes and conducted via video or phone as arranged with your coach</li>
            <li>Session credits reset on the 1st of each month and do not roll over</li>
            <li>Cancellations made with less than 24 hours&apos; notice may be counted as used sessions at coach discretion</li>
            <li>No-shows without notice will be counted as used sessions</li>
            <li>Group sessions are complimentary for all active members and do not count against session limits</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-serif font-bold text-tfs-navy mb-3">6. Promo Codes and Partner Access</h2>
          <p>
            Property management tenants and nonprofit residents may access Services through promo codes
            provided by their property manager or organization. Eligibility is subject to the terms of
            the applicable partnership agreement.
          </p>
          <p className="mt-3">
            Promo codes are non-transferable, may not be shared outside their intended group, and are
            subject to expiration and usage limits set by the issuing partner.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-serif font-bold text-tfs-navy mb-3">7. Acceptable Use</h2>
          <p>You agree not to:</p>
          <ul className="list-disc pl-6 mt-3 space-y-1">
            <li>Use our Services for any unlawful purpose</li>
            <li>Harass, threaten, or abuse coaches, staff, or other users</li>
            <li>Share login credentials or allow others to use your account</li>
            <li>Attempt to gain unauthorized access to our systems or data</li>
            <li>Record coaching sessions without the coach&apos;s explicit consent</li>
            <li>Reproduce or redistribute coaching materials without written permission</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-serif font-bold text-tfs-navy mb-3">8. Intellectual Property</h2>
          <p>
            All content on the Tenant Financial Solutions website — including text, graphics, logos, and
            coaching materials — is the property of MJM Financial Coaching and protected by applicable
            copyright and trademark laws. You may not reproduce or distribute any content without our
            prior written consent.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-serif font-bold text-tfs-navy mb-3">9. Disclaimer of Warranties</h2>
          <p>
            Our Services are provided &ldquo;as is&rdquo; and &ldquo;as available&rdquo; without warranties of any kind,
            express or implied. We do not guarantee that our Services will be uninterrupted, error-free,
            or that coaching sessions will result in specific financial outcomes.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-serif font-bold text-tfs-navy mb-3">10. Limitation of Liability</h2>
          <p>
            To the fullest extent permitted by law, Tenant Financial Solutions and MJM Financial Coaching
            shall not be liable for any indirect, incidental, special, or consequential damages arising
            from your use of our Services, including any financial decisions made based on coaching content.
          </p>
          <p className="mt-3">
            Our total liability to you for any claim arising from these Terms or your use of our Services
            shall not exceed the amount you paid us in the 3 months prior to the claim.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-serif font-bold text-tfs-navy mb-3">11. Termination</h2>
          <p>
            Either party may terminate the service relationship at any time. You may cancel your account
            through your portal settings or by contacting us. We may suspend or terminate your account
            for violations of these Terms, with or without prior notice.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-serif font-bold text-tfs-navy mb-3">12. Governing Law</h2>
          <p>
            These Terms are governed by the laws of the State of Ohio, without regard to its conflict
            of law provisions. Any disputes shall be resolved in the courts of Ohio.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-serif font-bold text-tfs-navy mb-3">13. Changes to These Terms</h2>
          <p>
            We may update these Terms from time to time. We will notify registered users of material
            changes by email or via a notice on the platform. Continued use of our Services after
            changes take effect constitutes your acceptance of the updated Terms.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-serif font-bold text-tfs-navy mb-3">14. Contact Us</h2>
          <p>Questions about these Terms? Reach us at:</p>
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
          <p className="mt-4">
            For our privacy practices, see our{' '}
            <Link href="/privacy" className="text-tfs-teal hover:underline">Privacy Policy</Link>.
          </p>
        </section>

      </div>
    </div>
  )
}
