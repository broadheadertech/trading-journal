import { query } from "./_generated/server";
import { v } from "convex/values";

// ─── Admin guard (same shape as convex/admin.ts) ─────────────────────
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

/* ─── Global activity firehose ────────────────────────────────────────
 *
 * Cross-user version of the per-user timeline. Aggregates recent rows from
 * every user-activity table, normalizes, sorts, slices. Bounded by taking
 * the most recent N from each source so memory stays predictable as the
 * platform grows.
 */
type FirehoseEvent = {
  id: string;
  type: string;
  userId: string;
  timestamp: string;
  summary: string;
};

export const getActivityFirehose = query({
  args: {
    perSourceLimit: v.optional(v.number()),
    limit: v.optional(v.number()),
    types: v.optional(v.array(v.string())),
    userId: v.optional(v.string()),
    before: v.optional(v.string()),
  },
  handler: async (ctx, { perSourceLimit, limit, types, userId, before }) => {
    await requireAdmin(ctx);
    const cap = perSourceLimit ?? 100;
    const out: FirehoseEvent[] = [];

    // Pull the most recent rows from each table. For tables without a sortable
    // index we collect then in-memory sort by Convex's _creationTime — fine
    // because the firehose is a backoffice tool, not a hot read path.
    const trades = userId
      ? await ctx.db.query("trades").withIndex("by_user", (q) => q.eq("userId", userId)).order("desc").take(cap)
      : await ctx.db.query("trades").order("desc").take(cap);
    for (const t of trades as any[]) {
      out.push({
        id: `trade-log-${t._id}`,
        type: "trade_logged",
        userId: t.userId,
        timestamp: t.createdAt,
        summary: `Logged ${t.direction ?? ""} ${t.coin} ${t.isOpen ? "(open)" : ""}`.replace(/\s+/g, " ").trim(),
      });
      if (!t.isOpen && t.exitDate) {
        out.push({
          id: `trade-close-${t._id}`,
          type: "trade_closed",
          userId: t.userId,
          timestamp: t.exitDate,
          summary: `Closed ${t.coin} ${t.actualPnL != null ? (t.actualPnL >= 0 ? "+" : "") + "$" + t.actualPnL.toFixed(2) : ""}`.trim(),
        });
      }
    }

    const ruleBreaks = userId
      ? await ctx.db.query("ruleBreakLogs").withIndex("by_user", (q) => q.eq("userId", userId)).order("desc").take(cap)
      : await ctx.db.query("ruleBreakLogs").order("desc").take(cap);
    for (const rb of ruleBreaks as any[]) {
      out.push({
        id: `rulebreak-${rb._id}`,
        type: "rule_break",
        userId: rb.userId,
        timestamp: rb.timestamp,
        summary: `Broke rule — ${rb.ruleName}`,
      });
    }

    const cbs = userId
      ? await ctx.db.query("circuitBreakerEvents").withIndex("by_user", (q) => q.eq("userId", userId)).order("desc").take(cap)
      : await ctx.db.query("circuitBreakerEvents").order("desc").take(cap);
    for (const cb of cbs as any[]) {
      out.push({
        id: `circuit-${cb._id}`,
        type: "circuit_breaker",
        userId: cb.userId,
        timestamp: cb.triggeredAt,
        summary: `Circuit breaker (${cb.severity}) — ${cb.type}`,
      });
    }

    const scoreEvents = userId
      ? await ctx.db.query("scoreEvents").withIndex("by_user_timestamp", (q) => q.eq("userId", userId)).order("desc").take(cap)
      : await ctx.db.query("scoreEvents").order("desc").take(cap);
    for (const e of scoreEvents) {
      const flagged = (e.antiGamingFlags?.length ?? 0) > 0;
      out.push({
        id: `score-${e._id}`,
        type: flagged ? "anti_gaming_flag" : "score_event",
        userId: e.userId,
        timestamp: new Date(e.timestamp).toISOString(),
        summary: `${e.eventType} (${e.delta >= 0 ? "+" : ""}${e.delta}) — ${e.reason}`,
      });
    }

    const reflections = userId
      ? await ctx.db.query("dailyReflections").withIndex("by_user", (q) => q.eq("userId", userId)).order("desc").take(cap)
      : await ctx.db.query("dailyReflections").order("desc").take(cap);
    for (const r of reflections as any[]) {
      out.push({
        id: `reflection-${r._id}`,
        type: "daily_reflection",
        userId: r.userId,
        timestamp: r.createdAt,
        summary: `Daily reflection — rating ${r.overallRating}/10`,
      });
    }

    const journals = userId
      ? await ctx.db.query("journalEntries").withIndex("by_user", (q) => q.eq("userId", userId)).order("desc").take(cap)
      : await ctx.db.query("journalEntries").order("desc").take(cap);
    for (const j of journals as any[]) {
      out.push({
        id: `journal-${j._id}`,
        type: "journal_entry",
        userId: j.userId,
        timestamp: j.createdAt,
        summary: `Journal — ${j.emotion} (energy ${j.energyLevel})`,
      });
    }

    const triggers = userId
      ? await ctx.db.query("triggerEntries").withIndex("by_user", (q) => q.eq("userId", userId)).order("desc").take(cap)
      : await ctx.db.query("triggerEntries").order("desc").take(cap);
    for (const tg of triggers as any[]) {
      out.push({
        id: `trigger-${tg._id}`,
        type: "trigger_entry",
        userId: tg.userId,
        timestamp: tg.createdAt,
        summary: `Trigger — ${tg.source} (${tg.emotionalImpact})`,
      });
    }

    // Sort + filter + slice
    let filtered = out;
    if (types && types.length > 0) {
      const set = new Set(types);
      filtered = filtered.filter((e) => set.has(e.type));
    }
    if (before) {
      filtered = filtered.filter((e) => e.timestamp < before);
    }
    filtered.sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1));
    return filtered.slice(0, limit ?? 200);
  },
});

