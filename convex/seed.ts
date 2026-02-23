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
