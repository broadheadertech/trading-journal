import Link from 'next/link';
import LandingNav from '@/components/landing/LandingNav';
import Footer from '@/components/landing/Footer';

export const metadata = {
  title: 'Terms of Service - Atlas',
  description: 'Atlas Terms of Service — rules and conditions for using the platform.',
};

// Scoped typography for the legal document. Presentation only — the legal
// copy itself is untouched.
const LEGAL_CSS = `
.legal-doc{max-width:760px;margin:0 auto;padding:64px 0 96px}
.legal-back{display:inline-flex;align-items:center;gap:9px;font-size:13px;color:var(--atlas-muted);margin-bottom:38px}
.legal-back:hover{color:var(--text)}
.legal-doc h1{font-family:var(--display);font-weight:600;font-size:44px;line-height:48px;color:var(--text);margin:0}
.legal-doc .legal-meta{font-family:var(--micro);font-size:11px;letter-spacing:.06em;color:var(--muted-2);margin:14px 0 0;text-transform:uppercase}
.legal-doc .legal-body{margin-top:40px;border-top:1px solid var(--line);padding-top:8px}
.legal-doc section{border-bottom:1px solid var(--line);padding:34px 0}
.legal-doc section:last-child{border-bottom:0}
.legal-doc h2{font-family:var(--display);font-weight:600;font-size:21px;line-height:25px;color:var(--text);margin:0 0 16px}
.legal-doc p{font-size:14.5px;line-height:25px;color:var(--atlas-muted);margin:0}
.legal-doc p + p{margin-top:14px}
.legal-doc p + ul{margin-top:16px}
.legal-doc ul + p{margin-top:16px}
.legal-doc ul{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:12px}
.legal-doc li{position:relative;padding-left:20px;font-size:14.5px;line-height:24px;color:var(--atlas-muted)}
.legal-doc li::before{content:"";position:absolute;left:0;top:10px;width:5px;height:5px;background:var(--amber)}
.legal-doc li strong{color:var(--text-3);font-weight:600}
.legal-doc a{color:var(--amber)}
.legal-doc a:hover{text-decoration:underline}
@media(max-width:700px){.legal-doc h1{font-size:32px;line-height:36px}}
`;

export default function TermsPage() {
  return (
    <div className="atlas-site">
      <LandingNav />
      <style>{LEGAL_CSS}</style>
      <div className="wrap">
        <div className="legal-doc">
        <Link href="/" className="legal-back">
          <svg width="12" height="9" viewBox="0 0 12 9" fill="none" aria-hidden="true"><path d="M12 4.5 H0 M0 4.5 L5 0 M0 4.5 L5 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
          Back to Home
        </Link>

        <h1>Terms of Service</h1>
        <p className="legal-meta">Last updated: March 6, 2026</p>

        <div className="legal-body">
          <section>
            <h2>1. Acceptance of Terms</h2>
            <p>
              By creating an account or using Atlas (&quot;the Service&quot;), you agree to be bound by these Terms of Service (&quot;Terms&quot;) and our <Link href="/privacy">Privacy Policy</Link>. If you do not agree to these Terms, do not use the Service.
            </p>
          </section>

          <section>
            <h2>2. Description of Service</h2>
            <p>
              Atlas is an AI-powered trading journal and analytics platform designed to help traders track, analyze, and improve their trading performance across crypto, stocks, and forex markets. The Service includes trade logging, psychology tracking, discipline scoring, AI coaching, and related features.
            </p>
          </section>

          <section>
            <h2>3. Account Registration</h2>
            <ul>
              <li>You must be at least 18 years old to create an account.</li>
              <li>You must provide accurate and complete information during registration.</li>
              <li>You are responsible for maintaining the security of your account credentials.</li>
              <li>You are responsible for all activities that occur under your account.</li>
              <li>You must notify us immediately of any unauthorized use of your account.</li>
            </ul>
          </section>

          <section>
            <h2>4. Consent to Data Collection</h2>
            <p>
              By registering for Atlas, you expressly consent to the collection, processing, and storage of your personal data as described in our <Link href="/privacy">Privacy Policy</Link>. This includes but is not limited to:
            </p>
            <ul>
              <li>Your account information (name, email, profile data).</li>
              <li>Your trading data, journal entries, and strategy configurations.</li>
              <li>Psychological and behavioral data derived from your trading activity.</li>
              <li>Usage analytics and interaction data.</li>
            </ul>
            <p>
              You may withdraw consent and request data deletion at any time by contacting <a href="mailto:support@atlas.app">support@atlas.app</a> or deleting your account.
            </p>
          </section>

          <section>
            <h2>5. Not Financial Advice</h2>
            <p>
              Atlas is a journaling and analytics tool. Nothing provided by the Service constitutes financial, investment, or trading advice. All trading decisions are made solely by you. We are not responsible for any financial losses resulting from your trading activity. Past performance data displayed in the platform does not guarantee future results.
            </p>
          </section>

          <section>
            <h2>6. Acceptable Use</h2>
            <p>You agree not to:</p>
            <ul>
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
            <h2>7. Subscriptions & Payments</h2>
            <ul>
              <li>Some features require a paid subscription. Prices are displayed on our pricing page.</li>
              <li>Subscriptions are billed on a recurring basis (monthly or yearly) and auto-renew unless cancelled.</li>
              <li>You may cancel your subscription at any time. Access continues until the end of the current billing period.</li>
              <li>Refunds are handled on a case-by-case basis. Contact support for refund requests.</li>
              <li>We reserve the right to change pricing with 30 days&apos; notice to existing subscribers.</li>
            </ul>
          </section>

          <section>
            <h2>8. Intellectual Property</h2>
            <p>
              All content, features, and functionality of the Service (excluding user-generated data) are owned by Atlas and protected by intellectual property laws. Your trading data remains yours — we claim no ownership over your personal trading information.
            </p>
          </section>

          <section>
            <h2>9. Limitation of Liability</h2>
            <p>
              To the maximum extent permitted by law, Atlas shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including loss of profits, data, or trading losses, arising from your use of the Service. Our total liability shall not exceed the amount you paid to us in the 12 months preceding the claim.
            </p>
          </section>

          <section>
            <h2>10. Disclaimer of Warranties</h2>
            <p>
              The Service is provided &quot;as is&quot; and &quot;as available&quot; without warranties of any kind, either express or implied. We do not warrant that the Service will be uninterrupted, error-free, or secure, or that any data or analytics will be accurate or complete.
            </p>
          </section>

          <section>
            <h2>11. Termination</h2>
            <p>
              We may suspend or terminate your account at any time for violation of these Terms or for any other reason at our sole discretion. Upon termination, your right to use the Service ceases immediately. You may request a copy of your data before account deletion.
            </p>
          </section>

          <section>
            <h2>12. Changes to Terms</h2>
            <p>
              We may modify these Terms at any time. Material changes will be communicated via email or in-app notification. Your continued use of the Service after changes take effect constitutes acceptance of the updated Terms.
            </p>
          </section>

          <section>
            <h2>13. Contact</h2>
            <p>
              For questions about these Terms, contact us at:<br />
              <a href="mailto:support@atlas.app">support@atlas.app</a>
            </p>
          </section>
        </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
