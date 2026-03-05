'use client';

import { useState, useMemo, Fragment } from 'react';
import { Trade, JournalEntry, EmotionState, CircuitBreakerEvent, TriggerEntry, DailyReflection as DailyReflectionType, WeeklyReview } from '@/lib/types';
import { EMOTION_OPTIONS, getDisciplineScore, getCoolingOffPairs, getEmotionalRuleMap } from '@/lib/utils';
import { Brain, Shield, AlertTriangle, RefreshCw, Heart, Activity, Zap, ChevronRight, Lightbulb, X, Check, Minus } from 'lucide-react';
import { format, subDays } from 'date-fns';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { useCurrency } from '@/hooks/useCurrency';

interface Props {
  trades: Trade[];
  entries: JournalEntry[];
  onAddEntry: (entry: Omit<JournalEntry, 'id' | 'createdAt'>) => void;
  onUpdateEntry: (id: string, updates: Partial<JournalEntry>) => void;
  onDeleteEntry: (id: string) => void;
  breakerEvents?: CircuitBreakerEvent[];
  triggers?: TriggerEntry[];
  onAddTrigger?: (trigger: Omit<TriggerEntry, 'id' | 'createdAt'>) => void;
  onDeleteTrigger?: (id: string) => void;
  reflections?: DailyReflectionType[];
  onAddReflection?: (r: Omit<DailyReflectionType, 'id' | 'createdAt'>) => void;
  reviews?: WeeklyReview[];
  onAddReview?: (r: Omit<WeeklyReview, 'id' | 'createdAt'>) => void;
}

// Emotional state categories
type BehaviorState = 'Calm' | 'Focused' | 'Heated' | 'Tilted' | 'Revenge';

function classifyEmotion(emotion: EmotionState): BehaviorState {
  switch (emotion) {
    case 'Calm': case 'Neutral': return 'Calm';
    case 'Confident': case 'Excited': return 'Focused';
    case 'FOMO': case 'Greedy': case 'Impatient': case 'Overconfident': return 'Heated';
    case 'Fearful': case 'Anxious': case 'Frustrated': return 'Tilted';
    case 'Revenge Trading': return 'Revenge';
    default: return 'Calm';
  }
}

const STATE_COLORS: Record<BehaviorState, string> = {
  Calm: '#22c55e',
  Focused: '#3b82f6',
  Heated: '#f59e0b',
  Tilted: '#ef4444',
  Revenge: '#dc2626',
};

// Bias detection types
const BIAS_LABELS = ['Overconfidence', 'Loss Aversion', 'Recency Bias', 'FOMO', 'Anchoring', 'Sunk Cost'] as const;

