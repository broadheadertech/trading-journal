import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// ─── Admin guard ─────────────────────────────────────────────────────
type AuthCtx = {
  auth: { getUserIdentity: () => Promise<{ subject: string } | null> };
};

async function requireAdmin(ctx: AuthCtx): Promise<string> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Unauthenticated");
  const adminId = process.env.ADMIN_USER_ID;
  if (!adminId || identity.subject !== adminId) {
    throw new Error("Forbidden");
  }
  return identity.subject;
}

// ─── Dashboard stats ─────────────────────────────────────────────────
export const getDashboardStats = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);

    const profiles = await ctx.db.query("profiles").collect();
    const trades = await ctx.db.query("trades").collect();

    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Count unique users who have traded
    const userIds = new Set(profiles.map((p) => p.userId));
    const tradeUserIds = new Set(trades.map((t) => t.userId));

    // New signups: profiles created today/this week/this month
    // (profiles don't have createdAt — use _creationTime)
    const newToday = profiles.filter(
      (p) => new Date(p._creationTime).toISOString().slice(0, 10) === todayStr
    ).length;
    const newThisWeek = profiles.filter(
      (p) => new Date(p._creationTime) >= weekAgo
    ).length;
    const newThisMonth = profiles.filter(
      (p) => new Date(p._creationTime) >= monthAgo
    ).length;

    // Active in last 7 days = users with a trade created in last 7 days
    const activeUserIds = new Set(
      trades
        .filter((t) => new Date(t.createdAt) >= weekAgo)
        .map((t) => t.userId)
    );

    return {
      totalUsers: userIds.size,
      newToday,
      newThisWeek,
      newThisMonth,
      activeUsers7d: activeUserIds.size,
      totalTrades: trades.length,
      totalTradeUsers: tradeUserIds.size,
    };
  },
});

// ─── Users list ──────────────────────────────────────────────────────
export const listUsers = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);

    const profiles = await ctx.db.query("profiles").collect();
    const trades = await ctx.db.query("trades").collect();

    // Group trades by user
    const tradesByUser = new Map<string, typeof trades>();
    for (const t of trades) {
      const arr = tradesByUser.get(t.userId) ?? [];
      arr.push(t);
      tradesByUser.set(t.userId, arr);
    }

    return profiles.map((p) => {
      const userTrades = tradesByUser.get(p.userId) ?? [];
      const lastTrade = userTrades.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )[0];

      return {
        userId: p.userId,
        initialCapital: p.initialCapital,
        currency: p.currency ?? "USD",
        tradeCount: userTrades.length,
        lastActive: lastTrade?.createdAt ?? null,
        signedUp: new Date(p._creationTime).toISOString(),
        isBanned: p.isBanned ?? false,
        bannedReason: p.bannedReason ?? null,
      };
    });
  },
});

// ─── User detail ─────────────────────────────────────────────────────
export const getUserDetail = query({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    await requireAdmin(ctx);

    const trades = await ctx.db
      .query("trades")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    const strategies = await ctx.db
      .query("strategies")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    const reflections = await ctx.db
      .query("dailyReflections")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    const closedTrades = trades.filter((t) => !t.isOpen && t.actualPnL != null);
    const totalPnL = closedTrades.reduce((s, t) => s + (t.actualPnL ?? 0), 0);
    const wins = closedTrades.filter((t) => (t.actualPnL ?? 0) > 0).length;
    const winRate = closedTrades.length > 0 ? (wins / closedTrades.length) * 100 : 0;

    return {
      userId,
      initialCapital: profile?.initialCapital ?? 0,
      currency: profile?.currency ?? "USD",
      tradeCount: trades.length,
      openTrades: trades.filter((t) => t.isOpen).length,
      closedTrades: closedTrades.length,
      totalPnL,
      winRate,
      strategyCount: strategies.length,
      reflectionCount: reflections.length,
      signedUp: profile ? new Date(profile._creationTime).toISOString() : null,
      isBanned: profile?.isBanned ?? false,
      bannedAt: profile?.bannedAt ?? null,
      bannedReason: profile?.bannedReason ?? null,
    };
  },
});

// ─── Settings CRUD ───────────────────────────────────────────────────
export const getSettings = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    return await ctx.db.query("adminSettings").collect();
  },
});

