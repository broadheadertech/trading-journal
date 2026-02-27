import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import {
  PHANTOM_TRADE_WINDOW_MS,
  PHANTOM_TRADE_THRESHOLD,
  PNL_ANOMALY_MIN_TRADES,
  PNL_ANOMALY_WIN_RATE,
  RECOVERY_LOCK_DURATION_MS,
  RECOVERY_LOCK_MAX_TRADES_PER_DAY,
} from "./lib/antiGaming";

// ─── Admin guard (matches convex/admin.ts:requireAdmin exactly) ───────────────
type AuthCtx = {
  auth: { getUserIdentity: () => Promise<{ subject: string } | null> };
};

async function requireAdmin(ctx: AuthCtx): Promise<string> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Unauthenticated");
  const adminId = process.env.ADMIN_USER_ID;
  if (!adminId || identity.subject !== adminId) {
    throw new Error("Forbidden");
  }
  return identity.subject;
}

// Fixed stage order — must match STAGE_ORDER in convex/brain.ts
const STAGES = ["beginner", "intern", "advance", "professional", "advance-professional", "guru"] as const;
type Stage = (typeof STAGES)[number];

// ─── Brain stage distribution (FR38) ─────────────────────────────────────────

/**
 * Story 8.1 — FR38: Aggregate count + percentage of users at each brain stage.
 * Returns both currentStage (earned) and effectiveStage (visible/tier-capped)
 * distributions so admin can see Free-tier cap impact.
 *
 * Full table scan — correct for admin aggregate queries (no per-user filter needed).
 * Pre-7.1 docs without effectiveStage fall back to currentStage (AC6).
 */
export const getBrainStageDistribution = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);

    const allStates = await ctx.db.query("brainStates").collect();
    const total = allStates.length;

    const currentCounts: Record<Stage, number> = {
      'beginner': 0, 'intern': 0, 'advance': 0, 'professional': 0, 'advance-professional': 0, 'guru': 0,
    };
    const effectiveCounts: Record<Stage, number> = {
      'beginner': 0, 'intern': 0, 'advance': 0, 'professional': 0, 'advance-professional': 0, 'guru': 0,
    };

    for (const s of allStates) {
      if (s.currentStage in currentCounts) {
        currentCounts[s.currentStage as Stage]++;
      }
      // AC6: pre-7.1 docs have no effectiveStage field — treat as same as currentStage
      const eff = (s.effectiveStage ?? s.currentStage) as Stage;
      if (eff in effectiveCounts) {
        effectiveCounts[eff]++;
      }
    }

    return {
      total,
      distribution: STAGES.map((stage) => ({
        stage,
        currentCount: currentCounts[stage],
        effectiveCount: effectiveCounts[stage],
        currentPct: total > 0 ? (currentCounts[stage] / total) * 100 : 0,
        effectivePct: total > 0 ? (effectiveCounts[stage] / total) * 100 : 0,
      })),
    };
  },
});

// ─── Anti-gaming threshold configuration (FR40) ─────────────────────────────

const THRESHOLD_KEYS = {
  phantomTradeWindowMs:        { key: "ag_phantom_trade_window_ms",          default: PHANTOM_TRADE_WINDOW_MS },
  phantomTradeThreshold:       { key: "ag_phantom_trade_threshold",          default: PHANTOM_TRADE_THRESHOLD },
  pnlAnomalyMinTrades:        { key: "ag_pnl_anomaly_min_trades",           default: PNL_ANOMALY_MIN_TRADES },
  pnlAnomalyWinRate:          { key: "ag_pnl_anomaly_win_rate",             default: PNL_ANOMALY_WIN_RATE },
  recoveryLockDurationMs:     { key: "ag_recovery_lock_duration_ms",        default: RECOVERY_LOCK_DURATION_MS },
  recoveryLockMaxTradesPerDay: { key: "ag_recovery_lock_max_trades_per_day", default: RECOVERY_LOCK_MAX_TRADES_PER_DAY },
} as const;

// Exported for brain.ts runtime reads
export { THRESHOLD_KEYS };

