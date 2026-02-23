import {
  Trade,
  EmotionState,
  CircuitBreakerEvent,
  DisciplineGrade,
  DisciplineBadge,
  DailyDisciplineScore,
  DisciplineState,
  TriggerEntry,
} from './types';

// Emotions considered "calm/disciplined" for scoring
const CALM_EMOTIONS: EmotionState[] = ['Calm', 'Confident', 'Neutral'];

// All badge definitions
export const DISCIPLINE_BADGES: DisciplineBadge[] = [
  {
    id: 'ice-cold-trader',
    name: 'Ice Cold Trader',
    description: 'Completed 20 trades in a calm emotional state',
    emoji: '🧊',
    requirement: '20 calm trades',
    requiredCount: 20,
    category: 'calm',
  },
  {
    id: 'zen-master',
    name: 'Zen Master',
    description: 'Completed 50 trades in a calm emotional state',
    emoji: '🧘',
    requirement: '50 calm trades',
    requiredCount: 50,
    category: 'calm',
  },
  {
    id: 'rule-follower',
    name: 'Rule Follower',
    description: 'Followed your rules on 50 consecutive trades',
    emoji: '📏',
    requirement: '50 rule-following trades',
    requiredCount: 50,
    category: 'rules',
  },
  {
    id: 'rule-master',
    name: 'Rule Master',
    description: 'Followed your rules on 100 trades total',
    emoji: '👨‍⚖️',
    requirement: '100 rule-following trades',
    requiredCount: 100,
    category: 'rules',
  },
  {
    id: 'risk-manager',
    name: 'Risk Manager',
    description: 'Respected 10 circuit breakers without overriding',
    emoji: '🛡️',
    requirement: '10 breakers respected',
    requiredCount: 10,
    category: 'risk',
  },
  {
    id: 'iron-will',
    name: 'Iron Will',
    description: 'Respected 25 circuit breakers without overriding',
    emoji: '⚔️',
    requirement: '25 breakers respected',
    requiredCount: 25,
    category: 'risk',
  },
  {
    id: 'patient-trader',
    name: 'Patient Trader',
    description: '7-day discipline streak',
    emoji: '⏳',
    requirement: '7-day streak',
    requiredCount: 7,
    category: 'patience',
  },
  {
    id: 'marathon-trader',
    name: 'Marathon Trader',
    description: '30-day discipline streak',
    emoji: '🏆',
    requirement: '30-day streak',
    requiredCount: 30,
    category: 'streak',
  },
  {
    id: 'first-step',
    name: 'First Step',
    description: 'Completed your first emotionally disciplined trade',
    emoji: '👣',
    requirement: '1 calm trade',
    requiredCount: 1,
    category: 'calm',
  },
  {
    id: 'week-warrior',
    name: 'Week Warrior',
    description: '7 consecutive trades following rules',
    emoji: '🔥',
    requirement: '7 consecutive rule-following trades',
    requiredCount: 7,
    category: 'rules',
  },
];

// Trigger source labels
export const TRIGGER_SOURCE_OPTIONS: { value: string; label: string; emoji: string }[] = [
  { value: 'crypto-twitter', label: 'Crypto Twitter/X', emoji: '🐦' },
  { value: 'news-article', label: 'News Article', emoji: '📰' },
  { value: 'price-alert', label: 'Price Alert', emoji: '🔔' },
  { value: 'friend-tip', label: 'Friend/Tip', emoji: '👥' },
  { value: 'youtube-video', label: 'YouTube Video', emoji: '📺' },
  { value: 'telegram-group', label: 'Telegram/Discord', emoji: '💬' },
  { value: 'portfolio-check', label: 'Portfolio Check', emoji: '📊' },
  { value: 'market-crash', label: 'Market Crash', emoji: '📉' },
  { value: 'market-pump', label: 'Market Pump', emoji: '📈' },
  { value: 'personal-stress', label: 'Personal Stress', emoji: '😓' },
  { value: 'boredom', label: 'Boredom', emoji: '😴' },
  { value: 'other', label: 'Other', emoji: '❓' },
];

/**
 * Calculate discipline grade from component scores
 */
export function calculateDisciplineGrade(
  rulesFollowedPct: number,
  calmTradePct: number,
  breakerRespectPct: number
): DisciplineGrade {
  // Weighted average: rules 40%, calm 30%, breaker respect 30%
  const score = (rulesFollowedPct * 0.4) + (calmTradePct * 0.3) + (breakerRespectPct * 0.3);
  if (score >= 90) return 'A';
  if (score >= 75) return 'B';
  if (score >= 60) return 'C';
  if (score >= 40) return 'D';
  return 'F';
}

