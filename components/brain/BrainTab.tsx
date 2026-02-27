'use client';

import { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { motion } from 'framer-motion';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts';
import { ArrowLeft } from 'lucide-react';
import { useBrainState } from '@/hooks/useBrainState';
import { useProfile } from '@/hooks/useStore';
import { STAGE_ORDER, STAGE_THRESHOLDS, STAGE_COLORS, STAGE_PATTERNS } from '@/lib/stage-config';
import type { Stage } from '@/lib/types';
import BrainMascot from '@/components/BrainMascot';
import { SingleStagePatternDef } from './PatternDefs';
import BrainCoachingCard from './BrainCoachingCard';
import VacationModeToggle from './VacationModeToggle';
import CinematicEngine from './cinematic/CinematicEngine';
import SoftCeilingBanner from './SoftCeilingBanner';
import UpgradePrompt from './UpgradePrompt';
import PricingPlans from '@/components/PricingPlans';
import TextOnlyModeToggle from './TextOnlyModeToggle';
import ReducedMotionToggle from './ReducedMotionToggle';
import BrainDeleteButton from './BrainDeleteButton';
import { useReducedMotionContext } from './ReducedMotionProvider';

const LazyBrainScene = lazy(() => import('./BrainScene'));

// ─── Helpers ─────────────────────────────────────────────────────────

function stageLabel(s: Stage): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
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

// ─── Static 2D Brain (reduced motion fallback) ──────────────────────

function StaticBrain({ stage }: { stage: Stage }) {
  const color = STAGE_COLORS[stage].accent;
  return (
    <div className="flex items-center justify-center h-full" aria-hidden="true">
      <div
        className="w-48 h-48 rounded-full flex items-center justify-center relative overflow-hidden"
        style={{
          background: `radial-gradient(circle, ${color} 0%, transparent 70%)`,
          opacity: 0.8,
        }}
      >
        <BrainMascot size={120} />
        {/* Story 9.3 — colorblind pattern overlay */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 192 192" style={{ color }}>
          <defs><SingleStagePatternDef stage={stage} idSuffix="static" /></defs>
          <circle cx="96" cy="96" r="96" fill={`url(#${STAGE_PATTERNS[stage].id}-static)`} />
        </svg>
      </div>
    </div>
  );
}

// ─── Loading Placeholder ─────────────────────────────────────────────

function BrainLoadingPlaceholder() {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="w-32 h-32 rounded-full bg-white/5 animate-pulse" />
    </div>
  );
}

// ─── HUD: Neuro Score (top-left) ─────────────────────────────────────

function HudScore({ score, previousScore, streakDays, multiplier }: {
  score: number;
  previousScore: number;
  streakDays: number;
  multiplier: number;
}) {
  const delta = score - previousScore;
  const deltaSign = delta >= 0 ? '+' : '';

  return (
    <section className="absolute top-16 sm:top-16 left-4 sm:left-6 z-10" aria-label="Neuro Score">
      <div className="text-[10px] uppercase tracking-widest text-white/30 mb-1 font-medium" aria-hidden="true">
        Neuro Score
      </div>
      <div className="flex items-baseline gap-2.5">
        <span className="text-5xl sm:text-6xl font-bold text-white tabular-nums"
          style={{ textShadow: '0 0 40px rgba(255,255,255,0.15)' }}
        >
          {Math.round(score)}
        </span>
        <span className={`text-sm font-semibold ${delta >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
          {deltaSign}{delta.toFixed(1)}
        </span>
      </div>
      <div className="mt-2 flex gap-4 text-[10px] text-white/30">
        <span>Streak <strong className="text-white/60">{streakDays}d</strong></span>
        <span>Multi <strong className="text-white/60">{multiplier.toFixed(2)}x</strong></span>
      </div>
    </section>
  );
}

// ─── HUD: Stage Badge (top-right) ────────────────────────────────────

function HudStage({ stage, score }: { stage: Stage; score: number }) {
  const currentIdx = STAGE_ORDER.indexOf(stage);

  return (
    <section className="absolute top-16 sm:top-16 right-4 sm:right-6 z-10 text-right" aria-label="Brain stage">
      <div className="text-[10px] uppercase tracking-widest text-white/30 mb-1 font-medium" aria-hidden="true">
        Stage
      </div>
      <div
        className="text-3xl sm:text-4xl font-bold"
        style={{ color: STAGE_COLORS[stage].accent, textShadow: `0 0 30px ${STAGE_COLORS[stage].accentGlow}` }}
      >
        {stageLabel(stage)}
      </div>

      {/* Mini stage dots — Story 9.3: SVG patterns for colorblind differentiation */}
      <div className="flex gap-1.5 mt-2 justify-end">
        {STAGE_ORDER.map((s, idx) => {
          const active = idx <= currentIdx;
          const isCurrent = idx === currentIdx;
          return (
            <svg
              key={s}
              viewBox="0 0 8 8"
              className={`w-2 h-2 ${isCurrent ? 'stage-dot-beat' : ''}`}
              style={{
                color: active ? STAGE_COLORS[s].accent : 'rgba(255,255,255,0.1)',
                filter: isCurrent ? `drop-shadow(0 0 4px ${STAGE_COLORS[s].accent})` : 'none',
              }}
            >
              <title>{`${stageLabel(s)} (${STAGE_THRESHOLDS.find(t => t.stage === s)?.min ?? 0})`}</title>
              <defs><SingleStagePatternDef stage={s} /></defs>
              <circle cx="4" cy="4" r="4" fill="currentColor" />
              {active && <circle cx="4" cy="4" r="4" fill={`url(#${STAGE_PATTERNS[s].id})`} />}
            </svg>
          );
        })}
      </div>

      {/* Progress to next */}
      <div className="mt-1.5 text-[9px] text-white/25">
        {score} / 1000
      </div>
    </section>
  );
}

