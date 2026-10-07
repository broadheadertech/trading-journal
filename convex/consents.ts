import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireUser } from "./helpers";

const ADMIN_USER_ID = process.env.ADMIN_USER_ID;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function requireAdmin(ctx: any): Promise<string> {
  const userId = await requireUser(ctx);
  if (!ADMIN_USER_ID || userId !== ADMIN_USER_ID) throw new Error("Forbidden");
  return userId;
}

const flow = v.union(v.literal("stripe"), v.literal("paymongo"), v.literal("qr"));

/** Log a user's acceptance of the Subscription Agreement before they subscribe. */
export const recordConsent = mutation({
  args: {
    flow,
    planId: v.optional(v.string()),
    interval: v.optional(v.union(v.literal("month"), v.literal("year"))),
    agreementVersion: v.string(),
    userName: v.optional(v.string()),
    userEmail: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);
    await ctx.db.insert("subscriptionConsents", {
      userId,
      userName: args.userName,
      userEmail: args.userEmail,
      flow: args.flow,
      planId: args.planId,
      interval: args.interval,
      agreementVersion: args.agreementVersion,
      agreedAt: new Date().toISOString(),
    });
  },
});

/** Admin: full consent log, newest first. */
export const listConsents = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const rows = await ctx.db.query("subscriptionConsents").collect();
    return rows.sort((a, b) => b.agreedAt.localeCompare(a.agreedAt));
  },
});
