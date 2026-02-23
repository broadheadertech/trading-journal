import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireUser, getUser } from "./helpers";

export const list = query({
  handler: async (ctx) => {
    const userId = await getUser(ctx);
    if (!userId) return [];
    return ctx.db
      .query("triggerEntries")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();
  },
});

export const add = mutation({
  args: {
    id: v.string(),
    timestamp: v.string(),
    source: v.string(),
    description: v.string(),
    emotionalImpact: v.string(),
    intensityBefore: v.number(),
    intensityAfter: v.number(),
    didTrade: v.boolean(),
    tradeId: v.optional(v.string()),
    outcome: v.optional(v.union(v.null(), v.string())),
    createdAt: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);
    return ctx.db.insert("triggerEntries", { ...args, userId });
  },
});

export const update = mutation({
  args: { id: v.string(), updates: v.any() },
  handler: async (ctx, { id, updates }) => {
    const userId = await requireUser(ctx);
    const doc = await ctx.db
      .query("triggerEntries")
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
      .query("triggerEntries")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("id"), id))
      .first();
    if (doc) await ctx.db.delete(doc._id);
  },
});
