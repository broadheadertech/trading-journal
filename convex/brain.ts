import { mutation, internalMutation, MutationCtx } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { requireUser } from "./helpers";
import {
  calculateScore,
  buildScoreReason,
  updateStreakCount,
  getStreakMultiplier,
  applyDailyCap,
  getStageForScore,
} from "./lib/neuroScore";
import {
  checkPhantomTrade,
  checkPnlAnomaly,
  checkRecoveryLock,
  PHANTOM_TRADE_WINDOW_MS,
  PHANTOM_TRADE_THRESHOLD,
  PNL_ANOMALY_MIN_TRADES,
  PNL_ANOMALY_WIN_RATE,
  RECOVERY_LOCK_DURATION_MS,
  RECOVERY_LOCK_MAX_TRADES_PER_DAY,
} from "./lib/antiGaming";
import { generateCoachingMessage, generateTransitionMessage, generateComebackMessage, generateFirstMessage } from "./lib/coachingTemplates";

// Module-level stage order — used in scoreTradeInternal and backfillBrainScores
const STAGE_ORDER = ["beginner", "intern", "advance", "professional", "advance-professional", "guru"] as const;

// Story 7.1 — tier-based stage cap (FR34, D4)
const FREE_TIER_STAGE_CAP = "advance" as const;
const FREE_TIER_CAP_INDEX = STAGE_ORDER.indexOf(FREE_TIER_STAGE_CAP); // = 2
// Legacy stage remap — guards against documents written before the 2026-02 rename
const LEGACY_STAGE_MAP: Record<string, string> = {
  baby: "beginner", toddler: "intern", kid: "advance",
  teen: "professional", adult: "advance-professional", master: "advance-professional",
};

/** Returns the effectiveStage after applying Free-tier cap. Essential/Pro/Elite are uncapped. */
function computeEffectiveStage(
  actualStage: (typeof STAGE_ORDER)[number],
  planId: string,
): (typeof STAGE_ORDER)[number] {
  // Normalize legacy stage names before any cap logic
  const normalized = (LEGACY_STAGE_MAP[actualStage] ?? actualStage) as (typeof STAGE_ORDER)[number];
  const safeStage = STAGE_ORDER.includes(normalized) ? normalized : "beginner";
  if (planId !== "free") return safeStage;
  const actualIdx = STAGE_ORDER.indexOf(safeStage);
  return actualIdx <= FREE_TIER_CAP_INDEX ? safeStage : STAGE_ORDER[FREE_TIER_CAP_INDEX];
}

// ── Weekend & Holiday Hibernation (FR7, Story 5.5) ───────────────────────────
// "YYYY-MM-DD" UTC date strings — extend as needed (e.g., ["2026-12-25", "2027-01-01"])
const CONFIGURED_HOLIDAYS: string[] = [];

/** Returns true if the given UTC date is a weekend (Sat/Sun) or a configured holiday. */
function isHibernationDay(utcDate: Date): boolean {
  const day = utcDate.getUTCDay(); // 0 = Sunday, 6 = Saturday
  if (day === 0 || day === 6) return true;
  const dateStr = utcDate.toISOString().slice(0, 10);
  return CONFIGURED_HOLIDAYS.includes(dateStr);
}

// ── Inactivity Decay (FR17, Story 5.6) ────────────────────────────────────────
const INACTIVITY_GRACE_DAYS = 3;     // Calendar days grace period before decay starts
const INACTIVITY_DECAY_RATE = 2;     // Score points removed per eligible decay day
const INACTIVITY_DECAY_FLOOR = 50;   // Minimum score — decay never takes score below this

// ── Comeback Coaching (FR24, Story 5.7) ───────────────────────────────────────
const COMEBACK_THRESHOLD_DAYS = 7; // Days of inactivity before generating a comeback message

/**
 * Creates default brain state for a new user. Idempotent — returns existing ID if already initialized.
 * Story 6.2: accepts optional onboarding data to generate a personalized first coaching message (FR31).
 */
export const initializeBrainState = mutation({
  args: {
    primaryMarket: v.optional(v.string()),
    initialCapital: v.optional(v.number()),
    currency: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);

    const existing = await ctx.db
      .query("brainStates")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    if (existing) return existing._id;

    const now = Date.now();

    // Generate personalized first message when onboarding market is provided (FR31)
    const coaching = args.primaryMarket
      ? generateFirstMessage({
          primaryMarket: args.primaryMarket,
          initialCapital: args.initialCapital ?? 0,
          currency: args.currency ?? "USD",
          timestamp: now,
        })
      : null;

    return ctx.db.insert("brainStates", {
      userId,
      currentScore: 0,
      currentStage: "beginner",
      effectiveStage: "beginner" as const, // Story 7.1 — always beginner at init; below free-tier cap (FR34)
      previousScore: 0,
      streakDays: 0,
      streakMultiplier: 1.0,
      lastTradeDate: 0,
      lastScoreUpdateDate: now,
      isVacationMode: false,
      vacationEnd: null,
      hasRegressed: false,
      regressionBufferStart: null,
      regressionBufferDays: 0,
      evolutionCooldownStart: null,
      recoveryLockUntil: null,
      stageHistory: [{ stage: "beginner" as const, reachedAt: now }],
      latestCoachingMessage: coaching
        ? { message: coaching.message, category: coaching.category, disclaimer: coaching.disclaimer, timestamp: now }
        : undefined,
      updatedAt: now,
      createdAt: now,
    });
  },
});

/**
 * Shared scoring helper — NOT a mutation, called from both scoreTrade and trades.ts:add.
 * Atomic score-trade pipeline (D7): calculate + cap + stage + update + audit in ONE call.
 */