// ─── Score Timeline (bottom panel) ───────────────────────────────────

function HudTimeline({ data }: { data: { timestamp: number; newScore: number }[] }) {
  const chartData = useMemo(() =>
    data.slice(-14).map(e => ({
      date: formatDate(e.timestamp),
      score: Math.round(e.newScore),
    })),
    [data],
  );

  if (chartData.length === 0) return null;

  return (
    <div role="img" aria-label="Neuro Score timeline chart">
    <ResponsiveContainer width="100%" height={70}>
      <AreaChart data={chartData}>
        <defs>
          <linearGradient id="hudScoreGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.15} />
            <stop offset="95%" stopColor="var(--accent)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis dataKey="date" hide />
        <YAxis hide />
        <Tooltip
          contentStyle={{
            background: 'rgba(5,5,16,0.85)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '8px',
            backdropFilter: 'blur(8px)',
            color: '#fff',
            fontSize: '12px',
          }}
          labelStyle={{ color: 'rgba(255,255,255,0.5)', fontSize: '10px' }}
          itemStyle={{ color: 'var(--accent)' }}
        />
        <Area
          type="monotone"
          dataKey="score"
          stroke="var(--accent)"
          strokeWidth={1.5}
          fill="url(#hudScoreGrad)"
        />
      </AreaChart>
    </ResponsiveContainer>
    </div>
  );
}

// ─── Skeleton Loading State ──────────────────────────────────────────

function SkeletonState({ onBack }: { onBack?: () => void }) {
  return (
    <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center brain-dimension-bg" role="status" aria-label="Loading brain data">
      {onBack && <BackButton onBack={onBack} />}
      <div className="w-48 h-48 rounded-full bg-white/5 animate-pulse mb-8" aria-hidden="true" />
      <div className="w-32 h-4 rounded bg-white/5 animate-pulse" aria-hidden="true" />
    </div>
  );
}

// ─── Empty State ─────────────────────────────────────────────────────

function EmptyState({ onBack }: { onBack?: () => void }) {
  return (
    <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center px-4 brain-dimension-bg" role="region" aria-label="Brain empty state">
      {onBack && <BackButton onBack={onBack} />}
      <BrainMascot size={80} className="mb-4 opacity-60" aria-hidden="true" />
      <h2 className="text-lg font-semibold text-white/90 mb-2">Your Brain is Waiting</h2>
      <p className="text-sm text-white/50 max-w-sm text-center">
        Start logging trades to grow your brain! Each trade, reflection, and disciplined decision shapes your neural score.
      </p>
    </div>
  );
}

// ─── Main BrainTab Component ─────────────────────────────────────────

interface BrainTabProps {
  onBack?: () => void;
}

