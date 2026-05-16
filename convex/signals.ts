import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getUser, requireUser, getEffectivePlanId } from "./helpers";

// Tiers allowed to post signals. Core+ during BETA so any registered user can post;
// tighten to Pro+ when paid subscriptions go live if you want posting to be a paid perk.
const PRO_PLUS_TIERS = new Set(["core", "pro", "elite"]);
const TERMINAL_STATUSES = new Set(["won", "lost", "cancelled", "expired"]);

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

// ─── Public history view for a given poster ───────────────────────────
// Used by the "view signal history" modal on each signal card.
export const byPoster = query({
  args: { posterId: v.string(), limit: v.optional(v.number()) },
  handler: async (ctx, { posterId, limit }) => {
    return ctx.db
      .query("signals")
      .withIndex("by_poster", (q) => q.eq("posterId", posterId))
      .order("desc")
      .take(limit ?? 200);
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
    orderType: v.optional(v.union(v.literal("market"), v.literal("stop"), v.literal("limit"))),
    entryLow: v.number(),
    entryHigh: v.number(),
    stopLoss: v.number(),
    takeProfits: v.array(v.number()),
    riskLevel: v.union(v.literal("high"), v.literal("medium"), v.literal("low")),
    rationale: v.string(),
    expiresAt: v.optional(v.string()),
    pipSize: v.optional(v.number()),
    lotSize: v.optional(v.number()),
    showPips: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);
    const planId = await getEffectivePlanId(ctx, userId);

    if (!PRO_PLUS_TIERS.has(planId)) {
      throw new Error("Posting signals requires a paid subscription (Core, Pro, or Elite).");
    }

    if (args.entryLow > args.entryHigh) {
      throw new Error("Entry low must be ≤ entry high.");
    }
    if (args.takeProfits.length === 0) {
      throw new Error("At least one take-profit level is required.");
    }

    const isLong = args.direction === "long";

    // SL must be on opposite side of entry zone from TPs
    if (isLong) {
      if (args.stopLoss >= args.entryLow) throw new Error("Long stop must be below entry zone.");
      for (let i = 0; i < args.takeProfits.length; i++) {
        if (args.takeProfits[i] <= args.entryHigh) {
          throw new Error(`TP${i + 1} must be above entry zone for long.`);
        }
        if (i > 0 && args.takeProfits[i] <= args.takeProfits[i - 1]) {
          throw new Error(`TP${i + 1} must be greater than TP${i} for long.`);
        }
      }
    } else {
      if (args.stopLoss <= args.entryHigh) throw new Error("Short stop must be above entry zone.");
      for (let i = 0; i < args.takeProfits.length; i++) {
        if (args.takeProfits[i] >= args.entryLow) {
          throw new Error(`TP${i + 1} must be below entry zone for short.`);
        }
        if (i > 0 && args.takeProfits[i] >= args.takeProfits[i - 1]) {
          throw new Error(`TP${i + 1} must be less than TP${i} for short.`);
        }
      }
    }

    // Anchor R:R at entryLow regardless of direction — same convention the
    // client uses to render pip distances, so displayed pips and stored R:R agree.
    const refEntry = args.entryLow;
    const risk = Math.abs(refEntry - args.stopLoss);
    const reward = Math.abs(args.takeProfits[0] - refEntry);
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
      orderType: args.orderType ?? "market",
      entryLow: args.entryLow,
      entryHigh: args.entryHigh,
      stopLoss: args.stopLoss,
      takeProfits: args.takeProfits,
      rrRatio,
      riskLevel: args.riskLevel,
      rationale: args.rationale,
      status: "active",
      postedAt: now.toISOString(),
      expiresAt: args.expiresAt ?? defaultExpiry,
      pipSize: args.pipSize,
      lotSize: args.lotSize,
      showPips: args.showPips,
    });
  },
});

