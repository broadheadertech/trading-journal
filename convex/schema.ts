import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const ruleCompliance = v.union(v.literal("yes"), v.literal("partial"), v.literal("no"));

// ─── Brain / Neuro Score shared validators ───────────────────────────
const stage = v.union(
  v.literal("beginner"),
  v.literal("intern"),
  v.literal("advance"),
  v.literal("professional"),
  v.literal("advance-professional"),
  v.literal("guru"),
  // Legacy stage names (pre-2026-02 rename) — kept so existing documents can be read/written
  // until migrateAllBrainStages admin mutation is run. Safe to remove after migration.
  v.literal("baby"),
  v.literal("toddler"),
  v.literal("kid"),
  v.literal("teen"),
  v.literal("adult"),
  v.literal("master")
);

const scoreEventType = v.union(
  v.literal("trade_scored"),
  v.literal("decay_applied"),
  v.literal("migration_replay"),
  v.literal("retroactive_recalculation"), // Story 6.5 — edit-triggered replay (FR8)
  v.literal("admin_adjustment"),
  v.literal("stage_transition"),     // Story 5.1 — cron-triggered stage changes (FR11, FR12)
  v.literal("vacation_activated"),   // Story 5.4 — vacation mode toggled on
  v.literal("vacation_deactivated"), // Story 5.4 — vacation mode toggled off
  v.literal("subscription_upgrade_unlock"), // Story 7.4 — effectiveStage unlocked on upgrade (FR37)
);

const stageHistoryEntry = v.object({
  stage,
  reachedAt: v.number(),
  leftAt: v.optional(v.number()),
  reason: v.optional(v.string()),
});

const ruleComplianceRecord = v.object({
  rule: v.string(),
  compliance: ruleCompliance,
});

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
    direction: v.optional(v.union(v.literal("long"), v.literal("short"))),
    leverage: v.optional(v.union(v.null(), v.number())),
    fees: v.optional(v.union(v.null(), v.number())),
    funding: v.optional(v.union(v.null(), v.number())),
    margin: v.optional(v.union(v.null(), v.number())),
    followedPlan: v.optional(v.union(v.null(), v.boolean())),
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

  // ─── Brain / Neuro Score data ────────────────────────────────────────
  brainStates: defineTable({
    userId: v.string(),
    currentScore: v.number(),
    currentStage: stage,
    effectiveStage: v.optional(stage), // Story 7.1 — tier-capped display stage (FR34); absent = same as currentStage
    previousScore: v.number(),
    streakDays: v.number(),
    streakMultiplier: v.number(),
    lastTradeDate: v.number(),
    lastScoreUpdateDate: v.number(),
    isVacationMode: v.boolean(),
    vacationEnd: v.union(v.null(), v.number()),
    vacationStartedAt: v.optional(v.union(v.null(), v.number())), // Story 5.4 — when vacation was activated (optional for backward compat)
    hasRegressed: v.boolean(),
    regressionBufferStart: v.union(v.null(), v.number()),
    regressionBufferDays: v.number(),
    evolutionCooldownStart: v.optional(v.union(v.null(), v.number())), // Story 5.1 — optional so existing docs without field still validate (FR11)
    recoveryLockUntil: v.union(v.null(), v.number()),
    stageHistory: v.array(stageHistoryEntry),
    latestCoachingMessage: v.optional(v.object({
      message: v.string(),
      category: v.string(),
      disclaimer: v.string(),
      timestamp: v.number(),
    })),
    updatedAt: v.number(),
    createdAt: v.number(),
  }).index("by_user", ["userId"]),

  scoreEvents: defineTable({
    userId: v.string(),
    timestamp: v.number(),
    eventType: scoreEventType,
    delta: v.number(),
    previousScore: v.number(),
    newScore: v.number(),
    reason: v.string(),
    tradeId: v.optional(v.string()),
    ruleCompliance: v.optional(v.array(ruleComplianceRecord)),
    antiGamingFlags: v.array(v.string()),
    metadata: v.any(),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_timestamp", ["userId", "timestamp"]),

  dailySnapshots: defineTable({
    userId: v.string(),
    date: v.string(),
    score: v.number(),
    stage,
    tradesLogged: v.number(),
    dailyDelta: v.number(),
    decayApplied: v.boolean(),
    streakActive: v.boolean(),
    vacationActive: v.boolean(),
    hibernationActive: v.optional(v.boolean()), // Story 5.5 — was this day a weekend/holiday? (optional for backward compat)
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_date", ["userId", "date"]),

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
    textOnlyBrain: v.optional(v.boolean()), // Story 9.1 — text-only companion mode (FR43)
    reducedMotion: v.optional(v.boolean()), // Story 9.2 — reduced motion mode (FR44)
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

  // ─── Team / workspace data ──────────────────────────────────────────
  workspaces: defineTable({
    id: v.string(),
    name: v.string(),
    ownerId: v.string(),
    createdAt: v.string(),
  }).index("by_owner", ["ownerId"]),

  workspaceMembers: defineTable({
    workspaceId: v.string(),
    userId: v.string(),
    displayName: v.string(),
    email: v.string(),
    role: v.union(v.literal("owner"), v.literal("admin"), v.literal("coach"), v.literal("member")),
    joinedAt: v.string(),
  })
    .index("by_workspace", ["workspaceId"])
    .index("by_user", ["userId"]),

  workspaceCohorts: defineTable({
    workspaceId: v.string(),
    id: v.string(),
    name: v.string(),
    code: v.string(),
    memberUserIds: v.array(v.string()),
    createdAt: v.string(),
  }).index("by_workspace", ["workspaceId"]),

  workspaceMessages: defineTable({
    workspaceId: v.string(),
    fromUserId: v.string(),
    toUserId: v.string(),
    message: v.string(),
    visibility: v.union(v.literal("private"), v.literal("shared")),
    timestamp: v.string(),
  })
    .index("by_workspace", ["workspaceId"])
    .index("by_conversation", ["workspaceId", "fromUserId", "toUserId"]),

  workspaceActivityFeed: defineTable({
    workspaceId: v.string(),
    userId: v.string(),
    displayName: v.string(),
    type: v.string(),
    message: v.string(),
    timestamp: v.string(),
  }).index("by_workspace", ["workspaceId"]),

  // ─── User notifications ────────────────────────────────────────────
  notifications: defineTable({
    userId: v.string(),
    type: v.string(),
    title: v.string(),
    message: v.string(),
    read: v.boolean(),
    link: v.optional(v.string()),
    timestamp: v.string(),
  })
    .index("by_user", ["userId"])
    .index("by_user_unread", ["userId", "read"]),

  // ─── User subscriptions ───────────────────────────────────────────
  userSubscriptions: defineTable({
    userId: v.string(),
    stripeCustomerId: v.string(),
    stripeSubscriptionId: v.optional(v.string()),
    paymongoCustomerId: v.optional(v.string()),
    paymongoSubscriptionId: v.optional(v.string()),
    paymentProvider: v.optional(v.union(v.literal("stripe"), v.literal("paymongo"))),
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
