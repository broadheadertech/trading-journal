import Link from 'next/link';
import LandingNav from '@/components/landing/LandingNav';
import Footer from '@/components/landing/Footer';

export const metadata = {
  title: 'Privacy Policy - Atlas',
  description: 'Atlas Privacy Policy — how we collect, use, and protect your personal data.',
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

export default function PrivacyPolicyPage() {
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

        <h1>Privacy Policy</h1>
        <p className="legal-meta">Last updated: March 6, 2026</p>

        <div className="legal-body">
          <section>
            <h2>1. Introduction</h2>
            <p>
              Atlas (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;) operates the Atlas trading journal platform. This Privacy Policy explains how we collect, use, disclose, and safeguard your personal data when you use our services. By registering for an account, you acknowledge that you have read and agree to this Privacy Policy.
            </p>
          </section>

          <section>
            <h2>2. Information We Collect</h2>
            <p>We collect the following categories of personal data:</p>
            <ul>
              <li><strong>Account Information:</strong> Name, email address, profile picture, and authentication credentials provided through our sign-up process (managed by Clerk).</li>
              <li><strong>Trading Data:</strong> Trade entries, journal notes, strategy configurations, goals, daily reflections, and other data you voluntarily input into the platform.</li>
              <li><strong>Psychology & Behavioral Data:</strong> Emotional states, discipline scores, behavior assessments, and coaching insights generated from your trading activity.</li>
              <li><strong>Payment Information:</strong> Billing details processed through our payment providers (Stripe, PayMongo). We do not store full credit card numbers on our servers.</li>
              <li><strong>Usage Data:</strong> Device information, browser type, IP address, pages visited, feature usage patterns, and interaction timestamps collected automatically.</li>
              <li><strong>Communication Data:</strong> Support requests, feedback, and any messages you send to us.</li>
            </ul>
          </section>

          <section>
            <h2>3. How We Use Your Data</h2>
            <ul>
              <li>To provide, maintain, and improve the Atlas platform and its features.</li>
              <li>To generate personalized trading analytics, psychology insights, AI coaching recommendations, and discipline scores.</li>
              <li>To process subscriptions and payments.</li>
              <li>To send account-related notifications and service updates.</li>
              <li>To detect and prevent fraud, abuse, and security threats.</li>
              <li>To comply with legal obligations and enforce our Terms of Service.</li>
              <li>To conduct aggregated, anonymized analytics to improve our services (individual users are never identified in aggregate data).</li>
            </ul>
          </section>

          <section>
            <h2>4. Data Sharing & Third Parties</h2>
            <p>We do not sell your personal data. We share data only with:</p>
            <ul>
              <li><strong>Clerk:</strong> Authentication and user management.</li>
              <li><strong>Convex:</strong> Backend database and real-time data services.</li>
              <li><strong>Stripe / PayMongo:</strong> Payment processing.</li>
              <li><strong>Hosting Providers:</strong> Vercel for application hosting.</li>
            </ul>
            <p>These providers are bound by their own privacy policies and data processing agreements.</p>
          </section>

          <section>
            <h2>5. Data Retention</h2>
            <p>
              We retain your personal data for as long as your account is active or as needed to provide you services. If you delete your account, we will delete or anonymize your personal data within 30 days, except where retention is required by law or for legitimate business purposes (e.g., fraud prevention, legal disputes).
            </p>
          </section>

          <section>
            <h2>6. Data Security</h2>
            <p>
              We implement industry-standard security measures including encryption in transit (TLS), secure authentication, and access controls. However, no method of electronic transmission or storage is 100% secure, and we cannot guarantee absolute security.
            </p>
          </section>

          <section>
            <h2>7. Your Rights</h2>
            <p>Depending on your jurisdiction, you may have the right to:</p>
            <ul>
              <li>Access the personal data we hold about you.</li>
              <li>Request correction of inaccurate data.</li>
              <li>Request deletion of your data.</li>
              <li>Object to or restrict certain processing activities.</li>
              <li>Request a portable copy of your data.</li>
              <li>Withdraw consent at any time (where processing is based on consent).</li>
            </ul>
            <p>To exercise any of these rights, contact us at <a href="mailto:support@atlas.app">support@atlas.app</a>.</p>
          </section>

          <section>
            <h2>8. Cookies & Tracking</h2>
            <p>
              We use essential cookies for authentication and session management. We do not use third-party advertising cookies. Analytics data is collected in aggregate form without personally identifying individual users.
            </p>
          </section>

          <section>
            <h2>9. Children&apos;s Privacy</h2>
            <p>
              Atlas is not intended for users under the age of 18. We do not knowingly collect personal data from children. If you believe a child has provided us with personal data, please contact us and we will delete it promptly.
            </p>
          </section>

          <section>
            <h2>10. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. We will notify you of material changes by posting the updated policy on this page and updating the &quot;Last updated&quot; date. Your continued use of Atlas after changes are posted constitutes acceptance of the revised policy.
            </p>
          </section>

          <section>
            <h2>11. Contact Us</h2>
            <p>
              If you have questions about this Privacy Policy or your personal data, contact us at:<br />
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