/**
 * Calculate daily discipline score from trades and breaker events
 */
export function calculateDailyScore(
  date: string,
  trades: Trade[],
  breakerEvents: CircuitBreakerEvent[]
): DailyDisciplineScore | null {
  const dayTrades = trades.filter(t => t.createdAt.startsWith(date));
  if (dayTrades.length === 0) return null;

  const rulesFollowed = dayTrades.filter(t => t.rulesFollowed === true).length;
  const rulesTotal = dayTrades.filter(t => t.rulesFollowed !== null).length;
  const calmTrades = dayTrades.filter(t => CALM_EMOTIONS.includes(t.emotion)).length;

  const dayBreakers = breakerEvents.filter(e => e.triggeredAt.startsWith(date));
  const breakersTriggered = dayBreakers.length;
  const breakersOverridden = dayBreakers.filter(e => e.overridden).length;
  const breakersRespected = breakersTriggered - breakersOverridden;

  const rulesFollowedPct = rulesTotal > 0 ? (rulesFollowed / rulesTotal) * 100 : 100;
  const calmPct = (calmTrades / dayTrades.length) * 100;
  const breakerPct = breakersTriggered > 0 ? (breakersRespected / breakersTriggered) * 100 : 100;

  const grade = calculateDisciplineGrade(rulesFollowedPct, calmPct, breakerPct);

  // Point calculation
  let points = 0;
  points += rulesFollowed * 10; // +10 per disciplined trade
  points += calmTrades * 5; // +5 per calm trade
  points += breakersRespected * 15; // +15 per respected breaker
  points -= breakersOverridden * 20; // -20 per override
  points -= (rulesTotal - rulesFollowed) * 20; // -20 per rule broken

  return {
    date,
    grade,
    points,
    rulesFollowed,
    rulesTotal,
    calmTrades,
    totalTrades: dayTrades.length,
    breakersRespected,
    breakersTriggered,
    breakersOverridden,
  };
}

/**
 * Calculate the full discipline state from all historical data
 */
export function calculateDisciplineState(
  trades: Trade[],
  breakerEvents: CircuitBreakerEvent[]
): DisciplineState {
  // Get unique dates with trades
  const dates = [...new Set(trades.map(t => t.createdAt.slice(0, 10)))].sort();
  const dailyScores: DailyDisciplineScore[] = [];

  for (const date of dates) {
    const score = calculateDailyScore(date, trades, breakerEvents);
    if (score) dailyScores.push(score);
  }

  // Calculate streaks (consecutive days with grade C or above)
  let currentStreak = 0;
  let longestStreak = 0;
  let tempStreak = 0;

  for (const score of dailyScores) {
    if (score.grade === 'A' || score.grade === 'B' || score.grade === 'C') {
      tempStreak++;
      if (tempStreak > longestStreak) longestStreak = tempStreak;
    } else {
      tempStreak = 0;
    }
  }
  // Current streak = trailing streak
  currentStreak = tempStreak;

  // Total points
  const totalPoints = dailyScores.reduce((sum, s) => sum + s.points, 0);

  // Calculate earned badges
  const earnedBadgeIds = calculateEarnedBadges(trades, breakerEvents, currentStreak, longestStreak);

  return {
    totalPoints: Math.max(0, totalPoints),
    currentStreak,
    longestStreak,
    earnedBadgeIds,
    dailyScores,
  };
}

/**
 * Determine which badges have been earned
 */
function calculateEarnedBadges(
  trades: Trade[],
  breakerEvents: CircuitBreakerEvent[],
  currentStreak: number,
  longestStreak: number
): string[] {
  const earned: string[] = [];
  const closedTrades = trades.filter(t => !t.isOpen);
  const calmTradeCount = closedTrades.filter(t => CALM_EMOTIONS.includes(t.emotion)).length;
  const rulesFollowedCount = closedTrades.filter(t => t.rulesFollowed === true).length;
  const breakersRespected = breakerEvents.filter(e => !e.overridden).length;
  const maxStreak = Math.max(currentStreak, longestStreak);

  // Consecutive rule-following
  let consecutiveRules = 0;
  let maxConsecutiveRules = 0;
  const sortedTrades = [...closedTrades].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  for (const t of sortedTrades) {
    if (t.rulesFollowed === true) {
      consecutiveRules++;
      if (consecutiveRules > maxConsecutiveRules) maxConsecutiveRules = consecutiveRules;
    } else if (t.rulesFollowed === false) {
      consecutiveRules = 0;
    }
  }

  // Check each badge
  if (calmTradeCount >= 1) earned.push('first-step');
  if (calmTradeCount >= 20) earned.push('ice-cold-trader');
  if (calmTradeCount >= 50) earned.push('zen-master');
  if (maxConsecutiveRules >= 7) earned.push('week-warrior');
  if (maxConsecutiveRules >= 50) earned.push('rule-follower');
  if (rulesFollowedCount >= 100) earned.push('rule-master');
  if (breakersRespected >= 10) earned.push('risk-manager');
  if (breakersRespected >= 25) earned.push('iron-will');
  if (maxStreak >= 7) earned.push('patient-trader');
  if (maxStreak >= 30) earned.push('marathon-trader');

  return earned;
}

