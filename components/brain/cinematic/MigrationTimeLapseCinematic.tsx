'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { STAGE_COLORS } from '@/lib/stage-config';
import type { Stage, StageHistoryEntry } from '@/lib/types';

// ─── Types ──────────────────────────────────────────────────────────────────

type Phase = 'intro' | 'sweep' | 'reveal' | 'exit';

interface Props {
  stageHistory: StageHistoryEntry[];
  finalScore: number;
  tradeCount: number;
  onComplete: () => void;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

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

// ─── MigrationTimeLapseCinematic ────────────────────────────────────────────

export default function MigrationTimeLapseCinematic({
  stageHistory,
  finalScore,
  tradeCount,
  onComplete,
}: Props) {
  const [phase, setPhase] = useState<Phase>('intro');
  const [currentStageIndex, setCurrentStageIndex] = useState(0);
  const [canSkip, setCanSkip] = useState(false);

  // L3 fix: freeze stageHistory at mount so Convex reactive pushes can't restart the sweep
  const frozenHistory = useRef(stageHistory);
  const dialogRef = useRef<HTMLDivElement>(null);

  const finalStage = frozenHistory.current[frozenHistory.current.length - 1]?.stage ?? 'beginner';
  const finalColors = STAGE_COLORS[finalStage];
  const currentStage = frozenHistory.current[currentStageIndex]?.stage ?? 'beginner';

  // ── intro → sweep after 500ms ─────────────────────────────────────────────
  useEffect(() => {
    const t = setTimeout(() => setPhase('sweep'), 500);
    return () => clearTimeout(t);
  }, []);

  // ── sweep: cycle through stages at 400ms each, then reveal ───────────────
  useEffect(() => {
    if (phase !== 'sweep') return;
    const history = frozenHistory.current;
    let idx = 0;
    const interval = setInterval(() => {
      idx++;
      if (idx >= history.length) {
        clearInterval(interval);
        setPhase('reveal');
      } else {
        setCurrentStageIndex(idx);
      }
    }, 400);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // ── reveal → exit → onComplete ───────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'reveal') return;
    const timers = [
      setTimeout(() => setPhase('exit'), 3000),
      setTimeout(onComplete, 3500),
    ];
    return () => timers.forEach(clearTimeout);
  }, [phase, onComplete]);

  // ── Skip enable after 2s ──────────────────────────────────────────────────
  useEffect(() => {
    const t = setTimeout(() => setCanSkip(true), 2000);
    return () => clearTimeout(t);
  }, []);

  // ── ESC key skip ──────────────────────────────────────────────────────────
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

  return (
    // z-[70] — above BrainTab's z-60 wrapper
    <motion.div
      ref={dialogRef}
      tabIndex={-1}
      className="fixed inset-0 z-[70] flex flex-col items-center justify-center overflow-hidden outline-none"
      initial={{ opacity: 0 }}
      animate={{ opacity: phase === 'exit' ? 0 : 1 }}
      transition={{ duration: 0.3 }}
      onClick={() => canSkip && onComplete()}
      role="dialog"
      aria-modal="true"
      aria-label="Replaying your trading journey"
      aria-busy={phase === 'sweep'}
    >
      {/* ── Dark base ── */}
      <div className="absolute inset-0 bg-[#020208]" />

      {/* ── Stage background sweep — key change forces re-animation per stage ── */}
      <AnimatePresence>
        {(phase === 'sweep' || phase === 'intro') && (
          <motion.div
            key={`bg-${currentStageIndex}`}
            className="absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            style={{
              background: `radial-gradient(ellipse at 50% 40%, ${STAGE_COLORS[currentStage].accentGlow}, #020208 60%)`,
            }}
          />
        )}
      </AnimatePresence>

      {/* ── Final stage background (reveal/exit) ── */}
      <AnimatePresence>
        {(phase === 'reveal' || phase === 'exit') && (
          <motion.div
            key="bg-final"
            className="absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            style={{
              background: `radial-gradient(ellipse at 50% 35%, ${finalColors.accentGlow}, #020208 55%)`,
            }}
          />
        )}
      </AnimatePresence>

      {/* ── Core content ── */}
      <div className="relative z-10 flex flex-col items-center text-center px-8 select-none w-full max-w-sm">

        {/* ── Intro phase: "Replaying your trading journey..." ── */}
        <AnimatePresence>
          {phase === 'intro' && (
            <motion.p
              key="intro-text"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.4 }}
              className="text-sm text-white/50 tracking-wide"
            >
              Replaying your trading journey…
            </motion.p>
          )}
        </AnimatePresence>

        {/* ── Sweep phase: current stage name cycling ── */}
        <AnimatePresence mode="wait">
          {phase === 'sweep' && (
            <motion.div
              key={`stage-label-${currentStageIndex}`}
              initial={{ opacity: 0, scale: 0.7, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 1.2, y: -12 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-col items-center gap-2"
            >
              <p className="text-[10px] uppercase tracking-[0.4em] text-white/30">
                Stage Reached
              </p>
              <p
                className="text-5xl sm:text-6xl font-black tracking-tight capitalize"
                style={{
                  color: STAGE_COLORS[currentStage].accent,
                  textShadow: `0 0 60px ${STAGE_COLORS[currentStage].accentGlow}`,
                }}
              >
                {stageLabel(currentStage)}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Reveal phase: summary card ── */}
        <AnimatePresence>
          {(phase === 'reveal' || phase === 'exit') && (
            <motion.div
              key="reveal-card"
              initial={{ opacity: 0, scale: 0.88, y: 24 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-col items-center gap-4 w-full"
            >
              {/* Label */}
              <p className="text-[10px] uppercase tracking-[0.4em] text-white/35">
                Your Journey
              </p>

              {/* Final stage name */}
              <p
                className="text-5xl sm:text-6xl font-black tracking-tight capitalize leading-none"
                style={{
                  color: finalColors.accent,
                  textShadow: `0 0 60px ${finalColors.accentGlow}, 0 0 24px ${finalColors.accentGlow}`,
                }}
              >
                {stageLabel(finalStage)} Brain
              </p>

              {/* Score + trades */}
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.25 }}
                className="flex flex-col items-center gap-1"
              >
                <p className="text-xl font-semibold text-white/80">
                  Neuro Score: {finalScore}
                </p>
                <p className="text-sm text-white/45">
                  {tradeCount} trade{tradeCount !== 1 ? 's' : ''} in your history
                </p>
              </motion.div>

              {/* Stage milestone list */}
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.45 }}
                className="flex flex-col gap-1.5 w-full mt-1 px-4"
                aria-label="Stage milestones"
                aria-atomic="true"
              >
                {frozenHistory.current.map((entry) => (
                  <div
                    key={String(entry.reachedAt)}
                    className="flex items-center justify-between text-xs"
                  >
                    <span
                      className="capitalize font-medium"
                      style={{ color: STAGE_COLORS[entry.stage].accent }}
                    >
                      {stageLabel(entry.stage)}
                    </span>
                    <span className="text-white/35">
                      {new Date(entry.reachedAt).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Skip hint — fades in after 2s */}
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