/**
 * Story 8.3 — FR40: Return current anti-gaming thresholds.
 * Reads from adminSettings (key-value store) with hardcoded fallbacks.
 */
export const getAntiGamingThresholds = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const allSettings = await ctx.db.query("adminSettings").collect();
    const get = (k: string, fallback: number) => {
      const s = allSettings.find((row) => row.key === k);
      return s ? Number(s.value) : fallback;
    };
    const thresholds = Object.fromEntries(
      Object.entries(THRESHOLD_KEYS).map(([name, { key, default: def }]) => [name, get(key, def)])
    ) as Record<keyof typeof THRESHOLD_KEYS, number>;
    return thresholds;
  },
});

/**
 * Story 8.3 — FR40 + NFR10: Update anti-gaming thresholds.
 * Upserts each changed value into adminSettings, logs batch change to adminEvents.
 */
export const updateAntiGamingThresholds = mutation({
  args: {
    thresholds: v.object({
      phantomTradeWindowMs: v.optional(v.number()),
      phantomTradeThreshold: v.optional(v.number()),
      pnlAnomalyMinTrades: v.optional(v.number()),
      pnlAnomalyWinRate: v.optional(v.number()),
      recoveryLockDurationMs: v.optional(v.number()),
      recoveryLockMaxTradesPerDay: v.optional(v.number()),
    }),
  },
  handler: async (ctx, { thresholds }) => {
    const adminId = await requireAdmin(ctx);
    const allSettings = await ctx.db.query("adminSettings").collect();
    const changes: { key: string; oldValue: string; newValue: string }[] = [];

    for (const [name, value] of Object.entries(thresholds)) {
      if (value === undefined) continue;
      const config = THRESHOLD_KEYS[name as keyof typeof THRESHOLD_KEYS];
      if (!config) continue;
      const existing = allSettings.find((s) => s.key === config.key);
      const oldValue = existing?.value ?? String(config.default);
      const newValue = String(value);
      if (oldValue === newValue) continue;

      if (existing) {
        await ctx.db.patch(existing._id, {
          value: newValue,
          updatedAt: new Date().toISOString(),
          updatedBy: adminId,
        });
      } else {
        await ctx.db.insert("adminSettings", {
          key: config.key,
          value: newValue,
          updatedAt: new Date().toISOString(),
          updatedBy: adminId,
        });
      }
      changes.push({ key: config.key, oldValue, newValue });
    }

    // NFR10: Audit log for threshold changes
    if (changes.length > 0) {
      await ctx.db.insert("adminEvents", {
        type: "threshold_updated",
        userId: adminId,
        metadata: JSON.stringify({ changes }),
        timestamp: new Date().toISOString(),
        adminId,
      });
    }

    return { updated: changes.length };
  },
});

// ─── Anti-gaming flag alerts (FR39) ─────────────────────────────────────────

/**
 * Story 8.2 — FR39: List scoreEvents with non-empty antiGamingFlags.
 * Full table scan — no cross-user flag index exists. Same pattern as
 * getBrainStageDistribution. Returns 100 most recent flagged events.
 *
 * Convex useQuery auto-subscribes → satisfies NFR22 (<1 min surfacing).
 */
export const getAntiGamingFlags = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);

    const allEvents = await ctx.db.query("scoreEvents").collect();
    const flaggedAll = allEvents.filter((e) => e.antiGamingFlags.length > 0);
    const flaggedTotal = flaggedAll.length;

    const flags = flaggedAll
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 100);

    return { flags, total: flaggedTotal };
  },
});

// ─── Individual user brain inspection (FR41) ────────────────────────────────

/**
 * Story 8.4 — FR41: Inspect individual user brain state.
 * Per-user indexed lookup (not full scan). Returns brain state + plan context.
 */
export const getAdminUserBrainState = query({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    await requireAdmin(ctx);
    const brainState = await ctx.db
      .query("brainStates")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    if (!brainState) return null;
    const sub = await ctx.db
      .query("userSubscriptions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    return {
      ...brainState,
      planId: sub?.planId ?? "free",
    };
  },
});

