'use client';

import { motion } from 'framer-motion';
import { useBrainState } from '@/hooks/useBrainState';
import { useProfile } from '@/hooks/useStore';
import { useReducedMotionContext } from './ReducedMotionProvider';
import { STAGE_PATTERNS } from '@/lib/stage-config';
import { SingleStagePatternDef } from './PatternDefs';

interface BrainMiniWidgetProps {
  onNavigate: () => void;
}

/* ── ATLAS raw tokens ────────────────────────────────────────────────────────
   This widget is position:fixed and may be mounted outside the `.atlas-dash`
   scope, so every ATLAS value is inlined rather than referenced by class.     */
const T = {
  amber: '#d99405',
  panel: '#0a0f17',
  line: '#182432',
  line2: '#24344a',
  rail: '#141e2a',
  muted: '#7f8ea3',
  mono: "'Geist Mono', ui-monospace, monospace",
};

/** Stage accent still honours any theme-provided --accent, falling back to ATLAS amber. */
const ACCENT = `var(--accent, ${T.amber})`;

const shellStyle: React.CSSProperties = {
  position: 'fixed',
  zIndex: 50,
  background: T.panel,
  border: `1px solid ${T.line2}`,
  borderRadius: 2,
  cursor: 'pointer',
  boxShadow: '0 8px 28px rgba(0,0,0,.55)',
};

const badgeStyle: React.CSSProperties = {
  ...shellStyle,
  display: 'flex',
  alignItems: 'center',
  gap: 9,
  height: 30,
  padding: '0 14px',
};

const discStyle: React.CSSProperties = {
  ...shellStyle,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 2,
  width: 68,
  height: 68,
  padding: 8,
};