// ─── Edit a signal's content (poster only, while still open) ──────────
// Lets the poster fix typos, add TPs, adjust levels, or update the rationale.
// Re-runs the same validation as `post` and recomputes rrRatio. Cannot be
// used after the signal has been closed (won/lost/cancelled/expired).
export const edit = mutation({
  args: {
    id: v.id("signals"),
    symbol: v.string(),
    market: v.union(
      v.literal("crypto"),
      v.literal("forex"),
      v.literal("stocks"),
      v.literal("commodities"),
    ),
    direction: v.union(v.literal("long"), v.literal("short")),
    orderType: v.optional(v.union(v.literal("market"), v.literal("stop"), v.literal("limit"))),
    entryLow: v.number(),
    entryHigh: v.number(),
    stopLoss: v.number(),
    takeProfits: v.array(v.number()),
    riskLevel: v.union(v.literal("high"), v.literal("medium"), v.literal("low")),
    rationale: v.string(),
    pipSize: v.optional(v.number()),
    lotSize: v.optional(v.number()),
    showPips: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);
    const signal = await ctx.db.get(args.id);
    if (!signal) throw new Error("Signal not found");

    const adminId = process.env.ADMIN_USER_ID;
    if (signal.posterId !== userId && userId !== adminId) {
      throw new Error("Only the poster (or admin) can edit this signal.");
    }
    if (TERMINAL_STATUSES.has(signal.status)) {
      throw new Error("Closed signals cannot be edited.");
    }

    // Same validation rules as `post`
    if (args.entryLow > args.entryHigh) {
      throw new Error("Entry low must be ≤ entry high.");
    }
    if (args.takeProfits.length === 0) {
      throw new Error("At least one take-profit level is required.");
    }

    const isLong = args.direction === "long";
    if (isLong) {
      if (args.stopLoss >= args.entryLow) throw new Error("Long stop must be below entry zone.");
      for (let i = 0; i < args.takeProfits.length; i++) {
        if (args.takeProfits[i] <= args.entryHigh) {
          throw new Error(`TP${i + 1} must be above entry zone for long.`);
        }
        if (i > 0 && args.takeProfits[i] <= args.takeProfits[i - 1]) {
          throw new Error(`TP${i + 1} must be greater than TP${i} for long.`);
        }
      }
    } else {
      if (args.stopLoss <= args.entryHigh) throw new Error("Short stop must be above entry zone.");
      for (let i = 0; i < args.takeProfits.length; i++) {
        if (args.takeProfits[i] >= args.entryLow) {
          throw new Error(`TP${i + 1} must be below entry zone for short.`);
        }
        if (i > 0 && args.takeProfits[i] >= args.takeProfits[i - 1]) {
          throw new Error(`TP${i + 1} must be less than TP${i} for short.`);
        }
      }
    }

    const refEntry = args.entryLow;
    const risk = Math.abs(refEntry - args.stopLoss);
    const reward = Math.abs(args.takeProfits[0] - refEntry);
    const rrRatio = risk > 0 ? reward / risk : 0;

    await ctx.db.patch(args.id, {
      symbol: args.symbol.toUpperCase(),
      market: args.market,
      direction: args.direction,
      orderType: args.orderType ?? "market",
      entryLow: args.entryLow,
      entryHigh: args.entryHigh,
      stopLoss: args.stopLoss,
      takeProfits: args.takeProfits,
      rrRatio,
      riskLevel: args.riskLevel,
      rationale: args.rationale,
      pipSize: args.pipSize,
      lotSize: args.lotSize,
      showPips: args.showPips,
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
    tpHit: v.optional(v.number()),  // 1-based; required when status=won and >1 TP
  },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);
    const signal = await ctx.db.get(args.id);
    if (!signal) throw new Error("Signal not found");

    const adminId = process.env.ADMIN_USER_ID;
    if (signal.posterId !== userId && userId !== adminId) {
      throw new Error("Only the poster (or admin) can update this signal.");
    }

    const patch: {
      status: typeof args.status;
      closedAt?: string;
      actualR?: number;
      tpHit?: number;
    } = { status: args.status };

    if (TERMINAL_STATUSES.has(args.status) && !signal.closedAt) {
      patch.closedAt = new Date().toISOString();

      if (args.status === "won") {
        // Compute realized R from entryLow — same anchor used at post / edit time.
        const tpIndex = args.tpHit ? args.tpHit - 1 : 0;
        const tp = signal.takeProfits[tpIndex] ?? signal.takeProfits[0];
        const refEntry = signal.entryLow;
        const risk = Math.abs(refEntry - signal.stopLoss);
        const reward = Math.abs(tp - refEntry);
        patch.actualR = risk > 0 ? reward / risk : 0;
        patch.tpHit = args.tpHit ?? 1;
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
