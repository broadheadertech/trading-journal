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
  TrendUp as TrendingUp, TrendDown as TrendingDown, ChartBar as BarChart3, Target,
  Clock, Lightning as Zap, Shield, ArrowRight, WarningCircle as AlertCircle,
  Fire as Flame, CaretLeft as ChevronLeft, CaretRight as ChevronRight, Calendar,
} from '@phosphor-icons/react';
import { Pulse as Activity } from '@phosphor-icons/react';
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
  // formatCurrency already prepends '+' for positives and '-' for negatives —
  // calling it on the raw value avoids the double-sign bug ('-+$X.XX').
  const fmtPnl = (v: number) => formatCurrency(v);
  const pnlColor = (v: number) => v > 0 ? 'text-[var(--green)]' : v < 0 ? 'text-[var(--red)]' : 'text-[var(--muted)]';
  const barMaxAbs = Math.max(...m.sessionData.map(s => Math.abs(s.pnl)), 1);

  if (showMetrics) {
    return (
      <div>
        <button onClick={() => setShowMetrics(false)} className="viewall" style={{ marginLeft: 0, marginBottom: 16 }}>
          <ChevronLeft size={16} /> Back to Performance
        </button>
        <PerformanceMetrics trades={trades} initialCapital={initialCapital} />
      </div>
    );
  }

  return (
    <div className="pwrap">
      {/* ── Header ── */}
      <div className="phead">
        <p className="eyebrow">
          <TrendingDown size={13} style={{ color: 'var(--amber)' }} /> Execution diagnostics
        </p>
        <h2>Performance Command Center</h2>
        <p className="sub">One page to diagnose outcome quality, identify drag sources, and prioritize the next execution change.</p>
      </div>

      <div className="card" style={{ padding: '19px 24px 20px' }}>
        <span className="accent" style={{ width: 56, background: 'var(--amber)' }} />
        <div className="cardhead">
          <div>
            <h4>How to Use</h4>
            <p className="sub sm">Work top-down; change one thing at a time.</p>
          </div>
          <button onClick={() => setShowMetrics(true)} className="viewall">
            <BarChart3 size={14} /> 50+ Metrics <ArrowRight size={12} />
          </button>
        </div>
        <div className="klist num" style={{ marginTop: 14 }}>
          <div><b>1</b><span>Validate net and drawdown first.</span></div>
          <div><b>2</b><span>Check symbol/session/duration drivers.</span></div>
          <div><b>3</b><span>Execute one top action for 5-7 sessions.</span></div>
        </div>
      </div>

      {/* ── Outcome Snapshot + Action Priority ── */}
      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_minmax(0,360px)] gap-6 items-start mt-6">
        <div className="card">
          <span className="accent" style={{ width: 56, background: 'var(--teal)' }} />
          <div className="cardhead">
            <div>
              <h3>Outcome Snapshot</h3>
              <p className="sub">Current result vs realistic recovery from detected leaks</p>
            </div>
            <Activity size={16} style={{ marginLeft: 'auto', color: 'var(--teal)' }} />
          </div>
          <div className="nba">
            <div className="inset">
              <span className="accent" style={{ background: 'var(--amber)' }} />
              <p className="lbl">CURRENT NET</p>
              <em className={pnlColor(m.totalPnL)}>{fmtPnl(m.totalPnL)}</em>
              <small>Realized result for selected range</small>
            </div>
            <div className="inset">
              <span className="accent" style={{ background: 'var(--green)' }} />
              <p className="lbl">RECOVERABLE LEAK DRAG</p>
              <em style={{ color: 'var(--green)' }}>{formatCurrency(m.leakAmount.conservative)}</em>
              <small>{initialCapital > 0 ? `${((m.leakAmount.conservative / Math.abs(m.totalPnL || 1)) * 100).toFixed(1)}% of current net magnitude` : 'Set initial capital for %'}</small>
            </div>
            <div className="inset">
              <span className="accent" style={{ background: 'var(--red)' }} />
              <p className="lbl">PROJECTED NET AFTER FIXES</p>
              <em className={pnlColor(m.projectedPnL)}>{fmtPnl(m.projectedPnL)}</em>
              <small>{m.leakAmount.conservative > 0 ? 'Low confidence' : 'No leaks detected'}</small>
            </div>
          </div>
          <div className="note" style={{ height: 'auto', minHeight: 44, padding: '12px 18px', lineHeight: '18px' }}>
            <span>
              Gross detected leak burden: <span style={{ color: 'var(--red)', fontFamily: 'var(--mono)' }}>{formatCurrency(m.leakAmount.gross)}</span> &bull;
              Overlap-adjusted: <span style={{ color: 'var(--amber)', fontFamily: 'var(--mono)' }}>{formatCurrency(m.leakAmount.overlap)}</span> &bull;
              Conservative recovery: <span style={{ color: 'var(--green)', fontFamily: 'var(--mono)' }}>{formatCurrency(m.leakAmount.conservative)}</span>
            </span>
          </div>
        </div>

        {/* Action Priority */}
        <div className="card">
          <span className="accent" style={{ width: 56, background: 'var(--pink)' }} />
          <div className="cardhead">
            <div>
              <h3>Action Priority</h3>
              <p className="sub">Execute one change at a time</p>
            </div>
            <Target size={16} style={{ marginLeft: 'auto', color: 'var(--pink)' }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 20 }}>
            {m.actions.map((a, i) => (
              <div key={i} className="inset" style={{ position: 'relative', padding: '13px 16px' }}>
                <span className="accent" style={{ position: 'absolute', left: 0, top: -1, width: 30, height: 3, background: 'var(--amber)' }} />
                <p className="lbl" style={{ color: 'var(--amber)' }}>ACTION {i + 1}</p>
                <p style={{ margin: '9px 0 0', fontWeight: 700, fontSize: 13, color: 'var(--text)' }}>{a.title}</p>
                <p style={{ margin: '6px 0 0', fontSize: 11.5, lineHeight: '17px', color: 'var(--muted-2)' }}>{a.description}</p>
              </div>
            ))}
          </div>
          <button className="btn-a" style={{ width: '100%', marginTop: 16 }}>
            Open Detailed Verdicts <ChevronRight size={14} />
          </button>
        </div>
      </div>

      {/* ── Stat Cards Row ── */}
      <div className="stats" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', marginTop: 24 }}>
        {[
          { label: 'Net P&L', icon: '$', value: fmtPnl(m.totalPnL), sub: 'Realized outcome', color: pnlColor(m.totalPnL), accent: 'var(--green)' },
          { label: 'Trades', icon: <Activity size={16} />, value: String(m.closed.length), sub: `Sample in range`, color: 'text-[var(--text)]', accent: 'var(--teal)' },
          { label: 'Win Rate', icon: <Target size={16} />, value: `${m.winRate.toFixed(1)}%`, sub: `${m.wins} wins / ${m.losses} losses`, color: m.winRate >= 50 ? 'text-[var(--green)]' : 'text-[var(--red)]', accent: 'var(--amber)' },
          { label: 'Profit Factor', icon: <BarChart3 size={16} />, value: m.profitFactor === Infinity ? '∞' : m.profitFactor.toFixed(2), sub: `Avg win ${fmtPnl(m.avgWin)} / avg loss ${fmtPnl(m.avgLoss)}`, color: m.profitFactor >= 1 ? 'text-[var(--green)]' : 'text-[var(--red)]', accent: 'var(--pink)' },
          { label: 'Max Drawdown', icon: <TrendingDown size={16} />, value: fmtPnl(m.maxDD), sub: <span className={pnlColor(-m.maxDDPercent)}>{m.maxDDPercent.toFixed(1)}%</span>, color: 'text-[var(--red)]', accent: 'var(--red)' },
          { label: 'Avg Hold', icon: <Clock size={16} />, value: m.holdLabel, sub: 'Execution tempo', color: 'text-[var(--text)]', accent: 'var(--teal)' },
        ].map(card => (
          <div key={card.label} className="stat" style={{ height: 'auto', minHeight: 104 }}>
            <span className="accent" style={{ background: card.accent }} />
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <b>{card.label.toUpperCase()}</b>
              <span style={{ marginLeft: 'auto', color: 'var(--muted-3)' }}>{card.icon}</span>
            </div>
            <em className={card.color} style={{ fontSize: 22, lineHeight: '28px' }}>{card.value}</em>
            <small style={{ display: 'block', fontSize: 10.5, color: 'var(--muted-2)', marginTop: 6 }}>{card.sub}</small>
          </div>
        ))}
      </div>

      {/* ── Equity Trajectory & Fix Projection ── */}
      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_minmax(0,320px)] gap-6 items-start mt-6">
        <div className="card">
          <span className="accent" style={{ width: 56, background: 'var(--green)' }} />
          <div className="cardhead">
            <div>
              <h3>Equity Trajectory &amp; Fix Projection</h3>
              <p className="sub">Validate whether process changes are improving slope and reducing drawdown</p>
            </div>
            <TrendingUp size={16} style={{ marginLeft: 'auto', color: 'var(--green)' }} />
          </div>
          {m.equityData.length > 1 ? (
            <div style={{ height: 280, marginTop: 20 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={m.equityData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                  <defs>
                    <linearGradient id="eqGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#24c88a" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#24c88a" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#182432" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#7f8ea3' }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#7f8ea3' }} tickLine={false} axisLine={false} tickFormatter={v => `$${v}`} />
                  <Tooltip contentStyle={{ background: '#0c1119', border: '1px solid #182432', borderRadius: '2px', fontSize: '12px', color: '#edf2f7' }} formatter={(v: unknown) => [formatCurrency(v as number), 'Equity']} />
                  <Area type="monotone" dataKey="pnl" stroke="#24c88a" strokeWidth={2} fill="url(#eqGrad)" dot={false} isAnimationActive={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="plot"><span className="empty">Need 2+ closed trades</span></div>
          )}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card" style={{ padding: '19px 22px 20px' }}>
            <p className="lbl">CURRENT VS PROJECTED</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 12, fontFamily: 'var(--mono)', fontSize: 14 }}>
              <span className={pnlColor(m.totalPnL)}>{fmtPnl(m.totalPnL)}</span>
              <ArrowRight size={14} style={{ color: 'var(--muted-3)' }} />
              <span className={pnlColor(m.projectedPnL)}>{fmtPnl(m.projectedPnL)}</span>
            </div>
            <p style={{ margin: '10px 0 0', fontSize: 11.5, color: 'var(--muted-2)' }}>
              Modeled improvement: <span style={{ color: 'var(--green)', fontFamily: 'var(--mono)' }}>{formatCurrency(m.leakAmount.conservative)}</span>
            </p>
          </div>
          <div className="card" style={{ padding: '19px 22px 20px' }}>
            <p className="lbl">SESSION SIGNAL</p>
            <div className="mrow" style={{ marginTop: 10 }}>
              <span className="lb" style={{ marginLeft: 0 }}>Best · {m.bestSession?.label}</span>
              <span className="val" style={{ color: 'var(--green)' }}>{fmtPnl(m.bestSession?.pnl ?? 0)}</span>
            </div>
            <div className="mrow">
              <span className="lb" style={{ marginLeft: 0 }}>Worst · {m.worstSession?.label}</span>
              <span className="val" style={{ color: 'var(--red)' }}>{fmtPnl(m.worstSession?.pnl ?? 0)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Symbol Leaders & Session Diagnostics ── */}
      <div className="split" style={{ marginTop: 24 }}>
        {/* Symbol Leaders & Drags */}
        <div className="card">
          <span className="accent" style={{ width: 56, background: 'var(--amber)' }} />
          <div className="cardhead">
            <div>
              <h3>Symbol Leaders &amp; Drags</h3>
              <p className="sub">Where edge is concentrated vs leaking</p>
            </div>
            <Clock size={16} style={{ marginLeft: 'auto', color: 'var(--amber)' }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 24, marginTop: 22 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 6 }}>
                <span className="lbl">TOP SYMBOLS</span>
                <span className="chip" style={{ height: 20, padding: '0 9px', fontSize: 9, fontWeight: 700, color: 'var(--green)', borderColor: 'var(--line)' }}>EDGE</span>
              </div>
              {m.topSymbols.length > 0 ? m.topSymbols.slice(0, 5).map(c => (
                <div key={c.coin} className="mrow">
                  <div>
                    <div style={{ fontWeight: 700, color: 'var(--text)' }}>{c.coin}</div>
                    <div style={{ fontSize: 10.5, color: 'var(--muted-2)', marginTop: 3 }}>{c.total} trades &bull; {c.winRate}% &bull; avg {fmtPnl(c.avgPnl)}</div>
                  </div>
                  <span className="val" style={{ color: c.pnl > 0 ? 'var(--green)' : c.pnl < 0 ? 'var(--red)' : 'var(--muted)' }}>{fmtPnl(c.pnl)}</span>
                </div>
              )) : <p style={{ margin: '10px 0 0', fontSize: 11.5, color: 'var(--muted)' }}>No positive symbol edge detected in this range.</p>}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 6 }}>
                <span className="lbl">WEAK SYMBOLS</span>
                <span className="chip" style={{ height: 20, padding: '0 9px', fontSize: 9, fontWeight: 700, color: 'var(--red)', borderColor: 'var(--line)' }}>LEAK</span>
              </div>
              {m.weakSymbols.length > 0 ? m.weakSymbols.slice(0, 5).map(c => (
                <div key={c.coin} className="inset" style={{ padding: '10px 14px', marginTop: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <span style={{ fontWeight: 700, fontSize: 12.5, color: 'var(--text)' }}>{c.coin}</span>
                    <span className={`${pnlColor(c.pnl)}`} style={{ marginLeft: 'auto', fontFamily: 'var(--mono)', fontSize: 12.5 }}>{fmtPnl(c.pnl)}</span>
                  </div>
                  <div style={{ fontSize: 10.5, color: 'var(--muted-2)', marginTop: 4 }}>{c.total} trades &bull; {c.winRate}% &bull; avg {fmtPnl(c.avgPnl)}</div>
                </div>
              )) : <p style={{ margin: '10px 0 0', fontSize: 11.5, color: 'var(--muted)' }}>No weak symbols detected.</p>}
            </div>
          </div>
        </div>

        {/* Session & Hourly Diagnostics */}
        <div className="card">
          <span className="accent" style={{ width: 56, background: 'var(--teal)' }} />
          <div className="cardhead">
            <div>
              <h3>Session &amp; Hourly Diagnostics</h3>
              <p className="sub">Timing quality and trade concentration by UTC window</p>
            </div>
            <Clock size={16} style={{ marginLeft: 'auto', color: 'var(--teal)' }} />
          </div>
          <div style={{ marginTop: 20 }}>
            {m.sessionData.map(s => (
              <div key={s.label} className="mrow">
                <div style={{ width: 104, flex: 'none' }}>
                  <div style={{ fontWeight: 700, color: 'var(--text)' }}>{s.label}</div>
                  <div style={{ fontSize: 10, color: 'var(--muted-2)', marginTop: 3 }}>{s.time}</div>
                </div>
                <div style={{ flex: 1, margin: '0 14px' }}>
                  <div style={{ height: 4, background: 'var(--rail)' }}>
                    <i
                      style={{
                        display: 'block', height: 4,
                        background: s.pnl >= 0 ? 'var(--green)' : 'var(--red)',
                        width: `${Math.min((Math.abs(s.pnl) / barMaxAbs) * 100, 100)}%`,
                      }}
                    />
                  </div>
                </div>
                <span className="val" style={{ width: 92, textAlign: 'right', color: s.pnl > 0 ? 'var(--green)' : s.pnl < 0 ? 'var(--red)' : 'var(--muted)' }}>{fmtPnl(s.pnl)}</span>
              </div>
            ))}
          </div>
          {m.hourlyData.some(h => h.pnl !== 0) && (
            <div style={{ height: 160, marginTop: 18 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={m.hourlyData}>
                  <XAxis dataKey="hour" tick={{ fontSize: 9, fill: '#7f8ea3' }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 9, fill: '#7f8ea3' }} tickLine={false} axisLine={false} tickFormatter={v => `$${v}`} />
                  <Tooltip contentStyle={{ background: '#0c1119', border: '1px solid #182432', borderRadius: '2px', fontSize: '11px', color: '#edf2f7' }} formatter={(v: unknown) => [formatCurrency(v as number), 'P&L']} />
                  <Bar dataKey="pnl" radius={[2, 2, 0, 0]}>
                    {m.hourlyData.map((d, i) => (
                      <rect key={i} fill={d.pnl >= 0 ? '#24c88a' : '#ff4d5e'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
          <p className="footnote" style={{ marginTop: 14, textAlign: 'left' }}>
            Hourly coverage: {m.closed.length} trades ({m.closed.length > 0 ? '100.0' : '0'}% of sample)
          </p>
        </div>
      </div>

      {/* ── Hold Profile + Size & Cost ── */}
      <div className="split" style={{ marginTop: 24 }}>
        <div className="card">
          <span className="accent" style={{ width: 56, background: 'var(--pink)' }} />
          <div className="cardhead">
            <div>
              <h3>Hold Profile Quality</h3>
              <p className="sub">Which hold durations create or destroy P&amp;L</p>
            </div>
            <Clock size={16} style={{ marginLeft: 'auto', color: 'var(--pink)' }} />
          </div>
          <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {m.holdData.map(h => {
              const maxPnl = Math.max(...m.holdData.map(d => Math.abs(d.pnl)), 1);
              return (
                <div key={h.label} className="inset" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '10px 16px' }}>
                  <div style={{ width: 128, flex: 'none' }}>
                    <div style={{ fontWeight: 700, fontSize: 12.5, color: 'var(--text)' }}>{h.label}</div>
                    <div style={{ fontSize: 10.5, color: 'var(--muted-2)', marginTop: 3 }}>{h.count} trades</div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ height: 4, background: 'var(--rail)' }}>
                      <i style={{ display: 'block', height: 4, background: h.pnl >= 0 ? 'var(--green)' : 'var(--red)', width: `${(Math.abs(h.pnl) / maxPnl) * 100}%` }} />
                    </div>
                  </div>
                  <span className={pnlColor(h.pnl)} style={{ flex: 'none', fontFamily: 'var(--mono)', fontSize: 12.5 }}>{fmtPnl(h.pnl)}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="card">
          <span className="accent" style={{ width: 56, background: 'var(--amber)' }} />
          <div className="cardhead">
            <div>
              <h3>Size &amp; Cost Efficiency</h3>
              <p className="sub">Position-size buckets and execution cost drag</p>
            </div>
            <span style={{ marginLeft: 'auto', color: 'var(--amber)', fontFamily: 'var(--mono)', fontSize: 16 }}>$</span>
          </div>
          <div style={{ marginTop: 20 }}>
            {m.sizeData.map(s => (
              <div key={s.label} className="mrow">
                <div>
                  <div style={{ color: 'var(--text)' }}>{s.label}</div>
                  <div style={{ fontSize: 10.5, color: 'var(--muted-2)', marginTop: 3 }}>{s.count} trades</div>
                </div>
                <span className="val" style={{ color: s.pnl > 0 ? 'var(--green)' : s.pnl < 0 ? 'var(--red)' : 'var(--muted)' }}>{fmtPnl(s.pnl)}</span>
              </div>
            ))}
          </div>
          <div className="inset" style={{ position: 'relative', marginTop: 16, padding: '14px 16px' }}>
            <span className="accent" style={{ position: 'absolute', left: 0, top: -1, width: 36, height: 3, background: 'var(--green)' }} />
            <p className="lbl" style={{ color: 'var(--green)' }}>COST DRAG</p>
            <p style={{ margin: '8px 0 0', fontFamily: 'var(--mono)', fontSize: 20, lineHeight: '26px', color: 'var(--text)' }}>$0.00</p>
            <p style={{ margin: '6px 0 0', fontSize: 10.5, color: 'var(--muted-2)' }}>Fees: $0.00 &bull; Funding: $0.00 &bull; ~$0.00/trade</p>
          </div>
        </div>
      </div>

      {/* ── Bottom Cards: Loss Streak, Revenge, Process, Direction ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 16, marginTop: 24 }}>
        <div className="card">
          <span className="accent" style={{ width: 44, background: 'var(--red)' }} />
          <div className="cardhead">
            <div>
              <h4>Loss Streak Risk</h4>
              <p className="sub sm">Consecutive-loss exposure</p>
            </div>
            <Flame size={16} style={{ marginLeft: 'auto', color: 'var(--red)' }} />
          </div>
          <p className="bignum" style={{ fontSize: 34, lineHeight: '42px', marginTop: 14 }}>{m.maxLossStreak}</p>
          <p style={{ margin: '4px 0 0', fontSize: 11.5, color: 'var(--muted-2)' }}>{m.fivePlusStreaks} streaks with 5+ losses</p>
        </div>

        <div className="card">
          <span className="accent" style={{ width: 44, background: 'var(--amber)' }} />
          <div className="cardhead">
            <div>
              <h4>Revenge Signal</h4>
              <p className="sub sm">Post-loss impulse risk</p>
            </div>
            <Zap size={16} style={{ marginLeft: 'auto', color: 'var(--amber)' }} />
          </div>
          <p className="bignum" style={{ fontSize: 26, lineHeight: '38px', marginTop: 14, color: m.revengeCount === 0 ? 'var(--green)' : 'var(--red)' }}>
            {m.revengeCount === 0 ? 'Clear' : `${m.revengeCount} detected`}
          </p>
          <p style={{ margin: '4px 0 0', fontSize: 11.5, color: 'var(--muted-2)' }}>
            {m.revengeCount === 0 ? 'No revenge trading cluster detected in this range.' : `${m.revengeCount} trades entered within 30min of a loss.`}
          </p>
        </div>

        <div className="card">
          <span className="accent" style={{ width: 44, background: 'var(--teal)' }} />
          <div className="cardhead">
            <div>
              <h4>Process Stability</h4>
              <p className="sub sm">Consistency and volatility blend</p>
            </div>
            <Shield size={16} style={{ marginLeft: 'auto', color: 'var(--teal)' }} />
          </div>
          <p className="bignum" style={{ fontSize: 34, lineHeight: '42px', marginTop: 14 }}>{m.processScore}<span style={{ fontSize: 16, color: 'var(--muted-2)' }}>/100</span></p>
          <div style={{ height: 2, background: 'var(--rail)', marginTop: 10 }}>
            <i style={{ display: 'block', height: 2, background: 'var(--teal)', width: `${m.processScore}%` }} />
          </div>
          <p style={{ margin: '10px 0 0', fontSize: 11.5, color: 'var(--muted-2)' }}>Daily volatility: {formatCurrency(m.dailyVolatility)}</p>
        </div>

        <div className="card">
          <span className="accent" style={{ width: 44, background: 'var(--green)' }} />
          <div className="cardhead">
            <div>
              <h4>Directional Mix</h4>
              <p className="sub sm">Long vs short quality</p>
            </div>
            <Activity size={16} style={{ marginLeft: 'auto', color: 'var(--green)' }} />
          </div>
          <div style={{ marginTop: 14 }}>
            <div className="mrow">
              <div>
                <div style={{ fontWeight: 700, color: 'var(--green)' }}>Long</div>
                <div style={{ fontSize: 10.5, color: 'var(--muted-2)', marginTop: 3 }}>{m.longTrades.length} trades &bull; {m.longWR}%</div>
              </div>
              <span className="val" style={{ color: m.longPnL > 0 ? 'var(--green)' : m.longPnL < 0 ? 'var(--red)' : 'var(--muted)' }}>{fmtPnl(m.longPnL)}</span>
            </div>
            <div className="mrow">
              <div>
                <div style={{ fontWeight: 700, color: 'var(--red)' }}>Short</div>
                <div style={{ fontSize: 10.5, color: 'var(--muted-2)', marginTop: 3 }}>{m.shortTrades.length} trades &bull; {m.shortWR}%</div>
              </div>
              <span className="val" style={{ color: m.shortPnL > 0 ? 'var(--green)' : m.shortPnL < 0 ? 'var(--red)' : 'var(--muted)' }}>{fmtPnl(m.shortPnL)}</span>
            </div>
          </div>
          <div style={{ display: 'flex', height: 2, background: 'var(--rail)', marginTop: 14 }}>
            {m.longTrades.length + m.shortTrades.length > 0 && (
              <>
                <div style={{ height: 2, background: 'var(--green)', width: `${(m.longTrades.length / (m.longTrades.length + m.shortTrades.length)) * 100}%` }} />
                <div style={{ height: 2, background: 'var(--red)', flex: 1 }} />
              </>
            )}
          </div>
          {m.longPnL < 0 && m.shortPnL >= m.longPnL && (
            <div className="inset" style={{ marginTop: 14, padding: '11px 14px' }}>
              <p className="lbl" style={{ color: 'var(--green)' }}>SHORT OUTPERFORMS</p>
              <p style={{ margin: '7px 0 0', fontSize: 10.5, lineHeight: '16px', color: 'var(--muted-2)' }}>
                LONG setup quality is the main drag. Reduce LONG size/frequency until win-rate and expectancy stabilize.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── Daily Execution Calendar ── */}
      <div className="card" style={{ marginTop: 24, padding: '25px 28px 30px' }}>
        <span className="accent" style={{ width: 56, background: 'var(--amber)' }} />
        <div className="cardhead" style={{ flexWrap: 'wrap', gap: 16 }}>
          <div style={{ display: 'flex', gap: 14 }}>
            <Calendar size={16} style={{ color: 'var(--amber)', flex: 'none', marginTop: 2 }} />
            <div>
              <h3>Daily Execution Calendar</h3>
              <p className="sub">Inspect each day: result, quality score, and trade-level drivers.</p>
            </div>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 14 }}>
            <button onClick={() => setCalMonth(subMonths(calMonth, 1))} className="btn-g" style={{ height: 30, width: 30, padding: 0 }}><ChevronLeft size={16} /></button>
            <div style={{ textAlign: 'right' }}>
              <p className="lbl">ACTIVE MONTH</p>
              <p style={{ margin: '5px 0 0', fontWeight: 700, fontSize: 12.5, color: 'var(--text)' }}>{format(calMonth, 'MMMM yyyy')}</p>
            </div>
            <button onClick={() => setCalMonth(addMonths(calMonth, 1))} className="btn-g" style={{ height: 30, width: 30, padding: 0 }}><ChevronRight size={16} /></button>
          </div>
        </div>

        <div className={`grid gap-6 items-start mt-6 grid-cols-1 ${selectedDay ? 'xl:grid-cols-[minmax(0,1fr)_minmax(0,320px)]' : ''}`}>
          {/* Calendar grid */}
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 6, marginBottom: 6 }}>
              {['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'].map(d => (
                <div key={d} className="lbl" style={{ textAlign: 'center', padding: '4px 0' }}>{d}</div>
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 6 }}>
              {/* Empty cells before first day */}
              {Array.from({ length: (getDay(calendarData.start) + 6) % 7 }, (_, i) => (
                <div key={`empty-${i}`} style={{ height: 70 }} />
              ))}
              {calendarData.days.map(day => {
                const key = format(day, 'yyyy-MM-dd');
                const data = calendarData.dayMap.get(key);
                const isSelected = selectedDay === key;
                return (
                  <button
                    key={key}
                    onClick={() => setSelectedDay(key)}
                    className="inset"
                    style={{
                      height: 70,
                      textAlign: 'left',
                      padding: '7px 9px',
                      position: 'relative',
                      borderColor: isSelected ? 'var(--amber)' : data ? (data.pnl >= 0 ? 'rgba(36,200,138,.35)' : 'rgba(255,77,94,.35)') : 'var(--line)',
                    }}
                  >
                    <div style={{ fontWeight: 700, fontSize: 11.5, color: 'var(--text)' }}>{format(day, 'd')}</div>
                    {data ? (
                      <>
                        <div className={pnlColor(data.pnl)} style={{ fontFamily: 'var(--mono)', fontSize: 10.5, marginTop: 3 }}>{fmtPnl(data.pnl)}</div>
                        <div style={{ fontSize: 8.5, color: 'var(--muted-2)', marginTop: 2 }}>{data.trades} trades &bull; {data.winRate}%</div>
                      </>
                    ) : (
                      <div style={{ fontSize: 9, color: 'var(--muted-3)', marginTop: 3 }}>No activity</div>
                    )}
                    {data && data.trades > 0 && (
                      <span style={{
                        position: 'absolute', right: 6, bottom: 6, width: 14, height: 14, borderRadius: 2,
                        background: 'var(--amber)', color: 'var(--ink)', fontSize: 8, fontWeight: 700,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        {data.trades}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Month summary */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 12, marginTop: 18 }}>
              <div className="inset">
                <p className="lbl">MONTH NET</p>
                <p className={pnlColor(calendarData.monthPnL)} style={{ margin: '7px 0 0', fontFamily: 'var(--mono)', fontSize: 18 }}>{fmtPnl(calendarData.monthPnL)}</p>
              </div>
              <div className="inset">
                <p className="lbl">MONTH TRADES</p>
                <p style={{ margin: '7px 0 0', fontFamily: 'var(--mono)', fontSize: 18, color: 'var(--text)' }}>{calendarData.monthTrades}</p>
              </div>
              <div className="inset">
                <p className="lbl">MONTH WIN RATE</p>
                <p style={{ margin: '7px 0 0', fontFamily: 'var(--mono)', fontSize: 18, color: calendarData.monthWR >= 50 ? 'var(--green)' : 'var(--red)' }}>{calendarData.monthWR}%</p>
              </div>
            </div>
          </div>

          {/* Selected day detail */}
          {selectedDay && (
            <div>
              <p className="lbl">SELECTED DAY</p>
              <p style={{ margin: '9px 0 0', fontFamily: 'var(--display)', fontWeight: 700, fontSize: 17, color: 'var(--text)' }}>{format(new Date(selectedDay), 'dd MMM yyyy')}</p>
              {selectedDayData ? (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 14 }}>
                    <div className="inset">
                      <p className="lbl">NET</p>
                      <p className={pnlColor(selectedDayData.pnl)} style={{ margin: '6px 0 0', fontFamily: 'var(--mono)', fontSize: 15 }}>{fmtPnl(selectedDayData.pnl)}</p>
                    </div>
                    <div className="inset">
                      <p className="lbl">TRADES</p>
                      <p style={{ margin: '6px 0 0', fontFamily: 'var(--mono)', fontSize: 15, color: 'var(--text)' }}>{selectedDayData.trades}</p>
                    </div>
                    <div className="inset">
                      <p className="lbl">WIN RATE</p>
                      <p style={{ margin: '6px 0 0', fontFamily: 'var(--mono)', fontSize: 15, color: 'var(--text)' }}>{selectedDayData.winRate}%</p>
                    </div>
                    <div className="inset">
                      <p className="lbl">QUALITY</p>
                      <p style={{ margin: '6px 0 0', fontFamily: 'var(--mono)', fontSize: 15, color: 'var(--muted)' }}>-</p>
                    </div>
                  </div>
                  {selectedDayData.topCoin && (
                    <p style={{ margin: '14px 0 0', fontSize: 12, color: 'var(--text-2)' }}>
                      Top symbol: <span style={{ fontWeight: 700, color: 'var(--text)' }}>{selectedDayData.topCoin}</span>{' '}
                      (<span className={pnlColor(selectedDayData.topCoinPnl)}>{fmtPnl(selectedDayData.topCoinPnl)}</span>)
                    </p>
                  )}
                  <p className="lbl" style={{ marginTop: 18 }}>TOP TRADES</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 9 }}>
                    {selectedDayData.tradeList
                      .sort((a, b) => Math.abs(b.actualPnL!) - Math.abs(a.actualPnL!))
                      .slice(0, 5)
                      .map(t => (
                        <div key={t.id} className="inset" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '9px 14px' }}>
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div style={{ fontSize: 11.5, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {t.exitDate ? format(new Date(t.exitDate), 'HH:mm') : '-'} &bull; {t.coin}
                            </div>
                            <div style={{ fontSize: 10, color: 'var(--muted-2)', marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              <span style={{ color: (t.direction ?? 'long') === 'long' ? 'var(--green)' : 'var(--red)' }}>{(t.direction ?? 'long').toUpperCase()}</span> &bull; In {formatCurrency(t.entryPrice)} &bull; Out {t.exitPrice ? formatCurrency(t.exitPrice) : '-'}
                            </div>
                          </div>
                          <span className={pnlColor(t.actualPnL ?? 0)} style={{ flex: 'none', fontFamily: 'var(--mono)', fontSize: 12.5 }}>{fmtPnl(t.actualPnL ?? 0)}</span>
                        </div>
                      ))}
                  </div>
                </>
              ) : (
                <p style={{ margin: '14px 0 0', fontSize: 12, color: 'var(--muted)' }}>No trading activity on this day.</p>
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