/* ─── Flagged users dashboard ─────────────────────────────────────────
 *
 * Computes a per-user risk profile from existing data:
 *   • anti-gaming flag hits in last 30 days
 *   • rule-break frequency (last 30d)
 *   • circuit-breaker hits (last 30d)
 *   • recovery lock active right now
 *   • churn risk = paid user with no trade in 14+ days
 *
 * Each user gets a flagged array + a single severity (low|med|high) used
 * for sorting/coloring in the UI.
 */
export const getFlaggedUsers = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const now = Date.now();
    const day = 24 * 60 * 60 * 1000;
    const thirtyDaysAgo = now - 30 * day;
    const fourteenDaysAgo = now - 14 * day;

    const profiles = await ctx.db.query("profiles").collect();
    const subs = await ctx.db.query("userSubscriptions").collect();
    const trades = await ctx.db.query("trades").collect();
    const ruleBreaks = await ctx.db.query("ruleBreakLogs").collect();
    const cbs = await ctx.db.query("circuitBreakerEvents").collect();
    const brainStates = await ctx.db.query("brainStates").collect();
    const scoreEvents = await ctx.db.query("scoreEvents").collect();

    const tradesByUser = new Map<string, typeof trades>();
    for (const t of trades) {
      const arr = tradesByUser.get(t.userId) ?? [];
      arr.push(t);
      tradesByUser.set(t.userId, arr);
    }
    const subByUser = new Map(subs.map((s) => [s.userId, s]));
    const brainByUser = new Map(brainStates.map((b) => [b.userId, b]));

    const rows = profiles.map((p) => {
      const userTrades = tradesByUser.get(p.userId) ?? [];
      const lastTradeIso = userTrades.length
        ? userTrades
            .map((t) => t.createdAt)
            .sort()
            .at(-1)!
        : null;
      const lastTradeTs = lastTradeIso ? new Date(lastTradeIso).getTime() : 0;

      const userRuleBreaks30d = ruleBreaks.filter(
        (r) => r.userId === p.userId && new Date(r.timestamp).getTime() >= thirtyDaysAgo,
      ).length;
      const userCbs30d = cbs.filter(
        (c) => c.userId === p.userId && new Date(c.triggeredAt).getTime() >= thirtyDaysAgo,
      ).length;
      const antiGamingHits30d = scoreEvents.filter(
        (e) => e.userId === p.userId && e.timestamp >= thirtyDaysAgo && (e.antiGamingFlags?.length ?? 0) > 0,
      ).length;

      const brain = brainByUser.get(p.userId);
      const recoveryLockActive = brain?.recoveryLockUntil != null && brain.recoveryLockUntil > now;

      const sub = subByUser.get(p.userId);
      const isPaid = sub && sub.planId !== "free" && (sub.status === "active" || sub.status === "trialing");
      const inactivePaid = isPaid && (userTrades.length === 0 || lastTradeTs < fourteenDaysAgo);
      const subProblem = sub && (sub.status === "past_due" || sub.status === "unpaid" || sub.status === "incomplete");

      const reasons: string[] = [];
      if (antiGamingHits30d > 0) reasons.push(`${antiGamingHits30d} anti-gaming flag${antiGamingHits30d > 1 ? "s" : ""} (30d)`);
      if (userRuleBreaks30d >= 5) reasons.push(`${userRuleBreaks30d} rule breaks (30d)`);
      if (userCbs30d > 0) reasons.push(`${userCbs30d} circuit breaker${userCbs30d > 1 ? "s" : ""} (30d)`);
      if (recoveryLockActive) reasons.push("recovery lock active");
      if (inactivePaid) reasons.push("paid + inactive 14d+");
      if (subProblem) reasons.push(`subscription ${sub!.status}`);
      if (p.isBanned) reasons.push("banned");

      let severity: "low" | "med" | "high" = "low";
      const score = antiGamingHits30d * 3 + (userCbs30d > 0 ? 2 : 0) + (recoveryLockActive ? 2 : 0)
                  + (subProblem ? 2 : 0) + (userRuleBreaks30d >= 10 ? 2 : userRuleBreaks30d >= 5 ? 1 : 0)
                  + (inactivePaid ? 1 : 0);
      if (score >= 5) severity = "high";
      else if (score >= 2) severity = "med";

      return {
        userId: p.userId,
        isBanned: p.isBanned ?? false,
        planId: sub?.planId ?? "free",
        subStatus: sub?.status ?? "free",
        tradeCount: userTrades.length,
        lastTradeAt: lastTradeIso,
        antiGamingHits30d,
        ruleBreaks30d: userRuleBreaks30d,
        circuitBreakers30d: userCbs30d,
        recoveryLockActive,
        reasons,
        severity,
        riskScore: score,
      };
    });

    return rows
      .filter((r) => r.reasons.length > 0)
      .sort((a, b) => b.riskScore - a.riskScore);
  },
});

