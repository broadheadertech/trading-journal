'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  AreaChart, Area, PieChart, Pie, Cell,
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  ResponsiveContainer, Tooltip,
} from 'recharts';
import { Trade, Strategy, DailyReflection, TriggerEntry, EmotionState } from '@/lib/types';
import { useCurrency } from '@/hooks/useCurrency';
import {
  getTotalPnL, getWinRate, getCurrentStreak, formatPercent,
  getVerdictColor, getEquityCurveData, getVerdictDistribution, getWinRateDelta,
  getGoodDecisionRate, generateDashboardInsights, getCalendarData,
  getDisciplineScore, getCoolingOffPairs, isLuckyWin, getRMultiple, getEmotionalRuleMap,
  getDurationStats, getDrawdownStats,
  getDisciplineStreak, getWeeklyRuleReport, getWeeklyFocusInsight, getWarmOpeningMessage,
  getMultiDayBreaches, getEmotionRuleBreakInsight, getLuckyVsDisciplineStreak,
  getCoinWinRateInsights, getProcessReinforcementBadge, findRelevantReflection,
  getTodayFrequencySpike, getRestDayInsight, getFullMilestoneState,
} from '@/lib/utils';
import {
  Target, Flame, BarChart3, Plus, BookOpen, Trophy, Eye, EyeOff,
  ChevronDown, ChevronUp, ChevronLeft, ChevronRight, ShieldX, CheckCircle, TrendingUp,
} from 'lucide-react';
import { format } from 'date-fns';
import UsageCard from './UsageCard';
import BrainMascot from './BrainMascot';
import { useUsage } from '@/hooks/useUsage';

interface DashboardProps {
  trades: Trade[];
  strategies: Strategy[];
  reflections: DailyReflection[];
  triggers: TriggerEntry[];
  onAddTrade: () => void;
  onNavigate: (tab: string) => void;
  updateTrade?: (id: string, updates: Partial<Trade>) => void;
  initialCapital?: number;
  onSetCapital?: (amount: number) => void;
  dailyLossLimit?: number;
  dailyProfitTarget?: number;
  goalMode?: 'daily' | 'session';
  onSetDailyGoal?: (args: { dailyLossLimit?: number; dailyProfitTarget?: number; goalMode?: 'daily' | 'session' }) => void;
}

type MoodState = 'calm' | 'neutral' | 'unsettled';
type StatsWindow = '7d' | '30d' | '90d' | 'all';

