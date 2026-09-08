'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { ArrowLeft } from '@phosphor-icons/react';
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

// ─── ATLAS raw tokens ────────────────────────────────────────────────
// The brain dimension is a position:fixed surface that may mount outside the
// `.atlas-dash` scope, so ATLAS values are inlined (same as BrainMiniWidget).
const T = {
  panel: '#0a0f17',
  panel2: '#0c1119',
  hair: '#101922',
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
  muted4: '#3a4a5c',
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

const CARD: React.CSSProperties = {
  position: 'relative',
  border: `1px solid ${T.line}`,
  borderRadius: 2,
  background: T.panel,
  padding: '15px 20px 18px',
};

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

// ─── Stage Roadmap ──────────────────────────────────────────────────

function StageRoadmap({ currentStage }: { currentStage: Stage }) {
  const currentIdx = STAGE_ORDER.indexOf(currentStage);
  return (
    <div className="flex flex-wrap gap-1 items-center" style={{ fontSize: 11.5, color: T.muted3 }}>
      {STAGE_ORDER.map((s, idx) => (
        <span key={s} className="flex items-center gap-1">
          {idx > 0 && <span style={{ color: T.muted4 }} aria-hidden="true">&rarr;</span>}
          {/* Story 9.3 — pattern swatch for colorblind differentiation */}
          <svg viewBox="0 0 10 10" className="w-2.5 h-2.5 flex-shrink-0" aria-hidden="true" style={{ color: idx <= currentIdx ? STAGE_COLORS[s].accent : T.rail }}>
            <defs><SingleStagePatternDef stage={s} /></defs>
            <circle cx="5" cy="5" r="5" fill="currentColor" />
            {idx <= currentIdx && <circle cx="5" cy="5" r="5" fill={`url(#${STAGE_PATTERNS[s].id})`} />}
          </svg>
          <span
            style={idx === currentIdx
              ? { fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.04em', color: T.text }
              : idx < currentIdx ? { color: T.muted2 } : undefined}
          >
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
    <section aria-label="Score history" style={CARD}>
      <span style={{ position: 'absolute', left: 0, top: -1, width: 44, height: 2.5, background: ACCENT }} />
      <p style={{ ...LBL, marginBottom: 8 }} aria-hidden="true">SCORE HISTORY</p>
      <ul className="list-none p-0 m-0">
        {entries.map((e, i) => (
          <li
            key={i}
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '10px 0',
              borderBottom: `1px solid ${T.hair}`,
              fontSize: 12.5,
              color: T.text2,
            }}
          >
            <span>{e.date}</span>
            <span style={{ marginLeft: 'auto', fontFamily: T.mono, fontWeight: 500, fontSize: 12.5, color: T.text }}>
              {e.score}
            </span>
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
      <div className="animate-pulse mb-4" style={{ width: 128, height: 14, borderRadius: 2, background: T.rail }} aria-hidden="true" />
      <div className="animate-pulse" style={{ width: 96, height: 10, borderRadius: 2, background: T.rail }} aria-hidden="true" />
    </div>
  );
}

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
        <div className="flex-1 pt-16 px-4 sm:px-8 pb-8 max-w-xl mx-auto w-full" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Neuro Score */}
          <section aria-label="Neuro Score" style={CARD}>
            <span style={{ position: 'absolute', left: 0, top: -1, width: 44, height: 2.5, background: ACCENT }} />
            <p style={LBL} aria-hidden="true">NEURO SCORE</p>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginTop: 4 }}>
              <span style={{ fontFamily: T.mono, fontWeight: 500, fontSize: 44, lineHeight: '57px', color: T.text }}>
                {Math.round(currentScore)}
              </span>
              <span style={{ fontFamily: T.mono, fontWeight: 500, fontSize: 13, color: delta >= 0 ? T.green : T.red }}>
                {deltaSign}{delta.toFixed(1)}
              </span>
            </div>
            <div style={{ display: 'flex', gap: 12, marginTop: 10 }}>
              <div style={{ flex: 1, border: `1px solid ${T.line}`, borderRadius: 2, background: T.panel2, padding: '11px 16px' }}>
                <p style={LBL}>STREAK</p>
                <em style={{ display: 'block', fontStyle: 'normal', fontFamily: T.mono, fontWeight: 500, fontSize: 18, marginTop: 6, color: T.text }}>
                  {streakDays}d
                </em>
              </div>
              <div style={{ flex: 1, border: `1px solid ${T.line}`, borderRadius: 2, background: T.panel2, padding: '11px 16px' }}>
                <p style={LBL}>MULTIPLIER</p>
                <em style={{ display: 'block', fontStyle: 'normal', fontFamily: T.mono, fontWeight: 500, fontSize: 18, marginTop: 6, color: T.text }}>
                  {streakMultiplier.toFixed(2)}x
                </em>
              </div>
            </div>
          </section>

          {/* Stage */}
          <section aria-label="Brain stage" style={CARD}>
            <span style={{ position: 'absolute', left: 0, top: -1, width: 44, height: 2.5, background: ACCENT }} />
            <p style={LBL} aria-hidden="true">STAGE</p>
            <div
              className="capitalize"
              style={{ fontFamily: T.display, fontWeight: 700, fontSize: 30, lineHeight: '33px', margin: '8px 0 14px', color: T.text }}
            >
              {stageLabel(displayStage)}
            </div>
            <StageRoadmap currentStage={displayStage} />
            {nextInfo && (
              <>
                <div style={{ height: 2, marginTop: 16, background: T.rail, position: 'relative' }} aria-hidden="true">
                  <div
                    style={{
                      position: 'absolute', left: 0, top: 0, bottom: 0,
                      width: `${Math.min(100, Math.max(0, (currentScore / nextInfo.nextMin) * 100))}%`,
                      background: ACCENT,
                    }}
                  />
                </div>
                <p style={{ margin: '10px 0 0', fontSize: 11.5, color: T.muted2 }}>
                  Progress:{' '}
                  <span style={{ fontFamily: T.mono, fontWeight: 500, color: T.text2 }}>
                    {Math.round(currentScore)} / {nextInfo.nextMin}
                  </span>
                  {' '}to {stageLabel(nextInfo.nextStage)}
                </p>
              </>
            )}
            {!nextInfo && (
              <>
                <div style={{ height: 2, marginTop: 16, background: T.rail, position: 'relative' }} aria-hidden="true">
                  <div
                    style={{
                      position: 'absolute', left: 0, top: 0, bottom: 0,
                      width: `${Math.min(100, Math.max(0, (currentScore / 1000) * 100))}%`,
                      background: ACCENT,
                    }}
                  />
                </div>
                <p style={{ margin: '10px 0 0', fontSize: 11.5, color: T.muted2 }}>
                  <span style={{ fontFamily: T.mono, fontWeight: 500, color: T.text2 }}>
                    {Math.round(currentScore)} / 1000
                  </span>
                  {' '}— Maximum stage reached
                </p>
              </>
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
          <div style={{ border: `1px solid ${T.line}`, borderRadius: 2, background: T.panel, padding: '4px 20px 6px' }}>
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
