import type { Stage } from './types';

// ─── Stage Color Palettes (UX Spec, NFR13 colorblind-safe) ─────────

export interface StageColorPalette {
  accent: string;
  accentGlow: string;
  bgTint: string;
}

export const STAGE_ORDER: Stage[] = [
  'baby', 'toddler', 'kid', 'teen', 'adult', 'master', 'guru',
];

/** Client-side stage thresholds — mirrors convex/lib/neuroScore.ts for display only. */
export const STAGE_THRESHOLDS: { stage: Stage; min: number }[] = [
  { stage: 'guru', min: 850 },
  { stage: 'master', min: 700 },
  { stage: 'adult', min: 500 },
  { stage: 'teen', min: 350 },
  { stage: 'kid', min: 200 },
  { stage: 'toddler', min: 100 },
  { stage: 'baby', min: 0 },
];

export const STAGE_COLORS: Record<Stage, StageColorPalette> = {
  baby:    { accent: 'hsl(340, 60%, 70%)', accentGlow: 'hsl(340 60% 70% / 0.15)', bgTint: 'hsl(340, 5%, 9%)' },
  toddler: { accent: 'hsl(200, 70%, 65%)', accentGlow: 'hsl(200 70% 65% / 0.15)', bgTint: 'hsl(200, 5%, 9%)' },
  kid:     { accent: 'hsl(142, 60%, 55%)', accentGlow: 'hsl(142 60% 55% / 0.15)', bgTint: 'hsl(142, 5%, 9%)' },
  teen:    { accent: 'hsl(270, 65%, 60%)', accentGlow: 'hsl(270 65% 60% / 0.15)', bgTint: 'hsl(270, 5%, 9%)' },
  adult:   { accent: 'hsl(45, 80%, 55%)',  accentGlow: 'hsl(45 80% 55% / 0.15)',  bgTint: 'hsl(45, 5%, 9%)' },
  master:  { accent: 'hsl(220, 70%, 55%)', accentGlow: 'hsl(220 70% 55% / 0.15)', bgTint: 'hsl(220, 5%, 9%)' },
  guru:    { accent: 'hsl(45, 50%, 85%)',  accentGlow: 'hsl(45 50% 85% / 0.20)',  bgTint: 'hsl(45, 8%, 10%)' },
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
 * 7 visually distinct SVG patterns — each distinguishable in grayscale.
 * Pattern SVG elements are rendered by getStagePatternDef() below.
 */
export const STAGE_PATTERNS: Record<Stage, StagePattern> = {
  baby:    { id: 'stage-pattern-baby',    label: 'Horizontal lines' },
  toddler: { id: 'stage-pattern-toddler', label: 'Crosshatch' },
  kid:     { id: 'stage-pattern-kid',     label: 'Polka dots' },
  teen:    { id: 'stage-pattern-teen',     label: 'Wavy lines' },
  adult:   { id: 'stage-pattern-adult',   label: 'Vertical lines' },
  master:  { id: 'stage-pattern-master',  label: 'Diagonal lines' },
  guru:    { id: 'stage-pattern-guru',    label: 'Diamonds' },
};