/**
 * Story 8.4 — FR41: Score event audit trail for a specific user.
 * Uses by_user_timestamp index with desc order. Efficient indexed read.
 */
export const getAdminUserScoreEvents = query({
  args: {
    userId: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { userId, limit }) => {
    await requireAdmin(ctx);
    const take = Math.max(1, Math.min(limit ?? 50, 500));
    return ctx.db
      .query("scoreEvents")
      .withIndex("by_user_timestamp", (q) => q.eq("userId", userId))
      .order("desc")
      .take(take);
  },
});

// ─── Neuro Score distribution trends (FR42) ─────────────────────────────────

/**
 * Story 8.5 — FR42: Time-series trends from dailySnapshots.
 * Full table scan → filter by date range → group by date → aggregate.
 * Same pattern as getBrainStageDistribution (Story 8.1).
 *
 * Convex useQuery auto-subscribes → satisfies NFR23 (<5 min surfacing).
 */
export const getNeuroScoreTrends = query({
  args: { days: v.optional(v.number()) },
  handler: async (ctx, { days }) => {
    await requireAdmin(ctx);
    const lookback = Math.max(1, Math.min(days ?? 30, 365));

    // Compute cutoff date string (YYYY-MM-DD) — string comparison works for this format
    const cutoff = new Date(Date.now() - lookback * 86_400_000)
      .toISOString()
      .slice(0, 10);

    const allSnapshots = await ctx.db.query("dailySnapshots").collect();
    const filtered = allSnapshots.filter((s) => s.date >= cutoff);

    // Group by date
    const byDate = new Map<string, (typeof filtered)>();
    for (const s of filtered) {
      const arr = byDate.get(s.date) ?? [];
      arr.push(s);
      byDate.set(s.date, arr);
    }

    // Compute per-date aggregates
    const trends = Array.from(byDate.entries())
      .map(([date, snaps]) => {
        const scores = snaps.map((s) => s.score).sort((a, b) => a - b);
        const n = scores.length;
        const avgScore = Math.round((scores.reduce((a, b) => a + b, 0) / n) * 10) / 10;
        const medianScore =
          n % 2 === 1
            ? Math.round(scores[Math.floor(n / 2)] * 10) / 10
            : Math.round(((scores[n / 2 - 1] + scores[n / 2]) / 2) * 10) / 10;
        const avgDelta =
          Math.round((snaps.reduce((a, s) => a + s.dailyDelta, 0) / n) * 10) / 10;

        // Stage distribution counts
        const stageCounts: Record<string, number> = {};
        for (const stage of STAGES) stageCounts[stage] = 0;
        for (const s of snaps) {
          if (s.stage in stageCounts) stageCounts[s.stage]++;
        }

        return { date, avgScore, medianScore, avgDelta, totalUsers: n, stageCounts };
      })
      .sort((a, b) => a.date.localeCompare(b.date));

    return { trends };
  },
});

/**
 * Story 8.4 — NFR10: Log admin action when inspecting a user's brain state.
 */
export const logAdminBrainInspection = mutation({
  args: { inspectedUserId: v.string() },
  handler: async (ctx, { inspectedUserId }) => {
    const adminId = await requireAdmin(ctx);
    await ctx.db.insert("adminEvents", {
      type: "brain_inspected",
      userId: inspectedUserId,
      metadata: JSON.stringify({}),
      timestamp: new Date().toISOString(),
      adminId,
    });
  },
});

/**
 * Story 8.2 — NFR10: Log admin action when a flag is expanded/viewed.
 * Inserts into adminEvents table (append-only audit trail).
 */
export const logAdminFlagView = mutation({
  args: {
    scoreEventId: v.id("scoreEvents"),
    flaggedUserId: v.string(),
    flags: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const adminSubject = await requireAdmin(ctx);
    await ctx.db.insert("adminEvents", {
      type: "flag_viewed",
      userId: args.flaggedUserId,
      metadata: JSON.stringify({
        scoreEventId: args.scoreEventId,
        flags: args.flags,
      }),
      timestamp: new Date().toISOString(),
      adminId: adminSubject,
    });
  },
});
