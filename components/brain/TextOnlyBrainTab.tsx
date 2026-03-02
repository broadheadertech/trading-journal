'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { ArrowLeft } from 'lucide-react';
import { useBrainState } from '@/hooks/useBrainState';
import { useProfile } from '@/hooks/useStore';
import { STAGE_ORDER, STAGE_THRESHOLDS, STAGE_COLORS, STAGE_PATTERNS } from '@/lib/stage-config';
import type { Stage } from '@/lib/types';
import { SingleStagePatternDef } from './PatternDefs';
import BrainCoachingCard from './BrainCoachingCard';
import VacationModeToggle from './VacationModeToggle';
import SoftCeilingBanner from './SoftCeilingBanner';
import UpgradePrompt from './UpgradePrompt';
import PricingPlans from '@/components/PricingPlans';
import TextOnlyModeToggle from './TextOnlyModeToggle';
import ReducedMotionToggle from './ReducedMotionToggle';
import BrainDeleteButton from './BrainDeleteButton';
import CinematicEngine from './cinematic/CinematicEngine';

// ─── Helpers ─────────────────────────────────────────────────────────

function stageLabel(s: Stage): string {
  const labels: Record<Stage, string> = {
    'beginner': 'Beginner',
    'intern': 'Intern',
    'advance': 'Advance',
    'professional': 'Professional',
    'advance-professional': 'Advance Professional',
    'guru': 'Guru',
  };
  return labels[s] ?? s;
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

/** Returns the next stage threshold above the current score, or null if at guru. */
function getNextStageInfo(score: number, stage: Stage): { nextStage: Stage; nextMin: number } | null {
  const currentIdx = STAGE_ORDER.indexOf(stage);
  if (currentIdx >= STAGE_ORDER.length - 1) return null; // guru — no next
  const nextStage = STAGE_ORDER[currentIdx + 1];
  const threshold = STAGE_THRESHOLDS.find(t => t.stage === nextStage);
  if (!threshold) return null;
  return { nextStage, nextMin: threshold.min };
}

// ─── Back Button ────────────────────────────────────────────────────

function BackButton({ onBack }: { onBack: () => void }) {
  return (
    <button
      onClick={onBack}
      className="absolute top-4 left-4 z-10 flex items-center gap-2 px-3 py-2
                 rounded-xl bg-white/5 backdrop-blur-md border border-white/10
                 text-white/80 hover:text-white hover:bg-white/10
                 transition-all duration-200 group cursor-pointer"
      aria-label="Return to dashboard"
    >
      <ArrowLeft size={18} className="group-hover:-translate-x-0.5 transition-transform" />
      <span className="text-sm font-medium hidden sm:inline">Back</span>
    </button>
  );
}

// ─── Stage Roadmap ──────────────────────────────────────────────────

function StageRoadmap({ currentStage }: { currentStage: Stage }) {
  const currentIdx = STAGE_ORDER.indexOf(currentStage);
  return (
    <div className="flex flex-wrap gap-1 items-center text-xs text-white/40">
      {STAGE_ORDER.map((s, idx) => (
        <span key={s} className="flex items-center gap-1">
          {idx > 0 && <span className="text-white/15" aria-hidden="true">&rarr;</span>}
          {/* Story 9.3 — pattern swatch for colorblind differentiation */}
          <svg viewBox="0 0 10 10" className="w-2.5 h-2.5 flex-shrink-0" aria-hidden="true" style={{ color: idx <= currentIdx ? STAGE_COLORS[s].accent : 'rgba(255,255,255,0.15)' }}>
            <defs><SingleStagePatternDef stage={s} /></defs>
            <circle cx="5" cy="5" r="5" fill="currentColor" />
            {idx <= currentIdx && <circle cx="5" cy="5" r="5" fill={`url(#${STAGE_PATTERNS[s].id})`} />}
          </svg>
          <span className={idx === currentIdx
            ? 'text-white font-bold uppercase'
            : idx < currentIdx ? 'text-white/50' : ''
          }>
            {idx === currentIdx ? `[${stageLabel(s)}]` : stageLabel(s)}
          </span>
        </span>
      ))}
    </div>
  );
}

// ─── Score History (text list) ──────────────────────────────────────

function ScoreHistory({ data }: { data: { timestamp: number; newScore: number }[] }) {
  const entries = useMemo(() =>
    data.slice(-14).reverse().map(e => ({
      date: formatDate(e.timestamp),
      score: Math.round(e.newScore),
    })),
    [data],
  );

  if (entries.length === 0) return null;

  return (
    <section aria-label="Score history">
      <div className="text-[10px] uppercase tracking-widest text-white/30 mb-2 font-medium" aria-hidden="true">
        Score History
      </div>
      <ul className="space-y-1 list-none p-0 m-0">
        {entries.map((e, i) => (
          <li key={i} className="flex justify-between text-sm text-white/50">
            <span>{e.date}</span>
            <span className="tabular-nums text-white/70">{e.score}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

// ─── Skeleton / Empty ───────────────────────────────────────────────

function SkeletonState({ onBack }: { onBack?: () => void }) {
  return (
    <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center brain-dimension-bg" role="status" aria-label="Loading brain data">
      {onBack && <BackButton onBack={onBack} />}
      <div className="w-32 h-4 rounded bg-white/5 animate-pulse mb-4" aria-hidden="true" />
      <div className="w-24 h-3 rounded bg-white/5 animate-pulse" aria-hidden="true" />
    </div>
  );
}

function EmptyState({ onBack }: { onBack?: () => void }) {
  return (
    <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center px-4 brain-dimension-bg" role="region" aria-label="Brain empty state">
      {onBack && <BackButton onBack={onBack} />}
      <h2 className="text-lg font-semibold text-white/90 mb-2">Your Brain is Waiting</h2>
      <p className="text-sm text-white/50 max-w-sm text-center">
        Start logging trades to grow your brain! Each trade, reflection, and disciplined decision shapes your neural score.
      </p>
    </div>
  );
}

// ─── Main TextOnlyBrainTab Component ────────────────────────────────

interface TextOnlyBrainTabProps {
  onBack?: () => void;
}

export default function TextOnlyBrainTab({ onBack }: TextOnlyBrainTabProps) {
  const { brainState, isLoading } = useBrainState();
  const scoreTimeline = useQuery(api.brainQueries.getScoreTimeline, { limit: 30 });
  const subscription = useQuery(api.subscriptions.getUserSubscription);
  const planId = subscription?.planId ?? 'free';
  const { textOnlyBrain, setTextOnlyBrain, reducedMotion: appReducedMotion, setReducedMotion } = useProfile();
  const [pricingOpen, setPricingOpen] = useState(false);

  // Lock body scroll while dimension is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  // ESC key to exit — close pricing modal first if open, then brain dimension
  useEffect(() => {
    if (!onBack) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (pricingOpen) { setPricingOpen(false); return; }
      onBack();
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [onBack, pricingOpen]);

  if (isLoading) return <SkeletonState onBack={onBack} />;
  if (!brainState) return <EmptyState onBack={onBack} />;

  const { currentScore, previousScore, currentStage, streakDays, streakMultiplier } = brainState;
  // Story 7.1 — effectiveStage is the tier-capped display stage for free-tier users
  const displayStage = brainState.effectiveStage ?? currentStage;
  const delta = currentScore - previousScore;
  const deltaSign = delta >= 0 ? '+' : '';
  const nextInfo = getNextStageInfo(currentScore, displayStage);

  // Story 9.4 — reactive live region: announce score changes (not initial mount)
  const prevScoreRef = useRef(currentScore);
  const [scoreAnnouncement, setScoreAnnouncement] = useState('');
  useEffect(() => {
    if (prevScoreRef.current !== currentScore) {
      const d = currentScore - prevScoreRef.current;
      const s = d >= 0 ? '+' : '';
      setScoreAnnouncement(
        `Neuro Score updated: ${Math.round(currentScore)}. Stage: ${stageLabel(displayStage)}. Change: ${s}${d.toFixed(1)}. Text-only mode.`
      );
      prevScoreRef.current = currentScore;
    }
  }, [currentScore, displayStage]);

  return (
    <div className="fixed inset-0 z-60 overflow-hidden brain-dimension-bg">
      <div className="w-full h-dvh flex flex-col overflow-y-auto">
        {/* Story 9.4 — reactive live region for score changes */}
        <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
          {scoreAnnouncement}
        </div>

        {/* Back button */}
        {onBack && <BackButton onBack={onBack} />}

        {/* Main content — single scrollable column */}
        <div className="flex-1 pt-16 px-4 sm:px-8 pb-8 space-y-6 max-w-xl mx-auto w-full">

          {/* Neuro Score */}
          <section aria-label="Neuro Score">
            <div className="text-[10px] uppercase tracking-widest text-white/30 mb-1 font-medium" aria-hidden="true">
              Neuro Score
            </div>
            <div className="flex items-baseline gap-2.5">
              <span className="text-5xl sm:text-6xl font-bold text-white tabular-nums">
                {Math.round(currentScore)}
              </span>
              <span className={`text-sm font-semibold ${delta >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {deltaSign}{delta.toFixed(1)}
              </span>
            </div>
            <div className="mt-2 flex gap-4 text-[10px] text-white/30">
              <span>Streak <strong className="text-white/60">{streakDays}d</strong></span>
              <span>Multi <strong className="text-white/60">{streakMultiplier.toFixed(2)}x</strong></span>
            </div>
          </section>

          {/* Stage */}
          <section aria-label="Brain stage">
            <div className="text-[10px] uppercase tracking-widest text-white/30 mb-1 font-medium" aria-hidden="true">
              Stage
            </div>
            <div className="text-3xl sm:text-4xl font-bold text-white capitalize mb-2">
              {stageLabel(displayStage)}
            </div>
            <StageRoadmap currentStage={displayStage} />
            {nextInfo && (
              <div className="mt-2 text-sm text-white/40">
                Progress: {Math.round(currentScore)} / {nextInfo.nextMin} to {stageLabel(nextInfo.nextStage)}
              </div>
            )}
            {!nextInfo && (
              <div className="mt-2 text-sm text-white/40">
                {Math.round(currentScore)} / 1000 — Maximum stage reached
              </div>
            )}
          </section>

          {/* Soft ceiling & upgrade prompts */}
          <SoftCeilingBanner
            currentScore={currentScore}
            planId={planId}
            onUpgradeClick={() => setPricingOpen(true)}
          />
          <UpgradePrompt
            currentScore={currentScore}
            currentStage={currentStage}
            planId={planId}
            onUpgradeClick={() => setPricingOpen(true)}
          />

          {/* Coaching */}
          <BrainCoachingCard coaching={brainState.latestCoachingMessage} />

          {/* Controls */}
          <div className="space-y-1">
            <VacationModeToggle />
            <TextOnlyModeToggle enabled={textOnlyBrain} onToggle={setTextOnlyBrain} />
            <ReducedMotionToggle enabled={appReducedMotion} onToggle={setReducedMotion} />
            <BrainDeleteButton onBack={onBack} />
          </div>

          {/* Score Timeline — text list */}
          {scoreTimeline && scoreTimeline.length > 0 && (
            <ScoreHistory data={scoreTimeline} />
          )}
        </div>
      </div>

      {/* Cinematic engine — text-only mode handled in Task 6 */}
      <CinematicEngine />
      <PricingPlans open={pricingOpen} onClose={() => setPricingOpen(false)} />
    </div>
  );
}
