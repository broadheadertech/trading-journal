import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireUser, getUser, getEffectivePlanId } from "./helpers";
import { getLimitsForPlan } from "./tierLimits";
import { scoreTradeInternal } from "./brain";
import { api } from "./_generated/api";

export const list = query({
  handler: async (ctx) => {
    const userId = await getUser(ctx);
    if (!userId) return [];
    return ctx.db
      .query("trades")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();
  },
});

export const add = mutation({
  args: {
    id: v.string(),
    coin: v.string(),
    entryPrice: v.number(),
    exitPrice: v.union(v.null(), v.number()),
    entryDate: v.string(),
    exitDate: v.union(v.null(), v.string()),
    capital: v.number(),
    targetPnL: v.union(v.null(), v.number()),
    actualPnL: v.union(v.null(), v.number()),
    actualPnLPercent: v.union(v.null(), v.number()),
    strategy: v.string(),
    rulesFollowed: v.union(v.null(), v.boolean()),
    ruleChecklist: v.array(
      v.object({
        rule: v.string(),
        compliance: v.union(v.literal("yes"), v.literal("partial"), v.literal("no")),
      })
    ),
    reasoning: v.string(),
    emotion: v.string(),
    exitEmotion: v.union(v.null(), v.string()),
    confidence: v.number(),
    setupConfidence: v.number(),
    executionConfidence: v.number(),
    tags: v.array(v.string()),
    screenshots: v.array(v.string()),
    verdict: v.union(v.null(), v.string()),
    notes: v.string(),
    setupNotes: v.string(),
    executionNotes: v.string(),
    lessonNotes: v.string(),
    oneThingNote: v.string(),
    selfVerdict: v.union(v.null(), v.string()),
    lossHypothesis: v.union(v.null(), v.string()),
    stopLoss: v.union(v.null(), v.number()),
    marketType: v.optional(v.union(v.literal("crypto"), v.literal("stocks"), v.literal("forex"), v.literal("metals"), v.literal("oil"))),
    direction: v.optional(v.union(v.literal("long"), v.literal("short"))),
    leverage: v.optional(v.union(v.null(), v.number())),
    fees: v.optional(v.union(v.null(), v.number())),
    funding: v.optional(v.union(v.null(), v.number())),
    margin: v.optional(v.union(v.null(), v.number())),
    followedPlan: v.optional(v.union(v.null(), v.boolean())),
    isOpen: v.boolean(),
    visibility: v.optional(v.union(v.literal("public"), v.literal("private"))),
    createdAt: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);

    // Enforce trade limit based on the user's effective plan (matches what the UI shows).
    const planId = await getEffectivePlanId(ctx, userId);
    const { maxTrades } = getLimitsForPlan(planId);
    if (maxTrades !== -1) {
      const count = (await ctx.db
        .query("trades")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect()).length;
      if (count >= maxTrades) {
        throw new Error(`Trade limit reached (${maxTrades}). Upgrade your plan to add more trades.`);
      }
    }

    const tradeDocId = await ctx.db.insert("trades", { ...args, userId });

    // Atomic scoring — D7: score within same mutation
    await scoreTradeInternal(ctx, userId, args.id, args.ruleChecklist);

    return tradeDocId;
  },
});

export const update = mutation({
  args: { id: v.string(), updates: v.any() },
  handler: async (ctx, { id, updates }) => {
    const userId = await requireUser(ctx);
    const doc = await ctx.db
      .query("trades")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("id"), id))
      .first();
    if (doc) {
      await ctx.db.patch(doc._id, updates);
      // Story 6.5 — retroactively recalculate when scoring-relevant fields change (FR8)
      if (updates.ruleChecklist !== undefined) {
        await ctx.scheduler.runAfter(0, api.brain.backfillBrainScores, {
          targetUserId: userId,
          replayEventType: "retroactive_recalculation",
        });
      }
    }
  },
});

/**
 * Bulk import trades from CSV/XLSX. Inserts without scoring — use backfillBrainScores after.
 * Accepts up to 100 trades per call to stay within Convex limits.
 */
