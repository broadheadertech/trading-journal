import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireUser, getUser } from "./helpers";

const ADMIN_USER_ID = process.env.ADMIN_USER_ID;

async function requireAdmin(ctx: any) {
  const userId = await requireUser(ctx);
  if (!ADMIN_USER_ID || userId !== ADMIN_USER_ID) throw new Error("Forbidden");
  return userId;
}

// ─── Storage (shared with sessions/messages) ────────────────────────
export const generateUploadUrl = mutation({
  handler: async (ctx) => {
    await requireUser(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

export const getStorageUrl = query({
  args: { storageId: v.string() },
  handler: async (ctx, { storageId }) => {
    return await ctx.storage.getUrl(storageId as any);
  },
});

// ─── Application config ─────────────────────────────────────────────
const APPLICATIONS_OPEN_KEY = "coach_applications_open";

export const getApplicationsOpen = query({
  handler: async (ctx) => {
    const setting = await ctx.db
      .query("adminSettings")
      .withIndex("by_key", (q) => q.eq("key", APPLICATIONS_OPEN_KEY))
      .first();
    // Default: open if no setting exists
    if (!setting) return true;
    return setting.value === "true";
  },
});

export const setApplicationsOpen = mutation({
  args: { open: v.boolean() },
  handler: async (ctx, { open }) => {
    const userId = await requireAdmin(ctx);
    const now = new Date().toISOString();
    const existing = await ctx.db
      .query("adminSettings")
      .withIndex("by_key", (q) => q.eq("key", APPLICATIONS_OPEN_KEY))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, { value: String(open), updatedAt: now, updatedBy: userId });
    } else {
      await ctx.db.insert("adminSettings", {
        key: APPLICATIONS_OPEN_KEY,
        value: String(open),
        updatedAt: now,
        updatedBy: userId,
      });
    }
  },
});

// ─── Public catalog ─────────────────────────────────────────────────
export const listApproved = query({
  handler: async (ctx) => {
    return ctx.db
      .query("coaches")
      .withIndex("by_status", (q) => q.eq("status", "approved"))
      .collect();
  },
});

export const listAll = query({
  handler: async (ctx) => {
    return ctx.db.query("coaches").order("desc").collect();
  },
});

export const listPending = query({
  handler: async (ctx) => {
    await requireAdmin(ctx);
    return ctx.db
      .query("coaches")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .collect();
  },
});

export const getById = query({
  args: { id: v.string() },
  handler: async (ctx, { id }) => {
    const all = await ctx.db.query("coaches").collect();
    return all.find((c) => c.id === id) ?? null;
  },
});

export const getMyCoachProfile = query({
  handler: async (ctx) => {
    const userId = await getUser(ctx);
    if (!userId) return null;
    return ctx.db
      .query("coaches")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
  },
});

// ─── Apply to become a coach ────────────────────────────────────────
export const applyToCoach = mutation({
  args: {
    id: v.string(),
    slug: v.string(),
    displayName: v.string(),
    headline: v.string(),
    bio: v.string(),
    photoUrl: v.optional(v.string()),
    specialties: v.array(v.string()),
    languages: v.optional(v.array(v.string())),
    timezone: v.string(),
    hourlyRateUsd: v.number(),
    sessionDurationMin: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);

    // Check applications are open
    const setting = await ctx.db
      .query("adminSettings")
      .withIndex("by_key", (q) => q.eq("key", APPLICATIONS_OPEN_KEY))
      .first();
    const open = !setting || setting.value === "true";
    if (!open) throw new Error("Coach applications are currently closed");

    // One profile per user
    const existing = await ctx.db
      .query("coaches")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    if (existing) throw new Error("You already have a coach profile");

    const now = new Date().toISOString();
    return ctx.db.insert("coaches", {
      ...args,
      userId,
      status: "pending",
      avgRating: 0,
      reviewCount: 0,
      totalSessions: 0,
      totalEarningsUsd: 0,
      createdAt: now,
      updatedAt: now,
    });
  },
});

// ─── Coach updates own profile ──────────────────────────────────────
export const updateMyProfile = mutation({
  args: {
    headline: v.optional(v.string()),
    bio: v.optional(v.string()),
    photoUrl: v.optional(v.string()),
    specialties: v.optional(v.array(v.string())),
    languages: v.optional(v.array(v.string())),
    timezone: v.optional(v.string()),
    hourlyRateUsd: v.optional(v.number()),
    sessionDurationMin: v.optional(v.number()),
  },
  handler: async (ctx, patch) => {
    const userId = await requireUser(ctx);
    const profile = await ctx.db
      .query("coaches")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    if (!profile) throw new Error("No coach profile");

    const cleaned: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(patch)) if (v !== undefined) cleaned[k] = v;
    cleaned.updatedAt = new Date().toISOString();
    await ctx.db.patch(profile._id, cleaned);
  },
});

