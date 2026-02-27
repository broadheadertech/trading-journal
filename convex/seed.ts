import { mutation } from "./_generated/server";
import { requireUser } from "./helpers";
import {
  sampleTrades,
  sampleStrategies,
  sampleChecklists,
  sampleJournal,
  sampleBreakerEvents,
  sampleTriggers,
  sampleReflections,
} from "../lib/seed-data";

// Wipe all user data and reseed with fresh sample data (dev / demo use only)
export const forceReseed = mutation({
  handler: async (ctx) => {
    const userId = await requireUser(ctx);

    const tables = [
      "trades", "strategies", "checklists", "journalEntries",
      "circuitBreakerEvents", "triggerEntries", "dailyReflections",
      "weeklyReviews", "ruleBreakLogs", "cooldowns", "monthlyGoals",
    ] as const;

    for (const table of tables) {
      const rows = await ctx.db
        .query(table)
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect();
      for (const row of rows) {
        await ctx.db.delete(row._id);
      }
    }

    // Also delete profile
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    if (profile) await ctx.db.delete(profile._id);

    // Reseed
    for (const trade of sampleTrades) {
      await ctx.db.insert("trades", { ...trade, userId });
    }
    for (const strategy of sampleStrategies) {
      await ctx.db.insert("strategies", { ...strategy, userId });
    }
    for (const checklist of sampleChecklists) {
      await ctx.db.insert("checklists", { ...checklist, userId });
    }
    for (const entry of sampleJournal) {
      await ctx.db.insert("journalEntries", { ...entry, userId });
    }
    for (const event of sampleBreakerEvents) {
      await ctx.db.insert("circuitBreakerEvents", { ...event, userId });
    }
    for (const trigger of sampleTriggers) {
      await ctx.db.insert("triggerEntries", { ...trigger, userId });
    }
    for (const reflection of sampleReflections) {
      await ctx.db.insert("dailyReflections", { ...reflection, userId });
    }
  },
});

// Seed subscription plans — idempotent, can be run from CLI or by admin
export const seedPlans = mutation({
  handler: async (ctx) => {
    const existing = await ctx.db.query("subscriptionPlans").collect();
    const existingIds = new Set(existing.map((p) => p.planId));

    const plans = [
      {
        planId: "essential",
        name: "Essential",
        priceMonthly: 9,
        priceYearly: 90,
        features: [
          "Everything in Free",
          "Up to 200 trades",
          "10 strategies",
          "Goals & milestones",
          "Trade verdicts",
          "Pre-trade checklists",
          "Brain insights",
        ],
        isActive: true,
        sortOrder: 1,
      },
      {
        planId: "pro",
        name: "Pro",
        priceMonthly: 19,
        priceYearly: 190,
        features: [
          "Everything in Essential",
          "Unlimited trades & strategies",
          "What-If scenarios",
          "Advanced reports",
          "Market news feed",
          "Full brain visualization",
        ],
        isActive: true,
        sortOrder: 2,
      },
      {
        planId: "elite",
        name: "Elite",
        priceMonthly: 39,
        priceYearly: 390,
        features: [
          "Everything in Pro",
          "Priority support",
          "Early access to new features",
          "Custom coaching insights",
          "Export & API access",
        ],
        isActive: true,
        sortOrder: 3,
      },
    ];

    for (const plan of plans) {
      if (!existingIds.has(plan.planId)) {
        await ctx.db.insert("subscriptionPlans", plan);
      }
    }
  },
});

export const seedIfEmpty = mutation({
  handler: async (ctx) => {
    const userId = await requireUser(ctx);

    // Guard: only seed if user has no trades at all
    const existing = await ctx.db
      .query("trades")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    if (existing) return;

    for (const trade of sampleTrades) {
      await ctx.db.insert("trades", { ...trade, userId });
    }
    for (const strategy of sampleStrategies) {
      await ctx.db.insert("strategies", { ...strategy, userId });
    }
    for (const checklist of sampleChecklists) {
      await ctx.db.insert("checklists", { ...checklist, userId });
    }
    for (const entry of sampleJournal) {
      await ctx.db.insert("journalEntries", { ...entry, userId });
    }
    for (const event of sampleBreakerEvents) {
      await ctx.db.insert("circuitBreakerEvents", { ...event, userId });
    }
    for (const trigger of sampleTriggers) {
      await ctx.db.insert("triggerEntries", { ...trigger, userId });
    }
    for (const reflection of sampleReflections) {
      await ctx.db.insert("dailyReflections", { ...reflection, userId });
    }
  },
});
