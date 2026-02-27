/**
 * Pure anti-gaming detection functions.
 * CRITICAL: All functions here are PURE — no Date.now(), no Math.random(), no database access.
 * Same inputs ALWAYS produce same outputs (NFR17).
 */

// ─── Configurable Constants (prepares for FR40 admin config) ─────────
// FR25: Phantom trade detection
export const PHANTOM_TRADE_WINDOW_MS = 60 * 60 * 1000; // 60 minutes
export const PHANTOM_TRADE_THRESHOLD = 10;

// FR26: P&L consistency anomaly detection
export const PNL_ANOMALY_MIN_TRADES = 20;
export const PNL_ANOMALY_WIN_RATE = 1.0; // 100%

// FR28: Regression recovery lock
export const RECOVERY_LOCK_DURATION_MS = 48 * 60 * 60 * 1000; // 48 hours
export const RECOVERY_LOCK_MAX_TRADES_PER_DAY = 3;

// ─── Shared Anti-Gaming Types ────────────────────────────────────────
export interface AntiGamingResult {
  flags: string[];
  shouldZeroScore: boolean;
  details: Record<string, unknown>;
}

/**
 * Detects phantom trades (FR25, NFR17).
 * Pure function — takes pre-queried count of trade_scored events in
 * the time window, returns detection result.
 *
 * Threshold: 10+ trades in 60-minute window → phantom flagged.
 * NFR19: Zero false positives on legitimate patterns (1–5 trades/day).
 */
export function checkPhantomTrade(
  tradesInWindow: number,
  threshold: number = PHANTOM_TRADE_THRESHOLD
): AntiGamingResult {
  const isPhantom = tradesInWindow >= threshold;
  return {
    flags: isPhantom ? ["phantom_trade_detected"] : [],
    shouldZeroScore: isPhantom,
    details: { tradesInWindow, threshold, isPhantom },
  };
}

/**
 * Detects P&L consistency anomaly (FR26, NFR17).
 * ADVISORY flag — does NOT zero the score (shouldZeroScore = false).
 * Flags suspiciously perfect win rates for admin review.
 *
 * Threshold: 20+ closed trades AND 100% win rate → anomaly flagged.
 * NFR19: 15 trades at 73% win rate produces no flag.
 */

/**
 * Checks recovery lock enforcement (FR28, NFR17).
 * BLOCKING when lock active AND daily trade limit exceeded (>= 3).
 * ADVISORY when lock active but within daily limit.
 *
 * Lock expired (details.lockExpired = true): mutation should clear recoveryLockUntil.
 * Lock active + over limit: shouldZeroScore = true, flag "recovery_lock_limit".
 * Lock active + within limit: shouldZeroScore = false, flag "recovery_lock_active".
 */
export function checkRecoveryLock(
  recoveryLockUntil: number | null,
  now: number,
  sameDayScoredTrades: number,
  maxTradesPerDay: number = RECOVERY_LOCK_MAX_TRADES_PER_DAY
): AntiGamingResult {
  // No lock or lock expired
  if (recoveryLockUntil === null || now >= recoveryLockUntil) {
    const lockExpired = recoveryLockUntil !== null && now >= recoveryLockUntil;
    return {
      flags: [],
      shouldZeroScore: false,
      details: { recoveryLockUntil, isLocked: false, lockExpired },
    };
  }

  // Lock active — check daily trade limit
  const isOverLimit = sameDayScoredTrades >= maxTradesPerDay;
  return {
    flags: isOverLimit ? ["recovery_lock_limit"] : ["recovery_lock_active"],
    shouldZeroScore: isOverLimit,
    details: {
      recoveryLockUntil,
      isLocked: true,
      lockExpired: false,
      sameDayScoredTrades,
      maxTradesPerDay,
      isOverLimit,
    },
  };
}

export function checkPnlAnomaly(
  totalClosedTrades: number,
  winRate: number,
  minTrades: number = PNL_ANOMALY_MIN_TRADES,
  winRateThreshold: number = PNL_ANOMALY_WIN_RATE
): AntiGamingResult {
  const isAnomaly =
    totalClosedTrades >= minTrades && winRate >= winRateThreshold;
  return {
    flags: isAnomaly ? ["pnl_anomaly_flagged"] : [],
    shouldZeroScore: false, // ADVISORY — score still applies
    details: {
      totalClosedTrades,
      winRate,
      minTrades,
      winRateThreshold,
      isAnomaly,
    },
  };
}
