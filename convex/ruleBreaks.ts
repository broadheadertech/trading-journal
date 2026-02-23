import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireUser, getUser } from "./helpers";

export const list = query({
  handler: async (ctx) => {
    const userId = await getUser(ctx);
    if (!userId) return [];
    return ctx.db
      .query("ruleBreakLogs")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();
  },
});

export const add = mutation({
  args: {
    id: v.string(),
    tradeId: v.string(),
    ruleName: v.string(),
    explanation: v.string(),
    timestamp: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);
    return ctx.db.insert("ruleBreakLogs", { ...args, userId });
  },
});