export const bulkImport = mutation({
  args: {
    trades: v.array(
      v.object({
        id: v.string(),
        coin: v.string(),
        entryPrice: v.number(),
        exitPrice: v.union(v.null(), v.number()),
        entryDate: v.string(),
        exitDate: v.union(v.null(), v.string()),
        capital: v.number(),
        targetPnL: v.union(v.null(), v.number()),
        actualPnL: v.union(v.null(), v.number()),
        actualPnLPercent: v.union(v.null(), v.number()),
        strategy: v.string(),
        rulesFollowed: v.union(v.null(), v.boolean()),
        ruleChecklist: v.array(
          v.object({
            rule: v.string(),
            compliance: v.union(v.literal("yes"), v.literal("partial"), v.literal("no")),
          })
        ),
        reasoning: v.string(),
        emotion: v.string(),
        exitEmotion: v.union(v.null(), v.string()),
        confidence: v.number(),
        setupConfidence: v.number(),
        executionConfidence: v.number(),
        tags: v.array(v.string()),
        screenshots: v.array(v.string()),
        verdict: v.union(v.null(), v.string()),
        notes: v.string(),
        setupNotes: v.string(),
        executionNotes: v.string(),
        lessonNotes: v.string(),
        oneThingNote: v.string(),
        selfVerdict: v.union(v.null(), v.string()),
        lossHypothesis: v.union(v.null(), v.string()),
        stopLoss: v.union(v.null(), v.number()),
        marketType: v.optional(v.union(v.literal("crypto"), v.literal("stocks"), v.literal("forex"), v.literal("metals"), v.literal("oil"))),
        direction: v.optional(v.union(v.literal("long"), v.literal("short"))),
        leverage: v.optional(v.union(v.null(), v.number())),
        fees: v.optional(v.union(v.null(), v.number())),
        funding: v.optional(v.union(v.null(), v.number())),
        margin: v.optional(v.union(v.null(), v.number())),
        followedPlan: v.optional(v.union(v.null(), v.boolean())),
        isOpen: v.boolean(),
        visibility: v.optional(v.union(v.literal("public"), v.literal("private"))),
        createdAt: v.string(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);

    // Enforce trade limit (use effective plan so paid users get their real cap).
    const planId = await getEffectivePlanId(ctx, userId);
    const { maxTrades } = getLimitsForPlan(planId);
    if (maxTrades !== -1) {
      const count = (await ctx.db
        .query("trades")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect()).length;
      if (count + args.trades.length > maxTrades) {
        throw new Error(
          `Import would exceed trade limit (${maxTrades}). You have ${count} trades and are trying to add ${args.trades.length}. Upgrade your plan or reduce the import.`
        );
      }
    }

    let inserted = 0;
    for (const trade of args.trades) {
      await ctx.db.insert("trades", { ...trade, userId });
      inserted++;
    }

    // Schedule brain score backfill after import
    await ctx.scheduler.runAfter(0, api.brain.backfillBrainScores, {
      targetUserId: userId,
      replayEventType: "retroactive_recalculation",
    });

    return { inserted };
  },
});

export const remove = mutation({
  args: { id: v.string() },
  handler: async (ctx, { id }) => {
    const userId = await requireUser(ctx);
    const doc = await ctx.db
      .query("trades")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("id"), id))
      .first();
    if (doc) await ctx.db.delete(doc._id);
  },
});

// Toggle a single trade's public/private visibility from the trades log.
export const setVisibility = mutation({
  args: {
    id: v.string(),
    visibility: v.union(v.literal("public"), v.literal("private")),
  },
  handler: async (ctx, { id, visibility }) => {
    const userId = await requireUser(ctx);
    const doc = await ctx.db
      .query("trades")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("id"), id))
      .first();
    if (!doc) throw new Error("Trade not found");
    await ctx.db.patch(doc._id, { visibility });
  },
});

// Public feed of a user's published trades — used by /u/[slug] profile pages.
// No auth required; only returns trades the owner explicitly marked public.
export const listPublicByUser = query({
  args: { userId: v.string(), limit: v.optional(v.number()) },
  handler: async (ctx, { userId, limit }) => {
    const all = await ctx.db
      .query("trades")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();
    const publicOnly = all.filter((t) => t.visibility === "public");
    return publicOnly.slice(0, limit ?? 50);
  },
});