export async function scoreTradeInternal(
  ctx: MutationCtx,
  userId: string,
  tradeId: string,
  ruleChecklist: { rule: string; compliance: "yes" | "partial" | "no" }[]
) {
  // 1. Get or auto-initialize brain state
  let brainState = await ctx.db
    .query("brainStates")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .first();

  if (!brainState) {
    const now = Date.now();
    const id = await ctx.db.insert("brainStates", {
      userId,
      currentScore: 0,
      currentStage: "beginner",
      previousScore: 0,
      streakDays: 0,
      streakMultiplier: 1.0,
      lastTradeDate: 0,
      lastScoreUpdateDate: now,
      isVacationMode: false,
      vacationEnd: null,
      hasRegressed: false,
      regressionBufferStart: null,
      regressionBufferDays: 0,
      evolutionCooldownStart: null,
      recoveryLockUntil: null,
      stageHistory: [{ stage: "beginner" as const, reachedAt: now }],
      updatedAt: now,
      createdAt: now,
    });
    brainState = (await ctx.db.get(id))!;
  }

  // 1.5 Vacation mode short-circuit (FR6, Story 5.4)
  // Must run before any queries or anti-gaming — vacation trades earn zero score, no exceptions
  const now = Date.now();
  if (brainState.isVacationMode) {
    await ctx.db.patch(brainState._id, {
      lastTradeDate: now, // keep current so inactivity decay (5.6) knows they traded
      updatedAt: now,
    });
    await ctx.db.insert("scoreEvents", {
      userId,
      timestamp: now,
      eventType: "trade_scored",
      delta: 0,
      previousScore: brainState.currentScore,
      newScore: brainState.currentScore,
      reason: "Vacation mode active — trade saved, zero score contribution (FR6)",
      tradeId,
      ruleCompliance: ruleChecklist,
      antiGamingFlags: [],
      metadata: { vacationMode: true },
      createdAt: now,
    });
    return {
      success: true,
      delta: 0,
      previousScore: brainState.currentScore,
      newScore: brainState.currentScore,
      complianceScore: 0,
      previousStage: brainState.currentStage,
      newStage: brainState.currentStage,
      stageChanged: false,
      pendingEvolution: false,
      pendingRegression: false,
    };
  }

  // 1.9 Read anti-gaming threshold overrides from adminSettings (FR40, Story 8.3)
  const agSettings = await ctx.db.query("adminSettings").collect();
  const agGet = (k: string, fallback: number) => {
    const s = agSettings.find((row) => row.key === k);
    return s ? Number(s.value) : fallback;
  };
  const phantomWindowMs = agGet("ag_phantom_trade_window_ms", PHANTOM_TRADE_WINDOW_MS);
  const phantomThreshold = agGet("ag_phantom_trade_threshold", PHANTOM_TRADE_THRESHOLD);
  const pnlMinTrades = agGet("ag_pnl_anomaly_min_trades", PNL_ANOMALY_MIN_TRADES);
  const pnlWinRate = agGet("ag_pnl_anomaly_win_rate", PNL_ANOMALY_WIN_RATE);
  const recoveryMaxTrades = agGet("ag_recovery_lock_max_trades_per_day", RECOVERY_LOCK_MAX_TRADES_PER_DAY);
  const recoveryDurationMs = agGet("ag_recovery_lock_duration_ms", RECOVERY_LOCK_DURATION_MS);

  // 2. Count same-day trade_scored events (UTC day boundary)
  const todayStart = new Date(now);
  todayStart.setUTCHours(0, 0, 0, 0);
  const todayStartMs = todayStart.getTime();
  const todayEvents = await ctx.db
    .query("scoreEvents")
    .withIndex("by_user_timestamp", (q) =>
      q.eq("userId", userId).gte("timestamp", todayStartMs)
    )
    .collect();
  const sameDayTradeCount = todayEvents.filter(
    (e) => e.eventType === "trade_scored"
  ).length;

  // 2.5 Phantom trade detection (FR25, D7 step 3)
  const windowStart = now - phantomWindowMs;
  const windowEvents = await ctx.db
    .query("scoreEvents")
    .withIndex("by_user_timestamp", (q) =>
      q.eq("userId", userId).gte("timestamp", windowStart)
    )
    .collect();
  const tradesInWindow = windowEvents.filter(
    (e) => e.eventType === "trade_scored"
  ).length;
  const antiGaming = checkPhantomTrade(tradesInWindow, phantomThreshold);

  if (antiGaming.shouldZeroScore) {
    // Short-circuit: zero score, no streak change, no stage change
    const phantomCoaching = generateCoachingMessage({
      complianceScore: 0,
      streakDays: brainState.streakDays,
      antiGamingFlags: antiGaming.flags,
      delta: 0,
      isRecoveryLock: false,
      tradeTimestamp: now,
      currentStage: brainState.currentStage,
      closedTradeCount: 0,
    });
    await ctx.db.patch(brainState._id, {
      lastTradeDate: now,
      lastScoreUpdateDate: now,
      latestCoachingMessage: {
        message: phantomCoaching.message,
        category: phantomCoaching.category,
        disclaimer: phantomCoaching.disclaimer,
        timestamp: now,
      },
      updatedAt: now,
    });

    await ctx.db.insert("scoreEvents", {
      userId,
      timestamp: now,
      eventType: "trade_scored",
      delta: 0,
      previousScore: brainState.currentScore,
      newScore: brainState.currentScore,
      reason: "Phantom trade detected — zero score contribution (FR25)",
      tradeId,
      ruleCompliance: ruleChecklist,
      antiGamingFlags: antiGaming.flags,
      metadata: antiGaming.details,
      createdAt: now,
    });

    return {
      success: true,
      delta: 0,
      previousScore: brainState.currentScore,
      newScore: brainState.currentScore,
      complianceScore: 0,
      previousStage: brainState.currentStage,
      newStage: brainState.currentStage,
      stageChanged: false,
      pendingEvolution: false,
      pendingRegression: false,
    };
  }

  // 2.6 P&L consistency anomaly detection (FR26, advisory)
  const userTrades = await ctx.db
    .query("trades")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect();
  const closedWithPnl = userTrades.filter((t) => t.actualPnL !== null);
  const totalClosed = closedWithPnl.length;
  const wins = closedWithPnl.filter((t) => (t.actualPnL ?? 0) > 0).length;
  const winRate = totalClosed > 0 ? wins / totalClosed : 0;
  const pnlAnomaly = checkPnlAnomaly(totalClosed, winRate, pnlMinTrades, pnlWinRate);
  const collectedFlags: string[] = [...pnlAnomaly.flags];

  // Story 4.3: compute recent compliance for data-referenced coaching (FR22)
  const tradesWithChecklist = userTrades.filter(
    (t) => (t.ruleChecklist ?? []).length > 0
  );
  const recentChecklistTrades = tradesWithChecklist.slice(-20);
  let totalRulesRecent = 0;
  let compliantRulesRecent = 0;
  for (const t of recentChecklistTrades) {
    for (const r of t.ruleChecklist ?? []) {
      totalRulesRecent++;
      if (r.compliance === "yes") compliantRulesRecent += 1;
      else if (r.compliance === "partial") compliantRulesRecent += 0.5;
    }
  }
  const overallCompliancePercent =
    totalRulesRecent > 0 ? compliantRulesRecent / totalRulesRecent : 0;

  // 2.7 Recovery lock enforcement (FR28)
  const recoveryLock = checkRecoveryLock(
    brainState.recoveryLockUntil,
    now,
    sameDayTradeCount,
    recoveryMaxTrades
  );

  // Clear expired lock
  if (recoveryLock.details.lockExpired) {
    await ctx.db.patch(brainState._id, {
      recoveryLockUntil: null,
      updatedAt: now,
    });
  }

  // Short-circuit if over daily trade limit during active lock
  if (recoveryLock.shouldZeroScore) {
    const allFlags = [...collectedFlags, ...recoveryLock.flags];
    const recovCoaching = generateCoachingMessage({
      complianceScore: 0,
      streakDays: brainState.streakDays,
      antiGamingFlags: allFlags,
      delta: 0,
      isRecoveryLock: true,
      tradeTimestamp: now,
      currentStage: brainState.currentStage,
      userWinRate: winRate,
      overallCompliancePercent,
      closedTradeCount: totalClosed,
    });

    await ctx.db.patch(brainState._id, {
      lastTradeDate: now,
      lastScoreUpdateDate: now,
      latestCoachingMessage: {
        message: recovCoaching.message,
        category: recovCoaching.category,
        disclaimer: recovCoaching.disclaimer,
        timestamp: now,
      },
      updatedAt: now,
    });

    await ctx.db.insert("scoreEvents", {
      userId,
      timestamp: now,
      eventType: "trade_scored",
      delta: 0,
      previousScore: brainState.currentScore,
      newScore: brainState.currentScore,
      reason: "Recovery lock — daily trade limit exceeded (FR28)",
      tradeId,
      ruleCompliance: ruleChecklist,
      antiGamingFlags: allFlags,
      metadata: {
        recoveryLock: recoveryLock.details,
        ...(pnlAnomaly.flags.length > 0 ? { pnlAnomaly: pnlAnomaly.details } : {}),
      },
      createdAt: now,
    });

    return {
      success: true,
      delta: 0,
      previousScore: brainState.currentScore,
      newScore: brainState.currentScore,
      complianceScore: 0,
      previousStage: brainState.currentStage,
      newStage: brainState.currentStage,
      stageChanged: false,
      pendingEvolution: false,
      pendingRegression: false,
    };
  }

  // If lock active but within limit, collect advisory flag
  if (recoveryLock.flags.length > 0) {
    collectedFlags.push(...recoveryLock.flags);
  }

  // 3. Calculate new streak count from this trade's compliance
  const newStreakDays = updateStreakCount(brainState.streakDays, ruleChecklist);

  // 4. Calculate streak multiplier from NEW streak
  const newStreakMultiplier = getStreakMultiplier(newStreakDays);

  // 5. Calculate score (PURE — with streak + diminishing returns)
  const result = calculateScore({
    ruleChecklist,
    currentScore: brainState.currentScore,
    streakMultiplier: newStreakMultiplier,
    sameDayTradeCount,
  });

  // 5.5 Apply asymmetric daily cap (FR4: +50 max gain / -30 max loss)
  const cumulativeDailyDelta = todayEvents
    .filter((e) => e.eventType === "trade_scored")
    .reduce((sum, e) => sum + e.delta, 0);
  const cappedDelta = applyDailyCap(result.delta, cumulativeDailyDelta);
  const cappedNewScore = Math.max(
    0,
    Math.min(1000, brainState.currentScore + cappedDelta)
  );

  // 6. Stage gating (FR11, FR12) — evolution cooldown (3-day) + regression buffer (5-day)
  const scoreBasedStage = getStageForScore(cappedNewScore); // what score would indicate
  const previousStage = brainState.currentStage;

  let newStage = previousStage;         // effective stage (may be held back by gate)
  let stageChanged = false;
  let pendingEvolution = false;
  let pendingRegression = false;

  // Mutable tracking fields — written to db.patch below
  let newEvolutionCooldownStart: number | null = brainState.evolutionCooldownStart ?? null;
  let newRegressionBufferStart: number | null = brainState.regressionBufferStart ?? null;
  let newRegressionBufferDays: number = brainState.regressionBufferDays;

  const scoreSaysEvolve = STAGE_ORDER.indexOf(scoreBasedStage) > STAGE_ORDER.indexOf(previousStage);
  const scoreSaysRegress = STAGE_ORDER.indexOf(scoreBasedStage) < STAGE_ORDER.indexOf(previousStage);

  if (scoreSaysEvolve) {
    // Score qualifies for a higher stage — clear any active regression buffer
    newRegressionBufferStart = null;
    newRegressionBufferDays = 0;

    if (newEvolutionCooldownStart === null) {
      // First qualifying trade — start the 3-day cooldown clock
      newEvolutionCooldownStart = now;
      pendingEvolution = true;
    } else {
      const daysQualifying = Math.floor((now - newEvolutionCooldownStart) / 86_400_000);
      if (daysQualifying >= 3) {
        // Cooldown elapsed — trigger evolution now
        newStage = scoreBasedStage;
        stageChanged = true;
        newEvolutionCooldownStart = null; // clear after use
      } else {
        // Still within cooldown window
        pendingEvolution = true;
      }
    }
  } else if (scoreSaysRegress) {
    // Score dropped below current stage threshold — clear evolution cooldown
    newEvolutionCooldownStart = null;

    if (newRegressionBufferStart === null) {
      // First below-threshold trade — start the 5-day buffer clock
      newRegressionBufferStart = now;
      newRegressionBufferDays = 1;
      pendingRegression = true;
    } else {
      const daysBelow = Math.floor((now - newRegressionBufferStart) / 86_400_000);
      newRegressionBufferDays = daysBelow + 1;
      if (daysBelow >= 5) {
        // Buffer elapsed — trigger regression now
        newStage = scoreBasedStage;
        stageChanged = true;
        newRegressionBufferStart = null; // clear after use
        newRegressionBufferDays = 0;
      } else {
        pendingRegression = true;
      }
    }
  } else {
    // Score within current stage range — clear both trackers
    newEvolutionCooldownStart = null;
    newRegressionBufferStart = null;
    newRegressionBufferDays = 0;
  }

  // Build updated stageHistory if stage changed
  let updatedStageHistory = brainState.stageHistory;
  if (stageChanged) {
    updatedStageHistory = [...brainState.stageHistory];
    // Mark previous stage entry as left
    const lastIdx = updatedStageHistory.length - 1;
    if (lastIdx >= 0) {
      updatedStageHistory[lastIdx] = {
        ...updatedStageHistory[lastIdx],
        leftAt: now,
      };
    }
    // Add new stage entry
    updatedStageHistory.push({ stage: newStage, reachedAt: now });
  }

  // Story 4.4: days spent in the stage being left (for farewell message)
  const lastStageEntry = brainState.stageHistory[brainState.stageHistory.length - 1];
  const daysInPreviousStage = lastStageEntry
    ? Math.floor((now - lastStageEntry.reachedAt) / 86_400_000)
    : 0;

  // 6.5 Recovery lock activation on stage regression (FR28)
  const isRegression = stageChanged &&
    STAGE_ORDER.indexOf(newStage) < STAGE_ORDER.indexOf(previousStage);

  let recoveryLockActivated = false;
  let newRecoveryLockUntil = recoveryLock.details.lockExpired
    ? null
    : (brainState.recoveryLockUntil ?? null);
  if (isRegression) {
    newRecoveryLockUntil = now + recoveryDurationMs;
    recoveryLockActivated = true;
    collectedFlags.push("recovery_lock_activated");
  }

  // 7. Generate coaching message (FR18 — pure, deterministic)
  // FR20/FR21: stage transitions override with farewell + welcome message
  // FR24: comeback message when returning after ≥7 days (Story 5.7)
  const isRecoveryLock = brainState.recoveryLockUntil !== null &&
    brainState.recoveryLockUntil > now;

  // Story 5.7 — comeback detection (FR24)
  const daysSinceLastTrade = brainState.lastTradeDate > 0
    ? Math.floor((now - brainState.lastTradeDate) / 86_400_000)
    : 0; // lastTradeDate === 0 → never traded before → not a comeback
  const isComeback = daysSinceLastTrade >= COMEBACK_THRESHOLD_DAYS;

  const coaching = stageChanged
    ? generateTransitionMessage({
        previousStage,
        newStage,
        daysInPreviousStage,
        tradeTimestamp: now,
        isEvolution: !isRegression,
        closedTradeCount: totalClosed,
        userWinRate: winRate,
      })
    : isComeback
      ? generateComebackMessage({
          daysSinceLastTrade,
          currentStage: newStage,
          currentScore: cappedNewScore,
          tradeTimestamp: now,
        })
      : generateCoachingMessage({
          complianceScore: result.complianceScore,
          streakDays: newStreakDays,
          antiGamingFlags: collectedFlags,
          delta: cappedDelta,
          isRecoveryLock,
          tradeTimestamp: now,
          currentStage: newStage,
          userWinRate: winRate,
          overallCompliancePercent,
          closedTradeCount: totalClosed,
        });

  // Story 7.1 — compute effectiveStage for this user's tier (FR34)
  const sub = await ctx.db
    .query("userSubscriptions")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .first();
  const planId = sub?.planId ?? "free";
  const effectiveStage = computeEffectiveStage(newStage, planId);

  // 8. Update brain state (direct db.patch for atomicity)
  await ctx.db.patch(brainState._id, {
    previousScore: brainState.currentScore,
    currentScore: cappedNewScore,
    currentStage: newStage,
    effectiveStage,
    streakDays: newStreakDays,
    streakMultiplier: newStreakMultiplier,
    lastTradeDate: now,
    lastScoreUpdateDate: now,
    stageHistory: updatedStageHistory,
    recoveryLockUntil: newRecoveryLockUntil,
    hasRegressed: isRegression ? true : brainState.hasRegressed,
    regressionBufferStart: newRegressionBufferStart,
    regressionBufferDays: newRegressionBufferDays,
    evolutionCooldownStart: newEvolutionCooldownStart,
    latestCoachingMessage: {
      message: coaching.message,
      category: coaching.category,
      disclaimer: coaching.disclaimer,
      timestamp: now,
    },
    updatedAt: now,
  });

  // 9. Insert score event (direct db.insert for atomicity)
  await ctx.db.insert("scoreEvents", {
    userId,
    timestamp: now,
    eventType: "trade_scored",
    delta: cappedDelta,
    previousScore: brainState.currentScore,
    newScore: cappedNewScore,
    reason: buildScoreReason(ruleChecklist, result),
    tradeId,
    ruleCompliance: ruleChecklist,
    antiGamingFlags: collectedFlags,
    metadata: {
      complianceScore: result.complianceScore,
      streakDays: newStreakDays,
      streakMultiplier: newStreakMultiplier,
      diminishingFactor: result.diminishingFactor,
      sameDayTradeCount,
      uncappedDelta: result.delta,
      cappedDelta,
      wasCapped: cappedDelta !== result.delta,
      cumulativeDailyDelta,
      previousStage,
      newStage,
      stageChanged,
      ...(pnlAnomaly.flags.length > 0 ? { pnlAnomaly: pnlAnomaly.details } : {}),
      ...(recoveryLockActivated ? { recoveryLockActivated: true, recoveryLockUntil: newRecoveryLockUntil } : {}),
      ...(recoveryLock.details.lockExpired ? { recoveryLockCleared: true } : {}),
      ...(recoveryLock.details.isLocked ? { recoveryLock: recoveryLock.details } : {}),
      coachingCategory: coaching.category,
    },
    createdAt: now,
  });

  // 10. Return result with stage info
  return {
    success: true,
    delta: cappedDelta,
    previousScore: brainState.currentScore,
    newScore: cappedNewScore,
    complianceScore: result.complianceScore,
    previousStage,
    newStage,
    stageChanged,
    pendingEvolution,   // true while 3-day evolution cooldown is active (FR11)
    pendingRegression,  // true while 5-day regression buffer is active (FR12)
  };
}

