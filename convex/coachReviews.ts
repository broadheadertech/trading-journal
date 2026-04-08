import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireUser } from "./helpers";

export const listForCoach = query({
  args: { coachId: v.string() },
  handler: async (ctx, { coachId }) => {
    return ctx.db
      .query("coachReviews")
      .withIndex("by_coach", (q) => q.eq("coachId", coachId))
      .order("desc")
      .collect();
  },
});

export const submit = mutation({
  args: {
    id: v.string(),
    sessionId: v.string(),
    rating: v.number(),
    comment: v.string(),
    clientName: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);

    const sessions = await ctx.db.query("coachSessions").collect();
    const s = sessions.find((x) => x.id === args.sessionId);
    if (!s) throw new Error("Session not found");
    if (s.clientUserId !== userId) throw new Error("Only the client can review");
    if (s.status !== "completed") throw new Error("Session must be completed first");

    // One review per session
    const existing = await ctx.db
      .query("coachReviews")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .first();
    if (existing) throw new Error("Review already submitted");

    const rating = Math.max(1, Math.min(5, args.rating));

    await ctx.db.insert("coachReviews", {
      id: args.id,
      coachId: s.coachId,
      sessionId: args.sessionId,
      clientUserId: userId,
      clientName: args.clientName,
      rating,
      comment: args.comment,
      createdAt: new Date().toISOString(),
    });

    // Recompute coach aggregate rating
    const allReviews = await ctx.db
      .query("coachReviews")
      .withIndex("by_coach", (q) => q.eq("coachId", s.coachId))
      .collect();
    const avg = allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;

    const coaches = await ctx.db.query("coaches").collect();
    const coach = coaches.find((c) => c.id === s.coachId);
    if (coach) {
      await ctx.db.patch(coach._id, {
        avgRating: +avg.toFixed(2),
        reviewCount: allReviews.length,
      });
    }
  },
});