export function BrainMiniWidget({ onNavigate }: BrainMiniWidgetProps) {
  const { brainState, isLoading } = useBrainState();
  const { textOnlyBrain } = useProfile();
  const { isReducedMotion } = useReducedMotionContext();

  if (isLoading) {
    return (
      <div style={{ position: 'fixed', right: 16, bottom: 16, zIndex: 50 }}>
        <div
          className="animate-pulse"
          style={{ width: 68, height: 68, borderRadius: 2, background: T.rail, border: `1px solid ${T.line}` }}
        />
      </div>
    );
  }

  const stage = brainState?.currentStage ?? 'beginner';
  const score = brainState?.currentScore ?? 0;
  const previousScore = brainState?.previousScore ?? 0;
  const STAGE_LABELS: Record<string, string> = {
    'beginner': 'Beginner', 'intern': 'Intern', 'advance': 'Advance',
    'professional': 'Pro', 'advance-professional': 'Adv Pro', 'guru': 'Guru',
  };
  const stageShort = STAGE_LABELS[stage] ?? stage;

  // Story 9.4 — include trending direction in ARIA label
  const trending = score > previousScore ? 'up' : score < previousScore ? 'down' : 'stable';
  const sharedAriaProps = {
    role: 'status' as const,
    'aria-live': 'polite' as const,
    'aria-label': `Brain status: ${stageShort} stage, score ${Math.round(score)} out of 1000, trending ${trending}`,
  };

  const badgeInner = (
    <>
      <span style={{ fontWeight: 700, fontSize: 10, letterSpacing: '.04em', textTransform: 'uppercase', color: ACCENT }}>
        {stageShort}
      </span>
      <span style={{ fontFamily: T.mono, fontWeight: 500, fontSize: 12, color: T.muted }}>
        {Math.round(score)}
      </span>
    </>
  );

  const brainSvg = (
    <svg viewBox="0 0 64 64" width={34} height={34} fill="none" style={{ color: ACCENT, display: 'block' }} aria-hidden="true">
      <defs><SingleStagePatternDef stage={stage} /></defs>
      <path d="M30 8C22 8 16 12 14 18C10 19 7 23 7 28C7 32 9 35 12 37C11 39 10 42 11 45C12 49 16 52 20 53C22 56 26 58 30 58C31 58 32 57.5 32 57.5" stroke={ACCENT} strokeWidth="2.5" strokeLinecap="round" />
      <path d="M34 8C42 8 48 12 50 18C54 19 57 23 57 28C57 32 55 35 52 37C53 39 54 42 53 45C52 49 48 52 44 53C42 56 38 58 34 58C33 58 32 57.5 32 57.5" stroke={ACCENT} strokeWidth="2.5" strokeLinecap="round" />
      <line x1="32" y1="10" x2="32" y2="56" stroke={ACCENT} strokeWidth="1.5" strokeDasharray="3 2" opacity="0.6" />
      <path d="M18 22C22 24 26 22 30 24" stroke={ACCENT} strokeWidth="1.8" strokeLinecap="round" opacity="0.5" />
      <path d="M14 32C19 30 24 33 30 31" stroke={ACCENT} strokeWidth="1.8" strokeLinecap="round" opacity="0.5" />
      <path d="M16 42C21 40 25 43 30 41" stroke={ACCENT} strokeWidth="1.8" strokeLinecap="round" opacity="0.5" />
      <path d="M46 22C42 24 38 22 34 24" stroke={ACCENT} strokeWidth="1.8" strokeLinecap="round" opacity="0.5" />
      <path d="M50 32C45 30 40 33 34 31" stroke={ACCENT} strokeWidth="1.8" strokeLinecap="round" opacity="0.5" />
      <path d="M48 42C43 40 39 43 34 41" stroke={ACCENT} strokeWidth="1.8" strokeLinecap="round" opacity="0.5" />
      <circle cx="20" cy="18" r="2" fill={ACCENT} opacity="0.8" />
      <circle cx="44" cy="18" r="2" fill={ACCENT} opacity="0.8" />
      <circle cx="12" cy="32" r="2" fill={ACCENT} opacity="0.6" />
      <circle cx="52" cy="32" r="2" fill={ACCENT} opacity="0.6" />
      <circle cx="32" cy="14" r="1.5" fill={ACCENT} opacity="0.4" />
      <circle cx="32" cy="50" r="1.5" fill={ACCENT} opacity="0.4" />
      {/* Story 9.3 — colorblind pattern overlay */}
      <circle cx="32" cy="33" r="22" fill={`url(#${STAGE_PATTERNS[stage].id})`} />
    </svg>
  );

  const discInner = (
    <>
      {brainSvg}
      <span style={{ fontFamily: T.mono, fontWeight: 500, fontSize: 11, lineHeight: '13px', color: ACCENT }}>
        {score}
      </span>
    </>
  );

  // Story 9.1 — text badge mode (AC #4)
  if (textOnlyBrain) {
    // Story 9.2 — render plain <button> when reduced motion is active (FR44)
    if (isReducedMotion) {
      return (
        <button
          onClick={onNavigate}
          style={{ ...badgeStyle, right: 16, bottom: 16 }}
          {...sharedAriaProps}
        >
          {badgeInner}
        </button>
      );
    }
    return (
      <motion.button
        whileTap={{ scale: 0.95 }}
        onClick={onNavigate}
        style={{ ...badgeStyle, right: 16, bottom: 16 }}
        {...sharedAriaProps}
      >
        {badgeInner}
      </motion.button>
    );
  }

  // Story 9.2 — render plain <button> when reduced motion is active (FR44)
  if (isReducedMotion) {
    return (
      <button
        onClick={onNavigate}
        style={{ ...discStyle, right: 16, bottom: 16 }}
        {...sharedAriaProps}
      >
        {discInner}
      </button>
    );
  }

  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      onClick={onNavigate}
      className="brain-pulse"
      style={{
        ...discStyle,
        right: 16,
        bottom: 16,
        filter: 'brightness(var(--brain-dimming, 1)) saturate(var(--brain-dimming, 1))',
        transition: 'filter 0.5s ease',
      }}
      {...sharedAriaProps}
    >
      {/* amber rule mirrors the ATLAS card accent */}
      <span style={{ position: 'absolute', left: 0, top: -1, width: 24, height: 2.5, background: ACCENT }} />
      {discInner}
    </motion.button>
  );
}
