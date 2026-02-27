import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireUser } from "./helpers";

/**
 * Append-only insert for score events.
 * NO update or delete mutations — this is an immutable audit log (D5).
 */
export const insertScoreEvent = mutation({
  args: {
    timestamp: v.number(),
    eventType: v.union(
      v.literal("trade_scored"),
      v.literal("decay_applied"),
      v.literal("migration_replay"),
      v.literal("admin_adjustment")
    ),
    delta: v.number(),
    previousScore: v.number(),
    newScore: v.number(),
    reason: v.string(),
    tradeId: v.optional(v.string()),
    ruleCompliance: v.optional(
      v.array(
        v.object({
          rule: v.string(),
          compliance: v.union(
            v.literal("yes"),
            v.literal("partial"),
            v.literal("no")
          ),
        })
      )
    ),
    antiGamingFlags: v.array(v.string()),
    metadata: v.any(),
  },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);
    return ctx.db.insert("scoreEvents", {
      ...args,
      userId,
      createdAt: Date.now(),
    });
  },
});
