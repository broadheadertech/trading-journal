import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireUser, getUser } from "./helpers";

// ─── File uploads (Convex storage) ──────────────────────────────────
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

const ADMIN_USER_ID = process.env.ADMIN_USER_ID;

async function requireAdmin(ctx: any) {
  const userId = await requireUser(ctx);
  if (!ADMIN_USER_ID || userId !== ADMIN_USER_ID) {
    throw new Error("Forbidden");
  }
  return userId;
}

// ─── Public catalog ─────────────────────────────────────────────────
export const listPublished = query({
  handler: async (ctx) => {
    return ctx.db
      .query("courses")
      .withIndex("by_published", (q) => q.eq("isPublished", true))
      .order("desc")
      .collect();
  },
});

export const listAll = query({
  handler: async (ctx) => {
    return ctx.db.query("courses").order("desc").collect();
  },
});

export const getBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, { slug }) => {
    return ctx.db
      .query("courses")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .first();
  },
});

export const getById = query({
  args: { id: v.string() },
  handler: async (ctx, { id }) => {
    const all = await ctx.db.query("courses").collect();
    return all.find((c) => c.id === id) ?? null;
  },
});

export const getStructure = query({
  args: { courseId: v.string() },
  handler: async (ctx, { courseId }) => {
    const modules = await ctx.db
      .query("courseModules")
      .withIndex("by_course", (q) => q.eq("courseId", courseId))
      .collect();
    const lessons = await ctx.db
      .query("courseLessons")
      .withIndex("by_course", (q) => q.eq("courseId", courseId))
      .collect();
    return {
      modules: modules.sort((a, b) => a.order - b.order),
      lessons: lessons.sort((a, b) => a.order - b.order),
    };
  },
});

// ─── Purchase status ────────────────────────────────────────────────
export const myPurchases = query({
  handler: async (ctx) => {
    const userId = await getUser(ctx);
    if (!userId) return [];
    return ctx.db
      .query("coursePurchases")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
  },
});

export const hasPurchased = query({
  args: { courseId: v.string() },
  handler: async (ctx, { courseId }) => {
    const userId = await getUser(ctx);
    if (!userId) return false;
    const found = await ctx.db
      .query("coursePurchases")
      .withIndex("by_user_course", (q) =>
        q.eq("userId", userId).eq("courseId", courseId)
      )
      .first();
    return !!found;
  },
});

// ─── Lesson progress ────────────────────────────────────────────────
export const myProgressForCourse = query({
  args: { courseId: v.string() },
  handler: async (ctx, { courseId }) => {
    const userId = await getUser(ctx);
    if (!userId) return [];
    return ctx.db
      .query("lessonProgress")
      .withIndex("by_user_course", (q) =>
        q.eq("userId", userId).eq("courseId", courseId)
      )
      .collect();
  },
});

export const markLessonComplete = mutation({
  args: { lessonId: v.string(), courseId: v.string() },
  handler: async (ctx, { lessonId, courseId }) => {
    const userId = await requireUser(ctx);
    // Avoid duplicates
    const existing = await ctx.db
      .query("lessonProgress")
      .withIndex("by_user_lesson", (q) =>
        q.eq("userId", userId).eq("lessonId", lessonId)
      )
      .first();
    if (existing) return existing._id;
    return ctx.db.insert("lessonProgress", {
      userId,
      lessonId,
      courseId,
      completedAt: new Date().toISOString(),
    });
  },
});

export const unmarkLessonComplete = mutation({
  args: { lessonId: v.string() },
  handler: async (ctx, { lessonId }) => {
    const userId = await requireUser(ctx);
    const existing = await ctx.db
      .query("lessonProgress")
      .withIndex("by_user_lesson", (q) =>
        q.eq("userId", userId).eq("lessonId", lessonId)
      )
      .first();
    if (existing) await ctx.db.delete(existing._id);
  },
});

// ─── Webhook hook: record a purchase ────────────────────────────────
export const recordPurchase = mutation({
  args: {
    userId: v.string(),
    courseId: v.string(),
    paymentProvider: v.union(v.literal("stripe"), v.literal("paymongo")),
    paymentId: v.string(),
    amount: v.number(),
    currency: v.string(),
  },
  handler: async (ctx, args) => {
    // Idempotency: skip if we've already recorded this paymentId
    const existing = await ctx.db
      .query("coursePurchases")
      .withIndex("by_payment_id", (q) => q.eq("paymentId", args.paymentId))
      .first();
    if (existing) return existing._id;
    return ctx.db.insert("coursePurchases", {
      ...args,
      purchasedAt: new Date().toISOString(),
    });
  },
});

