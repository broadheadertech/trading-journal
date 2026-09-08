'use client';

import { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { motion } from 'framer-motion';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts';
import { ArrowLeft } from '@phosphor-icons/react';
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

// ─── ATLAS raw tokens ────────────────────────────────────────────────
// The brain dimension is a position:fixed surface that may mount outside the
// `.atlas-dash` scope, so ATLAS values are inlined (same as BrainMiniWidget).
const T = {
  panel: '#0a0f17',
  panel2: '#0c1119',
  line: '#182432',
  line2: '#24344a',
  rail: '#141e2a',
  amber: '#d99405',
  green: '#24c88a',
  red: '#ff4d5e',
  text: '#edf2f7',
  text2: '#9fb0c2',
  muted: '#7f8ea3',
  muted2: '#5c6b7e',
  muted3: '#4a5867',
  display: "'Archivo',system-ui,sans-serif",
  mono: "'Geist Mono',ui-monospace,monospace",
};

/** Stage accent still honours any theme-provided --accent, falling back to ATLAS amber. */
const ACCENT = `var(--accent, ${T.amber})`;

const LBL: React.CSSProperties = {
  margin: 0,
  fontWeight: 700,
  fontSize: 9.5,
  letterSpacing: '.04em',
  color: T.muted2,
};

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
      className="absolute top-4 left-4 z-10 group cursor-pointer"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 9,
        height: 32,
        padding: '0 16px',
        borderRadius: 2,
        border: `1px solid ${T.line2}`,
        background: T.panel,
        color: T.text,
        fontWeight: 700,
        fontSize: 12,
      }}
      aria-label="Return to dashboard"
    >
      <ArrowLeft size={15} className="group-hover:-translate-x-0.5 transition-transform" />
      <span className="hidden sm:inline">Back</span>
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
      <div className="animate-pulse" style={{ width: 128, height: 128, borderRadius: 2, background: T.rail, border: `1px solid ${T.line}` }} />
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
    <section
      className="absolute top-16 sm:top-16 left-4 sm:left-6 z-10"
      aria-label="Neuro Score"
      style={{
        position: 'absolute',
        border: `1px solid ${T.line}`,
        borderRadius: 2,
        background: T.panel,
        padding: '13px 20px 15px',
      }}
    >
      <span style={{ position: 'absolute', left: 0, top: -1, width: 44, height: 2.5, background: ACCENT }} />
      <p style={LBL} aria-hidden="true">NEURO SCORE</p>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginTop: 4 }}>
        <span style={{ fontFamily: T.mono, fontWeight: 500, fontSize: 38, lineHeight: '46px', color: T.text }}>
          {Math.round(score)}
        </span>
        <span style={{ fontFamily: T.mono, fontWeight: 500, fontSize: 12.5, color: delta >= 0 ? T.green : T.red }}>
          {deltaSign}{delta.toFixed(1)}
        </span>
      </div>
      <div style={{ display: 'flex', gap: 18, marginTop: 6, fontSize: 10.5, color: T.muted2 }}>
        <span>
          STREAK{' '}
          <strong style={{ fontFamily: T.mono, fontWeight: 500, color: T.text2 }}>{streakDays}d</strong>
        </span>
        <span>
          MULTI{' '}
          <strong style={{ fontFamily: T.mono, fontWeight: 500, color: T.text2 }}>{multiplier.toFixed(2)}x</strong>
        </span>
      </div>
    </section>
  );
}

// ─── HUD: Stage Badge (top-right) ────────────────────────────────────

