'use client';

import { useMemo, useState, useCallback, lazy, Suspense, useEffect } from 'react';
import { useBrainState, useMigrationStatus } from '@/hooks/useBrainState';
import { useProfile } from '@/hooks/useStore';
import { useReducedMotionContext } from '@/components/brain/ReducedMotionProvider';
import { STAGE_COLORS, STAGE_ORDER } from '@/lib/stage-config';
import type { Stage, StageHistoryEntry, BrainState } from '@/lib/types';

// D9 — lazy load heavy animation components so they only load on demand
const StageEvolutionCinematic = lazy(
  () => import('./StageEvolutionCinematic'),
);
const StageRegressionCinematic = lazy(
  () => import('./StageRegressionCinematic'),
);
const EggHatchCinematic = lazy(
  () => import('./EggHatchCinematic'),
);
const MigrationTimeLapseCinematic = lazy(
  () => import('./MigrationTimeLapseCinematic'),
);

const CINEMATIC_WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours

// ─── Event interfaces ───────────────────────────────────────────────────────

interface EvolutionEvent {
  fromStage: Stage;
  toStage: Stage;
  coachingMessage: string | null;
  eventKey: string;
}

interface RegressionEvent {
  fromStage: Stage;
  toStage: Stage;
  coachingMessage: string | null;
  recoveryLockUntil: number | null;
  eventKey: string;
}

interface EggHatchEvent {
  babyReachedAt: number;
  eventKey: string;
}

interface MigrationEvent {
  stageHistory: StageHistoryEntry[];
  finalScore: number;
  finalStage: Stage;
  tradeCount: number;
  eventKey: string;
}

// ─── Detectors ──────────────────────────────────────────────────────────────

function detectEvolution(
  stageHistory: StageHistoryEntry[],
  coachingMessage: string | null,
): EvolutionEvent | null {
  if (stageHistory.length < 2) return null;
  const last = stageHistory[stageHistory.length - 1];
  const prev = stageHistory[stageHistory.length - 2];

  const isEvolution =
    STAGE_ORDER.indexOf(last.stage) > STAGE_ORDER.indexOf(prev.stage);
  const isRecent = Date.now() - last.reachedAt < CINEMATIC_WINDOW_MS;
  if (!isEvolution || !isRecent) return null;

  // Dedup key — localStorage prevents replay across page loads/sessions
  const key = `cinematic:evolution:${last.reachedAt}`;
  if (typeof localStorage !== 'undefined' && localStorage.getItem(key)) return null;

  return {
    fromStage: prev.stage,
    toStage: last.stage,
    // Captured at detection time — prevents overwrite race if user trades before cinematic dismisses
    coachingMessage,
    eventKey: key,
  };
}

function detectRegression(
  stageHistory: StageHistoryEntry[],
  coachingMessage: string | null,
  recoveryLockUntil: number | null,
): RegressionEvent | null {
  if (stageHistory.length < 2) return null;
  const last = stageHistory[stageHistory.length - 1];
  const prev = stageHistory[stageHistory.length - 2];

  const isRegression =
    STAGE_ORDER.indexOf(last.stage) < STAGE_ORDER.indexOf(prev.stage);
  const isRecent = Date.now() - last.reachedAt < CINEMATIC_WINDOW_MS;
  if (!isRegression || !isRecent) return null;

  // Dedup key — localStorage prevents replay across page loads/sessions
  const key = `cinematic:regression:${last.reachedAt}`;
  if (typeof localStorage !== 'undefined' && localStorage.getItem(key)) return null;

  return {
    fromStage: prev.stage,
    toStage: last.stage,
    coachingMessage,
    // Captured at detection time — recoveryLockUntil won't change during cinematic
    recoveryLockUntil,
    eventKey: key,
  };
}

