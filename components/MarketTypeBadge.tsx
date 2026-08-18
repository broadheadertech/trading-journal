'use client';

import { marketMeta } from '@/lib/market-types';
import type { MarketType } from '@/lib/types';

interface Props {
  type?: MarketType | null;
  size?: 'xs' | 'sm';
  showLabel?: boolean;
}

// ATLAS accent per asset class (replaces the legacy Tailwind colorClass palette).
const ACCENT: Record<MarketType, string> = {
  crypto: 'var(--amber)',
  stocks: 'var(--teal)',
  forex: 'var(--green)',
  metals: '#f0a409',
  oil: 'var(--muted)',
};

export default function MarketTypeBadge({ type, size = 'xs', showLabel = true }: Props) {
  if (!type) return null;
  const m = marketMeta(type);

  const isXs = size === 'xs';
  const color = ACCENT[m.id] ?? 'var(--muted)';

  return (
    <span
      className="chip"
      style={{
        height: isXs ? 18 : 20,
        padding: isXs ? '0 6px' : '0 8px',
        gap: 4,
        borderRadius: 2,
        borderColor: color,
        background: 'var(--panel-2)',
        color,
        fontWeight: 700,
        fontSize: isXs ? 9 : 10,
        letterSpacing: '.06em',
        textTransform: 'uppercase',
        lineHeight: 1,
        verticalAlign: 'middle',
      }}
      title={m.label}
    >
      <span style={{ fontSize: isXs ? 10 : 11, lineHeight: 1 }}>{m.icon}</span>
      {showLabel && m.shortLabel}
    </span>
  );
}
