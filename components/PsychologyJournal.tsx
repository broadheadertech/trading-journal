'use client';

import { useState, useMemo, Fragment } from 'react';
import { Trade, JournalEntry, EmotionState, CircuitBreakerEvent, TriggerEntry, DailyReflection as DailyReflectionType, WeeklyReview } from '@/lib/types';
import { EMOTION_OPTIONS, getDisciplineScore, getCoolingOffPairs, getEmotionalRuleMap } from '@/lib/utils';
import { Brain, Shield, AlertTriangle, RefreshCw, Heart, Activity, Zap, ChevronRight, Lightbulb, X, Check, Minus } from 'lucide-react';
import { format, subDays } from 'date-fns';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { useCurrency } from '@/hooks/useCurrency';
import DailyReflection from './DailyReflection';
import TriggerJournal from './TriggerJournal';

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

    // Session heatmap: day Ã— hour
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
    if (revengeClusterCount > 0) riskLoops.push({ label: 'Revenge cascade pattern', desc: `${revengeClusterCount} clusters detected with ${formatCurrency(Math.abs(revengeClusterPnL)).replace(/^\+/, '')} impact` });
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
  // formatCurrency already signs the number — no need to manually prepend '+'.
  const fmtPnl = (v: number) => formatCurrency(v);

  const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const HOURS = Array.from({ length: 24 }, (_, i) => i);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
      {/* Journaling — Daily Reflection + Trigger logging (forms wired to Convex via parent) */}
      {onAddReflection && onAddReview && (
        <DailyReflection
          reflections={reflections}
          reviews={reviews}
          trades={trades}
          onAddReflection={onAddReflection}
          onAddReview={onAddReview}
        />
      )}
      {onAddTrigger && onDeleteTrigger && (
        <TriggerJournal
          triggers={triggers}
          onAdd={onAddTrigger}
          onDelete={onDeleteTrigger}
        />
      )}

      {/* ── Hero ── */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-4">
        <div className="card pwrap" style={{ padding: '39px 28px 34px' }}>
          <span className="accent" style={{ width: 56, background: 'var(--amber)' }} />
          <p style={{ margin: 0, fontWeight: 500, fontSize: '9.5px', color: 'var(--green)', letterSpacing: '.04em', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Brain size={12} /> BEHAVIOR COMMAND CENTER
          </p>
          <h3 style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: 28, lineHeight: '32px', margin: '20px 0 0' }}>
            Decode the Process Behind Your P&L
          </h3>
          <p style={{ margin: '22px 0 0', fontSize: '13.5px', lineHeight: '21px', color: 'var(--muted)', maxWidth: 640 }}>
            This page maps behavior risk, emotional drift, and discipline leakage into concrete operating rules.
            Fix one top behavior loop at a time and validate in the next trading block.
          </p>
          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginTop: 28 }}>
            <span className="chip" style={{ height: 32 }}>{m.closed.length} trades analyzed</span>
          </div>
        </div>

        {/* Right: Immediate Focus + Scorecard */}
        <div className="space-y-4">
          <div className="card" style={{ border: '1px solid #3a2a12', background: '#14100a', padding: '22px 20px' }}>
            <p className="lbl b10" style={{ color: 'var(--amber)' }}>IMMEDIATE FOCUS</p>
            <p style={{ margin: '12px 0 0', fontSize: '12.5px', lineHeight: '20px', color: 'var(--text)' }}>{m.immediateActions[0]}</p>
            {m.closed.length < 10 && (
              <p style={{ margin: '8px 0 0', fontSize: '11.5px', color: 'var(--muted)' }}>Behavior engine needs enough diverse trade context to identify high-confidence weaknesses.</p>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 14 }}>
              <span className="chip" style={{ height: 24, fontSize: '10.5px', color: 'var(--green)' }}>Best edge {fmtPnl(m.bestEdge)}</span>
            </div>
          </div>

          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <p className="lbl b10">SCORECARD</p>
              <span style={{
                marginLeft: 'auto', fontWeight: 700, fontSize: '10.5px',
                color: m.scorecardLabel === 'ELITE' ? 'var(--green)' : m.scorecardLabel === 'HIGH' ? 'var(--teal)' : m.scorecardLabel === 'MEDIUM' ? 'var(--amber)' : 'var(--red)',
              }}>{m.scorecardLabel}</span>
            </div>
            <div style={{ fontFamily: 'var(--mono)', fontWeight: 500, fontSize: 32, lineHeight: '40px', margin: '6px 0 10px' }}>{m.scorecardValue.toFixed(1)}</div>
            <div>
              <div className="mrow"><span className="lb" style={{ marginLeft: 0 }}>Execution Quality</span><span className="val">{m.executionQuality}</span></div>
              <div className="mrow"><span className="lb" style={{ marginLeft: 0 }}>Discipline Consistency</span><span className="val">{m.disciplineScore}</span></div>
              <div className="mrow"><span className="lb" style={{ marginLeft: 0 }}>Opportunity Capture</span><span className="val">{m.opportunityCapture}</span></div>
            </div>
          </div>
        </div>
      </div>

      {/* ── 4 Stat Cards ── */}
      <div className="stats" style={{ marginTop: 0 }}>
        {[
          { label: 'HEALTH SCORE', icon: <Shield size={14} />, accent: 'var(--green)', desc: 'Composite behavior quality signal across discipline, risk, and emotional control.',
            value: m.healthScore, valueSub: `${m.healthLabel} \u2022 Trend ${m.sessions.length > 1 ? 'â†‘' : '0'}%`, color: m.healthScore >= 60 ? 'var(--green)' : m.healthScore >= 40 ? 'var(--amber)' : 'var(--red)' },
          { label: 'TILT PRESSURE', icon: <Zap size={14} />, accent: 'var(--amber)', desc: 'Short-term reactivity pressure based on loss response and sequence stress.',
            value: m.tiltPressure, valueSub: `Risk ${m.tiltPressure < 40 ? 'Stable' : m.tiltPressure < 70 ? 'Elevated' : 'Critical'} \u2022 Next-trade loss ${m.nextTradeLossRisk.toFixed(1)}%`, color: m.tiltPressure < 40 ? 'var(--green)' : m.tiltPressure < 70 ? 'var(--amber)' : 'var(--red)' },
          { label: 'REVENGE CLUSTERS', icon: <AlertTriangle size={14} />, accent: 'var(--pink)', desc: 'Loss-driven cascades detected from executed trades in this date range.',
            value: m.revengeClusterCount, valueSub: `Cluster net ${formatCurrency(m.revengeClusterPnL)} \u2022 Avg ${m.avgClusterSize.toFixed(1)} trades/cluster`, color: m.revengeClusterCount === 0 ? 'var(--green)' : 'var(--red)' },
          { label: 'RECOVERY PROFILE', icon: <RefreshCw size={14} />, accent: 'var(--teal)', desc: 'Average recovery effort and time after adverse trading periods.',
            value: m.avgRecoveryTrades.toFixed(1), valueSub: `Avg trades to recover \u2022 ${m.avgRecoveryDays.toFixed(1)} days average`, color: 'var(--text)' },
        ].map(card => (
          <div key={card.label} className="stat" style={{ height: 'auto', minHeight: 104 }}>
            <span className="accent" style={{ background: card.accent }} />
            <b style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {card.label}<span style={{ marginLeft: 'auto', color: 'var(--muted-3)' }}>{card.icon}</span>
            </b>
            <p style={{ margin: '9px 0 0', fontSize: '11.5px', lineHeight: '17px', color: 'var(--muted-2)' }}>{card.desc}</p>
            <em style={{ color: card.color, marginTop: 6 }}>{card.value}</em>
            <small style={{ display: 'block', fontSize: '10px', color: 'var(--muted-2)', marginTop: 4 }}>{card.valueSub}</small>
          </div>
        ))}
      </div>

      {/* ── Behavioral Health Score Gauge + Breakdown ── */}
      <div className="card">
        <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-6">
          {/* SVG Gauge */}
          <div className="flex flex-col items-center justify-center">
            <svg viewBox="0 0 200 200" className="w-48 h-48 sm:w-56 sm:h-56">
              <circle cx="100" cy="100" r="85" fill="none" stroke="var(--border)" strokeWidth="12" strokeLinecap="round"
                strokeDasharray={`${85 * 2 * Math.PI * 0.75} ${85 * 2 * Math.PI * 0.25}`}
                transform="rotate(135 100 100)" />
              <circle cx="100" cy="100" r="85" fill="none" stroke="#22c55e" strokeWidth="12" strokeLinecap="round"
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
                <div key={bar.label} className="inset">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-[var(--foreground)]">
                      {bar.icon} {bar.label}
                    </div>
                    <span className="text-sm font-bold text-[var(--foreground)]">{bar.value}</span>
                  </div>
                  <div style={{ height: 2, background: "var(--rail)", overflow: "hidden" }}>
                    <div style={{ width: `${bar.value}%`, backgroundColor: bar.color }} />
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
                      <Line type="monotone" dataKey="score" stroke="#22c55e" strokeWidth={2} dot={{ fill: '#ef4444', r: 3 }} />
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
        <div className="card">
          <div className="flex items-center gap-2 mb-1">
            <Activity size={18} className="text-[var(--muted-foreground)]" />
            <h3 style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: 15, lineHeight: '16px', margin: 0 }}>SIGNAL SNAPSHOT</h3>
          </div>
          <p className="sub" style={{ marginBottom: 18 }}>Compact readout of behavior frequency, pressure, and streak risk metrics.</p>
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
              <div key={row.label} className="mrow">
                <span className="lb" style={{ marginLeft: 0 }}>{row.label}</span>
                <span className="val">{row.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="flex items-center gap-2 mb-1">
            <Zap size={18} className="text-[var(--muted-foreground)]" />
            <h3 style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: 15, lineHeight: '16px', margin: 0 }}>ACTION QUEUE</h3>
          </div>
          <p className="sub" style={{ marginBottom: 18 }}>Top active rule priorities with compliance status and impact telemetry.</p>
          <div className="flex items-center flex-wrap gap-2 mb-4">
            <span className="chip" style={{ height: 24, fontSize: "10.5px" }}>Active rules: {m.immediateActions.length}</span>
            <span className="chip" style={{ height: 24, fontSize: "10.5px", color: "var(--red)" }}>At risk: {m.revengeClusterCount}</span>
            <span className="chip" style={{ height: 24, fontSize: "10.5px", color: "var(--amber)" }}>Watch: {m.overtradeDays}</span>
            <span className="chip" style={{ height: 24, fontSize: "10.5px", color: "var(--green)" }}>On track: {m.immediateActions.length - m.revengeClusterCount}</span>
            <span className="chip" style={{ height: 24, fontSize: "10.5px" }}>Avg compliance: {m.compliancePercent}%</span>
          </div>
          <div className="space-y-3">
            {m.immediateActions.map((action, i) => (
              <div key={i} className="inset" style={{ padding: '15px 18px' }}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[var(--muted-foreground)]">P{i + 1}</span>
                    <ChevronRight size={14} className="text-fuchsia-400" />
                    <span className="text-sm font-semibold text-[var(--foreground)]">{action.split('.')[0]}</span>
                  </div>
                  <span className="chip" style={{ height: 22, fontSize: "10px", fontWeight: 700, color: m.revengeClusterCount === 0 && m.overtradeDays === 0 ? "var(--green)" : "var(--amber)" }}>
                    {m.revengeClusterCount === 0 && m.overtradeDays === 0 ? 'ON TRACK' : 'WATCH'}
                  </span>
                </div>
                <div style={{ height: 2, background: "var(--rail)", overflow: "hidden", marginBottom: 10 }}>
                  <div style={{ height: 2, background: "var(--green)" }} style={{ width: `${m.compliancePercent}%` }} />
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
      <div className="card">
        <div className="flex items-center justify-between mb-1">
          <div>
            <h3 style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: 17, lineHeight: '18px', margin: 0 }}>Emotional State Flow</h3>
            <p className="sub">Interactive behavior timeline with pressure, PnL, and session context</p>
          </div>
          <span className="chip" style={{ height: 26, fontWeight: 700, color: m.productivePercent >= 60 ? "var(--green)" : "var(--red)" }}>
            {m.productivePercent}% productive
          </span>
        </div>

        {/* Session stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 mb-4">
          <div className="inset">
            <div className="text-[10px] text-[var(--muted-foreground)] uppercase">Sessions</div>
            <div className="text-lg font-bold text-[var(--foreground)]">{m.sessions.length}</div>
            <div className="text-[10px] text-[var(--muted-foreground)]">Filtered timeline points</div>
          </div>
          <div className="inset">
            <div className="text-[10px] text-[var(--muted-foreground)] uppercase">Total Session PnL</div>
            <div className={`text-lg font-bold ${pnlColor(m.totalPnL)}`}>{fmtPnl(m.totalPnL)}</div>
            <div className="text-[10px] text-[var(--muted-foreground)]">{m.closed.length > 0 ? (m.closed.length / m.sessions.length).toFixed(1) : '0'} avg trades/session</div>
          </div>
          <div className="inset">
            <div className="text-[10px] text-[var(--muted-foreground)] uppercase">Avg Session PnL</div>
            <div className={`text-lg font-bold ${pnlColor(m.sessions.length > 0 ? m.totalPnL / m.sessions.length : 0)}`}>
              {m.sessions.length > 0 ? fmtPnl(m.totalPnL / m.sessions.length) : '$0'}
            </div>
            <div className="text-[10px] text-[var(--muted-foreground)]">Per session outcome baseline</div>
          </div>
          <div className="inset">
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
          <span className="chip" style={{ height: 24, fontSize: "10.5px" }}>
            All states ({m.closed.length})
          </span>
          {(Object.entries(m.stateDistribution) as [BehaviorState, number][]).filter(([, c]) => c > 0).map(([state, count]) => (
            <span key={state} className="chip" style={{ height: 24, fontSize: "10.5px" }}>
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
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} tickLine={false} axisLine={false} />
                <YAxis yAxisId="pnl" tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} tickLine={false} axisLine={false} tickFormatter={v => `$${v}`} />
                <YAxis yAxisId="pressure" orientation="right" domain={[0, 100]} tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '11px', color: 'var(--foreground)' }} />
                <Area yAxisId="pnl" type="monotone" dataKey="pnl" stroke="#22c55e" strokeWidth={2} fill="url(#pnlGrad)" dot={{ fill: '#22c55e', r: 4 }} name="PnL" />
                <Line yAxisId="pressure" type="monotone" dataKey="pressure" stroke="#22c55e" strokeWidth={1.5} strokeDasharray="4 4" dot={false} name="Pressure" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* ── Selected Session + State Distribution ── */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_420px] gap-4">
        {/* Selected session */}
        <div className="card">
          <div className="flex items-center gap-2 mb-3">
            <Zap size={16} className="text-amber-400" />
            <span className="lbl b10">Selected Session</span>
          </div>
          {selectedSession ? (
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="text-lg font-semibold text-[var(--foreground)]">{selectedSession.date}</div>
                <span className="chip"
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
                <div className="inset" style={{ marginTop: 14, fontSize: "12px" }}>
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
                  className="btn-g" style={{ height: 28, padding: "0 14px", fontSize: 12 }}>Prev</button>
                <span className="text-xs text-[var(--muted-foreground)]">{selectedSessionIdx + 1} / {m.sessions.length}</span>
                <button disabled={selectedSessionIdx >= m.sessions.length - 1} onClick={() => setSelectedSessionIdx(selectedSessionIdx + 1)}
                  className="btn-g" style={{ height: 28, padding: "0 14px", fontSize: 12 }}>Next</button>
              </div>
            </div>
          ) : (
            <p className="sub">No session data available.</p>
          )}
        </div>

        {/* State Distribution */}
        <div className="card">
          <h3 style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: 15, lineHeight: '16px', margin: '0 0 18px' }}>STATE DISTRIBUTION</h3>
          <div className="space-y-3">
            {(Object.keys(m.statePercent) as BehaviorState[]).map(state => (
              <div key={state} className="flex items-center gap-3">
                <span className="w-16 text-sm text-[var(--foreground)]">{state}</span>
                <div style={{ flex: 1, height: 2, background: "var(--rail)", overflow: "hidden" }}>
                  <div style={{ width: `${m.statePercent[state]}%`, backgroundColor: STATE_COLORS[state] }} />
                </div>
                <span className="w-10 text-right text-sm text-[var(--foreground)]">{m.statePercent[state]}%</span>
              </div>
            ))}
          </div>

          {/* Summary badges */}
          <div className="grid grid-cols-3 gap-2 mt-5">
            <div className="inset" style={{ padding: "12px 10px", textAlign: "center" }}>
              <div className="text-xs font-semibold text-emerald-400 flex items-center justify-center gap-1"><Check size={12} /> Productive {m.productivePercent}%</div>
            </div>
            <div className="inset" style={{ padding: "12px 10px", textAlign: "center" }}>
              <div className="text-xs font-semibold text-amber-400 flex items-center justify-center gap-1"><AlertTriangle size={12} /> Risky {m.riskyPercent}%</div>
            </div>
            <div className="inset" style={{ padding: "12px 10px", textAlign: "center" }}>
              <div className="text-xs font-semibold text-red-400 flex items-center justify-center gap-1"><AlertTriangle size={12} /> Failure {m.failurePercent}%</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Revenge Trade Cascade + Session Heatmap ── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="card">
          <h3 style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: 17, lineHeight: '18px', margin: 0 }}>Revenge Trade Cascade</h3>
          <p className="sub" style={{ marginBottom: 18 }}>Detected loss clusters from executed trades in this range</p>
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

        <div className="card">
          <h3 style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: 17, lineHeight: '18px', margin: 0 }}>Session Heatmap</h3>
          <p className="sub" style={{ marginBottom: 10 }}>Real trade outcomes by UTC day and hour</p>
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
                  <Fragment key={day}>
                    <div className="text-xs text-[var(--muted-foreground)] flex items-center">{day}</div>
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
                  </Fragment>
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
              <div key={c.label} className="inset" style={{ padding: '10px 12px' }}>
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
              <div key={c.label} className="inset" style={{ padding: '10px 12px' }}>
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
        <div className="card">
          <h3 style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: 17, lineHeight: '18px', margin: 0 }}>Discipline Tracker</h3>
          <p className="sub" style={{ marginBottom: 18 }}>Rule compliance & streaks</p>

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

        <div className="card">
          <h3 style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: 17, lineHeight: '18px', margin: 0 }}>Cognitive Bias Profile</h3>
          <p className="sub" style={{ marginBottom: 18 }}>Psychological exposure analysis</p>

          {/* Radar-style visualization using bars */}
          <div className="space-y-3 mb-4">
            <div className="grid grid-cols-2 gap-2">
              {BIAS_LABELS.map(bias => (
                <div key={bias} className="qrow" style={{ marginTop: 0 }}>
                  <span className="text-sm text-[var(--foreground)]">{bias}</span>
                  <span className="text-sm font-bold text-[var(--foreground)]">{m.biases[bias]}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Bias focus insight */}
          {m.biases[m.topBias] > 0 && (
            <div className="inset" style={{ padding: "15px 18px", marginTop: 14 }}>
              <div className="flex items-center gap-2 mb-1">
                <Lightbulb size={16} className="text-amber-400" />
                <span className="text-sm font-semibold text-[var(--foreground)]">Bias focus: {m.topBias}</span>
              </div>
              <p className="sub">
                {m.topBias === 'Overconfidence' && 'Sizing tends to expand after wins while high-size trades are less efficient.'}
                {m.topBias === 'FOMO' && 'Fear of missing out is driving entries without proper confirmation.'}
                {m.topBias === 'Loss Aversion' && 'Fear-based exits are cutting winners short.'}
                {m.topBias === 'Recency Bias' && 'Re-entering the same coin too quickly after recent trades.'}
                {m.topBias === 'Sunk Cost' && 'Holding losing positions significantly longer than winners.'}
                {m.topBias === 'Anchoring' && 'Entry decisions may be anchored to previous price levels.'}
              </p>
              <span className="chip" style={{ height: 22, marginTop: 10, fontSize: "10px", fontWeight: 700 }}>
                CONFIDENCE: {m.biases[m.topBias] > 10 ? 'HIGH' : m.biases[m.topBias] > 3 ? 'MEDIUM' : 'LOW'}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ── Behavior Edge Context ── */}
      <div className="card">
        <div className="flex items-center gap-2 mb-1">
          <RefreshCw size={16} className="text-fuchsia-400" />
          <span className="lbl b10">Behavior Edge Context</span>
        </div>
        <p className="sub" style={{ marginBottom: 18 }}>Highest-confidence strength and highest-risk loop with direct narrative context.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="inset" style={{ padding: '15px 18px' }}>
            <div className="text-[10px] text-[var(--muted-foreground)] uppercase tracking-wider mb-2">Strongest Behavior Edge</div>
            <div className="text-sm font-semibold text-[var(--foreground)]">{m.edgeStrengths[0].label}</div>
            <p className="text-xs text-[var(--muted-foreground)] mt-1">{m.edgeStrengths[0].desc}</p>
          </div>
          <div className="inset" style={{ padding: '15px 18px' }}>
            <div className="text-[10px] text-[var(--muted-foreground)] uppercase tracking-wider mb-2">Highest Risk Loop</div>
            <div className="text-sm font-semibold text-[var(--foreground)]">{m.riskLoops[0].label}</div>
            <p className="text-xs text-[var(--muted-foreground)] mt-1">{m.riskLoops[0].desc}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
