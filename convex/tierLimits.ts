// Server-side tier limits — mirrors lib/features.ts for enforcement in mutations.
// Keep in sync with the client-side TIERS constant.

interface PlanLimits {
  maxTrades: number;      // -1 = unlimited
  maxStrategies: number;  // -1 = unlimited
}

const PLAN_LIMITS: Record<string, PlanLimits> = {
  free:      { maxTrades: 50,  maxStrategies: 3 },
  core:      { maxTrades: 200, maxStrategies: 10 },
  // Legacy plan name — kept as alias so any leftover `planId: "essential"` documents
  // resolve to the same limits as Core. Safe to drop after a DB sweep.
  essential: { maxTrades: 200, maxStrategies: 10 },
  pro:       { maxTrades: -1,  maxStrategies: -1 },
  elite:     { maxTrades: -1,  maxStrategies: -1 },
};

export function getLimitsForPlan(planId: string): PlanLimits {
  return PLAN_LIMITS[planId] ?? PLAN_LIMITS.free;
}
