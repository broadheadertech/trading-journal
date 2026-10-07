import Link from 'next/link';
import LandingNav from '@/components/landing/LandingNav';
import Footer from '@/components/landing/Footer';
import { SUBSCRIPTION_AGREEMENT_VERSION } from '@/lib/agreement';

export const metadata = {
  title: 'Subscription Agreement - Atlas',
  description: 'Atlas Subscription Agreement — billing, renewal, manual QR payment verification, cancellation and refunds.',
};

// Scoped typography for the legal document — matches /terms and /privacy.
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

export default function SubscriptionAgreementPage() {
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

          <h1>Subscription Agreement</h1>
          <p className="legal-meta">Version {SUBSCRIPTION_AGREEMENT_VERSION}</p>

          <div className="legal-body">
            <section>
              <h2>1. Agreement</h2>
              <p>
                This Subscription Agreement (&quot;Agreement&quot;) governs your purchase of a paid Atlas plan. It supplements,
                and is part of, our <Link href="/terms">Terms of Service</Link> and <Link href="/privacy">Privacy Policy</Link>.
                By subscribing — whether by card, e-wallet, or manual QR payment — you confirm you have read, understood, and
                agree to be bound by this Agreement. If you do not agree, do not subscribe.
              </p>
            </section>

            <section>
              <h2>2. Plans &amp; Pricing</h2>
              <ul>
                <li><strong>Tiers.</strong> Paid plans (Core, Pro, Elite) unlock the features listed for each tier at the price shown at checkout, billed monthly or yearly.</li>
                <li><strong>Currency.</strong> Prices are charged in the currency shown for your chosen payment method; taxes and processor fees may apply.</li>
                <li><strong>Changes.</strong> We may change prices or plan contents. Changes take effect at your next renewal, and we will give reasonable notice before they apply to you.</li>
              </ul>
            </section>

            <section>
              <h2>3. Billing &amp; Auto-Renewal (Card / E-Wallet)</h2>
              <ul>
                <li>Card (Stripe) and e-wallet (PayMongo) subscriptions are billed in advance and <strong>auto-renew</strong> each period until cancelled.</li>
                <li>By subscribing you authorize us and our payment processors to charge your payment method for each renewal at the then-current price.</li>
                <li>If a renewal payment fails, your plan may be downgraded or suspended until payment succeeds.</li>
              </ul>
            </section>

            <section>
              <h2>4. Manual QR Payments</h2>
              <p>Where you pay by scanning a QR code (e.g. GCash, Maya, bank/QRPH, or crypto) and uploading proof, the following apply:</p>
              <ul>
                <li><strong>Manual verification.</strong> Your plan is <strong>not</strong> active until our team manually verifies your payment against the reference ID and screenshot you submit. Verification is typically completed within a few hours but is not guaranteed to be instant.</li>
                <li><strong>Accurate proof.</strong> You must submit a genuine, unaltered screenshot and the correct reference ID. Submitting false, altered, or third-party payment proof is grounds for rejection and account action.</li>
                <li><strong>No auto-renewal.</strong> QR subscriptions do <strong>not</strong> auto-renew. Access runs for the period you paid for; to continue, you submit a new payment for the next period.</li>
                <li><strong>Rejected payments.</strong> If we cannot verify a payment, your plan will not activate and you will be notified. Funds sent to an incorrect destination are your responsibility.</li>
              </ul>
            </section>

            <section>
              <h2>5. Cancellation</h2>
              <ul>
                <li>You may cancel an auto-renewing subscription at any time; cancellation stops future renewals and takes effect at the end of the current paid period. You keep access until then.</li>
                <li>Manual QR subscriptions simply lapse at the end of the paid period if you do not renew.</li>
              </ul>
            </section>

            <section>
              <h2>6. Refunds</h2>
              <p>
                Payments are generally non-refundable except where required by law. Partial periods, unused time, and
                change-of-mind are not refundable. Refunds, when granted, are handled case-by-case — contact support with your
                reference details. For manual QR payments, any approved refund is returned to the originating account where
                feasible.
              </p>
            </section>

            <section>
              <h2>7. Chargebacks</h2>
              <p>
                If you initiate a chargeback or payment dispute without first contacting support to resolve the issue, we may
                suspend or terminate your access pending resolution. Fraudulent disputes may result in permanent account closure.
              </p>
            </section>

            <section>
              <h2>8. Not Financial Advice</h2>
              <p>
                Atlas is a journaling, analytics and education platform. Nothing in a paid plan constitutes financial, investment,
                or trading advice, and no outcome is guaranteed. You are solely responsible for your trading decisions.
              </p>
            </section>

            <section>
              <h2>9. Record of Consent</h2>
              <p>
                When you accept this Agreement at checkout, we record the fact of your acceptance, the version accepted, and the
                date and time, as described in our <Link href="/privacy">Privacy Policy</Link>.
              </p>
            </section>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
