export type EmotionState =
  | 'Confident'
  | 'Fearful'
  | 'FOMO'
  | 'Greedy'
  | 'Neutral'
  | 'Revenge Trading'
  | 'Anxious'
  | 'Excited'
  | 'Frustrated'
  | 'Calm'
  | 'Impatient'
  | 'Overconfident';

export type TradeTag =
  | 'scalp'
  | 'swing'
  | 'breakout'
  | 'dip-buy'
  | 'momentum'
  | 'reversal'
  | 'news-play'
  | 'range-trade';

export type Verdict =
  | 'Well Executed'
  | 'Poorly Executed'
  | 'Good Discipline, Bad Luck'
  | 'Lucky Win';

export type RuleCompliance = 'yes' | 'partial' | 'no';

export type MarketTrend = 'bullish' | 'bearish' | 'sideways';
export type RiskLevel = 'low' | 'medium' | 'high' | 'extreme';
export type MarketType = 'crypto' | 'stocks' | 'forex';
export type StrategyType =
  | 'scalping'
  | 'swing'
  | 'breakout'
  | 'trend-following'
  | 'mean-reversion'
  | 'momentum'
  | 'arbitrage'
  | 'other';

export interface Trade {
  id: string;
  coin: string;
  entryPrice: number;
  exitPrice: number | null;
  entryDate: string;
  exitDate: string | null;
  capital: number;
  targetPnL: number | null;
  actualPnL: number | null;
  actualPnLPercent: number | null;
  strategy: string;
  rulesFollowed: boolean | null;
  ruleChecklist: { rule: string; compliance: RuleCompliance }[];
  reasoning: string;
  emotion: EmotionState;         // entry emotion — how you felt going in
  exitEmotion: EmotionState | null; // exit emotion — your reaction after the result
  confidence: number;
  // C-21: Dual confidence — how confident in setup vs execution (1-10 each)
  setupConfidence: number;
  executionConfidence: number;
  tags: TradeTag[];
  screenshots: string[];
  verdict: Verdict | null;
  notes: string;
  // Three targeted reflection fields (C-36)
  setupNotes: string;
  executionNotes: string;
  lessonNotes: string;
  // Coaching memory (A-6)
  oneThingNote: string;
  // Self-assessment before journal verdict (C-22)
  selfVerdict: Verdict | null;
  // Loss hypothesis engine (A-15)
  lossHypothesis: string | null;
  // Stop loss for R-multiple calculation (C-27)
  stopLoss: number | null;
  // Market type — crypto, stocks, or forex
  marketType?: MarketType;
  isOpen: boolean;
  createdAt: string;
}

export interface Strategy {
  id: string;
  name: string;
  type: StrategyType;
  rules: string[];
  entryChecklist: string[];
  exitChecklist: string[];
  riskParams: {
    maxPositionSize?: number;
    maxLossPercent?: number;
    riskRewardRatio?: number;
    maxDailyLoss?: number;
  };
  createdAt: string;
}

export interface PreTradeChecklist {
  id: string;
  marketTrend: MarketTrend;
  volumeAnalysis: string;
  supportLevels: string;
  resistanceLevels: string;
  newsEvents: string;
  riskLevel: RiskLevel;
  notes: string;
  aiRecommendation?: string;
  createdAt: string;
}

export interface JournalEntry {
  id: string;
  date: string;
  emotion: EmotionState;
  energyLevel: number;
  notes: string;
  lessonLearned: string;
  createdAt: string;
}

export type CircuitBreakerType =
  | 'consecutive-loss'
  | 'overtrading'
  | 'revenge-trading'
  | 'high-risk-capital'
  | 'late-night'
  | 'fomo-detected';

export interface CircuitBreakerResult {
  type: CircuitBreakerType;
  severity: 'warning' | 'block';
  message: string;
  cooldownMs?: number;
}

export interface CircuitBreakerEvent {
  id: string;
  type: CircuitBreakerType;
  triggeredAt: string;
  severity: 'warning' | 'block';
  message: string;
  overridden: boolean;
  overriddenAt?: string;
}

export interface CooldownState {
  type: CircuitBreakerType;
  expiresAt: string;
  reason: string;
}

