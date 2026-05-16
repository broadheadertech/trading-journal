import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireUser, getUser } from "./helpers";

export const get = query({
  handler: async (ctx) => {
    const userId = await getUser(ctx);
    if (!userId) return null;
    return ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
  },
});

export const getBanStatus = query({
  handler: async (ctx) => {
    const userId = await getUser(ctx);
    if (!userId) return null;
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    if (!profile) return null;
    return {
      isBanned: profile.isBanned ?? false,
      bannedReason: profile.bannedReason ?? null,
    };
  },
});

export const setCapital = mutation({
  args: { amount: v.number() },
  handler: async (ctx, { amount }) => {
    const userId = await requireUser(ctx);
    const existing = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, { initialCapital: amount });
    } else {
      await ctx.db.insert("profiles", { userId, initialCapital: amount });
    }
  },
});

export const setDailyGoal = mutation({
  args: {
    dailyLossLimit: v.optional(v.number()),
    dailyProfitTarget: v.optional(v.number()),
    goalMode: v.optional(v.union(v.literal('daily'), v.literal('session'))),
  },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);
    const existing = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, args);
    } else {
      await ctx.db.insert("profiles", { userId, initialCapital: 0, ...args });
    }
  },
});

export const completeOnboarding = mutation({
  args: {
    initialCapital: v.number(),
    currency: v.string(),
    primaryMarket: v.string(),
  },
  handler: async (ctx, { initialCapital, currency, primaryMarket }) => {
    const userId = await requireUser(ctx);
    const existing = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, {
        initialCapital,
        currency,
        primaryMarket,
        onboardingComplete: true,
      });
    } else {
      await ctx.db.insert("profiles", {
        userId,
        initialCapital,
        currency,
        primaryMarket,
        onboardingComplete: true,
      });
    }
  },
});

// Story 9.1 — toggle text-only brain companion mode (FR43)
export const setTextOnlyBrain = mutation({
  args: { enabled: v.boolean() },
  handler: async (ctx, { enabled }) => {
    const userId = await requireUser(ctx);
    const existing = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, { textOnlyBrain: enabled });
    } else {
      await ctx.db.insert("profiles", { userId, initialCapital: 0, textOnlyBrain: enabled });
    }
  },
});

// Story 9.2 — toggle reduced motion mode (FR44)
export const setReducedMotion = mutation({
  args: { enabled: v.boolean() },
  handler: async (ctx, { enabled }) => {
    const userId = await requireUser(ctx);
    const existing = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, { reducedMotion: enabled });
    } else {
      await ctx.db.insert("profiles", { userId, initialCapital: 0, reducedMotion: enabled });
    }
  },
});

export const setCurrency = mutation({
  args: { currency: v.string() },
  handler: async (ctx, { currency }) => {
    const userId = await requireUser(ctx);
    const existing = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, { currency });
    } else {
      await ctx.db.insert("profiles", { userId, initialCapital: 0, currency });
    }
  },
});

// ─── Public profile (social-media surface) ──────────────────────────

// Slug validation — alphanumeric + underscore/dash, 3–24 chars. Mirrors what
// most platforms allow so users can reuse their existing handles.
const USERNAME_RE = /^[a-zA-Z0-9_-]{3,24}$/;

// Reserved slugs that can't be claimed as a custom username — they collide with
// app routes or could confuse users.
const RESERVED_USERNAMES = new Set([
  "admin", "api", "app", "auth", "blog", "brokers", "checkout", "contact",
  "demo", "events", "help", "login", "logout", "me", "new", "pricing",
  "privacy", "profile", "settings", "signin", "signup", "support", "team",
  "terms", "u", "user", "users",
]);

/**
 * Sync identity fields from Clerk (called on every authenticated app load).
 * Fills in Clerk username / display name / avatar on first run so the public
 * profile has something to show before the user opens the edit dialog.
 * Idempotent — only writes when the incoming values differ from what's stored.
 */
export const syncIdentityFromClerk = mutation({
  args: {
    clerkUsername: v.optional(v.string()),
    displayName: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);
    const existing = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    const patch: Record<string, string | undefined> = {};
    if (args.clerkUsername !== undefined && existing?.clerkUsername !== args.clerkUsername) {
      patch.clerkUsername = args.clerkUsername;
    }
    if (args.displayName !== undefined && existing?.displayName !== args.displayName) {
      patch.displayName = args.displayName;
    }
    if (args.avatarUrl !== undefined && existing?.avatarUrl !== args.avatarUrl) {
      patch.avatarUrl = args.avatarUrl;
    }

    if (existing) {
      if (Object.keys(patch).length > 0) await ctx.db.patch(existing._id, patch);
    } else {
      await ctx.db.insert("profiles", {
        userId,
        initialCapital: 0,
        ...patch,
      });
    }
  },
});

/**
 * Claim a custom username. Validates format, blocks reserved slugs, ensures
 * uniqueness via the `by_username` index.
 */
export const setUsername = mutation({
  args: { username: v.string() },
  handler: async (ctx, { username }) => {
    const userId = await requireUser(ctx);
    const trimmed = username.trim();

    if (!USERNAME_RE.test(trimmed)) {
      throw new Error("Username must be 3–24 characters: letters, numbers, _ or -.");
    }
    if (RESERVED_USERNAMES.has(trimmed.toLowerCase())) {
      throw new Error(`"${trimmed}" is reserved. Pick a different handle.`);
    }

    // Uniqueness — case-insensitive: a row with the same handle (other than ours) blocks the claim.
    const collision = await ctx.db
      .query("profiles")
      .withIndex("by_username", (q) => q.eq("username", trimmed))
      .first();
    if (collision && collision.userId !== userId) {
      throw new Error("That username is already taken.");
    }

    const existing = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, { username: trimmed });
    } else {
      await ctx.db.insert("profiles", { userId, initialCapital: 0, username: trimmed });
    }
  },
});

/** Edit the free-text bio shown on the public profile. */
export const setBio = mutation({
  args: { bio: v.string() },
  handler: async (ctx, { bio }) => {
    const userId = await requireUser(ctx);
    const trimmed = bio.slice(0, 280); // tweet-sized cap

    const existing = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, { bio: trimmed });
    } else {
      await ctx.db.insert("profiles", { userId, initialCapital: 0, bio: trimmed });
    }
  },
});

/**
 * Resolve a /u/<slug> URL to the underlying public profile.
 * Looks up custom username first, then Clerk username, then treats the slug
 * as a raw Clerk subject id as a last-resort fallback.
 * Returns only the safe-to-expose fields (no capital, no daily limits, etc.).
 */
export const getPublicBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, { slug }) => {
    const trimmed = slug.trim();
    if (!trimmed) return null;

    // 1. Custom username
    let profile = await ctx.db
      .query("profiles")
      .withIndex("by_username", (q) => q.eq("username", trimmed))
      .first();

    // 2. Fall back to Clerk username
    if (!profile) {
      profile = await ctx.db
        .query("profiles")
        .withIndex("by_clerk_username", (q) => q.eq("clerkUsername", trimmed))
        .first();
    }

    // 3. Last resort — raw userId in the URL
    if (!profile) {
      profile = await ctx.db
        .query("profiles")
        .withIndex("by_user", (q) => q.eq("userId", trimmed))
        .first();
    }

    if (!profile) return null;
    if (profile.isBanned) return null;

    return {
      userId: profile.userId,
      username: profile.username ?? null,
      clerkUsername: profile.clerkUsername ?? null,
      displayName: profile.displayName ?? null,
      avatarUrl: profile.avatarUrl ?? null,
      bio: profile.bio ?? null,
    };
  },
});
