// Shared config for asset class / market type â€” used across forms, journal,
// analytics, dashboard, etc. so visual distinction stays consistent.

import type { MarketType } from './types';

export interface MarketTypeMeta {
  id: MarketType;
  label: string;
  shortLabel: string;
  icon: string;          // emoji for now
  colorClass: string;    // bg-X/Y text-X classes for badges
  ringClass: string;     // border accent
  gradient: string;      // for hero cards / icon tiles
}

export const MARKET_TYPES: Record<MarketType, MarketTypeMeta> = {
  crypto: {
    id: 'crypto',
    label: 'Crypto',
    shortLabel: 'CRY',
    icon: 'â‚¿',
    colorClass: 'bg-amber-500/15 text-amber-400',
    ringClass: 'border-amber-500/30',
    gradient: 'from-amber-500/30 to-orange-500/10',
  },
  stocks: {
    id: 'stocks',
    label: 'Stocks',
    shortLabel: 'STK',
    icon: 'ðŸ“ˆ',
    colorClass: 'bg-blue-500/15 text-blue-400',
    ringClass: 'border-blue-500/30',
    gradient: 'from-blue-500/30 to-sky-500/10',
  },
  forex: {
    id: 'forex',
    label: 'Forex',
    shortLabel: 'FX',
    icon: 'ðŸ’±',
    colorClass: 'bg-emerald-500/15 text-emerald-400',
    ringClass: 'border-emerald-500/30',
    gradient: 'from-emerald-500/30 to-pink-500/10',
  },
  metals: {
    id: 'metals',
    label: 'Metals',
    shortLabel: 'MET',
    icon: 'ðŸ¥‡',
    colorClass: 'bg-yellow-500/15 text-yellow-400',
    ringClass: 'border-yellow-500/30',
    gradient: 'from-yellow-500/30 to-amber-600/10',
  },
  oil: {
    id: 'oil',
    label: 'Oil',
    shortLabel: 'OIL',
    icon: 'ðŸ›¢ï¸',
    colorClass: 'bg-slate-500/15 text-slate-400',
    ringClass: 'border-slate-500/30',
    gradient: 'from-slate-500/30 to-zinc-700/10',
  },
};

export const MARKET_TYPE_LIST: MarketType[] = ['crypto', 'stocks', 'forex', 'metals', 'oil'];

export function marketMeta(type: MarketType | null | undefined): MarketTypeMeta {
  return MARKET_TYPES[type ?? 'crypto'] ?? MARKET_TYPES.crypto;
}