/**
 * Story 7.4 — Immediate effectiveStage unlock on subscription upgrade (FR37).
 * Called from the Stripe webhook after a successful upgrade.
 * Sets effectiveStage = currentStage, refreshes the last stageHistory entry's
 * reachedAt timestamp so CinematicEngine.detectEvolution fires automatically.
 */
export const unlockStageOnUpgrade = mutation({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    // M1 security guard: if an authenticated user calls this (not a webhook),
    // they may only unlock their own stage — prevents cross-user stage reveal.
    const identity = await ctx.auth.getUserIdentity();
    if (identity && identity.subject !== userId) {
      throw new ConvexError({ code: "UNAUTHORIZED", message: "Cannot unlock another user's stage" });
    }

    const state = await ctx.db
      .query("brainStates")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
    if (!state) return;

    // Nothing to unlock if already at correct effective stage
    if (!state.effectiveStage || state.effectiveStage === state.currentStage) return;

    const prevScore = state.currentScore;
    const fromStage = state.effectiveStage;
    const now = Date.now();

    // Refresh last stageHistory entry reachedAt → new timestamp triggers CinematicEngine dedup key
    // Also set reason so the entry is distinguishable from a normal stage progression (L3)
    const updatedHistory = [...state.stageHistory];
    if (updatedHistory.length > 0) {
      const last = updatedHistory[updatedHistory.length - 1];
      updatedHistory[updatedHistory.length - 1] = { ...last, reachedAt: now, reason: "upgrade_unlock" };
    }

    await ctx.db.patch(state._id, {
      effectiveStage: state.currentStage,
      stageHistory: updatedHistory,
      updatedAt: now,
    });

    await ctx.db.insert("scoreEvents", {
      userId,
      timestamp: now,
      eventType: "subscription_upgrade_unlock",
      delta: 0,
      previousScore: prevScore,
      newScore: prevScore,
      reason: `effectiveStage unlocked to ${state.currentStage} on subscription upgrade`,
      antiGamingFlags: [],
      metadata: { fromStage, toStage: state.currentStage }, // L2: audit trail symmetry
      createdAt: now,
    });
  },
});

