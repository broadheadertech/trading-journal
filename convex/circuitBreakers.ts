import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireUser, getUser } from "./helpers";

// ─── Circuit Breaker Events ───────────────────────────────────────────────────

export const listEvents = query({
  handler: async (ctx) => {
    const userId = await getUser(ctx);
    if (!userId) return [];
    return ctx.db
      .query("circuitBreakerEvents")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();
  },
});

export const logEvent = mutation({
  args: {
    id: v.string(),
    type: v.string(),
    triggeredAt: v.string(),
    severity: v.union(v.literal("warning"), v.literal("block")),
    message: v.string(),
    overridden: v.boolean(),
    overriddenAt: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);
    return ctx.db.insert("circuitBreakerEvents", { ...args, userId });
  },
});

export const overrideEvent = mutation({
  args: { id: v.string() },
  handler: async (ctx, { id }) => {
    const userId = await requireUser(ctx);
    const doc = await ctx.db
      .query("circuitBreakerEvents")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("id"), id))
      .first();
    if (doc) {
      await ctx.db.patch(doc._id, {
        overridden: true,
        overriddenAt: new Date().toISOString(),
      });
    }
  },
});

// ─── Cooldowns ───────────────────────────────────────────────────────────────

export const listCooldowns = query({
  handler: async (ctx) => {
    const userId = await getUser(ctx);
    if (!userId) return [];
    return ctx.db
      .query("cooldowns")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
  },
});

export const startCooldown = mutation({
  args: {
    id: v.string(),
    type: v.string(),
    expiresAt: v.string(),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);
    // Remove existing cooldown of same type
    const existing = await ctx.db
      .query("cooldowns")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("type"), args.type))
      .first();
    if (existing) await ctx.db.delete(existing._id);
    return ctx.db.insert("cooldowns", { ...args, userId });
  },
});

export const clearCooldown = mutation({
  args: { type: v.string() },
  handler: async (ctx, { type }) => {
    const userId = await requireUser(ctx);
    const doc = await ctx.db
      .query("cooldowns")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("type"), type))
      .first();
    if (doc) await ctx.db.delete(doc._id);
  },
});

export const cleanupExpiredCooldowns = mutation({
  handler: async (ctx) => {
    const userId = await getUser(ctx);
    if (!userId) return;
    const now = new Date().toISOString();
    const all = await ctx.db
      .query("cooldowns")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    for (const c of all) {
      if (c.expiresAt <= now) await ctx.db.delete(c._id);
    }
  },
});
