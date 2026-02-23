import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireUser, getUser } from "./helpers";

export const list = query({
  handler: async (ctx) => {
    const userId = await getUser(ctx);
    if (!userId) return [];
    return ctx.db
      .query("checklists")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();
  },
});

export const add = mutation({
  args: {
    id: v.string(),
    marketTrend: v.string(),
    volumeAnalysis: v.string(),
    supportLevels: v.string(),
    resistanceLevels: v.string(),
    newsEvents: v.string(),
    riskLevel: v.string(),
    notes: v.string(),
    aiRecommendation: v.optional(v.string()),
    createdAt: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);
    return ctx.db.insert("checklists", { ...args, userId });
  },
});

export const remove = mutation({
  args: { id: v.string() },
  handler: async (ctx, { id }) => {
    const userId = await requireUser(ctx);
    const doc = await ctx.db
      .query("checklists")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("id"), id))
      .first();
    if (doc) await ctx.db.delete(doc._id);
  },
});
