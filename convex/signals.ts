import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getUser, requireUser } from "./helpers";

const PRO_PLUS_TIERS = new Set(["pro", "elite", "legend"]);
const TERMINAL_STATUSES = new Set(["won", "lost", "cancelled", "expired"]);

async function currentUserPlanId(ctx: { auth: { getUserIdentity: () => Promise<{ subject: string } | null> }; db: { query: (t: string) => { withIndex: (i: string, f: (q: { eq: (k: string, v: string) => unknown }) => unknown) => { first: () => Promise<{ planId?: string } | null> } } } }): Promise<string> {
  const userId = await getUser(ctx);
  if (!userId) return "free";
  // Admin auto-elevation handled in subscriptions.ts; here we read raw plan
  const adminId = process.env.ADMIN_USER_ID;
  if (adminId && userId === adminId) return "legend";
  const sub = await ctx.db
    .query("userSubscriptions")
    .withIndex("by_user", (q: { eq: (k: string, v: string) => unknown }) => q.eq("userId", userId))
    .first();
  return sub?.planId ?? "free";
}

// ─── List active + pending signals (any subscriber can read) ──────────
export const list = query({
  args: {
    market: v.optional(v.union(
      v.literal("crypto"),
      v.literal("forex"),
      v.literal("stocks"),
      v.literal("commodities"),
    )),
    status: v.optional(v.union(
      v.literal("pending"),
      v.literal("active"),
      v.literal("won"),
      v.literal("lost"),
      v.literal("cancelled"),
      v.literal("expired"),
    )),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let results;
    if (args.market && args.status) {
      results = await ctx.db
        .query("signals")
        .withIndex("by_market_status", (q) => q.eq("market", args.market!).eq("status", args.status!))
        .order("desc")
        .take(args.limit ?? 100);
    } else if (args.status) {
      results = await ctx.db
        .query("signals")
        .withIndex("by_status", (q) => q.eq("status", args.status!))
        .order("desc")
        .take(args.limit ?? 100);
    } else {
      results = await ctx.db
        .query("signals")
        .order("desc")
        .take(args.limit ?? 100);
    }
    if (args.market && !args.status) {
      results = results.filter((s) => s.market === args.market);
    }
    return results;
  },
});

// ─── Current user's posted signals ────────────────────────────────────
export const getMine = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getUser(ctx);
    if (!userId) return [];
    return ctx.db
      .query("signals")
      .withIndex("by_poster", (q) => q.eq("posterId", userId))
      .order("desc")
      .take(50);
  },
});

// ─── Post a new signal (Pro+ only) ────────────────────────────────────
export const post = mutation({
  args: {
    posterName: v.string(),
    symbol: v.string(),
    market: v.union(
      v.literal("crypto"),
      v.literal("forex"),
      v.literal("stocks"),
      v.literal("commodities"),
    ),
    direction: v.union(v.literal("long"), v.literal("short")),
    entry: v.number(),
    stopLoss: v.number(),
    takeProfit: v.number(),
    strength: v.union(v.literal("high"), v.literal("medium"), v.literal("low")),
    rationale: v.string(),
    expiresAt: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);
    const planId = await currentUserPlanId(ctx);

    if (!PRO_PLUS_TIERS.has(planId)) {
      throw new Error("Posting signals requires a Pro, Elite, or Legend subscription.");
    }

    // Validate stop/target are on the correct side of entry
    const isLong = args.direction === "long";
    if (isLong) {
      if (args.stopLoss >= args.entry) throw new Error("Long stop must be below entry.");
      if (args.takeProfit <= args.entry) throw new Error("Long target must be above entry.");
    } else {
      if (args.stopLoss <= args.entry) throw new Error("Short stop must be above entry.");
      if (args.takeProfit >= args.entry) throw new Error("Short target must be below entry.");
    }

    const risk = Math.abs(args.entry - args.stopLoss);
    const reward = Math.abs(args.takeProfit - args.entry);
    const rrRatio = risk > 0 ? reward / risk : 0;

    const now = new Date();
    const defaultExpiry = new Date(now.getTime() + 1000 * 60 * 60 * 24).toISOString();

    return await ctx.db.insert("signals", {
      posterId: userId,
      posterName: args.posterName,
      posterTier: planId,
      symbol: args.symbol.toUpperCase(),
      market: args.market,
      direction: args.direction,
      entry: args.entry,
      stopLoss: args.stopLoss,
      takeProfit: args.takeProfit,
      rrRatio,
      strength: args.strength,
      rationale: args.rationale,
      status: "pending",
      postedAt: now.toISOString(),
      expiresAt: args.expiresAt ?? defaultExpiry,
    });
  },
});

