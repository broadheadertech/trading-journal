import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireUser, getUser } from "./helpers";

const ADMIN_USER_ID = process.env.ADMIN_USER_ID;

function genToken() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export const subscribe = mutation({
  args: { email: v.string(), source: v.optional(v.string()) },
  handler: async (ctx, { email, source }) => {
    const e = email.trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) throw new Error("Invalid email");

    const userId = await getUser(ctx);
    const existing = await ctx.db
      .query("newsletterSubscribers")
      .withIndex("by_email", (q) => q.eq("email", e))
      .first();

    const now = new Date().toISOString();
    if (existing) {
      if (existing.status === "unsubscribed") {
        await ctx.db.patch(existing._id, {
          status: "confirmed",
          subscribedAt: now,
          unsubscribedAt: undefined,
        });
      }
      return existing._id;
    }
    return ctx.db.insert("newsletterSubscribers", {
      email: e,
      userId: userId ?? undefined,
      status: "confirmed",                  // skip double opt-in for v1; flip to "pending" + email confirm later
      confirmToken: genToken(),
      subscribedAt: now,
      source: source ?? "landing",
    });
  },
});

export const unsubscribe = mutation({
  args: { email: v.string() },
  handler: async (ctx, { email }) => {
    const e = email.trim().toLowerCase();
    const existing = await ctx.db
      .query("newsletterSubscribers")
      .withIndex("by_email", (q) => q.eq("email", e))
      .first();
    if (!existing) return;
    await ctx.db.patch(existing._id, {
      status: "unsubscribed",
      unsubscribedAt: new Date().toISOString(),
    });
  },
});

export const adminList = query({
  handler: async (ctx) => {
    const userId = await getUser(ctx);
    if (!userId || userId !== ADMIN_USER_ID) return [];
    const all = await ctx.db.query("newsletterSubscribers").collect();
    return all.sort((a, b) => b.subscribedAt.localeCompare(a.subscribedAt));
  },
});

export const adminRemove = mutation({
  args: { email: v.string() },
  handler: async (ctx, { email }) => {
    const userId = await requireUser(ctx);
    if (userId !== ADMIN_USER_ID) throw new Error("Forbidden");
    const e = email.trim().toLowerCase();
    const existing = await ctx.db
      .query("newsletterSubscribers")
      .withIndex("by_email", (q) => q.eq("email", e))
      .first();
    if (existing) await ctx.db.delete(existing._id);
  },
});
