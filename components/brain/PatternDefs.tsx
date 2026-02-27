'use client';

import { STAGE_PATTERNS, STAGE_ORDER } from '@/lib/stage-config';
import type { Stage } from '@/lib/types';

/**
 * SVG <defs> block containing all 6 stage patterns.
 * Mount inside any <svg> that needs pattern fills.
 * All strokes/fills use currentColor to inherit the parent's accent color.
 *
 * Story 9.3 — FR45, NFR13 colorblind-distinguishable stage patterns.
 */
export function StagePatternDefs() {
  return (
    <>
      {STAGE_ORDER.map(s => <SingleStagePatternDef key={s} stage={s} />)}
    </>
  );
}

/**
 * Render only the <pattern> defs for a single stage.
 * Useful when an SVG shows only one stage at a time (e.g., BrainMiniWidget).
 * Pass `idSuffix` to avoid duplicate DOM IDs when multiple SVGs define the same stage pattern.
 */
export function SingleStagePatternDef({ stage, idSuffix }: { stage: Stage; idSuffix?: string }) {
  const id = idSuffix ? `${STAGE_PATTERNS[stage].id}-${idSuffix}` : STAGE_PATTERNS[stage].id;

  switch (stage) {
    case 'beginner':
      return (
        <pattern id={id} patternUnits="userSpaceOnUse" width="8" height="8">
          <line x1="0" y1="4" x2="8" y2="4" stroke="currentColor" strokeWidth="1.5" opacity="0.4" />
        </pattern>
      );
    case 'intern':
      return (
        <pattern id={id} patternUnits="userSpaceOnUse" width="8" height="8">
          <line x1="0" y1="0" x2="8" y2="8" stroke="currentColor" strokeWidth="1" opacity="0.35" />
          <line x1="8" y1="0" x2="0" y2="8" stroke="currentColor" strokeWidth="1" opacity="0.35" />
        </pattern>
      );
    case 'advance':
      return (
        <pattern id={id} patternUnits="userSpaceOnUse" width="8" height="8">
          <circle cx="4" cy="4" r="1.5" fill="currentColor" opacity="0.4" />
        </pattern>
      );
    case 'professional':
      return (
        <pattern id={id} patternUnits="userSpaceOnUse" width="12" height="8">
          <path d="M0 4 Q3 1 6 4 Q9 7 12 4" fill="none" stroke="currentColor" strokeWidth="1.2" opacity="0.4" />
        </pattern>
      );
    case 'advance-professional':
      return (
        <pattern id={id} patternUnits="userSpaceOnUse" width="8" height="8">
          <line x1="4" y1="0" x2="4" y2="8" stroke="currentColor" strokeWidth="1.5" opacity="0.4" />
        </pattern>
      );
    case 'guru':
      return (
        <pattern id={id} patternUnits="userSpaceOnUse" width="10" height="10">
          <path d="M5 0 L10 5 L5 10 L0 5 Z" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.35" />
        </pattern>
      );
  }
}