// ─── Admin: course CRUD ─────────────────────────────────────────────
export const createCourse = mutation({
  args: {
    id: v.string(),
    slug: v.string(),
    title: v.string(),
    description: v.string(),
    coverImage: v.optional(v.string()),
    gallery: v.optional(v.array(v.string())),
    priceUsd: v.number(),
    pricePhp: v.number(),
    externalUrl: v.optional(v.string()),
    isPublished: v.boolean(),
  },
  handler: async (ctx, args) => {
    const adminId = await requireAdmin(ctx);
    const now = new Date().toISOString();
    return ctx.db.insert("courses", {
      ...args,
      createdBy: adminId,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updateCourse = mutation({
  args: {
    id: v.string(),
    title: v.optional(v.string()),
    slug: v.optional(v.string()),
    description: v.optional(v.string()),
    coverImage: v.optional(v.string()),
    gallery: v.optional(v.array(v.string())),
    priceUsd: v.optional(v.number()),
    pricePhp: v.optional(v.number()),
    externalUrl: v.optional(v.string()),
    isPublished: v.optional(v.boolean()),
  },
  handler: async (ctx, { id, ...patch }) => {
    await requireAdmin(ctx);
    const all = await ctx.db.query("courses").collect();
    const doc = all.find((c) => c.id === id);
    if (!doc) throw new Error("Course not found");
    const cleaned: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(patch)) if (v !== undefined) cleaned[k] = v;
    cleaned.updatedAt = new Date().toISOString();
    await ctx.db.patch(doc._id, cleaned);
  },
});

export const deleteCourse = mutation({
  args: { id: v.string() },
  handler: async (ctx, { id }) => {
    await requireAdmin(ctx);
    const all = await ctx.db.query("courses").collect();
    const doc = all.find((c) => c.id === id);
    if (!doc) return;
    // Cascade: modules + lessons
    const modules = await ctx.db
      .query("courseModules")
      .withIndex("by_course", (q) => q.eq("courseId", id))
      .collect();
    for (const m of modules) await ctx.db.delete(m._id);
    const lessons = await ctx.db
      .query("courseLessons")
      .withIndex("by_course", (q) => q.eq("courseId", id))
      .collect();
    for (const l of lessons) await ctx.db.delete(l._id);
    await ctx.db.delete(doc._id);
  },
});

// ─── Admin: module CRUD ─────────────────────────────────────────────
export const createModule = mutation({
  args: {
    id: v.string(),
    courseId: v.string(),
    title: v.string(),
    order: v.number(),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    return ctx.db.insert("courseModules", {
      ...args,
      createdAt: new Date().toISOString(),
    });
  },
});

export const updateModule = mutation({
  args: { id: v.string(), title: v.optional(v.string()), order: v.optional(v.number()) },
  handler: async (ctx, { id, ...patch }) => {
    await requireAdmin(ctx);
    const all = await ctx.db.query("courseModules").collect();
    const doc = all.find((m) => m.id === id);
    if (!doc) return;
    const cleaned: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(patch)) if (v !== undefined) cleaned[k] = v;
    await ctx.db.patch(doc._id, cleaned);
  },
});

export const deleteModule = mutation({
  args: { id: v.string() },
  handler: async (ctx, { id }) => {
    await requireAdmin(ctx);
    const all = await ctx.db.query("courseModules").collect();
    const doc = all.find((m) => m.id === id);
    if (!doc) return;
    const lessons = await ctx.db
      .query("courseLessons")
      .withIndex("by_module", (q) => q.eq("moduleId", id))
      .collect();
    for (const l of lessons) await ctx.db.delete(l._id);
    await ctx.db.delete(doc._id);
  },
});

// ─── Admin: lesson CRUD ─────────────────────────────────────────────
export const createLesson = mutation({
  args: {
    id: v.string(),
    moduleId: v.string(),
    courseId: v.string(),
    title: v.string(),
    order: v.number(),
    contentType: v.union(v.literal("text"), v.literal("video"), v.literal("link")),
    body: v.string(),
    videoUrl: v.optional(v.string()),
    externalUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    return ctx.db.insert("courseLessons", {
      ...args,
      createdAt: new Date().toISOString(),
    });
  },
});

export const updateLesson = mutation({
  args: {
    id: v.string(),
    title: v.optional(v.string()),
    order: v.optional(v.number()),
    contentType: v.optional(v.union(v.literal("text"), v.literal("video"), v.literal("link"))),
    body: v.optional(v.string()),
    videoUrl: v.optional(v.string()),
    externalUrl: v.optional(v.string()),
  },
  handler: async (ctx, { id, ...patch }) => {
    await requireAdmin(ctx);
    const all = await ctx.db.query("courseLessons").collect();
    const doc = all.find((l) => l.id === id);
    if (!doc) return;
    const cleaned: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(patch)) if (v !== undefined) cleaned[k] = v;
    await ctx.db.patch(doc._id, cleaned);
  },
});

export const deleteLesson = mutation({
  args: { id: v.string() },
  handler: async (ctx, { id }) => {
    await requireAdmin(ctx);
    const all = await ctx.db.query("courseLessons").collect();
    const doc = all.find((l) => l.id === id);
    if (doc) await ctx.db.delete(doc._id);
  },
});
