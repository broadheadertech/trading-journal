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

export function BrainMiniWidget({ onNavigate }: BrainMiniWidgetProps) {
  const { brainState, isLoading } = useBrainState();
  const { textOnlyBrain } = useProfile();
  const { isReducedMotion } = useReducedMotionContext();

  if (isLoading) {
    return (
      <div className="fixed bottom-4 right-4 sm:bottom-4 sm:right-4 z-50">
        <div className="w-12 h-12 sm:w-20 sm:h-20 rounded-full bg-[var(--muted)] animate-pulse" />
      </div>
    );
  }

  const stage = brainState?.currentStage ?? 'baby';
  const score = brainState?.currentScore ?? 0;
  const previousScore = brainState?.previousScore ?? 0;
  const stageShort = stage.charAt(0).toUpperCase() + stage.slice(1);

  // Story 9.4 — include trending direction in ARIA label
  const trending = score > previousScore ? 'up' : score < previousScore ? 'down' : 'stable';
  const sharedAriaProps = {
    role: 'status' as const,
    'aria-live': 'polite' as const,
    'aria-label': `Brain status: ${stageShort} stage, score ${Math.round(score)} out of 1000, trending ${trending}`,
  };

  // Story 9.1 — text badge mode (AC #4)
  if (textOnlyBrain) {
    // Story 9.2 — render plain <button> when reduced motion is active (FR44)
    if (isReducedMotion) {
      return (
        <button
          onClick={onNavigate}
          className="fixed bottom-3 right-3 sm:bottom-4 sm:right-4 z-50
                     rounded-xl px-3 py-2
                     bg-[var(--card)]/80 backdrop-blur-sm border border-[var(--border)]
                     cursor-pointer
                     flex items-center gap-1.5
                     focus:outline-2 focus:outline-[var(--accent)] focus:outline-offset-2"
          {...sharedAriaProps}
        >
          <span className="text-xs font-semibold text-[var(--accent)]">{stageShort}</span>
          <span className="text-xs font-mono text-[var(--accent)]/70">{Math.round(score)}</span>
        </button>
      );
    }
    return (
      <motion.button
        whileTap={{ scale: 0.95 }}
        onClick={onNavigate}
        className="fixed bottom-3 right-3 sm:bottom-4 sm:right-4 z-50
                   rounded-xl px-3 py-2
                   bg-[var(--card)]/80 backdrop-blur-sm border border-[var(--border)]
                   cursor-pointer
                   flex items-center gap-1.5
                   focus:outline-2 focus:outline-[var(--accent)] focus:outline-offset-2"
        {...sharedAriaProps}
      >
        <span className="text-xs font-semibold text-[var(--accent)]">{stageShort}</span>
        <span className="text-xs font-mono text-[var(--accent)]/70">{Math.round(score)}</span>
      </motion.button>
    );
  }

  // Story 9.2 — render plain <button> when reduced motion is active (FR44)
  if (isReducedMotion) {
    return (
      <button
        onClick={onNavigate}
        className="fixed bottom-3 right-3 sm:bottom-4 sm:right-4 z-50
                   w-12 h-12 sm:w-20 sm:h-20 rounded-full
                   bg-[var(--card)]/80 backdrop-blur-sm border border-[var(--border)]
                   cursor-pointer
                   flex flex-col items-center justify-center gap-0.5
                   focus:outline-2 focus:outline-[var(--accent)] focus:outline-offset-2"
        {...sharedAriaProps}
      >
        <svg viewBox="0 0 64 64" className="w-6 h-6 sm:w-10 sm:h-10" fill="none" style={{ color: 'var(--accent)' }} aria-hidden="true">
          <defs><SingleStagePatternDef stage={stage} /></defs>
          <path d="M30 8C22 8 16 12 14 18C10 19 7 23 7 28C7 32 9 35 12 37C11 39 10 42 11 45C12 49 16 52 20 53C22 56 26 58 30 58C31 58 32 57.5 32 57.5" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M34 8C42 8 48 12 50 18C54 19 57 23 57 28C57 32 55 35 52 37C53 39 54 42 53 45C52 49 48 52 44 53C42 56 38 58 34 58C33 58 32 57.5 32 57.5" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="32" y1="10" x2="32" y2="56" stroke="var(--accent)" strokeWidth="1.5" strokeDasharray="3 2" opacity="0.6" />
          <path d="M18 22C22 24 26 22 30 24" stroke="var(--accent)" strokeWidth="1.8" strokeLinecap="round" opacity="0.5" />
          <path d="M14 32C19 30 24 33 30 31" stroke="var(--accent)" strokeWidth="1.8" strokeLinecap="round" opacity="0.5" />
          <path d="M16 42C21 40 25 43 30 41" stroke="var(--accent)" strokeWidth="1.8" strokeLinecap="round" opacity="0.5" />
          <path d="M46 22C42 24 38 22 34 24" stroke="var(--accent)" strokeWidth="1.8" strokeLinecap="round" opacity="0.5" />
          <path d="M50 32C45 30 40 33 34 31" stroke="var(--accent)" strokeWidth="1.8" strokeLinecap="round" opacity="0.5" />
          <path d="M48 42C43 40 39 43 34 41" stroke="var(--accent)" strokeWidth="1.8" strokeLinecap="round" opacity="0.5" />
          <circle cx="20" cy="18" r="2" fill="var(--accent)" opacity="0.8" />
          <circle cx="44" cy="18" r="2" fill="var(--accent)" opacity="0.8" />
          <circle cx="12" cy="32" r="2" fill="var(--accent)" opacity="0.6" />
          <circle cx="52" cy="32" r="2" fill="var(--accent)" opacity="0.6" />
          <circle cx="32" cy="14" r="1.5" fill="var(--accent)" opacity="0.4" />
          <circle cx="32" cy="50" r="1.5" fill="var(--accent)" opacity="0.4" />
          {/* Story 9.3 — colorblind pattern overlay */}
          <circle cx="32" cy="33" r="22" fill={`url(#${STAGE_PATTERNS[stage].id})`} />
        </svg>
        <span className="hidden sm:block text-[10px] font-mono text-[var(--accent)] font-bold leading-none">
          {score}
        </span>
      </button>
    );
  }

  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      onClick={onNavigate}
      className="fixed bottom-3 right-3 sm:bottom-4 sm:right-4 z-50
                 w-12 h-12 sm:w-20 sm:h-20 rounded-full
                 bg-[var(--card)]/80 backdrop-blur-sm border border-[var(--border)]
                 brain-pulse cursor-pointer
                 flex flex-col items-center justify-center gap-0.5
                 focus:outline-2 focus:outline-[var(--accent)] focus:outline-offset-2"
      style={{
        filter: 'brightness(var(--brain-dimming, 1)) saturate(var(--brain-dimming, 1))',
        transition: 'filter 0.5s ease',
      }}
      {...sharedAriaProps}
    >
      <svg viewBox="0 0 64 64" className="w-6 h-6 sm:w-10 sm:h-10" fill="none" style={{ color: 'var(--accent)' }} aria-hidden="true">
        <defs><SingleStagePatternDef stage={stage} /></defs>
        <path d="M30 8C22 8 16 12 14 18C10 19 7 23 7 28C7 32 9 35 12 37C11 39 10 42 11 45C12 49 16 52 20 53C22 56 26 58 30 58C31 58 32 57.5 32 57.5" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M34 8C42 8 48 12 50 18C54 19 57 23 57 28C57 32 55 35 52 37C53 39 54 42 53 45C52 49 48 52 44 53C42 56 38 58 34 58C33 58 32 57.5 32 57.5" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="32" y1="10" x2="32" y2="56" stroke="var(--accent)" strokeWidth="1.5" strokeDasharray="3 2" opacity="0.6" />
        <path d="M18 22C22 24 26 22 30 24" stroke="var(--accent)" strokeWidth="1.8" strokeLinecap="round" opacity="0.5" />
        <path d="M14 32C19 30 24 33 30 31" stroke="var(--accent)" strokeWidth="1.8" strokeLinecap="round" opacity="0.5" />
        <path d="M16 42C21 40 25 43 30 41" stroke="var(--accent)" strokeWidth="1.8" strokeLinecap="round" opacity="0.5" />
        <path d="M46 22C42 24 38 22 34 24" stroke="var(--accent)" strokeWidth="1.8" strokeLinecap="round" opacity="0.5" />
        <path d="M50 32C45 30 40 33 34 31" stroke="var(--accent)" strokeWidth="1.8" strokeLinecap="round" opacity="0.5" />
        <path d="M48 42C43 40 39 43 34 41" stroke="var(--accent)" strokeWidth="1.8" strokeLinecap="round" opacity="0.5" />
        <circle cx="20" cy="18" r="2" fill="var(--accent)" opacity="0.8" />
        <circle cx="44" cy="18" r="2" fill="var(--accent)" opacity="0.8" />
        <circle cx="12" cy="32" r="2" fill="var(--accent)" opacity="0.6" />
        <circle cx="52" cy="32" r="2" fill="var(--accent)" opacity="0.6" />
        <circle cx="32" cy="14" r="1.5" fill="var(--accent)" opacity="0.4" />
        <circle cx="32" cy="50" r="1.5" fill="var(--accent)" opacity="0.4" />
        {/* Story 9.3 — colorblind pattern overlay */}
        <circle cx="32" cy="33" r="22" fill={`url(#${STAGE_PATTERNS[stage].id})`} />
      </svg>
      <span className="hidden sm:block text-[10px] font-mono text-[var(--accent)] font-bold leading-none">
        {score}
      </span>
    </motion.button>
  );
}
