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

  // ─── Courses (paid per-course unlock) ──────────────────────────────
  courses: defineTable({
    id: v.string(),
    slug: v.string(),
    title: v.string(),
    description: v.string(),
    coverImage: v.optional(v.string()),
    gallery: v.optional(v.array(v.string())),
    priceUsd: v.number(),       // USD price for Stripe
    pricePhp: v.number(),       // PHP price for PayMongo
    externalUrl: v.optional(v.string()), // Mode A: link out
    isPublished: v.boolean(),
    createdBy: v.string(),
    createdAt: v.string(),
    updatedAt: v.string(),
  })
    .index("by_slug", ["slug"])
    .index("by_published", ["isPublished"]),

  courseModules: defineTable({
    id: v.string(),
    courseId: v.string(),
    title: v.string(),
    order: v.number(),
    createdAt: v.string(),
  }).index("by_course", ["courseId"]),

  courseLessons: defineTable({
    id: v.string(),
    moduleId: v.string(),
    courseId: v.string(),
    title: v.string(),
    order: v.number(),
    contentType: v.union(v.literal("text"), v.literal("video"), v.literal("link")),
    body: v.string(),
    videoUrl: v.optional(v.string()),
    externalUrl: v.optional(v.string()),
    createdAt: v.string(),
  })
    .index("by_module", ["moduleId"])
    .index("by_course", ["courseId"]),

  coursePurchases: defineTable({
    userId: v.string(),
    courseId: v.string(),
    paymentProvider: v.union(v.literal("stripe"), v.literal("paymongo")),
    paymentId: v.string(),       // Stripe session id or PayMongo checkout id
    amount: v.number(),
    currency: v.string(),
    purchasedAt: v.string(),
  })
    .index("by_user", ["userId"])
    .index("by_user_course", ["userId", "courseId"])
    .index("by_payment_id", ["paymentId"]),

  lessonProgress: defineTable({
    userId: v.string(),
    lessonId: v.string(),
    courseId: v.string(),
    completedAt: v.string(),
  })
    .index("by_user", ["userId"])
    .index("by_user_course", ["userId", "courseId"])
    .index("by_user_lesson", ["userId", "lessonId"]),

  // ─── Events / Trainings ────────────────────────────────────────────
  events: defineTable({
    id: v.string(),
    slug: v.string(),
    title: v.string(),
    description: v.string(),
    coverImage: v.optional(v.string()),
    gallery: v.optional(v.array(v.string())),
    mode: v.union(v.literal("online"), v.literal("in_person"), v.literal("hybrid")),
    startsAt: v.string(),
    endsAt: v.string(),
    timezone: v.optional(v.string()),
    // Online
    meetingUrl: v.optional(v.string()),
    platform: v.optional(v.string()),
    // In-person
    venueName: v.optional(v.string()),
    address: v.optional(v.string()),
    city: v.optional(v.string()),
    country: v.optional(v.string()),
    mapUrl: v.optional(v.string()),
    // Common
    capacity: v.optional(v.number()),
    priceUsd: v.number(),
    pricePhp: v.number(),
    isPublished: v.boolean(),
    createdBy: v.string(),
    createdAt: v.string(),
    updatedAt: v.string(),
  })
    .index("by_slug", ["slug"])
    .index("by_published", ["isPublished"]),

  eventRegistrations: defineTable({
    userId: v.string(),
    eventId: v.string(),
    status: v.union(v.literal("registered"), v.literal("paid")),
    paymentProvider: v.optional(v.union(v.literal("stripe"), v.literal("paymongo"))),
    paymentId: v.optional(v.string()),
    amount: v.optional(v.number()),
    currency: v.optional(v.string()),
    registeredAt: v.string(),
  })
    .index("by_user", ["userId"])
    .index("by_event", ["eventId"])
    .index("by_user_event", ["userId", "eventId"])
    .index("by_payment_id", ["paymentId"]),

  // ─── Community Forum ───────────────────────────────────────────────
  forumCategories: defineTable({
    id: v.string(),
    slug: v.string(),
    name: v.string(),
    description: v.string(),
    color: v.optional(v.string()),
    order: v.number(),
    createdAt: v.string(),
  }).index("by_slug", ["slug"]),

  forumPosts: defineTable({
    id: v.string(),
    categoryId: v.string(),
    authorId: v.string(),
    authorName: v.string(),
    authorImage: v.optional(v.string()),
    authorTier: v.optional(v.string()),
    title: v.string(),
    body: v.string(),
    images: v.optional(v.array(v.string())),
    isPinned: v.boolean(),
    isLocked: v.boolean(),
    upvotes: v.number(),
    downvotes: v.number(),
    score: v.number(),         // upvotes - downvotes (denormalized for sorting)
    commentCount: v.number(),
    createdAt: v.string(),
    updatedAt: v.string(),
  })
    .index("by_category", ["categoryId"])
    .index("by_author", ["authorId"])
    .index("by_score", ["score"])
    .index("by_created", ["createdAt"]),

  forumComments: defineTable({
    id: v.string(),
    postId: v.string(),
    parentCommentId: v.optional(v.string()), // for nesting
    authorId: v.string(),
    authorName: v.string(),
    authorImage: v.optional(v.string()),
    authorTier: v.optional(v.string()),
    body: v.string(),
    upvotes: v.number(),
    downvotes: v.number(),
    score: v.number(),
    createdAt: v.string(),
  })
    .index("by_post", ["postId"])
    .index("by_author", ["authorId"]),

  forumVotes: defineTable({
    userId: v.string(),
    targetType: v.union(v.literal("post"), v.literal("comment")),
    targetId: v.string(),
    value: v.union(v.literal(1), v.literal(-1)),
  })
    .index("by_user_target", ["userId", "targetType", "targetId"])
    .index("by_target", ["targetType", "targetId"]),

  // ─── Coaching ──────────────────────────────────────────────────────
  coaches: defineTable({
    id: v.string(),
    userId: v.string(),                      // Clerk user id
    slug: v.string(),
    displayName: v.string(),
    headline: v.string(),                    // short pitch
    bio: v.string(),
    photoUrl: v.optional(v.string()),
    specialties: v.array(v.string()),        // tags
    languages: v.optional(v.array(v.string())),
    timezone: v.string(),
    hourlyRateUsd: v.number(),
    sessionDurationMin: v.number(),          // 30 / 60 / 90
    status: v.union(
      v.literal("pending"),                  // application submitted
      v.literal("approved"),
      v.literal("suspended"),
      v.literal("rejected"),
    ),
    avgRating: v.optional(v.number()),
    reviewCount: v.optional(v.number()),
    totalSessions: v.optional(v.number()),
    totalEarningsUsd: v.optional(v.number()),
    createdAt: v.string(),
    updatedAt: v.string(),
  })
    .index("by_user", ["userId"])
    .index("by_slug", ["slug"])
    .index("by_status", ["status"]),

  // Coach defines bookable time slots; each slot is consumed by one session
  coachSlots: defineTable({
    id: v.string(),
    coachId: v.string(),
    startsAt: v.string(),                    // ISO
    endsAt: v.string(),
    isBooked: v.boolean(),
    sessionId: v.optional(v.string()),
    createdAt: v.string(),
  })
    .index("by_coach", ["coachId"])
    .index("by_coach_unbooked", ["coachId", "isBooked"]),

  coachSessions: defineTable({
    id: v.string(),
    coachId: v.string(),
    coachUserId: v.string(),
    clientUserId: v.string(),
    clientName: v.string(),
    clientImage: v.optional(v.string()),
    slotId: v.string(),
    startsAt: v.string(),
    endsAt: v.string(),
    sessionDurationMin: v.number(),
    pricePaidUsd: v.number(),
    platformFeeUsd: v.number(),              // commission (15%)
    coachPayoutUsd: v.number(),
    status: v.union(
      v.literal("pending"),
      v.literal("confirmed"),
      v.literal("in_progress"),
      v.literal("completed"),
      v.literal("cancelled"),
      v.literal("disputed"),
    ),
    paymentStatus: v.union(
      v.literal("stub_paid"),                // stub: marked paid in dev
      v.literal("paid"),                     // real Stripe Connect later
      v.literal("refunded"),
      v.literal("released"),                 // funds released to coach
    ),
    paymentId: v.optional(v.string()),
    meetingUrl: v.optional(v.string()),      // coach fills in or auto from Daily.co later
    clientGoals: v.string(),                 // why they booked
    coachNotes: v.optional(v.string()),      // post-session notes (private to coach)
    cancelledAt: v.optional(v.string()),
    cancelledBy: v.optional(v.string()),
    completedAt: v.optional(v.string()),
    createdAt: v.string(),
  })
    .index("by_coach", ["coachId"])
    .index("by_client", ["clientUserId"])
    .index("by_coach_user", ["coachUserId"])
    .index("by_status", ["status"])
    .index("by_starts_at", ["startsAt"]),

  // Real-time DMs scoped to a session pairing
  coachMessages: defineTable({
    id: v.string(),
    sessionId: v.string(),
    fromUserId: v.string(),
    fromName: v.string(),
    fromImage: v.optional(v.string()),
    body: v.string(),
    createdAt: v.string(),
    readAt: v.optional(v.string()),
  })
    .index("by_session", ["sessionId"])
    .index("by_session_created", ["sessionId", "createdAt"]),

  coachReviews: defineTable({
    id: v.string(),
    coachId: v.string(),
    sessionId: v.string(),
    clientUserId: v.string(),
    clientName: v.string(),
    rating: v.number(),                      // 1..5
    comment: v.string(),
    createdAt: v.string(),
  })
    .index("by_coach", ["coachId"])
    .index("by_session", ["sessionId"]),

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
