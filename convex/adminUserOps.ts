import { mutation } from "./_generated/server";
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

async function getBrainState(ctx: any, userId: string) {
  return ctx.db
    .query("brainStates")
    .withIndex("by_user", (q: any) => q.eq("userId", userId))
    .first();
}

async function logAdminEvent(ctx: any, type: string, userId: string, adminId: string, meta: Record<string, unknown>) {
  await ctx.db.insert("adminEvents", {
    type,
    userId,
    metadata: JSON.stringify(meta),
    timestamp: new Date().toISOString(),
    adminId,
  });
}

/* Clears an active recovery lock on a user's brain state. Used when a user
 * was over-penalized by anti-gaming and support wants to unfreeze them.
 * No-op (but still audited) if the lock is already inactive. */
export const clearRecoveryLock = mutation({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    const adminId = await requireAdmin(ctx);
    const brain = await getBrainState(ctx, userId);
    if (!brain) throw new Error("Brain state not found");

    const wasActive = brain.recoveryLockUntil != null && brain.recoveryLockUntil > Date.now();
    await ctx.db.patch(brain._id, {
      recoveryLockUntil: null,
      updatedAt: Date.now(),
    });
    await logAdminEvent(ctx, "recovery_lock_cleared", userId, adminId, {
      wasActive,
      previousLockUntil: brain.recoveryLockUntil,
    });
  },
});

/* Pulls a user out of vacation mode. Used when a user accidentally enabled
 * vacation indefinitely or support needs to reactivate scoring. */
export const exitVacationMode = mutation({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    const adminId = await requireAdmin(ctx);
    const brain = await getBrainState(ctx, userId);
    if (!brain) throw new Error("Brain state not found");

    await ctx.db.patch(brain._id, {
      isVacationMode: false,
      vacationEnd: null,
      vacationStartedAt: null,
      updatedAt: Date.now(),
    });
    await logAdminEvent(ctx, "vacation_mode_exited", userId, adminId, {});
  },
});

/* Pins a coaching note onto a user's brainState. The user's Coaching tab reads
 * `latestCoachingMessage` so this surfaces directly in their UI as guidance from
 * the team. Note shape mirrors the existing brain subsystem template. */
const COACHING_CATEGORIES = ["support", "warning", "celebration", "instruction"] as const;

export const addCoachingNote = mutation({
  args: {
    userId: v.string(),
    message: v.string(),
    category: v.optional(v.union(
      v.literal("support"), v.literal("warning"), v.literal("celebration"), v.literal("instruction"),
    )),
    disclaimer: v.optional(v.string()),
  },
  handler: async (ctx, { userId, message, category, disclaimer }) => {
    const adminId = await requireAdmin(ctx);
    const brain = await getBrainState(ctx, userId);
    if (!brain) throw new Error("Brain state not found");

    const trimmed = message.trim();
    if (!trimmed) throw new Error("Message cannot be empty");
    if (trimmed.length > 500) throw new Error("Message too long (max 500 chars)");

    await ctx.db.patch(brain._id, {
      latestCoachingMessage: {
        message: trimmed,
        category: category ?? "support",
        disclaimer: disclaimer ?? "Note from the Atlas team.",
        timestamp: Date.now(),
      },
      updatedAt: Date.now(),
    });
    await logAdminEvent(ctx, "coaching_note_added", userId, adminId, {
      category: category ?? "support",
      preview: trimmed.slice(0, 80),
    });
  },
});

/* Soft brain reset — clears the operational valves (recovery lock, vacation,
 * regression buffer, evolution cooldown) without touching currentScore or stage
 * history. For users tangled in conflicting state machines from old migrations
 * or accidental flag combinations. */
export const softResetBrainState = mutation({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    const adminId = await requireAdmin(ctx);
    const brain = await getBrainState(ctx, userId);
    if (!brain) throw new Error("Brain state not found");

    await ctx.db.patch(brain._id, {
      recoveryLockUntil: null,
      isVacationMode: false,
      vacationEnd: null,
      vacationStartedAt: null,
      regressionBufferStart: null,
      hasRegressed: false,
      evolutionCooldownStart: null,
      updatedAt: Date.now(),
    });
    await logAdminEvent(ctx, "brain_state_soft_reset", userId, adminId, {
      preservedScore: brain.currentScore,
      preservedStage: brain.currentStage,
    });
  },
});
