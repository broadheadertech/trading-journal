import { query } from "./_generated/server";
import { v } from "convex/values";
import { getUser } from "./helpers";

/**
 * Directory of everyone who posts signals, each with a summary of their signal
 * record (totals, win/loss, hit-rate, avg R, active/pending counts, markets,
 * follower count, and whether the viewer follows them). Unlike `getTopAnalysts`
 * this includes every poster — even brand-new ones with no closed signals yet —
 * since it powers the Trading Signals "providers" view, not just a leaderboard.
 */
export const getSignalProviders = query({
  args: {},
  handler: async (ctx) => {
    const viewer = await getUser(ctx);

    const followingSet = new Set<string>();
    if (viewer) {
      const edges = await ctx.db
        .query("follows")
        .withIndex("by_follower", (q) => q.eq("followerId", viewer))
        .take(1000);
      edges.forEach((e) => followingSet.add(e.followingId));
    }

    const all = await ctx.db.query("signals").collect();
    const byPoster = new Map<string, {
      posterId: string; posterName: string; tier: string;
      total: number; won: number; lost: number; active: number; pending: number;
      totalR: number; markets: Set<string>; lastPostedAt: string;
    }>();
    for (const s of all) {
      const row = byPoster.get(s.posterId) ?? {
        posterId: s.posterId, posterName: s.posterName, tier: s.posterTier,
        total: 0, won: 0, lost: 0, active: 0, pending: 0,
        totalR: 0, markets: new Set<string>(), lastPostedAt: "",
      };
      row.posterName = s.posterName;
      row.tier = s.posterTier;
      row.total += 1;
      if (s.status === "won") { row.won += 1; row.totalR += s.actualR ?? s.rrRatio; }
      else if (s.status === "lost") { row.lost += 1; row.totalR += s.actualR ?? -1; }
      else if (s.status === "active") row.active += 1;
      else if (s.status === "pending") row.pending += 1;
      row.markets.add(s.market);
      if (s.postedAt > row.lastPostedAt) row.lastPostedAt = s.postedAt;
      byPoster.set(s.posterId, row);
    }

    const out = [];
    for (const r of byPoster.values()) {
      const closed = r.won + r.lost;
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
        active: r.active,
        pending: r.pending,
        closed,
        hitRate: closed ? Math.round((r.won / closed) * 100) : 0,
        avgR: closed ? Math.round((r.totalR / closed) * 10) / 10 : 0,
        markets: [...r.markets],
        followers,
        isFollowing: followingSet.has(r.posterId),
        isSelf: !!viewer && r.posterId === viewer,
        lastPostedAt: r.lastPostedAt,
      });
    }

    // Most prolific / best-performing providers first.
    out.sort((a, b) => (b.total !== a.total ? b.total - a.total : b.hitRate - a.hitRate));
    return out;
  },
});

/**
 * "Top analysts" to discover/follow: posters whose COMBINED win-rate across
 * their closed trades and closed signals is >= 50%. Ranked by that blended
 * win-rate (then volume), enriched with follower count + whether the viewer
 * already follows them.
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

    // Signal performance per poster.
    const all = await ctx.db.query("signals").collect();
    const byPoster = new Map<string, {
      posterId: string; posterName: string; tier: string;
      sigWon: number; sigLost: number; totalR: number;
    }>();
    for (const s of all) {
      const row = byPoster.get(s.posterId) ?? {
        posterId: s.posterId, posterName: s.posterName, tier: s.posterTier,
        sigWon: 0, sigLost: 0, totalR: 0,
      };
      row.posterName = s.posterName;
      row.tier = s.posterTier;
      if (s.status === "won") { row.sigWon++; row.totalR += s.actualR ?? s.rrRatio; }
      else if (s.status === "lost") { row.sigLost++; row.totalR += s.actualR ?? -1; }
      byPoster.set(s.posterId, row);
    }

    // Blend each poster's closed TRADES with their closed signals, then keep
    // only analysts whose combined win-rate is at least 50%.
    const combined = [];
    for (const r of byPoster.values()) {
      if (r.posterId === viewer) continue;
      const trades = await ctx.db
        .query("trades")
        .withIndex("by_user", (q) => q.eq("userId", r.posterId))
        .collect();
      let tWon = 0;
      let tLost = 0;
      for (const t of trades) {
        if (t.isOpen || t.actualPnL == null) continue;
        if (t.actualPnL > 0) tWon++;
        else if (t.actualPnL < 0) tLost++;
      }
      const wins = r.sigWon + tWon;
      const losses = r.sigLost + tLost;
      const closed = wins + losses;
      if (closed === 0) continue;
      const winRate = wins / closed;
      if (winRate < 0.5) continue; // top-analyst bar: 50%+ across trades & signals
      combined.push({
        ...r, wins, losses, closed, winRate,
        sigClosed: r.sigWon + r.sigLost,
        tradeClosed: tWon + tLost,
      });
    }

    const ranked = combined
      .sort((a, b) => (b.winRate !== a.winRate ? b.winRate - a.winRate : b.closed - a.closed))
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
        winRate: Math.round(r.winRate * 100),
        won: r.wins,
        lost: r.losses,
        signals: r.sigClosed,
        trades: r.tradeClosed,
        avgR: r.sigClosed ? Math.round((r.totalR / r.sigClosed) * 10) / 10 : 0,
        followers,
        isFollowing: followingSet.has(r.posterId),
      });
    }
    return out;
  },
});
