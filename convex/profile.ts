import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireUser, getUser } from "./helpers";

export const get = query({
  handler: async (ctx) => {
    const userId = await getUser(ctx);
    if (!userId) return null;
    return ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
  },
});

export const getBanStatus = query({
  handler: async (ctx) => {
    const userId = await getUser(ctx);
    if (!userId) return null;
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    if (!profile) return null;
    return {
      isBanned: profile.isBanned ?? false,
      bannedReason: profile.bannedReason ?? null,
    };
  },
});

export const setCapital = mutation({
  args: { amount: v.number() },
  handler: async (ctx, { amount }) => {
    const userId = await requireUser(ctx);
    const existing = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, { initialCapital: amount });
    } else {
      await ctx.db.insert("profiles", { userId, initialCapital: amount });
    }
  },
});

export const setDailyGoal = mutation({
  args: {
    dailyLossLimit: v.optional(v.number()),
    dailyProfitTarget: v.optional(v.number()),
    goalMode: v.optional(v.union(v.literal('daily'), v.literal('session'))),
  },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);
    const existing = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, args);
    } else {
      await ctx.db.insert("profiles", { userId, initialCapital: 0, ...args });
    }
  },
});

export const completeOnboarding = mutation({
  args: {
    initialCapital: v.number(),
    currency: v.string(),
    primaryMarket: v.string(),
  },
  handler: async (ctx, { initialCapital, currency, primaryMarket }) => {
    const userId = await requireUser(ctx);
    const existing = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, {
        initialCapital,
        currency,
        primaryMarket,
        onboardingComplete: true,
      });
    } else {
      await ctx.db.insert("profiles", {
        userId,
        initialCapital,
        currency,
        primaryMarket,
        onboardingComplete: true,
      });
    }
  },
});

export const setCurrency = mutation({
  args: { currency: v.string() },
  handler: async (ctx, { currency }) => {
    const userId = await requireUser(ctx);
    const existing = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, { currency });
    } else {
      await ctx.db.insert("profiles", { userId, initialCapital: 0, currency });
    }
  },
});
