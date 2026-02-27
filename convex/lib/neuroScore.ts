/**
 * Pure score calculation functions for the Neuro Score engine.
 * CRITICAL: All functions here are PURE — no Date.now(), no Math.random(), no database access.
 * Same inputs ALWAYS produce same outputs (FR9, NFR17).
 */

const BASE_POINTS = 20;

// ─── Stage Thresholds (FR10) ─────────────────────────────────────────
type Stage = "baby" | "toddler" | "kid" | "teen" | "adult" | "master" | "guru";

export const STAGE_THRESHOLDS: { stage: Stage; min: number }[] = [
  { stage: "guru", min: 850 },
  { stage: "master", min: 700 },
  { stage: "adult", min: 500 },
  { stage: "teen", min: 350 },
  { stage: "kid", min: 200 },
  { stage: "toddler", min: 100 },
  { stage: "baby", min: 0 },
];

/**
 * Pure stage mapping (FR10, NFR17).
 * Deterministic — same score always returns same stage.
 */
export function getStageForScore(score: number): Stage {
  for (const { stage, min } of STAGE_THRESHOLDS) {
    if (score >= min) return stage;
  }
  return "baby";
}

interface RuleComplianceItem {
  rule: string;
  compliance: "yes" | "partial" | "no";
}

export interface ScoreInput {
  ruleChecklist: RuleComplianceItem[];
  currentScore: number;
  streakMultiplier: number;
  sameDayTradeCount: number;
}

export interface ScoreOutput {
  delta: number;
  newScore: number;
  complianceScore: number;
  streakMultiplier: number;
  diminishingFactor: number;
}

/**
 * Converts a rule checklist array into a 0.0–1.0 compliance score.
 * yes = 1, partial = 0.5, no = 0
 */
export function getComplianceScore(ruleChecklist: RuleComplianceItem[]): number {
  if (ruleChecklist.length === 0) return 0;

  const total = ruleChecklist.reduce((sum, r) => {
    if (r.compliance === "yes") return sum + 1;
    if (r.compliance === "partial") return sum + 0.5;
    return sum;
  }, 0);

  return total / ruleChecklist.length;
}

/**
 * Calculates streak multiplier from consecutive compliant trade count.
 * Bonus starts at streak 5 (1.1x), caps at streak 9+ (1.5x).
 *
 *   streakDays 0–4  → 1.0x
 *   streakDays 5    → 1.1x
 *   streakDays 6    → 1.2x
 *   ...
 *   streakDays 9+   → 1.5x (capped)
 */
export function getStreakMultiplier(streakDays: number): number {
  return Math.min(1.5, 1.0 + Math.max(0, streakDays - 4) * 0.1);
}

/**
 * Updates streak count based on this trade's rule compliance.
 * - All rules "yes" (fully compliant) → streak + 1
 * - Any rule "no" (rule broken) → streak resets to 0
 * - Partial only (no "no") → streak unchanged
 * - Empty checklist → streak unchanged
 */
export function updateStreakCount(
  currentStreak: number,
  ruleChecklist: RuleComplianceItem[]
): number {
  if (ruleChecklist.length === 0) return currentStreak;

  const hasNo = ruleChecklist.some((r) => r.compliance === "no");
  if (hasNo) return 0;

  const allYes = ruleChecklist.every((r) => r.compliance === "yes");
  if (allYes) return currentStreak + 1;

  // Partial only — streak stays
  return currentStreak;
}

/**
 * Diminishing factor for same-day trades.
 * 1st trade (count=0) → 1.0, 2nd → 0.8, 3rd → 0.6, 4th+ → 0.4 (floor).
 */
export function getDiminishingFactor(sameDayTradeCount: number): number {
  return Math.max(0.4, 1.0 - sameDayTradeCount * 0.2);
}

// ─── Daily Cap Constants (FR4) ────────────────────────────────────────
export const MAX_DAILY_GAIN = 50;
export const MAX_DAILY_LOSS = -30;

/**
 * Applies asymmetric daily caps to a delta.
 * Ensures cumulative daily gain ≤ +50 and cumulative daily loss ≥ -30.
 */
export function applyDailyCap(
  delta: number,
  cumulativeDailyDelta: number
): number {
  const projected = cumulativeDailyDelta + delta;

  if (delta > 0 && projected > MAX_DAILY_GAIN) {
    return Math.max(0, MAX_DAILY_GAIN - cumulativeDailyDelta);
  }

  if (delta < 0 && projected < MAX_DAILY_LOSS) {
    return Math.min(0, MAX_DAILY_LOSS - cumulativeDailyDelta);
  }

  return delta;
}

/**
 * Pure score calculation. Deterministic — no side effects.
 *
 * Formula:
 *   1. complianceScore = sum(yes=1, partial=0.5, no=0) / ruleCount
 *   2. rawDelta = round((complianceScore * 2 - 1) * BASE_POINTS)
 *   3. diminishingFactor = getDiminishingFactor(sameDayTradeCount)
 *   4. delta = round(rawDelta * streakMultiplier * diminishingFactor)
 *   5. newScore = clamp(currentScore + delta, 0, 1000)
 *
 * If no rules provided: delta = 0, score unchanged.
 */
export function calculateScore(input: ScoreInput): ScoreOutput {
  const { ruleChecklist, currentScore, streakMultiplier, sameDayTradeCount } = input;

  if (ruleChecklist.length === 0) {
    return {
      delta: 0,
      newScore: currentScore,
      complianceScore: 0,
      streakMultiplier,
      diminishingFactor: 1.0,
    };
  }

  const complianceScore = getComplianceScore(ruleChecklist);
  const rawDelta = Math.round((complianceScore * 2 - 1) * BASE_POINTS);
  const diminishingFactor = getDiminishingFactor(sameDayTradeCount);
  const delta = Math.round(rawDelta * streakMultiplier * diminishingFactor);
  const newScore = Math.max(0, Math.min(1000, currentScore + delta));

  return { delta, newScore, complianceScore, streakMultiplier, diminishingFactor };
}

/**
 * Builds a human-readable reason string for the score event audit log.
 */
export function buildScoreReason(
  ruleChecklist: RuleComplianceItem[],
  result: ScoreOutput
): string {
  if (ruleChecklist.length === 0) {
    return "No rules in checklist — score unchanged";
  }

  const yesCount = ruleChecklist.filter((r) => r.compliance === "yes").length;
  const partialCount = ruleChecklist.filter((r) => r.compliance === "partial").length;
  const noCount = ruleChecklist.filter((r) => r.compliance === "no").length;
  const total = ruleChecklist.length;
  const pct = Math.round(result.complianceScore * 100);

  const parts: string[] = [];
  if (yesCount > 0) parts.push(`${yesCount} compliant`);
  if (partialCount > 0) parts.push(`${partialCount} partial`);
  if (noCount > 0) parts.push(`${noCount} broken`);

  const modifiers: string[] = [];
  if (result.streakMultiplier !== 1.0) {
    modifiers.push(`streak ${result.streakMultiplier.toFixed(1)}x`);
  }
  if (result.diminishingFactor !== 1.0) {
    modifiers.push(`diminish ${result.diminishingFactor.toFixed(1)}x`);
  }

  const sign = result.delta >= 0 ? "+" : "";
  const modStr = modifiers.length > 0 ? `, ${modifiers.join(", ")}` : "";
  return `Trade scored: ${parts.join(", ")} of ${total} rules (${pct}% compliance${modStr}) → ${sign}${result.delta} pts`;
}
