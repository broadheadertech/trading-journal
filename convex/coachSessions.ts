import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireUser, getUser } from "./helpers";

const ADMIN_USER_ID = process.env.ADMIN_USER_ID;
const PLATFORM_FEE_PCT = 0.15; // 15% commission

const sessionStatus = v.union(
  v.literal("pending"),
  v.literal("confirmed"),
  v.literal("in_progress"),
  v.literal("completed"),
  v.literal("cancelled"),
  v.literal("disputed"),
);

// ─── Listing ────────────────────────────────────────────────────────
export const myClientSessions = query({
  handler: async (ctx) => {
    const userId = await getUser(ctx);
    if (!userId) return [];
    return ctx.db
      .query("coachSessions")
      .withIndex("by_client", (q) => q.eq("clientUserId", userId))
      .order("desc")
      .collect();
  },
});

export const myCoachSessions = query({
  handler: async (ctx) => {
    const userId = await getUser(ctx);
    if (!userId) return [];
    return ctx.db
      .query("coachSessions")
      .withIndex("by_coach_user", (q) => q.eq("coachUserId", userId))
      .order("desc")
      .collect();
  },
});

export const getSession = query({
  args: { id: v.string() },
  handler: async (ctx, { id }) => {
    const userId = await getUser(ctx);
    if (!userId) return null;
    const all = await ctx.db.query("coachSessions").collect();
    const s = all.find((x) => x.id === id);
    if (!s) return null;
    // Only client, coach, or admin
    if (s.clientUserId !== userId && s.coachUserId !== userId && userId !== ADMIN_USER_ID) {
      return null;
    }
    return s;
  },
});

// ─── Booking flow (stub payment) ────────────────────────────────────
export const bookSessionStub = mutation({
  args: {
    id: v.string(),
    coachId: v.string(),
    slotId: v.string(),
    clientName: v.string(),
    clientImage: v.optional(v.string()),
    clientGoals: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);

    const allCoaches = await ctx.db.query("coaches").collect();
    const coach = allCoaches.find((c) => c.id === args.coachId);
    if (!coach) throw new Error("Coach not found");
    if (coach.status !== "approved") throw new Error("Coach unavailable");
    if (coach.userId === userId) throw new Error("Cannot book yourself");

    const allSlots = await ctx.db.query("coachSlots").collect();
    const slot = allSlots.find((s) => s.id === args.slotId);
    if (!slot) throw new Error("Slot not found");
    if (slot.coachId !== args.coachId) throw new Error("Slot mismatch");
    if (slot.isBooked) throw new Error("Slot already booked");

    const price = coach.hourlyRateUsd * (coach.sessionDurationMin / 60);
    const fee = +(price * PLATFORM_FEE_PCT).toFixed(2);
    const payout = +(price - fee).toFixed(2);

    const sessionDocId = await ctx.db.insert("coachSessions", {
      id: args.id,
      coachId: coach.id,
      coachUserId: coach.userId,
      clientUserId: userId,
      clientName: args.clientName,
      clientImage: args.clientImage,
      slotId: slot.id,
      startsAt: slot.startsAt,
      endsAt: slot.endsAt,
      sessionDurationMin: coach.sessionDurationMin,
      pricePaidUsd: price,
      platformFeeUsd: fee,
      coachPayoutUsd: payout,
      status: "confirmed",        // stub: confirmed immediately
      paymentStatus: "stub_paid", // stub flag for dev/demo
      paymentId: `stub-${Date.now()}`,
      clientGoals: args.clientGoals,
      createdAt: new Date().toISOString(),
    });

    // Mark slot as booked
    await ctx.db.patch(slot._id, { isBooked: true, sessionId: args.id });

    return sessionDocId;
  },
});

// ─── State transitions ──────────────────────────────────────────────
export const setMeetingUrl = mutation({
  args: { id: v.string(), meetingUrl: v.string() },
  handler: async (ctx, { id, meetingUrl }) => {
    const userId = await requireUser(ctx);
    const all = await ctx.db.query("coachSessions").collect();
    const s = all.find((x) => x.id === id);
    if (!s) throw new Error("Session not found");
    if (s.coachUserId !== userId) throw new Error("Forbidden");
    await ctx.db.patch(s._id, { meetingUrl });
  },
});

export const markInProgress = mutation({
  args: { id: v.string() },
  handler: async (ctx, { id }) => {
    const userId = await requireUser(ctx);
    const all = await ctx.db.query("coachSessions").collect();
    const s = all.find((x) => x.id === id);
    if (!s) throw new Error("Session not found");
    if (s.coachUserId !== userId) throw new Error("Forbidden");
    await ctx.db.patch(s._id, { status: "in_progress" });
  },
});

export const completeSession = mutation({
  args: { id: v.string(), coachNotes: v.optional(v.string()) },
  handler: async (ctx, { id, coachNotes }) => {
    const userId = await requireUser(ctx);
    const all = await ctx.db.query("coachSessions").collect();
    const s = all.find((x) => x.id === id);
    if (!s) throw new Error("Session not found");
    if (s.coachUserId !== userId) throw new Error("Forbidden");

    await ctx.db.patch(s._id, {
      status: "completed",
      paymentStatus: "released",  // stub: release funds immediately
      coachNotes: coachNotes ?? s.coachNotes,
      completedAt: new Date().toISOString(),
    });

    // Update coach aggregate stats
    const coaches = await ctx.db.query("coaches").collect();
    const coach = coaches.find((c) => c.id === s.coachId);
    if (coach) {
      await ctx.db.patch(coach._id, {
        totalSessions: (coach.totalSessions ?? 0) + 1,
        totalEarningsUsd: +((coach.totalEarningsUsd ?? 0) + s.coachPayoutUsd).toFixed(2),
      });
    }
  },
});

export const cancelSession = mutation({
  args: { id: v.string(), reason: v.optional(v.string()) },
  handler: async (ctx, { id }) => {
    const userId = await requireUser(ctx);
    const all = await ctx.db.query("coachSessions").collect();
    const s = all.find((x) => x.id === id);
    if (!s) throw new Error("Session not found");
    if (s.clientUserId !== userId && s.coachUserId !== userId && userId !== ADMIN_USER_ID) {
      throw new Error("Forbidden");
    }
    if (s.status === "completed") throw new Error("Cannot cancel a completed session");

    // Free up the slot
    const slots = await ctx.db.query("coachSlots").collect();
    const slot = slots.find((sl) => sl.id === s.slotId);
    if (slot) await ctx.db.patch(slot._id, { isBooked: false, sessionId: undefined });

    await ctx.db.patch(s._id, {
      status: "cancelled",
      paymentStatus: "refunded",  // stub: instant refund
      cancelledAt: new Date().toISOString(),
      cancelledBy: userId,
    });
  },
});

// ─── Admin ──────────────────────────────────────────────────────────
export const adminListAll = query({
  handler: async (ctx) => {
    const userId = await getUser(ctx);
    if (!userId || userId !== ADMIN_USER_ID) return [];
    return ctx.db.query("coachSessions").order("desc").collect();
  },
});

export const adminForceStatus = mutation({
  args: { id: v.string(), status: sessionStatus },
  handler: async (ctx, { id, status }) => {
    const userId = await requireUser(ctx);
    if (userId !== ADMIN_USER_ID) throw new Error("Forbidden");
    const all = await ctx.db.query("coachSessions").collect();
    const s = all.find((x) => x.id === id);
    if (!s) return;
    await ctx.db.patch(s._id, { status });
  },
});
