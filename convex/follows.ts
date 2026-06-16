import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireUser, getUser } from "./helpers";

// ─── Follower / following counts for a profile ───────────────────────
export const counts = query({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    const followers = await ctx.db
      .query("follows")
      .withIndex("by_following", (q) => q.eq("followingId", userId))
      .collect();
    const following = await ctx.db
      .query("follows")
      .withIndex("by_follower", (q) => q.eq("followerId", userId))
      .collect();
    return { followers: followers.length, following: following.length };
  },
});

// ─── Follower / following lists (with profile info for display) ──────
type ListedUser = {
  userId: string;
  displayName: string;
  handle: string;
  avatarUrl: string | null;
};

async function resolveProfiles(
  ctx: { db: { query: (t: "profiles") => any } },
  userIds: string[],
): Promise<ListedUser[]> {
  const out: ListedUser[] = [];
  for (const uid of userIds) {
    const p = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q: any) => q.eq("userId", uid))
      .first();
    out.push({
      userId: uid,
      displayName: p?.displayName || p?.username || p?.clerkUsername || uid.slice(0, 8),
      handle: p?.username || p?.clerkUsername || uid,
      avatarUrl: p?.avatarUrl ?? null,
    });
  }
  return out;
}

export const listFollowers = query({
  args: { userId: v.string(), limit: v.optional(v.number()) },
  handler: async (ctx, { userId, limit }) => {
    const edges = await ctx.db
      .query("follows")
      .withIndex("by_following", (q) => q.eq("followingId", userId))
      .order("desc")
      .take(limit ?? 200);
    return resolveProfiles(ctx, edges.map((e) => e.followerId));
  },
});

export const listFollowing = query({
  args: { userId: v.string(), limit: v.optional(v.number()) },
  handler: async (ctx, { userId, limit }) => {
    const edges = await ctx.db
      .query("follows")
      .withIndex("by_follower", (q) => q.eq("followerId", userId))
      .order("desc")
      .take(limit ?? 200);
    return resolveProfiles(ctx, edges.map((e) => e.followingId));
  },
});

// ─── Does the current viewer follow this target? ─────────────────────
export const isFollowing = query({
  args: { targetUserId: v.string() },
  handler: async (ctx, { targetUserId }) => {
    const viewerId = await getUser(ctx);
    if (!viewerId) return false;
    const edge = await ctx.db
      .query("follows")
      .withIndex("by_pair", (q) =>
        q.eq("followerId", viewerId).eq("followingId", targetUserId),
      )
      .first();
    return !!edge;
  },
});

// ─── Follow a user ───────────────────────────────────────────────────
// Idempotent: re-following is a no-op. Fires a "new follower" notification.
export const follow = mutation({
  args: { targetUserId: v.string() },
  handler: async (ctx, { targetUserId }) => {
    const followerId = await requireUser(ctx);
    if (followerId === targetUserId) return; // can't follow yourself — no-op rather than error

    const existing = await ctx.db
      .query("follows")
      .withIndex("by_pair", (q) =>
        q.eq("followerId", followerId).eq("followingId", targetUserId),
      )
      .first();
    if (existing) return; // already following

    const now = new Date().toISOString();
    await ctx.db.insert("follows", { followerId, followingId: targetUserId, createdAt: now });

    // Notify the followed user.
    const followerProfile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", followerId))
      .first();
    const name =
      followerProfile?.displayName ||
      followerProfile?.username ||
      followerProfile?.clerkUsername ||
      "Someone";
    const handle =
      followerProfile?.username || followerProfile?.clerkUsername || followerId;

    await ctx.db.insert("notifications", {
      userId: targetUserId,
      type: "new_follower",
      title: "New follower",
      message: `${name} started following you.`,
      read: false,
      link: `/u/${handle}`,
      timestamp: now,
    });
  },
});

// ─── Unfollow a user ─────────────────────────────────────────────────
export const unfollow = mutation({
  args: { targetUserId: v.string() },
  handler: async (ctx, { targetUserId }) => {
    const followerId = await requireUser(ctx);
    const existing = await ctx.db
      .query("follows")
      .withIndex("by_pair", (q) =>
        q.eq("followerId", followerId).eq("followingId", targetUserId),
      )
      .first();
    if (existing) await ctx.db.delete(existing._id);
  },
});
