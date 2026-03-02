'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { STAGE_COLORS } from '@/lib/stage-config';

// ─── Types ──────────────────────────────────────────────────────────────────

type Phase = 'dormant' | 'cracking' | 'hatching' | 'revealed' | 'exit';

interface Props {
  onComplete: () => void;
}

// ─── Static constants (module-level to avoid re-calculation per render) ──────

// 8 particle directions for the hatching burst (same pattern as StageEvolutionCinematic)
const PARTICLES = Array.from({ length: 8 }, (_, i) => ({
  angle: (i / 8) * Math.PI * 2,
  distance: 120 + (i % 3) * 20, // 120 / 140 / 160 / 120 / 140 / 160 / 120 / 140
}));

// 3 crack lines radiating from egg center at different angles
const CRACKS = [
  { rotate: -35, top: '25%', left: '48%', length: 38 },
  { rotate: 10,  top: '42%', left: '32%', length: 48 },
  { rotate: 55,  top: '28%', left: '58%', length: 34 },
];

// ─── EggHatchCinematic ───────────────────────────────────────────────────────

export default function EggHatchCinematic({ onComplete }: Props) {
  const [phase, setPhase] = useState<Phase>('dormant');
  const [canSkip, setCanSkip] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);

  const babyColors = STAGE_COLORS['beginner'];

  // ── Phase timeline ────────────────────────────────────────────────────────
  // dormant(0–0.6s) → cracking(0.6–1.8s) → hatching(1.8–3.0s) → revealed(3.0–4.2s) → exit(4.2–5.0s)
  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase('cracking'), 600),
      setTimeout(() => setPhase('hatching'), 1800),
      setTimeout(() => setPhase('revealed'), 3000),
      setTimeout(() => setPhase('exit'), 4200),
      setTimeout(onComplete, 5000),
    ];
    return () => timers.forEach(clearTimeout);
  }, [onComplete]);

  // ── Skip enable after 1.5s ────────────────────────────────────────────────
  useEffect(() => {
    const t = setTimeout(() => setCanSkip(true), 1500);
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
      aria-label="Your Beginner Brain is hatching"
    >
      {/* Story 9.4 — live region announces birth when revealed */}
      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {(phase === 'revealed' || phase === 'exit') ? 'Your Beginner Brain is born! Every rule you follow grows your brain.' : ''}
      </div>

      {/* ── Background radial gradient (GPU-composited) ── */}
      <motion.div
        className="absolute inset-0"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        style={{
          background: `radial-gradient(ellipse at 50% 40%, hsl(340 60% 70% / 0.25), #020208 60%)`,
        }}
        transition={{ duration: 1.2, ease: 'easeOut' }}
      />

      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black/75" />

      {/* ── Particle burst — fires during hatching phase ── */}
      <AnimatePresence>
        {phase === 'hatching' && (
          <div
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
            aria-hidden="true"
          >
            {PARTICLES.map(({ angle, distance }, i) => (
              <motion.div
                key={i}
                className="absolute w-2 h-2 rounded-full"
                style={{
                  background: babyColors.accent,
                  boxShadow: `0 0 12px ${babyColors.accent}`,
                }}
                initial={{ x: 0, y: 0, scale: 0, opacity: 1 }}
                animate={{
                  x: Math.cos(angle) * distance,
                  y: Math.sin(angle) * distance,
                  scale: [0, 1.6, 0],
                  opacity: [1, 0.7, 0],
                }}
                transition={{ duration: 1.2, ease: 'easeOut', delay: i * 0.04 }}
              />
            ))}
          </div>
        )}
      </AnimatePresence>

      {/* ── Core content ── */}
      <div className="relative z-10 flex flex-col items-center text-center px-8 select-none">

        {/* Egg with cracks */}
        <AnimatePresence mode="wait">
          {(phase === 'dormant' || phase === 'cracking') && (
            <motion.div
              key="egg"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: phase === 'dormant' ? [1, 1.03, 1] : 1 }}
              exit={{ opacity: 0, scale: 1.4 }}
              transition={
                phase === 'dormant'
                  ? { duration: 2, repeat: Infinity, ease: 'easeInOut' }
                  : { duration: 0.3 }
              }
              className="relative mb-8"
              style={{ width: 96, height: 128 }}
              aria-hidden="true"
            >
              {/* Egg body */}
              <div
                className="absolute inset-0"
                style={{
                  borderRadius: '50% 50% 50% 50% / 60% 60% 40% 40%',
                  background: `radial-gradient(ellipse at 45% 35%, hsl(340, 80%, 85%), ${babyColors.accent})`,
                  boxShadow: `0 0 40px ${babyColors.accent}44, 0 0 80px ${babyColors.accent}22`,
                }}
              />

              {/* Crack lines — appear in cracking phase */}
              <AnimatePresence>
                {phase === 'cracking' && CRACKS.map(({ rotate, top, left, length }, i) => (
                  <motion.div
                    key={i}
                    className="absolute"
                    style={{
                      top,
                      left,
                      width: length,
                      height: 2,
                      transformOrigin: '0 50%',
                      rotate,
                      background: '#020208',
                      borderRadius: 1,
                    }}
                    initial={{ scaleX: 0, opacity: 0 }}
                    animate={{ scaleX: 1, opacity: 0.85 }}
                    transition={{ duration: 0.35, delay: i * 0.18, ease: 'easeOut' }}
                  />
                ))}
              </AnimatePresence>
            </motion.div>
          )}

          {/* Hatching — egg explodes outward */}
          {phase === 'hatching' && (
            <motion.div
              key="hatching-flash"
              initial={{ scale: 1, opacity: 1 }}
              animate={{ scale: 2.5, opacity: 0 }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className="mb-8"
              style={{ width: 96, height: 128 }}
              aria-hidden="true"
            >
              <div
                className="w-full h-full"
                style={{
                  borderRadius: '50% 50% 50% 50% / 60% 60% 40% 40%',
                  background: babyColors.accent,
                  boxShadow: `0 0 80px ${babyColors.accent}`,
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* "Your Baby Brain is born!" — revealed phase */}
        <AnimatePresence>
          {(phase === 'revealed' || phase === 'exit') && (
            <motion.div
              key="reveal-text"
              initial={{ opacity: 0, scale: 0.7, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-col items-center gap-3"
            >
              {/* Stage label */}
              <p className="text-[10px] uppercase tracking-[0.4em] text-white/40">
                New Brain
              </p>

              <p
                className="text-4xl sm:text-5xl font-black text-white leading-tight text-center"
                style={{
                  textShadow: `0 0 60px ${babyColors.accent}, 0 0 24px ${babyColors.accent}`,
                  color: babyColors.accent,
                }}
              >
                Your Beginner Brain<br />is born!
              </p>

              <motion.p
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="text-sm text-white/55 max-w-xs leading-relaxed text-center mt-1"
              >
                Every rule you follow grows your brain. Let&apos;s begin.
              </motion.p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Skip hint — fades in after 1.5s */}
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