export const setSetting = mutation({
  args: { key: v.string(), value: v.string() },
  handler: async (ctx, { key, value }) => {
    const adminId = await requireAdmin(ctx);

    const existing = await ctx.db
      .query("adminSettings")
      .withIndex("by_key", (q) => q.eq("key", key))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        value,
        updatedAt: new Date().toISOString(),
        updatedBy: adminId,
      });
    } else {
      await ctx.db.insert("adminSettings", {
        key,
        value,
        updatedAt: new Date().toISOString(),
        updatedBy: adminId,
      });
    }
  },
});

// ─── Subscription plan CRUD ──────────────────────────────────────────
export const listPlans = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    return await ctx.db.query("subscriptionPlans").collect();
  },
});

export const upsertPlan = mutation({
  args: {
    _id: v.optional(v.id("subscriptionPlans")),
    planId: v.string(),
    name: v.string(),
    priceMonthly: v.number(),
    priceYearly: v.number(),
    stripePriceIdMonthly: v.optional(v.string()),
    stripePriceIdYearly: v.optional(v.string()),
    stripeProductId: v.optional(v.string()),
    features: v.array(v.string()),
    isActive: v.boolean(),
    sortOrder: v.number(),
    tagline: v.optional(v.string()),
    goal: v.optional(v.string()),
    isHighlighted: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const { _id, ...data } = args;
    if (_id) {
      await ctx.db.patch(_id, data);
    } else {
      await ctx.db.insert("subscriptionPlans", data);
    }
  },
});

// ─── User management actions (Phase 2) ──────────────────────────────

export const banUser = mutation({
  args: { userId: v.string(), reason: v.string() },
  handler: async (ctx, { userId, reason }) => {
    const adminId = await requireAdmin(ctx);
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    if (!profile) throw new Error("User not found");

    const now = new Date().toISOString();
    await ctx.db.patch(profile._id, {
      isBanned: true,
      bannedAt: now,
      bannedReason: reason,
    });
    await ctx.db.insert("adminEvents", {
      type: "user_banned",
      userId,
      metadata: JSON.stringify({ reason }),
      timestamp: now,
      adminId,
    });
  },
});

export const unbanUser = mutation({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    const adminId = await requireAdmin(ctx);
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    if (!profile) throw new Error("User not found");

    await ctx.db.patch(profile._id, {
      isBanned: false,
      bannedAt: undefined,
      bannedReason: undefined,
    });
    await ctx.db.insert("adminEvents", {
      type: "user_unbanned",
      userId,
      metadata: JSON.stringify({}),
      timestamp: new Date().toISOString(),
      adminId,
    });
  },
});

