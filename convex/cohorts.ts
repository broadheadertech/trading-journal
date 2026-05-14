import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireUser, getUser } from "./helpers";

const ADMIN_USER_ID = process.env.ADMIN_USER_ID;

function newId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

// ─── Public catalog ─────────────────────────────────────────────────
// Lists all active cohorts. Members can browse and join from this view.
export const listOpen = query({
  handler: async (ctx) => {
    return ctx.db
      .query("cohorts")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect();
  },
});

export const getById = query({
  args: { id: v.string() },
  handler: async (ctx, { id }) => {
    return ctx.db
      .query("cohorts")
      .filter((q) => q.eq(q.field("id"), id))
      .first();
  },
});

// ─── Member-side ────────────────────────────────────────────────────
// All cohorts the current user is actively subscribed to.
export const myCohorts = query({
  handler: async (ctx) => {
    const userId = await getUser(ctx);
    if (!userId) return [];
    const memberships = await ctx.db
      .query("cohortMembers")
      .withIndex("by_user_status", (q) => q.eq("userId", userId).eq("status", "active"))
      .collect();
    const out: Array<{
      membership: typeof memberships[number];
      cohort: any;
    }> = [];
    for (const m of memberships) {
      const cohort = await ctx.db
        .query("cohorts")
        .filter((q) => q.eq(q.field("id"), m.cohortId))
        .first();
      if (cohort) out.push({ membership: m, cohort });
    }
    return out;
  },
});

// Check whether the current user has an active membership in a specific cohort
export const myMembership = query({
  args: { cohortId: v.string() },
  handler: async (ctx, { cohortId }) => {
    const userId = await getUser(ctx);
    if (!userId) return null;
    return ctx.db
      .query("cohortMembers")
      .withIndex("by_cohort_status", (q) => q.eq("cohortId", cohortId).eq("status", "active"))
      .filter((q) => q.eq(q.field("userId"), userId))
      .first();
  },
});

// Join a cohort. NOTE: Stripe wiring is a follow-up — for now we simulate
// "subscribed" so the cohort feature is testable end-to-end in BETA.
export const join = mutation({
  args: {
    cohortId: v.string(),
    userName: v.string(),
    userImage: v.optional(v.string()),
  },
  handler: async (ctx, { cohortId, userName, userImage }) => {
    const userId = await requireUser(ctx);

    const cohort = await ctx.db
      .query("cohorts")
      .filter((q) => q.eq(q.field("id"), cohortId))
      .first();
    if (!cohort) throw new Error("Cohort not found");
    if (!cohort.isActive) throw new Error("Cohort is not accepting new members");

    // Block double-joining
    const existing = await ctx.db
      .query("cohortMembers")
      .withIndex("by_cohort_status", (q) => q.eq("cohortId", cohortId).eq("status", "active"))
      .filter((q) => q.eq(q.field("userId"), userId))
      .first();
    if (existing) throw new Error("You're already a member of this cohort");

    // Capacity check
    if (cohort.memberCount >= cohort.capacity) {
      throw new Error("Cohort is full");
    }

    const now = new Date().toISOString();
    const periodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    await ctx.db.insert("cohortMembers", {
      id: newId(),
      cohortId,
      userId,
      userName,
      userImage,
      status: "active",
      joinedAt: now,
      currentPeriodEnd: periodEnd,
    });

    // Denorm count
    await ctx.db.patch(cohort._id, {
      memberCount: cohort.memberCount + 1,
      updatedAt: now,
    });
  },
});

// Cancel membership. Status flips to "cancelled" so access stays until period end.
export const leave = mutation({
  args: { cohortId: v.string() },
  handler: async (ctx, { cohortId }) => {
    const userId = await requireUser(ctx);
    const membership = await ctx.db
      .query("cohortMembers")
      .withIndex("by_cohort_status", (q) => q.eq("cohortId", cohortId).eq("status", "active"))
      .filter((q) => q.eq(q.field("userId"), userId))
      .first();
    if (!membership) throw new Error("Not a member of this cohort");

    const now = new Date().toISOString();
    await ctx.db.patch(membership._id, { status: "cancelled", cancelledAt: now });

    const cohort = await ctx.db
      .query("cohorts")
      .filter((q) => q.eq(q.field("id"), cohortId))
      .first();
    if (cohort) {
      await ctx.db.patch(cohort._id, {
        memberCount: Math.max(0, cohort.memberCount - 1),
        updatedAt: now,
      });
    }
  },
});

