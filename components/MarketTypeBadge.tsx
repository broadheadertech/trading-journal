'use client';

import { marketMeta } from '@/lib/market-types';
import type { MarketType } from '@/lib/types';

interface Props {
  type?: MarketType | null;
  size?: 'xs' | 'sm';
  showLabel?: boolean;
}

export default function MarketTypeBadge({ type, size = 'xs', showLabel = true }: Props) {
  if (!type) return null;
  const m = marketMeta(type);

  const sizeCls = size === 'xs'
    ? 'text-[9px] px-1.5 py-0.5 gap-1'
    : 'text-[10px] px-2 py-0.5 gap-1';

  return (
    <span
      className={`inline-flex items-center rounded-full font-bold uppercase tracking-wider ${m.colorClass} ${sizeCls}`}
      title={m.label}
    >
      <span className="text-xs leading-none">{m.icon}</span>
      {showLabel && m.shortLabel}
    </span>
  );
}
