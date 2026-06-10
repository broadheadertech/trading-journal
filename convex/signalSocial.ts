import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireUser, getUser } from "./helpers";

// ─── Like count + my-like + comment count for one card ───────────────
export const getSignalSummary = query({
  args: { signalId: v.id("signals") },
  handler: async (ctx, { signalId }) => {
    const viewer = await getUser(ctx);
    const likes = await ctx.db
      .query("signalLikes")
      .withIndex("by_signal", (q) => q.eq("signalId", signalId))
      .collect();
    const comments = await ctx.db
      .query("signalComments")
      .withIndex("by_signal", (q) => q.eq("signalId", signalId))
      .collect();
    return {
      likeCount: likes.length,
      likedByMe: viewer ? likes.some((l) => l.userId === viewer) : false,
      commentCount: comments.length,
    };
  },
});

// ─── Toggle a like on a signal ───────────────────────────────────────
export const toggleLike = mutation({
  args: { signalId: v.id("signals") },
  handler: async (ctx, { signalId }) => {
    const userId = await requireUser(ctx);
    const existing = await ctx.db
      .query("signalLikes")
      .withIndex("by_user_signal", (q) => q.eq("userId", userId).eq("signalId", signalId))
      .first();
    if (existing) {
      await ctx.db.delete(existing._id);
      return { liked: false };
    }
    await ctx.db.insert("signalLikes", {
      userId,
      signalId,
      createdAt: new Date().toISOString(),
    });
    return { liked: true };
  },
});

// ─── Comments ────────────────────────────────────────────────────────
export const listComments = query({
  args: { signalId: v.id("signals") },
  handler: async (ctx, { signalId }) => {
    const comments = await ctx.db
      .query("signalComments")
      .withIndex("by_signal", (q) => q.eq("signalId", signalId))
      .order("asc")
      .collect();
    const viewer = await getUser(ctx);
    return comments.map((c) => ({ ...c, isMine: c.authorId === viewer }));
  },
});

export const addComment = mutation({
  args: { signalId: v.id("signals"), body: v.string() },
  handler: async (ctx, { signalId, body }) => {
    const userId = await requireUser(ctx);
    const trimmed = body.trim().slice(0, 500);
    if (!trimmed) throw new Error("Comment cannot be empty.");

    const signal = await ctx.db.get(signalId);
    if (!signal) throw new Error("Signal not found.");

    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    const authorName =
      profile?.displayName || profile?.username || profile?.clerkUsername || "Trader";

    await ctx.db.insert("signalComments", {
      signalId,
      authorId: userId,
      authorName,
      authorImage: profile?.avatarUrl ?? undefined,
      body: trimmed,
      createdAt: new Date().toISOString(),
    });

    // Notify the signal's poster (unless they commented on their own).
    if (signal.posterId !== userId) {
      await ctx.db.insert("notifications", {
        userId: signal.posterId,
        type: "signal_comment",
        title: "New comment",
        message: `${authorName} commented on your ${signal.symbol} signal`,
        read: false,
        link: `/u/${profile?.username || profile?.clerkUsername || userId}`,
        timestamp: new Date().toISOString(),
      });
    }
  },
});

export const deleteComment = mutation({
  args: { commentId: v.id("signalComments") },
  handler: async (ctx, { commentId }) => {
    const userId = await requireUser(ctx);
    const c = await ctx.db.get(commentId);
    if (!c) return;
    const adminId = process.env.ADMIN_USER_ID;
    if (c.authorId !== userId && userId !== adminId) {
      throw new Error("Only the author can delete this comment.");
    }
    await ctx.db.delete(commentId);
  },
});
