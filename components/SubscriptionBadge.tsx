'use client';

import { useSubscription } from '@/hooks/useSubscription';

// Tier accent map — must stay in sync with components/TierBadge.tsx.
const TIER_COLOR: Record<string, string> = {
  free: 'var(--muted-2)',
  core: 'var(--amber)',
  pro: 'var(--amber)',
  elite: 'var(--amber)',
};

export default function SubscriptionBadge({ onClick }: { onClick?: () => void }) {
  const { planId, isActive, isLoading } = useSubscription();

  if (isLoading) return null;

  const label = planId === 'free' ? 'Free' : planId.charAt(0).toUpperCase() + planId.slice(1);
  const isFreeTier = planId === 'free' || !isActive;

  const color = isFreeTier ? TIER_COLOR.free : (TIER_COLOR[planId] ?? TIER_COLOR.free);

  return (
    <span
      className="chip"
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } } : undefined}
      title={onClick ? (isFreeTier ? 'Upgrade your plan' : 'Manage subscription') : undefined}
      style={{
        height: 18,
        padding: '0 7px',
        borderRadius: 2,
        borderColor: color,
        background: 'var(--panel-2)',
        color,
        fontWeight: 700,
        fontSize: 9,
        letterSpacing: '.06em',
        textTransform: 'uppercase',
        lineHeight: 1,
        verticalAlign: 'middle',
        cursor: onClick ? 'pointer' : undefined,
      }}
    >
      {isFreeTier ? 'Free' : label}
    </span>
  );
}
