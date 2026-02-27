import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// ─── Admin guard ─────────────────────────────────────────────────────
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

// ─── Dashboard stats ─────────────────────────────────────────────────
export const getDashboardStats = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);

    const profiles = await ctx.db.query("profiles").collect();
    const trades = await ctx.db.query("trades").collect();

    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Count unique users who have traded
    const userIds = new Set(profiles.map((p) => p.userId));
    const tradeUserIds = new Set(trades.map((t) => t.userId));

    // New signups: profiles created today/this week/this month
    // (profiles don't have createdAt — use _creationTime)
    const newToday = profiles.filter(
      (p) => new Date(p._creationTime).toISOString().slice(0, 10) === todayStr
    ).length;
    const newThisWeek = profiles.filter(
      (p) => new Date(p._creationTime) >= weekAgo
    ).length;
    const newThisMonth = profiles.filter(
      (p) => new Date(p._creationTime) >= monthAgo
    ).length;

    // Active in last 7 days = users with a trade created in last 7 days
    const activeUserIds = new Set(
      trades
        .filter((t) => new Date(t.createdAt) >= weekAgo)
        .map((t) => t.userId)
    );

    return {
      totalUsers: userIds.size,
      newToday,
      newThisWeek,
      newThisMonth,
      activeUsers7d: activeUserIds.size,
      totalTrades: trades.length,
      totalTradeUsers: tradeUserIds.size,
    };
  },
});

// ─── Users list ──────────────────────────────────────────────────────
export const listUsers = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);

    const profiles = await ctx.db.query("profiles").collect();
    const trades = await ctx.db.query("trades").collect();

    // Group trades by user
    const tradesByUser = new Map<string, typeof trades>();
    for (const t of trades) {
      const arr = tradesByUser.get(t.userId) ?? [];
      arr.push(t);
      tradesByUser.set(t.userId, arr);
    }

    return profiles.map((p) => {
      const userTrades = tradesByUser.get(p.userId) ?? [];
      const lastTrade = userTrades.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )[0];

      return {
        userId: p.userId,
        initialCapital: p.initialCapital,
        currency: p.currency ?? "USD",
        tradeCount: userTrades.length,
        lastActive: lastTrade?.createdAt ?? null,
        signedUp: new Date(p._creationTime).toISOString(),
        isBanned: p.isBanned ?? false,
        bannedReason: p.bannedReason ?? null,
      };
    });
  },
});

// ─── User detail ─────────────────────────────────────────────────────
export const getUserDetail = query({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    await requireAdmin(ctx);

    const trades = await ctx.db
      .query("trades")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    const strategies = await ctx.db
      .query("strategies")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    const reflections = await ctx.db
      .query("dailyReflections")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    const closedTrades = trades.filter((t) => !t.isOpen && t.actualPnL != null);
    const totalPnL = closedTrades.reduce((s, t) => s + (t.actualPnL ?? 0), 0);
    const wins = closedTrades.filter((t) => (t.actualPnL ?? 0) > 0).length;
    const winRate = closedTrades.length > 0 ? (wins / closedTrades.length) * 100 : 0;

    return {
      userId,
      initialCapital: profile?.initialCapital ?? 0,
      currency: profile?.currency ?? "USD",
      tradeCount: trades.length,
      openTrades: trades.filter((t) => t.isOpen).length,
      closedTrades: closedTrades.length,
      totalPnL,
      winRate,
      strategyCount: strategies.length,
      reflectionCount: reflections.length,
      signedUp: profile ? new Date(profile._creationTime).toISOString() : null,
      isBanned: profile?.isBanned ?? false,
      bannedAt: profile?.bannedAt ?? null,
      bannedReason: profile?.bannedReason ?? null,
    };
  },
});

// ─── Settings CRUD ───────────────────────────────────────────────────
export const getSettings = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    return await ctx.db.query("adminSettings").collect();
  },
});

export const setSetting = mutation({
  args: { key: v.string(), value: v.string() },
  handler: async (ctx, { key, value }) => {
    const adminId = await requireAdmin(ctx);

    const existing = await ctx.db
      .query("adminSettings")
      .withIndex("by_key", (q) => q.eq("key", key))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        value,
        updatedAt: new Date().toISOString(),
        updatedBy: adminId,
      });
    } else {
      await ctx.db.insert("adminSettings", {
        key,
        value,
        updatedAt: new Date().toISOString(),
        updatedBy: adminId,
      });
    }
  },
});

