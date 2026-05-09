import { query, mutation, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { getUser, requireUser } from "./helpers";

function generateToken(): string {
  // 32-char hex token (sufficient entropy for a per-user webhook secret)
  const chars = "abcdef0123456789";
  let s = "tsync_";
  for (let i = 0; i < 32; i++) s += chars[Math.floor(Math.random() * 16)];
  return s;
}

// ─── Get the current user's MT connection (or null) ─────────────────
export const getMine = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getUser(ctx);
    if (!userId) return null;
    return ctx.db
      .query("mtConnections")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
  },
});

// ─── Connect / regenerate token ─────────────────────────────────────
export const connect = mutation({
  args: {
    brokerName: v.optional(v.string()),
    mtAccountNumber: v.optional(v.string()),
    mtServer: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);
    const existing = await ctx.db
      .query("mtConnections")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    const now = new Date().toISOString();
    if (existing) {
      await ctx.db.patch(existing._id, {
        brokerName: args.brokerName ?? existing.brokerName,
        mtAccountNumber: args.mtAccountNumber ?? existing.mtAccountNumber,
        mtServer: args.mtServer ?? existing.mtServer,
        isActive: true,
      });
      return existing.syncToken;
    }

    const token = generateToken();
    await ctx.db.insert("mtConnections", {
      userId,
      syncToken: token,
      brokerName: args.brokerName,
      mtAccountNumber: args.mtAccountNumber,
      mtServer: args.mtServer,
      tradesSynced: 0,
      isActive: true,
      createdAt: now,
    });
    return token;
  },
});

// ─── Regenerate (revokes the old token) ─────────────────────────────
export const regenerateToken = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUser(ctx);
    const existing = await ctx.db
      .query("mtConnections")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    if (!existing) throw new Error("No MT connection. Connect first.");

    const newToken = generateToken();
    await ctx.db.patch(existing._id, { syncToken: newToken, isActive: true });
    return newToken;
  },
});

// ─── Disconnect (deactivates token; trades stay) ────────────────────
export const disconnect = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUser(ctx);
    const existing = await ctx.db
      .query("mtConnections")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    if (!existing) return;
    await ctx.db.patch(existing._id, { isActive: false });
  },
});

// ─── Internal: lookup connection by token (used by HTTP webhook) ────
export const getByToken = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    return ctx.db
      .query("mtConnections")
      .withIndex("by_token", (q) => q.eq("syncToken", token))
      .first();
  },
});

// ─── Internal: ingest a deal from the EA ────────────────────────────
// Called by the HTTP action after token validation. Writes a closed-trade
// row into the `trades` table.
export const ingestDeal = internalMutation({
  args: {
    userId: v.string(),
    connectionId: v.id("mtConnections"),
    deal: v.object({
      ticket: v.string(),               // MT5 deal/position ticket
      symbol: v.string(),
      direction: v.union(v.literal("long"), v.literal("short")),
      volume: v.number(),               // lots
      entryPrice: v.number(),
      exitPrice: v.number(),
      entryDate: v.string(),            // ISO
      exitDate: v.string(),             // ISO
      profit: v.number(),               // realized P&L incl. fees
      stopLoss: v.optional(v.number()),
      takeProfit: v.optional(v.number()),
      commission: v.optional(v.number()),
      swap: v.optional(v.number()),
      comment: v.optional(v.string()),
    }),
  },
  handler: async (ctx, args) => {
    // Avoid duplicates — if a trade with this MT5 ticket already exists, skip
    const existing = await ctx.db
      .query("trades")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) => q.eq(q.field("id"), `mt5:${args.deal.ticket}`))
      .first();
    if (existing) return { skipped: true, id: existing._id };

    const d = args.deal;
    const fees = (d.commission ?? 0) + (d.swap ?? 0);
    const capital = Math.abs(d.entryPrice * d.volume);  // notional approximation
    const pnlPercent = capital > 0 ? (d.profit / capital) * 100 : 0;

    const inserted = await ctx.db.insert("trades", {
      userId: args.userId,
      id: `mt5:${d.ticket}`,
      coin: d.symbol,
      entryPrice: d.entryPrice,
      exitPrice: d.exitPrice,
      entryDate: d.entryDate,
      exitDate: d.exitDate,
      capital,
      targetPnL: d.takeProfit ? Math.abs(d.takeProfit - d.entryPrice) * d.volume : null,
      actualPnL: d.profit,
      actualPnLPercent: pnlPercent,
      strategy: "MT5 sync",
      rulesFollowed: null,
      ruleChecklist: [],
      reasoning: d.comment ?? "",
      emotion: "Neutral",
      exitEmotion: null,
      confidence: 5,
      setupConfidence: 5,
      executionConfidence: 5,
      tags: ["mt5", "auto-sync"],
      screenshots: [],
      verdict: null,
      notes: "",
      setupNotes: "",
      executionNotes: "",
      lessonNotes: "",
      oneThingNote: "",
      selfVerdict: null,
      lossHypothesis: null,
      stopLoss: d.stopLoss ?? null,
      direction: d.direction,
      fees,
      isOpen: false,
      createdAt: new Date().toISOString(),
    });

    // Bump connection counters
    const conn = await ctx.db.get(args.connectionId);
    if (conn) {
      await ctx.db.patch(args.connectionId, {
        tradesSynced: conn.tradesSynced + 1,
        lastSyncAt: new Date().toISOString(),
      });
    }

    return { skipped: false, id: inserted };
  },
});
