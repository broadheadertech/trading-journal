'use client';

import { useMemo, useState } from 'react';
import { Trade } from '@/lib/types';
import { useCurrency } from '@/hooks/useCurrency';
import { TrendingUp, Shield, Clock, Flame, BarChart3, Brain, DollarSign, ChevronDown } from 'lucide-react';

interface PerformanceMetricsProps {
  trades: Trade[];
  initialCapital?: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(n: number | null, decimals = 2): string {
  if (n === null || isNaN(n) || !isFinite(n)) return '—';
  return n.toFixed(decimals);
}

function fmtDollar(n: number | null): string {
  if (n === null || isNaN(n) || !isFinite(n)) return '—';
  return (n < 0 ? '-' : '') + '$' + Math.abs(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtPct(n: number | null): string {
  if (n === null || isNaN(n) || !isFinite(n)) return '—';
  return n.toFixed(1) + '%';
}

function formatDur(ms: number): string {
  if (ms < 0 || isNaN(ms)) return '—';
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  if (h > 24) {
    const d = Math.floor(h / 24);
    return `${d}d ${h % 24}h`;
  }
  return `${h}h ${m}m`;
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// ─── Metric Card ─────────────────────────────────────────────────────────────

function MetricCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3 sm:p-4">
      <p className="text-[10px] uppercase tracking-wider text-white/40 mb-1">{label}</p>
      <p className={`text-lg sm:text-xl font-bold ${color || 'text-white/90'}`}>{value}</p>
      {sub && <p className="text-[10px] text-white/30 mt-0.5">{sub}</p>}
    </div>
  );
}

function MiniTable({ headers, rows }: { headers: string[]; rows: (string | number)[][] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-white/10">
            {headers.map(h => <th key={h} className="text-left text-white/40 px-2 py-1 font-medium">{h}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-white/[0.04]">
              {row.map((cell, j) => (
                <td key={j} className="px-2 py-1 text-white/70">{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Section({ title, icon: Icon, children, defaultOpen = true }: {
  title: string;
  icon: typeof TrendingUp;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/[0.02] transition-colors"
      >
        <Icon size={16} className="text-white/50" />
        <span className="text-sm font-medium text-white/80 flex-1">{title}</span>
        <ChevronDown size={14} className={`text-white/30 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <div className="px-4 pb-4">{children}</div>}
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function PerformanceMetrics({ trades, initialCapital = 0 }: PerformanceMetricsProps) {
  const { formatCurrency } = useCurrency();
  const closed = useMemo(() => trades.filter(t => !t.isOpen && t.actualPnL !== null), [trades]);

  const m = useMemo(() => {
    if (closed.length === 0) return null;

    const wins = closed.filter(t => (t.actualPnL ?? 0) > 0);
    const losses = closed.filter(t => (t.actualPnL ?? 0) < 0);
    const breakEven = closed.filter(t => Math.abs(t.actualPnLPercent ?? 0) < 0.5);

    const totalPnL = closed.reduce((s, t) => s + (t.actualPnL ?? 0), 0);
    const grossProfit = wins.reduce((s, t) => s + (t.actualPnL ?? 0), 0);
    const grossLoss = Math.abs(losses.reduce((s, t) => s + (t.actualPnL ?? 0), 0));
    const avgWin = wins.length > 0 ? grossProfit / wins.length : 0;
    const avgLoss = losses.length > 0 ? grossLoss / losses.length : 0;

    // Profit Factor
    const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0;
    // Payoff Ratio
    const payoffRatio = avgLoss > 0 ? avgWin / avgLoss : avgWin > 0 ? Infinity : 0;
    // Expectancy
    const winRate = wins.length / closed.length;
    const expectancy = totalPnL / closed.length;
    // Kelly
    const kelly = payoffRatio > 0 ? winRate - (1 - winRate) / payoffRatio : 0;

    // Drawdown
    let peak = initialCapital || 1000;
    let maxDD = 0;
    let maxDDPct = 0;
    let cumulative = peak;
    for (const t of closed.sort((a, b) => new Date(a.entryDate).getTime() - new Date(b.entryDate).getTime())) {
      cumulative += (t.actualPnL ?? 0);
      if (cumulative > peak) peak = cumulative;
      const dd = peak - cumulative;
      if (dd > maxDD) {
        maxDD = dd;
        maxDDPct = peak > 0 ? (dd / peak) * 100 : 0;
      }
    }

    // Sharpe & Sortino (per-trade returns)
    const returns = closed.map(t => (t.actualPnLPercent ?? 0) / 100);
    const meanReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((s, r) => s + (r - meanReturn) ** 2, 0) / returns.length;
    const stdDev = Math.sqrt(variance);
    const sharpe = stdDev > 0 ? (meanReturn / stdDev) * Math.sqrt(252) : 0;
    const downside = returns.filter(r => r < 0);
    const downsideVar = downside.length > 0 ? downside.reduce((s, r) => s + r ** 2, 0) / downside.length : 0;
    const downsideDev = Math.sqrt(downsideVar);
    const sortino = downsideDev > 0 ? (meanReturn / downsideDev) * Math.sqrt(252) : 0;

    // Calmar
    const firstDate = new Date(closed[0].entryDate).getTime();
    const lastDate = new Date(closed[closed.length - 1].entryDate).getTime();
    const years = Math.max((lastDate - firstDate) / (365.25 * 86400000), 0.1);
    const annualReturn = totalPnL / years;
    const calmar = maxDD > 0 ? annualReturn / maxDD : 0;
    const recoveryFactor = maxDD > 0 ? totalPnL / maxDD : 0;

    // R-Multiple
    const tradesWithSL = closed.filter(t => t.stopLoss !== null && t.stopLoss !== undefined);
    let avgR = null as number | null;
    if (tradesWithSL.length > 0) {
      const rMultiples = tradesWithSL.map(t => {
        const risk = Math.abs(t.entryPrice - (t.stopLoss ?? t.entryPrice)) * (t.capital / t.entryPrice);
        return risk > 0 ? (t.actualPnL ?? 0) / risk : 0;
      });
      avgR = rMultiples.reduce((a, b) => a + b, 0) / rMultiples.length;
    }

    // Holding time
    const durations = closed
      .filter(t => t.exitDate)
      .map(t => new Date(t.exitDate!).getTime() - new Date(t.entryDate).getTime())
      .filter(d => d > 0);
    const avgDuration = durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0;
    const minDuration = durations.length > 0 ? Math.min(...durations) : 0;
    const maxDuration = durations.length > 0 ? Math.max(...durations) : 0;

    // Day of week
    const byDay: Record<number, { wins: number; total: number }> = {};
    for (const t of closed) {
      const d = new Date(t.entryDate).getDay();
      if (!byDay[d]) byDay[d] = { wins: 0, total: 0 };
      byDay[d].total++;
      if ((t.actualPnL ?? 0) > 0) byDay[d].wins++;
    }
    const bestDay = Object.entries(byDay)
      .filter(([, v]) => v.total >= 3)
      .sort((a, b) => (b[1].wins / b[1].total) - (a[1].wins / a[1].total))[0];

    // Hour of day
    const byHour: Record<number, { wins: number; total: number }> = {};
    for (const t of closed) {
      const h = new Date(t.entryDate).getHours();
      if (!byHour[h]) byHour[h] = { wins: 0, total: 0 };
      byHour[h].total++;
      if ((t.actualPnL ?? 0) > 0) byHour[h].wins++;
    }
    const bestHour = Object.entries(byHour)
      .filter(([, v]) => v.total >= 3)
      .sort((a, b) => (b[1].wins / b[1].total) - (a[1].wins / a[1].total))[0];

    const weeksSpan = Math.max(years * 52, 1);
    const tradesPerWeek = closed.length / weeksSpan;

    // Streaks
    let curWin = 0, curLoss = 0, maxWin = 0, maxLoss = 0;
    const winStreaks: number[] = [];
    const lossStreaks: number[] = [];
    for (const t of closed) {
      if ((t.actualPnL ?? 0) > 0) {
        curWin++;
        if (curLoss > 0) { lossStreaks.push(curLoss); curLoss = 0; }
        maxWin = Math.max(maxWin, curWin);
      } else {
        curLoss++;
        if (curWin > 0) { winStreaks.push(curWin); curWin = 0; }
        maxLoss = Math.max(maxLoss, curLoss);
      }
    }
    if (curWin > 0) winStreaks.push(curWin);
    if (curLoss > 0) lossStreaks.push(curLoss);
    const avgWinStreak = winStreaks.length > 0 ? winStreaks.reduce((a, b) => a + b, 0) / winStreaks.length : 0;
    const avgLossStreak = lossStreaks.length > 0 ? lossStreaks.reduce((a, b) => a + b, 0) / lossStreaks.length : 0;

    // Strategy breakdown
    const byStrategy: Record<string, { wins: number; total: number; pnl: number }> = {};
    for (const t of closed) {
      const s = t.strategy || 'Unknown';
      if (!byStrategy[s]) byStrategy[s] = { wins: 0, total: 0, pnl: 0 };
      byStrategy[s].total++;
      byStrategy[s].pnl += t.actualPnL ?? 0;
      if ((t.actualPnL ?? 0) > 0) byStrategy[s].wins++;
    }

    // Emotion breakdown
    const byEmotion: Record<string, { wins: number; total: number }> = {};
    for (const t of closed) {
      const e = t.emotion || 'Unknown';
      if (!byEmotion[e]) byEmotion[e] = { wins: 0, total: 0 };
      byEmotion[e].total++;
      if ((t.actualPnL ?? 0) > 0) byEmotion[e].wins++;
    }

    // Direction
    const byDir: Record<string, { wins: number; total: number }> = {};
    for (const t of closed) {
      const d = t.direction || 'long';
      if (!byDir[d]) byDir[d] = { wins: 0, total: 0 };
      byDir[d].total++;
      if ((t.actualPnL ?? 0) > 0) byDir[d].wins++;
    }

    // Tags
    const byTag: Record<string, { wins: number; total: number }> = {};
    for (const t of closed) {
      for (const tag of t.tags) {
        if (!byTag[tag]) byTag[tag] = { wins: 0, total: 0 };
        byTag[tag].total++;
        if ((t.actualPnL ?? 0) > 0) byTag[tag].wins++;
      }
    }

    // Confidence calibration
    const confBuckets: Record<string, { wins: number; total: number }> = {};
    for (const t of closed) {
      const bucket = t.confidence <= 3 ? '1-3' : t.confidence <= 5 ? '4-5' : t.confidence <= 7 ? '6-7' : '8-10';
      if (!confBuckets[bucket]) confBuckets[bucket] = { wins: 0, total: 0 };
      confBuckets[bucket].total++;
      if ((t.actualPnL ?? 0) > 0) confBuckets[bucket].wins++;
    }

    // Monthly PnL
    const byMonth: Record<string, number> = {};
    for (const t of closed) {
      const m = t.entryDate.slice(0, 7);
      byMonth[m] = (byMonth[m] || 0) + (t.actualPnL ?? 0);
    }

    // Discipline
    const tradesWithRules = closed.filter(t => t.ruleChecklist.length > 0);
    let totalRules = 0, compliant = 0;
    for (const t of tradesWithRules) {
      for (const r of t.ruleChecklist) {
        totalRules++;
        if (r.compliance === 'yes') compliant++;
        else if (r.compliance === 'partial') compliant += 0.5;
      }
    }
    const disciplineScore = totalRules > 0 ? (compliant / totalRules) * 100 : null;
    const allFollowed = tradesWithRules.filter(t => t.ruleChecklist.every(r => r.compliance === 'yes')).length;
    const anyBroken = tradesWithRules.filter(t => t.ruleChecklist.some(r => r.compliance === 'no')).length;

    // Discipline vs undisciplined win rates
    const disciplinedTrades = tradesWithRules.filter(t => t.ruleChecklist.every(r => r.compliance !== 'no'));
    const undisciplinedTrades = tradesWithRules.filter(t => t.ruleChecklist.some(r => r.compliance === 'no'));
    const discWR = disciplinedTrades.length > 0 ? disciplinedTrades.filter(t => (t.actualPnL ?? 0) > 0).length / disciplinedTrades.length * 100 : null;
    const undiscWR = undisciplinedTrades.length > 0 ? undisciplinedTrades.filter(t => (t.actualPnL ?? 0) > 0).length / undisciplinedTrades.length * 100 : null;
    const fomoCount = closed.filter(t => t.emotion === 'FOMO').length;

    // Position sizing
    const capitals = closed.map(t => t.capital);
    const avgCap = capitals.reduce((a, b) => a + b, 0) / capitals.length;
    const capStdDev = Math.sqrt(capitals.reduce((s, c) => s + (c - avgCap) ** 2, 0) / capitals.length);
    const capCV = avgCap > 0 ? capStdDev / avgCap : 0;

    // Market type breakdown
    const byMarket: Record<string, { wins: number; total: number }> = {};
    for (const t of closed) {
      const m = t.marketType || 'crypto';
      if (!byMarket[m]) byMarket[m] = { wins: 0, total: 0 };
      byMarket[m].total++;
      if ((t.actualPnL ?? 0) > 0) byMarket[m].wins++;
    }

    return {
      totalTrades: closed.length, winRate: winRate * 100, totalPnL, avgPnL: expectancy,
      expectancy, breakEvenRate: (breakEven.length / closed.length) * 100,
      grossProfit, grossLoss, profitFactor, payoffRatio,
      avgWin, avgLoss,
      largestWin: wins.length > 0 ? Math.max(...wins.map(t => t.actualPnL ?? 0)) : 0,
      largestLoss: losses.length > 0 ? Math.min(...losses.map(t => t.actualPnL ?? 0)) : 0,
      maxDD, maxDDPct, sharpe, sortino, calmar, avgR, kelly: kelly * 100, recoveryFactor,
      avgDuration, minDuration, maxDuration,
      bestDay: bestDay ? { day: DAYS[parseInt(bestDay[0])], wr: (bestDay[1].wins / bestDay[1].total) * 100, n: bestDay[1].total } : null,
      bestHour: bestHour ? { hour: parseInt(bestHour[0]), wr: (bestHour[1].wins / bestHour[1].total) * 100, n: bestHour[1].total } : null,
      tradesPerWeek,
      curWinStreak: curWin, curLossStreak: curLoss, maxWinStreak: maxWin, maxLossStreak: maxLoss,
      avgWinStreak, avgLossStreak,
      byStrategy, byEmotion, byDir, byTag, confBuckets, byMonth, byDay, byMarket,
      disciplineScore, ruleComplianceRate: totalRules > 0 ? (compliant / totalRules) * 100 : null,
      allFollowedPct: tradesWithRules.length > 0 ? (allFollowed / tradesWithRules.length) * 100 : null,
      anyBrokenPct: tradesWithRules.length > 0 ? (anyBroken / tradesWithRules.length) * 100 : null,
      discWR, undiscWR, fomoPct: (fomoCount / closed.length) * 100,
      avgCap, capStdDev, largestPos: Math.max(...capitals), capConsistency: capCV < 0.2 ? 'Consistent' : capCV < 0.5 ? 'Variable' : 'Erratic',
    };
  }, [closed, initialCapital]);

  if (!m) {
    return (
      <div className="text-center py-12 text-white/40">
        <BarChart3 size={32} className="mx-auto mb-3 opacity-50" />
        <p className="text-sm">No closed trades yet. Log some trades to see 50+ performance metrics.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <Section title="Overview" icon={TrendingUp} defaultOpen>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          <MetricCard label="Total Trades" value={String(m.totalTrades)} />
          <MetricCard label="Win Rate" value={fmtPct(m.winRate)} color={m.winRate >= 50 ? 'text-emerald-400' : 'text-red-400'} />
          <MetricCard label="Total P&L" value={fmtDollar(m.totalPnL)} color={m.totalPnL >= 0 ? 'text-emerald-400' : 'text-red-400'} />
          <MetricCard label="Avg P&L / Trade" value={fmtDollar(m.avgPnL)} color={m.avgPnL >= 0 ? 'text-emerald-400' : 'text-red-400'} />
          <MetricCard label="Expectancy" value={fmtDollar(m.expectancy)} sub="avg $ return per trade" />
          <MetricCard label="Break-Even Rate" value={fmtPct(m.breakEvenRate)} sub="trades within ±0.5%" />
        </div>
      </Section>

      <Section title="Profitability" icon={DollarSign}>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <MetricCard label="Gross Profit" value={fmtDollar(m.grossProfit)} color="text-emerald-400" />
          <MetricCard label="Gross Loss" value={fmtDollar(-m.grossLoss)} color="text-red-400" />
          <MetricCard label="Profit Factor" value={fmt(m.profitFactor)} sub="> 1.5 = good" color={m.profitFactor >= 1.5 ? 'text-emerald-400' : m.profitFactor >= 1 ? 'text-yellow-400' : 'text-red-400'} />
          <MetricCard label="Payoff Ratio" value={fmt(m.payoffRatio)} sub="avg win / avg loss" />
          <MetricCard label="Average Win" value={fmtDollar(m.avgWin)} color="text-emerald-400" />
          <MetricCard label="Average Loss" value={fmtDollar(-m.avgLoss)} color="text-red-400" />
          <MetricCard label="Largest Win" value={fmtDollar(m.largestWin)} color="text-emerald-400" />
          <MetricCard label="Largest Loss" value={fmtDollar(m.largestLoss)} color="text-red-400" />
        </div>
      </Section>

      <Section title="Risk Metrics" icon={Shield}>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <MetricCard label="Max Drawdown %" value={fmtPct(m.maxDDPct)} color="text-red-400" />
          <MetricCard label="Max Drawdown $" value={fmtDollar(m.maxDD)} color="text-red-400" />
          <MetricCard label="Sharpe Ratio" value={closed.length >= 5 ? fmt(m.sharpe) : 'N/A'} sub="annualized" color={m.sharpe >= 1 ? 'text-emerald-400' : 'text-white/70'} />
          <MetricCard label="Sortino Ratio" value={closed.length >= 5 ? fmt(m.sortino) : 'N/A'} sub="downside only" />
          <MetricCard label="Calmar Ratio" value={fmt(m.calmar)} sub="return / drawdown" />
          <MetricCard label="Avg R-Multiple" value={m.avgR !== null ? fmt(m.avgR) : 'N/A'} sub="need stop loss data" />
          <MetricCard label="Kelly Criterion" value={fmtPct(m.kelly)} sub="optimal bet %" />
          <MetricCard label="Recovery Factor" value={fmt(m.recoveryFactor)} sub="net profit / max DD" />
        </div>
      </Section>

      <Section title="Timing" icon={Clock}>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          <MetricCard label="Avg Holding Time" value={formatDur(m.avgDuration)} />
          <MetricCard label="Shortest Trade" value={formatDur(m.minDuration)} />
          <MetricCard label="Longest Trade" value={formatDur(m.maxDuration)} />
          <MetricCard label="Best Day of Week" value={m.bestDay ? `${m.bestDay.day} (${fmtPct(m.bestDay.wr)})` : 'N/A'} sub={m.bestDay ? `${m.bestDay.n} trades` : 'min 3 trades per day'} />
          <MetricCard label="Best Hour" value={m.bestHour ? `${m.bestHour.hour}:00 (${fmtPct(m.bestHour.wr)})` : 'N/A'} sub={m.bestHour ? `${m.bestHour.n} trades` : 'min 3 trades per hour'} />
          <MetricCard label="Trades / Week" value={fmt(m.tradesPerWeek, 1)} />
        </div>
      </Section>

      <Section title="Streaks" icon={Flame}>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          <MetricCard label="Current Win Streak" value={String(m.curWinStreak)} color={m.curWinStreak >= 3 ? 'text-emerald-400' : 'text-white/70'} />
          <MetricCard label="Current Loss Streak" value={String(m.curLossStreak)} color={m.curLossStreak >= 3 ? 'text-red-400' : 'text-white/70'} />
          <MetricCard label="Max Win Streak" value={String(m.maxWinStreak)} color="text-emerald-400" />
          <MetricCard label="Max Loss Streak" value={String(m.maxLossStreak)} color="text-red-400" />
          <MetricCard label="Avg Win Streak" value={fmt(m.avgWinStreak, 1)} />
          <MetricCard label="Avg Loss Streak" value={fmt(m.avgLossStreak, 1)} />
        </div>
      </Section>

      <Section title="Breakdown Analysis" icon={BarChart3}>
        <div className="space-y-4">
          {/* Strategy */}
          <div>
            <p className="text-xs text-white/50 mb-2 font-medium">Win Rate by Strategy</p>
            <MiniTable
              headers={['Strategy', 'Win Rate', 'Trades', 'P&L']}
              rows={Object.entries(m.byStrategy)
                .sort((a, b) => b[1].total - a[1].total)
                .map(([s, v]) => [s, fmtPct((v.wins / v.total) * 100), v.total, fmtDollar(v.pnl)])}
            />
          </div>
          {/* Emotion */}
          <div>
            <p className="text-xs text-white/50 mb-2 font-medium">Win Rate by Emotion</p>
            <MiniTable
              headers={['Emotion', 'Win Rate', 'Trades']}
              rows={Object.entries(m.byEmotion)
                .sort((a, b) => b[1].total - a[1].total)
                .map(([e, v]) => [e, fmtPct((v.wins / v.total) * 100), v.total])}
            />
          </div>
          {/* Direction */}
          <div>
            <p className="text-xs text-white/50 mb-2 font-medium">Win Rate by Direction</p>
            <MiniTable
              headers={['Direction', 'Win Rate', 'Trades']}
              rows={Object.entries(m.byDir).map(([d, v]) => [d.charAt(0).toUpperCase() + d.slice(1), fmtPct((v.wins / v.total) * 100), v.total])}
            />
          </div>
          {/* Tags */}
          {Object.keys(m.byTag).length > 0 && (
            <div>
              <p className="text-xs text-white/50 mb-2 font-medium">Win Rate by Tag</p>
              <MiniTable
                headers={['Tag', 'Win Rate', 'Trades']}
                rows={Object.entries(m.byTag).sort((a, b) => b[1].total - a[1].total).map(([t, v]) => [t, fmtPct((v.wins / v.total) * 100), v.total])}
              />
            </div>
          )}
          {/* Day of Week */}
          <div>
            <p className="text-xs text-white/50 mb-2 font-medium">Win Rate by Day of Week</p>
            <MiniTable
              headers={['Day', 'Win Rate', 'Trades']}
              rows={Object.entries(m.byDay).sort((a, b) => parseInt(a[0]) - parseInt(b[0])).map(([d, v]) => [DAYS[parseInt(d)], fmtPct((v.wins / v.total) * 100), v.total])}
            />
          </div>
          {/* Market Type */}
          {Object.keys(m.byMarket).length > 1 && (
            <div>
              <p className="text-xs text-white/50 mb-2 font-medium">Win Rate by Market Type</p>
              <MiniTable
                headers={['Market', 'Win Rate', 'Trades']}
                rows={Object.entries(m.byMarket).map(([mt, v]) => [mt, fmtPct((v.wins / v.total) * 100), v.total])}
              />
            </div>
          )}
          {/* Monthly PnL */}
          <div>
            <p className="text-xs text-white/50 mb-2 font-medium">P&L by Month</p>
            <MiniTable
              headers={['Month', 'P&L']}
              rows={Object.entries(m.byMonth).sort().map(([mo, pnl]) => [mo, fmtDollar(pnl)])}
            />
          </div>
          {/* Confidence Calibration */}
          <div>
            <p className="text-xs text-white/50 mb-2 font-medium">Confidence Calibration</p>
            <MiniTable
              headers={['Confidence', 'Actual Win Rate', 'Trades']}
              rows={Object.entries(m.confBuckets).sort().map(([b, v]) => [b, fmtPct((v.wins / v.total) * 100), v.total])}
            />
          </div>
        </div>
      </Section>

      <Section title="Discipline" icon={Brain}>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          <MetricCard label="Discipline Score" value={m.disciplineScore !== null ? fmtPct(m.disciplineScore) : 'N/A'} color={m.disciplineScore !== null && m.disciplineScore >= 80 ? 'text-emerald-400' : 'text-yellow-400'} />
          <MetricCard label="Rule Compliance" value={m.ruleComplianceRate !== null ? fmtPct(m.ruleComplianceRate) : 'N/A'} />
          <MetricCard label="All Rules Followed" value={m.allFollowedPct !== null ? fmtPct(m.allFollowedPct) : 'N/A'} color="text-emerald-400" />
          <MetricCard label="Any Rule Broken" value={m.anyBrokenPct !== null ? fmtPct(m.anyBrokenPct) : 'N/A'} color="text-red-400" />
          <MetricCard label="Disciplined WR" value={m.discWR !== null ? fmtPct(m.discWR) : 'N/A'} sub="vs undisciplined" color="text-emerald-400" />
          <MetricCard label="Undisciplined WR" value={m.undiscWR !== null ? fmtPct(m.undiscWR) : 'N/A'} color="text-red-400" />
          <MetricCard label="FOMO Trade %" value={fmtPct(m.fomoPct)} color={m.fomoPct > 15 ? 'text-red-400' : 'text-white/70'} />
        </div>
      </Section>

      <Section title="Position Sizing" icon={DollarSign}>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <MetricCard label="Avg Position Size" value={fmtDollar(m.avgCap)} />
          <MetricCard label="Position Std Dev" value={fmtDollar(m.capStdDev)} />
          <MetricCard label="Largest Position" value={fmtDollar(m.largestPos)} />
          <MetricCard label="Consistency" value={m.capConsistency} color={m.capConsistency === 'Consistent' ? 'text-emerald-400' : m.capConsistency === 'Variable' ? 'text-yellow-400' : 'text-red-400'} />
        </div>
      </Section>
    </div>
  );
}
