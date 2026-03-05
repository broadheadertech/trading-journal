'use client';

import { useSubscription } from '@/hooks/useSubscription';

export default function SubscriptionBadge() {
  const { planId, isActive, isLoading } = useSubscription();

  if (isLoading) return null;

  const label = planId === 'free' ? 'Free' : planId.charAt(0).toUpperCase() + planId.slice(1);
  const isFreeTier = planId === 'free' || !isActive;
  const isLegend = planId === 'legend' && isActive;

  return (
    <span
      className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold leading-none ${
        isLegend
          ? 'bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-400'
          : isFreeTier
            ? 'bg-[var(--muted)] text-[var(--muted-foreground)]'
            : 'bg-[var(--accent)]/15 text-[var(--accent)]'
      }`}
    >
      {isFreeTier ? 'Free' : label}
    </span>
  );
}
