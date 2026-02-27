'use client';

import type { Stage } from '@/lib/types';

// Story 7.3 — FR36: upgrade prompt fires when free-tier score hits/exceeds the Kid stage cap
const UPGRADE_TRIGGER_SCORE = 350;

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
      className="flex flex-col gap-2
                 bg-amber-500/12 border border-amber-500/35 rounded-xl px-4 py-3
                 shadow-[0_0_20px_rgba(245,158,11,0.08)]"
    >
      {/* Stage earned label + message */}
      <div>
        <p className="text-sm text-white/80 leading-snug">
          You&apos;ve earned{' '}
          <span className="text-amber-400 font-semibold">{stageLabel(currentStage)}</span>
          {' '}— unlock your true brain stage
        </p>
        <p className="text-xs text-white/40 mt-0.5 leading-relaxed">
          Your brain grew beyond the free tier. Upgrade to reveal your true stage.
        </p>
      </div>

      {/* CTA — emphasises unlocking, not buying (FR36) */}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={onUpgradeClick}
          className="text-xs font-semibold
                     bg-amber-500/20 hover:bg-amber-500/30
                     text-amber-300 border border-amber-500/40
                     rounded-lg px-3 py-1.5
                     transition-colors cursor-pointer
                     focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/50"
        >
          Unlock Growth
        </button>
      </div>
    </div>
  );
}