/**
 * Public mutation wrapper for scoreTrade (D7).
 * Delegates to scoreTradeInternal for the atomic pipeline.
 */
export const scoreTrade = mutation({
  args: {
    tradeId: v.string(),
    ruleChecklist: v.array(
      v.object({
        rule: v.string(),
        compliance: v.union(
          v.literal("yes"),
          v.literal("partial"),
          v.literal("no")
        ),
      })
    ),
  },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);
    return scoreTradeInternal(ctx, userId, args.tradeId, args.ruleChecklist);
  },
});

/**
 * Activate vacation mode — freezes score calculation (FR6, Story 5.4).
 * Idempotent: no-op if already active.
 */
export const activateVacationMode = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUser(ctx);
    const brainState = await ctx.db
      .query("brainStates")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    if (!brainState) throw new ConvexError({ code: "NO_BRAIN_STATE", message: "Brain state not initialized" });
    if (brainState.isVacationMode) return; // idempotent

    const now = Date.now();
    await ctx.db.patch(brainState._id, {
      isVacationMode: true,
      vacationStartedAt: now,
      updatedAt: now,
    });
    await ctx.db.insert("scoreEvents", {
      userId,
      timestamp: now,
      eventType: "vacation_activated",
      delta: 0,
      previousScore: brainState.currentScore,
      newScore: brainState.currentScore,
      reason: "Vacation mode activated — score frozen",
      antiGamingFlags: [],
      metadata: { activatedAt: now },
      createdAt: now,
    });
  },
});

