import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getUser, requireUser } from "./helpers";

// Re-use admin guard for admin-only queries
type AuthCtx = {
  auth: { getUserIdentity: () => Promise<{ subject: string } | null> };
};
async function requireAdmin(ctx: AuthCtx): Promise<string> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Unauthenticated");
  const adminId = process.env.ADMIN_USER_ID;
  if (!adminId || identity.subject !== adminId) throw new Error("Forbidden");
  return identity.subject;
}

// ─── User-facing queries ────────────────────────────────────────────

export const getUserSubscription = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getUser(ctx);
    if (!userId) return null;
    return ctx.db
      .query("userSubscriptions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
  },
});

export const getActivePlans = query({
  args: {},
  handler: async (ctx) => {
    return ctx.db
      .query("subscriptionPlans")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect();
  },
});

// ─── User mutation ──────────────────────────────────────────────────

export const ensureFreeSubscription = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUser(ctx);
    const existing = await ctx.db
      .query("userSubscriptions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (!existing) {
      const now = new Date().toISOString();
      await ctx.db.insert("userSubscriptions", {
        userId,
        stripeCustomerId: "",
        planId: "free",
        status: "free",
        createdAt: now,
        updatedAt: now,
      });
      await ctx.db.insert("adminEvents", {
        type: "user_signup",
        userId,
        metadata: JSON.stringify({}),
        timestamp: now,
      });
    }
    return existing;
  },
});

// ─── Server-side functions (called from API routes via ConvexHttpClient) ─

const subscriptionStatus = v.union(
  v.literal("active"),
  v.literal("trialing"),
  v.literal("past_due"),
  v.literal("canceled"),
  v.literal("unpaid"),
  v.literal("incomplete"),
  v.literal("free"),
);

export const upsertSubscription = mutation({
  args: {
    userId: v.string(),
    stripeCustomerId: v.string(),
    stripeSubscriptionId: v.optional(v.string()),
    planId: v.string(),
    status: subscriptionStatus,
    interval: v.optional(v.union(v.literal("month"), v.literal("year"))),
    currentPeriodEnd: v.optional(v.string()),
    cancelAtPeriodEnd: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("userSubscriptions")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();

    const now = new Date().toISOString();
    if (existing) {
      await ctx.db.patch(existing._id, { ...args, updatedAt: now });
    } else {
      await ctx.db.insert("userSubscriptions", { ...args, createdAt: now, updatedAt: now });
    }
    await ctx.db.insert("adminEvents", {
      type: "subscription_change",
      userId: args.userId,
      metadata: JSON.stringify({ planId: args.planId, status: args.status }),
      timestamp: now,
    });
  },
});

export const findByStripeCustomer = query({
  args: { stripeCustomerId: v.string() },
  handler: async (ctx, { stripeCustomerId }) => {
    return ctx.db
      .query("userSubscriptions")
      .withIndex("by_stripe_customer", (q) => q.eq("stripeCustomerId", stripeCustomerId))
      .first();
  },
});

export const findByUser = query({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    return ctx.db
      .query("userSubscriptions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
  },
});

export const findPlanByStripePriceId = query({
  args: { stripePriceId: v.string() },
  handler: async (ctx, { stripePriceId }) => {
    const plans = await ctx.db.query("subscriptionPlans").collect();
    return plans.find(
      (p) => p.stripePriceIdMonthly === stripePriceId || p.stripePriceIdYearly === stripePriceId
    ) ?? null;
  },
});

// ─── Admin queries ──────────────────────────────────────────────────

export const getRevenueStats = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);

    const allSubs = await ctx.db.query("userSubscriptions").collect();
    const plans = await ctx.db.query("subscriptionPlans").collect();
    const planMap = new Map(plans.map((p) => [p.planId, p]));

    const activeSubs = allSubs.filter((s) => s.status === "active" || s.status === "trialing");

    let mrr = 0;
    for (const sub of activeSubs) {
      const plan = planMap.get(sub.planId);
      if (!plan) continue;
      if (sub.interval === "year") {
        mrr += plan.priceYearly / 12;
      } else {
        mrr += plan.priceMonthly;
      }
    }

    const subscribersByPlan: Record<string, number> = {};
    for (const sub of activeSubs) {
      subscribersByPlan[sub.planId] = (subscribersByPlan[sub.planId] ?? 0) + 1;
    }

    return {
      mrr,
      arr: mrr * 12,
      totalActiveSubscribers: activeSubs.length,
      pastDue: allSubs.filter((s) => s.status === "past_due").length,
      canceled: allSubs.filter((s) => s.status === "canceled").length,
      totalFree: allSubs.filter((s) => s.status === "free").length,
      subscribersByPlan,
    };
  },
});

export const listSubscriptions = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    return ctx.db.query("userSubscriptions").collect();
  },
});

// ─── Revenue charts (Phase 2) ───────────────────────────────────────

export const getSubscriberGrowth = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const subs = await ctx.db.query("userSubscriptions").collect();

    const monthMap = new Map<string, number>();
    for (const sub of subs) {
      if (sub.status === "free") continue;
      const month = sub.createdAt.slice(0, 7);
      monthMap.set(month, (monthMap.get(month) ?? 0) + 1);
    }

    return Array.from(monthMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-12)
      .map(([month, count]) => ({ month, count }));
  },
});

export const getPlanDistribution = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const subs = await ctx.db.query("userSubscriptions").collect();
    const plans = await ctx.db.query("subscriptionPlans").collect();
    const planMap = new Map(plans.map((p) => [p.planId, p.name]));

    const activeSubs = subs.filter(
      (s) => s.status === "active" || s.status === "trialing" || s.status === "free"
    );

    const countByPlan = new Map<string, number>();
    for (const sub of activeSubs) {
      countByPlan.set(sub.planId, (countByPlan.get(sub.planId) ?? 0) + 1);
    }

    const total = activeSubs.length || 1;
    return Array.from(countByPlan.entries()).map(([planId, count]) => ({
      planId,
      planName: planMap.get(planId) ?? planId,
      count,
      percentage: Math.round((count / total) * 100),
    }));
  },
});