// ─── Subscription plan CRUD ──────────────────────────────────────────
export const listPlans = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    return await ctx.db.query("subscriptionPlans").collect();
  },
});

export const upsertPlan = mutation({
  args: {
    _id: v.optional(v.id("subscriptionPlans")),
    planId: v.string(),
    name: v.string(),
    priceMonthly: v.number(),
    priceYearly: v.number(),
    stripePriceIdMonthly: v.optional(v.string()),
    stripePriceIdYearly: v.optional(v.string()),
    stripeProductId: v.optional(v.string()),
    features: v.array(v.string()),
    isActive: v.boolean(),
    sortOrder: v.number(),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const { _id, ...data } = args;
    if (_id) {
      await ctx.db.patch(_id, data);
    } else {
      await ctx.db.insert("subscriptionPlans", data);
    }
  },
});

// ─── User management actions (Phase 2) ──────────────────────────────

export const banUser = mutation({
  args: { userId: v.string(), reason: v.string() },
  handler: async (ctx, { userId, reason }) => {
    const adminId = await requireAdmin(ctx);
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    if (!profile) throw new Error("User not found");

    const now = new Date().toISOString();
    await ctx.db.patch(profile._id, {
      isBanned: true,
      bannedAt: now,
      bannedReason: reason,
    });
    await ctx.db.insert("adminEvents", {
      type: "user_banned",
      userId,
      metadata: JSON.stringify({ reason }),
      timestamp: now,
      adminId,
    });
  },
});

export const unbanUser = mutation({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    const adminId = await requireAdmin(ctx);
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    if (!profile) throw new Error("User not found");

    await ctx.db.patch(profile._id, {
      isBanned: false,
      bannedAt: undefined,
      bannedReason: undefined,
    });
    await ctx.db.insert("adminEvents", {
      type: "user_unbanned",
      userId,
      metadata: JSON.stringify({}),
      timestamp: new Date().toISOString(),
      adminId,
    });
  },
});

export const overridePlan = mutation({
  args: { userId: v.string(), planId: v.string() },
  handler: async (ctx, { userId, planId }) => {
    const adminId = await requireAdmin(ctx);

    const plans = await ctx.db.query("subscriptionPlans").collect();
    const plan = plans.find((p) => p.planId === planId);
    if (!plan && planId !== "free") throw new Error("Plan not found");

    const existing = await ctx.db
      .query("userSubscriptions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    const now = new Date().toISOString();
    if (existing) {
      await ctx.db.patch(existing._id, {
        planId,
        status: planId === "free" ? "free" : "active",
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("userSubscriptions", {
        userId,
        stripeCustomerId: "",
        planId,
        status: planId === "free" ? "free" : "active",
        createdAt: now,
        updatedAt: now,
      });
    }

    await ctx.db.insert("adminEvents", {
      type: "plan_override",
      userId,
      metadata: JSON.stringify({ planId, planName: plan?.name ?? "Free" }),
      timestamp: now,
      adminId,
    });
  },
});

export const resetUserData = mutation({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    const adminId = await requireAdmin(ctx);

    const tableNames = [
      "trades", "strategies", "checklists", "journalEntries",
      "monthlyGoals", "triggerEntries", "dailyReflections",
      "weeklyReviews", "ruleBreakLogs", "circuitBreakerEvents", "cooldowns",
    ] as const;

    let totalDeleted = 0;
    for (const table of tableNames) {
      const rows = await ctx.db
        .query(table)
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect();
      for (const row of rows) {
        await ctx.db.delete(row._id);
      }
      totalDeleted += rows.length;
    }

    await ctx.db.insert("adminEvents", {
      type: "data_reset",
      userId,
      metadata: JSON.stringify({ rowsDeleted: totalDeleted }),
      timestamp: new Date().toISOString(),
      adminId,
    });
  },
});

export const getAdminUserSubscription = query({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    await requireAdmin(ctx);
    return ctx.db
      .query("userSubscriptions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
  },
});
