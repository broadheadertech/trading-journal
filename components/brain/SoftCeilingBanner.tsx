'use client';

import { TrendingUp } from 'lucide-react';

// Story 7.2 — FR35: soft ceiling trigger at 85% of Kid cap (350 × 0.85 = 297.5 → 300)
// Upper bound: 350 = Kid stage cap. At 350+ user has HIT ceiling (Story 7.3 handles that).
const SOFT_CEILING_THRESHOLD = 300;
const FREE_TIER_STAGE_CAP_SCORE = 350;

interface SoftCeilingBannerProps {
  currentScore: number;
  planId: string;
  onUpgradeClick: () => void;
}

/**
 * Gentle, non-blocking banner shown when a Free-tier user is approaching the Kid stage cap.
 * Renders null for paid users or when score is below the soft ceiling threshold.
 */
export default function SoftCeilingBanner({ currentScore, planId, onUpgradeClick }: SoftCeilingBannerProps) {
  if (planId !== 'free' || currentScore < SOFT_CEILING_THRESHOLD || currentScore >= FREE_TIER_STAGE_CAP_SCORE) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3
                 bg-amber-500/8 border border-amber-500/20 rounded-xl px-4 py-3"
    >
      {/* Icon */}
      <TrendingUp size={16} className="shrink-0 text-amber-400/70 hidden sm:block" aria-hidden="true" />

      {/* Message */}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-white/70 leading-snug">
          Your brain is approaching its free-tier ceiling
        </p>
        <p className="text-xs text-white/40 mt-0.5 leading-relaxed">
          Keep up the great work! Upgrading unlocks your full potential.
        </p>
      </div>

      {/* Subtle upgrade link */}
      <button
        type="button"
        onClick={onUpgradeClick}
        className="shrink-0 text-xs text-amber-400/80 hover:text-amber-300
                   underline underline-offset-2 transition-colors cursor-pointer
                   text-left sm:text-right"
      >
        See upgrade options →
      </button>
    </div>
  );
}