export default function Dashboard({ trades, strategies, reflections, triggers, onAddTrade, onNavigate, updateTrade, initialCapital = 0, onSetCapital, dailyLossLimit, dailyProfitTarget, goalMode = 'daily', onSetDailyGoal }: DashboardProps) {
  const { formatCurrency, currency } = useCurrency();
  const usage = useUsage();
  const [showAllStats, setShowAllStats] = useState(false);
  const [mood, setMood] = useState<MoodState | null>(null);
  const [moodChecked, setMoodChecked] = useState(false);
  const [insightIndex, setInsightIndex] = useState(0);
  const [warningDismissed, setWarningDismissed] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [statsWindow, setStatsWindow] = useState<StatsWindow>('all');
  const [focusIntention, setFocusIntention] = useState('');
  const [lossHypothesisInput, setLossHypothesisInput] = useState('');
  const [editingCapital, setEditingCapital] = useState(false);
  const [capitalInput, setCapitalInput] = useState('');
  const [editingDailyGoal, setEditingDailyGoal] = useState(false);
  const [dailyLossInput, setDailyLossInput] = useState('');
  const [dailyProfitInput, setDailyProfitInput] = useState('');
  const [subTab, setSubTab] = useState<'overview' | 'insights' | 'patterns' | 'history'>('overview');

  const drawdownStats = useMemo(
    () => getDrawdownStats(trades, initialCapital),
    [trades, initialCapital]
  );

  // Load mood and warning state from sessionStorage after mount (avoids SSR mismatch)
  useEffect(() => {
    const stored = sessionStorage.getItem('dashboard-mood');
    if (stored === 'calm' || stored === 'neutral' || stored === 'unsettled') {
      setMood(stored as MoodState);
    }
    setWarningDismissed(!!sessionStorage.getItem('pattern-warning-dismissed'));
    setMoodChecked(true);
  }, []);

  const handleMoodSelect = (selected: MoodState) => {
    sessionStorage.setItem('dashboard-mood', selected);
    setMood(selected);
  };

  const handleMoodReset = () => {
    sessionStorage.removeItem('dashboard-mood');
    setMood(null);
  };

  const handleDismissWarning = () => {
    sessionStorage.setItem('pattern-warning-dismissed', '1');
    setWarningDismissed(true);
  };

  useEffect(() => {
    const stored = localStorage.getItem('weekly-focus-intention');
    if (stored) setFocusIntention(stored);
  }, []);

  const handleIntentionChange = (val: string) => {
    setFocusIntention(val);
    localStorage.setItem('weekly-focus-intention', val);
  };

  // All computed values in a single memo
  const {
    equityCurveData,
    verdictData,
    winRateDelta,
    insights,
    totalPnL,
    streak,
    closedTrades,
    tradesThisMonth,
    reflectionStreak,
    patternWarning,
    peakTrade,
    windowedWinRate,
    windowedGoodDecisionRate,
    windowedAssessedCount,
    windowedCount,
    calendarGrid,
    emotionStats,
    coinStats,
    timeStats,
    bestTimeBucket,
    improvementData,
    monthlyScorecard,
    personalBest,
    strengthSpotlight,
    processScore,
    milestone,
    dailyLossGuard,
    dailyProfitGuard,
    riskConsistency,
    lossLimitBreaches,
    spiralWarning,
    disciplineScore,
    coolingOffPairs,
    emotionalRuleMap,
  } = useMemo(() => {
    const closed = trades.filter(t => !t.isOpen);

    // Rolling window filtered set
    const windowedClosed = (() => {
      if (statsWindow === 'all') return closed;
      const days = statsWindow === '7d' ? 7 : statsWindow === '30d' ? 30 : 90;
      const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
      return closed.filter(t => t.exitDate && new Date(t.exitDate).getTime() >= cutoff);
    })();

    // Calendar heatmap grid (last 16 weeks)
    const calMap = getCalendarData(trades);
    const today = new Date();
    const dayOfWeek = today.getDay();
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - dayOfWeek - 15 * 7);
    const endDate = new Date(today);
    endDate.setDate(today.getDate() + (6 - dayOfWeek));
    const allDays: string[] = [];
    const cursor = new Date(startDate);
    while (cursor <= endDate) {
      allDays.push(format(cursor, 'yyyy-MM-dd'));
      cursor.setDate(cursor.getDate() + 1);
    }
    const calValues = Array.from(calMap.values()).map(v => Math.abs(v));
    const calMaxAbs = calValues.length > 0 ? Math.max(...calValues) : 1;
    const todayStr = format(today, 'yyyy-MM-dd');
    const calWeeks: { days: string[]; monthLabel: string }[] = [];
    for (let w = 0; w < allDays.length; w += 7) {
      const weekDays = allDays.slice(w, w + 7);
      const firstDay = new Date(weekDays[0]);
      const monthLabel = firstDay.getDate() <= 7 ? format(firstDay, 'MMM') : '';
      calWeeks.push({ days: weekDays, monthLabel });
    }
    const allCalValues = Array.from(calMap.values());
    const calActiveDays = calMap.size;
    const calBestDay = allCalValues.length > 0 ? Math.max(...allCalValues) : null;
    const calWorstDay = allCalValues.length > 0 ? Math.min(...allCalValues) : null;
    const thisMonthPfx = format(today, 'yyyy-MM');
    const thisMonthEntries = Array.from(calMap.entries()).filter(([k]) => k.startsWith(thisMonthPfx));
    const calThisMonth = thisMonthEntries.length > 0
      ? thisMonthEntries.reduce((sum, [, v]) => sum + v, 0)
      : null;
    const calStartLabel = format(new Date(allDays[0]), 'MMM');
    const calEndLabel = format(today, 'MMM yyyy');
    const calDateRange = calStartLabel === format(today, 'MMM') ? calEndLabel : `${calStartLabel} – ${calEndLabel}`;

    // Emotion vs. P&L correlation
    const emotionStatsMap = new Map<string, { sum: number; count: number }>();
    closed.forEach(t => {
      if (!t.emotion || t.actualPnLPercent === null) return;
      const prev = emotionStatsMap.get(t.emotion) ?? { sum: 0, count: 0 };
      emotionStatsMap.set(t.emotion, { sum: prev.sum + (t.actualPnLPercent ?? 0), count: prev.count + 1 });
    });
    const emotionStats = Array.from(emotionStatsMap.entries())
      .filter(([, v]) => v.count >= 2)
      .map(([emotion, v]) => ({ emotion, avg: Math.round((v.sum / v.count) * 10) / 10, count: v.count }))
      .sort((a, b) => b.avg - a.avg);

    // Coin performance matrix
    const coinStatsMap = new Map<string, { wins: number; total: number }>();
    closed.forEach(t => {
      if (t.actualPnLPercent === null) return;
      const prev = coinStatsMap.get(t.coin) ?? { wins: 0, total: 0 };
      coinStatsMap.set(t.coin, {
        wins: prev.wins + ((t.actualPnLPercent ?? 0) > 0 ? 1 : 0),
        total: prev.total + 1,
      });
    });
    const coinStats = Array.from(coinStatsMap.entries())
      .filter(([, v]) => v.total >= 2)
      .map(([coin, v]) => ({
        coin: coin.replace('/USDT', ''),
        winRate: Math.round((v.wins / v.total) * 100),
        total: v.total,
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 6);

    // Time of day performance
    const timeBucketMap = new Map<string, { wins: number; total: number }>();
    closed.forEach(t => {
      if (!t.exitDate || t.actualPnLPercent === null) return;
      const h = new Date(t.exitDate).getHours();
      const bucket = h < 12 ? 'Morning' : h < 17 ? 'Afternoon' : 'Evening';
      const prev = timeBucketMap.get(bucket) ?? { wins: 0, total: 0 };
      timeBucketMap.set(bucket, {
        wins: prev.wins + ((t.actualPnLPercent ?? 0) > 0 ? 1 : 0),
        total: prev.total + 1,
      });
    });
    const timeStats = ['Morning', 'Afternoon', 'Evening'].map(bucket => {
      const v = timeBucketMap.get(bucket) ?? { wins: 0, total: 0 };
      return { bucket, winRate: v.total >= 2 ? Math.round((v.wins / v.total) * 100) : null, total: v.total };
    });
    const bestTimeBucket = [...timeStats]
      .filter(t => t.winRate !== null)
      .sort((a, b) => (b.winRate ?? 0) - (a.winRate ?? 0))[0]?.bucket ?? null;

    // You're Getting Better
    const sortedForImprovement = [...closed]
      .filter(t => t.actualPnLPercent !== null && t.exitDate)
      .sort((a, b) => new Date(a.exitDate!).getTime() - new Date(b.exitDate!).getTime());
    const improvementData = (() => {
      if (sortedForImprovement.length < 10) return null;
      const half = Math.floor(sortedForImprovement.length / 2);
      const early = sortedForImprovement.slice(0, half);
      const recent = sortedForImprovement.slice(-half);
      const calcWR = (pool: typeof sortedForImprovement) =>
        Math.round((pool.filter(t => (t.actualPnLPercent ?? 0) > 0).length / pool.length) * 100);
      const calcGD = (pool: typeof sortedForImprovement) => {
        const assessed = pool.filter(t => t.verdict != null);
        if (assessed.length === 0) return null;
        return Math.round(
          (assessed.filter(t => t.verdict === 'Well Executed' || t.verdict === 'Good Discipline, Bad Luck').length / assessed.length) * 100
        );
      };
      return {
        earlyWinRate: calcWR(early),
        recentWinRate: calcWR(recent),
        earlyGoodDecision: calcGD(early),
        recentGoodDecision: calcGD(recent),
        halfSize: half,
      };
    })();

    // Monthly scorecard + personal best (shared grouping loop)
    const monthlyGroups = new Map<string, {
      pnl: number; wins: number; losses: number; disciplinedCount: number; assessedCount: number; total: number;
    }>();
    closed.forEach(t => {
      if (!t.exitDate || t.actualPnLPercent === null) return;
      const month = format(new Date(t.exitDate), 'yyyy-MM');
      const prev = monthlyGroups.get(month) ?? { pnl: 0, wins: 0, losses: 0, disciplinedCount: 0, assessedCount: 0, total: 0 };
      const isWin = (t.actualPnLPercent ?? 0) > 0;
      const isDisciplined = t.verdict === 'Well Executed' || t.verdict === 'Good Discipline, Bad Luck';
      monthlyGroups.set(month, {
        pnl: prev.pnl + (t.actualPnL ?? 0),
        wins: prev.wins + (isWin ? 1 : 0),
        losses: prev.losses + (!isWin ? 1 : 0),
        disciplinedCount: prev.disciplinedCount + (t.verdict !== null && isDisciplined ? 1 : 0),
        assessedCount: prev.assessedCount + (t.verdict !== null ? 1 : 0),
        total: prev.total + 1,
      });
    });
    const monthlyScorecard = Array.from(monthlyGroups.entries())
      .map(([monthKey, v]) => ({
        month: format(new Date(monthKey + '-01'), 'MMM yyyy'),
        monthKey,
        trades: v.total,
        pnl: Math.round(v.pnl * 100) / 100,
        wins: v.wins,
        losses: v.losses,
        discipline: v.assessedCount > 0 ? Math.round((v.disciplinedCount / v.assessedCount) * 100) : null,
      }))
      .sort((a, b) => b.monthKey.localeCompare(a.monthKey))
      .slice(0, 6);
    const personalBest = (() => {
      const peak = Array.from(monthlyGroups.entries())
        .filter(([, v]) => v.total >= 5)
        .map(([monthKey, v]) => ({ monthKey, winRate: Math.round((v.wins / v.total) * 100) }))
        .sort((a, b) => b.winRate - a.winRate)[0];
      return peak
        ? { winRate: peak.winRate, month: format(new Date(peak.monthKey + '-01'), 'MMM yyyy') }
        : null;
    })();

    // Strength Spotlight — single strongest edge
    const strengthSpotlight = (() => {
      const bestCoin = coinStats.filter(c => c.total >= 3).sort((a, b) => b.winRate - a.winRate)[0];
      const bestEmotion = emotionStats.filter(e => e.count >= 3 && e.avg > 0)[0];
      if (!bestCoin && !bestEmotion) return null;
      if (bestCoin && bestCoin.winRate >= 55 && (!bestEmotion || bestCoin.total >= bestEmotion.count)) {
        return { type: 'coin' as const, label: bestCoin.coin, metric: `${bestCoin.winRate}% win rate`, detail: `${bestCoin.total} trades` };
      }
      if (bestEmotion) {
        return { type: 'emotion' as const, label: bestEmotion.emotion, metric: `+${bestEmotion.avg}% avg`, detail: `${bestEmotion.count} trades` };
      }
      return null;
    })();

    // Process Score (rule checklist adherence)
    const processScore = (() => {
      const withChecklist = closed.filter(t => t.ruleChecklist && t.ruleChecklist.length > 0);
      if (withChecklist.length < 3) return null;
      const total = withChecklist.reduce((sum, t) => sum + t.ruleChecklist.length, 0);
      const followed = withChecklist.reduce((sum, t) => sum + t.ruleChecklist.filter(r => r.compliance !== 'no').length, 0);
      return total > 0 ? { score: Math.round((followed / total) * 100), tradeCount: withChecklist.length } : null;
    })();

    // Discipline Score (C-42): yes=1, partial=0.5, no=0
    const disciplineScore = getDisciplineScore(closed);

    // Cooling-off pairs (A-11): trades entered within 60min of a loss
    const coolingOffPairsList = getCoolingOffPairs(closed);

    // Duration outliers (A-13): trades significantly shorter/longer than strategy avg
    const { outliers: durationOutliersList } = getDurationStats(closed);

    // Emotional Rule Map (C-24)
    const emotionalRuleMap = getEmotionalRuleMap(closed);

    // Milestone
    const milestone = [500, 200, 100, 50, 25].find(m => trades.length >= m) ?? null;

    // Daily Loss Guard — prefer user profile limit, fall back to strategy's maxDailyLoss
    const stratDailyLossLimit = strategies.length > 0 ? (strategies[0].riskParams.maxDailyLoss ?? null) : null;
    const effectiveLossLimit = dailyLossLimit ?? stratDailyLossLimit;
    const todayPnL = closed
      .filter(t => t.exitDate && format(new Date(t.exitDate), 'yyyy-MM-dd') === todayStr)
      .reduce((sum, t) => sum + (t.actualPnL ?? 0), 0);
    const dailyLossGuard = (() => {
      if (!effectiveLossLimit || effectiveLossLimit <= 0 || todayPnL >= 0) return null;
      const pct = Math.abs(todayPnL) / effectiveLossLimit;
      if (pct < 0.25) return null;
      return { todayPnL, limit: effectiveLossLimit, pct: Math.min(pct, 1), hit: pct >= 1 };
    })();
    const dailyProfitGuard = (() => {
      if (!dailyProfitTarget || dailyProfitTarget <= 0 || todayPnL <= 0) return null;
      const pct = todayPnL / dailyProfitTarget;
      if (pct < 0.75) return null;
      return { todayPnL, target: dailyProfitTarget, pct: Math.min(pct, 1), hit: pct >= 1 };
    })();

    // Risk Consistency Score (capital allocation coefficient of variation)
    const riskConsistency = (() => {
      const recent = closed.filter(t => t.capital > 0).slice(-30);
      if (recent.length < 5) return null;
      const capitals = recent.map(t => t.capital);
      const mean = capitals.reduce((s, v) => s + v, 0) / capitals.length;
      if (mean === 0) return null;
      const stdDev = Math.sqrt(capitals.reduce((s, v) => s + (v - mean) ** 2, 0) / capitals.length);
      const cv = (stdDev / mean) * 100;
      const label: 'Consistent' | 'Variable' | 'Erratic' = cv < 20 ? 'Consistent' : cv < 50 ? 'Variable' : 'Erratic';
      const colorKey: 'gain' | 'yellow' | 'loss' = cv < 20 ? 'gain' : cv < 50 ? 'yellow' : 'loss';
      return { cv: Math.round(cv), label, colorKey, sampleSize: recent.length };
    })();

    // Loss Limit Breach count (per-trade vs. strategy's maxLossPercent)
    const lossLimitBreaches = (() => {
      const maxLossPct = strategies.length > 0 ? (strategies[0].riskParams.maxLossPercent ?? null) : null;
      if (!maxLossPct || maxLossPct <= 0) return null;
      const recent = closed.filter(t => t.actualPnLPercent !== null).slice(-20);
      if (recent.length < 3) return null;
      const count = recent.filter(t => (t.actualPnLPercent ?? 0) < -maxLossPct).length;
      return { count, total: recent.length, limit: maxLossPct };
    })();

    // Warning signals — compound spiral detection
    const { patternWarning, spiralWarning } = (() => {
      const msWeek = 7 * 24 * 60 * 60 * 1000;
      const now = Date.now();
      const activeSignals: string[] = [];

      const sortedClosed = closed
        .filter(t => t.actualPnLPercent !== null && t.exitDate)
        .sort((a, b) => new Date(b.exitDate!).getTime() - new Date(a.exitDate!).getTime());
      let lossStreak = 0;
      for (const t of sortedClosed) {
        if ((t.actualPnLPercent ?? 0) < 0) lossStreak++;
        else break;
      }

      const thisWeekCount = trades.filter(t => new Date(t.createdAt).getTime() >= now - msWeek).length;
      const past4weeksCount = trades.filter(t => {
        const age = now - new Date(t.createdAt).getTime();
        return age >= msWeek && age < 5 * msWeek;
      }).length;
      const avgWeekly = past4weeksCount / 4;
      const isOvertrading = trades.length >= 20 && avgWeekly >= 2 && thisWeekCount > avgWeekly * 1.5;

      const emotionalStates: EmotionState[] = ['FOMO', 'Greedy', 'Revenge Trading', 'Anxious', 'Fearful'];
      const recentEmotional = triggers.filter(t =>
        new Date(t.timestamp).getTime() >= now - msWeek && emotionalStates.includes(t.emotionalImpact) && t.didTrade
      );

      if (lossStreak >= 3) activeSignals.push(`${lossStreak} losses in a row`);
      if (isOvertrading) activeSignals.push(`${thisWeekCount} trades this week (avg ~${Math.round(avgWeekly)}/wk)`);
      if (recentEmotional.length >= 3) activeSignals.push(`${recentEmotional.length} emotional trigger trades`);

      if (activeSignals.length >= 2) {
        return {
          patternWarning: null,
          spiralWarning: `Compound risk: ${activeSignals.slice(0, 2).join(' + ')} — step back and reassess before your next trade.`,
        };
      }
      if (lossStreak >= 3) return { patternWarning: `${lossStreak} losses in a row — consider taking a break before your next trade.`, spiralWarning: null };
      if (isOvertrading) return { patternWarning: `${thisWeekCount} trades this week — above your usual pace of ~${Math.round(avgWeekly)}/week.`, spiralWarning: null };
      if (recentEmotional.length >= 3) return { patternWarning: `${recentEmotional.length} emotional trades this week — your historical win rate is lower after ${recentEmotional[0].emotionalImpact} triggers.`, spiralWarning: null };
      if (coolingOffPairsList.length > 0) return { patternWarning: `${coolingOffPairsList.length} trade(s) entered within 1 hour of a loss — your win rate drops in this pattern.`, spiralWarning: null };
      const recentDurOutliers = durationOutliersList.filter(o => new Date(o.trade.exitDate!).getTime() > now - msWeek);
      if (recentDurOutliers.length >= 2) {
        const cutCount = recentDurOutliers.filter(o => o.type === 'cut-short').length;
        const heldCount = recentDurOutliers.filter(o => o.type === 'held-long').length;
        const msg = cutCount >= heldCount
          ? `${recentDurOutliers.length} recent trades closed faster than your usual pace — possible fear-exit pattern.`
          : `${recentDurOutliers.length} recent trades held longer than your usual pace — possible hope-hold pattern.`;
        return { patternWarning: msg, spiralWarning: null };
      }
      return { patternWarning: null, spiralWarning: null };
    })();

    return {
      equityCurveData: getEquityCurveData(trades),
      verdictData: getVerdictDistribution(trades),
      winRateDelta: getWinRateDelta(trades),
      insights: generateDashboardInsights(trades),
      totalPnL: getTotalPnL(trades),
      streak: getCurrentStreak(trades),
      closedTrades: closed,
      tradesThisMonth: trades.filter(t => {
        const ms30 = 30 * 24 * 60 * 60 * 1000;
        return new Date(t.createdAt).getTime() >= Date.now() - ms30;
      }).length,
      reflectionStreak: (() => {
        if (reflections.length === 0) return 0;
        const dates = new Set(reflections.map(r => r.date));
        let reflStreak = 0;
        const d = new Date();
        if (!dates.has(format(d, 'yyyy-MM-dd'))) d.setDate(d.getDate() - 1);
        while (dates.has(format(d, 'yyyy-MM-dd'))) {
          reflStreak++;
          d.setDate(d.getDate() - 1);
        }
        return reflStreak;
      })(),
      patternWarning,
      spiralWarning,
      peakTrade: (() => {
        const eligible = closed.filter(t => t.actualPnLPercent !== null && t.exitDate);
        if (eligible.length === 0) return null;
        return [...eligible].sort((a, b) => (b.actualPnLPercent ?? 0) - (a.actualPnLPercent ?? 0))[0];
      })(),
      windowedWinRate: getWinRate(windowedClosed),
      windowedGoodDecisionRate: getGoodDecisionRate(windowedClosed),
      windowedAssessedCount: windowedClosed.filter(t => t.verdict != null).length,
      windowedCount: windowedClosed.length,
      calendarGrid: {
        weeks: calWeeks,
        maxAbs: calMaxAbs,
        todayStr,
        calMap,
        activeDays: calActiveDays,
        bestDay: calBestDay,
        worstDay: calWorstDay,
        thisMonth: calThisMonth,
        dateRange: calDateRange,
      },
      emotionStats,
      coinStats,
      timeStats,
      bestTimeBucket,
      improvementData,
      monthlyScorecard,
      personalBest,
      strengthSpotlight,
      processScore,
      milestone,
      dailyLossGuard,
      riskConsistency,
      lossLimitBreaches,
      disciplineScore,
      coolingOffPairs: coolingOffPairsList,
      emotionalRuleMap,
      dailyProfitGuard,
    };
  }, [trades, reflections, triggers, statsWindow, strategies, dailyLossLimit, dailyProfitTarget]);

  // Edge degradation: declining strategy win rate across 3 equal-sized thirds
  const strategyDegradation = useMemo(() => {
    const activeStrat = strategies.length > 0 ? strategies[0] : null;
    if (!activeStrat) return null;
    const stratTrades = trades
      .filter(t => !t.isOpen && t.actualPnLPercent !== null && t.strategy === activeStrat.name && t.exitDate)
      .sort((a, b) => new Date(a.exitDate!).getTime() - new Date(b.exitDate!).getTime());
    if (stratTrades.length < 9) return null;
    const n = Math.floor(stratTrades.length / 3);
    const winRate = (pool: typeof stratTrades) => {
      const wins = pool.filter(t => (t.actualPnLPercent ?? 0) > 0).length;
      return Math.round((wins / pool.length) * 100);
    };
    const r1 = winRate(stratTrades.slice(0, n));
    const r2 = winRate(stratTrades.slice(n, 2 * n));
    const r3 = winRate(stratTrades.slice(2 * n));
    if (r1 > r2 && r2 > r3 && r1 - r3 >= 10) {
      return { r1, r2, r3 };
    }
    return null;
  }, [trades, strategies]);

  // Last closed loss without a hypothesis — for the Loss Hypothesis prompt (A-15)
  const lastLoss = useMemo(() => {
    const losses = closedTrades
      .filter(t => (t.actualPnLPercent ?? 0) < 0 && !t.lossHypothesis)
      .sort((a, b) => new Date(b.exitDate ?? b.createdAt).getTime() - new Date(a.exitDate ?? a.createdAt).getTime());
    return losses[0] ?? null;
  }, [closedTrades]);

  // AI Coach — computed from trade history only
  const disciplineStreak = useMemo(() => getDisciplineStreak(trades), [trades]);
  const weeklyFocus = useMemo(() => getWeeklyFocusInsight(trades), [trades]);
  const warmOpening = useMemo(() => getWarmOpeningMessage(trades), [trades]);
  const weeklyRuleReport = useMemo(() => getWeeklyRuleReport(trades), [trades]);
  const multiDayBreaches = useMemo(
    () => (dailyLossLimit ? getMultiDayBreaches(trades, dailyLossLimit) : null),
    [trades, dailyLossLimit]
  );
  const emotionRuleInsight = useMemo(() => getEmotionRuleBreakInsight(trades), [trades]);
  const luckyDisciplineStreak = useMemo(() => getLuckyVsDisciplineStreak(trades), [trades]);
  const coinWinRateInsights = useMemo(() => getCoinWinRateInsights(trades), [trades]);
  const processReinforcement = useMemo(() => getProcessReinforcementBadge(trades), [trades]);
  const coachingMemory = useMemo(
    () => findRelevantReflection(trades, [], reflections),
    [trades, reflections]
  );
  const todayFrequencySpike = useMemo(() => getTodayFrequencySpike(trades), [trades]);
  const restDayInsight = useMemo(() => getRestDayInsight(trades), [trades]);
  const milestoneState = useMemo(() => getFullMilestoneState(trades), [trades]);

  // Seed insight index from day of month so it changes daily
  useEffect(() => {
    if (insights.length > 0) {
      setInsightIndex(new Date().getDate() % insights.length);
    }
  }, [insights.length]);

  const safeInsightIndex = insights.length > 0 ? insightIndex % insights.length : 0;
  const activeStrategy = strategies.length > 0 ? strategies[0] : null;
  const recentTrades = trades.slice(0, 5);

  // Displayed win rate depending on selected window
  const displayedWinRate = statsWindow === 'all' ? winRateDelta.current : windowedWinRate;
  const displayedGoodDecision = windowedGoodDecisionRate;
  const displayedAssessedCount = windowedAssessedCount;

  return (
    <div className="space-y-4 sm:space-y-6">

      {/* ── Mood Gate ── */}
      {moodChecked && !mood && (
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 sm:p-5 animate-in">
          <p className="text-sm font-medium text-[var(--foreground)] mb-3">
            How are you feeling right now?
          </p>
          <div className="flex gap-2">
            {([
              { key: 'calm', label: 'Calm', emoji: '😌' },
              { key: 'neutral', label: 'Neutral', emoji: '😐' },
              { key: 'unsettled', label: 'Unsettled', emoji: '😟' },
            ] as { key: MoodState; label: string; emoji: string }[]).map(({ key, label, emoji }) => (
              <button
                key={key}
                onClick={() => handleMoodSelect(key)}
                className="flex-1 flex flex-col items-center gap-1.5 py-3 rounded-xl border border-[var(--border)] hover:border-[var(--accent)]/40 hover:bg-[var(--card-hover)] transition-all text-sm cursor-pointer"
              >
                <span className="text-xl">{emoji}</span>
                <span className="text-[var(--muted-foreground)] text-xs">{label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Sub-tabs */}
      <div className="flex gap-1.5 flex-wrap">
        {([
          { id: 'overview', label: 'Overview' },
          { id: 'insights', label: 'Insights' },
          { id: 'patterns', label: 'Patterns' },
          { id: 'history', label: 'History' },
        ] as const).map(tab => (
          <button
            key={tab.id}
            onClick={() => setSubTab(tab.id)}
            className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${
              subTab === tab.id
                ? 'border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]'
                : 'border-[var(--border)] text-[var(--muted-foreground)] hover:border-[var(--accent)]/40'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Overview Tab ── */}
      {subTab === 'overview' && (<>

      {/* ── Welcome Empty State ── */}
      {trades.length === 0 && (
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-6 sm:p-8 text-center space-y-4">
          <div className="mx-auto"><BrainMascot size={48} glow /></div>
          <div>
            <h2 className="text-lg font-bold text-[var(--foreground)]">Welcome to PsychSync!</h2>
            <p className="text-sm text-[var(--muted-foreground)] mt-1">Log your first trade to unlock insights and analytics.</p>
          </div>
          <ul className="text-xs text-[var(--muted-foreground)] space-y-1 text-left max-w-xs mx-auto">
            <li>&bull; Track your P&L, win rate, and streaks</li>
            <li>&bull; Get AI coaching based on your patterns</li>
            <li>&bull; Build discipline with psychology tools</li>
          </ul>
          <button
            onClick={onAddTrade}
            className="px-6 py-2.5 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white rounded-xl text-sm font-medium transition-colors"
          >
            Log First Trade
          </button>
        </div>
      )}

      {/* ── Usage Card (limited tiers) ── */}
      {!usage.trades.isUnlimited && trades.length > 0 && (
        <UsageCard trades={usage.trades} strategies={usage.strategies} tierName={usage.tierName} />
      )}

      {/* ── Peak Trade Trophy ── */}
      {peakTrade && (
        <div className="bg-[var(--accent)]/5 border border-[var(--accent)]/15 rounded-xl px-4 py-3 flex items-center gap-3">
          <Trophy size={18} className="text-[var(--accent)] shrink-0" />
          <div className="flex-1 min-w-0">
            <span className="text-[10px] font-medium text-[var(--muted-foreground)] uppercase tracking-wide">
              Peak Trade
            </span>
            <p className="text-sm font-medium text-[var(--foreground)] truncate">
              {peakTrade.coin} · {format(new Date(peakTrade.exitDate!), 'MMM dd, yyyy')}
            </p>
          </div>
          <div className="text-right shrink-0">
            <div className={`text-base font-bold ${(peakTrade.actualPnLPercent ?? 0) >= 0 ? 'text-[var(--gain)]' : 'text-[var(--loss)]'}`}>
              {focusMode ? '—' : formatPercent(peakTrade.actualPnLPercent ?? 0)}
            </div>
            <div className="text-[10px] text-[var(--muted-foreground)]">{peakTrade.emotion}</div>
          </div>
        </div>
      )}

      {/* ── Weekly Focus Intention ── */}
      {mood !== 'unsettled' && (
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl px-4 py-3 flex items-center gap-3">
          <Target size={15} className="text-[var(--accent)] shrink-0" />
          <div className="flex-1 min-w-0">
            <label className="text-[10px] font-medium text-[var(--muted-foreground)] uppercase tracking-wide block mb-1">
              This week I&apos;m working on
            </label>
            <input
              type="text"
              value={focusIntention}
              onChange={e => handleIntentionChange(e.target.value)}
              placeholder="e.g. better exits, patience, position sizing..."
              className="w-full bg-transparent text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]/40 outline-none border-b border-[var(--border)] pb-0.5 focus:border-[var(--accent)]/50 transition-colors"
              maxLength={120}
            />
          </div>
        </div>
      )}

      {/* ── Pattern Pre-Warning ── */}
      {patternWarning && !warningDismissed && mood !== 'unsettled' && (
        <div className="flex items-center justify-between gap-3 bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3 animate-in">
          <p className="text-sm text-amber-300/90 leading-snug">{patternWarning}</p>
          <button
            onClick={handleDismissWarning}
            className="shrink-0 text-amber-400/60 hover:text-amber-400 text-xs underline cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* ── Spiral Warning (compound risk) ── */}
      {spiralWarning && !warningDismissed && mood !== 'unsettled' && (
        <div className="flex items-center justify-between gap-3 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 animate-in">
          <p className="text-sm text-red-300/90 leading-snug">{spiralWarning}</p>
          <button
            onClick={handleDismissWarning}
            className="shrink-0 text-red-400/60 hover:text-red-400 text-xs underline cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* ── Daily Loss Guard ── */}
      {dailyLossGuard && (
        <div className={`rounded-xl px-4 py-3 border ${
          dailyLossGuard.hit
            ? 'bg-red-500/10 border-red-500/25'
            : 'bg-amber-500/10 border-amber-500/20'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <span className={`text-[10px] font-medium uppercase tracking-wide ${dailyLossGuard.hit ? 'text-red-400' : 'text-amber-400/80'}`}>
              {dailyLossGuard.hit ? '🚨 Daily Loss Limit Hit' : '⚠ Approaching Daily Limit'}
            </span>
            <span className={`text-xs font-semibold ${dailyLossGuard.hit ? 'text-red-400' : 'text-amber-400'}`}>
              {focusMode ? '—' : formatCurrency(dailyLossGuard.todayPnL)} / {focusMode ? '—' : formatCurrency(-dailyLossGuard.limit)}
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-[var(--border)] overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${dailyLossGuard.hit ? 'bg-red-500' : 'bg-amber-400'}`}
              style={{ width: `${Math.round(dailyLossGuard.pct * 100)}%` }}
            />
          </div>
          {dailyLossGuard.hit && (
            <p className="text-xs text-red-400/80 mt-2">Limit reached — consider stopping for today.</p>
          )}
        </div>
      )}

      {/* ── AI Coach Card ── */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 space-y-3">
        <p className="text-sm text-[var(--muted-foreground)] italic">{warmOpening}</p>

        <div className="flex flex-wrap gap-3">
          {processReinforcement && (
            <div className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-[var(--gain)]/10 text-[var(--gain)]">
              <CheckCircle size={12} className="shrink-0" />
              <span>Process win — you followed every rule.</span>
            </div>
          )}
          {disciplineStreak.count > 0 && (
            <div className="flex items-center gap-1.5">
              <Flame size={14} className="text-orange-400 shrink-0" />
              <span className="text-xs font-medium text-[var(--foreground)]">{disciplineStreak.count}-session discipline streak</span>
            </div>
          )}
          {luckyDisciplineStreak && (
            <div className={`text-xs px-2.5 py-1 rounded-full flex items-center gap-1.5 ${
              luckyDisciplineStreak.type === 'discipline'
                ? 'bg-[var(--gain)]/10 text-[var(--gain)]'
                : 'bg-amber-500/10 text-amber-400'
            }`}>
              <span>🔥 {luckyDisciplineStreak.count}W · {luckyDisciplineStreak.type === 'discipline' ? `earned (${luckyDisciplineStreak.compliancePct}%)` : `lucky (${luckyDisciplineStreak.compliancePct}% compliance)`}</span>
            </div>
          )}
          {dailyProfitGuard && (
            <div className={`text-xs px-2.5 py-1 rounded-full ${dailyProfitGuard.hit ? 'bg-[var(--gain)]/10 text-[var(--gain)]' : 'bg-yellow-500/10 text-yellow-400'}`}>
              {dailyProfitGuard.hit
                ? `Daily target reached — ${focusMode ? '—' : formatCurrency(dailyProfitGuard.todayPnL)} today`
                : `${Math.round(dailyProfitGuard.pct * 100)}% to daily target (${focusMode ? '—' : formatCurrency(dailyProfitGuard.target)})`}
            </div>
          )}
        </div>

        {multiDayBreaches && (
          <div className="text-xs border-t border-[var(--border)] pt-2.5 text-amber-400">
            ⚠ You hit your daily loss limit {multiDayBreaches.breachCount} of the last {multiDayBreaches.windowDays} days. You set this limit for a reason.
          </div>
        )}

        {todayFrequencySpike && (
          <div className="text-xs border-t border-[var(--border)] pt-2.5 text-amber-400">
            You&apos;ve logged {todayFrequencySpike.todayCount} trades today. Your daily average is {todayFrequencySpike.avgDailyCount}.
            <p className="text-[10px] text-[var(--muted-foreground)]/60 mt-0.5">Based on {todayFrequencySpike.pastDayCount} past trading days</p>
          </div>
        )}

        {!todayFrequencySpike && restDayInsight && (
          <div className="text-xs border-t border-[var(--border)] pt-2.5 text-[var(--muted-foreground)] italic">
            {restDayInsight.text}
          </div>
        )}

        {coachingMemory && (
          <div className="text-xs border-t border-[var(--border)] pt-2.5 space-y-1">
            <span className="font-medium text-[var(--foreground)]">From {coachingMemory.date} ({coachingMemory.source}): </span>
            <p className="text-[var(--muted-foreground)] italic">&ldquo;{coachingMemory.text}&rdquo;</p>
          </div>
        )}

        {weeklyFocus && (
          <div className="text-xs border-t border-[var(--border)] pt-2.5">
            <span className="font-medium text-[var(--foreground)]">This week&apos;s pattern: </span>
            <span className="text-[var(--muted-foreground)]">&ldquo;{weeklyFocus.rule}&rdquo; broken in {weeklyFocus.breakCount} of {weeklyFocus.tradeCount} trades.</span>
            <p className="text-[10px] text-[var(--muted-foreground)]/60 mt-0.5">Based on {weeklyFocus.tradeCount} trades this week</p>
          </div>
        )}

        {weeklyRuleReport.length > 0 && (
          <details className="text-xs text-[var(--muted-foreground)]">
            <summary className="cursor-pointer hover:text-[var(--foreground)] transition-colors">
              Rule breakdown — last 7 days ({weeklyRuleReport.length} rules)
            </summary>
            <div className="mt-2 space-y-1 pl-1">
              {weeklyRuleReport.map(r => (
                <div key={r.rule} className="flex items-center gap-2 text-[10px]">
                  <span className="flex-1 truncate">{r.rule}</span>
                  <span className="text-[var(--gain)] shrink-0">{r.followed}✓</span>
                  {r.partial > 0 && <span className="text-yellow-400 shrink-0">{r.partial}~</span>}
                  {r.broken > 0 && <span className="text-[var(--loss)] shrink-0">{r.broken}✗</span>}
                </div>
              ))}
            </div>
          </details>
        )}

        {emotionRuleInsight && (
          <div className="text-xs border-t border-[var(--border)] pt-2.5">
            <span className="font-medium text-[var(--foreground)]">Emotion pattern: </span>
            <span className="text-[var(--muted-foreground)]">
              When you log <span className="text-amber-400">{emotionRuleInsight.emotion}</span>, you break &ldquo;{emotionRuleInsight.rule}&rdquo; in {emotionRuleInsight.breakCount} of {emotionRuleInsight.sampleCount} trades.
            </span>
            <p className="text-[10px] text-[var(--muted-foreground)]/60 mt-0.5">Based on {emotionRuleInsight.sampleCount} trades</p>
          </div>
        )}

        {(coinWinRateInsights.best || coinWinRateInsights.worst) && (
          <div className="text-xs border-t border-[var(--border)] pt-2.5 space-y-1">
            <span className="font-medium text-[var(--foreground)] flex items-center gap-1"><TrendingUp size={11} /> Your coins</span>
            {coinWinRateInsights.best && (
              <p className="text-[var(--muted-foreground)]">
                Best: <span className="text-[var(--gain)] font-medium">{coinWinRateInsights.best.coin}</span> — {coinWinRateInsights.best.winRate}% win rate · {coinWinRateInsights.best.total} trades
              </p>
            )}
            {coinWinRateInsights.worst && (
              <p className="text-[var(--muted-foreground)]">
                Weakest: <span className="text-[var(--loss)] font-medium">{coinWinRateInsights.worst.coin}</span> — {coinWinRateInsights.worst.winRate}% win rate · {coinWinRateInsights.worst.total} trades
              </p>
            )}
            <p className="text-[10px] text-[var(--muted-foreground)]/60 mt-0.5">
              Based on {(coinWinRateInsights.best?.total ?? 0) + (coinWinRateInsights.worst?.total ?? 0)} trades across {[coinWinRateInsights.best, coinWinRateInsights.worst].filter(Boolean).length} coins
            </p>
          </div>
        )}

        {onSetDailyGoal && (
          <div className="border-t border-[var(--border)] pt-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-medium text-[var(--muted-foreground)] uppercase tracking-wide">Daily Limits</span>
              <button
                onClick={() => {
                  setDailyLossInput(dailyLossLimit != null ? String(dailyLossLimit) : '');
                  setDailyProfitInput(dailyProfitTarget != null ? String(dailyProfitTarget) : '');
                  setEditingDailyGoal(v => !v);
                }}
                className="text-[10px] text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors underline underline-offset-2"
              >
                {editingDailyGoal ? 'Cancel' : (dailyLossLimit || dailyProfitTarget) ? 'Edit' : 'Set limits'}
              </button>
            </div>
            {!editingDailyGoal && (dailyLossLimit || dailyProfitTarget) && (
              <div className="flex gap-4 mt-1 text-xs text-[var(--muted-foreground)]">
                {dailyLossLimit && <span>Max loss: <span className="text-[var(--loss)]">{focusMode ? '—' : formatCurrency(dailyLossLimit)}</span></span>}
                {dailyProfitTarget && <span>Profit target: <span className="text-[var(--gain)]">{focusMode ? '—' : formatCurrency(dailyProfitTarget)}</span></span>}
              </div>
            )}
            {editingDailyGoal && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const loss = parseFloat(dailyLossInput);
                  const profit = parseFloat(dailyProfitInput);
                  onSetDailyGoal({
                    dailyLossLimit: !isNaN(loss) && loss > 0 ? loss : undefined,
                    dailyProfitTarget: !isNaN(profit) && profit > 0 ? profit : undefined,
                    goalMode,
                  });
                  setEditingDailyGoal(false);
                }}
                className="mt-2 space-y-2"
              >
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="text-[10px] text-[var(--muted-foreground)] block mb-1">Max daily loss ({currency})</label>
                    <input
                      type="number" min="0" step="any"
                      value={dailyLossInput}
                      onChange={e => setDailyLossInput(e.target.value)}
                      placeholder="e.g. 200"
                      className="w-full bg-[var(--input)] border border-[var(--border)] rounded-lg px-2 py-1 text-xs text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-[10px] text-[var(--muted-foreground)] block mb-1">Daily profit target ({currency})</label>
                    <input
                      type="number" min="0" step="any"
                      value={dailyProfitInput}
                      onChange={e => setDailyProfitInput(e.target.value)}
                      placeholder="e.g. 300"
                      className="w-full bg-[var(--input)] border border-[var(--border)] rounded-lg px-2 py-1 text-xs text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]"
                    />
                  </div>
                </div>
                <button type="submit" className="w-full py-1.5 bg-[var(--accent)] text-white rounded-lg text-xs font-medium">Save limits</button>
              </form>
            )}
          </div>
        )}
      </div>

      {/* ── Rolling Window Chips ── */}
      <div className="flex gap-1.5 flex-wrap">
        {(['7d', '30d', '90d', 'all'] as StatsWindow[]).map(w => (
          <button
            key={w}
            onClick={() => setStatsWindow(w)}
            className={`px-2.5 py-1 text-[10px] rounded-full border transition-colors cursor-pointer ${
              statsWindow === w
                ? 'border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]'
                : 'border-[var(--border)] text-[var(--muted-foreground)] hover:border-[var(--accent)]/40'
            }`}
          >
            {w === 'all' ? 'All time' : w}
          </button>
        ))}
      </div>

      {/* ── Stats Grid ── */}
      <div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">

          {/* Card 1: Discipline Score (or Reflection when unsettled) */}
          {mood === 'unsettled' ? (
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3.5 sm:p-5">
              <span className="text-[10px] font-medium text-amber-400/80 uppercase tracking-wide block mb-2">
                Take a breath
              </span>
              <p className="text-sm text-[var(--foreground)] leading-snug">
                {insights.length > 0
                  ? insights[safeInsightIndex]
                  : 'Focus on what you can control. One trade at a time.'}
              </p>
              <button
                onClick={handleMoodReset}
                className="mt-3 text-[10px] text-[var(--muted-foreground)] hover:text-[var(--foreground)] underline cursor-pointer"
              >
                Reset mood check
              </button>
            </div>
          ) : (
            <div className="bg-[var(--card)] border border-[var(--accent)]/20 rounded-xl p-3.5 sm:p-5 hover:border-[var(--accent)]/40 transition-colors">
              <div className="flex items-center justify-between mb-2 sm:mb-3">
                <span className="text-[10px] sm:text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wide">
                  Discipline Score
                </span>
                <BarChart3 size={20} className={
                  closedTrades.some(t => t.ruleChecklist.length > 0)
                    ? disciplineScore >= 0.7 ? 'text-[var(--gain)]'
                      : disciplineScore >= 0.4 ? 'text-[var(--yellow)]'
                      : 'text-[var(--loss)]'
                    : 'text-[var(--muted-foreground)]'
                } />
              </div>
              <div className={`text-lg sm:text-2xl font-bold ${
                closedTrades.some(t => t.ruleChecklist.length > 0)
                  ? disciplineScore >= 0.7 ? 'text-[var(--gain)]'
                    : disciplineScore >= 0.4 ? 'text-[var(--yellow)]'
                    : 'text-[var(--loss)]'
                  : 'text-[var(--muted-foreground)]'
              }`}>
                {closedTrades.some(t => t.ruleChecklist.length > 0) ? `${Math.round(disciplineScore * 100)}%` : '—'}
              </div>
              <div className="text-[10px] sm:text-xs mt-1 text-[var(--muted-foreground)]">
                Rule compliance (yes/partial)
              </div>
            </div>
          )}

          {/* Card 2: Win Rate + rolling window + streak badge (A-14) */}
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-3.5 sm:p-5 hover:border-[var(--accent)]/30 transition-colors">
            <div className="flex items-center justify-between mb-2 sm:mb-3">
              <span className="text-[10px] sm:text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wide">
                Win Rate
              </span>
              <div className="flex items-center gap-1.5">
                {streak.type !== 'none' && (
                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                    streak.type === 'win' ? 'bg-[var(--gain)]/15 text-[var(--gain)]' : 'bg-[var(--loss)]/15 text-[var(--loss)]'
                  }`}>
                    {streak.type === 'win' ? '🔥' : '❌'} {streak.count}{streak.type === 'win' ? 'W' : 'L'}
                  </span>
                )}
                <Target size={20} className={displayedWinRate >= 50 ? 'text-[var(--gain)]' : 'text-[var(--loss)]'} />
              </div>
            </div>
            <div className={`text-lg sm:text-2xl font-bold ${displayedWinRate >= 50 ? 'text-[var(--gain)]' : 'text-[var(--loss)]'}`}>
              {(statsWindow === 'all' ? closedTrades.length : windowedCount) > 0
                ? `${displayedWinRate}%`
                : '—'}
            </div>
            {statsWindow === 'all' ? (
              winRateDelta.delta !== null && closedTrades.length > 0 && (
                <div className={`text-[10px] sm:text-xs mt-1 ${winRateDelta.delta >= 0 ? 'text-[var(--gain)]' : 'text-[var(--loss)]'}`}>
                  {winRateDelta.delta >= 0 ? '↑' : '↓'}{Math.abs(winRateDelta.delta)}% vs last month
                </div>
              )
            ) : (
              <div className="text-[10px] sm:text-xs mt-1 text-[var(--muted-foreground)]">
                {statsWindow === '7d' ? 'Last 7 days' : statsWindow === '30d' ? 'Last 30 days' : 'Last 90 days'}
              </div>
            )}
            {personalBest && statsWindow === 'all' && closedTrades.length > 0 && (
              <div className="text-[10px] sm:text-xs mt-0.5 text-[var(--muted-foreground)]">
                Peak: {personalBest.winRate}% ({personalBest.month})
              </div>
            )}
          </div>

          {/* Card 3: Good Decision Rate + rolling window */}
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-3.5 sm:p-5 hover:border-[var(--accent)]/30 transition-colors">
            <div className="flex items-center justify-between mb-2 sm:mb-3">
              <span className="text-[10px] sm:text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wide">
                Good Decisions
              </span>
              <BarChart3 size={20} className="text-[var(--blue)]" />
            </div>
            <div className={`text-lg sm:text-2xl font-bold ${
              displayedGoodDecision >= 60 ? 'text-[var(--gain)]' :
              displayedGoodDecision >= 40 ? 'text-[var(--yellow)]' :
              displayedAssessedCount > 0 ? 'text-[var(--loss)]' : 'text-[var(--muted-foreground)]'
            }`}>
              {displayedAssessedCount > 0 ? `${displayedGoodDecision}%` : '—'}
            </div>
            <div className="text-[10px] sm:text-xs mt-1 text-[var(--muted-foreground)]">
              {statsWindow === 'all'
                ? 'Quality of decisions'
                : statsWindow === '7d' ? 'Last 7 days' : statsWindow === '30d' ? 'Last 30 days' : 'Last 90 days'}
            </div>
          </div>

          {/* Card 4: Portfolio P&L */}
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-3.5 sm:p-5 hover:border-[var(--accent)]/30 transition-colors">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] sm:text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wide">
                Portfolio P&L
              </span>
              <span className={`text-xs font-semibold ${totalPnL >= 0 ? 'text-[var(--gain)]' : 'text-[var(--loss)]'}`}>
                {focusMode ? '—' : formatCurrency(totalPnL)}
              </span>
            </div>
            {equityCurveData.length > 1 ? (
              <div className="h-[52px] -mx-1 my-1">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={equityCurveData} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gainGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2dd4bf" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#2dd4bf" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="lossGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#fb923c" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#fb923c" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <Area
                      type="monotone"
                      dataKey="pnl"
                      stroke={totalPnL >= 0 ? '#2dd4bf' : '#fb923c'}
                      strokeWidth={1.5}
                      fill={totalPnL >= 0 ? 'url(#gainGrad)' : 'url(#lossGrad)'}
                      dot={false}
                      isAnimationActive={false}
                    />
                    <Tooltip
                      contentStyle={{
                        background: 'var(--card)',
                        border: '1px solid var(--border)',
                        borderRadius: '6px',
                        fontSize: '11px',
                        padding: '4px 8px',
                        color: 'var(--foreground)',
                      }}
                      formatter={(val: unknown) => [
                        focusMode ? '—' : formatCurrency(val as number),
                        'Cumulative P&L',
                      ]}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className={`text-lg sm:text-2xl font-bold mt-2 ${totalPnL >= 0 ? 'text-[var(--gain)]' : 'text-[var(--loss)]'}`}>
                {focusMode ? '—' : formatCurrency(totalPnL)}
              </div>
            )}
            {equityCurveData.length > 1 && (
              <div className={`text-sm font-semibold ${totalPnL >= 0 ? 'text-[var(--gain)]' : 'text-[var(--loss)]'}`}>
                {focusMode ? '—' : formatCurrency(totalPnL)}
              </div>
            )}
            <div className="text-[10px] sm:text-xs mt-0.5 text-[var(--muted-foreground)]">
              {trades.length} trades total
            </div>
          </div>

          {/* Card 5: Portfolio Balance */}
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-3.5 sm:p-5 hover:border-[var(--accent)]/30 transition-colors">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] sm:text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wide">
                Portfolio Balance
              </span>
              {onSetCapital && (
                <button
                  onClick={() => { setCapitalInput(String(initialCapital || '')); setEditingCapital(true); }}
                  className="text-[10px] text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors underline underline-offset-2"
                >
                  {initialCapital > 0 ? 'Edit' : 'Set capital'}
                </button>
              )}
            </div>

            {editingCapital ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const val = parseFloat(capitalInput);
                  if (!isNaN(val) && val >= 0) { onSetCapital?.(val); setEditingCapital(false); }
                }}
                className="flex gap-1.5 mt-1"
              >
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={capitalInput}
                  onChange={e => setCapitalInput(e.target.value)}
                  placeholder="e.g. 10000"
                  autoFocus
                  className="flex-1 min-w-0 bg-[var(--input)] border border-[var(--border)] rounded-lg px-2 py-1 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]"
                />
                <button type="submit" className="px-2 py-1 bg-[var(--accent)] text-white rounded-lg text-xs font-medium shrink-0">Save</button>
                <button type="button" onClick={() => setEditingCapital(false)} className="px-2 py-1 text-[var(--muted-foreground)] hover:text-[var(--foreground)] text-xs shrink-0">✕</button>
              </form>
            ) : initialCapital === 0 ? (
              <div className="mt-2 text-sm text-[var(--muted-foreground)]">
                {onSetCapital ? (
                  <button
                    onClick={() => { setCapitalInput(''); setEditingCapital(true); }}
                    className="underline underline-offset-2 hover:text-[var(--foreground)] transition-colors"
                  >
                    Set your starting capital
                  </button>
                ) : '—'}
              </div>
            ) : (
              <>
                <div className={`text-lg sm:text-2xl font-bold mt-1 ${(initialCapital + totalPnL) >= initialCapital ? 'text-[var(--gain)]' : 'text-[var(--loss)]'}`}>
                  {focusMode ? '—' : formatCurrency(initialCapital + totalPnL)}
                </div>
                <div className="text-[10px] sm:text-xs mt-1 text-[var(--muted-foreground)]">
                  Started at {focusMode ? '—' : formatCurrency(initialCapital)}
                  {!focusMode && totalPnL !== 0 && (
                    <span className={`ml-1 font-medium ${totalPnL >= 0 ? 'text-[var(--gain)]' : 'text-[var(--loss)]'}`}>
                      ({totalPnL >= 0 ? '+' : ''}{formatCurrency(totalPnL)})
                    </span>
                  )}
                </div>
                {!focusMode && drawdownStats.currentDrawdown > 0 && (
                  <div className="mt-1.5 flex items-center gap-2 text-[10px] sm:text-xs">
                    <span className="text-[var(--loss)] font-medium">
                      ▼ {drawdownStats.currentDrawdown.toFixed(1)}% drawdown
                    </span>
                    {drawdownStats.maxDrawdown > drawdownStats.currentDrawdown && (
                      <span className="text-[var(--muted-foreground)]">
                        · max {drawdownStats.maxDrawdown.toFixed(1)}%
                      </span>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

        </div>

        {/* Streak + Process Score — expandable row */}
        {showAllStats && (
          <div className="mt-3 sm:mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 animate-in">
            {/* Journal Entries (moved from main grid) */}
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-3.5 sm:p-5 hover:border-[var(--accent)]/30 transition-colors">
              <div className="flex items-center justify-between mb-2 sm:mb-3">
                <span className="text-[10px] sm:text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wide">
                  Journal Entries
                </span>
                <BookOpen size={20} className="text-[var(--purple)]" />
              </div>
              <div className="flex items-baseline gap-2">
                <div className="text-lg sm:text-2xl font-bold text-[var(--foreground)]">
                  {trades.length}
                </div>
                {milestone !== null && (
                  <span className="text-[10px] text-[var(--accent)] font-medium">🏆 {milestone}</span>
                )}
              </div>
              <div className="text-[10px] sm:text-xs mt-1 text-[var(--muted-foreground)]">
                {reflectionStreak >= 2
                  ? `🔥 ${reflectionStreak}-day reflection streak`
                  : tradesThisMonth > 0
                  ? `${tradesThisMonth} this month`
                  : 'Start logging trades'}
              </div>
            </div>
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-3.5 sm:p-5 hover:border-[var(--accent)]/30 transition-colors">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] sm:text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wide block mb-1">
                    Current Streak
                  </span>
                  <span className={`text-lg sm:text-2xl font-bold ${
                    streak.type === 'win' ? 'text-[var(--gain)]' :
                    streak.type === 'loss' ? 'text-[var(--loss)]' :
                    'text-[var(--muted-foreground)]'
                  }`}>
                    {streak.type === 'none' ? '—' : `${streak.count} ${streak.type === 'win' ? 'W' : 'L'}`}
                  </span>
                </div>
                <Flame size={28} className={
                  streak.type === 'win' ? 'text-[var(--gain)]' :
                  streak.type === 'loss' ? 'text-[var(--loss)]' :
                  'text-[var(--muted-foreground)]'
                } />
              </div>
            </div>
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-3.5 sm:p-5 hover:border-[var(--accent)]/30 transition-colors">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] sm:text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wide block mb-1">
                    Rule Adherence
                  </span>
                  <span className={`text-lg sm:text-2xl font-bold ${
                    processScore
                      ? processScore.score >= 70 ? 'text-[var(--gain)]' : processScore.score >= 50 ? 'text-[var(--yellow)]' : 'text-[var(--loss)]'
                      : 'text-[var(--muted-foreground)]'
                  }`}>
                    {processScore ? `${processScore.score}%` : '—'}
                  </span>
                  {processScore && (
                    <div className="text-[10px] sm:text-xs mt-1 text-[var(--muted-foreground)]">
                      {processScore.tradeCount} trades with checklist
                    </div>
                  )}
                </div>
                <BarChart3 size={28} className={
                  processScore && processScore.score >= 70 ? 'text-[var(--gain)]' : 'text-[var(--muted-foreground)]'
                } />
              </div>
            </div>
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-3.5 sm:p-5 hover:border-[var(--accent)]/30 transition-colors">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] sm:text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wide block mb-1">
                    Risk Sizing
                  </span>
                  <span className={`text-lg sm:text-2xl font-bold ${
                    riskConsistency
                      ? riskConsistency.colorKey === 'gain' ? 'text-[var(--gain)]'
                        : riskConsistency.colorKey === 'yellow' ? 'text-[var(--yellow)]'
                        : 'text-[var(--loss)]'
                      : 'text-[var(--muted-foreground)]'
                  }`}>
                    {riskConsistency ? riskConsistency.label : '—'}
                  </span>
                  {riskConsistency && (
                    <div className="text-[10px] sm:text-xs mt-1 text-[var(--muted-foreground)]">
                      {riskConsistency.cv}% variance · {riskConsistency.sampleSize} trades
                    </div>
                  )}
                  {!riskConsistency && (
                    <div className="text-[10px] sm:text-xs mt-1 text-[var(--muted-foreground)]">
                      5+ trades needed
                    </div>
                  )}
                </div>
                <Target size={28} className={
                  riskConsistency?.colorKey === 'gain' ? 'text-[var(--gain)]' : 'text-[var(--muted-foreground)]'
                } />
              </div>
            </div>
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-3.5 sm:p-5 hover:border-[var(--accent)]/30 transition-colors">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] sm:text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wide block mb-1">
                    Loss Limit Breaches
                  </span>
                  <span className={`text-lg sm:text-2xl font-bold ${
                    !lossLimitBreaches ? 'text-[var(--muted-foreground)]'
                      : lossLimitBreaches.count === 0 ? 'text-[var(--gain)]'
                      : lossLimitBreaches.count <= 2 ? 'text-[var(--yellow)]'
                      : 'text-[var(--loss)]'
                  }`}>
                    {lossLimitBreaches ? `${lossLimitBreaches.count}/${lossLimitBreaches.total}` : '—'}
                  </span>
                  {lossLimitBreaches && (
                    <div className="text-[10px] sm:text-xs mt-1 text-[var(--muted-foreground)]">
                      Exceeded -{lossLimitBreaches.limit}% per-trade
                    </div>
                  )}
                  {!lossLimitBreaches && (
                    <div className="text-[10px] sm:text-xs mt-1 text-[var(--muted-foreground)]">
                      Set in strategy settings
                    </div>
                  )}
                </div>
                <ShieldX size={28} className={
                  !lossLimitBreaches || lossLimitBreaches.count === 0
                    ? 'text-[var(--muted-foreground)]'
                    : lossLimitBreaches.count <= 2 ? 'text-[var(--yellow)]' : 'text-[var(--loss)]'
                } />
              </div>
            </div>
            {/* Growth Milestones (Q-21/22) */}
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-3.5 sm:p-5 hover:border-[var(--accent)]/30 transition-colors sm:col-span-2">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] sm:text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wide">
                  Growth Milestones
                </span>
                <Trophy size={20} className="text-[var(--accent)]" />
              </div>
              <div className="flex items-center gap-1.5 mb-2">
                {[25, 50, 100, 200, 500].map(m => (
                  <div key={m} className={`w-7 h-7 rounded-full text-[9px] flex items-center justify-center font-bold transition-colors ${
                    milestoneState.achieved.includes(m)
                      ? 'bg-[var(--accent)] text-white'
                      : 'bg-[var(--border)] text-[var(--muted-foreground)]'
                  }`}>
                    {m}
                  </div>
                ))}
              </div>
              {milestoneState.toNext !== null && milestoneState.nextTarget !== null && (
                <div className="mb-2">
                  <div className="flex items-center justify-between text-[10px] text-[var(--muted-foreground)] mb-1">
                    <span>{milestoneState.totalTrades} trades</span>
                    <span>{milestoneState.toNext} to {milestoneState.nextTarget}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-[var(--border)] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[var(--accent)] transition-all"
                      style={{ width: `${Math.min(100, (milestoneState.totalTrades / milestoneState.nextTarget) * 100)}%` }}
                    />
                  </div>
                </div>
              )}
              <div className="flex flex-wrap gap-1.5">
                {milestoneState.firstDisciplinedWeek && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--gain)]/10 text-[var(--gain)]">
                    Disciplined week
                  </span>
                )}
                {milestoneState.longestDisciplineStreak >= 3 && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--gain)]/10 text-[var(--gain)]">
                    {milestoneState.longestDisciplineStreak}-day discipline record
                  </span>
                )}
                {milestoneState.hasPositiveMonth && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--gain)]/10 text-[var(--gain)]">
                    Profitable month
                  </span>
                )}
              </div>
              {milestoneState.personalBestMonth && (
                <div className="text-[10px] text-[var(--muted-foreground)] mt-2">
                  Best month: <span className="text-[var(--foreground)] font-medium">{milestoneState.personalBestMonth.month}</span> — {milestoneState.personalBestMonth.winRate}% win rate
                  {milestoneState.personalBestMonthIsRecent && (
                    <span className="ml-1 text-[var(--gain)] font-medium">Recent!</span>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Focus Mode toggle + More stats expand */}
        <div className="flex items-center justify-between mt-2">
          <button
            onClick={() => setFocusMode(f => !f)}
            className={`flex items-center gap-1 text-[10px] transition-colors bg-[var(--card)] border rounded-full px-2.5 py-1 cursor-pointer ${
              focusMode
                ? 'border-[var(--accent)]/40 text-[var(--accent)]'
                : 'border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
            }`}
          >
            {focusMode ? <EyeOff size={11} /> : <Eye size={11} />}
            {focusMode ? 'Show P&L' : 'Focus mode'}
          </button>
          <button
            onClick={() => setShowAllStats(s => !s)}
            className="flex items-center gap-1 text-[10px] text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors bg-[var(--card)] border border-[var(--border)] rounded-full px-2.5 py-1 cursor-pointer"
          >
            {showAllStats ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
            {showAllStats ? 'Less' : 'More stats'}
          </button>
        </div>
      </div>

      </>)}

      {/* ── Insights Tab ── */}
      {subTab === 'insights' && (<>

      {/* ── Verdict Donut + Daily Three ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">

        {/* Verdict Donut */}
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 sm:p-5">
          <h3 className="font-semibold text-[var(--foreground)] mb-3 sm:mb-4 text-sm sm:text-base">
            Decision Quality
          </h3>
          {verdictData.length === 0 ? (
            <div className="h-[140px] flex items-center justify-center text-[var(--muted-foreground)] text-sm">
              No assessed trades yet
            </div>
          ) : (
            <>
              <div className="h-[140px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={verdictData}
                      cx="50%"
                      cy="50%"
                      innerRadius={42}
                      outerRadius={65}
                      paddingAngle={3}
                      dataKey="value"
                      isAnimationActive={false}
                    >
                      {verdictData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: 'var(--card)',
                        border: '1px solid var(--border)',
                        borderRadius: '8px',
                        fontSize: '12px',
                        padding: '4px 8px',
                        color: 'var(--foreground)',
                      }}
                      formatter={(val: number | undefined, name: string | undefined) => [
                        `${val ?? 0} trade${(val ?? 0) !== 1 ? 's' : ''}`,
                        name ?? '',
                      ]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-1.5 mt-1">
                {verdictData.map(v => (
                  <div key={v.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: v.color }} />
                      <span className="text-[var(--muted-foreground)] truncate max-w-[160px]">{v.name}</span>
                    </div>
                    <span className="font-medium text-[var(--foreground)] ml-2">{v.value}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Daily Three */}
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 sm:p-5">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <h3 className="font-semibold text-[var(--foreground)] text-sm sm:text-base">Your Insights</h3>
            {insights.length > 1 && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setInsightIndex(i => (i - 1 + insights.length) % insights.length)}
                  className="w-6 h-6 flex items-center justify-center rounded hover:bg-[var(--card-hover)] transition-colors cursor-pointer"
                  aria-label="Previous insight"
                >
                  <ChevronLeft size={13} className="text-[var(--muted-foreground)]" />
                </button>
                <span className="text-[10px] text-[var(--muted-foreground)] tabular-nums">
                  {safeInsightIndex + 1}/{insights.length}
                </span>
                <button
                  onClick={() => setInsightIndex(i => (i + 1) % insights.length)}
                  className="w-6 h-6 flex items-center justify-center rounded hover:bg-[var(--card-hover)] transition-colors cursor-pointer"
                  aria-label="Next insight"
                >
                  <ChevronRight size={13} className="text-[var(--muted-foreground)]" />
                </button>
              </div>
            )}
          </div>

          {insights.length === 0 ? (
            <div className="text-[var(--muted-foreground)] text-sm py-6 text-center leading-relaxed">
              Log 3+ trades to unlock<br />personalized insights
            </div>
          ) : (
            <div className="space-y-2">
              {Array.from(
                { length: Math.min(mood === 'unsettled' ? 1 : 3, insights.length) },
                (_, i) => {
                  const idx = (safeInsightIndex + i) % insights.length;
                  return (
                    <div
                      key={idx}
                      className="flex items-start gap-2 p-2.5 rounded-lg bg-[var(--accent)]/5 border border-[var(--accent)]/10"
                    >
                      <span className="text-[var(--accent)] mt-0.5 text-xs leading-none">•</span>
                      <p className="text-sm text-[var(--foreground)] leading-snug">{insights[idx]}</p>
                    </div>
                  );
                }
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Active Strategy + Quick Add ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4">
        <div className="lg:col-span-2 bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 sm:p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-[var(--foreground)]">Active Strategy</h3>
            {strategies.length > 0 && (
              <button onClick={() => onNavigate('playbook')} className="text-xs text-[var(--accent)] hover:underline">
                View All
              </button>
            )}
          </div>
          {activeStrategy ? (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg font-medium">{activeStrategy.name}</span>
                <span className="px-2 py-0.5 rounded-full text-xs bg-[var(--accent)]/20 text-[var(--accent)] border border-[var(--accent)]/30">
                  {activeStrategy.type}
                </span>
              </div>
              <div className="text-sm text-[var(--muted-foreground)]">
                {activeStrategy.rules.length} rules · {activeStrategy.entryChecklist.length} entry criteria · {activeStrategy.exitChecklist.length} exit criteria
              </div>
              {strategyDegradation && (
                <div className="mt-2 text-xs text-amber-400/80">
                  Win rate trend: {strategyDegradation.r1}% → {strategyDegradation.r2}% → {strategyDegradation.r3}% — possible edge drift
                </div>
              )}
            </div>
          ) : (
            <div className="text-[var(--muted-foreground)] text-sm">
              No strategies yet.{' '}
              <button onClick={() => onNavigate('playbook')} className="text-[var(--accent)] hover:underline">
                Create one
              </button>
            </div>
          )}
        </div>

        <button
          onClick={onAddTrade}
          className="bg-gradient-to-br from-indigo-600 to-purple-700 hover:from-indigo-500 hover:to-purple-600 rounded-xl p-5 flex flex-col items-center justify-center gap-3 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
        >
          <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
            <Plus size={24} className="text-white" />
          </div>
          <span className="text-white font-semibold">Add Trade</span>
        </button>
      </div>

      </>)}

      {/* ── Patterns Tab ── */}
      {subTab === 'patterns' && (<>

      {/* ── Know Yourself ── */}
      <div className="space-y-3 sm:space-y-4">

      {/* Strength Spotlight */}
      {strengthSpotlight && (
        <div className="bg-[var(--accent)]/5 border border-[var(--accent)]/15 rounded-xl px-4 py-3 flex items-center gap-3">
          <span className="text-base shrink-0">✨</span>
          <div className="flex-1 min-w-0">
            <span className="text-[10px] font-medium text-[var(--muted-foreground)] uppercase tracking-wide block mb-1">
              Strength Spotlight
            </span>
            <p className="text-sm text-[var(--foreground)]">
              {strengthSpotlight.type === 'coin'
                ? <><span className="font-semibold text-[var(--accent)]">{strengthSpotlight.label}</span> leads your coins — {strengthSpotlight.metric}</>
                : <>Trading while <span className="font-semibold text-[var(--accent)]">{strengthSpotlight.label}</span> — {strengthSpotlight.metric}</>
              }
              {' '}<span className="text-[10px] text-[var(--muted-foreground)]">({strengthSpotlight.detail})</span>
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">

        {/* You're Getting Better */}
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 sm:p-5">
          <h3 className="font-semibold text-[var(--foreground)] mb-3 text-sm">You&apos;re Getting Better</h3>
          {improvementData === null ? (
            <div className="text-[var(--muted-foreground)] text-sm py-4 text-center">
              Log 10+ trades to see your progress arc
            </div>
          ) : (
            <div className="space-y-3">
              <div className="text-[10px] text-[var(--muted-foreground)] uppercase tracking-wide">
                First {improvementData.halfSize} trades vs. last {improvementData.halfSize}
              </div>
              {/* Win Rate row */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-[var(--muted-foreground)] w-28 shrink-0">Win Rate</span>
                <span className="text-xs text-[var(--muted-foreground)]">{improvementData.earlyWinRate}%</span>
                <span className="text-[10px] text-[var(--muted-foreground)]">→</span>
                <span className={`text-sm font-semibold ${improvementData.recentWinRate >= 50 ? 'text-[var(--gain)]' : 'text-[var(--loss)]'}`}>
                  {improvementData.recentWinRate}%
                </span>
                <span className={`text-[10px] ml-auto ${improvementData.recentWinRate - improvementData.earlyWinRate > 0 ? 'text-[var(--gain)]' : improvementData.recentWinRate - improvementData.earlyWinRate < 0 ? 'text-[var(--loss)]' : 'text-[var(--muted-foreground)]'}`}>
                  {improvementData.recentWinRate - improvementData.earlyWinRate > 0 ? '↑' : improvementData.recentWinRate - improvementData.earlyWinRate < 0 ? '↓' : '→'}{Math.abs(improvementData.recentWinRate - improvementData.earlyWinRate)}%
                </span>
              </div>
              {/* Good Decisions row — only if verdict data exists */}
              {improvementData.earlyGoodDecision !== null && improvementData.recentGoodDecision !== null && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[var(--muted-foreground)] w-28 shrink-0">Good Decisions</span>
                  <span className="text-xs text-[var(--muted-foreground)]">{improvementData.earlyGoodDecision}%</span>
                  <span className="text-[10px] text-[var(--muted-foreground)]">→</span>
                  <span className={`text-sm font-semibold ${improvementData.recentGoodDecision >= 50 ? 'text-[var(--gain)]' : 'text-[var(--loss)]'}`}>
                    {improvementData.recentGoodDecision}%
                  </span>
                  <span className={`text-[10px] ml-auto ${improvementData.recentGoodDecision - improvementData.earlyGoodDecision > 0 ? 'text-[var(--gain)]' : improvementData.recentGoodDecision - improvementData.earlyGoodDecision < 0 ? 'text-[var(--loss)]' : 'text-[var(--muted-foreground)]'}`}>
                    {improvementData.recentGoodDecision - improvementData.earlyGoodDecision > 0 ? '↑' : improvementData.recentGoodDecision - improvementData.earlyGoodDecision < 0 ? '↓' : '→'}{Math.abs(improvementData.recentGoodDecision - improvementData.earlyGoodDecision)}%
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Emotion vs. P&L */}
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 sm:p-5">
          <h3 className="font-semibold text-[var(--foreground)] mb-3 text-sm">Emotion vs. Returns</h3>
          {emotionStats.length < 2 ? (
            <div className="text-[var(--muted-foreground)] text-sm py-4 text-center">
              Log trades across different emotions to see patterns
            </div>
          ) : (
            <div className="space-y-2">
              {emotionStats.slice(0, 6).map(({ emotion, avg, count }) => (
                <div key={emotion} className="flex items-center gap-2">
                  <span className="text-xs text-[var(--foreground)] w-32 shrink-0 truncate">{emotion}</span>
                  <span className={`text-xs font-semibold w-14 text-right shrink-0 ${avg > 0 ? 'text-[var(--gain)]' : avg < 0 ? 'text-[var(--loss)]' : 'text-[var(--muted-foreground)]'}`}>
                    {avg > 0 ? '+' : ''}{avg}%
                  </span>
                  <span className="text-[10px] text-[var(--muted-foreground)]">{count} trade{count !== 1 ? 's' : ''}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Emotion × Rule Discipline (C-24) */}
        <div className="lg:col-span-2 bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 sm:p-5">
          <h3 className="font-semibold text-[var(--foreground)] mb-3 text-sm">Emotion × Rule Discipline</h3>
          {(() => {
            const emotions = Object.keys(emotionalRuleMap);
            if (emotions.length === 0) {
              return (
                <div className="text-[var(--muted-foreground)] text-sm py-4 text-center">
                  Log more trades to see emotion-rule patterns
                </div>
              );
            }
            const allRules = Array.from(new Set(emotions.flatMap(e => Object.keys(emotionalRuleMap[e])))).slice(0, 3);
            return (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-[var(--muted-foreground)] border-b border-[var(--border)]">
                      <th className="text-left pb-2 font-medium pr-4">Emotion</th>
                      {allRules.map(r => (
                        <th key={r} className="text-right pb-2 font-medium max-w-[90px] truncate">{r}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {emotions.map(emotion => (
                      <tr key={emotion} className="hover:bg-[var(--card-hover)]">
                        <td className="py-2 text-[var(--foreground)] pr-4">{emotion}</td>
                        {allRules.map(rule => {
                          const pct = emotionalRuleMap[emotion]?.[rule];
                          if (pct === undefined) return <td key={rule} className="py-2 text-right text-[var(--muted-foreground)]">—</td>;
                          const color = pct >= 70 ? 'text-[var(--gain)]' : pct >= 40 ? 'text-[var(--yellow)]' : 'text-[var(--loss)]';
                          return <td key={rule} className={`py-2 text-right font-semibold ${color}`}>{pct}%</td>;
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })()}
        </div>

        {/* Coin Performance Matrix */}
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 sm:p-5">
          <h3 className="font-semibold text-[var(--foreground)] mb-3 text-sm">Coin Performance</h3>
          {coinStats.length === 0 ? (
            <div className="text-[var(--muted-foreground)] text-sm py-4 text-center">
              Log 2+ trades per coin to compare
            </div>
          ) : (
            <div className="space-y-2.5">
              {coinStats.map(({ coin, winRate, total }) => (
                <div key={coin} className="flex items-center gap-2">
                  <span className="text-xs text-[var(--foreground)] w-10 shrink-0 font-medium">{coin}</span>
                  <div className="flex-1 h-1.5 rounded-full bg-[var(--border)] overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${winRate}%`,
                        backgroundColor: winRate >= 50 ? 'rgba(45,212,191,0.7)' : 'rgba(251,146,60,0.7)',
                      }}
                    />
                  </div>
                  <span className={`text-xs font-semibold w-8 text-right shrink-0 ${winRate >= 50 ? 'text-[var(--gain)]' : 'text-[var(--loss)]'}`}>
                    {winRate}%
                  </span>
                  <span className="text-[10px] text-[var(--muted-foreground)] w-14 text-right shrink-0">{total} trade{total !== 1 ? 's' : ''}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Time of Day Performance */}
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 sm:p-5">
          <h3 className="font-semibold text-[var(--foreground)] mb-3 text-sm">Best Trading Hours</h3>
          {timeStats.every(t => t.winRate === null) ? (
            <div className="text-[var(--muted-foreground)] text-sm py-4 text-center">
              Log 2+ trades per time period to see patterns
            </div>
          ) : (
            <div className="space-y-2">
              {timeStats.map(({ bucket, winRate, total }) => {
                const emoji = bucket === 'Morning' ? '🌅' : bucket === 'Afternoon' ? '☀️' : '🌙';
                const isBest = bucket === bestTimeBucket;
                return (
                  <div key={bucket} className={`flex items-center gap-2.5 p-2 rounded-lg transition-colors ${isBest ? 'bg-[var(--accent)]/5 border border-[var(--accent)]/15' : ''}`}>
                    <span className="text-sm shrink-0">{emoji}</span>
                    <span className={`text-xs w-20 shrink-0 ${isBest ? 'text-[var(--foreground)] font-medium' : 'text-[var(--muted-foreground)]'}`}>
                      {bucket}
                    </span>
                    {winRate !== null ? (
                      <>
                        <div className="flex-1 h-1.5 rounded-full bg-[var(--border)] overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${winRate}%`,
                              backgroundColor: winRate >= 50 ? 'rgba(45,212,191,0.7)' : 'rgba(251,146,60,0.7)',
                            }}
                          />
                        </div>
                        <span className={`text-sm font-semibold w-9 text-right shrink-0 ${winRate >= 50 ? 'text-[var(--gain)]' : 'text-[var(--loss)]'}`}>
                          {winRate}%
                        </span>
                        <span className="text-[10px] text-[var(--muted-foreground)] w-14 text-right shrink-0">{total} trade{total !== 1 ? 's' : ''}</span>
                      </>
                    ) : (
                      <span className="text-xs text-[var(--muted-foreground)]">Not enough data</span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>

      </div>{/* end Know Yourself space-y wrapper */}

      </>)}

      {/* ── History Tab ── */}
      {subTab === 'history' && (<>

      {/* ── Trade Calendar Heatmap ── */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 sm:p-5">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-[var(--foreground)] text-sm">Trading Activity</h3>
          <span className="text-[10px] text-[var(--muted-foreground)]">{calendarGrid.dateRange}</span>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 sm:gap-5">
          {/* Heatmap — left */}
          <div className="flex-shrink-0 overflow-x-auto">
            <div className="flex min-w-max">
              {/* Day-of-week labels */}
              <div className="flex flex-col gap-1 sm:gap-1.5 mr-1.5 sm:mr-2">
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((l, i) => (
                  <div
                    key={i}
                    className="w-3.5 h-3.5 sm:w-5 sm:h-5 flex items-center justify-center text-[8px] sm:text-[9px] text-[var(--muted-foreground)]"
                  >
                    {i % 2 === 0 ? l : ''}
                  </div>
                ))}
              </div>
              {/* Weeks grid */}
              <div>
                <div className="flex gap-1 sm:gap-1.5">
                  {calendarGrid.weeks.map((week, wi) => (
                    <div key={wi} className="flex flex-col gap-1 sm:gap-1.5">
                      {week.days.map(day => {
                        const pnl = calendarGrid.calMap.get(day);
                        const isFuture = day > calendarGrid.todayStr;
                        let cellStyle: React.CSSProperties;
                        if (isFuture) {
                          cellStyle = { backgroundColor: 'transparent' };
                        } else if (pnl === undefined) {
                          cellStyle = { backgroundColor: 'var(--border)', opacity: 0.7 };
                        } else if (pnl > 0) {
                          const op = Math.min(0.2 + (pnl / calendarGrid.maxAbs) * 0.7, 0.9);
                          cellStyle = { backgroundColor: `rgba(45, 212, 191, ${op.toFixed(2)})` };
                        } else {
                          const op = Math.min(0.2 + (Math.abs(pnl) / calendarGrid.maxAbs) * 0.7, 0.9);
                          cellStyle = { backgroundColor: `rgba(251, 146, 60, ${op.toFixed(2)})` };
                        }
                        const tip = pnl !== undefined
                          ? `${day}\n${pnl >= 0 ? '+' : '−'}$${Math.abs(pnl).toFixed(2)}`
                          : day;
                        return (
                          <div
                            key={day}
                            title={tip}
                            className="w-3.5 h-3.5 sm:w-5 sm:h-5 rounded-sm cursor-default"
                            style={cellStyle}
                          />
                        );
                      })}
                    </div>
                  ))}
                </div>
                {/* Month labels */}
                <div className="flex gap-1 sm:gap-1.5 mt-1 sm:mt-1.5">
                  {calendarGrid.weeks.map((week, wi) => (
                    <div key={wi} className="w-3.5 sm:w-5 text-[8px] sm:text-[9px] text-[var(--muted-foreground)] overflow-hidden">
                      {week.monthLabel}
                    </div>
                  ))}
                </div>
                {/* Legend */}
                <div className="flex items-center flex-wrap gap-1 sm:gap-1.5 mt-2 sm:mt-3">
                  <span className="text-[8px] sm:text-[9px] text-[var(--muted-foreground)]">Less</span>
                  {[0.15, 0.35, 0.55, 0.75].map((op, i) => (
                    <div key={i} className="w-3 h-3 sm:w-3.5 sm:h-3.5 rounded-sm" style={{ backgroundColor: `rgba(45, 212, 191, ${op})` }} />
                  ))}
                  <span className="text-[8px] sm:text-[9px] text-[var(--muted-foreground)] mx-0.5 sm:mx-1">·</span>
                  {[0.15, 0.35, 0.55, 0.75].map((op, i) => (
                    <div key={i} className="w-3 h-3 sm:w-3.5 sm:h-3.5 rounded-sm" style={{ backgroundColor: `rgba(251, 146, 60, ${op})` }} />
                  ))}
                  <span className="text-[8px] sm:text-[9px] text-[var(--muted-foreground)]">More</span>
                </div>
              </div>
            </div>
          </div>

          {/* Stats — right, 2×2 grid of mini-cards */}
          <div className="flex-1 grid grid-cols-2 gap-2 sm:gap-3 content-center">
            {([
              {
                label: 'Active days',
                value: calendarGrid.activeDays > 0 ? String(calendarGrid.activeDays) : '—',
                color: 'text-[var(--foreground)]',
              },
              {
                label: 'Best day',
                value: focusMode || calendarGrid.bestDay === null || calendarGrid.bestDay <= 0
                  ? '—' : formatCurrency(calendarGrid.bestDay),
                color: 'text-[var(--gain)]',
              },
              {
                label: 'Worst day',
                value: focusMode || calendarGrid.worstDay === null || calendarGrid.worstDay >= 0
                  ? '—' : formatCurrency(calendarGrid.worstDay),
                color: 'text-[var(--loss)]',
              },
              {
                label: 'This month',
                value: focusMode || calendarGrid.thisMonth === null
                  ? '—' : formatCurrency(calendarGrid.thisMonth),
                color: (calendarGrid.thisMonth ?? 0) >= 0 ? 'text-[var(--gain)]' : 'text-[var(--loss)]',
              },
            ] as { label: string; value: string; color: string }[]).map(({ label, value, color }) => (
              <div key={label} className="bg-[var(--background)] rounded-lg p-3 sm:p-4">
                <div className="text-[10px] text-[var(--muted-foreground)] mb-1.5 uppercase tracking-wide">{label}</div>
                <div className={`text-lg sm:text-xl font-bold ${color}`}>{value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Recent Trades ── */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 sm:p-5">
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <h3 className="font-semibold text-[var(--foreground)]">Recent Trades</h3>
          {trades.length > 0 && (
            <button onClick={() => onNavigate('trades')} className="text-xs text-[var(--accent)] hover:underline">
              View All
            </button>
          )}
        </div>

        {recentTrades.length === 0 ? (
          <div className="text-center py-8 text-[var(--muted-foreground)]">
            <p className="mb-2">No trades logged yet</p>
            <button onClick={onAddTrade} className="text-[var(--accent)] hover:underline text-sm">
              Log your first trade
            </button>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[var(--muted-foreground)] border-b border-[var(--border)]">
                    <th className="pb-2 font-medium">Date</th>
                    <th className="pb-2 font-medium">Coin</th>
                    <th className="pb-2 font-medium text-right">P&L</th>
                    <th className="pb-2 font-medium text-right">R</th>
                    <th className="pb-2 font-medium">Strategy</th>
                    <th className="pb-2 font-medium">Verdict</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {recentTrades.map(trade => {
                    const rMultiple = !trade.isOpen ? getRMultiple(trade) : null;
                    const luckyWin = !trade.isOpen && isLuckyWin(trade);
                    return (
                      <tr key={trade.id} className="hover:bg-[var(--card-hover)] transition-colors">
                        <td className="py-2.5">{format(new Date(trade.entryDate), 'MMM dd')}</td>
                        <td className="py-2.5 font-medium">
                          {trade.coin}
                          {luckyWin && <span className="ml-1 text-amber-400 text-xs" title="Lucky Win">🍀</span>}
                        </td>
                        <td className={`py-2.5 text-right font-medium ${(trade.actualPnLPercent ?? 0) >= 0 ? 'text-[var(--gain)]' : 'text-[var(--loss)]'}`}>
                          {trade.isOpen ? (
                            <span className="text-[var(--yellow)]">Open</span>
                          ) : mood === 'unsettled' || focusMode ? (
                            <span className="text-[var(--muted-foreground)]">—</span>
                          ) : (
                            formatPercent(trade.actualPnLPercent ?? 0)
                          )}
                        </td>
                        <td className={`py-2.5 text-right text-xs ${rMultiple === null ? 'text-[var(--muted-foreground)]' : rMultiple >= 0 ? 'text-[var(--gain)]' : 'text-[var(--loss)]'}`}>
                          {rMultiple !== null ? `${rMultiple >= 0 ? '+' : ''}${rMultiple.toFixed(1)}R` : '—'}
                        </td>
                        <td className="py-2.5 text-[var(--muted-foreground)]">{trade.strategy || '—'}</td>
                        <td className="py-2.5">
                          {trade.verdict ? (
                            <span className={`px-2 py-0.5 rounded-full text-xs border ${getVerdictColor(trade.verdict)}`}>
                              {trade.verdict}
                            </span>
                          ) : (
                            <span className="text-[var(--muted-foreground)]">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="sm:hidden space-y-2">
              {recentTrades.map(trade => {
                const rMultiple = !trade.isOpen ? getRMultiple(trade) : null;
                const luckyWin = !trade.isOpen && isLuckyWin(trade);
                return (
                  <div key={trade.id} className="bg-[var(--background)]/40 rounded-lg p-3 space-y-1.5">
                    {/* Row 1: Coin + Strategy + Verdict */}
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{trade.coin}</span>
                      {luckyWin && <span className="text-amber-400 text-xs" title="Lucky Win">🍀</span>}
                      {trade.strategy && (
                        <span className="text-[10px] text-[var(--muted-foreground)] bg-[var(--muted)]/60 px-1.5 py-0.5 rounded-full truncate max-w-[100px]">
                          {trade.strategy}
                        </span>
                      )}
                      <div className="ml-auto flex items-center gap-1.5">
                        {trade.verdict && (
                          <span className={`px-1.5 py-0.5 rounded-full text-[10px] border ${getVerdictColor(trade.verdict)}`}>
                            {trade.verdict}
                          </span>
                        )}
                      </div>
                    </div>
                    {/* Row 2: Date + P&L + R-multiple */}
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[var(--muted-foreground)]">
                        {format(new Date(trade.entryDate), 'MMM dd, yyyy')}
                      </span>
                      <div className="flex items-center gap-2">
                        {rMultiple !== null && (
                          <span className={`text-[10px] ${rMultiple >= 0 ? 'text-[var(--gain)]' : 'text-[var(--loss)]'}`}>
                            {rMultiple >= 0 ? '+' : ''}{rMultiple.toFixed(1)}R
                          </span>
                        )}
                        {trade.isOpen ? (
                          <span className="font-medium text-[var(--yellow)]">Open</span>
                        ) : mood === 'unsettled' || focusMode ? (
                          <span className="text-[var(--muted-foreground)]">—</span>
                        ) : (
                          <span className={`font-bold ${(trade.actualPnLPercent ?? 0) >= 0 ? 'text-[var(--gain)]' : 'text-[var(--loss)]'}`}>
                            {formatPercent(trade.actualPnLPercent ?? 0)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* ── Loss Hypothesis Prompt (A-15) ── */}
      {lastLoss && updateTrade && (
        <div className="bg-[var(--card)] border border-amber-500/20 rounded-xl p-4 sm:p-5">
          <p className="text-sm font-medium text-[var(--foreground)] mb-1">Your last trade was a loss.</p>
          <p className="text-xs text-[var(--muted-foreground)] mb-3">
            What would you test or do differently next time? ({lastLoss.coin})
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={lossHypothesisInput}
              onChange={e => setLossHypothesisInput(e.target.value)}
              placeholder="e.g. Wait for confirmation candle before entering..."
              className="flex-1 bg-[var(--background)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]/50 outline-none focus:border-[var(--accent)]/50 transition-colors"
            />
            <button
              onClick={() => {
                if (!lossHypothesisInput.trim()) return;
                updateTrade(lastLoss.id, { lossHypothesis: lossHypothesisInput.trim() });
                setLossHypothesisInput('');
              }}
              className="px-4 py-2 bg-[var(--accent)] hover:bg-[var(--accent)]/80 text-white rounded-lg text-sm font-medium transition-colors cursor-pointer shrink-0"
            >
              Save
            </button>
          </div>
        </div>
      )}

      {/* ── Monthly History ── */}
      {monthlyScorecard.length > 0 && (
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 sm:p-5">
          <h3 className="font-semibold text-[var(--foreground)] mb-3 text-sm">Monthly History</h3>
          {monthlyScorecard.length >= 3 && (
            <div className="mb-4 h-[100px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={[...monthlyScorecard].reverse().map(row => ({
                    month: row.month.slice(0, 3),
                    discipline: row.discipline,
                    winRate: row.trades > 0 ? Math.round((row.wins / row.trades) * 100) : 0,
                  }))}
                  margin={{ top: 4, right: 4, left: -20, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                  <XAxis dataKey="month" tick={{ fontSize: 9, fill: 'var(--muted-foreground)' }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 9, fill: 'var(--muted-foreground)' }} />
                  <Tooltip
                    contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '6px', fontSize: '11px' }}
                    formatter={((val: any, name: any) => [`${val}%`, name === 'discipline' ? 'Discipline' : 'Win Rate']) as any}
                  />
                  <Line type="monotone" dataKey="discipline" stroke="#8b5cf6" strokeWidth={1.5} dot={false} name="discipline" />
                  <Line type="monotone" dataKey="winRate" stroke="#2dd4bf" strokeWidth={1.5} dot={false} name="winRate" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
          <div className="overflow-x-auto">
            <table className="w-full text-xs sm:text-sm">
              <thead>
                <tr className="text-left text-[10px] text-[var(--muted-foreground)] uppercase tracking-wide border-b border-[var(--border)]">
                  <th className="pb-2 font-medium">Month</th>
                  <th className="pb-2 font-medium">Trades</th>
                  <th className="pb-2 font-medium">Net P&amp;L</th>
                  <th className="pb-2 font-medium">W / L</th>
                  <th className="pb-2 font-medium hidden sm:table-cell">Discipline</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {monthlyScorecard.map(row => (
                  <tr key={row.monthKey} className="hover:bg-[var(--card-hover)] transition-colors">
                    <td className="py-2 sm:py-2.5">{row.month}</td>
                    <td className="py-2 sm:py-2.5">{row.trades}</td>
                    <td className={`py-2 sm:py-2.5 font-medium ${row.pnl >= 0 ? 'text-[var(--gain)]' : 'text-[var(--loss)]'}`}>
                      {focusMode ? '—' : formatCurrency(row.pnl)}
                    </td>
                    <td className="py-2 sm:py-2.5">
                      <span className="text-[var(--gain)]">{row.wins}W</span>
                      {' '}/{' '}
                      <span className="text-[var(--loss)]">{row.losses}L</span>
                    </td>
                    <td className="py-2 sm:py-2.5 hidden sm:table-cell">{row.discipline !== null ? `${row.discipline}%` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      </>)}

    </div>
  );
}
