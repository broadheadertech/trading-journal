import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const ruleCompliance = v.union(v.literal("yes"), v.literal("partial"), v.literal("no"));

export default defineSchema({
  // ─── Core trading data ───────────────────────────────────────────────
  trades: defineTable({
    userId: v.string(),
    id: v.string(),
    coin: v.string(),
    entryPrice: v.number(),
    exitPrice: v.union(v.null(), v.number()),
    entryDate: v.string(),
    exitDate: v.union(v.null(), v.string()),
    capital: v.number(),
    targetPnL: v.union(v.null(), v.number()),
    actualPnL: v.union(v.null(), v.number()),
    actualPnLPercent: v.union(v.null(), v.number()),
    strategy: v.string(),
    rulesFollowed: v.union(v.null(), v.boolean()),
    ruleChecklist: v.array(
      v.object({ rule: v.string(), compliance: ruleCompliance })
    ),
    reasoning: v.string(),
    emotion: v.string(),
    exitEmotion: v.union(v.null(), v.string()),
    confidence: v.number(),
    setupConfidence: v.number(),
    executionConfidence: v.number(),
    tags: v.array(v.string()),
    screenshots: v.array(v.string()),
    verdict: v.union(v.null(), v.string()),
    notes: v.string(),
    setupNotes: v.string(),
    executionNotes: v.string(),
    lessonNotes: v.string(),
    oneThingNote: v.string(),
    selfVerdict: v.union(v.null(), v.string()),
    lossHypothesis: v.union(v.null(), v.string()),
    stopLoss: v.union(v.null(), v.number()),
    marketType: v.optional(v.union(v.literal("crypto"), v.literal("stocks"), v.literal("forex"))),
    isOpen: v.boolean(),
    createdAt: v.string(),
  }).index("by_user", ["userId"]),

  strategies: defineTable({
    userId: v.string(),
    id: v.string(),
    name: v.string(),
    type: v.string(),
    rules: v.array(v.string()),
    entryChecklist: v.array(v.string()),
    exitChecklist: v.array(v.string()),
    riskParams: v.object({
      maxPositionSize: v.optional(v.number()),
      maxLossPercent: v.optional(v.number()),
      riskRewardRatio: v.optional(v.number()),
      maxDailyLoss: v.optional(v.number()),
    }),
    createdAt: v.string(),
  }).index("by_user", ["userId"]),

  checklists: defineTable({
    userId: v.string(),
    id: v.string(),
    marketTrend: v.string(),
    volumeAnalysis: v.string(),
    supportLevels: v.string(),
    resistanceLevels: v.string(),
    newsEvents: v.string(),
    riskLevel: v.string(),
    notes: v.string(),
    aiRecommendation: v.optional(v.string()),
    createdAt: v.string(),
  }).index("by_user", ["userId"]),

  journalEntries: defineTable({
    userId: v.string(),
    id: v.string(),
    date: v.string(),
    emotion: v.string(),
    energyLevel: v.number(),
    notes: v.string(),
    lessonLearned: v.string(),
    createdAt: v.string(),
  }).index("by_user", ["userId"]),

  monthlyGoals: defineTable({
    userId: v.string(),
    id: v.string(),
    month: v.string(),
    pnlTarget: v.union(v.null(), v.number()),
    winRateTarget: v.union(v.null(), v.number()),
    maxMonthlyLoss: v.union(v.null(), v.number()),
    tradeCountTarget: v.union(v.null(), v.number()),
    createdAt: v.string(),
  }).index("by_user", ["userId"]),

  // ─── Discipline / psychology data ────────────────────────────────────
  triggerEntries: defineTable({
    userId: v.string(),
    id: v.string(),
    timestamp: v.string(),
    source: v.string(),
    description: v.string(),
    emotionalImpact: v.string(),
    intensityBefore: v.number(),
    intensityAfter: v.number(),
    didTrade: v.boolean(),
    tradeId: v.optional(v.string()),
    outcome: v.optional(v.union(v.null(), v.string())),
    createdAt: v.string(),
  }).index("by_user", ["userId"]),

  dailyReflections: defineTable({
    userId: v.string(),
    id: v.string(),
    date: v.string(),
    tradedMyPlan: v.boolean(),
    explanation: v.string(),
    emotionalMistakes: v.string(),
    biggestLesson: v.string(),
    tomorrowGoal: v.string(),
    overallRating: v.number(),
    createdAt: v.string(),
  }).index("by_user", ["userId"]),

  weeklyReviews: defineTable({
    userId: v.string(),
    id: v.string(),
    weekStart: v.string(),
    emotionalMistakes: v.string(),
    patternsNoticed: v.string(),
    improvementPlan: v.string(),
    disciplineGrade: v.string(),
    createdAt: v.string(),
  }).index("by_user", ["userId"]),

  ruleBreakLogs: defineTable({
    userId: v.string(),
    id: v.string(),
    tradeId: v.string(),
    ruleName: v.string(),
    explanation: v.string(),
    timestamp: v.string(),
  }).index("by_user", ["userId"]),

  // ─── Circuit breakers ────────────────────────────────────────────────
  circuitBreakerEvents: defineTable({
    userId: v.string(),
    id: v.string(),
    type: v.string(),
    triggeredAt: v.string(),
    severity: v.union(v.literal("warning"), v.literal("block")),
    message: v.string(),
    overridden: v.boolean(),
    overriddenAt: v.optional(v.string()),
  }).index("by_user", ["userId"]),

  cooldowns: defineTable({
    userId: v.string(),
    id: v.string(),
    type: v.string(),
    expiresAt: v.string(),
    reason: v.string(),
  }).index("by_user", ["userId"]),

  // ─── User profile / settings ─────────────────────────────────────────
  profiles: defineTable({
    userId: v.string(),
    initialCapital: v.number(),
    dailyLossLimit: v.optional(v.number()),
    dailyProfitTarget: v.optional(v.number()),
    goalMode: v.optional(v.union(v.literal('daily'), v.literal('session'))),
    currency: v.optional(v.string()),
    isBanned: v.optional(v.boolean()),
    bannedAt: v.optional(v.string()),
    bannedReason: v.optional(v.string()),
    onboardingComplete: v.optional(v.boolean()),
    primaryMarket: v.optional(v.string()),
  }).index("by_user", ["userId"]),

  // ─── Admin back-office ─────────────────────────────────────────────
  adminSettings: defineTable({
    key: v.string(),
    value: v.string(),
    updatedAt: v.string(),
    updatedBy: v.string(),
  }).index("by_key", ["key"]),

  subscriptionPlans: defineTable({
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
  }).index("by_active", ["isActive"]),

  // ─── Admin activity events ──────────────────────────────────────────
  adminEvents: defineTable({
    type: v.string(),
    userId: v.string(),
    metadata: v.string(),
    timestamp: v.string(),
    adminId: v.optional(v.string()),
  }).index("by_timestamp", ["timestamp"]),

  // ─── User subscriptions ───────────────────────────────────────────
  userSubscriptions: defineTable({
    userId: v.string(),
    stripeCustomerId: v.string(),
    stripeSubscriptionId: v.optional(v.string()),
    planId: v.string(),
    status: v.union(
      v.literal("active"),
      v.literal("trialing"),
      v.literal("past_due"),
      v.literal("canceled"),
      v.literal("unpaid"),
      v.literal("incomplete"),
      v.literal("free"),
    ),
    interval: v.optional(v.union(v.literal("month"), v.literal("year"))),
    currentPeriodEnd: v.optional(v.string()),
    cancelAtPeriodEnd: v.optional(v.boolean()),
    createdAt: v.string(),
    updatedAt: v.string(),
  })
    .index("by_user", ["userId"])
    .index("by_stripe_customer", ["stripeCustomerId"])
    .index("by_status", ["status"]),
});
