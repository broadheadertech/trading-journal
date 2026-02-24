import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireUser, getUser } from "./helpers";
import { getLimitsForPlan } from "./tierLimits";

export const list = query({
  handler: async (ctx) => {
    const userId = await getUser(ctx);
    if (!userId) return [];
    return ctx.db
      .query("strategies")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();
  },
});

export const add = mutation({
  args: {
    id: v.string(),
    name: v.string(),
    type: v.string(),
    rules: v.array(v.string()),
    entryChecklist: v.array(v.string()),
    exitChecklist: v.array(v.string()),
    riskParams: v.object({
      maxPositionSize: v.optional(v.number()),
      maxLossPercent: v.optional(v.number()),
      riskRewardRatio: v.optional(v.number()),
      maxDailyLoss: v.optional(v.number()),
    }),
    createdAt: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);

    // Enforce strategy limit based on subscription tier
    const sub = await ctx.db
      .query("userSubscriptions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    const { maxStrategies } = getLimitsForPlan(sub?.planId ?? "free");
    if (maxStrategies !== -1) {
      const count = (await ctx.db
        .query("strategies")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect()).length;
      if (count >= maxStrategies) {
        throw new Error(`Strategy limit reached (${maxStrategies}). Upgrade your plan to add more strategies.`);
      }
    }

    return ctx.db.insert("strategies", { ...args, userId });
  },
});

export const update = mutation({
  args: { id: v.string(), updates: v.any() },
  handler: async (ctx, { id, updates }) => {
    const userId = await requireUser(ctx);
    const doc = await ctx.db
      .query("strategies")
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
      .query("strategies")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("id"), id))
      .first();
    if (doc) await ctx.db.delete(doc._id);
  },
});
