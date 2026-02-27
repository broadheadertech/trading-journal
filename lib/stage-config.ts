import type { Stage } from './types';

// ─── Stage Color Palettes (UX Spec, NFR13 colorblind-safe) ─────────

export interface StageColorPalette {
  accent: string;
  accentGlow: string;
  bgTint: string;
}

export const STAGE_ORDER: Stage[] = [
  'beginner', 'intern', 'advance', 'professional', 'advance-professional', 'guru',
];

/** Client-side stage thresholds — mirrors convex/lib/neuroScore.ts for display only. */
export const STAGE_THRESHOLDS: { stage: Stage; min: number }[] = [
  { stage: 'guru', min: 800 },
  { stage: 'advance-professional', min: 600 },
  { stage: 'professional', min: 400 },
  { stage: 'advance', min: 200 },
  { stage: 'intern', min: 100 },
  { stage: 'beginner', min: 0 },
];

export const STAGE_COLORS: Record<Stage, StageColorPalette> = {
  'beginner':              { accent: 'hsl(340, 60%, 70%)', accentGlow: 'hsl(340 60% 70% / 0.15)', bgTint: 'hsl(340, 5%, 9%)' },
  'intern':                { accent: 'hsl(200, 70%, 65%)', accentGlow: 'hsl(200 70% 65% / 0.15)', bgTint: 'hsl(200, 5%, 9%)' },
  'advance':               { accent: 'hsl(142, 60%, 55%)', accentGlow: 'hsl(142 60% 55% / 0.15)', bgTint: 'hsl(142, 5%, 9%)' },
  'professional':          { accent: 'hsl(270, 65%, 60%)', accentGlow: 'hsl(270 65% 60% / 0.15)', bgTint: 'hsl(270, 5%, 9%)' },
  'advance-professional':  { accent: 'hsl(45, 80%, 55%)',  accentGlow: 'hsl(45 80% 55% / 0.15)',  bgTint: 'hsl(45, 5%, 9%)' },
  'guru':                  { accent: 'hsl(45, 50%, 85%)',  accentGlow: 'hsl(45 50% 85% / 0.20)',  bgTint: 'hsl(45, 8%, 10%)' },
};

export function getStageColors(stage: Stage): StageColorPalette {
  return STAGE_COLORS[stage];
}

// ─── Stage Patterns (Story 9.3 — FR45, NFR13 colorblind-distinguishable) ──

export interface StagePattern {
  id: string;
  label: string;
}

/**
 * 6 visually distinct SVG patterns — each distinguishable in grayscale.
 * Pattern SVG elements are rendered by SingleStagePatternDef() in PatternDefs.tsx.
 */
export const STAGE_PATTERNS: Record<Stage, StagePattern> = {
  'beginner':              { id: 'stage-pattern-beginner',              label: 'Horizontal lines' },
  'intern':                { id: 'stage-pattern-intern',                label: 'Crosshatch' },
  'advance':               { id: 'stage-pattern-advance',              label: 'Polka dots' },
  'professional':          { id: 'stage-pattern-professional',          label: 'Wavy lines' },
  'advance-professional':  { id: 'stage-pattern-advance-professional',  label: 'Vertical lines' },
  'guru':                  { id: 'stage-pattern-guru',                  label: 'Diamonds' },
};
