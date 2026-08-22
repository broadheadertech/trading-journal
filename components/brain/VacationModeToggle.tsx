'use client';

import { useState } from 'react';
import { useMutation } from 'convex/react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '@/convex/_generated/api';
import { useBrainState } from '@/hooks/useBrainState';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatSince(ts: number): string {
  return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

/* ── ATLAS raw tokens (see ReducedMotionToggle for rationale) ───────────────── */
const T = {
  hair: '#101922',
  line: '#182432',
  rail: '#141e2a',
  amber: '#d99405',
  muted: '#7f8ea3',
  muted2: '#5c6b7e',
  muted3: '#4a5867',
};

// ─── VacationModeToggle ───────────────────────────────────────────────────────

export default function VacationModeToggle() {
  const { brainState } = useBrainState();
  const activate = useMutation(api.brain.activateVacationMode);
  const deactivate = useMutation(api.brain.deactivateVacationMode);
  const [isPending, setIsPending] = useState(false);

  if (!brainState) return null;

  const { isVacationMode, vacationStartedAt } = brainState;

  const handleToggle = async () => {
    if (isPending) return;
    setIsPending(true);
    try {
      if (isVacationMode) await deactivate({});
      else await activate({});
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        padding: '10px 0',
        borderBottom: `1px solid ${T.hair}`,
      }}
    >
      {/* Left: status label */}
      <AnimatePresence mode="wait">
        {isVacationMode ? (
          <motion.div
            key="active"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2 }}
          >
            <p style={{ margin: 0, fontWeight: 700, fontSize: 9.5, letterSpacing: '.04em', color: T.amber }}>
              VACATION MODE
            </p>
            {vacationStartedAt && (
              <p style={{ margin: '5px 0 0', fontSize: 11, color: T.muted2 }}>
                Paused since {formatSince(vacationStartedAt)}
              </p>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="inactive"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2 }}
          >
            <p style={{ margin: 0, fontWeight: 700, fontSize: 9.5, letterSpacing: '.04em', color: T.muted2 }}>
              VACATION MODE
            </p>
            <p style={{ margin: '5px 0 0', fontSize: 11, color: T.muted3 }}>
              Freeze your score while away
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Right: toggle pill */}
      <button
        onClick={handleToggle}
        disabled={isPending}
        aria-pressed={isVacationMode}
        aria-label={isVacationMode ? 'Deactivate vacation mode' : 'Activate vacation mode'}
        style={{
          position: 'relative',
          marginLeft: 'auto',
          flex: 'none',
          width: 38,
          height: 20,
          borderRadius: 2,
          cursor: isPending ? 'not-allowed' : 'pointer',
          opacity: isPending ? 0.5 : 1,
          transition: 'background .25s, border-color .25s',
          background: isVacationMode ? 'rgba(217,148,5,.18)' : T.rail,
          border: `1px solid ${isVacationMode ? T.amber : T.line}`,
        }}
      >
        <motion.span
          layout
          transition={{ type: 'spring', stiffness: 500, damping: 35 }}
          aria-hidden="true"
          style={{
            position: 'absolute',
            top: 2,
            left: isVacationMode ? 'calc(100% - 16px)' : 2,
            width: 14,
            height: 14,
            borderRadius: 1,
            background: isVacationMode ? T.amber : T.muted,
          }}
        />
      </button>
    </div>
  );
}
