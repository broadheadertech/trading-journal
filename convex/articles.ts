import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireUser, getUser } from "./helpers";

const ADMIN_USER_ID = process.env.ADMIN_USER_ID;

async function requireAdmin(ctx: any) {
  const userId = await requireUser(ctx);
  if (!ADMIN_USER_ID || userId !== ADMIN_USER_ID) throw new Error("Forbidden");
  return userId;
}

const accessTier  = v.union(v.literal("public"), v.literal("subscribers"), v.literal("paid"));
const articleStat = v.union(v.literal("draft"), v.literal("in_review"), v.literal("published"), v.literal("archived"));

// ─── Storage ────────────────────────────────────────────────────────
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

// ─── Public reads ───────────────────────────────────────────────────
export const listPublished = query({
  args: { category: v.optional(v.string()), tag: v.optional(v.string()), limit: v.optional(v.number()) },
  handler: async (ctx, { category, tag, limit }) => {
    let docs = await ctx.db
      .query("articles")
      .withIndex("by_status", (q) => q.eq("status", "published"))
      .collect();
    if (category && category !== "all") docs = docs.filter(d => d.category === category);
    if (tag) docs = docs.filter(d => d.tags.includes(tag));
    docs.sort((a, b) => (b.publishedAt ?? b.createdAt).localeCompare(a.publishedAt ?? a.createdAt));
    return limit ? docs.slice(0, limit) : docs;
  },
});

export const getBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, { slug }) => {
    return ctx.db
      .query("articles")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .first();
  },
});

export const getById = query({
  args: { id: v.string() },
  handler: async (ctx, { id }) => {
    const all = await ctx.db.query("articles").collect();
    return all.find(a => a.id === id) ?? null;
  },
});

// ─── Tags ───────────────────────────────────────────────────────────
export const listTags = query({
  handler: async (ctx) => {
    const tags = await ctx.db.query("articleTags").collect();
    return tags.sort((a, b) => b.count - a.count);
  },
});

// ─── Admin / Author CRUD ────────────────────────────────────────────
export const adminListAll = query({
  args: { status: v.optional(articleStat) },
  handler: async (ctx, { status }) => {
    const userId = await getUser(ctx);
    if (!userId || userId !== ADMIN_USER_ID) return [];
    let docs;
    if (status) {
      docs = await ctx.db
        .query("articles")
        .withIndex("by_status", (q) => q.eq("status", status))
        .collect();
    } else {
      docs = await ctx.db.query("articles").collect();
    }
    return docs.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  },
});

