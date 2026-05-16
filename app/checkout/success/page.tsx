'use client';

import { useEffect, useState } from 'react';
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
export default function CheckoutSuccessPage() {
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
    <div className="min-h-screen flex items-center justify-center bg-[var(--background)] px-4">
      <div className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--card)] p-8 text-center shadow-xl">
        {isPaidActive ? (
          <>
            <div className="mx-auto mb-4 inline-flex w-14 h-14 items-center justify-center rounded-full bg-emerald-500/15 border border-emerald-500/40">
              <CheckCircle2 size={28} className="text-emerald-400" />
            </div>
            <h1 className="text-2xl font-bold text-[var(--foreground)]">You're in.</h1>
            <p className="mt-2 text-sm text-[var(--muted-foreground)]">
              Your <span className="font-semibold text-[var(--foreground)] capitalize">{subscription?.planId}</span> subscription
              is active. Redirecting you to the app…
            </p>
            <button
              onClick={() => router.replace('/app')}
              className="mt-6 w-full py-2.5 rounded-xl text-sm font-semibold text-slate-900 bg-gradient-to-r from-orange-400 to-amber-400 hover:from-orange-300 hover:to-amber-300 transition-all"
            >
              Open the app
            </button>
          </>
        ) : (
          <>
            <div className="mx-auto mb-4 inline-flex w-14 h-14 items-center justify-center rounded-full bg-pink-500/15 border border-pink-500/40">
              <Loader2 size={28} className="text-pink-400 animate-spin" />
            </div>
            <h1 className="text-2xl font-bold text-[var(--foreground)]">Confirming your payment…</h1>
            <p className="mt-2 text-sm text-[var(--muted-foreground)]">
              {provider === 'stripe' ? 'Stripe' : 'PayMongo'} has accepted your payment. We're waiting on the
              confirmation webhook to upgrade your account — this usually takes a few seconds.
            </p>
            {secondsWaited > 20 && (
              <p className="mt-4 text-xs text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded px-3 py-2">
                Taking longer than expected. Your subscription is safe — try refreshing in a moment, or
                head into the app and it'll catch up automatically.
              </p>
            )}
            <div className="mt-6 flex flex-col gap-2">
              <button
                onClick={() => router.replace('/app')}
                className="w-full py-2.5 rounded-xl text-sm font-medium border border-[var(--border)] bg-[var(--card)] hover:bg-[var(--muted)]/50 transition-colors text-[var(--foreground)]"
              >
                Go to the app
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