function detectMigrationTimeLapse(
  brainState: BrainState | null,
  migrationStatus: { isMigrationUser: boolean; tradeCount: number; hasBrainState: boolean } | null,
): MigrationEvent | null {
  if (!migrationStatus) return null;

  // Step 1: While backfill is pending, capture "was migration" flag in localStorage
  if (migrationStatus.isMigrationUser) {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('migration:was-pending', '1');
    }
    return null; // backfill not complete yet
  }

  // Step 2: Backfill complete — only proceed if flag was previously set
  const wasPending =
    typeof localStorage !== 'undefined' && !!localStorage.getItem('migration:was-pending');
  if (!wasPending) return null; // new user — flag never set → cinematic never fires

  if (!migrationStatus.hasBrainState) return null;
  if (!brainState?.stageHistory?.length) return null;

  // Step 3: Dedup — fires only once per brainState creation
  const key = `cinematic:migration-time-lapse:${brainState.createdAt}`;
  if (typeof localStorage !== 'undefined' && localStorage.getItem(key)) return null;

  return {
    stageHistory: brainState.stageHistory,
    finalScore: brainState.currentScore,
    finalStage: brainState.currentStage,
    tradeCount: migrationStatus.tradeCount,
    eventKey: key,
  };
}

function detectEggHatch(brainState: BrainState | null): EggHatchEvent | null {
  if (!brainState?.stageHistory) return null;
  if (brainState.stageHistory.length !== 1) return null;        // must be first-ever stage
  if (brainState.stageHistory[0].stage !== 'baby') return null; // must be baby
  if (brainState.lastTradeDate !== 0) return null;              // must have no trades yet

  // Dedup key — localStorage prevents replay across page loads/sessions
  const key = `cinematic:egg-hatch:${brainState.stageHistory[0].reachedAt}`;
  if (typeof localStorage !== 'undefined' && localStorage.getItem(key)) return null;

  return {
    babyReachedAt: brainState.stageHistory[0].reachedAt,
    eventKey: key,
  };
}

// ─── CinematicEngine ────────────────────────────────────────────────────────
// Priority: migration > evolution > regression > egg hatch
// migration fires once for import users; egg hatch fires once for brand-new users

