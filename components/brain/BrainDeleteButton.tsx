'use client';

import { useEffect, useRef, useState } from 'react';
import { useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';

// ─── Story 9.5 — Brain State Deletion (FR48, NFR11) ─────────────────────────
// Danger-styled button with inline confirmation dialog.
// Cascade deletes brainStates, scoreEvents, dailySnapshots.
// Trade data is NOT affected.

interface BrainDeleteButtonProps {
  onBack?: () => void;
}

export default function BrainDeleteButton({ onBack }: BrainDeleteButtonProps) {
  const deleteBrain = useMutation(api.brain.deleteUserBrainData);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const confirmRef = useRef<HTMLDivElement>(null);

  // M3 fix: ESC dismisses confirmation dialog
  useEffect(() => {
    if (!showConfirm) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isPending) {
        setShowConfirm(false);
        setError(null);
      }
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [showConfirm, isPending]);

  const handleDelete = async () => {
    if (isPending) return;
    setIsPending(true);
    setError(null);
    try {
      await deleteBrain({});
      // Exit brain dimension — next entry triggers EmptyState → re-init → egg hatch
      onBack?.();
    } catch {
      setIsPending(false);
      setError('Failed to delete brain state. Please try again.');
    }
  };

  if (showConfirm) {
    return (
      <div
        ref={confirmRef}
        role="alertdialog"
        aria-labelledby="brain-delete-title"
        aria-describedby="brain-delete-desc"
        className="rounded-xl border border-red-500/30 bg-red-950/30 p-4 space-y-3"
      >
        <h3
          id="brain-delete-title"
          className="text-sm font-semibold text-red-400"
        >
          Delete Brain State?
        </h3>
        <p
          id="brain-delete-desc"
          className="text-xs text-white/50 leading-relaxed"
        >
          This will permanently delete your Neuro Score, evolution history,
          coaching messages, and daily snapshots. Your trade data will NOT be
          affected. You can start fresh with a new brain afterward.
        </p>
        {error && (
          <p className="text-xs text-red-400" role="alert">{error}</p>
        )}
        <div className="flex gap-2">
          <button
            onClick={handleDelete}
            disabled={isPending}
            aria-busy={isPending}
            aria-label={isPending ? 'Deleting brain state...' : 'Confirm delete brain state'}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg
                       bg-red-600 hover:bg-red-500 text-white
                       disabled:opacity-50 disabled:cursor-not-allowed
                       focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30
                       transition-colors cursor-pointer"
          >
            {isPending ? 'Deleting...' : 'Delete Brain State'}
          </button>
          <button
            onClick={() => { setShowConfirm(false); setError(null); }}
            disabled={isPending}
            className="px-3 py-1.5 text-xs font-medium rounded-lg
                       bg-white/5 hover:bg-white/10 text-white/60
                       disabled:opacity-50 disabled:cursor-not-allowed
                       focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30
                       transition-colors cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between px-1 py-0.5">
      <div className="flex flex-col">
        <span className="text-[10px] uppercase tracking-[0.3em] text-red-400/50 font-medium">
          Delete Brain
        </span>
        <span className="text-[10px] text-white/20 mt-0.5">
          Remove all brain data, keep trades
        </span>
      </div>
      <button
        onClick={() => setShowConfirm(true)}
        aria-label="Delete brain state"
        className="flex-shrink-0 px-3 py-1.5 text-[10px] font-semibold rounded-lg
                   bg-red-600/20 hover:bg-red-600/40 text-red-400 border border-red-500/20
                   hover:border-red-500/40
                   focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30
                   transition-colors cursor-pointer"
      >
        Delete
      </button>
    </div>
  );
}
