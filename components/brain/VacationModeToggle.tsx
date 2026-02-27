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
    <div className="flex items-center justify-between px-1 py-0.5">
      {/* Left: status label */}
      <AnimatePresence mode="wait">
        {isVacationMode ? (
          <motion.div
            key="active"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col"
          >
            <span className="text-[10px] uppercase tracking-[0.3em] text-amber-400/70 font-medium">
              Vacation Mode
            </span>
            {vacationStartedAt && (
              <span className="text-[10px] text-amber-400/40 mt-0.5">
                Paused since {formatSince(vacationStartedAt)}
              </span>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="inactive"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col"
          >
            <span className="text-[10px] uppercase tracking-[0.3em] text-white/25 font-medium">
              Vacation Mode
            </span>
            <span className="text-[10px] text-white/20 mt-0.5">
              Freeze your score while away
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Right: toggle pill */}
      <button
        onClick={handleToggle}
        disabled={isPending}
        aria-pressed={isVacationMode}
        aria-label={isVacationMode ? 'Deactivate vacation mode' : 'Activate vacation mode'}
        className={`
          relative flex-shrink-0 w-10 h-5 rounded-full transition-colors duration-300 cursor-pointer
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30
          disabled:opacity-50 disabled:cursor-not-allowed
          ${isVacationMode
            ? 'bg-amber-500/40 border border-amber-400/30'
            : 'bg-white/8 border border-white/10'
          }
        `}
      >
        <motion.span
          layout
          transition={{ type: 'spring', stiffness: 500, damping: 35 }}
          className={`
            absolute top-0.5 w-4 h-4 rounded-full
            ${isVacationMode ? 'bg-amber-400' : 'bg-white/30'}
          `}
          style={{ left: isVacationMode ? 'calc(100% - 1.125rem)' : '0.125rem' }}
          aria-hidden="true"
        />
      </button>
    </div>
  );
}
