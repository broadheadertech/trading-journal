import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireUser, getUser } from "./helpers";

const ADMIN_USER_ID = process.env.ADMIN_USER_ID;

async function requireAdmin(ctx: any) {
  const userId = await requireUser(ctx);
  if (!ADMIN_USER_ID || userId !== ADMIN_USER_ID) throw new Error("Forbidden");
  return userId;
}

const eventMode = v.union(v.literal("online"), v.literal("in_person"), v.literal("hybrid"));

// ─── Storage ────────────────────────────────────────────────────────
export const generateUploadUrl = mutation({
  handler: async (ctx) => {
    await requireAdmin(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

export const getStorageUrl = query({
  args: { storageId: v.string() },
  handler: async (ctx, { storageId }) => {
    return await ctx.storage.getUrl(storageId as any);
  },
});

// ─── Public catalog ─────────────────────────────────────────────────
export const listPublished = query({
  handler: async (ctx) => {
    return ctx.db
      .query("events")
      .withIndex("by_published", (q) => q.eq("isPublished", true))
      .order("desc")
      .collect();
  },
});

export const listAll = query({
  handler: async (ctx) => {
    return ctx.db.query("events").order("desc").collect();
  },
});

export const getById = query({
  args: { id: v.string() },
  handler: async (ctx, { id }) => {
    const all = await ctx.db.query("events").collect();
    return all.find((e) => e.id === id) ?? null;
  },
});

// ─── Registration / status ──────────────────────────────────────────
export const myRegistrations = query({
  handler: async (ctx) => {
    const userId = await getUser(ctx);
    if (!userId) return [];
    return ctx.db
      .query("eventRegistrations")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
  },
});

export const isRegistered = query({
  args: { eventId: v.string() },
  handler: async (ctx, { eventId }) => {
    const userId = await getUser(ctx);
    if (!userId) return false;
    const found = await ctx.db
      .query("eventRegistrations")
      .withIndex("by_user_event", (q) => q.eq("userId", userId).eq("eventId", eventId))
      .first();
    return !!found;
  },
});

// Free registration (when priceUsd === 0 && pricePhp === 0)
export const registerFree = mutation({
  args: { eventId: v.string() },
  handler: async (ctx, { eventId }) => {
    const userId = await requireUser(ctx);
    const all = await ctx.db.query("events").collect();
    const ev = all.find((e) => e.id === eventId);
    if (!ev) throw new Error("Event not found");
    if (ev.priceUsd > 0 || ev.pricePhp > 0) throw new Error("Event requires payment");

    const existing = await ctx.db
      .query("eventRegistrations")
      .withIndex("by_user_event", (q) => q.eq("userId", userId).eq("eventId", eventId))
      .first();
    if (existing) return existing._id;

    return ctx.db.insert("eventRegistrations", {
      userId,
      eventId,
      status: "registered",
      registeredAt: new Date().toISOString(),
    });
  },
});

export const recordPaidRegistration = mutation({
  args: {
    userId: v.string(),
    eventId: v.string(),
    paymentProvider: v.union(v.literal("stripe"), v.literal("paymongo")),
    paymentId: v.string(),
    amount: v.number(),
    currency: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("eventRegistrations")
      .withIndex("by_payment_id", (q) => q.eq("paymentId", args.paymentId))
      .first();
    if (existing) return existing._id;
    return ctx.db.insert("eventRegistrations", {
      ...args,
      status: "paid",
      registeredAt: new Date().toISOString(),
    });
  },
});

// ─── Admin CRUD ─────────────────────────────────────────────────────
export const createEvent = mutation({
  args: {
    id: v.string(),
    slug: v.string(),
    title: v.string(),
    description: v.string(),
    coverImage: v.optional(v.string()),
    gallery: v.optional(v.array(v.string())),
    mode: eventMode,
    startsAt: v.string(),
    endsAt: v.string(),
    timezone: v.optional(v.string()),
    meetingUrl: v.optional(v.string()),
    platform: v.optional(v.string()),
    venueName: v.optional(v.string()),
    address: v.optional(v.string()),
    city: v.optional(v.string()),
    country: v.optional(v.string()),
    mapUrl: v.optional(v.string()),
    capacity: v.optional(v.number()),
    priceUsd: v.number(),
    pricePhp: v.number(),
    isPublished: v.boolean(),
  },
  handler: async (ctx, args) => {
    const adminId = await requireAdmin(ctx);
    const now = new Date().toISOString();
    return ctx.db.insert("events", {
      ...args,
      createdBy: adminId,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updateEvent = mutation({
  args: {
    id: v.string(),
    slug: v.optional(v.string()),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    coverImage: v.optional(v.string()),
    gallery: v.optional(v.array(v.string())),
    mode: v.optional(eventMode),
    startsAt: v.optional(v.string()),
    endsAt: v.optional(v.string()),
    timezone: v.optional(v.string()),
    meetingUrl: v.optional(v.string()),
    platform: v.optional(v.string()),
    venueName: v.optional(v.string()),
    address: v.optional(v.string()),
    city: v.optional(v.string()),
    country: v.optional(v.string()),
    mapUrl: v.optional(v.string()),
    capacity: v.optional(v.number()),
    priceUsd: v.optional(v.number()),
    pricePhp: v.optional(v.number()),
    isPublished: v.optional(v.boolean()),
  },
  handler: async (ctx, { id, ...patch }) => {
    await requireAdmin(ctx);
    const all = await ctx.db.query("events").collect();
    const doc = all.find((e) => e.id === id);
    if (!doc) throw new Error("Event not found");
    const cleaned: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(patch)) if (v !== undefined) cleaned[k] = v;
    cleaned.updatedAt = new Date().toISOString();
    await ctx.db.patch(doc._id, cleaned);
  },
});

export const deleteEvent = mutation({
  args: { id: v.string() },
  handler: async (ctx, { id }) => {
    await requireAdmin(ctx);
    const all = await ctx.db.query("events").collect();
    const doc = all.find((e) => e.id === id);
    if (!doc) return;
    await ctx.db.delete(doc._id);
  },
});
