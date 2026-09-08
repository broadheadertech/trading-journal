'use client';

// Shared reduced-motion toggle — used in both BrainTab and TextOnlyBrainTab (Story 9.2)

/* ── ATLAS raw tokens ────────────────────────────────────────────────────────
   Rendered inside the position:fixed brain dimension, which may mount outside
   the `.atlas-dash` scope, so ATLAS values are inlined (same as BrainMiniWidget). */
const T = {
  hair: '#101922',
  line: '#182432',
  rail: '#141e2a',
  green: '#24c88a',
  muted: '#7f8ea3',
  muted2: '#5c6b7e',
  muted3: '#4a5867',
};

interface ReducedMotionToggleProps {
  enabled: boolean;
  onToggle: (v: boolean) => void;
}

export default function ReducedMotionToggle({ enabled, onToggle }: ReducedMotionToggleProps) {
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
        <p style={{ margin: 0, fontWeight: 700, fontSize: 9.5, letterSpacing: '.04em', color: T.muted2 }}>
          REDUCED MOTION
        </p>
        <p style={{ margin: '5px 0 0', fontSize: 11, color: T.muted3 }}>
          {enabled ? 'Animations disabled' : 'Animations enabled'}
        </p>
      </div>
      <button
        onClick={() => onToggle(!enabled)}
        aria-pressed={enabled}
        aria-label={enabled ? 'Disable reduced motion' : 'Enable reduced motion'}
        style={{
          position: 'relative',
          marginLeft: 'auto',
          flex: 'none',
          width: 38,
          height: 20,
          borderRadius: 2,
          cursor: 'pointer',
          transition: 'background .25s, border-color .25s',
          background: enabled ? 'rgba(36,200,138,.18)' : T.rail,
          border: `1px solid ${enabled ? T.green : T.line}`,
        }}
      >
        <span
          aria-hidden="true"
          style={{
            position: 'absolute',
            top: 2,
            left: enabled ? 'calc(100% - 16px)' : 2,
            width: 14,
            height: 14,
            borderRadius: 1,
            background: enabled ? T.green : T.muted,
            transition: 'left .25s',
          }}
        />
      </button>
    </div>
  );
}
