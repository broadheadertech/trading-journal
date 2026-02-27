'use client';

import { useEffect } from 'react';
import { useBrainState } from '@/hooks/useBrainState';
import { getStageColors } from '@/lib/stage-config';
import type { Stage } from '@/lib/types';

/**
 * Sets CSS custom properties on <body> based on current brain stage (D10).
 * Only overrides --accent, --accent-glow, --bg-tint — all other theme
 * variables (dark/light, P&L colors) remain untouched.
 *
 * Story 3.4: Also sets --brain-dimming (brightness/saturation factor)
 * and --brain-pulse-speed when the daily score delta is negative.
 */
export function StageThemeProvider({ children }: { children: React.ReactNode }) {
  const { brainState } = useBrainState();
  const stage: Stage = brainState?.currentStage ?? 'baby';
  const colors = getStageColors(stage);

  // Score-decline dimming (Story 3.4)
  const currentScore = brainState?.currentScore ?? 0;
  const previousScore = brainState?.previousScore ?? 0;
  const delta = currentScore - previousScore;

  // dimming: 1.0 when stable/positive, down to 0.6 when declining hard
  // pulse: 2s normal, slows to 4s when declining
  const dimming = delta >= 0 ? 1.0 : Math.max(0.6, 1 + (delta / 1000) * 0.5);
  const pulseSpeed = delta >= 0 ? '2s' : `${Math.min(4, 2 + Math.abs(delta) / 50)}s`;

  useEffect(() => {
    const body = document.body;
    body.style.setProperty('--accent', colors.accent);
    body.style.setProperty('--accent-glow', colors.accentGlow);
    body.style.setProperty('--bg-tint', colors.bgTint);
    body.style.setProperty('--brain-dimming', String(dimming));
    body.style.setProperty('--brain-pulse-speed', pulseSpeed);

    return () => {
      body.style.removeProperty('--accent');
      body.style.removeProperty('--accent-glow');
      body.style.removeProperty('--bg-tint');
      body.style.removeProperty('--brain-dimming');
      body.style.removeProperty('--brain-pulse-speed');
    };
  }, [colors, dimming, pulseSpeed]);

  return <>{children}</>;
}
