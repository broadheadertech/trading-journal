'use client';

import { Sparkle, Lightning, Star } from '@phosphor-icons/react';

export type TierName = 'free' | 'core' | 'pro' | 'elite';

interface Props {
  tier?: string | null;
  size?: 'xs' | 'sm';
}

const TIERS: Record<TierName, {
  label: string;
  color: string;
  icon: React.ReactNode;
}> = {
  free: {
    label: 'Free',
    color: 'var(--muted-2)',
    icon: null,
  },
  core: {
    label: 'Core',
    color: 'var(--amber)',
    icon: <Sparkle size={9} weight="bold" />,
  },
  pro: {
    label: 'Pro',
    color: 'var(--amber)',
    icon: <Lightning size={9} weight="bold" />,
  },
  elite: {
    label: 'Elite',
    color: 'var(--amber)',
    icon: <Star size={9} weight="bold" />,
  },
};

export default function TierBadge({ tier, size = 'xs' }: Props) {
  if (!tier || tier === 'free') return null;

  const t = TIERS[tier as TierName];
  if (!t) return null;

  const isXs = size === 'xs';

  return (
    <span
      className="chip"
      style={{
        height: isXs ? 18 : 20,
        padding: isXs ? '0 7px' : '0 9px',
        gap: isXs ? 4 : 5,
        borderRadius: 2,
        borderColor: t.color,
        background: 'var(--panel-2)',
        color: t.color,
        fontWeight: 700,
        fontSize: isXs ? 9 : 10,
        letterSpacing: '.06em',
        textTransform: 'uppercase',
        lineHeight: 1,
        verticalAlign: 'middle',
      }}
      title={`${t.label} subscriber`}
    >
      {t.icon}
      {t.label}
    </span>
  );
}
