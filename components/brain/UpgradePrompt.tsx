'use client';

import type { Stage } from '@/lib/types';

// Story 7.3 — FR36: upgrade prompt fires when free-tier score hits/exceeds the Kid stage cap
const UPGRADE_TRIGGER_SCORE = 350;

/* ── ATLAS raw tokens (brain dimension is position:fixed — see BrainMiniWidget) ── */
const T = {
  amber: '#d99405',
  ink: '#0a0a0a',
  panel: '#0a0f17',
  line2: '#24344a',
  text: '#edf2f7',
  text2: '#9fb0c2',
  muted2: '#5c6b7e',
  display: "'Archivo',system-ui,sans-serif",
};

function stageLabel(s: Stage): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

interface UpgradePromptProps {
  currentScore: number;
  currentStage: Stage;
  planId: string;
  onUpgradeClick: () => void;
}

/**
 * Empowering upgrade prompt shown when a Free-tier user's actual score has exceeded the Kid cap.
 * Frames the upgrade as unlocking growth already earned, not as a purchase.
 * Renders null for paid users or when score is below the 350 trigger.
 */
export default function UpgradePrompt({ currentScore, currentStage, planId, onUpgradeClick }: UpgradePromptProps) {
  if (planId !== 'free' || currentScore < UPGRADE_TRIGGER_SCORE) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 16,
        border: `1px solid ${T.line2}`,
        borderRadius: 2,
        background: T.panel,
        padding: '15px 20px',
      }}
    >
      {/* amber accent rule — ATLAS card accent */}
      <span style={{ position: 'absolute', left: 0, top: -1, width: 60, height: 3, background: T.amber }} />

      {/* Stage earned label + message */}
      <div style={{ flex: '1 1 260px', minWidth: 0 }}>
        <p style={{ margin: 0, fontFamily: T.display, fontWeight: 700, fontSize: 15, lineHeight: '18px', color: T.text }}>
          You&apos;ve earned{' '}
          <span style={{ color: T.amber }}>{stageLabel(currentStage)}</span>
          {' '}— unlock your true brain stage
        </p>
        <p style={{ margin: '9px 0 0', fontSize: 12, lineHeight: '18px', color: T.muted2 }}>
          Your brain grew beyond the free tier. Upgrade to reveal your true stage.
        </p>
      </div>

      {/* CTA — emphasises unlocking, not buying (FR36) */}
      <button
        type="button"
        onClick={onUpgradeClick}
        style={{
          flex: 'none',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: 36,
          padding: '0 20px',
          borderRadius: 2,
          border: 0,
          background: T.amber,
          color: T.ink,
          fontWeight: 700,
          fontSize: 12.5,
          cursor: 'pointer',
        }}
      >
        Unlock Growth
      </button>
    </div>
  );
}
