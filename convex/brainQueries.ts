import { query } from "./_generated/server";
import { getUser } from "./helpers";
import { v } from "convex/values";

// Legacy stage names from before the 2026-02 rename (baby→beginner, etc.)
// Map old → new so documents written before the rename don't crash the UI.
const LEGACY_STAGE_MAP: Record<string, string> = {
  baby: "beginner",
  toddler: "intern",
  kid: "advance",
  teen: "professional",
  adult: "advance-professional",
  master: "advance-professional",
};

function normalizeStage(stage: string): string {
  return LEGACY_STAGE_MAP[stage] ?? stage;
}

/** Returns the current brain state for the authenticated user, or null if none exists. */
export const getBrainState = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getUser(ctx);
    if (!userId) return null;
    const doc = (await ctx.db
      .query("brainStates")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first()) ?? null;
    if (!doc) return null;
    // Remap legacy stage names so old Convex documents don't crash the UI
    return {
      ...doc,
      currentStage: normalizeStage(doc.currentStage),
      effectiveStage: doc.effectiveStage ? normalizeStage(doc.effectiveStage) : doc.effectiveStage,
      stageHistory: doc.stageHistory?.map(
        (entry: { stage: string; reachedAt: number; leftAt?: number }) => ({
          ...entry,
          stage: normalizeStage(entry.stage),
        })
      ),
    };
  },
});

/** Returns recent score events for chart visualization. */
export const getScoreTimeline = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const userId = await getUser(ctx);
    if (!userId) return [];
    const take = args.limit ?? 100;
    const events = await ctx.db
      .query("scoreEvents")
      .withIndex("by_user_timestamp", (q) => q.eq("userId", userId))
      .order("desc")
      .take(take);
    return events.reverse();
  },
});

/** Returns recent daily snapshots for trend visualization. */
export const getDailySnapshots = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const userId = await getUser(ctx);
    if (!userId) return [];
    const take = args.limit ?? 30;
    return ctx.db
      .query("dailySnapshots")
      .withIndex("by_user_date", (q) => q.eq("userId", userId))
      .order("desc")
      .take(take);
  },
});

/** Returns the stage history array from the brain state document. */
export const getStageHistory = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getUser(ctx);
    if (!userId) return [];
    const brainState = await ctx.db
      .query("brainStates")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    return brainState?.stageHistory ?? [];
  },
});

/**
 * Returns migration status for the authenticated user (Story 6.3 — FR33).
 * Used by Story 6.4 to detect migration users and trigger the time-lapse cinematic.
 * isMigrationUser = has trades in DB but no brain state (backfill pending or never run).
 */
export const getMigrationStatus = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getUser(ctx);
    if (!userId) return { isMigrationUser: false, tradeCount: 0, hasBrainState: false };

    const brainState = await ctx.db
      .query("brainStates")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    const trades = await ctx.db
      .query("trades")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    return {
      isMigrationUser: !brainState && trades.length > 0,
      tradeCount: trades.length,
      hasBrainState: !!brainState,
    };
  },
});
