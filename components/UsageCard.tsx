'use client';

import { useState } from 'react';
import { ChartBar as BarChart3, CheckCircle, Warning as AlertTriangle } from '@phosphor-icons/react';
import UsageBar from './UsageBar';
import PricingPlans from './PricingPlans';

interface UsageStat {
  current: number;
  max: number;
  percentage: number;
  isUnlimited: boolean;
  isNearLimit: boolean;
  isAtLimit: boolean;
}

interface UsageCardProps {
  trades: UsageStat;
  strategies: UsageStat;
  tierName: string;
}

export default function UsageCard({ trades, strategies, tierName }: UsageCardProps) {
  const [pricingOpen, setPricingOpen] = useState(false);

  const anyUnlimited = trades.isUnlimited && strategies.isUnlimited;
  const anyNearLimit = trades.isNearLimit || strategies.isNearLimit;
  const anyAtLimit = trades.isAtLimit || strategies.isAtLimit;

  const accent = anyAtLimit ? 'var(--red)' : anyNearLimit ? 'var(--amber)' : 'var(--green)';

  return (
    <div className="card" style={{ padding: '18px 20px 20px' }}>
      <span className="accent" style={{ width: 44, background: accent }} />

      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span
          className="inset"
          style={{
            width: 32, height: 32, padding: 0, flex: 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            borderRadius: 3,
          }}
        >
          <BarChart3 size={15} style={{ color: accent }} />
        </span>
        <div style={{ minWidth: 0 }}>
          <h4>Plan Usage</h4>
          <p className="lbl" style={{ marginTop: 6, textTransform: 'uppercase' }}>{tierName} TIER</p>
        </div>
      </div>

      {anyUnlimited ? (
        <div
          className="inset"
          style={{ display: 'flex', alignItems: 'center', gap: 9, marginTop: 16 }}
        >
          <CheckCircle size={14} style={{ color: 'var(--green)', flex: 'none' }} />
          <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--green)' }}>Unlimited usage</span>
        </div>
      ) : (
        <div style={{ marginTop: 18 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <UsageBar label="Trades" current={trades.current} max={trades.max} isUnlimited={trades.isUnlimited} />
            <UsageBar label="Strategies" current={strategies.current} max={strategies.max} isUnlimited={strategies.isUnlimited} />
          </div>

          {anyAtLimit && (
            <div
              className="note"
              style={{
                height: 'auto', minHeight: 38, marginTop: 16, gap: 9,
                borderLeft: '2px solid var(--red)', padding: '10px 14px',
                fontSize: 11.5, color: 'var(--red)',
              }}
            >
              <AlertTriangle size={13} style={{ flex: 'none' }} />
              Limit reached &mdash; upgrade to add more
            </div>
          )}
          {anyNearLimit && !anyAtLimit && (
            <div
              className="note"
              style={{
                height: 'auto', minHeight: 38, marginTop: 16, gap: 9,
                borderLeft: '2px solid var(--amber)', padding: '10px 14px',
                fontSize: 11.5, color: 'var(--amber)',
              }}
            >
              <AlertTriangle size={13} style={{ flex: 'none' }} />
              Running low &mdash; upgrade for more
            </div>
          )}

          <button
            onClick={() => setPricingOpen(true)}
            className="btn-a"
            style={{ width: '100%', height: 36, marginTop: 16, fontSize: 12 }}
          >
            {anyAtLimit ? 'Upgrade Now' : 'View Plans'}
          </button>
        </div>
      )}

      <PricingPlans open={pricingOpen} onClose={() => setPricingOpen(false)} />
    </div>
  );
}
