'use client';

import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { DollarSign, TrendingUp, Wallet } from 'lucide-react';

export default function CoachEarningsPage() {
  const profile = useQuery(api.coaches.getMyCoachProfile);
  const sessions = useQuery(api.coachSessions.myCoachSessions) ?? [];

  if (!profile) return null;

  const completed = sessions.filter((s: any) => s.status === 'completed');
  const pending = sessions.filter((s: any) => s.status === 'confirmed' || s.status === 'in_progress');
  const lifetimeEarnings = profile.totalEarningsUsd ?? 0;
  const pendingEarnings = pending.reduce((sum: number, s: any) => sum + s.coachPayoutUsd, 0);

  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="text-3xl font-bold tracking-tight text-[var(--foreground)]">Earnings</h1>

      <div className="grid grid-cols-3 gap-4">
        <div className="glass rounded-2xl p-5">
          <div className="text-xs text-[var(--muted-foreground)] flex items-center gap-1 mb-1"><Wallet size={12} /> Lifetime payouts</div>
          <div className="text-3xl font-bold text-[var(--foreground)]">${lifetimeEarnings.toFixed(2)}</div>
        </div>
        <div className="glass rounded-2xl p-5">
          <div className="text-xs text-[var(--muted-foreground)] flex items-center gap-1 mb-1"><TrendingUp size={12} /> Pending</div>
          <div className="text-3xl font-bold text-amber-400">${pendingEarnings.toFixed(2)}</div>
        </div>
        <div className="glass rounded-2xl p-5">
          <div className="text-xs text-[var(--muted-foreground)] flex items-center gap-1 mb-1"><DollarSign size={12} /> Sessions done</div>
          <div className="text-3xl font-bold text-[var(--foreground)]">{completed.length}</div>
        </div>
      </div>

      <div className="glass rounded-3xl p-6">
        <h2 className="font-bold text-[var(--foreground)] mb-3">Transaction history</h2>
        {completed.length === 0 ? (
          <p className="text-sm text-[var(--muted-foreground)]">No payouts yet.</p>
        ) : (
          <div className="space-y-2">
            {completed.map((s: any) => (
              <div key={s.id} className="flex items-center justify-between text-sm border-b border-[var(--border)] last:border-0 py-2">
                <div>
                  <div className="font-medium text-[var(--foreground)]">{s.clientName}</div>
                  <div className="text-xs text-[var(--muted-foreground)]">{new Date(s.completedAt ?? s.startsAt).toLocaleDateString()}</div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-emerald-400">+${s.coachPayoutUsd.toFixed(2)}</div>
                  <div className="text-[10px] text-[var(--muted-foreground)]">${s.pricePaidUsd} − ${s.platformFeeUsd} fee</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <p className="text-xs text-[var(--muted-foreground)]">
        Stub mode: payouts are recorded automatically on completion. Real Stripe Connect transfers will be wired in later.
      </p>
    </div>
  );
}
