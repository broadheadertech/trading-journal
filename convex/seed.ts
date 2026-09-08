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

// Seed subscription plans — UPSERT semantics so re-running picks up edits
// to prices, features, or copy. Old plans not in this list are deactivated
// (kept in the table so existing user subscriptions don't break, but hidden
// from the landing page).
export const seedPlans = mutation({
  handler: async (ctx) => {
    const plans = [
      {
        planId: "core",
        name: "Atlas Core",
        tagline: "For beginner to intermediate solo traders",
        priceMonthly: 29,
        priceYearly: 290,
        stripePriceIdMonthly: "price_1TYLOzGwHwvTu3Zmj1YQFXkg",
        stripePriceIdYearly:  "price_1TYLYzGwHwvTu3ZmRVuOrcop",
        stripeProductId:      "prod_UXQF5kZbz7ZPJa",
        features: [
          "Unlimited trade journaling",
          "Basic performance analytics (PnL, win rate, equity curve)",
          "Trading journal + notes system",
          "Basic playbook rules",
          "Manual trade entry",
          "Dashboard insights (Net PnL, trades, win rate)",
          "Access to trading tools (calculator, session tracker)",
          "Economic calendar access",
        ],
        goal: "Get traders consistent & disciplined",
        isActive: true,
        isHighlighted: false,
        sortOrder: 1,
      },
      {
        planId: "pro",
        name: "Atlas Pro",
        tagline: "For serious traders leveling up performance",
        priceMonthly: 39,
        priceYearly: 390,
        stripePriceIdMonthly: "price_1TYLPCGwHwvTu3ZmqG4wgnCa",
        stripePriceIdYearly:  "price_1TYLXoGwHwvTu3ZmUc2RFe95",
        stripeProductId:      "prod_UXQFYZ5CrL3ufx",
        features: [
          "Everything in Core",
          "Advanced analytics (50+ metrics)",
          "AI trade insights / mistake detection",
          "Playbook automation & rule tracking",
          "Trade tagging & strategy breakdown",
          "Equity curve + drawdown analytics",
          "Session & activity heatmap",
          "API sync (MT4/MT5 / supported brokers)",
          "Performance reports & export",
          "Priority support",
        ],
        goal: "Turn traders into data-driven performers",
        isActive: true,
        isHighlighted: true,
        sortOrder: 2,
      },
      {
        planId: "elite",
        name: "Atlas Elite",
        tagline: "For mentors, funded traders, and trading communities",
        priceMonthly: 59,
        priceYearly: 590,
        stripePriceIdMonthly: "price_1TYLPZGwHwvTu3ZmevkmMAx7",
        stripePriceIdYearly:  "price_1TYLUyGwHwvTu3ZmpGpI4phA",
        stripeProductId:      "prod_UXQGwBHHKmzvOe",
        features: [
          "Everything in Pro",
          "Team / student management system",
          "Shared workspace (Discord / community integration)",
          "Cohort analytics (track students or members)",
          "Trade review & coaching tools",
          "Leaderboards & performance rankings",
          "Audit logs (track member activity)",
          "Aggregated reports (group performance)",
          "Invite system (build your academy inside Atlas)",
          "Early access to new features",
          "VIP support",
        ],
        goal: "Build your Atlas Trading Academy ecosystem",
        isActive: true,
        isHighlighted: false,
        sortOrder: 3,
      },
    ];

    const wantedIds = new Set(plans.map((p) => p.planId));
    const existing = await ctx.db.query("subscriptionPlans").collect();
    const byPlanId = new Map(existing.map((p) => [p.planId, p]));

    for (const plan of plans) {
      const found = byPlanId.get(plan.planId);
      if (found) {
        await ctx.db.patch(found._id, plan);
      } else {
        await ctx.db.insert("subscriptionPlans", plan);
      }
    }

    // Deactivate any legacy plans not in the new lineup (essential/legend/etc.)
    for (const old of existing) {
      if (!wantedIds.has(old.planId) && old.isActive) {
        await ctx.db.patch(old._id, { isActive: false });
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
