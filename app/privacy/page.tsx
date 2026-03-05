import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export const metadata = {
  title: 'Privacy Policy - Tradia',
  description: 'Tradia Privacy Policy — how we collect, use, and protect your personal data.',
};

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors mb-8">
          <ArrowLeft size={16} /> Back to Home
        </Link>

        <h1 className="text-3xl font-bold mb-2">Privacy Policy</h1>
        <p className="text-sm text-[var(--muted-foreground)] mb-10">Last updated: March 6, 2026</p>

        <div className="space-y-8 text-sm leading-relaxed text-[var(--foreground)]">
          <section>
            <h2 className="text-lg font-semibold mb-3">1. Introduction</h2>
            <p>
              Tradia (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;) operates the Tradia trading journal platform. This Privacy Policy explains how we collect, use, disclose, and safeguard your personal data when you use our services. By registering for an account, you acknowledge that you have read and agree to this Privacy Policy.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">2. Information We Collect</h2>
            <p className="mb-3">We collect the following categories of personal data:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong>Account Information:</strong> Name, email address, profile picture, and authentication credentials provided through our sign-up process (managed by Clerk).</li>
              <li><strong>Trading Data:</strong> Trade entries, journal notes, strategy configurations, goals, daily reflections, and other data you voluntarily input into the platform.</li>
              <li><strong>Psychology & Behavioral Data:</strong> Emotional states, discipline scores, behavior assessments, and coaching insights generated from your trading activity.</li>
              <li><strong>Payment Information:</strong> Billing details processed through our payment providers (Stripe, PayMongo). We do not store full credit card numbers on our servers.</li>
              <li><strong>Usage Data:</strong> Device information, browser type, IP address, pages visited, feature usage patterns, and interaction timestamps collected automatically.</li>
              <li><strong>Communication Data:</strong> Support requests, feedback, and any messages you send to us.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">3. How We Use Your Data</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>To provide, maintain, and improve the Tradia platform and its features.</li>
              <li>To generate personalized trading analytics, psychology insights, AI coaching recommendations, and discipline scores.</li>
              <li>To process subscriptions and payments.</li>
              <li>To send account-related notifications and service updates.</li>
              <li>To detect and prevent fraud, abuse, and security threats.</li>
              <li>To comply with legal obligations and enforce our Terms of Service.</li>
              <li>To conduct aggregated, anonymized analytics to improve our services (individual users are never identified in aggregate data).</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">4. Data Sharing & Third Parties</h2>
            <p className="mb-3">We do not sell your personal data. We share data only with:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong>Clerk:</strong> Authentication and user management.</li>
              <li><strong>Convex:</strong> Backend database and real-time data services.</li>
              <li><strong>Stripe / PayMongo:</strong> Payment processing.</li>
              <li><strong>Hosting Providers:</strong> Vercel for application hosting.</li>
            </ul>
            <p className="mt-3">These providers are bound by their own privacy policies and data processing agreements.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">5. Data Retention</h2>
            <p>
              We retain your personal data for as long as your account is active or as needed to provide you services. If you delete your account, we will delete or anonymize your personal data within 30 days, except where retention is required by law or for legitimate business purposes (e.g., fraud prevention, legal disputes).
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">6. Data Security</h2>
            <p>
              We implement industry-standard security measures including encryption in transit (TLS), secure authentication, and access controls. However, no method of electronic transmission or storage is 100% secure, and we cannot guarantee absolute security.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">7. Your Rights</h2>
            <p className="mb-3">Depending on your jurisdiction, you may have the right to:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li>Access the personal data we hold about you.</li>
              <li>Request correction of inaccurate data.</li>
              <li>Request deletion of your data.</li>
              <li>Object to or restrict certain processing activities.</li>
              <li>Request a portable copy of your data.</li>
              <li>Withdraw consent at any time (where processing is based on consent).</li>
            </ul>
            <p className="mt-3">To exercise any of these rights, contact us at <a href="mailto:support@tradia.app" className="text-[var(--accent)] hover:underline">support@tradia.app</a>.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">8. Cookies & Tracking</h2>
            <p>
              We use essential cookies for authentication and session management. We do not use third-party advertising cookies. Analytics data is collected in aggregate form without personally identifying individual users.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">9. Children&apos;s Privacy</h2>
            <p>
              Tradia is not intended for users under the age of 18. We do not knowingly collect personal data from children. If you believe a child has provided us with personal data, please contact us and we will delete it promptly.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">10. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. We will notify you of material changes by posting the updated policy on this page and updating the &quot;Last updated&quot; date. Your continued use of Tradia after changes are posted constitutes acceptance of the revised policy.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">11. Contact Us</h2>
            <p>
              If you have questions about this Privacy Policy or your personal data, contact us at:<br />
              <a href="mailto:support@tradia.app" className="text-[var(--accent)] hover:underline">support@tradia.app</a>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
