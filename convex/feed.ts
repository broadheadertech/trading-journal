import { query } from "./_generated/server";
import { v } from "convex/values";
import { getUser } from "./helpers";

// Bounds so a single feed read stays cheap. The feed is a "recent activity"
// surface, not an exhaustive history — older items live on each user's profile.
const MAX_FOLLOWING = 80;   // fan-in cap: only the 80 most recent follows feed in
const PER_SOURCE = 8;       // recent items per source, per followed user

/**
 * Aggregated activity from everyone the viewer follows: new signals, public
 * trades, and published blog posts — merged newest-first. Returns
 * `{ following, items }`; `following` is 0 when the viewer follows nobody (so
 * the UI can show the right empty state vs. "no recent activity").
 */
export const getFollowingFeed = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit }) => {
    const viewer = await getUser(ctx);
    if (!viewer) return { following: 0, items: [] };

    const edges = await ctx.db
      .query("follows")
      .withIndex("by_follower", (q) => q.eq("followerId", viewer))
      .order("desc")
      .take(MAX_FOLLOWING);
    const followingIds = edges.map((e) => e.followingId);
    if (followingIds.length === 0) return { following: 0, items: [] };

    // Resolve each followed user's display identity once.
    const profiles = new Map<string, { name: string; handle: string; avatar: string | null }>();
    for (const uid of followingIds) {
      const p = await ctx.db
        .query("profiles")
        .withIndex("by_user", (q) => q.eq("userId", uid))
        .first();
      profiles.set(uid, {
        name: p?.displayName || p?.username || p?.clerkUsername || uid.slice(0, 8),
        handle: p?.username || p?.clerkUsername || uid,
        avatar: p?.avatarUrl ?? null,
      });
    }
    const poster = (uid: string) => {
      const p = profiles.get(uid)!;
      return { posterId: uid, posterName: p.name, posterHandle: p.handle, posterAvatar: p.avatar };
    };

    type FeedItem = Record<string, unknown> & { id: string; kind: string; ts: string };
    const items: FeedItem[] = [];

    for (const uid of followingIds) {
      // Signals — all statuses.
      const signals = await ctx.db
        .query("signals")
        .withIndex("by_poster", (q) => q.eq("posterId", uid))
        .order("desc")
        .take(PER_SOURCE);
      for (const s of signals) {
        items.push({
          id: `signal-${s._id}`, kind: "signal", ts: s.postedAt, signalId: s._id, ...poster(uid),
          symbol: s.symbol, market: s.market, direction: s.direction, status: s.status,
          tpHit: s.tpHit ?? null, entryLow: s.entryLow, entryHigh: s.entryHigh,
          stopLoss: s.stopLoss, rrRatio: s.rrRatio,
        });
      }

      // Public trades only — take a window then filter (most trades are private).
      const trades = await ctx.db
        .query("trades")
        .withIndex("by_user", (q) => q.eq("userId", uid))
        .order("desc")
        .take(PER_SOURCE * 4);
      for (const t of trades.filter((t) => t.visibility === "public").slice(0, PER_SOURCE)) {
        items.push({
          id: `trade-${t._id}`, kind: "trade", ts: t.createdAt, ...poster(uid),
          coin: t.coin, direction: t.direction ?? "long", actualPnL: t.actualPnL,
          entryPrice: t.entryPrice, exitPrice: t.exitPrice, isOpen: t.isOpen,
        });
      }

      // Published articles.
      const articles = await ctx.db
        .query("articles")
        .withIndex("by_author", (q) => q.eq("authorUserId", uid))
        .order("desc")
        .take(PER_SOURCE * 2);
      for (const a of articles.filter((a) => a.status === "published").slice(0, PER_SOURCE)) {
        items.push({
          id: `article-${a._id}`, kind: "article", ts: a.publishedAt ?? a.createdAt, ...poster(uid),
          slug: a.slug, title: a.title, excerpt: a.excerpt, category: a.category,
        });
      }
    }

    // ISO timestamps sort lexically — newest first.
    items.sort((a, b) => (a.ts < b.ts ? 1 : -1));
    return { following: followingIds.length, items: items.slice(0, limit ?? 50) };
  },
});
