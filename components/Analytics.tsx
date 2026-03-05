'use client';

import { useState, useMemo } from 'react';
import { Trade } from '@/lib/types';
import { useCurrency } from '@/hooks/useCurrency';
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, subMonths, addMonths } from 'date-fns';
import {
  TrendingUp, TrendingDown, BarChart3, Target,
  Clock, Zap, Shield, ArrowRight, AlertCircle,
  Activity, Flame, ChevronLeft, ChevronRight, Calendar,
} from 'lucide-react';
import PerformanceMetrics from './PerformanceMetrics';

interface AnalyticsProps {
  trades: Trade[];
  initialCapital?: number;
  onAddTrade?: () => void;
}

export default function Analytics({ trades, initialCapital = 0 }: AnalyticsProps) {
  const { formatCurrency } = useCurrency();
  const [calMonth, setCalMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [showMetrics, setShowMetrics] = useState(false);

  // Trades are already filtered by the universal top-bar time range
  const windowedTrades = trades;

  // ─── All computed metrics ─────────────────────────────────────────────────
  const m = useMemo(() => {
    const closed = windowedTrades.filter(t => !t.isOpen && t.actualPnL !== null);
    const wins = closed.filter(t => t.actualPnL! > 0);
    const losses = closed.filter(t => t.actualPnL! < 0);
    const totalPnL = closed.reduce((s, t) => s + t.actualPnL!, 0);
    const winRate = closed.length > 0 ? (wins.length / closed.length) * 100 : 0;
    const grossProfit = wins.reduce((s, t) => s + t.actualPnL!, 0);
    const grossLoss = Math.abs(losses.reduce((s, t) => s + t.actualPnL!, 0));
    const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0;
    const avgWin = wins.length > 0 ? grossProfit / wins.length : 0;
    const avgLoss = losses.length > 0 ? grossLoss / losses.length : 0;

    // Max drawdown
    let peak = 0, maxDD = 0, equity = 0;
    const sorted = [...closed].sort((a, b) => new Date(a.exitDate ?? a.entryDate).getTime() - new Date(b.exitDate ?? b.entryDate).getTime());
    sorted.forEach(t => { equity += t.actualPnL!; if (equity > peak) peak = equity; const dd = peak - equity; if (dd > maxDD) maxDD = dd; });
    const maxDDPercent = initialCapital > 0 ? (maxDD / initialCapital) * 100 : 0;

    // Avg hold time
    const holdTimes = closed.filter(t => t.exitDate).map(t =>
      (new Date(t.exitDate!).getTime() - new Date(t.entryDate).getTime()) / 60000
    ).filter(m => m > 0);
    const avgHoldMin = holdTimes.length > 0 ? holdTimes.reduce((s, m) => s + m, 0) / holdTimes.length : 0;
    const holdLabel = avgHoldMin >= 1440 ? `${Math.round(avgHoldMin / 1440)}d ${Math.round((avgHoldMin % 1440) / 60)}h`
      : avgHoldMin >= 60 ? `${Math.round(avgHoldMin / 60)}h ${Math.round(avgHoldMin % 60)}m`
      : `${Math.round(avgHoldMin)}m`;

    // Equity curve
    let cum = 0;
    const equityData = sorted.map(t => {
      cum += t.actualPnL!;
      return { date: format(new Date(t.exitDate ?? t.entryDate), 'MMM dd'), pnl: Math.round(cum * 100) / 100 };
    });

    // Projected (after fix)
    const leakAmount = computeLeakAmount(closed);
    const projectedPnL = totalPnL + leakAmount.conservative;

    // Symbol leaders & drags
    const coinMap = new Map<string, { pnl: number; wins: number; total: number; avgPnl: number }>();
    closed.forEach(t => {
      const p = coinMap.get(t.coin) ?? { pnl: 0, wins: 0, total: 0, avgPnl: 0 };
      coinMap.set(t.coin, { pnl: p.pnl + t.actualPnL!, wins: p.wins + (t.actualPnL! > 0 ? 1 : 0), total: p.total + 1, avgPnl: 0 });
    });
    coinMap.forEach((v, k) => { v.avgPnl = v.total > 0 ? v.pnl / v.total : 0; coinMap.set(k, v); });
    const coinStats = Array.from(coinMap.entries()).map(([coin, v]) => ({
      coin, ...v, winRate: v.total > 0 ? Math.round((v.wins / v.total) * 100) : 0,
    }));
    const topSymbols = [...coinStats].sort((a, b) => b.pnl - a.pnl).filter(c => c.pnl > 0);
    const weakSymbols = [...coinStats].sort((a, b) => a.pnl - b.pnl).filter(c => c.pnl < 0);

    // Session diagnostics
    const sessions = [
      { label: 'Morning', time: '06:00-12:00', range: [6, 11] as [number, number], icon: 'sunrise' },
      { label: 'Afternoon', time: '12:00-18:00', range: [12, 17] as [number, number], icon: 'sun' },
      { label: 'Evening', time: '18:00-00:00', range: [18, 23] as [number, number], icon: 'sunset' },
      { label: 'Night', time: '00:00-06:00', range: [0, 5] as [number, number], icon: 'moon' },
    ];
    const sessionData = sessions.map(s => {
      const bucket = closed.filter(t => { const h = new Date(t.exitDate ?? t.entryDate).getHours(); return h >= s.range[0] && h <= s.range[1]; });
      return { ...s, pnl: bucket.reduce((sum, t) => sum + t.actualPnL!, 0), count: bucket.length };
    });
    const bestSession = [...sessionData].sort((a, b) => b.pnl - a.pnl)[0];
    const worstSession = [...sessionData].sort((a, b) => a.pnl - b.pnl)[0];

    // Hourly bar chart
    const hourlyData = Array.from({ length: 24 }, (_, h) => {
      const bucket = closed.filter(t => new Date(t.exitDate ?? t.entryDate).getHours() === h);
      return { hour: String(h).padStart(2, '0'), pnl: bucket.reduce((s, t) => s + t.actualPnL!, 0) };
    });

    // Hold profile quality
    const holdBuckets = [
      { label: 'Scalp (<1m)', max: 1 },
      { label: 'Quick (1-5m)', max: 5 },
      { label: 'Medium (5-30m)', max: 30 },
      { label: 'Extended (30m-2h)', max: 120 },
      { label: 'Swing (>2h)', max: Infinity },
    ];
    const holdData = holdBuckets.map((b, i) => {
      const min = i === 0 ? 0 : holdBuckets[i - 1].max;
      const bucket = closed.filter(t => {
        if (!t.exitDate) return false;
        const dur = (new Date(t.exitDate).getTime() - new Date(t.entryDate).getTime()) / 60000;
        return dur >= min && dur < b.max;
      });
      return { label: b.label, pnl: bucket.reduce((s, t) => s + t.actualPnL!, 0), count: bucket.length };
    });

    // Size & cost efficiency
    const sizeBuckets = [
      { label: 'Small (<$1k)', max: 1000 },
      { label: 'Medium ($1k-$5k)', max: 5000 },
      { label: 'Large ($5k-$20k)', max: 20000 },
      { label: 'Whale (>$20k)', max: Infinity },
    ];
    const sizeData = sizeBuckets.map((b, i) => {
      const min = i === 0 ? 0 : sizeBuckets[i - 1].max;
      const bucket = closed.filter(t => t.capital >= min && t.capital < b.max);
      return { label: b.label, pnl: bucket.reduce((s, t) => s + t.actualPnL!, 0), count: bucket.length };
    });

    // Loss streak risk
    let maxLossStreak = 0, currentLossStreak = 0, fivePlusStreaks = 0;
    sorted.forEach(t => {
      if (t.actualPnL! < 0) { currentLossStreak++; if (currentLossStreak > maxLossStreak) maxLossStreak = currentLossStreak; }
      else { if (currentLossStreak >= 5) fivePlusStreaks++; currentLossStreak = 0; }
    });

    // Revenge signal: trades within 30min after a loss
    let revengeCount = 0;
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i - 1].actualPnL! < 0) {
        const gap = new Date(sorted[i].entryDate).getTime() - new Date(sorted[i - 1].exitDate ?? sorted[i - 1].entryDate).getTime();
        if (gap < 30 * 60000) revengeCount++;
      }
    }

    // Process stability
    const withRules = closed.filter(t => t.ruleChecklist && t.ruleChecklist.length > 0);
    const totalRules = withRules.reduce((s, t) => s + t.ruleChecklist.length, 0);
    const followedRules = withRules.reduce((s, t) => s + t.ruleChecklist.filter(r => r.compliance !== 'no').length, 0);
    const processScore = totalRules > 0 ? Math.round((followedRules / totalRules) * 100) : 0;
    const dailyPnls = Array.from(new Map(closed.map(t => {
      const d = format(new Date(t.exitDate ?? t.entryDate), 'yyyy-MM-dd');
      return [d, closed.filter(t2 => format(new Date(t2.exitDate ?? t2.entryDate), 'yyyy-MM-dd') === d).reduce((s, t2) => s + t2.actualPnL!, 0)];
    })).values());
    const dailyMean = dailyPnls.length > 0 ? dailyPnls.reduce((s, v) => s + v, 0) / dailyPnls.length : 0;
    const dailyVolatility = dailyPnls.length > 1 ? Math.sqrt(dailyPnls.reduce((s, v) => s + (v - dailyMean) ** 2, 0) / (dailyPnls.length - 1)) : 0;

    // Directional mix
    const longTrades = closed.filter(t => (t.direction ?? 'long') === 'long');
    const shortTrades = closed.filter(t => t.direction === 'short');
    const longPnL = longTrades.reduce((s, t) => s + t.actualPnL!, 0);
    const shortPnL = shortTrades.reduce((s, t) => s + t.actualPnL!, 0);
    const longWR = longTrades.length > 0 ? Math.round((longTrades.filter(t => t.actualPnL! > 0).length / longTrades.length) * 100) : 0;
    const shortWR = shortTrades.length > 0 ? Math.round((shortTrades.filter(t => t.actualPnL! > 0).length / shortTrades.length) * 100) : 0;

    // Action priorities
    const actions: { title: string; description: string }[] = [];
    if (maxLossStreak >= 3) actions.push({ title: 'Loss containment failure', description: 'Hard-stop day after containment breach.' });
    if (topSymbols.length === 0 && weakSymbols.length > 0) actions.push({ title: 'Edge fragility map', description: 'Narrow allowed context envelope.' });
    const topLosses = [...losses].sort((a, b) => a.actualPnL! - b.actualPnL!).slice(0, 3);
    const topLossTotal = topLosses.reduce((s, t) => s + Math.abs(t.actualPnL!), 0);
    if (grossLoss > 0 && topLossTotal / grossLoss > 0.5) actions.push({ title: 'Few large losses dominate', description: `Set hard max loss/trade at ${formatCurrency(avgLoss * 1.5)} (top losses currently account for ${Math.round((topLossTotal / grossLoss) * 100)}% of total loss).` });
    if (actions.length === 0) actions.push({ title: 'Stay consistent', description: 'No critical issues detected. Maintain your current approach.' });

    return {
      closed, sorted, totalPnL, winRate, profitFactor, avgWin, avgLoss, maxDD, maxDDPercent,
      holdLabel, avgHoldMin, equityData, leakAmount, projectedPnL,
      coinStats, topSymbols, weakSymbols,
      sessionData, bestSession, worstSession, hourlyData,
      holdData, sizeData,
      maxLossStreak, fivePlusStreaks, revengeCount,
      processScore, dailyVolatility,
      longTrades, shortTrades, longPnL, shortPnL, longWR, shortWR,
      actions, wins: wins.length, losses: losses.length,
    };
  }, [windowedTrades, initialCapital, formatCurrency]);

  // ─── Calendar data ────────────────────────────────────────────────────────
  const calendarData = useMemo(() => {
    const start = startOfMonth(calMonth);
    const end = endOfMonth(calMonth);
    const days = eachDayOfInterval({ start, end });
    const closed = trades.filter(t => !t.isOpen && t.actualPnL !== null);

    const dayMap = new Map<string, { pnl: number; trades: number; winRate: number; topCoin: string; topCoinPnl: number; tradeList: Trade[] }>();
    closed.forEach(t => {
      const d = format(new Date(t.exitDate ?? t.entryDate), 'yyyy-MM-dd');
      const prev = dayMap.get(d) ?? { pnl: 0, trades: 0, winRate: 0, topCoin: '', topCoinPnl: 0, tradeList: [] };
      prev.pnl += t.actualPnL!;
      prev.trades++;
      prev.tradeList.push(t);
      dayMap.set(d, prev);
    });
    // Compute per-day win rate and top coin
    dayMap.forEach((v, k) => {
      const w = v.tradeList.filter(t => t.actualPnL! > 0).length;
      v.winRate = v.trades > 0 ? Math.round((w / v.trades) * 100) : 0;
      const coinPnl = new Map<string, number>();
      v.tradeList.forEach(t => coinPnl.set(t.coin, (coinPnl.get(t.coin) ?? 0) + t.actualPnL!));
      const sorted = [...coinPnl.entries()].sort(([, a], [, b]) => Math.abs(b) - Math.abs(a));
      if (sorted.length > 0) { v.topCoin = sorted[0][0]; v.topCoinPnl = sorted[0][1]; }
      dayMap.set(k, v);
    });

    const monthPnL = Array.from(dayMap.values()).reduce((s, v) => s + v.pnl, 0);
    const monthTrades = Array.from(dayMap.values()).reduce((s, v) => s + v.trades, 0);
    const monthWins = Array.from(dayMap.values()).reduce((s, v) => s + v.tradeList.filter(t => t.actualPnL! > 0).length, 0);
    const monthWR = monthTrades > 0 ? Math.round((monthWins / monthTrades) * 100) : 0;

    return { days, dayMap, monthPnL, monthTrades, monthWR, start };
  }, [trades, calMonth]);

  const selectedDayData = selectedDay ? calendarData.dayMap.get(selectedDay) : null;

  // ─── Helpers ──────────────────────────────────────────────────────────────
  const fmtPnl = (v: number) => { const s = formatCurrency(Math.abs(v)); return v < 0 ? `-${s}` : s; };
  const pnlColor = (v: number) => v > 0 ? 'text-emerald-400' : v < 0 ? 'text-red-400' : 'text-[var(--muted-foreground)]';
  const barMaxAbs = Math.max(...m.sessionData.map(s => Math.abs(s.pnl)), 1);

  if (showMetrics) {
    return (
      <div>
        <button onClick={() => setShowMetrics(false)} className="mb-4 flex items-center gap-1 text-sm text-[var(--accent)] hover:text-[var(--accent-hover)]">
          <ChevronLeft size={16} /> Back to Performance
        </button>
        <PerformanceMetrics trades={trades} initialCapital={initialCapital} />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* ── Header ── */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-[var(--accent)]/10 flex items-center justify-center shrink-0">
              <TrendingDown size={24} className="text-[var(--accent)]" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[var(--foreground)]">Performance Command Center</h1>
              <p className="text-sm text-[var(--muted-foreground)] mt-1">One page to diagnose outcome quality, identify drag sources, and prioritize the next execution change.</p>
            </div>
          </div>
          <div className="bg-[var(--accent)]/5 border border-[var(--accent)]/20 rounded-xl p-4 shrink-0">
            <div className="text-xs font-semibold text-[var(--accent)] uppercase tracking-wider mb-2">How to Use</div>
            <ol className="text-xs text-[var(--foreground)] space-y-1">
              <li>1. Validate net and drawdown first.</li>
              <li>2. Check symbol/session/duration drivers.</li>
              <li>3. Execute one top action for 5-7 sessions.</li>
            </ol>
          </div>
        </div>
      </div>

      {/* ── Metrics shortcut ── */}
      <div className="flex items-center justify-end gap-2">
        <button onClick={() => setShowMetrics(true)} className="flex items-center gap-1 text-xs text-[var(--accent)] hover:text-[var(--accent-hover)] font-medium shrink-0">
          <BarChart3 size={14} /> <span className="hidden sm:inline">50+ Metrics</span> <ArrowRight size={12} />
        </button>
      </div>

      {/* ── Outcome Snapshot + Action Priority ── */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-4">
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-4">
            <Activity size={20} className="text-[var(--muted-foreground)]" />
            <div>
              <h2 className="text-base font-semibold text-[var(--foreground)]">Outcome Snapshot</h2>
              <p className="text-xs text-[var(--muted-foreground)]">Current result vs realistic recovery from detected leaks</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="bg-[var(--muted)]/50 border border-[var(--border)] rounded-xl px-4 py-3">
              <div className="text-[10px] text-[var(--muted-foreground)] uppercase tracking-wider">Current Net</div>
              <div className={`text-lg font-bold ${pnlColor(m.totalPnL)}`}>{fmtPnl(m.totalPnL)}</div>
              <div className="text-[10px] text-[var(--muted-foreground)]">Realized result for selected range</div>
            </div>
            <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl px-4 py-3">
              <div className="text-[10px] text-emerald-400 uppercase tracking-wider font-semibold">Recoverable Leak Drag</div>
              <div className="text-lg font-bold text-emerald-400">{formatCurrency(m.leakAmount.conservative)}</div>
              <div className="text-[10px] text-[var(--muted-foreground)]">{initialCapital > 0 ? `${((m.leakAmount.conservative / Math.abs(m.totalPnL || 1)) * 100).toFixed(1)}% of current net magnitude` : 'Set initial capital for %'}</div>
            </div>
            <div className="bg-red-500/5 border border-red-500/20 rounded-xl px-4 py-3">
              <div className="text-[10px] text-red-400 uppercase tracking-wider font-semibold">Projected Net After Fixes</div>
              <div className={`text-lg font-bold ${pnlColor(m.projectedPnL)}`}>{fmtPnl(m.projectedPnL)}</div>
              <div className="text-[10px] text-[var(--muted-foreground)]">{m.leakAmount.conservative > 0 ? 'Low confidence' : 'No leaks detected'}</div>
            </div>
          </div>
          <div className="text-[10px] text-[var(--muted-foreground)] bg-[var(--muted)]/30 rounded-lg px-3 py-2">
            Gross detected leak burden: <span className="text-red-400">{formatCurrency(m.leakAmount.gross)}</span> &bull;
            Overlap-adjusted: <span className="text-amber-400">{formatCurrency(m.leakAmount.overlap)}</span> &bull;
            Conservative recovery: <span className="text-emerald-400">{formatCurrency(m.leakAmount.conservative)}</span>
          </div>
        </div>

        {/* Action Priority */}
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-4">
            <Target size={20} className="text-[var(--muted-foreground)]" />
            <div>
              <h2 className="text-base font-semibold text-[var(--foreground)]">Action Priority</h2>
              <p className="text-xs text-[var(--muted-foreground)]">Execute one change at a time</p>
            </div>
          </div>
          <div className="space-y-3">
            {m.actions.map((a, i) => (
              <div key={i} className="bg-[var(--muted)]/30 border border-[var(--border)] rounded-xl p-3">
                <div className="text-[10px] text-[var(--accent)] uppercase tracking-wider font-semibold mb-1">Action {i + 1}</div>
                <div className="text-sm font-semibold text-[var(--foreground)]">{a.title}</div>
                <p className="text-xs text-[var(--muted-foreground)] mt-0.5">{a.description}</p>
              </div>
            ))}
          </div>
          <button className="mt-4 w-full py-2.5 bg-cyan-500 hover:bg-cyan-400 text-black rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2">
            Open Detailed Verdicts <ChevronRight size={14} />
          </button>
        </div>
      </div>

      {/* ── Stat Cards Row ── */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        {[
          { label: 'Net P&L', icon: '$', value: fmtPnl(m.totalPnL), sub: 'Realized outcome', color: pnlColor(m.totalPnL) },
          { label: 'Trades', icon: <Activity size={16} />, value: String(m.closed.length), sub: `Sample in range`, color: 'text-[var(--foreground)]' },
          { label: 'Win Rate', icon: <Target size={16} />, value: `${m.winRate.toFixed(1)}%`, sub: `${m.wins} wins / ${m.losses} losses`, color: m.winRate >= 50 ? 'text-emerald-400' : 'text-red-400' },
          { label: 'Profit Factor', icon: <BarChart3 size={16} />, value: m.profitFactor === Infinity ? '∞' : m.profitFactor.toFixed(2), sub: `Avg win ${fmtPnl(m.avgWin)} / avg loss ${fmtPnl(m.avgLoss)}`, color: m.profitFactor >= 1 ? 'text-emerald-400' : 'text-red-400' },
          { label: 'Max Drawdown', icon: <TrendingDown size={16} />, value: fmtPnl(m.maxDD), sub: <span className={pnlColor(-m.maxDDPercent)}>{m.maxDDPercent.toFixed(1)}%</span>, color: 'text-red-400' },
          { label: 'Avg Hold', icon: <Clock size={16} />, value: m.holdLabel, sub: 'Execution tempo', color: 'text-[var(--foreground)]' },
        ].map(card => (
          <div key={card.label} className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] text-[var(--muted-foreground)] uppercase tracking-wider font-medium">{card.label}</span>
              <span className="text-[var(--muted-foreground)]">{card.icon}</span>
            </div>
            <div className={`text-xl font-bold ${card.color}`}>{card.value}</div>
            <div className="text-[10px] text-[var(--muted-foreground)] mt-1">{card.sub}</div>
          </div>
        ))}
      </div>

      {/* ── Equity Trajectory & Fix Projection ── */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-4">
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-1">
            <TrendingUp size={20} className="text-[var(--muted-foreground)]" />
            <div>
              <h2 className="text-base font-semibold text-[var(--foreground)]">Equity Trajectory & Fix Projection</h2>
              <p className="text-xs text-[var(--muted-foreground)]">Validate whether process changes are improving slope and reducing drawdown</p>
            </div>
          </div>
          {m.equityData.length > 1 ? (
            <div className="h-[280px] mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={m.equityData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                  <defs>
                    <linearGradient id="eqGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2dd4bf" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#2dd4bf" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} tickLine={false} axisLine={false} tickFormatter={v => `$${v}`} />
                  <Tooltip contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '12px', color: 'var(--foreground)' }} formatter={(v: unknown) => [formatCurrency(v as number), 'Equity']} />
                  <Area type="monotone" dataKey="pnl" stroke="#2dd4bf" strokeWidth={2} fill="url(#eqGrad)" dot={false} isAnimationActive={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : <div className="h-[280px] flex items-center justify-center text-sm text-[var(--muted-foreground)]">Need 2+ closed trades</div>}
        </div>
        <div className="space-y-4">
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4">
            <div className="text-[10px] text-[var(--muted-foreground)] uppercase tracking-wider mb-2">Current vs Projected</div>
            <div className="flex items-center gap-2 text-sm">
              <span className={pnlColor(m.totalPnL)}>{fmtPnl(m.totalPnL)}</span>
              <ArrowRight size={14} className="text-[var(--muted-foreground)]" />
              <span className={pnlColor(m.projectedPnL)}>{fmtPnl(m.projectedPnL)}</span>
            </div>
            <div className="text-xs text-[var(--muted-foreground)] mt-1">
              Modeled improvement: <span className="text-emerald-400">+{formatCurrency(m.leakAmount.conservative)}</span>
            </div>
          </div>
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4">
            <div className="text-[10px] text-[var(--muted-foreground)] uppercase tracking-wider mb-2">Session Signal</div>
            <div className="text-xs text-[var(--foreground)]">
              Best: <span className="text-emerald-400 font-semibold">{m.bestSession?.label}</span> ({fmtPnl(m.bestSession?.pnl ?? 0)})
            </div>
            <div className="text-xs text-[var(--foreground)] mt-1">
              Worst: <span className="text-red-400 font-semibold">{m.worstSession?.label}</span> ({fmtPnl(m.worstSession?.pnl ?? 0)})
            </div>
          </div>
        </div>
      </div>

      {/* ── Symbol Leaders & Session Diagnostics ── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* Symbol Leaders & Drags */}
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-4">
            <Clock size={20} className="text-[var(--muted-foreground)]" />
            <div>
              <h2 className="text-base font-semibold text-[var(--foreground)]">Symbol Leaders & Drags</h2>
              <p className="text-xs text-[var(--muted-foreground)]">Where edge is concentrated vs leaking</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs text-[var(--muted-foreground)] uppercase">Top Symbols</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 font-semibold">Edge</span>
              </div>
              {m.topSymbols.length > 0 ? m.topSymbols.slice(0, 5).map(c => (
                <div key={c.coin} className="flex items-center justify-between py-1.5 border-b border-[var(--border)] last:border-0">
                  <div>
                    <div className="text-sm font-medium text-[var(--foreground)]">{c.coin}</div>
                    <div className="text-[10px] text-[var(--muted-foreground)]">{c.total} trades &bull; {c.winRate}% &bull; avg {fmtPnl(c.avgPnl)}</div>
                  </div>
                  <span className={`text-sm font-semibold ${pnlColor(c.pnl)}`}>{fmtPnl(c.pnl)}</span>
                </div>
              )) : <p className="text-xs text-[var(--muted-foreground)]">No positive symbol edge detected in this range.</p>}
            </div>
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs text-[var(--muted-foreground)] uppercase">Weak Symbols</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/15 text-red-400 font-semibold">Leak</span>
              </div>
              {m.weakSymbols.length > 0 ? m.weakSymbols.slice(0, 5).map(c => (
                <div key={c.coin} className="bg-[var(--muted)]/30 border border-[var(--border)] rounded-lg px-3 py-2 mb-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-[var(--foreground)]">{c.coin}</span>
                    <span className={`text-sm font-semibold ${pnlColor(c.pnl)}`}>{fmtPnl(c.pnl)}</span>
                  </div>
                  <div className="text-[10px] text-[var(--muted-foreground)]">{c.total} trades &bull; {c.winRate}% &bull; avg {fmtPnl(c.avgPnl)}</div>
                </div>
              )) : <p className="text-xs text-[var(--muted-foreground)]">No weak symbols detected.</p>}
            </div>
          </div>
        </div>

        {/* Session & Hourly Diagnostics */}
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-4">
            <Clock size={20} className="text-[var(--muted-foreground)]" />
            <div>
              <h2 className="text-base font-semibold text-[var(--foreground)]">Session & Hourly Diagnostics</h2>
              <p className="text-xs text-[var(--muted-foreground)]">Timing quality and trade concentration by UTC window</p>
            </div>
          </div>
          <div className="space-y-2 mb-4">
            {m.sessionData.map(s => (
              <div key={s.label} className="flex items-center gap-2 sm:gap-3">
                <div className="w-20 sm:w-24 shrink-0">
                  <div className="text-xs sm:text-sm font-medium text-[var(--foreground)]">{s.label}</div>
                  <div className="text-[9px] sm:text-[10px] text-[var(--muted-foreground)]">{s.time}</div>
                </div>
                <div className="flex-1">
                  <div className="h-2 rounded-full bg-[var(--border)] overflow-hidden">
                    <div
                      className={`h-full rounded-full ${s.pnl >= 0 ? 'bg-emerald-500' : 'bg-red-500'}`}
                      style={{ width: `${Math.min((Math.abs(s.pnl) / barMaxAbs) * 100, 100)}%` }}
                    />
                  </div>
                </div>
                <span className={`text-xs sm:text-sm font-semibold shrink-0 w-16 sm:w-24 text-right ${pnlColor(s.pnl)}`}>
                  {fmtPnl(s.pnl)}
                </span>
              </div>
            ))}
          </div>
          {m.hourlyData.some(h => h.pnl !== 0) && (
            <div className="h-[160px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={m.hourlyData}>
                  <XAxis dataKey="hour" tick={{ fontSize: 9, fill: 'var(--muted-foreground)' }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 9, fill: 'var(--muted-foreground)' }} tickLine={false} axisLine={false} tickFormatter={v => `$${v}`} />
                  <Tooltip contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '11px', color: 'var(--foreground)' }} formatter={(v: unknown) => [formatCurrency(v as number), 'P&L']} />
                  <Bar dataKey="pnl" radius={[2, 2, 0, 0]}>
                    {m.hourlyData.map((d, i) => (
                      <rect key={i} fill={d.pnl >= 0 ? '#22c55e' : '#ef4444'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
          <div className="text-[10px] text-[var(--muted-foreground)] mt-2">
            Hourly coverage: {m.closed.length} trades ({m.closed.length > 0 ? '100.0' : '0'}% of sample)
          </div>
        </div>
      </div>

      {/* ── Hold Profile + Size & Cost ── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-4">
            <Clock size={20} className="text-[var(--muted-foreground)]" />
            <div>
              <h2 className="text-base font-semibold text-[var(--foreground)]">Hold Profile Quality</h2>
              <p className="text-xs text-[var(--muted-foreground)]">Which hold durations create or destroy P&L</p>
            </div>
          </div>
          <div className="space-y-2">
            {m.holdData.map(h => {
              const maxPnl = Math.max(...m.holdData.map(d => Math.abs(d.pnl)), 1);
              return (
                <div key={h.label} className="bg-[var(--muted)]/30 border border-[var(--border)] rounded-lg px-4 py-2.5 flex items-center gap-3">
                  <div className="w-24 sm:w-36 shrink-0">
                    <div className="text-xs sm:text-sm font-medium text-[var(--foreground)]">{h.label}</div>
                    <div className="text-[10px] text-[var(--muted-foreground)]">{h.count} trades</div>
                  </div>
                  <div className="flex-1">
                    <div className="h-2 rounded-full bg-[var(--border)] overflow-hidden">
                      <div className={`h-full rounded-full ${h.pnl >= 0 ? 'bg-emerald-500' : 'bg-red-500'}`} style={{ width: `${(Math.abs(h.pnl) / maxPnl) * 100}%` }} />
                    </div>
                  </div>
                  <span className={`text-sm font-semibold shrink-0 ${pnlColor(h.pnl)}`}>{fmtPnl(h.pnl)}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-[var(--muted-foreground)] text-lg">$</span>
            <div>
              <h2 className="text-base font-semibold text-[var(--foreground)]">Size & Cost Efficiency</h2>
              <p className="text-xs text-[var(--muted-foreground)]">Position-size buckets and execution cost drag</p>
            </div>
          </div>
          <div className="space-y-2">
            {m.sizeData.map(s => (
              <div key={s.label} className="flex items-center justify-between py-2 border-b border-[var(--border)] last:border-0">
                <div>
                  <div className="text-sm text-[var(--foreground)]">{s.label}</div>
                  <div className="text-[10px] text-[var(--muted-foreground)]">{s.count} trades</div>
                </div>
                <span className={`text-sm font-semibold ${pnlColor(s.pnl)}`}>{fmtPnl(s.pnl)}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 bg-emerald-500/5 border border-emerald-500/20 rounded-lg px-3 py-2.5">
            <div className="text-[10px] text-emerald-400 uppercase tracking-wider font-semibold">Cost Drag</div>
            <div className="text-lg font-bold text-[var(--foreground)]">$0.00</div>
            <div className="text-[10px] text-[var(--muted-foreground)]">Fees: $0.00 &bull; Funding: $0.00 &bull; ~$0.00/trade</div>
          </div>
        </div>
      </div>

      {/* ── Bottom Cards: Loss Streak, Revenge, Process, Direction ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <Flame size={20} className="text-[var(--muted-foreground)]" />
            <div>
              <h3 className="text-sm font-semibold text-[var(--foreground)]">Loss Streak Risk</h3>
              <p className="text-[10px] text-[var(--muted-foreground)]">Consecutive-loss exposure</p>
            </div>
          </div>
          <div className="text-3xl font-bold text-[var(--foreground)]">{m.maxLossStreak}</div>
          <div className="text-xs text-[var(--muted-foreground)] mt-1">{m.fivePlusStreaks} streaks with 5+ losses</div>
        </div>

        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <Zap size={20} className="text-[var(--muted-foreground)]" />
            <div>
              <h3 className="text-sm font-semibold text-[var(--foreground)]">Revenge Signal</h3>
              <p className="text-[10px] text-[var(--muted-foreground)]">Post-loss impulse risk</p>
            </div>
          </div>
          <div className={`text-2xl font-bold ${m.revengeCount === 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {m.revengeCount === 0 ? 'Clear' : `${m.revengeCount} detected`}
          </div>
          <div className="text-xs text-[var(--muted-foreground)] mt-1">
            {m.revengeCount === 0 ? 'No revenge trading cluster detected in this range.' : `${m.revengeCount} trades entered within 30min of a loss.`}
          </div>
        </div>

        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <Shield size={20} className="text-[var(--muted-foreground)]" />
            <div>
              <h3 className="text-sm font-semibold text-[var(--foreground)]">Process Stability</h3>
              <p className="text-[10px] text-[var(--muted-foreground)]">Consistency and volatility blend</p>
            </div>
          </div>
          <div className="text-3xl font-bold text-[var(--foreground)]">{m.processScore}/100</div>
          <div className="h-1.5 rounded-full bg-[var(--border)] overflow-hidden mt-2 mb-1">
            <div className="h-full rounded-full bg-blue-500" style={{ width: `${m.processScore}%` }} />
          </div>
          <div className="text-xs text-[var(--muted-foreground)]">Daily volatility: {formatCurrency(m.dailyVolatility)}</div>
        </div>

        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <Activity size={20} className="text-[var(--muted-foreground)]" />
            <div>
              <h3 className="text-sm font-semibold text-[var(--foreground)]">Directional Mix</h3>
              <p className="text-[10px] text-[var(--muted-foreground)]">Long vs short quality</p>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-green-400">Long</div>
                <div className="text-[10px] text-[var(--muted-foreground)]">{m.longTrades.length} trades &bull; {m.longWR}%</div>
              </div>
              <span className={`text-sm font-semibold ${pnlColor(m.longPnL)}`}>{fmtPnl(m.longPnL)}</span>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-red-400">Short</div>
                <div className="text-[10px] text-[var(--muted-foreground)]">{m.shortTrades.length} trades &bull; {m.shortWR}%</div>
              </div>
              <span className={`text-sm font-semibold ${pnlColor(m.shortPnL)}`}>{fmtPnl(m.shortPnL)}</span>
            </div>
          </div>
          <div className="h-2 rounded-full overflow-hidden flex mt-3 mb-2">
            {m.longTrades.length + m.shortTrades.length > 0 && (
              <>
                <div className="h-full bg-green-500" style={{ width: `${(m.longTrades.length / (m.longTrades.length + m.shortTrades.length)) * 100}%` }} />
                <div className="h-full bg-red-500 flex-1" />
              </>
            )}
          </div>
          {m.longPnL < 0 && m.shortPnL >= m.longPnL && (
            <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-lg px-3 py-2 mt-2">
              <div className="text-[10px] text-emerald-400 uppercase tracking-wider font-semibold">Short Outperforms</div>
              <p className="text-[10px] text-[var(--muted-foreground)] mt-0.5">
                LONG setup quality is the main drag. Reduce LONG size/frequency until win-rate and expectancy stabilize.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── Daily Execution Calendar ── */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <Calendar size={20} className="text-[var(--muted-foreground)] shrink-0" />
            <div>
              <h2 className="text-base font-semibold text-[var(--foreground)]">Daily Execution Calendar</h2>
              <p className="text-xs text-[var(--muted-foreground)]">Inspect each day: result, quality score, and trade-level drivers.</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => setCalMonth(subMonths(calMonth, 1))} className="p-1 rounded-lg hover:bg-[var(--muted)] text-[var(--muted-foreground)]"><ChevronLeft size={18} /></button>
            <div className="text-right">
              <div className="text-[10px] text-[var(--muted-foreground)] uppercase">Active Month</div>
              <div className="text-sm font-semibold text-[var(--foreground)]">{format(calMonth, 'MMMM yyyy')}</div>
            </div>
            <button onClick={() => setCalMonth(addMonths(calMonth, 1))} className="p-1 rounded-lg hover:bg-[var(--muted)] text-[var(--muted-foreground)]"><ChevronRight size={18} /></button>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-4">
          {/* Calendar grid */}
          <div>
            <div className="grid grid-cols-7 gap-1 mb-1">
              {['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'].map(d => (
                <div key={d} className="text-center text-[10px] text-[var(--muted-foreground)] font-medium py-1">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {/* Empty cells before first day */}
              {Array.from({ length: (getDay(calendarData.start) + 6) % 7 }, (_, i) => (
                <div key={`empty-${i}`} className="h-[68px]" />
              ))}
              {calendarData.days.map(day => {
                const key = format(day, 'yyyy-MM-dd');
                const data = calendarData.dayMap.get(key);
                const isSelected = selectedDay === key;
                return (
                  <button
                    key={key}
                    onClick={() => setSelectedDay(key)}
                    className={`h-[68px] rounded-lg border text-left p-1.5 transition-colors relative ${
                      isSelected ? 'border-[var(--accent)] bg-[var(--accent)]/10'
                        : data ? (data.pnl >= 0 ? 'border-emerald-500/20 bg-emerald-500/5 hover:border-emerald-500/40' : 'border-red-500/20 bg-red-500/5 hover:border-red-500/40')
                        : 'border-[var(--border)] hover:border-[var(--muted-foreground)]/30'
                    }`}
                  >
                    <div className="text-xs text-[var(--foreground)] font-medium">{format(day, 'd')}</div>
                    {data ? (
                      <>
                        <div className={`text-[10px] font-semibold ${pnlColor(data.pnl)}`}>{fmtPnl(data.pnl)}</div>
                        <div className="text-[8px] text-[var(--muted-foreground)]">{data.trades} trades &bull; {data.winRate}%</div>
                      </>
                    ) : (
                      <div className="text-[9px] text-[var(--muted-foreground)]">No activity</div>
                    )}
                    {data && data.trades > 0 && (
                      <div className="absolute bottom-1 right-1 w-3.5 h-3.5 rounded-full bg-[var(--accent)] text-white text-[8px] flex items-center justify-center font-bold">
                        {data.trades}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Month summary */}
            <div className="grid grid-cols-3 gap-2 sm:gap-3 mt-4">
              <div className="bg-[var(--muted)]/30 border border-[var(--border)] rounded-lg px-2 sm:px-3 py-2">
                <div className="text-[9px] sm:text-[10px] text-[var(--muted-foreground)] uppercase">Month Net</div>
                <div className={`text-sm sm:text-base font-bold ${pnlColor(calendarData.monthPnL)}`}>{fmtPnl(calendarData.monthPnL)}</div>
              </div>
              <div className="bg-[var(--muted)]/30 border border-[var(--border)] rounded-lg px-2 sm:px-3 py-2">
                <div className="text-[9px] sm:text-[10px] text-[var(--muted-foreground)] uppercase">Month Trades</div>
                <div className="text-sm sm:text-base font-bold text-[var(--foreground)]">{calendarData.monthTrades}</div>
              </div>
              <div className="bg-[var(--muted)]/30 border border-[var(--border)] rounded-lg px-2 sm:px-3 py-2">
                <div className="text-[9px] sm:text-[10px] text-[var(--muted-foreground)] uppercase">Month Win Rate</div>
                <div className={`text-sm sm:text-base font-bold ${calendarData.monthWR >= 50 ? 'text-emerald-400' : 'text-red-400'}`}>{calendarData.monthWR}%</div>
              </div>
            </div>
          </div>

          {/* Selected day detail */}
          {selectedDay && (
            <div className="space-y-3">
              <div className="text-[10px] text-[var(--muted-foreground)] uppercase tracking-wider">Selected Day</div>
              <div className="text-lg font-semibold text-[var(--foreground)]">{format(new Date(selectedDay), 'dd MMM yyyy')}</div>
              {selectedDayData ? (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-[var(--muted)]/30 border border-[var(--border)] rounded-lg px-3 py-2">
                      <div className="text-[10px] text-[var(--muted-foreground)]">Net</div>
                      <div className={`text-sm font-bold ${pnlColor(selectedDayData.pnl)}`}>{fmtPnl(selectedDayData.pnl)}</div>
                    </div>
                    <div className="bg-[var(--muted)]/30 border border-[var(--border)] rounded-lg px-3 py-2">
                      <div className="text-[10px] text-[var(--muted-foreground)]">Trades</div>
                      <div className="text-sm font-bold text-[var(--foreground)]">{selectedDayData.trades}</div>
                    </div>
                    <div className="bg-[var(--muted)]/30 border border-[var(--border)] rounded-lg px-3 py-2">
                      <div className="text-[10px] text-[var(--muted-foreground)]">Win Rate</div>
                      <div className="text-sm font-bold text-[var(--foreground)]">{selectedDayData.winRate}%</div>
                    </div>
                    <div className="bg-[var(--muted)]/30 border border-[var(--border)] rounded-lg px-3 py-2">
                      <div className="text-[10px] text-[var(--muted-foreground)]">Quality</div>
                      <div className="text-sm font-bold text-[var(--foreground)]">-</div>
                    </div>
                  </div>
                  {selectedDayData.topCoin && (
                    <div className="text-xs text-[var(--foreground)]">
                      Top symbol: <span className="font-semibold">{selectedDayData.topCoin}</span>{' '}
                      (<span className={pnlColor(selectedDayData.topCoinPnl)}>{fmtPnl(selectedDayData.topCoinPnl)}</span>)
                    </div>
                  )}
                  <div className="text-[10px] text-[var(--muted-foreground)] uppercase tracking-wider mt-2">Top Trades</div>
                  <div className="space-y-1.5">
                    {selectedDayData.tradeList
                      .sort((a, b) => Math.abs(b.actualPnL!) - Math.abs(a.actualPnL!))
                      .slice(0, 5)
                      .map(t => (
                        <div key={t.id} className="flex items-center justify-between bg-[var(--muted)]/20 rounded-lg px-3 py-1.5">
                          <div className="min-w-0 flex-1 mr-2">
                            <div className="text-xs text-[var(--foreground)] truncate">
                              {t.exitDate ? format(new Date(t.exitDate), 'HH:mm') : '-'} &bull; {t.coin}
                            </div>
                            <div className="text-[10px] text-[var(--muted-foreground)] truncate">
                              <span className={(t.direction ?? 'long') === 'long' ? 'text-green-400' : 'text-red-400'}>{(t.direction ?? 'long').toUpperCase()}</span> &bull; In {formatCurrency(t.entryPrice)} &bull; Out {t.exitPrice ? formatCurrency(t.exitPrice) : '-'}
                            </div>
                          </div>
                          <span className={`text-sm font-semibold shrink-0 ${pnlColor(t.actualPnL ?? 0)}`}>{fmtPnl(t.actualPnL ?? 0)}</span>
                        </div>
                      ))}
                  </div>
                </>
              ) : (
                <p className="text-xs text-[var(--muted-foreground)]">No trading activity on this day.</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Leak amount helper ───────────────────────────────────────────────────────
function computeLeakAmount(closed: Trade[]) {
  const losses = closed.filter(t => t.actualPnL! < 0);
  const grossLoss = Math.abs(losses.reduce((s, t) => s + t.actualPnL!, 0));
  // Heuristic: overlap-adjusted is ~48% of gross, uniqueness ~26%, conservative ~24%
  const overlap = grossLoss * 0.48;
  const uniqueness = grossLoss * 0.26;
  const conservative = grossLoss * 0.24;
  return { gross: grossLoss, overlap, uniqueness, conservative };
}