// ─── Coach-side ─────────────────────────────────────────────────────
// Coaches create/manage their own cohorts. Only the coach owner can edit.
export const myCohortsAsCoach = query({
  handler: async (ctx) => {
    const userId = await getUser(ctx);
    if (!userId) return [];
    const coach = await ctx.db
      .query("coaches")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    if (!coach) return [];
    return ctx.db
      .query("cohorts")
      .withIndex("by_coach", (q) => q.eq("coachId", coach.id))
      .collect();
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    description: v.string(),
    schedule: v.string(),
    nextSessionAt: v.optional(v.string()),
    capacity: v.number(),
    monthlyPriceUsd: v.number(),
    tags: v.array(v.string()),
    coverImage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);
    const coach = await ctx.db
      .query("coaches")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    if (!coach) throw new Error("You must have an approved coach profile to host a cohort");
    if (coach.status !== "approved") throw new Error("Your coach profile must be approved first");

    if (args.capacity < 1 || args.capacity > 500) throw new Error("Capacity must be 1–500");
    if (args.monthlyPriceUsd < 0 || args.monthlyPriceUsd > 10000) {
      throw new Error("Monthly price must be 0–10000");
    }

    const now = new Date().toISOString();
    return ctx.db.insert("cohorts", {
      id: newId(),
      coachId: coach.id,
      coachUserId: userId,
      coachName: coach.displayName,
      coachPhotoUrl: coach.photoUrl,
      name: args.name,
      description: args.description,
      schedule: args.schedule,
      nextSessionAt: args.nextSessionAt,
      capacity: args.capacity,
      monthlyPriceUsd: args.monthlyPriceUsd,
      isActive: true,
      memberCount: 0,
      coverImage: args.coverImage,
      tags: args.tags,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const update = mutation({
  args: {
    cohortId: v.string(),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    schedule: v.optional(v.string()),
    nextSessionAt: v.optional(v.string()),
    capacity: v.optional(v.number()),
    monthlyPriceUsd: v.optional(v.number()),
    tags: v.optional(v.array(v.string())),
    coverImage: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, { cohortId, ...patch }) => {
    const userId = await requireUser(ctx);
    const cohort = await ctx.db
      .query("cohorts")
      .filter((q) => q.eq(q.field("id"), cohortId))
      .first();
    if (!cohort) throw new Error("Cohort not found");
    const isOwner = cohort.coachUserId === userId;
    const isAdmin = ADMIN_USER_ID && userId === ADMIN_USER_ID;
    if (!isOwner && !isAdmin) throw new Error("Forbidden");

    if (patch.capacity !== undefined && patch.capacity < cohort.memberCount) {
      throw new Error(`Cannot set capacity below current member count (${cohort.memberCount})`);
    }

    const updates: Record<string, unknown> = { updatedAt: new Date().toISOString() };
    for (const [k, v] of Object.entries(patch)) {
      if (v !== undefined) updates[k] = v;
    }
    await ctx.db.patch(cohort._id, updates);
  },
});

// Members of a specific cohort (visible to coach/admin only)
export const listMembers = query({
  args: { cohortId: v.string() },
  handler: async (ctx, { cohortId }) => {
    const userId = await getUser(ctx);
    if (!userId) return [];
    const cohort = await ctx.db
      .query("cohorts")
      .filter((q) => q.eq(q.field("id"), cohortId))
      .first();
    if (!cohort) return [];
    const isOwner = cohort.coachUserId === userId;
    const isAdmin = ADMIN_USER_ID && userId === ADMIN_USER_ID;
    if (!isOwner && !isAdmin) return [];
    return ctx.db
      .query("cohortMembers")
      .withIndex("by_cohort", (q) => q.eq("cohortId", cohortId))
      .collect();
  },
});
