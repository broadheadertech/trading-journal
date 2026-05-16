'use client';

import { useRouter } from 'next/navigation';
import { XCircle } from 'lucide-react';

export default function CheckoutCanceledPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--background)] px-4">
      <div className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--card)] p-8 text-center shadow-xl">
        <div className="mx-auto mb-4 inline-flex w-14 h-14 items-center justify-center rounded-full bg-[var(--muted)]/40 border border-[var(--border)]">
          <XCircle size={28} className="text-[var(--muted-foreground)]" />
        </div>
        <h1 className="text-2xl font-bold text-[var(--foreground)]">Checkout canceled</h1>
        <p className="mt-2 text-sm text-[var(--muted-foreground)]">
          No charge was made. You can pick a plan again any time from the pricing page.
        </p>
        <div className="mt-6 flex flex-col gap-2">
          <button
            onClick={() => router.replace('/pricing')}
            className="w-full py-2.5 rounded-xl text-sm font-semibold text-slate-900 bg-gradient-to-r from-orange-400 to-amber-400 hover:from-orange-300 hover:to-amber-300 transition-all"
          >
            Back to pricing
          </button>
          <button
            onClick={() => router.replace('/app')}
            className="w-full py-2.5 rounded-xl text-sm font-medium border border-[var(--border)] bg-[var(--card)] hover:bg-[var(--muted)]/50 transition-colors text-[var(--foreground)]"
          >
            Continue on the free plan
          </button>
        </div>
      </div>
    </div>
  );
}