function HudStage({ stage, score }: { stage: Stage; score: number }) {
  const currentIdx = STAGE_ORDER.indexOf(stage);

  return (
    <section
      className="absolute top-16 sm:top-16 right-4 sm:right-6 z-10 text-right"
      aria-label="Brain stage"
      style={{
        position: 'absolute',
        border: `1px solid ${T.line}`,
        borderRadius: 2,
        background: T.panel,
        padding: '13px 20px 15px',
      }}
    >
      <span style={{ position: 'absolute', right: 0, top: -1, width: 44, height: 2.5, background: ACCENT }} />
      <p style={LBL} aria-hidden="true">STAGE</p>
      <div
        style={{
          fontFamily: T.display,
          fontWeight: 700,
          fontSize: 26,
          lineHeight: '32px',
          marginTop: 6,
          color: STAGE_COLORS[stage].accent,
        }}
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
                color: active ? STAGE_COLORS[s].accent : T.rail,
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
      <div style={{ marginTop: 8, fontFamily: T.mono, fontWeight: 500, fontSize: 10.5, color: T.muted3 }}>
        {score} / 1000
      </div>
      <div style={{ height: 2, marginTop: 6, background: T.rail, position: 'relative' }} aria-hidden="true">
        <div
          style={{
            position: 'absolute', left: 0, top: 0, bottom: 0,
            width: `${Math.min(100, Math.max(0, (score / 1000) * 100))}%`,
            background: ACCENT,
          }}
        />
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
    <div
      role="img"
      aria-label="Neuro Score timeline chart"
      style={{ border: `1px solid ${T.line}`, borderRadius: 2, background: T.panel2, padding: '10px 12px 4px' }}
    >
    <p style={{ ...LBL, marginBottom: 6 }} aria-hidden="true">SCORE TIMELINE</p>
    <ResponsiveContainer width="100%" height={70}>
      <AreaChart data={chartData}>
        <defs>
          <linearGradient id="hudScoreGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={ACCENT} stopOpacity={0.15} />
            <stop offset="95%" stopColor={ACCENT} stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis dataKey="date" hide />
        <YAxis hide />
        <Tooltip
          contentStyle={{
            background: T.panel,
            border: `1px solid ${T.line2}`,
            borderRadius: '2px',
            color: T.text,
            fontFamily: T.mono,
            fontSize: '12px',
          }}
          labelStyle={{ color: T.muted2, fontSize: '10px' }}
          itemStyle={{ color: ACCENT }}
        />
        <Area
          type="monotone"
          dataKey="score"
          stroke={ACCENT}
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
      <div className="animate-pulse mb-8" style={{ width: 192, height: 192, borderRadius: 2, background: T.rail, border: `1px solid ${T.line}` }} aria-hidden="true" />
      <div className="animate-pulse" style={{ width: 128, height: 14, borderRadius: 2, background: T.rail }} aria-hidden="true" />
    </div>
  );
}

// ─── Empty State ─────────────────────────────────────────────────────

function EmptyState({ onBack }: { onBack?: () => void }) {
  return (
    <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center px-4 brain-dimension-bg" role="region" aria-label="Brain empty state">
      {onBack && <BackButton onBack={onBack} />}
      <div
        style={{
          position: 'relative',
          maxWidth: 460,
          width: '100%',
          border: `1px solid ${T.line2}`,
          borderRadius: 2,
          background: '#070c13',
          padding: '52px 28px 56px',
          textAlign: 'center',
        }}
      >
        {/* ATLAS blank-state corner ticks */}
        <span style={{ position: 'absolute', left: -1, top: -1, width: 14, height: 14, border: `1px solid ${T.line2}`, borderRight: 0, borderBottom: 0 }} />
        <span style={{ position: 'absolute', right: -1, bottom: -1, width: 14, height: 14, border: `1px solid ${T.line2}`, borderLeft: 0, borderTop: 0 }} />
        <div
          style={{
            width: 52, height: 52, margin: '0 auto 26px', borderRadius: 3,
            border: `1px solid ${T.line2}`, background: T.panel2,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <BrainMascot size={30} aria-hidden="true" />
        </div>
        <h2 style={{ margin: 0, fontFamily: T.display, fontWeight: 700, fontSize: 22, lineHeight: '24px', color: T.text }}>
          Your Brain is Waiting
        </h2>
        <p style={{ margin: '14px 0 0', fontSize: 13.5, lineHeight: '20px', color: T.muted }}>
          Start logging trades to grow your brain! Each trade, reflection, and disciplined decision shapes your neural score.
        </p>
      </div>
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
      <section
        className="flex-shrink-0 px-4 sm:px-8 pt-2 pb-3"
        aria-label="Brain controls and coaching"
        style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 576, width: '100%', margin: '0 auto' }}
      >
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
        <div style={{ border: `1px solid ${T.line}`, borderRadius: 2, background: T.panel, padding: '4px 18px 6px' }}>
          <VacationModeToggle />
          <TextOnlyModeToggle enabled={textOnlyBrain} onToggle={setTextOnlyBrain} />
          <ReducedMotionToggle enabled={appReducedMotion} onToggle={setReducedMotion} />
          <BrainDeleteButton onBack={onBack} />
        </div>
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