export const createArticle = mutation({
  args: {
    id: v.string(),
    slug: v.string(),
    title: v.string(),
    excerpt: v.string(),
    body: v.string(),
    coverImage: v.optional(v.string()),
    tags: v.array(v.string()),
    category: v.string(),
    authorName: v.string(),
    authorImage: v.optional(v.string()),
    accessTier: accessTier,
    status: articleStat,
  },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);
    const now = new Date().toISOString();
    await refreshTags(ctx, [], args.tags);
    return ctx.db.insert("articles", {
      ...args,
      authorUserId: userId,
      publishedAt: args.status === "published" ? now : undefined,
      viewCount: 0,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updateArticle = mutation({
  args: {
    id: v.string(),
    title: v.optional(v.string()),
    slug: v.optional(v.string()),
    excerpt: v.optional(v.string()),
    body: v.optional(v.string()),
    coverImage: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    category: v.optional(v.string()),
    accessTier: v.optional(accessTier),
    status: v.optional(articleStat),
    reviewNotes: v.optional(v.string()),
  },
  handler: async (ctx, { id, ...patch }) => {
    const userId = await requireUser(ctx);
    const all = await ctx.db.query("articles").collect();
    const doc = all.find(a => a.id === id);
    if (!doc) throw new Error("Article not found");
    const isAdmin = ADMIN_USER_ID && userId === ADMIN_USER_ID;
    if (doc.authorUserId !== userId && !isAdmin) throw new Error("Forbidden");

    if (patch.tags) await refreshTags(ctx, doc.tags, patch.tags);

    const cleaned: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(patch)) if (v !== undefined) cleaned[k] = v;
    cleaned.updatedAt = new Date().toISOString();
    if (patch.status === "published" && !doc.publishedAt) {
      cleaned.publishedAt = new Date().toISOString();
    }
    await ctx.db.patch(doc._id, cleaned);
  },
});

export const deleteArticle = mutation({
  args: { id: v.string() },
  handler: async (ctx, { id }) => {
    const userId = await requireUser(ctx);
    const all = await ctx.db.query("articles").collect();
    const doc = all.find(a => a.id === id);
    if (!doc) return;
    const isAdmin = ADMIN_USER_ID && userId === ADMIN_USER_ID;
    if (doc.authorUserId !== userId && !isAdmin) throw new Error("Forbidden");
    await refreshTags(ctx, doc.tags, []);
    await ctx.db.delete(doc._id);
  },
});

// ─── Editorial workflow ─────────────────────────────────────────────
export const submitForReview = mutation({
  args: { id: v.string() },
  handler: async (ctx, { id }) => {
    const userId = await requireUser(ctx);
    const all = await ctx.db.query("articles").collect();
    const doc = all.find(a => a.id === id);
    if (!doc) return;
    if (doc.authorUserId !== userId) throw new Error("Forbidden");
    await ctx.db.patch(doc._id, { status: "in_review", updatedAt: new Date().toISOString() });
  },
});

export const approveAndPublish = mutation({
  args: { id: v.string(), notes: v.optional(v.string()) },
  handler: async (ctx, { id, notes }) => {
    const userId = await requireAdmin(ctx);
    const all = await ctx.db.query("articles").collect();
    const doc = all.find(a => a.id === id);
    if (!doc) return;
    const now = new Date().toISOString();
    await ctx.db.patch(doc._id, {
      status: "published",
      reviewerUserId: userId,
      reviewNotes: notes,
      publishedAt: doc.publishedAt ?? now,
      updatedAt: now,
    });
  },
});

export const rejectArticle = mutation({
  args: { id: v.string(), notes: v.string() },
  handler: async (ctx, { id, notes }) => {
    const userId = await requireAdmin(ctx);
    const all = await ctx.db.query("articles").collect();
    const doc = all.find(a => a.id === id);
    if (!doc) return;
    await ctx.db.patch(doc._id, {
      status: "draft",
      reviewerUserId: userId,
      reviewNotes: notes,
      updatedAt: new Date().toISOString(),
    });
  },
});

// ─── View tracking + analytics ──────────────────────────────────────
export const recordView = mutation({
  args: { articleId: v.string() },
  handler: async (ctx, { articleId }) => {
    const userId = await getUser(ctx);
    await ctx.db.insert("articleViews", {
      articleId,
      userId: userId ?? undefined,
      viewedAt: new Date().toISOString(),
    });
    const all = await ctx.db.query("articles").collect();
    const doc = all.find(a => a.id === articleId);
    if (doc) await ctx.db.patch(doc._id, { viewCount: doc.viewCount + 1 });
  },
});

export const adminAnalytics = query({
  handler: async (ctx) => {
    const userId = await getUser(ctx);
    if (!userId || userId !== ADMIN_USER_ID) return null;
    const articles = await ctx.db.query("articles").collect();
    const views = await ctx.db.query("articleViews").collect();
    const subs = await ctx.db.query("newsletterSubscribers").collect();
    const published = articles.filter(a => a.status === "published");
    const totalViews = views.length;
    const top = [...published]
      .sort((a, b) => b.viewCount - a.viewCount)
      .slice(0, 5)
      .map(a => ({ id: a.id, title: a.title, viewCount: a.viewCount, publishedAt: a.publishedAt ?? a.createdAt }));
    return {
      totalArticles: articles.length,
      published: published.length,
      drafts: articles.filter(a => a.status === "draft").length,
      inReview: articles.filter(a => a.status === "in_review").length,
      totalViews,
      uniqueReaders: new Set(views.map(v => v.userId).filter(Boolean)).size,
      newsletterTotal: subs.length,
      newsletterConfirmed: subs.filter(s => s.status === "confirmed").length,
      top,
    };
  },
});

// ─── Internal helpers ───────────────────────────────────────────────
async function refreshTags(ctx: any, oldTags: string[], newTags: string[]) {
  const removed = oldTags.filter(t => !newTags.includes(t));
  const added = newTags.filter(t => !oldTags.includes(t));
  for (const name of added) {
    const existing = await ctx.db
      .query("articleTags")
      .withIndex("by_name", (q: any) => q.eq("name", name.toLowerCase()))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, { count: existing.count + 1 });
    } else {
      await ctx.db.insert("articleTags", { name: name.toLowerCase(), label: name, count: 1 });
    }
  }
  for (const name of removed) {
    const existing = await ctx.db
      .query("articleTags")
      .withIndex("by_name", (q: any) => q.eq("name", name.toLowerCase()))
      .first();
    if (existing) {
      const newCount = existing.count - 1;
      if (newCount <= 0) await ctx.db.delete(existing._id);
      else await ctx.db.patch(existing._id, { count: newCount });
    }
  }
}
