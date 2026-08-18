'use client';

import { TrendingUp } from 'lucide-react';

// Story 7.2 — FR35: soft ceiling trigger at 85% of Kid cap (350 × 0.85 = 297.5 → 300)
// Upper bound: 350 = Kid stage cap. At 350+ user has HIT ceiling (Story 7.3 handles that).
const SOFT_CEILING_THRESHOLD = 300;
const FREE_TIER_STAGE_CAP_SCORE = 350;

/* ── ATLAS raw tokens — mirrors the `.warn` surface (brain dimension is fixed) ── */
const T = {
  amber: '#d99405',
  warnLine: '#3a2a12',
  warnBg: '#14100a',
  text2: '#9fb0c2',
  muted: '#7f8ea3',
  muted2: '#5c6b7e',
};

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
      style={{
        display: 'flex',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 16,
        border: `1px solid ${T.warnLine}`,
        borderRadius: 2,
        background: T.warnBg,
        padding: '13px 18px',
      }}
    >
      {/* Icon */}
      <TrendingUp size={16} style={{ flex: 'none', color: T.amber }} aria-hidden="true" />

      {/* Message */}
      <div style={{ flex: '1 1 240px', minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: 12.5, lineHeight: '18px', color: T.text2 }}>
          Your brain is approaching its free-tier ceiling
        </p>
        <p style={{ margin: '5px 0 0', fontSize: 11.5, lineHeight: '17px', color: T.muted2 }}>
          Keep up the great work! Upgrading unlocks your full potential.
        </p>
      </div>

      {/* Subtle upgrade link */}
      <button
        type="button"
        onClick={onUpgradeClick}
        style={{
          flex: 'none',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          background: 'none',
          border: 0,
          padding: 0,
          fontWeight: 700,
          fontSize: 12.5,
          color: T.amber,
          cursor: 'pointer',
        }}
      >
        See upgrade options
        <svg width="9" height="10" viewBox="0 0 9 10" fill="none" aria-hidden="true">
          <path d="M4 0 L9 5 L4 10 M9 5 H0" stroke={T.amber} strokeWidth="1.5" />
        </svg>
      </button>
    </div>
  );
}
