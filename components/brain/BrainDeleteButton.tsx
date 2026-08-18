'use client';

import { useEffect, useRef, useState } from 'react';
import { useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';

// ─── Story 9.5 — Brain State Deletion (FR48, NFR11) ─────────────────────────
// Danger-styled button with inline confirmation dialog.
// Cascade deletes brainStates, scoreEvents, dailySnapshots.
// Trade data is NOT affected.

/* ── ATLAS raw tokens (brain dimension is position:fixed — see BrainMiniWidget) ── */
const T = {
  hair: '#101922',
  panel2: '#0c1119',
  line: '#182432',
  red: '#ff4d5e',
  text: '#edf2f7',
  muted: '#7f8ea3',
  muted2: '#5c6b7e',
  muted3: '#4a5867',
  display: "'Archivo',system-ui,sans-serif",
};

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
        style={{
          position: 'relative',
          border: `1px solid ${T.line}`,
          borderRadius: 2,
          background: T.panel2,
          padding: '15px 18px 17px',
        }}
      >
        {/* red accent rule — ATLAS card accent */}
        <span style={{ position: 'absolute', left: 0, top: -1, width: 44, height: 3, background: T.red }} />
        <h3
          id="brain-delete-title"
          style={{ margin: 0, fontFamily: T.display, fontWeight: 700, fontSize: 15, lineHeight: '16px', color: T.red }}
        >
          Delete Brain State?
        </h3>
        <p
          id="brain-delete-desc"
          style={{ margin: '9px 0 0', fontSize: 12, lineHeight: '18px', color: T.muted2 }}
        >
          This will permanently delete your Neuro Score, evolution history,
          coaching messages, and daily snapshots. Your trade data will NOT be
          affected. You can start fresh with a new brain afterward.
        </p>
        {error && (
          <p style={{ margin: '10px 0 0', fontSize: 11.5, color: T.red }} role="alert">{error}</p>
        )}
        <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
          <button
            onClick={handleDelete}
            disabled={isPending}
            aria-busy={isPending}
            aria-label={isPending ? 'Deleting brain state...' : 'Confirm delete brain state'}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: 32,
              padding: '0 18px',
              borderRadius: 2,
              border: `1px solid ${T.red}`,
              background: 'rgba(255,77,94,.14)',
              color: T.red,
              fontWeight: 700,
              fontSize: 12,
              cursor: isPending ? 'not-allowed' : 'pointer',
              opacity: isPending ? 0.5 : 1,
            }}
          >
            {isPending ? 'Deleting...' : 'Delete Brain State'}
          </button>
          <button
            onClick={() => { setShowConfirm(false); setError(null); }}
            disabled={isPending}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: 32,
              padding: '0 18px',
              borderRadius: 2,
              border: `1px solid ${T.line}`,
              background: 'none',
              color: T.text,
              fontWeight: 700,
              fontSize: 12,
              cursor: isPending ? 'not-allowed' : 'pointer',
              opacity: isPending ? 0.5 : 1,
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

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
      <div>
        <p style={{ margin: 0, fontWeight: 700, fontSize: 9.5, letterSpacing: '.04em', color: T.red }}>
          DELETE BRAIN
        </p>
        <p style={{ margin: '5px 0 0', fontSize: 11, color: T.muted3 }}>
          Remove all brain data, keep trades
        </p>
      </div>
      <button
        onClick={() => setShowConfirm(true)}
        aria-label="Delete brain state"
        style={{
          marginLeft: 'auto',
          flex: 'none',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: 26,
          padding: '0 14px',
          borderRadius: 2,
          border: `1px solid ${T.line}`,
          background: 'none',
          color: T.red,
          fontWeight: 700,
          fontSize: 10.5,
          letterSpacing: '.04em',
          cursor: 'pointer',
        }}
      >
        DELETE
      </button>
    </div>
  );
}
