import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

// ─── Queries ──────────────────────────────────────────────────────────

/** Get all workspaces the current user belongs to. */
export const getUserWorkspaces = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const userId = identity.subject;

    // Find all memberships
    const memberships = await ctx.db
      .query("workspaceMembers")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    // Fetch the workspace for each membership
    const workspaces = await Promise.all(
      memberships.map(async (m) => {
        const ws = await ctx.db
          .query("workspaces")
          .filter((q) => q.eq(q.field("id"), m.workspaceId))
          .first();
        return ws ? { ...ws, role: m.role } : null;
      })
    );

    return workspaces.filter(Boolean);
  },
});

/** Get a single workspace by id (with auth check). */
export const getWorkspace = query({
  args: { workspaceId: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const userId = identity.subject;

    // Check membership
    const member = await ctx.db
      .query("workspaceMembers")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId))
      .filter((q) => q.eq(q.field("userId"), userId))
      .first();
    if (!member) return null;

    const workspace = await ctx.db
      .query("workspaces")
      .filter((q) => q.eq(q.field("id"), args.workspaceId))
      .first();

    return workspace ? { ...workspace, role: member.role } : null;
  },
});

/** Get all members of a workspace. */
export const getMembers = query({
  args: { workspaceId: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const userId = identity.subject;

    // Auth check — must be a member
    const self = await ctx.db
      .query("workspaceMembers")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId))
      .filter((q) => q.eq(q.field("userId"), userId))
      .first();
    if (!self) return [];

    return ctx.db
      .query("workspaceMembers")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId))
      .collect();
  },
});

/** Get member trade data for team overview stats. */
export const getMemberStats = query({
  args: { workspaceId: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const userId = identity.subject;

    // Auth check
    const self = await ctx.db
      .query("workspaceMembers")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId))
      .filter((q) => q.eq(q.field("userId"), userId))
      .first();
    if (!self || (self.role !== "owner" && self.role !== "admin" && self.role !== "coach")) return [];

    const members = await ctx.db
      .query("workspaceMembers")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId))
      .collect();

    // Fetch each member's trades and compute stats
    const stats = await Promise.all(
      members.map(async (m) => {
        const trades = await ctx.db
          .query("trades")
          .withIndex("by_user", (q) => q.eq("userId", m.userId))
          .collect();

        const closedTrades = trades.filter((t) => !t.isOpen && t.actualPnL !== null);
        const totalPnL = closedTrades.reduce((sum, t) => sum + (t.actualPnL ?? 0), 0);
        const winCount = closedTrades.filter((t) => (t.actualPnL ?? 0) > 0).length;
        const winRate = closedTrades.length > 0 ? (winCount / closedTrades.length) * 100 : 0;

        // Rule compliance
        let totalRules = 0;
        let compliantRules = 0;
        for (const t of closedTrades) {
          if (t.ruleChecklist && t.ruleChecklist.length > 0) {
            for (const rc of t.ruleChecklist) {
              totalRules++;
              if (rc.compliance === "yes") compliantRules++;
              else if (rc.compliance === "partial") compliantRules += 0.5;
            }
          }
        }
        const compliance = totalRules > 0 ? (compliantRules / totalRules) * 100 : 100;

        return {
          userId: m.userId,
          displayName: m.displayName,
          role: m.role,
          totalTrades: closedTrades.length,
          totalPnL,
          winRate,
          compliance,
        };
      })
    );

    return stats;
  },
});

/** Get recent activity feed for a workspace. */
export const getActivityFeed = query({
  args: { workspaceId: v.string(), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const userId = identity.subject;

    const self = await ctx.db
      .query("workspaceMembers")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId))
      .filter((q) => q.eq(q.field("userId"), userId))
      .first();
    if (!self) return [];

    const events = await ctx.db
      .query("workspaceActivityFeed")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId))
      .order("desc")
      .take(args.limit ?? 20);

    return events;
  },
});

// ─── Mutations ────────────────────────────────────────────────────────

