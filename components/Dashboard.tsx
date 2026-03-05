'use client';

import { useState, useMemo } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  ResponsiveContainer, Tooltip,
} from 'recharts';
import { Trade, Strategy, DailyReflection, TriggerEntry } from '@/lib/types';
import { useCurrency } from '@/hooks/useCurrency';
import {
  getTotalPnL, getWinRate, getEquityCurveData, getCurrentStreak,
  getDrawdownStats,
} from '@/lib/utils';
import {
  TrendingUp, TrendingDown, BarChart3, Target,
  Flame, AlertCircle, ArrowRight, Clock, Calendar,
  Zap, Shield, CircleDot, ChevronRight, Activity,
} from 'lucide-react';
import { format } from 'date-fns';

// ─── Types ─────────────────────────────────────────────────────────────────────
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

// ─── Component ─────────────────────────────────────────────────────────────────
export default function Dashboard({
  trades, strategies, onAddTrade, onNavigate,
  initialCapital = 0, dailyLossLimit, dailyProfitTarget,
}: DashboardProps) {
  const { formatCurrency } = useCurrency();
  const [equityMode, setEquityMode] = useState<'equity' | 'drawdown'>('equity');

  // Trades are already filtered by the universal top-bar time range
  const windowedTrades = trades;

  // ─── All computed metrics ───────────────────────────────────────────────────
  const metrics = useMemo(() => {
    const all = windowedTrades;
    const closed = all.filter(t => !t.isOpen && t.actualPnL !== null);
    const wins = closed.filter(t => t.actualPnL! > 0);
    const losses = closed.filter(t => t.actualPnL! < 0);
    const totalPnL = closed.reduce((s, t) => s + t.actualPnL!, 0);
    const pnlPercent = initialCapital > 0 ? (totalPnL / initialCapital) * 100 : 0;
    const winRate = closed.length > 0 ? (wins.length / closed.length) * 100 : 0;
    const grossProfit = wins.reduce((s, t) => s + t.actualPnL!, 0);
    const grossLoss = Math.abs(losses.reduce((s, t) => s + t.actualPnL!, 0));
    const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0;
    const avgWin = wins.length > 0 ? grossProfit / wins.length : 0;
    const avgLoss = losses.length > 0 ? grossLoss / losses.length : 0;
    const biggestLoss = losses.length > 0 ? Math.min(...losses.map(t => t.actualPnL!)) : 0;

    // Day grouping
    const dayMap = new Map<string, number>();
    closed.forEach(t => {
      const d = format(new Date(t.exitDate ?? t.entryDate), 'yyyy-MM-dd');
      dayMap.set(d, (dayMap.get(d) ?? 0) + t.actualPnL!);
    });
    const days = Array.from(dayMap.entries());
    const bestDay = days.length > 0 ? days.reduce((b, d) => d[1] > b[1] ? d : b, days[0]) : null;
    const worstDay = days.length > 1 ? days.reduce((w, d) => d[1] < w[1] ? d : w, days[0]) : null;
    const avgTrade = closed.length > 0 ? totalPnL / closed.length : 0;
    const tradingDays = dayMap.size;
    const profitableDays = days.filter(([, v]) => v > 0).length;

    // Execution score: WR(0-4) + PF(0-3) + Net(0-3) = 0-10
    const wrScore = Math.min(winRate / 12.5, 4);
    const pfScore = Math.min(profitFactor === Infinity ? 3 : profitFactor, 3);
    const netScore = totalPnL > 0 ? 3 : totalPnL === 0 ? 1.5 : 0;
    const execScore = closed.length >= 3 ? Math.round(wrScore + pfScore + netScore) : 0;

    // Coin P&L aggregation
    const coinMap = new Map<string, { pnl: number; wins: number; total: number }>();
    closed.forEach(t => {
      const prev = coinMap.get(t.coin) ?? { pnl: 0, wins: 0, total: 0 };
      coinMap.set(t.coin, {
        pnl: prev.pnl + t.actualPnL!,
        wins: prev.wins + (t.actualPnL! > 0 ? 1 : 0),
        total: prev.total + 1,
      });
    });
    const coinStats = Array.from(coinMap.entries())
      .map(([coin, v]) => ({ coin, ...v }))
      .sort((a, b) => b.pnl - a.pnl);
    const topPerformers = coinStats.filter(c => c.pnl > 0).slice(0, 5);
    const biggestLeaks = [...coinStats].sort((a, b) => a.pnl - b.pnl).filter(c => c.pnl < 0).slice(0, 5);

    // Activity heatmap: weekday × session
    const sessions = [
      { label: 'Night (00-06)', range: [0, 5] },
      { label: 'Morning (06-12)', range: [6, 11] },
      { label: 'Day (12-18)', range: [12, 17] },
      { label: 'Evening (18-23)', range: [18, 23] },
    ];
    const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const heatmap: { day: number; session: number; pnl: number; count: number }[] = [];
    for (let d = 0; d < 7; d++) {
      for (let s = 0; s < 4; s++) {
        heatmap.push({ day: d, session: s, pnl: 0, count: 0 });
      }
    }
    closed.forEach(t => {
      const date = new Date(t.exitDate ?? t.entryDate);
      const dayIdx = date.getDay();
      const hour = date.getHours();
      const sessIdx = sessions.findIndex(s => hour >= s.range[0] && hour <= s.range[1]);
      if (sessIdx >= 0) {
        const cell = heatmap.find(c => c.day === dayIdx && c.session === sessIdx);
        if (cell) {
          cell.pnl += t.actualPnL!;
          cell.count++;
        }
      }
    });
    const heatmapMax = Math.max(...heatmap.map(c => Math.abs(c.pnl)), 1);

    // Execution rhythm
    const sortedDates = [...new Set(closed.map(t => format(new Date(t.exitDate ?? t.entryDate), 'yyyy-MM-dd')))].sort();
    const avgTradesPerDay = tradingDays > 0 ? closed.length / tradingDays : 0;
    let longestIdle = 0;
    for (let i = 1; i < sortedDates.length; i++) {
      const diff = Math.floor((new Date(sortedDates[i]).getTime() - new Date(sortedDates[i - 1]).getTime()) / 86400000);
      if (diff > longestIdle) longestIdle = diff;
    }
    let bestActiveStreak = 0;
    let currentStreak = 1;
    for (let i = 1; i < sortedDates.length; i++) {
      const diff = Math.floor((new Date(sortedDates[i]).getTime() - new Date(sortedDates[i - 1]).getTime()) / 86400000);
      if (diff === 1) { currentStreak++; bestActiveStreak = Math.max(bestActiveStreak, currentStreak); }
      else currentStreak = 1;
    }
    if (sortedDates.length > 0) bestActiveStreak = Math.max(bestActiveStreak, currentStreak);

    // Focus & Discipline
    const topCoin = coinStats[0];
    const focusPercent = topCoin && closed.length > 0 ? Math.round((topCoin.total / closed.length) * 100) : 0;
    const consistencyPercent = tradingDays > 0 ? Math.round((profitableDays / tradingDays) * 100) : 0;
    const longCount = closed.filter(t => (t.direction ?? 'long') === 'long').length;
    const longBias = closed.length > 0 ? Math.round((longCount / closed.length) * 100) : 0;

    // Avg hold time in minutes
    const holdTimes = closed.filter(t => t.exitDate && t.entryDate).map(t => {
      return (new Date(t.exitDate!).getTime() - new Date(t.entryDate).getTime()) / 60000;
    }).filter(m => m > 0);
    const avgHoldMinutes = holdTimes.length > 0 ? Math.round(holdTimes.reduce((s, m) => s + m, 0) / holdTimes.length) : 0;

    // Risk exposure
    const riskRatio = avgLoss > 0 ? avgWin / avgLoss : 0;
    const pnlValues = closed.map(t => t.actualPnL!);
    const pnlMean = pnlValues.length > 0 ? pnlValues.reduce((s, v) => s + v, 0) / pnlValues.length : 0;
    const pnlStdDev = pnlValues.length > 1 ? Math.sqrt(pnlValues.reduce((s, v) => s + (v - pnlMean) ** 2, 0) / (pnlValues.length - 1)) : 0;
    const breakEvenWR = avgLoss > 0 ? (avgLoss / (avgWin + avgLoss)) * 100 : 0;
    const edgeBuffer = winRate - breakEvenWR;
    const winsToRecoverBiggest = avgWin > 0 && biggestLoss < 0 ? Math.ceil(Math.abs(biggestLoss) / avgWin) : 0;

    // Bounce-back rate: after a red day, how often is the next day green?
    const dayPnls = days.sort(([a], [b]) => a.localeCompare(b));
    let redDays = 0;
    let bounceBackCount = 0;
    for (let i = 0; i < dayPnls.length - 1; i++) {
      if (dayPnls[i][1] < 0) {
        redDays++;
        if (dayPnls[i + 1][1] > 0) bounceBackCount++;
      }
    }
    const bounceBackRate = redDays > 0 ? Math.round((bounceBackCount / redDays) * 100) : null;

    // Edge concentration: % of total profit from top 3 green days
    const greenDays = days.filter(([, v]) => v > 0).sort(([, a], [, b]) => b - a);
    const top3Profit = greenDays.slice(0, 3).reduce((s, [, v]) => s + v, 0);
    const edgeConcentration = grossProfit > 0 ? Math.round((top3Profit / grossProfit) * 100) : null;

    // Next Best Actions — leak analysis
    const leaks: { title: string; description: string; amount: number; severity: 'high' | 'medium' | 'low' }[] = [];
    // Leak 1: Worst coin
    if (biggestLeaks.length > 0) {
      const worst = biggestLeaks[0];
      leaks.push({
        title: `Reduce ${worst.coin} drawdown`,
        description: `Lower ${worst.coin} risk allocation until win-rate and expectancy recover.`,
        amount: Math.abs(worst.pnl),
        severity: Math.abs(worst.pnl) > totalPnL * 0.3 ? 'high' : 'medium',
      });
    }
    // Leak 2: Worst session
    const sessionPnls = sessions.map((s, i) => ({
      label: s.label,
      pnl: heatmap.filter(c => c.session === i).reduce((sum, c) => sum + c.pnl, 0),
    })).filter(s => s.pnl < 0).sort((a, b) => a.pnl - b.pnl);
    if (sessionPnls.length > 0) {
      leaks.push({
        title: `Reduce losses during ${sessionPnls[0].label.split(' ')[0]} session`,
        description: `Tighten risk and setup standards for the ${sessionPnls[0].label} execution window.`,
        amount: Math.abs(sessionPnls[0].pnl),
        severity: 'low',
      });
    }
    // Leak 3: Position sizing consistency
    const capitals = closed.map(t => t.capital).filter(c => c > 0);
    if (capitals.length >= 5) {
      const mean = capitals.reduce((s, v) => s + v, 0) / capitals.length;
      const stdDev = Math.sqrt(capitals.reduce((s, v) => s + (v - mean) ** 2, 0) / capitals.length);
      const cv = (stdDev / mean) * 100;
      if (cv > 30) {
        const varianceLoss = losses.filter(t => t.capital > mean * 1.3).reduce((s, t) => s + Math.abs(t.actualPnL!), 0);
        if (varianceLoss > 0) {
          leaks.push({
            title: 'Standardize risk per trade',
            description: 'Set fixed risk-per-trade limits and prevent size jumps after wins or losses.',
            amount: varianceLoss * 0.3,
            severity: 'low',
          });
        }
      }
    }

    const totalLeakBurden = leaks.reduce((s, l) => s + l.amount, 0);
    const realisticRecoverable = totalLeakBurden * 0.75;
    const conservativeRecoverable = leaks.slice(0, 3).reduce((s, l) => s + l.amount, 0) * 0.7;

    return {
      totalPnL, pnlPercent, wins: wins.length, losses: losses.length,
      winRate, profitFactor,
      bestDay, worstDay, avgTrade, execScore,
      coinStats, topPerformers, biggestLeaks,
      heatmap, heatmapMax, sessions, weekdays,
      avgTradesPerDay, longestIdle, bestActiveStreak,
      focusPercent, topCoin, consistencyPercent, longBias, avgHoldMinutes,
      avgWin, avgLoss, biggestLoss, riskRatio, pnlStdDev, breakEvenWR, edgeBuffer, winsToRecoverBiggest,
      bounceBackRate, edgeConcentration,
      leaks: leaks.slice(0, 3),
      totalLeakBurden, realisticRecoverable, conservativeRecoverable,
      closed, tradingDays, bestDayLabel: bestDay ? format(new Date(bestDay[0]), 'dd/MM/yyyy') : null,
    };
  }, [windowedTrades, initialCapital]);

  // ─── Equity curve data ──────────────────────────────────────────────────────
  const equityData = useMemo(() => {
    const data = getEquityCurveData(windowedTrades);
    if (equityMode === 'drawdown') {
      let peak = 0;
      return data.map(d => {
        if (d.pnl > peak) peak = d.pnl;
        return { ...d, pnl: -(peak - d.pnl) };
      });
    }
    return data;
  }, [windowedTrades, equityMode]);

  // ─── Streak ────────────────────────────────────────────────────────────────
  const streak = useMemo(() => getCurrentStreak(windowedTrades), [windowedTrades]);

  // ─── Recent trades ─────────────────────────────────────────────────────────
  const recentTrades = useMemo(() => {
    return [...windowedTrades]
      .filter(t => !t.isOpen && t.actualPnL !== null)
      .sort((a, b) => new Date(b.exitDate ?? b.entryDate).getTime() - new Date(a.exitDate ?? a.entryDate).getTime())
      .slice(0, 5);
  }, [windowedTrades]);

  // ─── Helpers ────────────────────────────────────────────────────────────────
  const fmtPnl = (v: number) => {
    const s = formatCurrency(Math.abs(v));
    return v < 0 ? `-${s}` : s;
  };
  const pnlColor = (v: number) => v > 0 ? 'text-emerald-400' : v < 0 ? 'text-red-400' : 'text-[var(--muted-foreground)]';
  const isPositive = metrics.totalPnL >= 0;
  const scoreColor = metrics.execScore >= 7 ? '#22c55e' : metrics.execScore >= 4 ? '#eab308' : '#ef4444';
  const circumference = 2 * Math.PI * 54;
  const strokeDashoffset = circumference - (metrics.execScore / 10) * circumference;

  const heatCellColor = (pnl: number, count: number) => {
    if (count === 0) return 'bg-[var(--muted)]/30';
    const intensity = Math.min(Math.abs(pnl) / metrics.heatmapMax, 1);
    if (pnl > 0) return `bg-emerald-500/${Math.round(20 + intensity * 60)}`;
    return `bg-red-500/${Math.round(20 + intensity * 60)}`;
  };

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {/* ── Hero Card + Execution Score ── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_220px] gap-4">
        <div className={`rounded-2xl p-5 sm:p-6 ${isPositive
          ? 'bg-gradient-to-br from-emerald-900/60 via-emerald-800/40 to-teal-900/30 border border-emerald-700/30'
          : 'bg-gradient-to-br from-red-900/60 via-rose-800/40 to-red-900/30 border border-red-700/30'
        }`}>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-medium text-white/60 uppercase tracking-wider">
              Net P&L
            </span>
            <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-md ${isPositive ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'}`}>
              {metrics.pnlPercent >= 0 ? '+' : ''}{metrics.pnlPercent.toFixed(1)}%
            </span>
          </div>
          <div className={`text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight ${isPositive ? 'text-emerald-100' : 'text-red-100'}`}>
            {fmtPnl(metrics.totalPnL)}
          </div>
          <div className="flex items-center gap-4 mt-3 text-sm">
            <span className="flex items-center gap-1 text-emerald-400"><TrendingUp size={14} /> {metrics.wins} wins</span>
            <span className="flex items-center gap-1 text-red-400"><TrendingDown size={14} /> {metrics.losses} losses</span>
          </div>
          <div className="grid grid-cols-3 gap-3 mt-4">
            <div className="bg-white/5 rounded-xl px-3 py-2.5">
              <div className="text-[10px] text-white/40 uppercase tracking-wider mb-0.5">Best Day</div>
              {metrics.bestDay ? (
                <>
                  <div className={`text-sm font-semibold ${metrics.bestDay[1] >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {fmtPnl(metrics.bestDay[1])}
                  </div>
                  <div className="text-[10px] text-white/30">{format(new Date(metrics.bestDay[0]), 'dd/MM/yyyy')}</div>
                </>
              ) : <div className="text-sm text-white/30">-</div>}
            </div>
            <div className="bg-white/5 rounded-xl px-3 py-2.5">
              <div className="text-[10px] text-white/40 uppercase tracking-wider mb-0.5">Worst Day</div>
              {metrics.worstDay ? (
                <>
                  <div className={`text-sm font-semibold ${metrics.worstDay[1] >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {fmtPnl(metrics.worstDay[1])}
                  </div>
                  <div className="text-[10px] text-white/30">{format(new Date(metrics.worstDay[0]), 'dd/MM/yyyy')}</div>
                </>
              ) : <div className="text-sm text-white/30">Need 2+ days</div>}
            </div>
            <div className="bg-white/5 rounded-xl px-3 py-2.5">
              <div className="text-[10px] text-white/40 uppercase tracking-wider mb-0.5">Avg Trade</div>
              <div className={`text-sm font-semibold ${metrics.avgTrade >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {fmtPnl(metrics.avgTrade)}
              </div>
            </div>
          </div>

          {/* Fix Biggest Leak CTA */}
          {metrics.leaks.length > 0 && (
            <button
              onClick={() => {
                document.getElementById('next-best-actions')?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="mt-4 flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/15 rounded-xl text-sm text-white/80 transition-colors"
            >
              <Flame size={16} className="text-amber-400" />
              Fix biggest leak
              <ArrowRight size={14} />
            </button>
          )}
        </div>

        {/* Execution Score Gauge */}
        <div className="hidden lg:flex flex-col items-center justify-center bg-[var(--card)] border border-[var(--border)] rounded-2xl p-4">
          <div className="relative w-[130px] h-[130px]">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
              <circle cx="60" cy="60" r="54" fill="none" stroke="var(--border)" strokeWidth="8" />
              <circle
                cx="60" cy="60" r="54" fill="none"
                stroke={scoreColor} strokeWidth="8" strokeLinecap="round"
                strokeDasharray={circumference} strokeDashoffset={strokeDashoffset}
                className="transition-all duration-700"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-3xl font-bold text-[var(--foreground)]">{metrics.execScore}</span>
            </div>
          </div>
          <div className="mt-2 text-center">
            <div className="text-sm font-semibold" style={{ color: scoreColor }}>Execution Score</div>
            <div className="text-[10px] text-[var(--muted-foreground)] mt-0.5 leading-tight">Win Rate + Profit Factor + Net Outcome</div>
          </div>
        </div>
      </div>

      {/* ── Summary Stat Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Net P&L', icon: <TrendingUp size={18} />, value: fmtPnl(metrics.totalPnL), color: pnlColor(metrics.totalPnL), borderColor: 'border-t-red-500' },
          { label: 'Total Trades', icon: <Activity size={18} />, value: String(metrics.closed.length), color: 'text-[var(--foreground)]', borderColor: 'border-t-blue-500' },
          { label: 'Win Rate', icon: <Target size={18} />, value: `${metrics.winRate.toFixed(1)}%`, color: metrics.winRate >= 50 ? 'text-emerald-400' : 'text-red-400', borderColor: 'border-t-emerald-500' },
          { label: 'Profit Factor', icon: <Zap size={18} />, value: metrics.profitFactor === Infinity ? '∞' : metrics.profitFactor.toFixed(2), color: metrics.profitFactor >= 1 ? 'text-emerald-400' : 'text-red-400', borderColor: 'border-t-cyan-500' },
        ].map(card => (
          <div key={card.label} className={`bg-[var(--card)] border border-[var(--border)] border-t-2 ${card.borderColor} rounded-xl p-4`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wider">{card.label}</span>
              <span className="text-[var(--muted-foreground)]">{card.icon}</span>
            </div>
            <div className={`text-xl sm:text-2xl font-bold ${card.color}`}>{card.value}</div>
          </div>
        ))}
      </div>

      {/* ── Main Content: Left (Charts) + Right (Sidebar Cards) ── */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-4">
        {/* Left column */}
        <div className="space-y-4">
          {/* Equity Curve */}
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-semibold text-[var(--foreground)]">Equity Curve</h3>
                <p className="text-xs text-[var(--muted-foreground)]">Account balance growth over time</p>
              </div>
              <div className="flex gap-1 bg-[var(--muted)] rounded-lg p-0.5">
                {(['equity', 'drawdown'] as const).map(mode => (
                  <button
                    key={mode}
                    onClick={() => setEquityMode(mode)}
                    className={`px-3 py-1 rounded-md text-xs font-medium transition-colors capitalize ${
                      equityMode === mode ? 'bg-[var(--card)] text-[var(--foreground)] shadow-sm' : 'text-[var(--muted-foreground)]'
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>
            {equityData.length > 1 ? (
              <div className="h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={equityData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                    <defs>
                      <linearGradient id="equityGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={equityMode === 'drawdown' ? '#ef4444' : '#2dd4bf'} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={equityMode === 'drawdown' ? '#ef4444' : '#2dd4bf'} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} tickLine={false} axisLine={false} tickFormatter={v => `$${v}`} />
                    <Tooltip
                      contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '12px', color: 'var(--foreground)' }}
                      formatter={(val: unknown) => [formatCurrency(val as number), equityMode === 'drawdown' ? 'Drawdown' : 'Equity']}
                    />
                    <Area
                      type="monotone" dataKey="pnl"
                      stroke={equityMode === 'drawdown' ? '#ef4444' : '#2dd4bf'}
                      strokeWidth={2} fill="url(#equityGrad)" dot={false} isAnimationActive={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[220px] flex items-center justify-center text-sm text-[var(--muted-foreground)]">
                Need at least 2 closed trades to show chart
              </div>
            )}
          </div>

          {/* Activity Map (Heatmap) */}
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5">
            <h3 className="text-base font-semibold text-[var(--foreground)] mb-1">Activity Map</h3>
            <p className="text-xs text-[var(--muted-foreground)] mb-4">Net P&L by weekday and session (UTC)</p>

            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr>
                    <th className="text-left text-[var(--muted-foreground)] font-medium pb-2 pr-3">Sessions</th>
                    {metrics.sessions.map(s => (
                      <th key={s.label} className="text-center text-[var(--muted-foreground)] font-medium pb-2 px-1 whitespace-nowrap">
                        {s.label.split(' ')[0]}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {metrics.weekdays.map((day, dayIdx) => (
                    <tr key={day}>
                      <td className="text-[var(--muted-foreground)] pr-3 py-0.5 font-medium">{day}</td>
                      {metrics.sessions.map((_, sessIdx) => {
                        const cell = metrics.heatmap.find(c => c.day === dayIdx && c.session === sessIdx);
                        const pnl = cell?.pnl ?? 0;
                        const count = cell?.count ?? 0;
                        const intensity = count > 0 ? Math.min(Math.abs(pnl) / metrics.heatmapMax, 1) : 0;
                        const alpha = count === 0 ? 0.05 : 0.15 + intensity * 0.65;
                        const bg = count === 0
                          ? 'rgba(100,116,139,0.08)'
                          : pnl >= 0
                            ? `rgba(34,197,94,${alpha})`
                            : `rgba(239,68,68,${alpha})`;
                        return (
                          <td key={sessIdx} className="px-0.5 py-0.5">
                            <div
                              className="w-full h-6 rounded"
                              style={{ backgroundColor: bg }}
                              title={count > 0 ? `${fmtPnl(pnl)} (${count} trades)` : 'No trades'}
                            />
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-[10px] text-[var(--muted-foreground)] mt-2">Hover a cell to see exact performance.</p>

            {/* P&L bar */}
            {metrics.totalPnL !== 0 && (
              <div className="mt-3">
                <div className="h-3 rounded-full bg-[var(--muted)] overflow-hidden flex">
                  {metrics.totalPnL < 0 ? (
                    <div className="h-full bg-red-500 rounded-full" style={{ width: '100%' }} />
                  ) : (
                    <>
                      <div className="h-full bg-red-500" style={{ width: `${Math.round((Math.abs(metrics.closed.filter(t => t.actualPnL! < 0).reduce((s, t) => s + t.actualPnL!, 0)) / (Math.abs(metrics.totalPnL) + Math.abs(metrics.closed.filter(t => t.actualPnL! < 0).reduce((s, t) => s + t.actualPnL!, 0)) * 2)) * 100)}%` }} />
                      <div className="h-full bg-emerald-500 flex-1" />
                    </>
                  )}
                </div>
                <div className="flex justify-between text-[10px] text-[var(--muted-foreground)] mt-1">
                  <span>{fmtPnl(Math.min(metrics.totalPnL, 0))}</span>
                  <span>$0</span>
                </div>
              </div>
            )}
          </div>

          {/* Recent Trades */}
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-semibold text-[var(--foreground)]">Recent Trades</h3>
                <p className="text-xs text-[var(--muted-foreground)]">Last activity in the selected period</p>
              </div>
              <button
                onClick={() => onNavigate('journal')}
                className="flex items-center gap-1 text-xs text-[var(--accent)] hover:text-[var(--accent-hover)] font-medium transition-colors"
              >
                View all <ArrowRight size={14} />
              </button>
            </div>
            {recentTrades.length > 0 ? (
              <div className="space-y-2">
                {recentTrades.map(t => {
                  const dir = (t.direction ?? 'long')[0].toUpperCase();
                  const dirColor = (t.direction ?? 'long') === 'long' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400';
                  const elapsed = t.exitDate
                    ? Math.round((Date.now() - new Date(t.exitDate).getTime()) / 3600000)
                    : null;
                  const timeLabel = elapsed !== null
                    ? elapsed < 24 ? `${elapsed}h` : `${Math.round(elapsed / 24)}d`
                    : '';
                  return (
                    <div key={t.id} className="flex items-center gap-3 py-2 border-b border-[var(--border)] last:border-0">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${dirColor}`}>
                        {dir}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm text-[var(--foreground)]">{t.coin}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] text-[var(--muted-foreground)]">
                          <Clock size={10} /> {timeLabel} ago
                        </div>
                      </div>
                      <div className="text-right shrink-0 text-xs text-[var(--muted-foreground)]">
                        <div>
                          <span className="uppercase text-[10px]">Entry</span> {formatCurrency(t.entryPrice)}
                        </div>
                        {t.exitPrice && (
                          <div>
                            <span className="uppercase text-[10px]">Exit</span> {formatCurrency(t.exitPrice)}
                          </div>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <div className={`text-sm font-semibold ${pnlColor(t.actualPnL ?? 0)}`}>
                          {fmtPnl(t.actualPnL ?? 0)}
                        </div>
                        {t.exitDate && (
                          <div className="text-[10px] text-[var(--muted-foreground)]">
                            {format(new Date(t.exitDate), 'dd/MM/yyyy, HH:mm')}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-6 text-sm text-[var(--muted-foreground)]">No closed trades in this period</div>
            )}
          </div>

          {/* Next Best Actions */}
          <div id="next-best-actions" className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-base font-semibold text-[var(--foreground)]">Next Best Actions</h3>
              <span className="w-2 h-2 rounded-full bg-amber-400" />
            </div>
            <p className="text-xs text-[var(--muted-foreground)] mb-1">Execute these top fixes first for the active period.</p>
            <p className="text-[10px] text-[var(--muted-foreground)] mb-4">Run active rule set for 5-7 sessions before switching.</p>

            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="bg-[var(--muted)]/50 border border-[var(--border)] rounded-xl px-3 py-2.5">
                <div className="text-[10px] text-[var(--muted-foreground)] uppercase tracking-wider">Total Leak Burden</div>
                <div className="text-base font-bold text-red-400">{formatCurrency(metrics.totalLeakBurden)}</div>
                <div className="text-[10px] text-[var(--muted-foreground)]">gross drag detected</div>
              </div>
              <div className="bg-[var(--muted)]/50 border border-[var(--border)] rounded-xl px-3 py-2.5">
                <div className="text-[10px] text-[var(--muted-foreground)] uppercase tracking-wider">Realistic Recoverable</div>
                <div className="text-base font-bold text-emerald-400">{formatCurrency(metrics.realisticRecoverable)}</div>
                <div className="text-[10px] text-[var(--muted-foreground)]">realistic in period</div>
              </div>
              <div className="bg-[var(--muted)]/50 border border-[var(--border)] rounded-xl px-3 py-2.5">
                <div className="text-[10px] text-[var(--muted-foreground)] uppercase tracking-wider">Conservative (Top-3)</div>
                <div className="text-base font-bold text-amber-400">{formatCurrency(metrics.conservativeRecoverable)}</div>
                <div className="text-[10px] text-[var(--muted-foreground)]">focus-first amount</div>
              </div>
            </div>

            {metrics.leaks.length > 0 ? (
              <div className="space-y-3">
                {metrics.leaks.map((leak, i) => (
                  <div key={i} className="flex items-start gap-3 pl-1">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                      leak.severity === 'high' ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                        : leak.severity === 'medium' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                    }`}>
                      {i + 1}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-[var(--foreground)]">{leak.title}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                          leak.severity === 'high' ? 'bg-red-500/10 text-red-400'
                            : leak.severity === 'medium' ? 'bg-amber-500/10 text-amber-400'
                            : 'bg-blue-500/10 text-blue-400'
                        }`}>{leak.severity}</span>
                      </div>
                      <p className="text-xs text-[var(--muted-foreground)] mt-0.5">{leak.description}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-sm font-semibold text-emerald-400">{formatCurrency(leak.amount)}</div>
                      <div className="text-[10px] text-[var(--muted-foreground)]">in range</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-[var(--muted-foreground)] text-center py-4">No significant leaks detected. Keep it up!</p>
            )}

            <div className="mt-4 text-xs text-[var(--muted-foreground)] bg-amber-500/5 border border-amber-500/10 rounded-lg px-3 py-2">
              Track this weekly: realized drag should move toward the conservative recoverable level.
            </div>

            <button
              onClick={() => onNavigate('verdicts')}
              className="mt-4 w-full py-2.5 bg-[var(--muted)] hover:bg-[var(--muted-foreground)]/10 border border-[var(--border)] rounded-xl text-sm font-medium text-[var(--foreground)] transition-colors flex items-center justify-center gap-2"
            >
              Open Verdicts <ArrowRight size={14} />
            </button>
          </div>
        </div>

        {/* ── Right Sidebar Cards ── */}
        <div className="space-y-4">
          {/* Top vs Worst Symbols */}
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-4">
            <h3 className="text-sm font-semibold text-[var(--foreground)] mb-1">Top vs Worst Symbols</h3>
            <p className="text-[10px] text-[var(--muted-foreground)] mb-3">Compare your strongest and weakest pairs</p>

            <div className="mb-3">
              <div className="text-xs font-semibold text-emerald-400 mb-2 uppercase tracking-wider">Top Performers</div>
              {metrics.topPerformers.length > 0 ? metrics.topPerformers.map((c, i) => (
                <div key={c.coin} className="flex items-center justify-between py-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-[var(--muted-foreground)] w-4">#{i + 1}</span>
                    <span className="text-xs font-medium text-[var(--foreground)]">{c.coin}</span>
                  </div>
                  <div className="text-right">
                    <span className={`text-xs font-semibold ${pnlColor(c.pnl)}`}>{fmtPnl(c.pnl)}</span>
                    <div className="text-[10px] text-[var(--muted-foreground)]">{c.total} trades</div>
                  </div>
                </div>
              )) : <p className="text-[10px] text-[var(--muted-foreground)]">No profitable symbols yet</p>}
            </div>

            <div>
              <div className="text-xs font-semibold text-red-400 mb-2 uppercase tracking-wider">Biggest Leaks</div>
              {metrics.biggestLeaks.length > 0 ? metrics.biggestLeaks.map((c, i) => (
                <div key={c.coin} className="flex items-center justify-between py-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-[var(--muted-foreground)] w-4">#{i + 1}</span>
                    <span className="text-xs font-medium text-[var(--foreground)]">{c.coin}</span>
                  </div>
                  <div className="text-right">
                    <span className={`text-xs font-semibold ${pnlColor(c.pnl)}`}>{fmtPnl(c.pnl)}</span>
                    <div className="text-[10px] text-[var(--muted-foreground)]">{c.total} trades</div>
                  </div>
                </div>
              )) : <p className="text-[10px] text-[var(--muted-foreground)]">No losing symbols</p>}
            </div>
          </div>

          {/* Execution Rhythm */}
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-4">
            <h3 className="text-sm font-semibold text-[var(--foreground)] mb-1">Execution Rhythm</h3>
            <p className="text-[10px] text-[var(--muted-foreground)] mb-3">How consistent and active your trading cadence is</p>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-[var(--muted-foreground)]">
                  <Calendar size={14} /> Avg trades / day
                </div>
                <span className="text-sm font-semibold text-[var(--foreground)]">{metrics.avgTradesPerDay.toFixed(1)}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-[var(--muted-foreground)]">
                  <AlertCircle size={14} /> Longest idle gap
                </div>
                <span className="text-sm font-semibold text-[var(--foreground)]">
                  {metrics.longestIdle > 0 ? `${metrics.longestIdle}d` : '-'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-[var(--muted-foreground)]">
                  <Flame size={14} /> Best active streak
                </div>
                <span className="text-sm font-semibold text-[var(--foreground)]">
                  {metrics.bestActiveStreak > 0 ? `${metrics.bestActiveStreak} days` : '-'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-[var(--muted-foreground)]">
                  <Flame size={14} /> Best day
                </div>
                <span className="text-sm font-semibold text-[var(--foreground)]">
                  {metrics.bestDay ? (
                    <span>
                      <span className="text-[10px] text-[var(--muted-foreground)] mr-1">{metrics.bestDayLabel}</span>
                      <span className={`${pnlColor(metrics.bestDay[1])}`}>{fmtPnl(metrics.bestDay[1])}</span>
                    </span>
                  ) : '-'}
                </span>
              </div>
              {metrics.bounceBackRate !== null && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs text-[var(--muted-foreground)]">
                    <CircleDot size={14} /> Bounce-back rate
                  </div>
                  <span className="text-sm font-semibold text-[var(--foreground)]">
                    {metrics.bounceBackRate}%
                  </span>
                </div>
              )}
              {metrics.edgeConcentration !== null && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs text-[var(--muted-foreground)]">
                    <Shield size={14} /> Edge concentration
                  </div>
                  <span className="text-sm font-semibold text-[var(--foreground)]">
                    {metrics.edgeConcentration}%
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Focus & Discipline */}
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-4">
            <h3 className="text-sm font-semibold text-[var(--foreground)] mb-1">Focus & Discipline</h3>
            <p className="text-[10px] text-[var(--muted-foreground)] mb-3">See where attention and execution drift</p>
            <div className="space-y-3">
              {metrics.topCoin && (
                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="flex items-center gap-2 text-[var(--muted-foreground)]">
                      <CircleDot size={14} className="text-emerald-400" /> Focus on {metrics.topCoin.coin}
                    </span>
                    <span className="font-semibold text-[var(--foreground)]">{metrics.focusPercent}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-[var(--border)] overflow-hidden">
                    <div className="h-full rounded-full bg-cyan-400" style={{ width: `${metrics.focusPercent}%` }} />
                  </div>
                </div>
              )}
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="flex items-center gap-2 text-[var(--muted-foreground)]">
                    <CircleDot size={14} /> Consistency (profitable days)
                  </span>
                  <span className="font-semibold text-[var(--foreground)]">{metrics.consistencyPercent}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-[var(--border)] overflow-hidden">
                  <div className="h-full rounded-full bg-emerald-400" style={{ width: `${metrics.consistencyPercent}%` }} />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="flex items-center gap-2 text-[var(--muted-foreground)]">
                    <TrendingUp size={14} /> Long bias
                  </span>
                  <span className="font-semibold text-[var(--foreground)]">{metrics.longBias}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-[var(--border)] overflow-hidden">
                  <div className="h-full rounded-full bg-blue-400" style={{ width: `${metrics.longBias}%` }} />
                </div>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2 text-[var(--muted-foreground)]">
                  <Clock size={14} /> Avg hold time
                </span>
                <span className="font-semibold text-[var(--foreground)]">{metrics.avgHoldMinutes}m</span>
              </div>
            </div>
          </div>

          {/* Risk Exposure */}
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-4">
            <h3 className="text-sm font-semibold text-[var(--foreground)] mb-1">Risk Exposure</h3>
            <p className="text-[10px] text-[var(--muted-foreground)] mb-3">How much damage each mistake can do</p>
            <div className="space-y-2.5">
              {[
                { icon: <TrendingUp size={14} />, label: 'Avg win', value: fmtPnl(metrics.avgWin), color: 'text-emerald-400' },
                { icon: <TrendingDown size={14} />, label: 'Avg loss', value: fmtPnl(-metrics.avgLoss), color: 'text-red-400' },
                { icon: <AlertCircle size={14} />, label: 'Biggest loss', value: fmtPnl(metrics.biggestLoss), color: 'text-red-400' },
                { icon: <Shield size={14} />, label: 'Risk ratio (avg win / avg loss)', value: metrics.riskRatio > 0 ? metrics.riskRatio.toFixed(2) : '-' },
                { icon: <BarChart3 size={14} />, label: 'P&L volatility (std dev)', value: metrics.pnlStdDev > 0 ? formatCurrency(metrics.pnlStdDev) : '-' },
                { icon: <Target size={14} />, label: 'Breakeven win rate', value: metrics.breakEvenWR > 0 ? `${metrics.breakEvenWR.toFixed(1)}%` : '-' },
                { icon: <Zap size={14} />, label: 'Edge buffer', value: metrics.edgeBuffer !== 0 ? `${metrics.edgeBuffer > 0 ? '+' : ''}${metrics.edgeBuffer.toFixed(1)}%` : '-', color: metrics.edgeBuffer > 0 ? 'text-emerald-400' : metrics.edgeBuffer < 0 ? 'text-red-400' : undefined },
                { icon: <Activity size={14} />, label: 'Avg wins to recover biggest loss', value: metrics.winsToRecoverBiggest > 0 ? String(metrics.winsToRecoverBiggest) : '-' },
              ].map(row => (
                <div key={row.label} className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs text-[var(--muted-foreground)]">
                    {row.icon} {row.label}
                  </div>
                  <span className={`text-sm font-semibold ${row.color ?? 'text-[var(--foreground)]'}`}>
                    {row.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
