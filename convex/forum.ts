import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireUser, getUser } from "./helpers";

const ADMIN_USER_ID = process.env.ADMIN_USER_ID;

async function requireAdmin(ctx: any) {
  const userId = await requireUser(ctx);
  if (!ADMIN_USER_ID || userId !== ADMIN_USER_ID) throw new Error("Forbidden");
  return userId;
}

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

// ─── Seed default categories ────────────────────────────────────────
const DEFAULT_CATEGORIES = [
  { slug: "general",       name: "General",       description: "Open discussion about anything trading-related.", color: "#6366f1" },
  { slug: "trade-reviews", name: "Trade Reviews", description: "Share trades and get feedback from the community.", color: "#10b981" },
  { slug: "psychology",    name: "Psychology",    description: "Mindset, discipline, and emotional management.",    color: "#a855f7" },
  { slug: "strategy",      name: "Strategy",      description: "Setups, playbooks, and market structure.",          color: "#f59e0b" },
  { slug: "qa",            name: "Q&A",           description: "Ask questions, get answers.",                       color: "#06b6d4" },
  { slug: "announcements", name: "Announcements", description: "Platform updates and news.",                        color: "#ef4444" },
];

export const seedDefaultCategories = mutation({
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const existing = await ctx.db.query("forumCategories").collect();
    const existingSlugs = new Set(existing.map((c) => c.slug));
    let inserted = 0;
    for (let i = 0; i < DEFAULT_CATEGORIES.length; i++) {
      const c = DEFAULT_CATEGORIES[i];
      if (existingSlugs.has(c.slug)) continue;
      await ctx.db.insert("forumCategories", {
        id: `cat-${c.slug}`,
        ...c,
        order: existing.length + i,
        createdAt: new Date().toISOString(),
      });
      inserted++;
    }
    return { inserted };
  },
});

// ─── Categories ─────────────────────────────────────────────────────
export const listCategories = query({
  handler: async (ctx) => {
    const all = await ctx.db.query("forumCategories").collect();
    return all.sort((a, b) => a.order - b.order);
  },
});

export const createCategory = mutation({
  args: {
    id: v.string(),
    slug: v.string(),
    name: v.string(),
    description: v.string(),
    color: v.optional(v.string()),
    order: v.number(),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    return ctx.db.insert("forumCategories", { ...args, createdAt: new Date().toISOString() });
  },
});

export const updateCategory = mutation({
  args: {
    id: v.string(),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    color: v.optional(v.string()),
    order: v.optional(v.number()),
  },
  handler: async (ctx, { id, ...patch }) => {
    await requireAdmin(ctx);
    const all = await ctx.db.query("forumCategories").collect();
    const doc = all.find((c) => c.id === id);
    if (!doc) return;
    const cleaned: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(patch)) if (v !== undefined) cleaned[k] = v;
    await ctx.db.patch(doc._id, cleaned);
  },
});

export const deleteCategory = mutation({
  args: { id: v.string() },
  handler: async (ctx, { id }) => {
    await requireAdmin(ctx);
    const all = await ctx.db.query("forumCategories").collect();
    const doc = all.find((c) => c.id === id);
    if (doc) await ctx.db.delete(doc._id);
  },
});

// ─── Posts ──────────────────────────────────────────────────────────
export const listPosts = query({
  args: {
    categoryId: v.optional(v.string()),
    sort: v.union(v.literal("hot"), v.literal("new"), v.literal("top")),
  },
  handler: async (ctx, { categoryId, sort }) => {
    let posts;
    if (categoryId) {
      posts = await ctx.db
        .query("forumPosts")
        .withIndex("by_category", (q) => q.eq("categoryId", categoryId))
        .collect();
    } else {
      posts = await ctx.db.query("forumPosts").collect();
    }

    // Pinned always first
    const pinned = posts.filter((p) => p.isPinned);
    const rest = posts.filter((p) => !p.isPinned);

    if (sort === "new") {
      rest.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    } else if (sort === "top") {
      rest.sort((a, b) => b.score - a.score);
    } else {
      // hot = score / age in hours^1.5
      const now = Date.now();
      const hot = (p: any) => {
        const ageHours = Math.max(1, (now - new Date(p.createdAt).getTime()) / 3_600_000);
        return p.score / Math.pow(ageHours, 1.5);
      };
      rest.sort((a, b) => hot(b) - hot(a));
    }

    return [...pinned, ...rest];
  },
});

