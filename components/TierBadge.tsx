'use client';

import { Crown, Sparkles, Zap, Star, Gem } from 'lucide-react';

export type TierName = 'free' | 'essential' | 'pro' | 'elite' | 'legend';

interface Props {
  tier?: string | null;
  size?: 'xs' | 'sm';
}

const TIERS: Record<TierName, {
  label: string;
  gradient: string;
  text: string;
  icon: React.ReactNode;
  shimmer: boolean;
}> = {
  free: {
    label: 'Free',
    gradient: 'from-slate-600 to-slate-700',
    text: 'text-slate-300',
    icon: null,
    shimmer: false,
  },
  essential: {
    label: 'Essential',
    gradient: 'from-emerald-500 to-teal-600',
    text: 'text-white',
    icon: <Sparkles size={9} strokeWidth={3} />,
    shimmer: false,
  },
  pro: {
    label: 'Pro',
    gradient: 'from-teal-500 to-teal-700',
    text: 'text-white',
    icon: <Zap size={9} strokeWidth={3} />,
    shimmer: true,
  },
  elite: {
    label: 'Elite',
    gradient: 'from-amber-400 via-orange-500 to-pink-500',
    text: 'text-white',
    icon: <Star size={9} strokeWidth={3} />,
    shimmer: true,
  },
  legend: {
    label: 'Legend',
    gradient: 'from-cyan-300 via-teal-400 to-emerald-400',
    text: 'text-white',
    icon: <Crown size={9} strokeWidth={3} />,
    shimmer: true,
  },
};

export default function TierBadge({ tier, size = 'xs' }: Props) {
  if (!tier || tier === 'free') return null;

  const t = TIERS[tier as TierName];
  if (!t) return null;

  const sizeCls = size === 'xs'
    ? 'text-[9px] px-1.5 py-0.5 gap-0.5'
    : 'text-[10px] px-2 py-0.5 gap-1';

  return (
    <span
      className={`relative inline-flex items-center rounded-full font-bold uppercase tracking-wider bg-gradient-to-r ${t.gradient} ${t.text} ${sizeCls} shadow-sm overflow-hidden`}
      title={`${t.label} subscriber`}
    >
      {t.shimmer && (
        <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/30 to-transparent animate-[shimmer_2.5s_ease-in-out_infinite]" />
      )}
      <span className="relative flex items-center gap-0.5">
        {t.icon}
        {t.label}
      </span>

      <style jsx>{`
        @keyframes shimmer {
          0%   { transform: translateX(-100%); }
          50%  { transform: translateX(200%); }
          100% { transform: translateX(200%); }
        }
      `}</style>
    </span>
  );
}