/**
 * Deactivate vacation mode — resumes normal scoring from frozen score (FR47, Story 5.4).
 * Idempotent: no-op if not active.
 */
export const deactivateVacationMode = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUser(ctx);
    const brainState = await ctx.db
      .query("brainStates")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    if (!brainState) throw new ConvexError({ code: "NO_BRAIN_STATE", message: "Brain state not initialized" });
    if (!brainState.isVacationMode) return; // idempotent

    const now = Date.now();
    await ctx.db.patch(brainState._id, {
      isVacationMode: false,
      vacationStartedAt: null,
      updatedAt: now,
    });
    await ctx.db.insert("scoreEvents", {
      userId,
      timestamp: now,
      eventType: "vacation_deactivated",
      delta: 0,
      previousScore: brainState.currentScore,
      newScore: brainState.currentScore,
      reason: "Vacation mode deactivated — scoring resumed",
      antiGamingFlags: [],
      metadata: { deactivatedAt: now, resumedScore: brainState.currentScore },
      createdAt: now,
    });
  },
});

/**
 * Daily snapshot cron handler (D3).
 * Creates a snapshot for each active user recording yesterday's score, stage, and trade activity.
 * Idempotent — skips users that already have a snapshot for the date.
 */
export const createDailySnapshots = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    // Snapshot is for yesterday (cron runs at midnight UTC)
    const yesterday = new Date(now);
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);
    const dateStr = yesterday.toISOString().slice(0, 10);
    const hibernation = isHibernationDay(yesterday); // Story 5.5 — gate for inactivity decay skip (FR7)

    const yesterdayStart = new Date(yesterday);
    yesterdayStart.setUTCHours(0, 0, 0, 0);
    const yesterdayStartMs = yesterdayStart.getTime();
    const yesterdayEndMs = yesterdayStartMs + 86400000;

    const allBrainStates = await ctx.db.query("brainStates").collect();
    // Story 7.1 — pre-load subscriptions for effectiveStage cap (FR34); avoids N+1 in loop
    const allSubsList = await ctx.db.query("userSubscriptions").collect();
    const planByUser = new Map(allSubsList.map((s) => [s.userId, s.planId]));
    // Story 8.3 — read recovery lock duration override for cron-triggered regression (FR40)
    const cronAgSettings = await ctx.db.query("adminSettings").collect();
    const cronRecoveryDurationMs = (() => {
      const s = cronAgSettings.find((row) => row.key === "ag_recovery_lock_duration_ms");
      return s ? Number(s.value) : RECOVERY_LOCK_DURATION_MS;
    })();

    for (const bs of allBrainStates) {
      // Idempotent — skip if snapshot already exists
      const existing = await ctx.db
        .query("dailySnapshots")
        .withIndex("by_user_date", (q) =>
          q.eq("userId", bs.userId).eq("date", dateStr)
        )
        .first();
      if (existing) continue;

      // Count yesterday's score events
      const events = await ctx.db
        .query("scoreEvents")
        .withIndex("by_user_timestamp", (q) =>
          q
            .eq("userId", bs.userId)
            .gte("timestamp", yesterdayStartMs)
            .lt("timestamp", yesterdayEndMs)
        )
        .collect();

      const tradeScoredEvents = events.filter(
        (e) => e.eventType === "trade_scored"
      );
      const dailyDelta = events.reduce((sum, e) => sum + e.delta, 0);

      // ── Inactivity decay (FR17, Story 5.6) ──────────────────────────────────
      // activityRef: use lastTradeDate if traded before, else account creation time.
      // Prevents never-traded users from decaying immediately from Unix epoch 0.
      const activityRef = bs.lastTradeDate > 0 ? bs.lastTradeDate : bs.lastScoreUpdateDate;
      const daysSinceLastTrade = Math.floor((yesterdayEndMs - activityRef) / 86_400_000);
      const shouldDecay =
        !bs.isVacationMode &&                       // vacation freezes all scoring (5.4)
        !hibernation &&                              // weekends/holidays skip decay (5.5)
        daysSinceLastTrade >= INACTIVITY_GRACE_DAYS &&
        bs.currentScore > INACTIVITY_DECAY_FLOOR;

      let decayApplied = false;
      if (shouldDecay) {
        const newScore = Math.max(INACTIVITY_DECAY_FLOOR, bs.currentScore - INACTIVITY_DECAY_RATE);
        const actualDelta = newScore - bs.currentScore; // always negative

        const newScoreStage = getStageForScore(newScore);
        const decayCrossesThreshold =
          STAGE_ORDER.indexOf(newScoreStage) < STAGE_ORDER.indexOf(bs.currentStage);

        decayApplied = true;
        await ctx.db.patch(bs._id, {
          currentScore: newScore,
          previousScore: bs.currentScore,
          // Start regression buffer if decay crosses stage threshold and none is running (FR12)
          // eslint-disable-next-line eqeqeq
          ...(decayCrossesThreshold && bs.regressionBufferStart == null
            ? { regressionBufferStart: now }
            : {}),
          updatedAt: now,
        });

        await ctx.db.insert("scoreEvents", {
          userId: bs.userId,
          timestamp: now,
          eventType: "decay_applied",
          delta: actualDelta,
          previousScore: bs.currentScore,
          newScore,
          reason: `Inactivity decay — ${daysSinceLastTrade} days since last trade (FR17)`,
          antiGamingFlags: [],
          metadata: {
            daysSinceLastTrade,
            graceDays: INACTIVITY_GRACE_DAYS,
            floor: INACTIVITY_DECAY_FLOOR,
          },
          createdAt: now,
        });
      }

      await ctx.db.insert("dailySnapshots", {
        userId: bs.userId,
        date: dateStr,
        score: bs.currentScore,          // pre-decay score — represents end-of-yesterday state
        stage: bs.currentStage,
        tradesLogged: tradeScoredEvents.length,
        dailyDelta,
        decayApplied,
        streakActive: bs.streakDays > 0,
        vacationActive: bs.isVacationMode,
        hibernationActive: hibernation,
        createdAt: now,
      });
    }

    // ── Cron-driven stage transition processing (FR11, FR12) ──────────────
    // Check all users with pending cooldown/buffer — trigger deferred stage changes.
    // Runs AFTER snapshots so today's snapshot already reflects current state.
    for (const bs of allBrainStates) {
      // ── Evolution: 3-day cooldown elapsed ─────────────────────────────
      // eslint-disable-next-line eqeqeq
      if (bs.evolutionCooldownStart != null) { // != handles both null and undefined (optional field on old docs)
        const daysQualifying = Math.floor((now - bs.evolutionCooldownStart) / 86_400_000);
        const scoreBasedStage = getStageForScore(bs.currentScore);
        const wouldEvolve = STAGE_ORDER.indexOf(scoreBasedStage) > STAGE_ORDER.indexOf(bs.currentStage);

        if (wouldEvolve && daysQualifying >= 3) {
          // Trigger evolution
          const newStage = scoreBasedStage;
          const lastEntry = bs.stageHistory[bs.stageHistory.length - 1];
          const daysInPreviousStage = lastEntry
            ? Math.floor((now - lastEntry.reachedAt) / 86_400_000)
            : 0;
          const updatedHistory = [...bs.stageHistory];
          const lastIdx = updatedHistory.length - 1;
          if (lastIdx >= 0) updatedHistory[lastIdx] = { ...updatedHistory[lastIdx], leftAt: now };
          updatedHistory.push({ stage: newStage, reachedAt: now });

          const coaching = generateTransitionMessage({
            previousStage: bs.currentStage,
            newStage,
            daysInPreviousStage,
            tradeTimestamp: now,
            isEvolution: true,
          });

          // Story 7.1 — apply tier cap to effective display stage (FR34)
          const cronEvolveEffectiveStage = computeEffectiveStage(newStage, planByUser.get(bs.userId) ?? "free");

          await ctx.db.patch(bs._id, {
            currentStage: newStage,
            effectiveStage: cronEvolveEffectiveStage,
            stageHistory: updatedHistory,
            evolutionCooldownStart: null,
            latestCoachingMessage: {
              message: coaching.message,
              category: coaching.category,
              disclaimer: coaching.disclaimer,
              timestamp: now,
            },
            updatedAt: now,
          });

          await ctx.db.insert("scoreEvents", {
            userId: bs.userId,
            timestamp: now,
            eventType: "stage_transition",
            delta: 0,
            previousScore: bs.currentScore,
            newScore: bs.currentScore,
            reason: `Cron-triggered evolution: ${bs.currentStage} → ${newStage} (3-day cooldown elapsed)`,
            antiGamingFlags: [],
            metadata: { trigger: "cron", previousStage: bs.currentStage, newStage, daysQualifying },
            createdAt: now,
          });

        } else if (!wouldEvolve) {
          // Score dropped below qualifying since cooldown started — clear cooldown
          await ctx.db.patch(bs._id, { evolutionCooldownStart: null, updatedAt: now });
        }
        // else: still qualifying, still within window — leave cooldown as-is
      }

      // ── Regression: 5-day buffer elapsed ──────────────────────────────
      if (bs.regressionBufferStart !== null) {
        const daysBelow = Math.floor((now - bs.regressionBufferStart) / 86_400_000);
        const scoreBasedStage = getStageForScore(bs.currentScore);
        const wouldRegress = STAGE_ORDER.indexOf(scoreBasedStage) < STAGE_ORDER.indexOf(bs.currentStage);

        if (wouldRegress && daysBelow >= 5) {
          // Trigger regression
          const newStage = scoreBasedStage;
          const lastEntry = bs.stageHistory[bs.stageHistory.length - 1];
          const daysInPreviousStage = lastEntry
            ? Math.floor((now - lastEntry.reachedAt) / 86_400_000)
            : 0;
          const updatedHistory = [...bs.stageHistory];
          const lastIdx = updatedHistory.length - 1;
          if (lastIdx >= 0) updatedHistory[lastIdx] = { ...updatedHistory[lastIdx], leftAt: now };
          updatedHistory.push({ stage: newStage, reachedAt: now });

          const coaching = generateTransitionMessage({
            previousStage: bs.currentStage,
            newStage,
            daysInPreviousStage,
            tradeTimestamp: now,
            isEvolution: false,
          });

          // Activate recovery lock on cron-triggered regression (same as trade-time, FR28)
          const recoveryLockUntil = now + cronRecoveryDurationMs;

          // Story 7.1 — apply tier cap to effective display stage (FR34)
          const cronRegressEffectiveStage = computeEffectiveStage(newStage, planByUser.get(bs.userId) ?? "free");

          await ctx.db.patch(bs._id, {
            currentStage: newStage,
            effectiveStage: cronRegressEffectiveStage,
            stageHistory: updatedHistory,
            regressionBufferStart: null,
            regressionBufferDays: 0,
            hasRegressed: true,
            recoveryLockUntil,
            latestCoachingMessage: {
              message: coaching.message,
              category: coaching.category,
              disclaimer: coaching.disclaimer,
              timestamp: now,
            },
            updatedAt: now,
          });

          await ctx.db.insert("scoreEvents", {
            userId: bs.userId,
            timestamp: now,
            eventType: "stage_transition",
            delta: 0,
            previousScore: bs.currentScore,
            newScore: bs.currentScore,
            reason: `Cron-triggered regression: ${bs.currentStage} → ${newStage} (5-day buffer elapsed)`,
            antiGamingFlags: [],
            metadata: { trigger: "cron", previousStage: bs.currentStage, newStage, daysBelow, recoveryLockUntil },
            createdAt: now,
          });

        } else if (!wouldRegress) {
          // Score recovered above threshold during buffer window — reset buffer
          await ctx.db.patch(bs._id, {
            regressionBufferStart: null,
            regressionBufferDays: 0,
            updatedAt: now,
          });
        }
        // else: still below threshold, still in window — leave buffer as-is
      }
    }
  },
});

