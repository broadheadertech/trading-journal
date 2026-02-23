import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireUser } from "./helpers";
import { migrateTrade } from "../lib/migrate";

export const importFromLocalStorage = mutation({
  args: { json: v.string() },
  handler: async (ctx, { json }) => {
    const userId = await requireUser(ctx);

    // Guard: refuse if user already has cloud data
    const existing = await ctx.db
      .query("trades")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    if (existing) throw new Error("User already has cloud data — cannot overwrite");

    let data: any;
    try {
      data = JSON.parse(json);
    } catch {
      throw new Error("Invalid JSON");
    }

    for (const raw of (data.trades ?? [])) {
      const trade = migrateTrade(raw);
      await ctx.db.insert("trades", { ...trade, userId });
    }
    for (const strategy of (data.strategies ?? [])) {
      await ctx.db.insert("strategies", { ...strategy, userId });
    }
    for (const checklist of (data.checklists ?? [])) {
      await ctx.db.insert("checklists", { ...checklist, userId });
    }
    for (const entry of (data.journal ?? [])) {
      await ctx.db.insert("journalEntries", { ...entry, userId });
    }
    for (const goal of (data.goals ?? [])) {
      await ctx.db.insert("monthlyGoals", { ...goal, userId });
    }
    for (const trigger of (data.triggers ?? [])) {
      await ctx.db.insert("triggerEntries", { ...trigger, userId });
    }
    for (const reflection of (data.reflections ?? [])) {
      await ctx.db.insert("dailyReflections", { ...reflection, userId });
    }
    for (const review of (data.weeklyReviews ?? [])) {
      await ctx.db.insert("weeklyReviews", { ...review, userId });
    }
    for (const log of (data.ruleBreaks ?? [])) {
      await ctx.db.insert("ruleBreakLogs", { ...log, userId });
    }
    for (const event of (data.breakerEvents ?? [])) {
      await ctx.db.insert("circuitBreakerEvents", { ...event, userId });
    }
  },
});
