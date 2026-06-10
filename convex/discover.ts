import { query } from "./_generated/server";
import { v } from "convex/values";
import { getUser } from "./helpers";

// Minimum closed signals for an analyst to be rankable — keeps one-lucky-call
// accounts off the discovery list.
const MIN_CLOSED = 3;

/**
 * Ranked analysts to discover/follow, derived from closed signal outcomes.
 * Ranks by track-record volume then hit-rate (same spirit as the analyst
 * leaderboard), and enriches each with follower count + whether the current
 * viewer already follows them (so the UI can show Follow vs Following).
 */
export const getTopAnalysts = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit }) => {
    const viewer = await getUser(ctx);

    // The viewer's current following set (so we can render Follow/Following).
    const followingSet = new Set<string>();
    if (viewer) {
      const edges = await ctx.db
        .query("follows")
        .withIndex("by_follower", (q) => q.eq("followerId", viewer))
        .take(1000);
      edges.forEach((e) => followingSet.add(e.followingId));
    }

    // Aggregate closed-signal performance per poster.
    const all = await ctx.db.query("signals").collect();
    const byPoster = new Map<string, {
      posterId: string; posterName: string; tier: string;
      total: number; won: number; lost: number; totalR: number;
    }>();
    for (const s of all) {
      const row = byPoster.get(s.posterId) ?? {
        posterId: s.posterId, posterName: s.posterName, tier: s.posterTier,
        total: 0, won: 0, lost: 0, totalR: 0,
      };
      row.posterName = s.posterName;
      row.tier = s.posterTier;
      if (s.status === "won") { row.total++; row.won++; row.totalR += s.actualR ?? s.rrRatio; }
      else if (s.status === "lost") { row.total++; row.lost++; row.totalR += s.actualR ?? -1; }
      byPoster.set(s.posterId, row);
    }

    const ranked = [...byPoster.values()]
      .filter((r) => r.total >= MIN_CLOSED && r.posterId !== viewer)
      .map((r) => ({
        ...r,
        hitRate: r.total ? r.won / r.total : 0,
        avgR: r.total ? r.totalR / r.total : 0,
      }))
      .sort((a, b) => (b.total !== a.total ? b.total - a.total : b.hitRate - a.hitRate))
      .slice(0, limit ?? 25);

    // Enrich with follower count + profile identity.
    const out = [];
    for (const r of ranked) {
      const followers = (await ctx.db
        .query("follows")
        .withIndex("by_following", (q) => q.eq("followingId", r.posterId))
        .collect()).length;
      const p = await ctx.db
        .query("profiles")
        .withIndex("by_user", (q) => q.eq("userId", r.posterId))
        .first();
      out.push({
        posterId: r.posterId,
        name: p?.displayName || p?.username || r.posterName || r.posterId.slice(0, 8),
        handle: p?.username || p?.clerkUsername || r.posterId,
        avatar: p?.avatarUrl ?? null,
        tier: r.tier,
        total: r.total,
        won: r.won,
        lost: r.lost,
        hitRate: Math.round(r.hitRate * 100),
        avgR: Math.round(r.avgR * 10) / 10,
        followers,
        isFollowing: followingSet.has(r.posterId),
      });
    }
    return out;
  },
});
