import { query } from "./_generated/server";
import { v } from "convex/values";

type AuthCtx = {
  auth: { getUserIdentity: () => Promise<{ subject: string } | null> };
};

async function requireAdmin(ctx: AuthCtx): Promise<string> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Unauthenticated");
  const adminId = process.env.ADMIN_USER_ID;
  if (!adminId || identity.subject !== adminId) throw new Error("Forbidden");
  return identity.subject;
}

export const getRecentEvents = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit }) => {
    await requireAdmin(ctx);
    return ctx.db
      .query("adminEvents")
      .withIndex("by_timestamp")
      .order("desc")
      .take(limit ?? 20);
  },
});
