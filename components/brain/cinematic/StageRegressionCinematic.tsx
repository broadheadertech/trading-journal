'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { STAGE_COLORS } from '@/lib/stage-config';
import type { Stage } from '@/lib/types';

// ─── Types ──────────────────────────────────────────────────────────────────

type Phase = 'enter' | 'transform' | 'welcome' | 'exit';

interface Props {
  fromStage: Stage;
  toStage: Stage;
  coachingMessage: string | null;
  recoveryLockUntil: number | null;
  onComplete: () => void;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function stageLabel(s: Stage): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// Pre-compute 8 particle origins at module level — implode inward toward centre
const PARTICLES = Array.from({ length: 8 }, (_, i) => ({
  angle: (i / 8) * Math.PI * 2,
  distance: 180 + (i % 3) * 30, // 180 / 210 / 240 / 180 / 210 / 240 / 180 / 210
}));

// ─── StageRegressionCinematic ───────────────────────────────────────────────

export default function StageRegressionCinematic({
  fromStage,
  toStage,
  coachingMessage,
  recoveryLockUntil,
  onComplete,
}: Props) {
  const [phase, setPhase] = useState<Phase>('enter');
  const [canSkip, setCanSkip] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);

  const fromColors = STAGE_COLORS[fromStage];
  const toColors = STAGE_COLORS[toStage];

  // ── Phase timeline (mirrors evolution — same timing contract) ────────────
  // enter(0–0.8s) → transform(0.8–2.2s) → welcome(2.2–3.4s) → exit(3.4–4.0s) → onComplete
  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase('transform'), 800),
      setTimeout(() => setPhase('welcome'), 2200),
      setTimeout(() => setPhase('exit'), 3400),
      setTimeout(onComplete, 4000),
    ];
    return () => timers.forEach(clearTimeout);
  }, [onComplete]);

  // ── Skip enable after 1 second ───────────────────────────────────────────
  useEffect(() => {
    const t = setTimeout(() => setCanSkip(true), 1000);
    return () => clearTimeout(t);
  }, []);

  // ── ESC key skip ─────────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && canSkip) onComplete();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [canSkip, onComplete]);

  // Story 9.4 — focus the dialog on mount for screen reader announcement
  useEffect(() => {
    dialogRef.current?.focus();
  }, []);

  const hasLock = recoveryLockUntil !== null && recoveryLockUntil > Date.now();

  return (
    // z-[70] — above BrainTab's z-60 wrapper (matches evolution z-index)
    <motion.div
      ref={dialogRef}
      tabIndex={-1}
      className="fixed inset-0 z-70 flex flex-col items-center justify-center overflow-hidden outline-none"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      onClick={() => canSkip && onComplete()}
      role="dialog"
      aria-modal="true"
      aria-label={`Stage regressed from ${stageLabel(fromStage)} to ${stageLabel(toStage)}`}
    >
      {/* ── Background color morph — fromStage fades into toStage ── */}
      {/* Regression uses a darker, cooler background to feel heavier than evolution */}
      <motion.div
        className="absolute inset-0"
        initial={{
          background: `radial-gradient(ellipse at 50% 40%, ${fromColors.accentGlow}, #020208 60%)`,
        }}
        animate={{
          background: `radial-gradient(ellipse at 50% 60%, ${toColors.accentGlow}, #010105 70%)`,
        }}
        transition={{ duration: 1.8, delay: 0.5, ease: 'easeInOut' }}
      />

      {/* Deeper dark overlay — regression feels heavier than evolution */}
      <div className="absolute inset-0 bg-black/80" />

      {/* ── Particle implosion ring — fires during transform phase ── */}
      {/* Particles start outside and converge inward (inverse of evolution burst) */}
      <AnimatePresence>
        {phase === 'transform' && (
          <div
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
            aria-hidden="true"
          >
            {PARTICLES.map(({ angle, distance }, i) => (
              <motion.div
                key={i}
                className="absolute w-2 h-2 rounded-full"
                style={{
                  background: fromColors.accent,
                  boxShadow: `0 0 14px ${fromColors.accent}`,
                }}
                // Start at ring perimeter, implode to centre
                initial={{
                  x: Math.cos(angle) * distance,
                  y: Math.sin(angle) * distance,
                  scale: 1.2,
                  opacity: 0.8,
                }}
                animate={{
                  x: 0,
                  y: 0,
                  scale: [1.2, 0.4, 0],
                  opacity: [0.8, 0.5, 0],
                }}
                // GPU: x/y/scale all use transform under the hood → no layout thrash
                transition={{ duration: 1.4, ease: 'easeIn', delay: i * 0.03 }}
              />
            ))}
          </div>
        )}
      </AnimatePresence>

      {/* ── Core content ── */}
      <div className="relative z-10 flex flex-col items-center text-center px-8 select-none">

        {/* Stage name: old fades out, new scales in (mirrors evolution) */}
        <div className="min-h-[80px] flex items-center justify-center mb-2">
          <AnimatePresence mode="wait">
            {phase === 'enter' && (
              <motion.div
                key="from-stage"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20, scale: 1.1 }}
                transition={{ duration: 0.45 }}
                className="text-3xl font-semibold capitalize"
                style={{ color: fromColors.accent }}
              >
                {stageLabel(fromStage)}
              </motion.div>
            )}
            {(phase === 'transform' || phase === 'welcome' || phase === 'exit') && (
              <motion.div
                key="to-stage"
                // Regression scales down (contracts inward) rather than up
                initial={{ opacity: 0, scale: 1.4, y: -8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
                className="text-6xl sm:text-7xl font-black tracking-tight capitalize"
                style={{
                  color: toColors.accent,
                  textShadow: `0 0 40px ${toColors.accentGlow}, 0 0 16px ${toColors.accentGlow}`,
                }}
              >
                {stageLabel(toStage)}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* "Stage Regression" label — appears with coaching */}
        <AnimatePresence>
          {(phase === 'welcome' || phase === 'exit') && (
            <motion.p
              key="label"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="text-[10px] uppercase tracking-[0.4em] text-amber-400/40 mb-4"
            >
              Stage Regression
            </motion.p>
          )}
        </AnimatePresence>

        {/* Coaching message */}
        <AnimatePresence>
          {(phase === 'welcome' || phase === 'exit') && coachingMessage && (
            <motion.p
              key="coaching"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-sm sm:text-base text-white/65 max-w-xs leading-relaxed"
            >
              {coachingMessage}
            </motion.p>
          )}
        </AnimatePresence>

        {/* Recovery lock badge — only shown when lock is active */}
        <AnimatePresence>
          {(phase === 'welcome' || phase === 'exit') && hasLock && (
            <motion.div
              key="recovery-lock"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.25 }}
              className="mt-4 px-3 py-1.5 rounded-full border border-amber-500/30 bg-amber-500/10"
              role="status"
              aria-label="Recovery lock active — stabilise before advancing"
            >
              <p className="text-xs text-amber-400/80 tracking-wide">
                Recovery lock active — stabilise before advancing
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Skip hint — fades in after 1s */}
      <AnimatePresence>
        {canSkip && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
            className="absolute bottom-8 text-xs text-white/20 select-none"
            aria-hidden="true"
          >
            Tap or press ESC to skip
          </motion.p>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