// ─── Update signal status (poster or admin only) ──────────────────────
export const updateStatus = mutation({
  args: {
    id: v.id("signals"),
    status: v.union(
      v.literal("pending"),
      v.literal("active"),
      v.literal("won"),
      v.literal("lost"),
      v.literal("cancelled"),
      v.literal("expired"),
    ),
  },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);
    const signal = await ctx.db.get(args.id);
    if (!signal) throw new Error("Signal not found");

    const adminId = process.env.ADMIN_USER_ID;
    if (signal.posterId !== userId && userId !== adminId) {
      throw new Error("Only the poster (or admin) can update this signal.");
    }

    const patch: { status: typeof args.status; closedAt?: string; actualR?: number } = {
      status: args.status,
    };

    if (TERMINAL_STATUSES.has(args.status) && !signal.closedAt) {
      patch.closedAt = new Date().toISOString();
      // Compute realized R based on outcome
      if (args.status === "won") {
        patch.actualR = signal.rrRatio;
      } else if (args.status === "lost") {
        patch.actualR = -1;
      } else {
        patch.actualR = 0;
      }
    }

    await ctx.db.patch(args.id, patch);
  },
});

// ─── Analyst leaderboard: per-poster hit-rate from closed signals ────
export const leaderboard = query({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("signals").collect();
    const byPoster = new Map<string, {
      posterId: string;
      posterName: string;
      tier: string;
      total: number;
      won: number;
      lost: number;
      activeOrPending: number;
      totalR: number;
    }>();

    for (const s of all) {
      const row = byPoster.get(s.posterId) ?? {
        posterId: s.posterId,
        posterName: s.posterName,
        tier: s.posterTier,
        total: 0,
        won: 0,
        lost: 0,
        activeOrPending: 0,
        totalR: 0,
      };

      row.posterName = s.posterName;   // refresh to latest
      row.tier = s.posterTier;

      if (s.status === "won") {
        row.total += 1;
        row.won += 1;
        row.totalR += s.actualR ?? s.rrRatio;
      } else if (s.status === "lost") {
        row.total += 1;
        row.lost += 1;
        row.totalR += s.actualR ?? -1;
      } else if (s.status === "active" || s.status === "pending") {
        row.activeOrPending += 1;
      }

      byPoster.set(s.posterId, row);
    }

    return [...byPoster.values()]
      .map((r) => ({
        ...r,
        hitRate: r.total > 0 ? r.won / r.total : 0,
        avgR: r.total > 0 ? r.totalR / r.total : 0,
      }))
      .sort((a, b) => {
        if (b.total !== a.total) return b.total - a.total;
        return b.hitRate - a.hitRate;
      });
  },
});

// ─── Per-poster summary (used inline next to a signal) ────────────────
export const posterStats = query({
  args: { posterId: v.string() },
  handler: async (ctx, { posterId }) => {
    const signals = await ctx.db
      .query("signals")
      .withIndex("by_poster", (q) => q.eq("posterId", posterId))
      .collect();

    const closed = signals.filter((s) => s.status === "won" || s.status === "lost");
    const won = signals.filter((s) => s.status === "won").length;
    const total = closed.length;

    return {
      posterId,
      total,
      won,
      hitRate: total > 0 ? won / total : 0,
    };
  },
});
