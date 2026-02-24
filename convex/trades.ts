import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireUser, getUser } from "./helpers";
import { getLimitsForPlan } from "./tierLimits";

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
    marketType: v.optional(v.union(v.literal("crypto"), v.literal("stocks"), v.literal("forex"))),
    isOpen: v.boolean(),
    createdAt: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);

    // Enforce trade limit based on subscription tier
    const sub = await ctx.db
      .query("userSubscriptions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    const { maxTrades } = getLimitsForPlan(sub?.planId ?? "free");
    if (maxTrades !== -1) {
      const count = (await ctx.db
        .query("trades")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect()).length;
      if (count >= maxTrades) {
        throw new Error(`Trade limit reached (${maxTrades}). Upgrade your plan to add more trades.`);
      }
    }

    return ctx.db.insert("trades", { ...args, userId });
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
    if (doc) await ctx.db.patch(doc._id, updates);
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