// ─── Admin moderation ───────────────────────────────────────────────
export const approveCoach = mutation({
  args: { id: v.string() },
  handler: async (ctx, { id }) => {
    await requireAdmin(ctx);
    const all = await ctx.db.query("coaches").collect();
    const doc = all.find((c) => c.id === id);
    if (!doc) return;
    await ctx.db.patch(doc._id, { status: "approved", updatedAt: new Date().toISOString() });
  },
});

export const rejectCoach = mutation({
  args: { id: v.string() },
  handler: async (ctx, { id }) => {
    await requireAdmin(ctx);
    const all = await ctx.db.query("coaches").collect();
    const doc = all.find((c) => c.id === id);
    if (!doc) return;
    await ctx.db.patch(doc._id, { status: "rejected", updatedAt: new Date().toISOString() });
  },
});

export const suspendCoach = mutation({
  args: { id: v.string() },
  handler: async (ctx, { id }) => {
    await requireAdmin(ctx);
    const all = await ctx.db.query("coaches").collect();
    const doc = all.find((c) => c.id === id);
    if (!doc) return;
    await ctx.db.patch(doc._id, { status: "suspended", updatedAt: new Date().toISOString() });
  },
});

// ─── Slots / availability ───────────────────────────────────────────
export const listSlotsForCoach = query({
  args: { coachId: v.string(), onlyUnbooked: v.optional(v.boolean()) },
  handler: async (ctx, { coachId, onlyUnbooked }) => {
    let slots;
    if (onlyUnbooked) {
      slots = await ctx.db
        .query("coachSlots")
        .withIndex("by_coach_unbooked", (q) => q.eq("coachId", coachId).eq("isBooked", false))
        .collect();
    } else {
      slots = await ctx.db
        .query("coachSlots")
        .withIndex("by_coach", (q) => q.eq("coachId", coachId))
        .collect();
    }
    // Filter out past slots for the user-facing view
    const now = Date.now();
    return slots
      .filter((s) => new Date(s.startsAt).getTime() > now)
      .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  },
});

export const createSlot = mutation({
  args: {
    id: v.string(),
    startsAt: v.string(),
    endsAt: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);
    const profile = await ctx.db
      .query("coaches")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    if (!profile) throw new Error("Not a coach");
    return ctx.db.insert("coachSlots", {
      id: args.id,
      coachId: profile.id,
      startsAt: args.startsAt,
      endsAt: args.endsAt,
      isBooked: false,
      createdAt: new Date().toISOString(),
    });
  },
});

export const deleteSlot = mutation({
  args: { id: v.string() },
  handler: async (ctx, { id }) => {
    const userId = await requireUser(ctx);
    const profile = await ctx.db
      .query("coaches")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    if (!profile) throw new Error("Not a coach");
    const all = await ctx.db.query("coachSlots").collect();
    const doc = all.find((s) => s.id === id && s.coachId === profile.id);
    if (!doc) return;
    if (doc.isBooked) throw new Error("Cannot delete a booked slot");
    await ctx.db.delete(doc._id);
  },
});