export const overridePlan = mutation({
  args: { userId: v.string(), planId: v.string() },
  handler: async (ctx, { userId, planId }) => {
    const adminId = await requireAdmin(ctx);

    const plans = await ctx.db.query("subscriptionPlans").collect();
    const plan = plans.find((p) => p.planId === planId);
    if (!plan && planId !== "free") throw new Error("Plan not found");

    const existing = await ctx.db
      .query("userSubscriptions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    const now = new Date().toISOString();
    if (existing) {
      await ctx.db.patch(existing._id, {
        planId,
        status: planId === "free" ? "free" : "active",
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("userSubscriptions", {
        userId,
        stripeCustomerId: "",
        planId,
        status: planId === "free" ? "free" : "active",
        createdAt: now,
        updatedAt: now,
      });
    }

    await ctx.db.insert("adminEvents", {
      type: "plan_override",
      userId,
      metadata: JSON.stringify({ planId, planName: plan?.name ?? "Free" }),
      timestamp: now,
      adminId,
    });
  },
});

export const resetUserData = mutation({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    const adminId = await requireAdmin(ctx);

    const tableNames = [
      "trades", "strategies", "checklists", "journalEntries",
      "monthlyGoals", "triggerEntries", "dailyReflections",
      "weeklyReviews", "ruleBreakLogs", "circuitBreakerEvents", "cooldowns",
    ] as const;

    let totalDeleted = 0;
    for (const table of tableNames) {
      const rows = await ctx.db
        .query(table)
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect();
      for (const row of rows) {
        await ctx.db.delete(row._id);
      }
      totalDeleted += rows.length;
    }

    await ctx.db.insert("adminEvents", {
      type: "data_reset",
      userId,
      metadata: JSON.stringify({ rowsDeleted: totalDeleted }),
      timestamp: new Date().toISOString(),
      adminId,
    });
  },
});

// ─── Per-user activity timeline ──────────────────────────────────────
//
// Aggregates events the user has produced across every persisted table into
// one chronological feed so super-admins can monitor a client's moves without
// adding any new write paths. Pull from existing rows, normalize them, merge
// by timestamp, slice.
//
// Each source table is capped at `perSourceLimit` (default 60) so the merge
// stays bounded — admins can page back with `before` (ISO timestamp).
type TimelineEvent = {
  id: string;
  type: string;
  timestamp: string; // ISO — unified for sort regardless of source field
  summary: string;
  meta?: Record<string, unknown>;
};

export const getUserActivityTimeline = query({
  args: {
    userId: v.string(),
    perSourceLimit: v.optional(v.number()),
    before: v.optional(v.string()), // ISO — return only events older than this
    types: v.optional(v.array(v.string())), // optional type filter
  },
  handler: async (ctx, { userId, perSourceLimit, before, types }) => {
    await requireAdmin(ctx);
    const cap = perSourceLimit ?? 60;
    const events: TimelineEvent[] = [];

    const byUser = <T extends string>(table: T) =>
      ctx.db.query(table as never).withIndex("by_user", (q: any) => q.eq("userId", userId));

    // Trades — emit one event per trade (the log) and a separate close event
    // when the trade has an exitDate, so the timeline reflects both moments.
    const trades = await byUser("trades").collect();
    for (const t of trades as any[]) {
      events.push({
        id: `trade-log-${t._id}`,
        type: "trade_logged",
        timestamp: t.createdAt,
        summary: `Logged ${t.direction ?? ""} ${t.coin} ${t.isOpen ? "(open)" : "trade"}`.replace(/\s+/g, " ").trim(),
        meta: {
          coin: t.coin,
          direction: t.direction ?? null,
          entryPrice: t.entryPrice,
          stopLoss: t.stopLoss,
          takeProfit: t.takeProfit ?? null,
          lotSize: t.lotSize ?? null,
          strategy: t.strategy,
          isOpen: t.isOpen,
          marketType: t.marketType ?? null,
          session: t.session ?? null,
        },
      });
      if (!t.isOpen && t.exitDate) {
        events.push({
          id: `trade-close-${t._id}`,
          type: "trade_closed",
          timestamp: t.exitDate,
          summary: `Closed ${t.coin} ${t.actualPnL != null ? (t.actualPnL >= 0 ? "+" : "") + "$" + t.actualPnL.toFixed(2) : ""}`.trim(),
          meta: {
            coin: t.coin,
            actualPnL: t.actualPnL,
            actualPnLPercent: t.actualPnLPercent,
            exitPrice: t.exitPrice,
            pipGain: t.pipGain ?? null,
            verdict: t.verdict,
            selfVerdict: t.selfVerdict,
          },
        });
      }
    }

    // Strategies / Playbook
    const strategies = await byUser("strategies").collect();
    for (const s of strategies as any[]) {
      events.push({
        id: `strategy-${s._id}`,
        type: "strategy_created",
        timestamp: s.createdAt,
        summary: `Created strategy "${s.name}"`,
        meta: { name: s.name, ruleCount: s.rules?.length ?? 0 },
      });
    }

    // Market-context checklists
    const checklists = await byUser("checklists").collect();
    for (const c of checklists as any[]) {
      events.push({
        id: `checklist-${c._id}`,
        type: "checklist_created",
        timestamp: c.createdAt,
        summary: `Pre-trade checklist — ${c.marketTrend} / ${c.riskLevel}`,
        meta: { marketTrend: c.marketTrend, riskLevel: c.riskLevel },
      });
    }

    // Psychology journal
    const journalEntries = await byUser("journalEntries").collect();
    for (const j of journalEntries as any[]) {
      events.push({
        id: `journal-${j._id}`,
        type: "journal_entry",
        timestamp: j.createdAt,
        summary: `Journal entry — ${j.emotion} (energy ${j.energyLevel})`,
        meta: { emotion: j.emotion, energy: j.energyLevel, lesson: j.lessonLearned },
      });
    }

    // Monthly goals
    const monthlyGoals = await byUser("monthlyGoals").collect();
    for (const g of monthlyGoals as any[]) {
      events.push({
        id: `goal-${g._id}`,
        type: "monthly_goal",
        timestamp: g.createdAt,
        summary: `Set monthly goal — ${g.month}`,
        meta: { month: g.month, pnlTarget: g.pnlTarget, winRateTarget: g.winRateTarget },
      });
    }

    // Trigger entries (emotional triggers)
    const triggerEntries = await byUser("triggerEntries").collect();
    for (const tg of triggerEntries as any[]) {
      events.push({
        id: `trigger-${tg._id}`,
        type: "trigger_entry",
        timestamp: tg.createdAt,
        summary: `Trigger — ${tg.source} (${tg.emotionalImpact}, ${tg.intensityBefore}→${tg.intensityAfter})`,
        meta: {
          source: tg.source,
          impact: tg.emotionalImpact,
          intensityBefore: tg.intensityBefore,
          intensityAfter: tg.intensityAfter,
          didTrade: tg.didTrade,
        },
      });
    }

    // Daily reflections
    const dailyReflections = await byUser("dailyReflections").collect();
    for (const r of dailyReflections as any[]) {
      events.push({
        id: `reflection-${r._id}`,
        type: "daily_reflection",
        timestamp: r.createdAt,
        summary: `Daily reflection — rating ${r.overallRating}/10 ${r.tradedMyPlan ? "(plan)" : "(off-plan)"}`,
        meta: { rating: r.overallRating, tradedMyPlan: r.tradedMyPlan, lesson: r.biggestLesson },
      });
    }

    // Weekly reviews
    const weeklyReviews = await byUser("weeklyReviews").collect();
    for (const w of weeklyReviews as any[]) {
      events.push({
        id: `review-${w._id}`,
        type: "weekly_review",
        timestamp: w.createdAt,
        summary: `Weekly review (${w.weekStart}) — discipline ${w.disciplineGrade}`,
        meta: { weekStart: w.weekStart, grade: w.disciplineGrade },
      });
    }

    // Rule-break logs
    const ruleBreakLogs = await byUser("ruleBreakLogs").collect();
    for (const rb of ruleBreakLogs as any[]) {
      events.push({
        id: `rulebreak-${rb._id}`,
        type: "rule_break",
        timestamp: rb.timestamp,
        summary: `Broke rule — ${rb.ruleName}`,
        meta: { ruleName: rb.ruleName, explanation: rb.explanation, tradeId: rb.tradeId },
      });
    }

    // Circuit breakers
    const circuitBreakerEvents = await byUser("circuitBreakerEvents").collect();
    for (const cb of circuitBreakerEvents as any[]) {
      events.push({
        id: `circuit-${cb._id}`,
        type: "circuit_breaker",
        timestamp: cb.triggeredAt,
        summary: `Circuit breaker (${cb.severity}) — ${cb.type}`,
        meta: { type: cb.type, severity: cb.severity, message: cb.message, overridden: cb.overridden },
      });
      if (cb.overridden && cb.overriddenAt) {
        events.push({
          id: `circuit-override-${cb._id}`,
          type: "circuit_breaker_override",
          timestamp: cb.overriddenAt,
          summary: `Overrode circuit breaker — ${cb.type}`,
          meta: { type: cb.type, severity: cb.severity },
        });
      }
    }

    // Brain score events (anti-gaming flags live here)
    const scoreEvents = await ctx.db
      .query("scoreEvents")
      .withIndex("by_user_timestamp", (q) => q.eq("userId", userId))
      .order("desc")
      .take(cap);
    for (const e of scoreEvents) {
      events.push({
        id: `score-${e._id}`,
        type: e.antiGamingFlags?.length ? "anti_gaming_flag" : "score_event",
        timestamp: new Date(e.timestamp).toISOString(),
        summary: `${e.eventType} (${e.delta >= 0 ? "+" : ""}${e.delta}) — ${e.reason}`,
        meta: {
          eventType: e.eventType,
          delta: e.delta,
          previousScore: e.previousScore,
          newScore: e.newScore,
          antiGamingFlags: e.antiGamingFlags ?? [],
          tradeId: e.tradeId ?? null,
        },
      });
    }

    // Subscription — the row only carries current state, but createdAt and
    // updatedAt are still useful markers. Emit both if they differ.
    const sub = await ctx.db
      .query("userSubscriptions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    if (sub) {
      events.push({
        id: `sub-created-${sub._id}`,
        type: "subscription_created",
        timestamp: sub.createdAt,
        summary: `Subscription record opened — ${sub.planId}`,
        meta: { planId: sub.planId, status: sub.status, provider: sub.paymentProvider ?? null },
      });
      if (sub.updatedAt !== sub.createdAt) {
        events.push({
          id: `sub-updated-${sub._id}`,
          type: "subscription_change",
          timestamp: sub.updatedAt,
          summary: `Subscription updated — ${sub.planId} (${sub.status})`,
          meta: { planId: sub.planId, status: sub.status, interval: sub.interval ?? null },
        });
      }
    }

    // Profile creation = signup
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    if (profile) {
      events.push({
        id: `signup-${profile._id}`,
        type: "signup",
        timestamp: new Date(profile._creationTime).toISOString(),
        summary: `User profile created`,
        meta: { initialCapital: profile.initialCapital, currency: profile.currency ?? "USD" },
      });
    }

    // Admin actions taken on this user (ban / override / data reset)
    // adminEvents has no by_user index — filter from the recent slice.
    const recentAdmin = await ctx.db
      .query("adminEvents")
      .withIndex("by_timestamp")
      .order("desc")
      .take(500);
    for (const a of recentAdmin.filter((e) => e.userId === userId)) {
      events.push({
        id: `admin-${a._id}`,
        type: `admin:${a.type}`,
        timestamp: a.timestamp,
        summary: `Admin action — ${a.type.replace(/_/g, " ")}`,
        meta: { adminId: a.adminId ?? null, raw: a.metadata },
      });
    }

    // Sort desc, apply optional filters, slice. The merged set is bounded by
    // each source's cap so we never load more than ~10× cap into memory.
    let filtered = events;
    if (types && types.length > 0) {
      const set = new Set(types);
      filtered = filtered.filter((e) => set.has(e.type));
    }
    if (before) {
      filtered = filtered.filter((e) => e.timestamp < before);
    }
    filtered.sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1));

    return {
      events: filtered.slice(0, cap),
      totalCounts: {
        trades: trades.length,
        strategies: strategies.length,
        checklists: checklists.length,
        journalEntries: journalEntries.length,
        monthlyGoals: monthlyGoals.length,
        triggerEntries: triggerEntries.length,
        dailyReflections: dailyReflections.length,
        weeklyReviews: weeklyReviews.length,
        ruleBreakLogs: ruleBreakLogs.length,
        circuitBreakerEvents: circuitBreakerEvents.length,
        scoreEvents: scoreEvents.length,
      },
    };
  },
});

