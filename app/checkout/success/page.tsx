'use client';

import { Suspense, useEffect, useState } from 'react';
import { useQuery } from 'convex/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '@/convex/_generated/api';
import { CheckCircle2, Loader2 } from 'lucide-react';

// Stripe redirects here after a completed Checkout Session. The webhook
// (handled by /api/stripe/webhook) writes the userSubscription row a moment
// later. We poll Convex's live query and show a "processing" state until the
// subscription flips to active, then auto-redirect into the app.
//
// PayMongo follows the same flow (?provider=paymongo) — its webhook is what
// actually flips the row, so the same wait-and-redirect UX works for both.

// Top-level export wraps the body in <Suspense> because useSearchParams()
// triggers a CSR bailout that Next.js 16 refuses to prerender without one.
export default function CheckoutSuccessPage() {
  return (
    <Suspense fallback={<CheckoutSuccessFallback />}>
      <CheckoutSuccessInner />
    </Suspense>
  );
}

function CheckoutSuccessFallback() {
  return (
    <div className="atlas-site" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Loader2 size={26} className="animate-spin" style={{ color: 'var(--amber)' }} />
    </div>
  );
}

function CheckoutSuccessInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const provider = searchParams.get('provider') === 'paymongo' ? 'paymongo' : 'stripe';
  const subscription = useQuery(api.subscriptions.getUserSubscription);

  const [secondsWaited, setSecondsWaited] = useState(0);

  // Tick a second-counter so the UI can surface a "this is taking longer than usual" hint.
  useEffect(() => {
    const id = window.setInterval(() => setSecondsWaited(s => s + 1), 1000);
    return () => window.clearInterval(id);
  }, []);

  const isPaidActive =
    subscription &&
    subscription.planId !== 'free' &&
    (subscription.status === 'active' || subscription.status === 'trialing');

  // Auto-redirect into the app once the webhook lands the subscription.
  useEffect(() => {
    if (!isPaidActive) return;
    const id = window.setTimeout(() => router.replace('/app'), 1800);
    return () => window.clearTimeout(id);
  }, [isPaidActive, router]);

  return (
    <div className="atlas-site" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '64px 20px' }}>
      <div className="card-solid" style={{ width: '100%', maxWidth: '480px', padding: '38px 36px', textAlign: 'center', position: 'relative' }}>
        <span style={{ position: 'absolute', left: 0, top: '-1px', width: '120px', height: '2px', background: isPaidActive ? 'var(--teal)' : 'var(--amber)' }} />
        {isPaidActive ? (
          <>
            <div style={{ margin: '0 auto 20px', width: '52px', height: '52px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(47,211,196,.35)', borderRadius: '3px', background: 'rgba(47,211,196,.08)' }}>
              <CheckCircle2 size={24} style={{ color: 'var(--teal)' }} />
            </div>
            <p className="eyebrow" style={{ margin: '0 0 12px' }}>PAYMENT CONFIRMED</p>
            <h1 style={{ fontFamily: 'var(--display)', fontWeight: 600, fontSize: '30px', lineHeight: '34px', color: 'var(--text)', margin: 0 }}>You&rsquo;re in.</h1>
            <p style={{ margin: '14px 0 0', fontSize: '14px', lineHeight: '22px', color: 'var(--atlas-muted)' }}>
              Your <span style={{ color: 'var(--amber)', fontWeight: 700, textTransform: 'capitalize' }}>{subscription?.planId}</span> subscription
              is active. Redirecting you to the app…
            </p>
            <button
              onClick={() => router.replace('/app')}
              className="btn btn-amber"
              style={{ width: '100%', marginTop: '28px' }}
            >
              Open the app
              <svg className="arrow-r" viewBox="0 0 12 9" fill="none"><path d="M0 4.5 H12 M12 4.5 L7 0 M12 4.5 L7 9" stroke="#0a0a0a" strokeWidth="1.7" strokeLinecap="round" /></svg>
            </button>
          </>
        ) : (
          <>
            <div style={{ margin: '0 auto 20px', width: '52px', height: '52px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(217,148,5,.35)', borderRadius: '3px', background: 'rgba(217,148,5,.08)' }}>
              <Loader2 size={24} className="animate-spin" style={{ color: 'var(--amber)' }} />
            </div>
            <p className="eyebrow" style={{ margin: '0 0 12px' }}>AWAITING WEBHOOK</p>
            <h1 style={{ fontFamily: 'var(--display)', fontWeight: 600, fontSize: '30px', lineHeight: '34px', color: 'var(--text)', margin: 0 }}>Confirming your payment…</h1>
            <p style={{ margin: '14px 0 0', fontSize: '14px', lineHeight: '22px', color: 'var(--atlas-muted)' }}>
              {provider === 'stripe' ? 'Stripe' : 'PayMongo'} has accepted your payment. We&rsquo;re waiting on the
              confirmation webhook to upgrade your account — this usually takes a few seconds.
            </p>
            {secondsWaited > 20 && (
              <p style={{ margin: '20px 0 0', padding: '10px 14px', fontSize: '12.5px', lineHeight: '19px', color: 'var(--amber)', background: 'rgba(217,148,5,.07)', border: '1px solid rgba(217,148,5,.28)', borderRadius: '2px', textAlign: 'left' }}>
                Taking longer than expected. Your subscription is safe — try refreshing in a moment, or
                head into the app and it&rsquo;ll catch up automatically.
              </p>
            )}
            <button
              onClick={() => router.replace('/app')}
              className="btn btn-ghost"
              style={{ width: '100%', marginTop: '28px' }}
            >
              Go to the app
            </button>
          </>
        )}
      </div>
    </div>
  );
}