/**
 * Internal helper used by the score pipeline in later stories (1.2+).
 * Patches the brain state document with partial updates.
 */
/**
 * Backfill brain scores from existing trades.
 * Resets brain state + score events, then replays all trades chronologically
 * through the pure scoring pipeline. Skips anti-gaming (historical data).
 * Uses eventType "migration_replay" by default; pass replayEventType to override (Story 6.5).
 */
export const backfillBrainScores = mutation({
  args: {
    targetUserId: v.optional(v.string()),
    replayEventType: v.optional(v.union(
      v.literal("migration_replay"),
      v.literal("retroactive_recalculation"),
    )),
  },
  handler: async (ctx, args) => {
    const eventType = args.replayEventType ?? "migration_replay";
    // Support CLI usage (no auth) by accepting targetUserId, or use authenticated user
    let userId: string;
    if (args.targetUserId) {
      userId = args.targetUserId;
    } else {
      // Try auth first, fall back to finding first user with trades
      const identity = await ctx.auth.getUserIdentity();
      if (identity) {
        userId = identity.subject;
      } else {
        // CLI fallback: find first user with trades
        const anyTrade = await ctx.db.query("trades").first();
        if (!anyTrade) throw new Error("No trades found to backfill");
        userId = anyTrade.userId;
      }
    }

    // Story 7.1 — resolve planId for effectiveStage cap in retroactive recalculation (FR34)
    const backfillSub = await ctx.db
      .query("userSubscriptions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    const backfillPlanId = backfillSub?.planId ?? "free";

    // 1. Delete existing brain state, score events, daily snapshots
    const existingBrain = await ctx.db
      .query("brainStates")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    if (existingBrain) await ctx.db.delete(existingBrain._id);

    const existingEvents = await ctx.db
      .query("scoreEvents")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    for (const e of existingEvents) await ctx.db.delete(e._id);

    const existingSnapshots = await ctx.db
      .query("dailySnapshots")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    for (const s of existingSnapshots) await ctx.db.delete(s._id);

    // 2. Get all trades sorted chronologically by entryDate
    const allTrades = await ctx.db
      .query("trades")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    allTrades.sort(
      (a, b) => new Date(a.entryDate).getTime() - new Date(b.entryDate).getTime()
    );

    if (allTrades.length === 0) {
      return { scored: 0, finalScore: 0, finalStage: "beginner" as const };
    }

    // 3. Replay trades through pure scoring pipeline
    const now = Date.now();
    const firstTradeTime = new Date(allTrades[0].entryDate).getTime();

    let currentScore = 0;
    let previousScore = 0;
    let streakDays = 0;
    let streakMultiplier = 1.0;
    let currentStage: "beginner" | "intern" | "advance" | "professional" | "advance-professional" | "guru" = "beginner";
    type Stage = "beginner" | "intern" | "advance" | "professional" | "advance-professional" | "guru";
    const stageHistory: { stage: Stage; reachedAt: number; leftAt?: number }[] = [
      { stage: "beginner", reachedAt: firstTradeTime },
    ];

    let currentDay = "";
    let sameDayCount = 0;
    let dailyDelta = 0;
    let scoredCount = 0;
    let backfillWins = 0;
    let backfillClosed = 0;
    let latestCoachingMessage: { message: string; category: string; disclaimer: string; timestamp: number } | undefined = undefined;

    for (const trade of allTrades) {
      const tradeDate = trade.entryDate.slice(0, 10);
      const tradeTimestamp = new Date(trade.entryDate).getTime();
      const ruleChecklist = trade.ruleChecklist ?? [];

      // Reset same-day counters on new day
      if (tradeDate !== currentDay) {
        currentDay = tradeDate;
        sameDayCount = 0;
        dailyDelta = 0;
      }

      if (ruleChecklist.length === 0) {
        sameDayCount++;
        continue;
      }

      // Calculate using pure functions
      const newStreak = updateStreakCount(streakDays, ruleChecklist);
      const newMultiplier = getStreakMultiplier(newStreak);
      const result = calculateScore({
        ruleChecklist,
        currentScore,
        streakMultiplier: newMultiplier,
        sameDayTradeCount: sameDayCount,
      });

      const cappedDelta = applyDailyCap(result.delta, dailyDelta);
      const newScore = Math.max(0, Math.min(1000, currentScore + cappedDelta));
      const newStage = getStageForScore(newScore);
      const stageChanged = currentStage !== newStage;

      // Story 4.4: capture reachedAt BEFORE stageHistory mutation (for farewell daysInStage)
      const prevStageReachedAt = stageHistory[stageHistory.length - 1]?.reachedAt ?? tradeTimestamp;
      const backfillDaysInPreviousStage = stageChanged
        ? Math.floor((tradeTimestamp - prevStageReachedAt) / 86_400_000)
        : 0;

      if (stageChanged) {
        const lastIdx = stageHistory.length - 1;
        if (lastIdx >= 0) {
          stageHistory[lastIdx] = { ...stageHistory[lastIdx], leftAt: tradeTimestamp };
        }
        stageHistory.push({ stage: newStage, reachedAt: tradeTimestamp });
      }

      // Insert score event
      await ctx.db.insert("scoreEvents", {
        userId,
        timestamp: tradeTimestamp,
        eventType,
        delta: cappedDelta,
        previousScore: currentScore,
        newScore,
        reason: buildScoreReason(ruleChecklist, result),
        tradeId: trade.id,
        ruleCompliance: ruleChecklist,
        antiGamingFlags: [],
        metadata: {
          backfill: true,
          complianceScore: result.complianceScore,
          streakDays: newStreak,
          streakMultiplier: newMultiplier,
          diminishingFactor: result.diminishingFactor,
          sameDayTradeCount: sameDayCount,
        },
        createdAt: now,
      });

      // Accumulate win/closed counts for data-referenced coaching (FR22)
      if (trade.actualPnL !== null && trade.actualPnL !== undefined) {
        backfillClosed++;
        if (trade.actualPnL > 0) backfillWins++;
      }
      const backfillWinRate = backfillClosed > 0 ? backfillWins / backfillClosed : 0;

      // Compute compliance across last 20 scored trades (snapshot at this point)
      const bfRecentTrades = allTrades
        .slice(0, allTrades.indexOf(trade) + 1)
        .filter((t) => (t.ruleChecklist ?? []).length > 0)
        .slice(-20);
      let bfTotalRules = 0;
      let bfCompliantRules = 0;
      for (const bt of bfRecentTrades) {
        for (const r of bt.ruleChecklist ?? []) {
          bfTotalRules++;
          if (r.compliance === "yes") bfCompliantRules += 1;
          else if (r.compliance === "partial") bfCompliantRules += 0.5;
        }
      }
      const backfillCompliancePercent = bfTotalRules > 0 ? bfCompliantRules / bfTotalRules : 0;

      // Generate coaching for this trade (last one wins — stored on brain state)
      // FR20/FR21: use transition message when stage changed
      const backfillCoaching = stageChanged
        ? generateTransitionMessage({
            previousStage: currentStage,
            newStage,
            daysInPreviousStage: backfillDaysInPreviousStage,
            tradeTimestamp: tradeTimestamp,
            isEvolution: STAGE_ORDER.indexOf(newStage) > STAGE_ORDER.indexOf(currentStage),
            closedTradeCount: backfillClosed,
            userWinRate: backfillWinRate,
          })
        : generateCoachingMessage({
            complianceScore: result.complianceScore,
            streakDays: newStreak,
            antiGamingFlags: [],
            delta: cappedDelta,
            isRecoveryLock: false,
            tradeTimestamp: tradeTimestamp,
            currentStage: newStage,
            userWinRate: backfillWinRate,
            overallCompliancePercent: backfillCompliancePercent,
            closedTradeCount: backfillClosed,
          });
      latestCoachingMessage = {
        message: backfillCoaching.message,
        category: backfillCoaching.category,
        disclaimer: backfillCoaching.disclaimer,
        timestamp: tradeTimestamp,
      };

      previousScore = currentScore;
      currentScore = newScore;
      currentStage = newStage;
      streakDays = newStreak;
      streakMultiplier = newMultiplier;
      sameDayCount++;
      dailyDelta += cappedDelta;
      scoredCount++;
    }

    // 4. Create fresh brain state with final values
    const lastTradeTime = new Date(allTrades[allTrades.length - 1].entryDate).getTime();
    await ctx.db.insert("brainStates", {
      userId,
      currentScore,
      currentStage,
      effectiveStage: computeEffectiveStage(currentStage, backfillPlanId), // Story 7.1 — FR34
      previousScore,
      streakDays,
      streakMultiplier,
      lastTradeDate: lastTradeTime,
      lastScoreUpdateDate: now,
      isVacationMode: false,
      vacationEnd: null,
      hasRegressed: false,
      regressionBufferStart: null,
      regressionBufferDays: 0,
      evolutionCooldownStart: null, // Story 5.1 — no cooldown/buffer for historical replay (AC #9)
      recoveryLockUntil: null,
      stageHistory,
      ...(latestCoachingMessage ? { latestCoachingMessage } : {}),
      updatedAt: now,
      createdAt: now,
    });

    return { scored: scoredCount, finalScore: currentScore, finalStage: currentStage };
  },
});

export const updateBrainState = internalMutation({
  args: {
    userId: v.string(),
    updates: v.any(),
  },
  handler: async (ctx, { userId, updates }) => {
    const doc = await ctx.db
      .query("brainStates")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    if (!doc) throw new Error(`No brain state found for user ${userId}`);
    await ctx.db.patch(doc._id, { ...updates, updatedAt: Date.now() });
  },
});

// ─── Story 9.5 — GDPR Brain State Deletion (FR48, NFR11) ────────────────────
// Cascade deletes brainStates, scoreEvents, dailySnapshots for the authenticated user.
// Trade data is NOT affected. scoreEvents append-only rule (D5) is overridden per
// documented GDPR exception.

export const deleteUserBrainData = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUser(ctx);

    // 1. Delete brainStates (single doc per user)
    const brain = await ctx.db
      .query("brainStates")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    if (brain) await ctx.db.delete(brain._id);

    // 2. Delete ALL scoreEvents for user
    const events = await ctx.db
      .query("scoreEvents")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    for (const e of events) await ctx.db.delete(e._id);

    // 3. Delete ALL dailySnapshots for user
    const snapshots = await ctx.db
      .query("dailySnapshots")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    for (const s of snapshots) await ctx.db.delete(s._id);

    return {
      deleted: {
        brainState: brain ? 1 : 0,
        scoreEvents: events.length,
        dailySnapshots: snapshots.length,
      },
    };
  },
});
