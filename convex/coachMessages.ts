import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireUser, getUser } from "./helpers";

async function assertSessionParticipant(ctx: any, sessionId: string, userId: string) {
  const all = await ctx.db.query("coachSessions").collect();
  const s = all.find((x: any) => x.id === sessionId);
  if (!s) throw new Error("Session not found");
  if (s.clientUserId !== userId && s.coachUserId !== userId) {
    throw new Error("Forbidden");
  }
  return s;
}

export const listForSession = query({
  args: { sessionId: v.string() },
  handler: async (ctx, { sessionId }) => {
    const userId = await getUser(ctx);
    if (!userId) return [];
    // Only participants can read
    const sessions = await ctx.db.query("coachSessions").collect();
    const s = sessions.find((x) => x.id === sessionId);
    if (!s) return [];
    if (s.clientUserId !== userId && s.coachUserId !== userId) return [];

    const msgs = await ctx.db
      .query("coachMessages")
      .withIndex("by_session_created", (q) => q.eq("sessionId", sessionId))
      .collect();
    return msgs.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  },
});

export const send = mutation({
  args: {
    id: v.string(),
    sessionId: v.string(),
    body: v.string(),
    fromName: v.string(),
    fromImage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);
    await assertSessionParticipant(ctx, args.sessionId, userId);

    return ctx.db.insert("coachMessages", {
      id: args.id,
      sessionId: args.sessionId,
      fromUserId: userId,
      fromName: args.fromName,
      fromImage: args.fromImage,
      body: args.body,
      createdAt: new Date().toISOString(),
    });
  },
});

export const markAllRead = mutation({
  args: { sessionId: v.string() },
  handler: async (ctx, { sessionId }) => {
    const userId = await requireUser(ctx);
    await assertSessionParticipant(ctx, sessionId, userId);

    const msgs = await ctx.db
      .query("coachMessages")
      .withIndex("by_session", (q) => q.eq("sessionId", sessionId))
      .collect();
    const now = new Date().toISOString();
    for (const m of msgs) {
      if (m.fromUserId !== userId && !m.readAt) {
        await ctx.db.patch(m._id, { readAt: now });
      }
    }
  },
});