/**
 * Get grade color class
 */
export function getGradeColor(grade: DisciplineGrade): string {
  switch (grade) {
    case 'A': return 'text-green-400 bg-green-500/10 border-green-500/30';
    case 'B': return 'text-blue-400 bg-blue-500/10 border-blue-500/30';
    case 'C': return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30';
    case 'D': return 'text-orange-400 bg-orange-500/10 border-orange-500/30';
    case 'F': return 'text-red-400 bg-red-500/10 border-red-500/30';
  }
}

/**
 * Get grade label
 */
export function getGradeLabel(grade: DisciplineGrade): string {
  switch (grade) {
    case 'A': return 'Excellent';
    case 'B': return 'Good';
    case 'C': return 'Average';
    case 'D': return 'Poor';
    case 'F': return 'Failing';
  }
}

/**
 * Analyze trigger patterns - correlate triggers with trade outcomes
 */
export function analyzeTriggerPatterns(
  triggers: TriggerEntry[]
): { source: string; count: number; tradedCount: number; winRate: number; avgIntensityChange: number }[] {
  const sourceMap = new Map<string, { count: number; traded: number; wins: number; intensityChanges: number[] }>();

  for (const trigger of triggers) {
    const cur = sourceMap.get(trigger.source) || { count: 0, traded: 0, wins: 0, intensityChanges: [] };
    cur.count++;
    cur.intensityChanges.push(trigger.intensityAfter - trigger.intensityBefore);
    if (trigger.didTrade) {
      cur.traded++;
      if (trigger.outcome === 'win') cur.wins++;
    }
    sourceMap.set(trigger.source, cur);
  }

  return Array.from(sourceMap.entries())
    .map(([source, data]) => ({
      source,
      count: data.count,
      tradedCount: data.traded,
      winRate: data.traded > 0 ? Math.round((data.wins / data.traded) * 100) : 0,
      avgIntensityChange: data.intensityChanges.length > 0
        ? Math.round((data.intensityChanges.reduce((a, b) => a + b, 0) / data.intensityChanges.length) * 10) / 10
        : 0,
    }))
    .sort((a, b) => b.count - a.count);
}

/**
 * Get the visual risk level for a given emotion state
 * Returns 'danger' | 'caution' | 'safe'
 */
export function getEmotionRiskLevel(emotion: EmotionState): 'danger' | 'caution' | 'safe' {
  const safe: EmotionState[] = ['Calm', 'Confident', 'Neutral'];
  const caution: EmotionState[] = ['Excited', 'Impatient'];
  if (safe.includes(emotion)) return 'safe';
  if (caution.includes(emotion)) return 'caution';
  return 'danger';
}

/**
 * Get visual feedback config based on emotion and intensity
 */
export function getVisualFeedback(
  emotion: EmotionState,
  intensity: number,
  hasActiveBreakers: boolean
): {
  borderClass: string;
  bgClass: string;
  pulseClass: string;
  level: 'safe' | 'caution' | 'danger' | 'critical';
} {
  const risk = getEmotionRiskLevel(emotion);

  if (hasActiveBreakers || (risk === 'danger' && intensity >= 8)) {
    return {
      borderClass: 'border-red-500 animate-pulse',
      bgClass: 'bg-red-500/5',
      pulseClass: 'shadow-[0_0_30px_rgba(239,68,68,0.3)]',
      level: 'critical',
    };
  }
  if (risk === 'danger') {
    return {
      borderClass: 'border-red-500/60',
      bgClass: 'bg-red-500/5',
      pulseClass: '',
      level: 'danger',
    };
  }
  if (risk === 'caution' || intensity >= 7) {
    return {
      borderClass: 'border-yellow-500/60',
      bgClass: 'bg-yellow-500/5',
      pulseClass: '',
      level: 'caution',
    };
  }
  return {
    borderClass: 'border-green-500/40',
    bgClass: 'bg-green-500/5',
    pulseClass: '',
    level: 'safe',
  };
}