export default function PsychologyJournal({
  trades, entries, onAddEntry, onUpdateEntry, onDeleteEntry, breakerEvents = [],
  triggers = [], onAddTrigger, onDeleteTrigger,
  reflections = [], onAddReflection,
  reviews = [], onAddReview,
}: Props) {
  const { formatCurrency } = useCurrency();
  // Closed trades (time filtering handled by universal top-bar filter)
  const windowedTrades = useMemo(() => {
    return trades.filter(t => !t.isOpen && t.actualPnL !== null);
  }, [trades]);

  // ── Core Metrics ──
  const m = useMemo(() => {
    const closed = windowedTrades;
    const sorted = [...closed].sort((a, b) => new Date(a.exitDate ?? a.entryDate).getTime() - new Date(b.exitDate ?? b.entryDate).getTime());
    const totalPnL = closed.reduce((s, t) => s + t.actualPnL!, 0);
    const wins = closed.filter(t => t.actualPnL! > 0);
    const losses = closed.filter(t => t.actualPnL! <= 0);

    // Discipline score
    const withRules = closed.filter(t => t.ruleChecklist && t.ruleChecklist.length > 0);
    const totalRules = withRules.reduce((s, t) => s + t.ruleChecklist.length, 0);
    const followedRules = withRules.reduce((s, t) => s + t.ruleChecklist.filter(r => r.compliance !== 'no').length, 0);
    const disciplineScore = totalRules > 0 ? Math.round((followedRules / totalRules) * 100) : 0;

    // Emotional control: how often calm/focused vs heated/tilted/revenge
    const emotionStates = closed.map(t => classifyEmotion(t.emotion));
    const calmFocused = emotionStates.filter(s => s === 'Calm' || s === 'Focused').length;
    const emotionalControl = closed.length > 0 ? Math.round((calmFocused / closed.length) * 100) : 0;

    // Risk management: stop loss usage rate
    const withStopLoss = closed.filter(t => t.stopLoss !== null && t.stopLoss !== undefined).length;
    const riskMgmt = closed.length > 0 ? Math.round((withStopLoss / closed.length) * 100) : 0;

    // Consistency: standard deviation of daily P&L
    const dailyPnls = Array.from(new Map(closed.map(t => {
      const d = format(new Date(t.exitDate ?? t.entryDate), 'yyyy-MM-dd');
      return [d, closed.filter(t2 => format(new Date(t2.exitDate ?? t2.entryDate), 'yyyy-MM-dd') === d).reduce((s, t2) => s + t2.actualPnL!, 0)];
    })).values());
    const dailyMean = dailyPnls.length > 0 ? dailyPnls.reduce((s, v) => s + v, 0) / dailyPnls.length : 0;
    const dailyStdDev = dailyPnls.length > 1 ? Math.sqrt(dailyPnls.reduce((s, v) => s + (v - dailyMean) ** 2, 0) / (dailyPnls.length - 1)) : 0;
    const consistency = dailyPnls.length > 1 ? Math.max(0, Math.min(100, Math.round(100 - (dailyStdDev / (Math.abs(dailyMean) || 1)) * 20))) : 0;

    // Composite health score (weighted average)
    const healthScore = Math.round(disciplineScore * 0.3 + emotionalControl * 0.25 + riskMgmt * 0.25 + consistency * 0.2);
    const healthLabel = healthScore >= 80 ? 'Robust' : healthScore >= 60 ? 'Stable' : healthScore >= 40 ? 'Fragile' : 'Critical';

    // Tilt pressure: based on loss response and sequence stress
    const recentLosses = sorted.slice(-5).filter(t => t.actualPnL! < 0).length;
    const tiltPressure = Math.round(Math.min(100, recentLosses * 20));
    const nextTradeLossRisk = sorted.length > 0 && sorted[sorted.length - 1].actualPnL! < 0 ? Math.round(tiltPressure * 0.8) : 0;

    // Revenge clusters
    const revengeTrades: Trade[][] = [];
    let currentCluster: Trade[] = [];
    for (let i = 0; i < sorted.length; i++) {
      if (sorted[i].actualPnL! < 0 && i + 1 < sorted.length) {
        const gap = new Date(sorted[i + 1].entryDate).getTime() - new Date(sorted[i].exitDate ?? sorted[i].entryDate).getTime();
        if (gap < 30 * 60000) {
          if (currentCluster.length === 0) currentCluster.push(sorted[i]);
          currentCluster.push(sorted[i + 1]);
        } else if (currentCluster.length > 0) {
          revengeTrades.push([...currentCluster]);
          currentCluster = [];
        }
      }
    }
    if (currentCluster.length > 0) revengeTrades.push(currentCluster);
    const revengeClusterCount = revengeTrades.length;
    const revengeClusterPnL = revengeTrades.flat().reduce((s, t) => s + t.actualPnL!, 0);
    const avgClusterSize = revengeClusterCount > 0 ? revengeTrades.reduce((s, c) => s + c.length, 0) / revengeClusterCount : 0;

    // Recovery profile
    const lossPeriods: { start: number; end: number; trades: number }[] = [];
    let inLoss = false;
    let lossStart = 0;
    let lossTrades = 0;
    sorted.forEach((t, i) => {
      if (t.actualPnL! < 0) {
        if (!inLoss) { inLoss = true; lossStart = i; lossTrades = 0; }
        lossTrades++;
      } else if (inLoss) {
        lossPeriods.push({ start: lossStart, end: i, trades: lossTrades });
        inLoss = false;
      }
    });
    const avgRecoveryTrades = lossPeriods.length > 0 ? lossPeriods.reduce((s, p) => s + p.trades, 0) / lossPeriods.length : 0;
    const avgRecoveryDays = lossPeriods.length > 0 ? lossPeriods.reduce((s, p) => {
      const startDate = new Date(sorted[p.start].entryDate);
      const endDate = new Date(sorted[p.end].exitDate ?? sorted[p.end].entryDate);
      return s + (endDate.getTime() - startDate.getTime()) / 86400000;
    }, 0) / lossPeriods.length : 0;

    // Streaks
    let currentStreak = 0;
    let currentType: 'win' | 'loss' | null = null;
    let maxLossStreak = 0;
    let maxWinStreak = 0;
    let curWin = 0;
    let curLoss = 0;
    sorted.forEach(t => {
      if (t.actualPnL! > 0) { curWin++; curLoss = 0; maxWinStreak = Math.max(maxWinStreak, curWin); }
      else { curLoss++; curWin = 0; maxLossStreak = Math.max(maxLossStreak, curLoss); }
    });
    if (sorted.length > 0) {
      currentType = sorted[sorted.length - 1].actualPnL! > 0 ? 'win' : 'loss';
      currentStreak = currentType === 'win' ? curWin : curLoss;
    }

    // Signal snapshot metrics
    const fastTrades = closed.filter(t => {
      if (!t.exitDate) return false;
      const hold = (new Date(t.exitDate).getTime() - new Date(t.entryDate).getTime()) / 60000;
      return hold < 5;
    });
    const fastTradeRatio = closed.length > 0 ? (fastTrades.length / closed.length) * 100 : 0;

    const nightTrades = closed.filter(t => {
      const hour = new Date(t.entryDate).getUTCHours();
      return hour >= 22 || hour < 6;
    });
    const nightRatio = closed.length > 0 ? (nightTrades.length / closed.length) * 100 : 0;

    // Size spike: trades where capital > 2x average
    const avgCapital = closed.length > 0 ? closed.reduce((s, t) => s + t.capital, 0) / closed.length : 0;
    const sizeSpikes = closed.filter(t => t.capital > avgCapital * 2);
    const sizeSpkRatio = closed.length > 0 ? (sizeSpikes.length / closed.length) * 100 : 0;

    // Average gap between trades
    const gaps: number[] = [];
    for (let i = 1; i < sorted.length; i++) {
      gaps.push((new Date(sorted[i].entryDate).getTime() - new Date(sorted[i - 1].exitDate ?? sorted[i - 1].entryDate).getTime()) / 60000);
    }
    const avgGap = gaps.length > 0 ? gaps.reduce((s, v) => s + v, 0) / gaps.length : 0;

    // Overtrade days: days with > 5 trades
    const tradeDays = new Map<string, number>();
    closed.forEach(t => {
      const d = format(new Date(t.entryDate), 'yyyy-MM-dd');
      tradeDays.set(d, (tradeDays.get(d) ?? 0) + 1);
    });
    const overtradeDays = Array.from(tradeDays.values()).filter(c => c > 5).length;

    // Behavior state distribution
    const stateDistribution: Record<BehaviorState, number> = { Calm: 0, Focused: 0, Heated: 0, Tilted: 0, Revenge: 0 };
    closed.forEach(t => { stateDistribution[classifyEmotion(t.emotion)]++; });
    const statePercent: Record<BehaviorState, number> = {} as any;
    (Object.keys(stateDistribution) as BehaviorState[]).forEach(k => {
      statePercent[k] = closed.length > 0 ? Math.round((stateDistribution[k] / closed.length) * 100) : 0;
    });
    const productivePercent = statePercent.Calm + statePercent.Focused;
    const riskyPercent = statePercent.Heated + statePercent.Tilted;
    const failurePercent = statePercent.Revenge;

    // Session-based emotional flow
    const sessionDays = new Map<string, { date: string; trades: Trade[]; pnl: number; pressure: number; state: BehaviorState }>();
    closed.forEach(t => {
      const d = format(new Date(t.exitDate ?? t.entryDate), 'yyyy-MM-dd');
      const prev = sessionDays.get(d) ?? { date: d, trades: [], pnl: 0, pressure: 0, state: 'Calm' as BehaviorState };
      prev.trades.push(t);
      prev.pnl += t.actualPnL!;
      sessionDays.set(d, prev);
    });
    const sessions = Array.from(sessionDays.values()).map((s, i) => {
      const states = s.trades.map(t => classifyEmotion(t.emotion));
      const heatedCount = states.filter(st => st === 'Heated' || st === 'Tilted' || st === 'Revenge').length;
      const pressure = s.trades.length > 0 ? Math.round((heatedCount / s.trades.length) * 100) : 0;
      const dominantState = (['Revenge', 'Tilted', 'Heated', 'Focused', 'Calm'] as BehaviorState[]).find(st => states.includes(st)) ?? 'Calm';
      return { ...s, pressure, state: dominantState, sessionNum: i + 1 };
    }).sort((a, b) => a.date.localeCompare(b.date));

    // Session heatmap: day × hour
    const heatmap = new Map<string, { pnl: number; trades: number }>();
    const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    closed.forEach(t => {
      const d = new Date(t.entryDate);
      const day = DAYS[(d.getUTCDay() + 6) % 7]; // Monday first
      const hour = d.getUTCHours();
      const key = `${day}-${hour}`;
      const prev = heatmap.get(key) ?? { pnl: 0, trades: 0 };
      prev.pnl += t.actualPnL!;
      prev.trades++;
      heatmap.set(key, prev);
    });

    // Heatmap summary stats
    let bestWindow = { key: '', pnl: -Infinity, trades: 0 };
    let worstWindow = { key: '', pnl: Infinity, trades: 0 };
    let mostActiveWindow = { key: '', trades: 0, pnl: 0 };
    let highestWrWindow = { key: '', wr: 0, trades: 0, pnl: 0 };
    const activeWindows: { pnl: number; trades: number; wins: number }[] = [];

    heatmap.forEach((v, k) => {
      if (v.pnl > bestWindow.pnl) bestWindow = { key: k, ...v };
      if (v.pnl < worstWindow.pnl) worstWindow = { key: k, ...v };
      if (v.trades > mostActiveWindow.trades) mostActiveWindow = { key: k, ...v };
      const windowTrades = closed.filter(t => {
        const d = new Date(t.entryDate);
        const day = DAYS[(d.getUTCDay() + 6) % 7];
        const hour = d.getUTCHours();
        return `${day}-${hour}` === k;
      });
      const windowWins = windowTrades.filter(t => t.actualPnL! > 0).length;
      const wr = windowTrades.length > 0 ? Math.round((windowWins / windowTrades.length) * 100) : 0;
      if (wr > highestWrWindow.wr || (wr === highestWrWindow.wr && v.trades > highestWrWindow.trades)) {
        highestWrWindow = { key: k, wr, trades: v.trades, pnl: v.pnl };
      }
      activeWindows.push({ pnl: v.pnl, trades: v.trades, wins: windowWins });
    });

    const totalActiveWins = activeWindows.reduce((s, w) => s + w.wins, 0);
    const totalActiveTrades = activeWindows.reduce((s, w) => s + w.trades, 0);
    const avgWindowWr = totalActiveTrades > 0 ? Math.round((totalActiveWins / totalActiveTrades) * 100) : 0;
    const medianWindowPnl = activeWindows.length > 0
      ? [...activeWindows].sort((a, b) => a.pnl - b.pnl)[Math.floor(activeWindows.length / 2)].pnl
      : 0;
    const avgExpectancy = totalActiveTrades > 0 ? totalPnL / totalActiveTrades : 0;

    // Cognitive bias detection
    const biases: Record<string, number> = {};
    BIAS_LABELS.forEach(b => biases[b] = 0);

    // Overconfidence: profitable trades followed by bigger size
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i - 1].actualPnL! > 0 && sorted[i].capital > sorted[i - 1].capital * 1.3) biases['Overconfidence']++;
    }
    // Loss Aversion: early exits on winners (exit before potential target)
    losses.forEach(t => {
      if (t.emotion === 'Fearful' || t.emotion === 'Anxious') biases['Loss Aversion']++;
    });
    // Recency Bias: same coin traded right after a result
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i].coin === sorted[i - 1].coin) {
        const gap = new Date(sorted[i].entryDate).getTime() - new Date(sorted[i - 1].exitDate ?? sorted[i - 1].entryDate).getTime();
        if (gap < 60 * 60000) biases['Recency Bias']++;
      }
    }
    // FOMO
    biases['FOMO'] = closed.filter(t => t.emotion === 'FOMO').length;
    // Anchoring: same entry price area
    // Sunk Cost: holding losers much longer than winners
    const winHolds = wins.map(t => t.exitDate ? new Date(t.exitDate).getTime() - new Date(t.entryDate).getTime() : 0).filter(h => h > 0);
    const lossHolds = losses.map(t => t.exitDate ? new Date(t.exitDate).getTime() - new Date(t.entryDate).getTime() : 0).filter(h => h > 0);
    const avgWinHold = winHolds.length > 0 ? winHolds.reduce((s, v) => s + v, 0) / winHolds.length : 0;
    const avgLossHold = lossHolds.length > 0 ? lossHolds.reduce((s, v) => s + v, 0) / lossHolds.length : 0;
    if (avgLossHold > avgWinHold * 2 && lossHolds.length > 2) biases['Sunk Cost'] = Math.round((avgLossHold / avgWinHold - 1) * 10);

    const topBias = BIAS_LABELS.reduce((max, b) => biases[b] > biases[max] ? b : max, BIAS_LABELS[0]);

    // Discipline tracker: last 28 days compliance
    const last28 = Array.from({ length: 28 }, (_, i) => {
      const d = format(subDays(new Date(), 27 - i), 'yyyy-MM-dd');
      const dayTrades = closed.filter(t => format(new Date(t.exitDate ?? t.entryDate), 'yyyy-MM-dd') === d);
      if (dayTrades.length === 0) return { date: d, status: 'none' as const };
      const dayRules = dayTrades.flatMap(t => t.ruleChecklist ?? []);
      if (dayRules.length === 0) return { date: d, status: 'none' as const };
      const allFollowed = dayRules.every(r => r.compliance !== 'no');
      return { date: d, status: allFollowed ? 'pass' as const : 'fail' as const };
    });
    const complianceDays = last28.filter(d => d.status === 'pass').length;
    const totalRuleDays = last28.filter(d => d.status !== 'none').length;
    const compliancePercent = totalRuleDays > 0 ? Math.round((complianceDays / totalRuleDays) * 100) : 0;
    let bestComplianceStreak = 0;
    let curCompStreak = 0;
    last28.forEach(d => {
      if (d.status === 'pass') { curCompStreak++; bestComplianceStreak = Math.max(bestComplianceStreak, curCompStreak); }
      else if (d.status === 'fail') curCompStreak = 0;
    });

    // Best edge
    const bestEdge = Math.max(0, ...wins.map(t => t.actualPnL!));

    // Immediate focus
    const immediateActions: string[] = [];
    if (revengeClusterCount > 0) immediateActions.push('Revenge clusters detected. Add a mandatory 30-min cool-off rule after any loss.');
    if (sizeSpkRatio > 20) immediateActions.push('Size spikes are eroding edge. Cap position size at 1.5x average.');
    if (fastTradeRatio > 30) immediateActions.push('Too many fast trades. Add a checklist step before every entry.');
    if (immediateActions.length === 0) immediateActions.push('No dominant leak in this period. Keep process stability and continue review coverage.');

    // Scorecard
    const scorecardValue = (disciplineScore * 0.35 + emotionalControl * 0.25 + riskMgmt * 0.2 + consistency * 0.2) / 10;
    const scorecardLabel = scorecardValue >= 8 ? 'ELITE' : scorecardValue >= 6 ? 'HIGH' : scorecardValue >= 4 ? 'MEDIUM' : 'LOW';
    const executionQuality = disciplineScore;
    const opportunityCapture = closed.length > 0 ? Math.round((wins.length / closed.length) * 100 * 0.67 + disciplineScore * 0.33) : 0;

    // Strongest edge & risk loop
    const edgeStrengths: { label: string; desc: string }[] = [];
    if (nightRatio < 10) edgeStrengths.push({ label: 'Session discipline', desc: 'Low night-hour exposure' });
    if (disciplineScore >= 80) edgeStrengths.push({ label: 'Rule compliance', desc: `${disciplineScore}% rule adherence` });
    if (emotionalControl >= 70) edgeStrengths.push({ label: 'Emotional stability', desc: `${emotionalControl}% calm/focused state` });
    if (edgeStrengths.length === 0) edgeStrengths.push({ label: 'Building data', desc: 'Need more trades for pattern detection' });

    const riskLoops: { label: string; desc: string }[] = [];
    if (revengeClusterCount > 0) riskLoops.push({ label: 'Revenge cascade pattern', desc: `${revengeClusterCount} clusters detected with ${formatCurrency(Math.abs(revengeClusterPnL))} impact` });
    if (biases['Overconfidence'] > 5) riskLoops.push({ label: 'Overconfidence sizing', desc: 'Position sizes increase after wins' });
    if (riskLoops.length === 0) riskLoops.push({ label: 'No weakness signal in this range.', desc: 'No high-confidence weakness detected in the selected range.' });

    return {
      closed, sorted, totalPnL, wins: wins.length, losses: losses.length,
      healthScore, healthLabel, disciplineScore, emotionalControl, riskMgmt, consistency,
      tiltPressure, nextTradeLossRisk, revengeClusterCount, revengeClusterPnL, avgClusterSize,
      avgRecoveryTrades, avgRecoveryDays,
      currentStreak, currentType, maxLossStreak, maxWinStreak,
      fastTradeRatio, nightRatio, sizeSpkRatio, avgGap, overtradeDays,
      statePercent, productivePercent, riskyPercent, failurePercent,
      sessions, heatmap,
      bestWindow, worstWindow, mostActiveWindow, highestWrWindow,
      avgWindowWr, medianWindowPnl, avgExpectancy,
      biases, topBias,
      last28, compliancePercent, bestComplianceStreak,
      bestEdge, immediateActions, scorecardValue, scorecardLabel, executionQuality, opportunityCapture,
      edgeStrengths, riskLoops, stateDistribution,
    };
  }, [windowedTrades, formatCurrency]);

  // Selected session
  const [selectedSessionIdx, setSelectedSessionIdx] = useState(0);
  const selectedSession = m.sessions[selectedSessionIdx] ?? null;

  const pnlColor = (v: number) => v > 0 ? 'text-emerald-400' : v < 0 ? 'text-red-400' : 'text-[var(--foreground)]';
  const fmtPnl = (v: number) => `${v >= 0 ? '+' : ''}${formatCurrency(v)}`;

  const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const HOURS = Array.from({ length: 24 }, (_, i) => i);

  return (
    <div className="space-y-5 px-4 sm:px-6 py-6 max-w-[1400px] mx-auto">
      {/* ── Hero ── */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-4">
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <span className="px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-400 text-xs font-semibold flex items-center gap-1.5">
              <Brain size={14} /> BEHAVIOR COMMAND CENTER
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[var(--foreground)] mb-3">
            Decode the Process Behind Your P&L
          </h1>
          <p className="text-sm text-[var(--muted-foreground)] mb-5 max-w-xl">
            This page maps behavior risk, emotional drift, and discipline leakage into concrete operating rules.
            Fix one top behavior loop at a time and validate in the next trading block.
          </p>
          <div className="flex items-center flex-wrap gap-2">
            <span className="px-3 py-1 rounded-full bg-[var(--muted)] text-[var(--muted-foreground)] text-xs">
              {m.closed.length} trades analyzed
            </span>
          </div>
        </div>

        {/* Right: Immediate Focus + Scorecard */}
        <div className="space-y-4">
          <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              <span className="text-[10px] text-amber-400 uppercase tracking-wider font-semibold">Immediate Focus</span>
            </div>
            <p className="text-sm text-[var(--foreground)] font-medium mb-1">{m.immediateActions[0]}</p>
            {m.closed.length < 10 && (
              <p className="text-xs text-[var(--muted-foreground)] mt-1">Behavior engine needs enough diverse trade context to identify high-confidence weaknesses.</p>
            )}
            <div className="flex items-center gap-2 mt-3">
              <span className="px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-400 text-[10px] font-semibold">
                Best edge {fmtPnl(m.bestEdge)}
              </span>
            </div>
          </div>

          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] text-[var(--muted-foreground)] uppercase tracking-wider font-semibold">Scorecard</span>
              <span className={`text-xs font-semibold ${m.scorecardLabel === 'ELITE' ? 'text-emerald-400' : m.scorecardLabel === 'HIGH' ? 'text-blue-400' : m.scorecardLabel === 'MEDIUM' ? 'text-amber-400' : 'text-red-400'}`}>
                {m.scorecardLabel}
              </span>
            </div>
            <div className="text-3xl font-bold text-[var(--foreground)] mb-3">{m.scorecardValue.toFixed(1)}</div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[var(--muted-foreground)]">Execution Quality</span>
                <span className="font-semibold text-[var(--foreground)]">{m.executionQuality}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-[var(--muted-foreground)]">Discipline Consistency</span>
                <span className="font-semibold text-[var(--foreground)]">{m.disciplineScore}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-[var(--muted-foreground)]">Opportunity Capture</span>
                <span className="font-semibold text-[var(--foreground)]">{m.opportunityCapture}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── 4 Stat Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        {[
          { label: 'HEALTH SCORE', icon: <Shield size={16} />, desc: 'Composite behavior quality signal across discipline, risk, and emotional control.',
            value: m.healthScore, valueSub: `${m.healthLabel} \u2022 Trend ${m.sessions.length > 1 ? '↑' : '0'}%`, color: m.healthScore >= 60 ? 'text-emerald-400' : m.healthScore >= 40 ? 'text-amber-400' : 'text-red-400' },
          { label: 'TILT PRESSURE', icon: <Zap size={16} />, desc: 'Short-term reactivity pressure based on loss response and sequence stress.',
            value: m.tiltPressure, valueSub: `Risk ${m.tiltPressure < 40 ? 'Stable' : m.tiltPressure < 70 ? 'Elevated' : 'Critical'} \u2022 Next-trade loss ${m.nextTradeLossRisk.toFixed(1)}%`, color: m.tiltPressure < 40 ? 'text-emerald-400' : m.tiltPressure < 70 ? 'text-amber-400' : 'text-red-400' },
          { label: 'REVENGE CLUSTERS', icon: <AlertTriangle size={16} />, desc: 'Loss-driven cascades detected from executed trades in this date range.',
            value: m.revengeClusterCount, valueSub: `Cluster net ${formatCurrency(m.revengeClusterPnL)} \u2022 Avg ${m.avgClusterSize.toFixed(1)} trades/cluster`, color: m.revengeClusterCount === 0 ? 'text-emerald-400' : 'text-red-400' },
          { label: 'RECOVERY PROFILE', icon: <RefreshCw size={16} />, desc: 'Average recovery effort and time after adverse trading periods.',
            value: m.avgRecoveryTrades.toFixed(1), valueSub: `Avg trades to recover \u2022 ${m.avgRecoveryDays.toFixed(1)} days average`, color: 'text-[var(--foreground)]' },
        ].map(card => (
          <div key={card.label} className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-4 sm:p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] text-[var(--muted-foreground)] uppercase tracking-wider font-semibold">{card.label}</span>
              <span className="text-[var(--muted-foreground)]">{card.icon}</span>
            </div>
            <p className="text-xs text-[var(--muted-foreground)] mb-3">{card.desc}</p>
            <div className={`text-2xl font-bold ${card.color}`}>{card.value}</div>
            <div className="text-[10px] text-[var(--muted-foreground)] mt-1">{card.valueSub}</div>
          </div>
        ))}
      </div>

      {/* ── Behavioral Health Score Gauge + Breakdown ── */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5">
        <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-6">
          {/* SVG Gauge */}
          <div className="flex flex-col items-center justify-center">
            <svg viewBox="0 0 200 200" className="w-48 h-48 sm:w-56 sm:h-56">
              <circle cx="100" cy="100" r="85" fill="none" stroke="var(--border)" strokeWidth="12" strokeLinecap="round"
                strokeDasharray={`${85 * 2 * Math.PI * 0.75} ${85 * 2 * Math.PI * 0.25}`}
                transform="rotate(135 100 100)" />
              <circle cx="100" cy="100" r="85" fill="none" stroke="#22d3ee" strokeWidth="12" strokeLinecap="round"
                strokeDasharray={`${85 * 2 * Math.PI * 0.75 * (m.healthScore / 100)} ${85 * 2 * Math.PI}`}
                transform="rotate(135 100 100)" className="transition-all duration-700" />
              <text x="100" y="95" textAnchor="middle" className="fill-[var(--foreground)]" fontSize="42" fontWeight="bold" fontFamily="var(--font-sans), system-ui, sans-serif">{m.healthScore}</text>
              <text x="100" y="120" textAnchor="middle" className={m.healthScore >= 60 ? 'fill-emerald-400' : m.healthScore >= 40 ? 'fill-amber-400' : 'fill-red-400'} fontSize="14" fontWeight="600">{m.healthLabel.toUpperCase()}</text>
            </svg>
            <div className="text-sm font-medium text-[var(--muted-foreground)] mt-2">Behavioral Health Score</div>
          </div>

          {/* Breakdown bars + trend */}
          <div className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { label: 'Discipline', value: m.disciplineScore, icon: <Activity size={14} />, color: m.disciplineScore >= 70 ? '#3b82f6' : m.disciplineScore >= 40 ? '#f59e0b' : '#ef4444' },
                { label: 'Emotional Control', value: m.emotionalControl, icon: <Heart size={14} />, color: m.emotionalControl >= 70 ? '#22c55e' : m.emotionalControl >= 40 ? '#f59e0b' : '#ef4444' },
                { label: 'Risk Mgmt', value: m.riskMgmt, icon: <Shield size={14} />, color: m.riskMgmt >= 70 ? '#22c55e' : m.riskMgmt >= 40 ? '#f59e0b' : '#ef4444' },
                { label: 'Consistency', value: m.consistency, icon: <Activity size={14} />, color: m.consistency >= 70 ? '#22c55e' : m.consistency >= 40 ? '#f59e0b' : '#ef4444' },
              ].map(bar => (
                <div key={bar.label} className="bg-[var(--muted)]/30 border border-[var(--border)] rounded-xl p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-[var(--foreground)]">
                      {bar.icon} {bar.label}
                    </div>
                    <span className="text-sm font-bold text-[var(--foreground)]">{bar.value}</span>
                  </div>
                  <div className="h-2 rounded-full bg-[var(--border)] overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${bar.value}%`, backgroundColor: bar.color }} />
                  </div>
                </div>
              ))}
            </div>

            {/* 1 Day Trend */}
            {m.sessions.length > 1 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-[var(--muted-foreground)]">1 Day Trend</span>
                  <span className="text-xs text-[var(--muted-foreground)]">Stable trend</span>
                </div>
                <div className="h-[80px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={m.sessions.map(s => ({ date: s.date, score: Math.round(100 - s.pressure) }))}>
                      <XAxis dataKey="date" tick={false} axisLine={false} />
                      <YAxis domain={[0, 100]} tick={false} axisLine={false} />
                      <Tooltip contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '11px', color: 'var(--foreground)' }}
                        formatter={(v: unknown) => [`Score ${v}`, '']} labelFormatter={(l) => `${l}`} />
                      <Line type="monotone" dataKey="score" stroke="#22d3ee" strokeWidth={2} dot={{ fill: '#ef4444', r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Signal Snapshot + Action Queue ── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-1">
            <Activity size={18} className="text-[var(--muted-foreground)]" />
            <h2 className="text-base font-semibold text-[var(--foreground)]">SIGNAL SNAPSHOT</h2>
          </div>
          <p className="text-xs text-[var(--muted-foreground)] mb-4">Compact readout of behavior frequency, pressure, and streak risk metrics.</p>
          <div className="space-y-0">
            {[
              { label: 'Fast-trade ratio', value: `${m.fastTradeRatio.toFixed(1)}%` },
              { label: 'Night-session ratio', value: `${m.nightRatio.toFixed(1)}%` },
              { label: 'Size spike ratio', value: `${m.sizeSpkRatio.toFixed(1)}%` },
              { label: 'Current streak', value: m.currentType ? `${m.currentStreak} (${m.currentType})` : '0' },
              { label: 'Average gap', value: `${m.avgGap.toFixed(1)}m` },
              { label: 'Overtrade days', value: String(m.overtradeDays) },
              { label: 'Next-trade loss risk', value: `${m.nextTradeLossRisk.toFixed(1)}%` },
              { label: 'Max loss streak', value: String(m.maxLossStreak) },
              { label: 'Max win streak', value: String(m.maxWinStreak) },
              { label: 'Revenge clusters', value: String(m.revengeClusterCount) },
            ].map(row => (
              <div key={row.label} className="flex items-center justify-between py-2.5 border-b border-[var(--border)] last:border-0">
                <span className="text-sm text-[var(--foreground)]">{row.label}</span>
                <span className="text-sm font-semibold text-[var(--foreground)]">{row.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-1">
            <Zap size={18} className="text-[var(--muted-foreground)]" />
            <h2 className="text-base font-semibold text-[var(--foreground)]">ACTION QUEUE</h2>
          </div>
          <p className="text-xs text-[var(--muted-foreground)] mb-4">Top active rule priorities with compliance status and impact telemetry.</p>
          <div className="flex items-center flex-wrap gap-2 mb-4">
            <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-[var(--muted)] text-[var(--foreground)]">Active rules: {m.immediateActions.length}</span>
            <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-red-500/15 text-red-400">At risk: {m.revengeClusterCount}</span>
            <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-amber-500/15 text-amber-400">Watch: {m.overtradeDays}</span>
            <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-500/15 text-emerald-400">On track: {m.immediateActions.length - m.revengeClusterCount}</span>
            <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-[var(--muted)] text-[var(--foreground)]">Avg compliance: {m.compliancePercent}%</span>
          </div>
          <div className="space-y-3">
            {m.immediateActions.map((action, i) => (
              <div key={i} className="bg-[var(--muted)]/30 border border-[var(--border)] rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[var(--muted-foreground)]">P{i + 1}</span>
                    <ChevronRight size={14} className="text-cyan-400" />
                    <span className="text-sm font-semibold text-[var(--foreground)]">{action.split('.')[0]}</span>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${m.revengeClusterCount === 0 && m.overtradeDays === 0 ? 'bg-emerald-500/15 text-emerald-400' : 'bg-amber-500/15 text-amber-400'}`}>
                    {m.revengeClusterCount === 0 && m.overtradeDays === 0 ? 'ON TRACK' : 'WATCH'}
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-[var(--border)] overflow-hidden mb-2">
                  <div className="h-full rounded-full bg-emerald-500" style={{ width: `${m.compliancePercent}%` }} />
                </div>
                <div className="grid grid-cols-2 gap-x-6 text-xs text-[var(--muted-foreground)]">
                  <div>Compliance: <span className="font-semibold text-[var(--foreground)]">{m.compliancePercent}%</span></div>
                  <div>Violations: <span className="font-semibold text-[var(--foreground)]">{m.revengeClusterCount}</span></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Emotional State Flow ── */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5">
        <div className="flex items-center justify-between mb-1">
          <div>
            <h2 className="text-lg font-semibold text-[var(--foreground)]">Emotional State Flow</h2>
            <p className="text-xs text-[var(--muted-foreground)]">Interactive behavior timeline with pressure, PnL, and session context</p>
          </div>
          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${m.productivePercent >= 60 ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'}`}>
            {m.productivePercent}% productive
          </span>
        </div>

        {/* Session stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 mb-4">
          <div className="bg-[var(--muted)]/30 border border-[var(--border)] rounded-xl p-3">
            <div className="text-[10px] text-[var(--muted-foreground)] uppercase">Sessions</div>
            <div className="text-lg font-bold text-[var(--foreground)]">{m.sessions.length}</div>
            <div className="text-[10px] text-[var(--muted-foreground)]">Filtered timeline points</div>
          </div>
          <div className="bg-[var(--muted)]/30 border border-[var(--border)] rounded-xl p-3">
            <div className="text-[10px] text-[var(--muted-foreground)] uppercase">Total Session PnL</div>
            <div className={`text-lg font-bold ${pnlColor(m.totalPnL)}`}>{fmtPnl(m.totalPnL)}</div>
            <div className="text-[10px] text-[var(--muted-foreground)]">{m.closed.length > 0 ? (m.closed.length / m.sessions.length).toFixed(1) : '0'} avg trades/session</div>
          </div>
          <div className="bg-[var(--muted)]/30 border border-[var(--border)] rounded-xl p-3">
            <div className="text-[10px] text-[var(--muted-foreground)] uppercase">Avg Session PnL</div>
            <div className={`text-lg font-bold ${pnlColor(m.sessions.length > 0 ? m.totalPnL / m.sessions.length : 0)}`}>
              {m.sessions.length > 0 ? fmtPnl(m.totalPnL / m.sessions.length) : '$0'}
            </div>
            <div className="text-[10px] text-[var(--muted-foreground)]">Per session outcome baseline</div>
          </div>
          <div className="bg-[var(--muted)]/30 border border-[var(--border)] rounded-xl p-3">
            <div className="text-[10px] text-[var(--muted-foreground)] uppercase">Risky State Share</div>
            <div className={`text-lg font-bold ${m.riskyPercent + m.failurePercent > 40 ? 'text-red-400' : 'text-[var(--foreground)]'}`}>
              {m.riskyPercent + m.failurePercent}%
            </div>
            <div className="text-[10px] text-[var(--muted-foreground)]">Heated + Tilted states</div>
          </div>
        </div>

        {/* State filter pills */}
        <div className="flex items-center flex-wrap gap-2 mb-3">
          <span className="text-[10px] text-[var(--muted-foreground)] uppercase tracking-wider flex items-center gap-1">
            <Activity size={12} /> Filter State
          </span>
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-[var(--muted)] text-[var(--foreground)]">
            All states ({m.closed.length})
          </span>
          {(Object.entries(m.stateDistribution) as [BehaviorState, number][]).filter(([, c]) => c > 0).map(([state, count]) => (
            <span key={state} className="px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-[var(--muted)] text-[var(--foreground)]">
              {state} ({count})
            </span>
          ))}
        </div>

        {/* Session PnL chart */}
        {m.sessions.length > 0 && (
          <div className="h-[240px] mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={m.sessions.map(s => ({ name: s.sessionNum, pnl: s.pnl, pressure: s.pressure }))}
                margin={{ top: 5, right: 40, left: 10, bottom: 5 }}>
                <defs>
                  <linearGradient id="pnlGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} tickLine={false} axisLine={false} />
                <YAxis yAxisId="pnl" tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} tickLine={false} axisLine={false} tickFormatter={v => `$${v}`} />
                <YAxis yAxisId="pressure" orientation="right" domain={[0, 100]} tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '11px', color: 'var(--foreground)' }} />
                <Area yAxisId="pnl" type="monotone" dataKey="pnl" stroke="#3b82f6" strokeWidth={2} fill="url(#pnlGrad)" dot={{ fill: '#3b82f6', r: 4 }} name="PnL" />
                <Line yAxisId="pressure" type="monotone" dataKey="pressure" stroke="#22c55e" strokeWidth={1.5} strokeDasharray="4 4" dot={false} name="Pressure" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* ── Selected Session + State Distribution ── */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_420px] gap-4">
        {/* Selected session */}
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <Zap size={16} className="text-amber-400" />
            <span className="text-[10px] text-[var(--muted-foreground)] uppercase tracking-wider font-semibold">Selected Session</span>
          </div>
          {selectedSession ? (
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="text-lg font-semibold text-[var(--foreground)]">{selectedSession.date}</div>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold`}
                  style={{ backgroundColor: `${STATE_COLORS[selectedSession.state]}20`, color: STATE_COLORS[selectedSession.state] }}>
                  {selectedSession.state}
                </span>
              </div>
              <div className="text-xs text-[var(--muted-foreground)] mb-1">
                Session {selectedSession.sessionNum} | {selectedSession.trades.length} trades | Pressure {selectedSession.pressure}
              </div>
              <div className="text-xs text-[var(--muted-foreground)]">
                {selectedSession.trades.filter(t => t.actualPnL! > 0).length}W/{selectedSession.trades.filter(t => t.actualPnL! <= 0).length}L win rate | {Math.round((selectedSession.trades.filter(t => t.actualPnL! > 0).length / selectedSession.trades.length) * 100)}%
              </div>
              <div className={`text-base font-bold mt-1 ${pnlColor(selectedSession.pnl)}`}>{fmtPnl(selectedSession.pnl)}</div>

              {selectedSession.pressure > 50 && (
                <div className="bg-[var(--muted)]/30 border border-[var(--border)] rounded-lg px-3 py-2 mt-3 text-xs text-[var(--foreground)]">
                  Pressure rising. Add one checklist step before every entry.
                </div>
              )}

              <div className="mt-4">
                <div className="text-[10px] text-[var(--muted-foreground)] uppercase tracking-wider mb-2">Session Trades</div>
                <div className="space-y-1.5">
                  {selectedSession.trades.map(t => (
                    <div key={t.id} className="flex items-center justify-between text-xs py-1.5">
                      <div className="flex items-center gap-3">
                        <span className="font-medium text-[var(--foreground)]">{t.coin}</span>
                        <span className={(t.direction ?? 'long') === 'long' ? 'text-green-400' : 'text-red-400'}>{(t.direction ?? 'long').toUpperCase()}</span>
                      </div>
                      <span className={`font-semibold ${pnlColor(t.actualPnL ?? 0)}`}>{fmtPnl(t.actualPnL ?? 0)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Session navigation */}
              <div className="flex items-center gap-2 mt-4">
                <button disabled={selectedSessionIdx === 0} onClick={() => setSelectedSessionIdx(selectedSessionIdx - 1)}
                  className="px-3 py-1 rounded-lg text-xs bg-[var(--muted)] text-[var(--muted-foreground)] disabled:opacity-30">Prev</button>
                <span className="text-xs text-[var(--muted-foreground)]">{selectedSessionIdx + 1} / {m.sessions.length}</span>
                <button disabled={selectedSessionIdx >= m.sessions.length - 1} onClick={() => setSelectedSessionIdx(selectedSessionIdx + 1)}
                  className="px-3 py-1 rounded-lg text-xs bg-[var(--muted)] text-[var(--muted-foreground)] disabled:opacity-30">Next</button>
              </div>
            </div>
          ) : (
            <p className="text-xs text-[var(--muted-foreground)]">No session data available.</p>
          )}
        </div>

        {/* State Distribution */}
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5">
          <h3 className="text-base font-semibold text-[var(--foreground)] mb-4">STATE DISTRIBUTION</h3>
          <div className="space-y-3">
            {(Object.keys(m.statePercent) as BehaviorState[]).map(state => (
              <div key={state} className="flex items-center gap-3">
                <span className="w-16 text-sm text-[var(--foreground)]">{state}</span>
                <div className="flex-1 h-2 rounded-full bg-[var(--border)] overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-500" style={{ width: `${m.statePercent[state]}%`, backgroundColor: STATE_COLORS[state] }} />
                </div>
                <span className="w-10 text-right text-sm text-[var(--foreground)]">{m.statePercent[state]}%</span>
              </div>
            ))}
          </div>

          {/* Summary badges */}
          <div className="grid grid-cols-3 gap-2 mt-5">
            <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-3 text-center">
              <div className="text-xs font-semibold text-emerald-400 flex items-center justify-center gap-1"><Check size={12} /> Productive {m.productivePercent}%</div>
            </div>
            <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-3 text-center">
              <div className="text-xs font-semibold text-amber-400 flex items-center justify-center gap-1"><AlertTriangle size={12} /> Risky {m.riskyPercent}%</div>
            </div>
            <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-3 text-center">
              <div className="text-xs font-semibold text-red-400 flex items-center justify-center gap-1"><AlertTriangle size={12} /> Failure {m.failurePercent}%</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Revenge Trade Cascade + Session Heatmap ── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5">
          <h2 className="text-lg font-semibold text-[var(--foreground)] mb-1">Revenge Trade Cascade</h2>
          <p className="text-xs text-[var(--muted-foreground)] mb-4">Detected loss clusters from executed trades in this range</p>
          {m.revengeClusterCount === 0 ? (
            <p className="text-sm text-[var(--muted-foreground)]">No revenge clusters detected in this range.</p>
          ) : (
            <div className="space-y-2">
              <div className="text-sm text-[var(--foreground)]">{m.revengeClusterCount} cluster(s) detected</div>
              <div className="text-xs text-[var(--muted-foreground)]">
                Total impact: <span className={pnlColor(m.revengeClusterPnL)}>{fmtPnl(m.revengeClusterPnL)}</span> | Avg {m.avgClusterSize.toFixed(1)} trades/cluster
              </div>
            </div>
          )}
        </div>

        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5">
          <h2 className="text-lg font-semibold text-[var(--foreground)] mb-1">Session Heatmap</h2>
          <p className="text-xs text-[var(--muted-foreground)] mb-2">Real trade outcomes by UTC day and hour</p>
          <div className="text-[10px] text-[var(--muted-foreground)] mb-3">Active cells: {m.heatmap.size}/168 &bull; Trades: {m.closed.length}</div>

          {/* Heatmap grid */}
          <div className="overflow-x-auto">
            <div className="min-w-[500px]">
              <div className="grid" style={{ gridTemplateColumns: '40px repeat(24, 1fr)', gap: '1px' }}>
                <div /> {/* empty corner */}
                {HOURS.map(h => (
                  <div key={h} className="text-center text-[8px] text-[var(--muted-foreground)]">{String(h).padStart(2, '0')}</div>
                ))}
                {DAYS.map(day => (
                  <>
                    <div key={`label-${day}`} className="text-xs text-[var(--muted-foreground)] flex items-center">{day}</div>
                    {HOURS.map(h => {
                      const cell = m.heatmap.get(`${day}-${h}`);
                      return (
                        <div key={`${day}-${h}`}
                          className="aspect-square rounded-sm border border-[var(--border)]"
                          style={{
                            backgroundColor: cell ? (cell.pnl >= 0 ? `rgba(34, 197, 94, ${Math.min(0.8, cell.trades * 0.3)})` : `rgba(239, 68, 68, ${Math.min(0.8, cell.trades * 0.3)})`) : 'transparent',
                          }}
                          title={cell ? `${day} ${h}:00 | ${fmtPnl(cell.pnl)} | ${cell.trades} trades` : `${day} ${h}:00`}
                        />
                      );
                    })}
                  </>
                ))}
              </div>
            </div>
          </div>

          {/* Legend */}
          <div className="flex items-center justify-center gap-4 mt-3">
            <div className="flex items-center gap-1.5 text-[10px] text-[var(--muted-foreground)]">
              <div className="w-3 h-3 rounded-sm bg-emerald-500" /> Profitable
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-[var(--muted-foreground)]">
              <div className="w-3 h-3 rounded-sm bg-red-500" /> Unprofitable
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-[var(--muted-foreground)]">
              <div className="w-3 h-3 rounded-sm border border-[var(--border)]" /> No activity
            </div>
          </div>

          {/* Heatmap summary stats */}
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-2 mt-4">
            {[
              { label: 'BEST NET WINDOW', value: fmtPnl(m.bestWindow.pnl === -Infinity ? 0 : m.bestWindow.pnl), sub: `${m.bestWindow.key.replace('-', ' ')} \u2022 ${m.bestWindow.trades} trades`, color: pnlColor(m.bestWindow.pnl === -Infinity ? 0 : m.bestWindow.pnl) },
              { label: 'WORST NET WINDOW', value: fmtPnl(m.worstWindow.pnl === Infinity ? 0 : m.worstWindow.pnl), sub: `${m.worstWindow.key.replace('-', ' ')} \u2022 ${m.worstWindow.trades} trades`, color: pnlColor(m.worstWindow.pnl === Infinity ? 0 : m.worstWindow.pnl) },
              { label: 'MOST ACTIVE WINDOW', value: `${m.mostActiveWindow.trades} trades`, sub: `${m.mostActiveWindow.key.replace('-', ' ')} \u2022 Net ${fmtPnl(m.mostActiveWindow.pnl)}`, color: 'text-[var(--foreground)]' },
              { label: 'HIGHEST WIN-RATE', value: `${m.highestWrWindow.wr}%`, sub: `${m.highestWrWindow.key.replace('-', ' ')} \u2022 Exp ${fmtPnl(m.avgExpectancy)}/trade`, color: m.highestWrWindow.wr >= 50 ? 'text-emerald-400' : 'text-red-400' },
            ].map(c => (
              <div key={c.label} className="bg-[var(--muted)]/30 border border-[var(--border)] rounded-lg p-2.5">
                <div className="text-[9px] text-[var(--muted-foreground)] uppercase tracking-wider">{c.label}</div>
                <div className={`text-sm font-bold ${c.color}`}>{c.value}</div>
                <div className="text-[9px] text-[var(--muted-foreground)]">{c.sub}</div>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-2 mt-2">
            {[
              { label: 'ACTIVE COVERAGE', value: `${m.heatmap.size > 0 ? Math.round((m.heatmap.size / 168) * 100) : 0}%`, sub: `${m.heatmap.size}/168 active cells` },
              { label: 'AVERAGE WIN-RATE', value: `${m.avgWindowWr}%`, sub: `Across ${m.heatmap.size} active windows` },
              { label: 'MEDIAN WINDOW NET', value: fmtPnl(m.medianWindowPnl), sub: `Total net ${fmtPnl(m.totalPnL)} in ${m.heatmap.size} windows` },
              { label: 'AVERAGE EXPECTANCY', value: `${fmtPnl(m.avgExpectancy)}/trade`, sub: `Best ${fmtPnl(m.bestWindow.pnl === -Infinity ? 0 : m.bestWindow.pnl)} \u2022` },
            ].map(c => (
              <div key={c.label} className="bg-[var(--muted)]/30 border border-[var(--border)] rounded-lg p-2.5">
                <div className="text-[9px] text-[var(--muted-foreground)] uppercase tracking-wider">{c.label}</div>
                <div className="text-sm font-bold text-[var(--foreground)]">{c.value}</div>
                <div className="text-[9px] text-[var(--muted-foreground)]">{c.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Discipline Tracker + Cognitive Bias Profile ── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5">
          <h2 className="text-lg font-semibold text-[var(--foreground)] mb-1">Discipline Tracker</h2>
          <p className="text-xs text-[var(--muted-foreground)] mb-4">Rule compliance & streaks</p>

          <div className="grid grid-cols-3 gap-4 mb-5">
            <div className="text-center">
              <div className="text-2xl font-bold text-[var(--foreground)]">{m.currentStreak}</div>
              <div className="text-[10px] text-[var(--muted-foreground)] uppercase">Current Streak</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-[var(--foreground)]">{m.bestComplianceStreak}</div>
              <div className="text-[10px] text-[var(--muted-foreground)] uppercase">Best Streak</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-[var(--foreground)]">{m.compliancePercent}%</div>
              <div className="text-[10px] text-[var(--muted-foreground)] uppercase">Compliance</div>
            </div>
          </div>

          <div className="text-xs text-[var(--muted-foreground)] mb-2">Last 28 Days</div>
          <div className="grid grid-cols-7 gap-1.5">
            {m.last28.map((d, i) => (
              <div key={i} className={`aspect-square rounded-lg flex items-center justify-center text-xs font-medium ${
                d.status === 'pass' ? 'bg-emerald-500/15 text-emerald-400'
                  : d.status === 'fail' ? 'bg-red-500/15 text-red-400'
                  : 'bg-[var(--muted)]/30 text-[var(--muted-foreground)]'
              }`} title={d.date}>
                {d.status === 'pass' ? <Check size={14} /> : d.status === 'fail' ? <X size={14} /> : <Minus size={10} />}
              </div>
            ))}
          </div>
          {m.closed.length === 0 && (
            <p className="text-xs text-[var(--muted-foreground)] mt-3">No rule-compliance signals for this period.</p>
          )}
        </div>

        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5">
          <h2 className="text-lg font-semibold text-[var(--foreground)] mb-1">Cognitive Bias Profile</h2>
          <p className="text-xs text-[var(--muted-foreground)] mb-4">Psychological exposure analysis</p>

          {/* Radar-style visualization using bars */}
          <div className="space-y-3 mb-4">
            <div className="grid grid-cols-2 gap-2">
              {BIAS_LABELS.map(bias => (
                <div key={bias} className="flex items-center justify-between bg-[var(--muted)]/30 border border-[var(--border)] rounded-lg px-3 py-2">
                  <span className="text-sm text-[var(--foreground)]">{bias}</span>
                  <span className="text-sm font-bold text-[var(--foreground)]">{m.biases[bias]}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Bias focus insight */}
          {m.biases[m.topBias] > 0 && (
            <div className="bg-[var(--muted)]/30 border border-[var(--border)] rounded-xl p-4 mt-3">
              <div className="flex items-center gap-2 mb-1">
                <Lightbulb size={16} className="text-amber-400" />
                <span className="text-sm font-semibold text-[var(--foreground)]">Bias focus: {m.topBias}</span>
              </div>
              <p className="text-xs text-[var(--muted-foreground)]">
                {m.topBias === 'Overconfidence' && 'Sizing tends to expand after wins while high-size trades are less efficient.'}
                {m.topBias === 'FOMO' && 'Fear of missing out is driving entries without proper confirmation.'}
                {m.topBias === 'Loss Aversion' && 'Fear-based exits are cutting winners short.'}
                {m.topBias === 'Recency Bias' && 'Re-entering the same coin too quickly after recent trades.'}
                {m.topBias === 'Sunk Cost' && 'Holding losing positions significantly longer than winners.'}
                {m.topBias === 'Anchoring' && 'Entry decisions may be anchored to previous price levels.'}
              </p>
              <span className="inline-block mt-2 px-2 py-0.5 rounded text-[10px] font-semibold bg-[var(--muted)] text-[var(--muted-foreground)]">
                CONFIDENCE: {m.biases[m.topBias] > 10 ? 'HIGH' : m.biases[m.topBias] > 3 ? 'MEDIUM' : 'LOW'}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ── Behavior Edge Context ── */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-1">
          <RefreshCw size={16} className="text-cyan-400" />
          <span className="text-[10px] text-[var(--muted-foreground)] uppercase tracking-wider font-semibold">Behavior Edge Context</span>
        </div>
        <p className="text-xs text-[var(--muted-foreground)] mb-4">Highest-confidence strength and highest-risk loop with direct narrative context.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-[var(--muted)]/30 border border-[var(--border)] rounded-xl p-4">
            <div className="text-[10px] text-[var(--muted-foreground)] uppercase tracking-wider mb-2">Strongest Behavior Edge</div>
            <div className="text-sm font-semibold text-[var(--foreground)]">{m.edgeStrengths[0].label}</div>
            <p className="text-xs text-[var(--muted-foreground)] mt-1">{m.edgeStrengths[0].desc}</p>
          </div>
          <div className="bg-[var(--muted)]/30 border border-[var(--border)] rounded-xl p-4">
            <div className="text-[10px] text-[var(--muted-foreground)] uppercase tracking-wider mb-2">Highest Risk Loop</div>
            <div className="text-sm font-semibold text-[var(--foreground)]">{m.riskLoops[0].label}</div>
            <p className="text-xs text-[var(--muted-foreground)] mt-1">{m.riskLoops[0].desc}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
