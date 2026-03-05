import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export const metadata = {
  title: 'Terms of Service - Tradia',
  description: 'Tradia Terms of Service — rules and conditions for using the platform.',
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors mb-8">
          <ArrowLeft size={16} /> Back to Home
        </Link>

        <h1 className="text-3xl font-bold mb-2">Terms of Service</h1>
        <p className="text-sm text-[var(--muted-foreground)] mb-10">Last updated: March 6, 2026</p>

        <div className="space-y-8 text-sm leading-relaxed text-[var(--foreground)]">
          <section>
            <h2 className="text-lg font-semibold mb-3">1. Acceptance of Terms</h2>
            <p>
              By creating an account or using Tradia (&quot;the Service&quot;), you agree to be bound by these Terms of Service (&quot;Terms&quot;) and our <Link href="/privacy" className="text-[var(--accent)] hover:underline">Privacy Policy</Link>. If you do not agree to these Terms, do not use the Service.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">2. Description of Service</h2>
            <p>
              Tradia is an AI-powered trading journal and analytics platform designed to help traders track, analyze, and improve their trading performance across crypto, stocks, and forex markets. The Service includes trade logging, psychology tracking, discipline scoring, AI coaching, and related features.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">3. Account Registration</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>You must be at least 18 years old to create an account.</li>
              <li>You must provide accurate and complete information during registration.</li>
              <li>You are responsible for maintaining the security of your account credentials.</li>
              <li>You are responsible for all activities that occur under your account.</li>
              <li>You must notify us immediately of any unauthorized use of your account.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">4. Consent to Data Collection</h2>
            <p>
              By registering for Tradia, you expressly consent to the collection, processing, and storage of your personal data as described in our <Link href="/privacy" className="text-[var(--accent)] hover:underline">Privacy Policy</Link>. This includes but is not limited to:
            </p>
            <ul className="list-disc pl-5 space-y-2 mt-3">
              <li>Your account information (name, email, profile data).</li>
              <li>Your trading data, journal entries, and strategy configurations.</li>
              <li>Psychological and behavioral data derived from your trading activity.</li>
              <li>Usage analytics and interaction data.</li>
            </ul>
            <p className="mt-3">
              You may withdraw consent and request data deletion at any time by contacting <a href="mailto:support@tradia.app" className="text-[var(--accent)] hover:underline">support@tradia.app</a> or deleting your account.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">5. Not Financial Advice</h2>
            <p>
              Tradia is a journaling and analytics tool. Nothing provided by the Service constitutes financial, investment, or trading advice. All trading decisions are made solely by you. We are not responsible for any financial losses resulting from your trading activity. Past performance data displayed in the platform does not guarantee future results.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">6. Acceptable Use</h2>
            <p className="mb-3">You agree not to:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li>Use the Service for any unlawful purpose.</li>
              <li>Attempt to gain unauthorized access to any part of the Service.</li>
              <li>Interfere with or disrupt the Service or its infrastructure.</li>
              <li>Upload malicious code, spam, or harmful content.</li>
              <li>Impersonate another person or misrepresent your identity.</li>
              <li>Resell, redistribute, or sublicense access to the Service.</li>
              <li>Use automated tools to scrape or extract data from the Service.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">7. Subscriptions & Payments</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>Some features require a paid subscription. Prices are displayed on our pricing page.</li>
              <li>Subscriptions are billed on a recurring basis (monthly or yearly) and auto-renew unless cancelled.</li>
              <li>You may cancel your subscription at any time. Access continues until the end of the current billing period.</li>
              <li>Refunds are handled on a case-by-case basis. Contact support for refund requests.</li>
              <li>We reserve the right to change pricing with 30 days&apos; notice to existing subscribers.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">8. Intellectual Property</h2>
            <p>
              All content, features, and functionality of the Service (excluding user-generated data) are owned by Tradia and protected by intellectual property laws. Your trading data remains yours — we claim no ownership over your personal trading information.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">9. Limitation of Liability</h2>
            <p>
              To the maximum extent permitted by law, Tradia shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including loss of profits, data, or trading losses, arising from your use of the Service. Our total liability shall not exceed the amount you paid to us in the 12 months preceding the claim.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">10. Disclaimer of Warranties</h2>
            <p>
              The Service is provided &quot;as is&quot; and &quot;as available&quot; without warranties of any kind, either express or implied. We do not warrant that the Service will be uninterrupted, error-free, or secure, or that any data or analytics will be accurate or complete.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">11. Termination</h2>
            <p>
              We may suspend or terminate your account at any time for violation of these Terms or for any other reason at our sole discretion. Upon termination, your right to use the Service ceases immediately. You may request a copy of your data before account deletion.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">12. Changes to Terms</h2>
            <p>
              We may modify these Terms at any time. Material changes will be communicated via email or in-app notification. Your continued use of the Service after changes take effect constitutes acceptance of the updated Terms.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">13. Contact</h2>
            <p>
              For questions about these Terms, contact us at:<br />
              <a href="mailto:support@tradia.app" className="text-[var(--accent)] hover:underline">support@tradia.app</a>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