export const getPost = query({
  args: { id: v.string() },
  handler: async (ctx, { id }) => {
    const all = await ctx.db.query("forumPosts").collect();
    return all.find((p) => p.id === id) ?? null;
  },
});

export const createPost = mutation({
  args: {
    id: v.string(),
    categoryId: v.string(),
    title: v.string(),
    body: v.string(),
    images: v.optional(v.array(v.string())),
    authorName: v.string(),
    authorImage: v.optional(v.string()),
    authorTier: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);
    const now = new Date().toISOString();
    return ctx.db.insert("forumPosts", {
      id: args.id,
      categoryId: args.categoryId,
      authorId: userId,
      authorName: args.authorName,
      authorImage: args.authorImage,
      authorTier: args.authorTier,
      title: args.title,
      body: args.body,
      images: args.images,
      isPinned: false,
      isLocked: false,
      upvotes: 0,
      downvotes: 0,
      score: 0,
      commentCount: 0,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updatePost = mutation({
  args: {
    id: v.string(),
    title: v.optional(v.string()),
    body: v.optional(v.string()),
    images: v.optional(v.array(v.string())),
  },
  handler: async (ctx, { id, ...patch }) => {
    const userId = await requireUser(ctx);
    const all = await ctx.db.query("forumPosts").collect();
    const doc = all.find((p) => p.id === id);
    if (!doc) throw new Error("Post not found");
    const isAdmin = ADMIN_USER_ID && userId === ADMIN_USER_ID;
    if (doc.authorId !== userId && !isAdmin) throw new Error("Forbidden");
    const cleaned: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(patch)) if (v !== undefined) cleaned[k] = v;
    cleaned.updatedAt = new Date().toISOString();
    await ctx.db.patch(doc._id, cleaned);
  },
});

export const deletePost = mutation({
  args: { id: v.string() },
  handler: async (ctx, { id }) => {
    const userId = await requireUser(ctx);
    const all = await ctx.db.query("forumPosts").collect();
    const doc = all.find((p) => p.id === id);
    if (!doc) return;
    const isAdmin = ADMIN_USER_ID && userId === ADMIN_USER_ID;
    if (doc.authorId !== userId && !isAdmin) throw new Error("Forbidden");

    // Cascade comments + votes
    const comments = await ctx.db
      .query("forumComments")
      .withIndex("by_post", (q) => q.eq("postId", id))
      .collect();
    for (const c of comments) await ctx.db.delete(c._id);

    const votes = await ctx.db
      .query("forumVotes")
      .withIndex("by_target", (q) => q.eq("targetType", "post").eq("targetId", id))
      .collect();
    for (const v of votes) await ctx.db.delete(v._id);

    await ctx.db.delete(doc._id);
  },
});

export const togglePin = mutation({
  args: { id: v.string() },
  handler: async (ctx, { id }) => {
    await requireAdmin(ctx);
    const all = await ctx.db.query("forumPosts").collect();
    const doc = all.find((p) => p.id === id);
    if (!doc) return;
    await ctx.db.patch(doc._id, { isPinned: !doc.isPinned });
  },
});

export const toggleLock = mutation({
  args: { id: v.string() },
  handler: async (ctx, { id }) => {
    await requireAdmin(ctx);
    const all = await ctx.db.query("forumPosts").collect();
    const doc = all.find((p) => p.id === id);
    if (!doc) return;
    await ctx.db.patch(doc._id, { isLocked: !doc.isLocked });
  },
});

// ─── Comments ───────────────────────────────────────────────────────
export const listComments = query({
  args: { postId: v.string() },
  handler: async (ctx, { postId }) => {
    const all = await ctx.db
      .query("forumComments")
      .withIndex("by_post", (q) => q.eq("postId", postId))
      .collect();
    return all.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  },
});

export const createComment = mutation({
  args: {
    id: v.string(),
    postId: v.string(),
    parentCommentId: v.optional(v.string()),
    body: v.string(),
    authorName: v.string(),
    authorImage: v.optional(v.string()),
    authorTier: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);

    // Check post is not locked
    const posts = await ctx.db.query("forumPosts").collect();
    const post = posts.find((p) => p.id === args.postId);
    if (!post) throw new Error("Post not found");
    if (post.isLocked) throw new Error("Post is locked");

    const id = await ctx.db.insert("forumComments", {
      id: args.id,
      postId: args.postId,
      parentCommentId: args.parentCommentId,
      authorId: userId,
      authorName: args.authorName,
      authorImage: args.authorImage,
      authorTier: args.authorTier,
      body: args.body,
      upvotes: 0,
      downvotes: 0,
      score: 0,
      createdAt: new Date().toISOString(),
    });

    // Increment commentCount on the post
    await ctx.db.patch(post._id, { commentCount: post.commentCount + 1 });

    return id;
  },
});

export const deleteComment = mutation({
  args: { id: v.string() },
  handler: async (ctx, { id }) => {
    const userId = await requireUser(ctx);
    const all = await ctx.db.query("forumComments").collect();
    const doc = all.find((c) => c.id === id);
    if (!doc) return;
    const isAdmin = ADMIN_USER_ID && userId === ADMIN_USER_ID;
    if (doc.authorId !== userId && !isAdmin) throw new Error("Forbidden");

    // Decrement post comment count
    const posts = await ctx.db.query("forumPosts").collect();
    const post = posts.find((p) => p.id === doc.postId);
    if (post) await ctx.db.patch(post._id, { commentCount: Math.max(0, post.commentCount - 1) });

    // Delete votes for this comment
    const votes = await ctx.db
      .query("forumVotes")
      .withIndex("by_target", (q) => q.eq("targetType", "comment").eq("targetId", id))
      .collect();
    for (const v of votes) await ctx.db.delete(v._id);

    await ctx.db.delete(doc._id);
  },
});

// ─── Votes ──────────────────────────────────────────────────────────
export const myVotesForPosts = query({
  args: { postIds: v.array(v.string()) },
  handler: async (ctx, { postIds }) => {
    const userId = await getUser(ctx);
    if (!userId) return {};
    const result: Record<string, 1 | -1> = {};
    for (const pid of postIds) {
      const v = await ctx.db
        .query("forumVotes")
        .withIndex("by_user_target", (q) =>
          q.eq("userId", userId).eq("targetType", "post").eq("targetId", pid)
        )
        .first();
      if (v) result[pid] = v.value;
    }
    return result;
  },
});

export const myVotesForComments = query({
  args: { commentIds: v.array(v.string()) },
  handler: async (ctx, { commentIds }) => {
    const userId = await getUser(ctx);
    if (!userId) return {};
    const result: Record<string, 1 | -1> = {};
    for (const cid of commentIds) {
      const v = await ctx.db
        .query("forumVotes")
        .withIndex("by_user_target", (q) =>
          q.eq("userId", userId).eq("targetType", "comment").eq("targetId", cid)
        )
        .first();
      if (v) result[cid] = v.value;
    }
    return result;
  },
});

export const vote = mutation({
  args: {
    targetType: v.union(v.literal("post"), v.literal("comment")),
    targetId: v.string(),
    value: v.union(v.literal(1), v.literal(-1), v.literal(0)),
  },
  handler: async (ctx, { targetType, targetId, value }) => {
    const userId = await requireUser(ctx);

    const existing = await ctx.db
      .query("forumVotes")
      .withIndex("by_user_target", (q) =>
        q.eq("userId", userId).eq("targetType", targetType).eq("targetId", targetId)
      )
      .first();

    let upDelta = 0;
    let downDelta = 0;

    if (existing) {
      // Remove old vote effect
      if (existing.value === 1) upDelta -= 1;
      else downDelta -= 1;
      await ctx.db.delete(existing._id);
    }

    if (value !== 0) {
      // Apply new vote
      if (value === 1) upDelta += 1;
      else downDelta += 1;
      await ctx.db.insert("forumVotes", { userId, targetType, targetId, value });
    }

    // Update target counters
    if (targetType === "post") {
      const posts = await ctx.db.query("forumPosts").collect();
      const target = posts.find((p) => p.id === targetId);
      if (target) {
        const upvotes = target.upvotes + upDelta;
        const downvotes = target.downvotes + downDelta;
        await ctx.db.patch(target._id, { upvotes, downvotes, score: upvotes - downvotes });
      }
    } else {
      const comments = await ctx.db.query("forumComments").collect();
      const target = comments.find((c) => c.id === targetId);
      if (target) {
        const upvotes = target.upvotes + upDelta;
        const downvotes = target.downvotes + downDelta;
        await ctx.db.patch(target._id, { upvotes, downvotes, score: upvotes - downvotes });
      }
    }
  },
});
