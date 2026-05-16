import { QueryCtx, MutationCtx } from "./_generated/server";

type AuthCtx = {
  auth: {
    getUserIdentity: () => Promise<{ subject: string } | null>;
  };
};

/** For queries — returns null instead of throwing so the UI degrades gracefully on sign-out. */
export async function getUser(ctx: AuthCtx): Promise<string | null> {
  const identity = await ctx.auth.getUserIdentity();
  return identity?.subject ?? null;
}

/** For mutations — throws if not authenticated. */
export async function requireUser(ctx: AuthCtx): Promise<string> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Unauthenticated");
  return identity.subject;
}

/**
 * Returns the effective subscription plan id for a user — the value the UI actually
 * shows them, accounting for admin elevation and any plan persisted from a paid
 * checkout flow. Use from any mutation that enforces tier limits so server-side
 * enforcement matches what the UI promises. Mirrors the rule in
 * `subscriptions.ts:getUserSubscription` — keep them in sync.
 */
export async function getEffectivePlanId(
  ctx: QueryCtx | MutationCtx,
  userId: string,
): Promise<string> {
  // Admin elevation — admin account always counts as elite for limit checks.
  const adminId = process.env.ADMIN_USER_ID;
  if (adminId && userId === adminId) return "elite";

  const sub = await ctx.db
    .query("userSubscriptions")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .first();
  // Only an actively-paying status grants the paid plan's limits. Past-due, unpaid,
  // canceled, etc. fall back to free so a lapsed subscriber can't keep posting.
  const grantsPaidPlan = sub?.status === "active" || sub?.status === "trialing";
  return grantsPaidPlan ? sub.planId : "free";
}