/* ─── Searchable admin audit log ─────────────────────────────────────
 *
 * Extends getRecentEvents with filtering, type, user, time-range search.
 * adminEvents has only a by_timestamp index so we pull a window and filter
 * in memory.
 */
export const getAuditLog = query({
  args: {
    limit: v.optional(v.number()),
    types: v.optional(v.array(v.string())),
    userId: v.optional(v.string()),
    adminId: v.optional(v.string()),
    before: v.optional(v.string()),
    searchPool: v.optional(v.number()),
  },
  handler: async (ctx, { limit, types, userId, adminId, before, searchPool }) => {
    await requireAdmin(ctx);
    const pool = searchPool ?? 1000;
    const rows = await ctx.db.query("adminEvents").withIndex("by_timestamp").order("desc").take(pool);

    const typeSet = types && types.length > 0 ? new Set(types) : null;
    const filtered = rows.filter((r) => {
      if (typeSet && !typeSet.has(r.type)) return false;
      if (userId && r.userId !== userId) return false;
      if (adminId && r.adminId !== adminId) return false;
      if (before && r.timestamp >= before) return false;
      return true;
    });

    return filtered.slice(0, limit ?? 100);
  },
});

/* ─── Failed-payment queue ────────────────────────────────────────────
 *
 * Lists every userSubscription in a state that needs human attention.
 * status_problem covers Stripe's dunning lifecycle plus our manual flags.
 */
export const getFailedPayments = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const all = await ctx.db.query("userSubscriptions").collect();
    const problem = all.filter(
      (s) => s.status === "past_due" || s.status === "unpaid" || s.status === "incomplete",
    );

    // Sort canceled-but-still-in-period to the bottom — those are soft churns,
    // not active payment failures.
    return problem
      .map((s) => ({
        _id: s._id,
        userId: s.userId,
        planId: s.planId,
        status: s.status,
        interval: s.interval ?? null,
        currentPeriodEnd: s.currentPeriodEnd ?? null,
        cancelAtPeriodEnd: s.cancelAtPeriodEnd ?? false,
        stripeCustomerId: s.stripeCustomerId,
        stripeSubscriptionId: s.stripeSubscriptionId ?? null,
        paymentProvider: s.paymentProvider ?? null,
        updatedAt: s.updatedAt,
      }))
      .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
  },
});

/* ─── Enhanced revenue snapshot ───────────────────────────────────────
 *
 * Adds net-new MRR by month and churn $ by month — complements the existing
 * getRevenueStats / getSubscriberGrowth. Tries plans for price; falls back
 * to a configurable fallback when plans are missing prices (newly created).
 */
export const getRevenueExtras = query({
  args: { months: v.optional(v.number()) },
  handler: async (ctx, { months }) => {
    await requireAdmin(ctx);
    const window = months ?? 6;

    const subs = await ctx.db.query("userSubscriptions").collect();
    const plans = await ctx.db.query("subscriptionPlans").collect();
    const planPrice = new Map(plans.map((p) => [p.planId, p.priceMonthly]));

    const now = new Date();
    const buckets: { month: string; netNewMrr: number; churnedMrr: number }[] = [];

    for (let i = window - 1; i >= 0; i--) {
      const ref = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${ref.getFullYear()}-${String(ref.getMonth() + 1).padStart(2, "0")}`;
      const start = ref.getTime();
      const end = new Date(ref.getFullYear(), ref.getMonth() + 1, 1).getTime();

      let netNewMrr = 0;
      let churnedMrr = 0;
      for (const s of subs) {
        if (s.planId === "free") continue;
        const price = planPrice.get(s.planId) ?? 0;
        const createdTs = new Date(s.createdAt).getTime();
        const updatedTs = new Date(s.updatedAt).getTime();
        if (createdTs >= start && createdTs < end && (s.status === "active" || s.status === "trialing")) {
          netNewMrr += price;
        }
        if (s.status === "canceled" && updatedTs >= start && updatedTs < end) {
          churnedMrr += price;
        }
      }
      buckets.push({ month: key, netNewMrr, churnedMrr });
    }

    return buckets;
  },
});