export interface EmotionalCheckpointData {
  emotion: EmotionState;
  intensity: number;
  checklistCompleted: boolean[];
  reasoning: string;
  circuitBreakerResults: CircuitBreakerResult[];
  aiCoachAdvice?: string;
  completedAt: string;
}

// Discipline scoring types
export type DisciplineGrade = 'A' | 'B' | 'C' | 'D' | 'F';

export interface DisciplineBadge {
  id: string;
  name: string;
  description: string;
  emoji: string;
  requirement: string;
  requiredCount: number;
  category: 'calm' | 'rules' | 'risk' | 'patience' | 'streak';
}

export interface DailyDisciplineScore {
  date: string; // YYYY-MM-DD
  grade: DisciplineGrade;
  points: number;
  rulesFollowed: number;
  rulesTotal: number;
  calmTrades: number;
  totalTrades: number;
  breakersRespected: number;
  breakersTriggered: number;
  breakersOverridden: number;
}

export interface DisciplineState {
  totalPoints: number;
  currentStreak: number; // consecutive disciplined days
  longestStreak: number;
  earnedBadgeIds: string[];
  dailyScores: DailyDisciplineScore[];
}

// Trigger journal types
export type TriggerSource =
  | 'crypto-twitter'
  | 'news-article'
  | 'price-alert'
  | 'friend-tip'
  | 'youtube-video'
  | 'telegram-group'
  | 'portfolio-check'
  | 'market-crash'
  | 'market-pump'
  | 'personal-stress'
  | 'boredom'
  | 'other';

export interface TriggerEntry {
  id: string;
  timestamp: string;
  source: TriggerSource;
  description: string;
  emotionalImpact: EmotionState;
  intensityBefore: number;
  intensityAfter: number;
  didTrade: boolean;
  tradeId?: string; // linked trade if they traded after trigger
  outcome?: 'win' | 'loss' | 'open' | null;
  createdAt: string;
}

// Daily reflection types
export interface DailyReflection {
  id: string;
  date: string; // YYYY-MM-DD
  tradedMyPlan: boolean;
  explanation: string;
  emotionalMistakes: string;
  biggestLesson: string;
  tomorrowGoal: string;
  overallRating: number; // 1-10
  createdAt: string;
}

export interface WeeklyReview {
  id: string;
  weekStart: string; // YYYY-MM-DD (Monday)
  emotionalMistakes: string;
  patternsNoticed: string;
  improvementPlan: string;
  disciplineGrade: DisciplineGrade;
  createdAt: string;
}

// Accountability types
export interface RuleBreakLog {
  id: string;
  tradeId: string;
  ruleName: string;
  explanation: string; // min 200 chars
  timestamp: string;
}

export interface MonthlyGoal {
  id: string;
  month: string; // 'yyyy-MM'
  pnlTarget: number | null;       // $ profit target
  winRateTarget: number | null;   // % win rate target
  maxMonthlyLoss: number | null;  // $ max loss allowed (positive number)
  tradeCountTarget: number | null; // target trade count
  createdAt: string;
}

export type TabId =
  | 'dashboard'
  | 'playbook'
  | 'checklist'
  | 'trades'
  | 'analytics'
  | 'verdicts'
  | 'psychology'
  | 'goals'
  | 'whatif'
  | 'reports'
  | 'news';

// ─── Admin back-office types ──────────────────────────────────────────
export type AdminTabId = 'dashboard' | 'users' | 'revenue' | 'settings';

export interface AdminSetting {
  key: string;
  value: string;
  updatedAt: string;
  updatedBy: string;
}

export interface SubscriptionPlan {
  planId: string;
  name: string;
  priceMonthly: number;
  priceYearly: number;
  stripePriceIdMonthly?: string;
  stripePriceIdYearly?: string;
  stripeProductId?: string;
  features: string[];
  isActive: boolean;
  sortOrder: number;
}

export type SubscriptionStatus =
  | 'active' | 'trialing' | 'past_due' | 'canceled' | 'unpaid' | 'incomplete' | 'free';

export interface UserSubscription {
  userId: string;
  stripeCustomerId: string;
  stripeSubscriptionId?: string;
  planId: string;
  status: SubscriptionStatus;
  interval?: 'month' | 'year';
  currentPeriodEnd?: string;
  cancelAtPeriodEnd?: boolean;
  createdAt: string;
  updatedAt: string;
}