export default function BrainTab({ onBack }: BrainTabProps) {
  const { brainState, isLoading } = useBrainState();
  const scoreTimeline = useQuery(api.brainQueries.getScoreTimeline, { limit: 30 });
  // Story 7.2 — subscription needed for soft ceiling banner (FR35)
  const subscription = useQuery(api.subscriptions.getUserSubscription);
  const planId = subscription?.planId ?? 'free';
  const { textOnlyBrain, setTextOnlyBrain, reducedMotion: appReducedMotion, setReducedMotion } = useProfile();
  const [pricingOpen, setPricingOpen] = useState(false);
  const { isReducedMotion: reducedMotion } = useReducedMotionContext();

  // Lock body scroll while dimension is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  // ESC key to exit — close pricing modal first if open (Story 7.2), then brain dimension
  useEffect(() => {
    if (!onBack) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (pricingOpen) { setPricingOpen(false); return; }
      onBack();
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [onBack, pricingOpen, setPricingOpen]);

  if (isLoading) return <SkeletonState onBack={onBack} />;
  if (!brainState) return <EmptyState onBack={onBack} />;

  const { currentScore, previousScore, currentStage, streakDays, streakMultiplier } = brainState;

  // Story 9.4 — reactive live region: announce score changes (not initial mount)
  const prevScoreRef = useRef(currentScore);
  const [scoreAnnouncement, setScoreAnnouncement] = useState('');
  useEffect(() => {
    if (prevScoreRef.current !== currentScore) {
      const delta = currentScore - prevScoreRef.current;
      const sign = delta >= 0 ? '+' : '';
      setScoreAnnouncement(
        `Neuro Score updated: ${Math.round(currentScore)}. Stage: ${stageLabel(currentStage)}. Change: ${sign}${delta.toFixed(1)}.`
      );
      prevScoreRef.current = currentScore;
    }
  }, [currentScore, currentStage]);

  const content = (
    <div className="w-full h-dvh flex flex-col overflow-hidden">
      {/* Story 9.4 — reactive live region for score changes */}
      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {scoreAnnouncement}
      </div>

      {/* Back button — absolute over the whole layout */}
      {onBack && <BackButton onBack={onBack} />}

      {/* 3D Brain — flex-1 so it takes all space above the bottom panel */}
      <div
        className="relative flex-1 overflow-hidden"
        style={{
          filter: 'brightness(var(--brain-dimming, 1)) saturate(var(--brain-dimming, 1))',
          transition: 'filter 0.5s ease',
        }}
      >
        {reducedMotion ? (
          <StaticBrain stage={currentStage} />
        ) : (
          <Suspense fallback={<BrainLoadingPlaceholder />}>
            <LazyBrainScene stage={currentStage} className="w-full h-full" />
          </Suspense>
        )}

        {/* HUD overlays — positioned within the brain area */}
        <HudScore
          score={currentScore}
          previousScore={previousScore}
          streakDays={streakDays}
          multiplier={streakMultiplier}
        />
        <HudStage stage={currentStage} score={currentScore} />
      </div>

      {/* Bottom panel — coaching + timeline, never overlaps the brain */}
      <section className="flex-shrink-0 px-4 sm:px-8 pt-2 pb-3 space-y-2" aria-label="Brain controls and coaching">
        {/* Story 7.2 — soft ceiling banner for free-tier users near cap (FR35) */}
        <SoftCeilingBanner
          currentScore={currentScore}
          planId={planId}
          onUpgradeClick={() => setPricingOpen(true)}
        />
        {/* Story 7.3 — upgrade prompt for free-tier users past Kid cap (FR36) */}
        <UpgradePrompt
          currentScore={currentScore}
          currentStage={currentStage}
          planId={planId}
          onUpgradeClick={() => setPricingOpen(true)}
        />
        <BrainCoachingCard coaching={brainState.latestCoachingMessage} />
        <VacationModeToggle />
        <TextOnlyModeToggle enabled={textOnlyBrain} onToggle={setTextOnlyBrain} />
        <ReducedMotionToggle enabled={appReducedMotion} onToggle={setReducedMotion} />
        <BrainDeleteButton onBack={onBack} />
        {scoreTimeline && scoreTimeline.length > 0 && (
          <HudTimeline data={scoreTimeline} />
        )}
      </section>
    </div>
  );

  if (reducedMotion) {
    return (
      <div className="fixed inset-0 z-60 overflow-hidden brain-dimension-bg">
        {content}
        <CinematicEngine />
        {/* Story 7.2/7.3 — pricing modal triggered by SoftCeilingBanner (FR35) and UpgradePrompt (FR36) */}
        <PricingPlans open={pricingOpen} onClose={() => setPricingOpen(false)} />
      </div>
    );
  }

  return (
    <motion.div
      className="fixed inset-0 z-60 overflow-hidden brain-dimension-bg"
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
    >
      {content}
      <CinematicEngine />
      {/* Story 7.2 — pricing modal wired from SoftCeilingBanner upgrade link (FR35) */}
      <PricingPlans open={pricingOpen} onClose={() => setPricingOpen(false)} />
    </motion.div>
  );
}