export const getAdminUserSubscription = query({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    await requireAdmin(ctx);
    return ctx.db
      .query("userSubscriptions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
  },
});

// ─── Manual plan override (admin-only) ───────────────────────────────
//
// Manually upgrades or downgrades a target user's plan without going through
// Stripe. Use this for QA / testing Pro/Elite limits before the webhook is
// fully wired, or to comp a customer support case. Writes the same shape the
// Stripe webhook would, so `getEffectivePlanId` and `getUserSubscription`
// both pick it up immediately on the next query.
//
// Run from the Convex dashboard:
//   Functions → admin:setUserPlan → Run
//   { "targetUserId": "user_2abc…", "planId": "pro", "status": "active" }
export const setUserPlan = mutation({
  args: {
    targetUserId: v.string(),
    planId: v.union(
      v.literal("free"),
      v.literal("core"),
      v.literal("pro"),
      v.literal("elite"),
    ),
    status: v.optional(v.union(
      v.literal("active"),
      v.literal("trialing"),
      v.literal("canceled"),
      v.literal("past_due"),
      v.literal("unpaid"),
      v.literal("incomplete"),
      v.literal("free"),
    )),
  },
  handler: async (ctx, { targetUserId, planId, status }) => {
    await requireAdmin(ctx);

    const effectiveStatus = status ?? (planId === "free" ? "free" : "active");
    const now = new Date().toISOString();

    const existing = await ctx.db
      .query("userSubscriptions")
      .withIndex("by_user", (q) => q.eq("userId", targetUserId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        planId,
        status: effectiveStatus,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("userSubscriptions", {
        userId: targetUserId,
        stripeCustomerId: "",
        planId,
        status: effectiveStatus,
        createdAt: now,
        updatedAt: now,
      });
    }

    await ctx.db.insert("adminEvents", {
      type: "subscription_change",
      userId: targetUserId,
      metadata: JSON.stringify({ planId, status: effectiveStatus, source: "admin_manual_override" }),
      timestamp: now,
    });

    return { targetUserId, planId, status: effectiveStatus };
  },
});
