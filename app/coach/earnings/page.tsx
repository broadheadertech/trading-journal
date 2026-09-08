'use client';

import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { CurrencyDollar as DollarSign, TrendUp as TrendingUp, Wallet, Receipt } from '@phosphor-icons/react';

export default function CoachEarningsPage() {
  const profile = useQuery(api.coaches.getMyCoachProfile);
  const sessions = useQuery(api.coachSessions.myCoachSessions) ?? [];

  if (!profile) return null;

  const completed = sessions.filter((s: any) => s.status === 'completed');
  const pending = sessions.filter((s: any) => s.status === 'confirmed' || s.status === 'in_progress');
  const lifetimeEarnings = profile.totalEarningsUsd ?? 0;
  const pendingEarnings = pending.reduce((sum: number, s: any) => sum + s.coachPayoutUsd, 0);

  return (
    <div style={{ maxWidth: 900 }}>
      <div className="phead pwrap">
        <p className="eyebrow">
          <Wallet size={13} style={{ color: 'var(--amber)' }} /> PAYOUTS
        </p>
        <h2>Earnings</h2>
        <p className="sub">Live payout totals from your completed and upcoming coaching sessions.</p>
      </div>

      <div className="stats" style={{ gridTemplateColumns: 'repeat(3,1fr)', marginTop: 0 }}>
        <div className="stat">
          <span className="accent" style={{ background: 'var(--green)' }} />
          <b style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Wallet size={11} /> LIFETIME PAYOUTS</b>
          <em style={{ color: 'var(--text)' }}>${lifetimeEarnings.toFixed(2)}</em>
        </div>
        <div className="stat">
          <span className="accent" style={{ background: 'var(--amber)' }} />
          <b style={{ display: 'flex', alignItems: 'center', gap: 6 }}><TrendingUp size={11} /> PENDING</b>
          <em style={{ color: 'var(--green)' }}>${pendingEarnings.toFixed(2)}</em>
        </div>
        <div className="stat">
          <span className="accent" style={{ background: 'var(--amber)' }} />
          <b style={{ display: 'flex', alignItems: 'center', gap: 6 }}><DollarSign size={11} /> SESSIONS DONE</b>
          <em style={{ color: 'var(--text)' }}>{completed.length}</em>
        </div>
      </div>

      <div className="card pwrap" style={{ marginTop: 24 }}>
        <span className="accent" style={{ width: 56, background: 'var(--amber)' }} />
        <div className="cardhead">
          <div>
            <h3>Transaction history</h3>
            <p className="sub">Released payouts, newest first.</p>
          </div>
          {completed.length > 0 && (
            <span className="chip" style={{ marginLeft: 'auto' }}>
              {completed.length} payout{completed.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {completed.length === 0 ? (
          <p className="empty-line">No payouts yet.</p>
        ) : (
          <div style={{ marginTop: 18 }}>
            {completed.map((s: any) => (
              <div key={s.id} className="mrow">
                <Receipt size={16} className="ic" />
                <span className="lb">
                  <span style={{ display: 'block', color: 'var(--text)', fontWeight: 700 }}>{s.clientName}</span>
                  <span style={{ display: 'block', fontSize: 11, color: 'var(--muted-2)', marginTop: 3 }}>
                    {new Date(s.completedAt ?? s.startsAt).toLocaleDateString()}
                  </span>
                </span>
                <span className="val" style={{ textAlign: 'right' }}>
                  <span style={{ display: 'block', color: 'var(--green)' }}>+${s.coachPayoutUsd.toFixed(2)}</span>
                  <span style={{ display: 'block', fontSize: 10, color: 'var(--muted-2)', marginTop: 3 }}>
                    ${s.pricePaidUsd} − ${s.platformFeeUsd} fee
                  </span>
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="note" style={{ height: 'auto', padding: '13px 18px', lineHeight: '19px' }}>
        Stub mode: payouts are recorded automatically on completion. Real Stripe Connect transfers will be wired in later.
      </div>
    </div>
  );
}