export default function CinematicEngine() {
  const { brainState } = useBrainState();
  const { migrationStatus } = useMigrationStatus();
  const { textOnlyBrain } = useProfile();
  const { isReducedMotion: reducedMotion } = useReducedMotionContext();
  // Story 9.1 — text-only mode uses same text banners as reduced motion (AC #3)
  const useTextFallback = reducedMotion || textOnlyBrain;
  const [dismissed, setDismissed] = useState<string | null>(null);

  // Side effect: set the "was migration" flag in localStorage while backfill is pending.
  // Kept in useEffect (not inside detectMigrationTimeLapse useMemo) to comply with
  // React's render-purity rules — useMemo must not write to external storage.
  useEffect(() => {
    if (migrationStatus?.isMigrationUser && typeof localStorage !== 'undefined') {
      localStorage.setItem('migration:was-pending', '1');
    }
  }, [migrationStatus?.isMigrationUser]);

  const evolutionEvent = useMemo(() => {
    if (!brainState?.stageHistory) return null;
    const coaching = brainState.latestCoachingMessage?.message ?? null;
    return detectEvolution(brainState.stageHistory, coaching);
    // Intentionally omit latestCoachingMessage from deps — capture message at detection time only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [brainState?.stageHistory]);

  const regressionEvent = useMemo(() => {
    if (!brainState?.stageHistory) return null;
    const coaching = brainState.latestCoachingMessage?.message ?? null;
    const lockUntil = brainState.recoveryLockUntil ?? null;
    return detectRegression(brainState.stageHistory, coaching, lockUntil);
    // Intentionally omit latestCoachingMessage / recoveryLockUntil from deps — capture at detection time
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [brainState?.stageHistory]);

  const eggHatchEvent = useMemo(() => {
    return detectEggHatch(brainState);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [brainState?.stageHistory, brainState?.lastTradeDate]);

  const migrationEvent = useMemo(
    () => detectMigrationTimeLapse(brainState, migrationStatus),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [brainState?.stageHistory, brainState?.createdAt, migrationStatus?.hasBrainState, migrationStatus?.isMigrationUser, migrationStatus?.tradeCount],
  );

  const handleComplete = useCallback((eventKey: string) => {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(eventKey, '1');
      // Clear migration pending flag when migration cinematic completes
      if (eventKey.startsWith('cinematic:migration-time-lapse:')) {
        localStorage.removeItem('migration:was-pending');
      }
    }
    setDismissed(eventKey);
  }, []);

  // Nothing pending
  const evolutionDone = !evolutionEvent || dismissed === evolutionEvent.eventKey;
  const regressionDone = !regressionEvent || dismissed === regressionEvent.eventKey;
  const eggHatchDone = !eggHatchEvent || dismissed === eggHatchEvent.eventKey;
  const migrationDone = !migrationEvent || dismissed === migrationEvent.eventKey;
  if (evolutionDone && regressionDone && eggHatchDone && migrationDone) return null;

  // ── Migration fires first (one-time welcome-back for import users) ────────
  if (migrationEvent && dismissed !== migrationEvent.eventKey) {
    if (useTextFallback) {
      return (
        <ReducedMotionMigrationBanner
          event={migrationEvent}
          onDismiss={() => handleComplete(migrationEvent.eventKey)}
        />
      );
    }
    return (
      <Suspense fallback={null}>
        <MigrationTimeLapseCinematic
          stageHistory={migrationEvent.stageHistory}
          finalScore={migrationEvent.finalScore}
          tradeCount={migrationEvent.tradeCount}
          onComplete={() => handleComplete(migrationEvent.eventKey)}
        />
      </Suspense>
    );
  }

  // ── Evolution takes priority ─────────────────────────────────────────────
  if (evolutionEvent && dismissed !== evolutionEvent.eventKey) {
    if (useTextFallback) {
      return (
        <ReducedMotionBanner
          event={evolutionEvent}
          onDismiss={() => handleComplete(evolutionEvent.eventKey)}
        />
      );
    }
    return (
      <Suspense fallback={null}>
        <StageEvolutionCinematic
          fromStage={evolutionEvent.fromStage}
          toStage={evolutionEvent.toStage}
          coachingMessage={evolutionEvent.coachingMessage}
          onComplete={() => handleComplete(evolutionEvent.eventKey)}
        />
      </Suspense>
    );
  }

  // ── Regression ───────────────────────────────────────────────────────────
  if (regressionEvent && dismissed !== regressionEvent.eventKey) {
    if (useTextFallback) {
      return (
        <ReducedMotionRegressionBanner
          event={regressionEvent}
          onDismiss={() => handleComplete(regressionEvent.eventKey)}
        />
      );
    }
    return (
      <Suspense fallback={null}>
        <StageRegressionCinematic
          fromStage={regressionEvent.fromStage}
          toStage={regressionEvent.toStage}
          coachingMessage={regressionEvent.coachingMessage}
          recoveryLockUntil={regressionEvent.recoveryLockUntil}
          onComplete={() => handleComplete(regressionEvent.eventKey)}
        />
      </Suspense>
    );
  }

  // ── Egg Hatch (lowest priority — fires once for brand-new users) ────────────
  if (eggHatchEvent && dismissed !== eggHatchEvent.eventKey) {
    if (useTextFallback) {
      return (
        <ReducedMotionEggBanner
          onDismiss={() => handleComplete(eggHatchEvent.eventKey)}
        />
      );
    }
    return (
      <Suspense fallback={null}>
        <EggHatchCinematic
          onComplete={() => handleComplete(eggHatchEvent.eventKey)}
        />
      </Suspense>
    );
  }

  return null;
}

// ─── Reduced-motion fallback — Egg Hatch ─────────────────────────────────────

function ReducedMotionEggBanner({ onDismiss }: { onDismiss: () => void }) {
  // Auto-dismiss after 3s (NFR14)
  useEffect(() => {
    const t = setTimeout(onDismiss, 3000);
    return () => clearTimeout(t);
  }, [onDismiss]);

  return (
    <div
      className="fixed inset-x-4 bottom-24 z-70 flex justify-center"
      role="status"
      aria-live="polite"
      aria-label="Your Baby Brain is born"
    >
      <div className="rounded-2xl bg-black/85 border border-white/10 backdrop-blur-md px-6 py-4 max-w-sm w-full text-center">
        <p className="text-[10px] uppercase tracking-[0.3em] text-white/40 mb-1">
          New Brain
        </p>
        <p className="text-xl font-bold text-white">Your Baby Brain is born!</p>
        <button
          onClick={onDismiss}
          className="mt-3 text-xs text-white/25 hover:text-white/50 transition-colors cursor-pointer"
          aria-label="Dismiss egg hatch notification"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}

// ─── Reduced-motion fallback — Evolution ───────────────────────────────────

function ReducedMotionBanner({
  event,
  onDismiss,
}: {
  event: EvolutionEvent;
  onDismiss: () => void;
}) {
  // Auto-dismiss after 3s (AC #3 — NFR14)
  useEffect(() => {
    const t = setTimeout(onDismiss, 3000);
    return () => clearTimeout(t);
  }, [onDismiss]);

  return (
    <div
      className="fixed inset-x-4 bottom-24 z-70 flex justify-center"
      role="status"
      aria-live="polite"
      aria-label={`Stage evolved from ${event.fromStage} to ${event.toStage}`}
    >
      <div className="rounded-2xl bg-black/85 border border-white/10 backdrop-blur-md px-6 py-4 max-w-sm w-full text-center">
        <p className="text-[10px] uppercase tracking-[0.3em] text-white/40 mb-1">
          Stage Evolution
        </p>
        <p className="text-xl font-bold capitalize text-white">
          {event.fromStage} → {event.toStage}
        </p>
        {event.coachingMessage && (
          <p className="text-sm text-white/60 mt-2 leading-relaxed">
            {event.coachingMessage}
          </p>
        )}
        <button
          onClick={onDismiss}
          className="mt-3 text-xs text-white/25 hover:text-white/50 transition-colors cursor-pointer"
          aria-label="Dismiss stage evolution notification"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}

// ─── Reduced-motion fallback — Regression ──────────────────────────────────

function ReducedMotionRegressionBanner({
  event,
  onDismiss,
}: {
  event: RegressionEvent;
  onDismiss: () => void;
}) {
  // Auto-dismiss after 4s (slightly longer — regression carries more context)
  useEffect(() => {
    const t = setTimeout(onDismiss, 4000);
    return () => clearTimeout(t);
  }, [onDismiss]);

  const hasLock = event.recoveryLockUntil !== null && event.recoveryLockUntil > Date.now();

  return (
    <div
      className="fixed inset-x-4 bottom-24 z-70 flex justify-center"
      role="alert"
      aria-live="assertive"
      aria-label={`Stage regressed from ${event.fromStage} to ${event.toStage}`}
    >
      <div className="rounded-2xl bg-black/85 border border-amber-500/20 backdrop-blur-md px-6 py-4 max-w-sm w-full text-center">
        <p className="text-[10px] uppercase tracking-[0.3em] text-amber-400/60 mb-1">
          Stage Regression
        </p>
        <p className="text-xl font-bold capitalize text-white">
          {event.fromStage} → {event.toStage}
        </p>
        {event.coachingMessage && (
          <p className="text-sm text-white/60 mt-2 leading-relaxed">
            {event.coachingMessage}
          </p>
        )}
        {hasLock && (
          <p className="mt-2 text-xs text-amber-400/70">
            Recovery lock active — stabilise before advancing
          </p>
        )}
        <button
          onClick={onDismiss}
          className="mt-3 text-xs text-white/25 hover:text-white/50 transition-colors cursor-pointer"
          aria-label="Dismiss stage regression notification"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}

// ─── Reduced-motion fallback — Migration ─────────────────────────────────────

function ReducedMotionMigrationBanner({
  event,
  onDismiss,
}: {
  event: MigrationEvent;
  onDismiss: () => void;
}) {
  // Auto-dismiss after 5s (longer — migration context is important)
  useEffect(() => {
    const t = setTimeout(onDismiss, 5000);
    return () => clearTimeout(t);
  }, [onDismiss]);

  const finalColors = STAGE_COLORS[event.finalStage];

  return (
    <div
      className="fixed inset-x-4 bottom-24 z-70 flex justify-center"
      role="status"
      aria-live="polite"
      aria-label={`Migration complete. Final stage: ${event.finalStage}, score: ${event.finalScore}`}
    >
      <div className="rounded-2xl bg-black/85 border border-white/10 backdrop-blur-md px-6 py-5 max-w-sm w-full">
        <p className="text-[10px] uppercase tracking-[0.3em] text-white/40 mb-2">
          Your Journey Replayed
        </p>
        <p
          className="text-xl font-bold capitalize"
          style={{ color: finalColors.accent }}
        >
          {event.finalStage} Brain
        </p>
        <p className="text-sm text-white/60 mt-1">
          Score: {event.finalScore} · {event.tradeCount} trade{event.tradeCount !== 1 ? 's' : ''}
        </p>
        <p className="text-xs text-white/30 mt-3">
          {event.stageHistory.map(e => e.stage).join(' → ')}
        </p>
        <button
          onClick={onDismiss}
          className="mt-4 text-xs text-white/25 hover:text-white/50 transition-colors cursor-pointer"
          aria-label="Dismiss migration replay notification"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
