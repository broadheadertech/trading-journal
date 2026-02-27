'use client';

// Shared text-only mode toggle — used in both BrainTab and TextOnlyBrainTab (Story 9.1)

interface TextOnlyModeToggleProps {
  enabled: boolean;
  onToggle: (v: boolean) => void;
}

export default function TextOnlyModeToggle({ enabled, onToggle }: TextOnlyModeToggleProps) {
  return (
    <div className="flex items-center justify-between px-1 py-0.5">
      <div className="flex flex-col">
        <span className="text-[10px] uppercase tracking-[0.3em] text-white/25 font-medium">
          Text-Only Mode
        </span>
        <span className="text-[10px] text-white/20 mt-0.5">
          {enabled ? 'Visual brain disabled' : 'Show visual brain'}
        </span>
      </div>
      <button
        onClick={() => onToggle(!enabled)}
        aria-pressed={enabled}
        aria-label={enabled ? 'Disable text-only mode' : 'Enable text-only mode'}
        className={`
          relative flex-shrink-0 w-10 h-5 rounded-full transition-colors duration-300 cursor-pointer
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30
          ${enabled
            ? 'bg-emerald-500/40 border border-emerald-400/30'
            : 'bg-white/8 border border-white/10'
          }
        `}
      >
        <span
          className={`
            absolute top-0.5 w-4 h-4 rounded-full transition-all duration-300
            ${enabled ? 'bg-emerald-400 left-[calc(100%-1.125rem)]' : 'bg-white/30 left-[0.125rem]'}
          `}
          aria-hidden="true"
        />
      </button>
    </div>
  );
}
