'use client';

import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { Clock, X, AlertTriangle } from 'lucide-react';

/**
 * Thin status banner shown at the top of the app when the signed-in user has a
 * recent manual QR payment. Pending → "under review" (persistent, informative);
 * rejected → dismissable warning with the admin's reason. Approved submissions
 * show nothing here — the user already got the plan + a notification.
 */
export default function QrPaymentStatusBanner() {
  const submissions = useQuery(api.qrPayments.getMySubmissions);
  const [dismissedId, setDismissedId] = useLocalStorage<string | null>('qr-payment-banner-dismissed', null);

  if (!submissions || submissions.length === 0) return null;
  const latest = submissions[0]; // getMySubmissions returns newest-first

  if (latest.status === 'pending') {
    return (
      <div className="mb-4 flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3">
        <Clock size={16} className="mt-0.5 shrink-0 text-amber-400" />
        <div className="text-sm text-[var(--foreground)]">
          <span className="font-semibold">Payment under review.</span>{' '}
          <span className="text-[var(--muted-foreground)]">
            We&rsquo;re verifying your {latest.planName ?? latest.planId} payment
            {latest.referenceId ? <> (ref <span className="font-mono">{latest.referenceId}</span>)</> : null}. Your plan
            activates once it&rsquo;s approved — you&rsquo;ll get a notification.
          </span>
        </div>
      </div>
    );
  }

  if (latest.status === 'rejected' && dismissedId !== latest._id) {
    return (
      <div className="mb-4 flex items-start gap-3 rounded-xl border border-[var(--red)]/30 bg-[var(--red)]/10 px-4 py-3">
        <AlertTriangle size={16} className="mt-0.5 shrink-0 text-[var(--red)]" />
        <div className="flex-1 text-sm text-[var(--foreground)]">
          <span className="font-semibold">Payment couldn&rsquo;t be verified.</span>{' '}
          <span className="text-[var(--muted-foreground)]">
            {latest.reviewNote?.trim()
              ? latest.reviewNote.trim()
              : 'Please double-check your reference ID and re-submit, or contact support.'}
          </span>
        </div>
        <button
          onClick={() => setDismissedId(latest._id)}
          className="shrink-0 p-1 rounded-lg hover:bg-[var(--muted)] transition-colors"
          aria-label="Dismiss"
        >
          <X size={14} className="text-[var(--muted-foreground)]" />
        </button>
      </div>
    );
  }

  return null;
}
