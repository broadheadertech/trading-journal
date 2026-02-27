'use client';

import { useState } from 'react';
import { BarChart3, CheckCircle, AlertTriangle } from 'lucide-react';
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

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
      <div className="flex items-center gap-2 mb-3">
        <div className="p-1.5 rounded-lg bg-[var(--accent)]/10">
          <BarChart3 size={16} className="text-[var(--accent)]" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-[var(--foreground)]">Plan Usage</h3>
          <p className="text-[10px] text-[var(--muted-foreground)] capitalize">{tierName} tier</p>
        </div>
      </div>

      {anyUnlimited ? (
        <div className="flex items-center gap-2 py-2">
          <CheckCircle size={16} className="text-[var(--green)]" />
          <span className="text-sm text-[var(--green)] font-medium">Unlimited usage</span>
        </div>
      ) : (
        <div className="space-y-3">
          <UsageBar label="Trades" current={trades.current} max={trades.max} isUnlimited={trades.isUnlimited} />
          <UsageBar label="Strategies" current={strategies.current} max={strategies.max} isUnlimited={strategies.isUnlimited} />

          {anyAtLimit && (
            <div className="flex items-center gap-2 pt-1">
              <AlertTriangle size={14} className="text-[var(--red)] shrink-0" />
              <p className="text-xs text-[var(--red)]">
                Limit reached &mdash; upgrade to add more
              </p>
            </div>
          )}
          {anyNearLimit && !anyAtLimit && (
            <div className="flex items-center gap-2 pt-1">
              <AlertTriangle size={14} className="text-[var(--yellow)] shrink-0" />
              <p className="text-xs text-[var(--yellow)]">
                Running low &mdash; upgrade for more
              </p>
            </div>
          )}

          <button
            onClick={() => setPricingOpen(true)}
            className="w-full py-2 rounded-lg bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-xs font-medium transition-colors"
          >
            {anyAtLimit ? 'Upgrade Now' : 'View Plans'}
          </button>
        </div>
      )}

      <PricingPlans open={pricingOpen} onClose={() => setPricingOpen(false)} />
    </div>
  );
}