/** Create a new workspace. */
export const createWorkspace = mutation({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const userId = identity.subject;

    const id = `ws-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const now = new Date().toISOString();

    await ctx.db.insert("workspaces", {
      id,
      name: args.name,
      ownerId: userId,
      createdAt: now,
    });

    // Add owner as first member
    await ctx.db.insert("workspaceMembers", {
      workspaceId: id,
      userId,
      displayName: identity.name ?? identity.email ?? "Owner",
      email: identity.email ?? "",
      role: "owner",
      joinedAt: now,
    });

    // Activity
    await ctx.db.insert("workspaceActivityFeed", {
      workspaceId: id,
      userId,
      displayName: identity.name ?? identity.email ?? "Owner",
      type: "workspace.created",
      message: "workspace.created",
      timestamp: now,
    });

    return id;
  },
});

/** Invite a member to the workspace (by email placeholder — real invite flow TBD). */
export const addMember = mutation({
  args: {
    workspaceId: v.string(),
    userId: v.string(),
    displayName: v.string(),
    email: v.string(),
    role: v.union(v.literal("admin"), v.literal("coach"), v.literal("member")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const callerId = identity.subject;

    // Check caller is owner or admin
    const callerMember = await ctx.db
      .query("workspaceMembers")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId))
      .filter((q) => q.eq(q.field("userId"), callerId))
      .first();
    if (!callerMember || (callerMember.role !== "owner" && callerMember.role !== "admin")) {
      throw new Error("Only owners and admins can add members");
    }

    // Check not already a member
    const existing = await ctx.db
      .query("workspaceMembers")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId))
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .first();
    if (existing) throw new Error("User is already a member");

    const now = new Date().toISOString();
    await ctx.db.insert("workspaceMembers", {
      workspaceId: args.workspaceId,
      userId: args.userId,
      displayName: args.displayName,
      email: args.email,
      role: args.role,
      joinedAt: now,
    });

    await ctx.db.insert("workspaceActivityFeed", {
      workspaceId: args.workspaceId,
      userId: args.userId,
      displayName: args.displayName,
      type: "member.joined",
      message: `${args.displayName} joined as ${args.role}`,
      timestamp: now,
    });
  },
});

// ─── Cohort Queries & Mutations ──────────────────────────────────────

/** Get all cohorts for a workspace. */
export const getCohorts = query({
  args: { workspaceId: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const userId = identity.subject;

    const self = await ctx.db
      .query("workspaceMembers")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId))
      .filter((q) => q.eq(q.field("userId"), userId))
      .first();
    if (!self) return [];

    return ctx.db
      .query("workspaceCohorts")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId))
      .collect();
  },
});

/** Create a new cohort. */
export const createCohort = mutation({
  args: { workspaceId: v.string(), name: v.string(), code: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const callerId = identity.subject;

    const callerMember = await ctx.db
      .query("workspaceMembers")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId))
      .filter((q) => q.eq(q.field("userId"), callerId))
      .first();
    if (!callerMember || (callerMember.role !== "owner" && callerMember.role !== "admin" && callerMember.role !== "coach")) {
      throw new Error("Insufficient permissions");
    }

    const id = `cohort-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const now = new Date().toISOString();

    await ctx.db.insert("workspaceCohorts", {
      workspaceId: args.workspaceId,
      id,
      name: args.name,
      code: args.code,
      memberUserIds: [],
      createdAt: now,
    });

    await ctx.db.insert("workspaceActivityFeed", {
      workspaceId: args.workspaceId,
      userId: callerId,
      displayName: callerMember.displayName,
      type: "cohort.created",
      message: `created cohort "${args.name}"`,
      timestamp: now,
    });

    return id;
  },
});

/** Add a member to a cohort. */
export const addCohortMember = mutation({
  args: { workspaceId: v.string(), cohortId: v.string(), userId: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const cohort = await ctx.db
      .query("workspaceCohorts")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId))
      .filter((q) => q.eq(q.field("id"), args.cohortId))
      .first();
    if (!cohort) throw new Error("Cohort not found");

    if (cohort.memberUserIds.includes(args.userId)) return;

    await ctx.db.patch(cohort._id, {
      memberUserIds: [...cohort.memberUserIds, args.userId],
    });
  },
});

/** Remove a member from a cohort. */
export const removeCohortMember = mutation({
  args: { workspaceId: v.string(), cohortId: v.string(), userId: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const cohort = await ctx.db
      .query("workspaceCohorts")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId))
      .filter((q) => q.eq(q.field("id"), args.cohortId))
      .first();
    if (!cohort) throw new Error("Cohort not found");

    await ctx.db.patch(cohort._id, {
      memberUserIds: cohort.memberUserIds.filter((id) => id !== args.userId),
    });
  },
});

/** Delete a cohort. */
export const deleteCohort = mutation({
  args: { workspaceId: v.string(), cohortId: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const cohort = await ctx.db
      .query("workspaceCohorts")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId))
      .filter((q) => q.eq(q.field("id"), args.cohortId))
      .first();
    if (!cohort) return;

    await ctx.db.delete(cohort._id);
  },
});

// ─── Messages (Coach Desk) ──────────────────────────────────────────

/** Get messages between two users in a workspace. */
export const getMessages = query({
  args: { workspaceId: v.string(), otherUserId: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const userId = identity.subject;

    const allMessages = await ctx.db
      .query("workspaceMessages")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId))
      .collect();

    // Filter to messages between these two users
    return allMessages
      .filter(
        (m) =>
          (m.fromUserId === userId && m.toUserId === args.otherUserId) ||
          (m.fromUserId === args.otherUserId && m.toUserId === userId)
      )
      .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  },
});

/** Send a message. */
export const sendMessage = mutation({
  args: {
    workspaceId: v.string(),
    toUserId: v.string(),
    message: v.string(),
    visibility: v.union(v.literal("private"), v.literal("shared")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const userId = identity.subject;
    const now = new Date().toISOString();

    await ctx.db.insert("workspaceMessages", {
      workspaceId: args.workspaceId,
      fromUserId: userId,
      toUserId: args.toUserId,
      message: args.message,
      visibility: args.visibility,
      timestamp: now,
    });
  },
});

// ─── Member Mutations ───────────────────────────────────────────────

/** Remove a member from the workspace. */
export const removeMember = mutation({
  args: { workspaceId: v.string(), userId: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const callerId = identity.subject;

    const callerMember = await ctx.db
      .query("workspaceMembers")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId))
      .filter((q) => q.eq(q.field("userId"), callerId))
      .first();
    if (!callerMember || (callerMember.role !== "owner" && callerMember.role !== "admin")) {
      throw new Error("Only owners and admins can remove members");
    }

    const member = await ctx.db
      .query("workspaceMembers")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId))
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .first();
    if (!member) return;
    if (member.role === "owner") throw new Error("Cannot remove the workspace owner");

    await ctx.db.delete(member._id);
  },
});
