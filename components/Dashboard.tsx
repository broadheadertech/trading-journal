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

    // Activity heatmap: weekday Ã— session
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
      grossProfit, grossLoss,
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
  // formatCurrency already prepends '+' for positive and '-' for negative — calling
  // it on the raw value avoids the double-sign bug (`-+$X.XX`) that came from
  // wrapping Math.abs(v) and then manually prefixing the '-' again.
  const fmtPnl = (v: number) => formatCurrency(v);
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
  const GREEN = '#24c88a';
  const RED = '#ff4d5e';
  const c = (v: number) => (v > 0 ? GREEN : v < 0 ? RED : 'var(--muted)');

  return (
    <div className="pwrap">
      <div className="phead">
        <p className="eyebrow">Performance overview</p>
        <h2>Dashboard</h2>
        <p className="sub">Net outcome, execution quality and where your edge leaks — for the selected period.</p>
      </div>

      <div className="grid2">
        {/* net P&L hero */}
        <div className="card hero" style={{ height: 'auto' }}>
          <span className="accent" style={{ width: 80, background: isPositive ? 'var(--green)' : 'var(--red)' }} />
          <div className="row1">
            <p className="lbl b10">NET P&L</p>
            <span
              className="pill"
              style={isPositive ? undefined : { background: '#20100f', color: 'var(--red)' }}
            >
              {metrics.pnlPercent >= 0 ? '+' : ''}{metrics.pnlPercent.toFixed(1)}%
            </span>
            {metrics.leaks.length > 0 && (
              <button
                className="viewall"
                onClick={() => {
                  document.getElementById('next-best-actions')?.scrollIntoView({ behavior: 'smooth' });
                }}
              >
                Fix biggest leak
                <svg width="9" height="10" viewBox="0 0 9 10" fill="none">
                  <path d="M4 0 L9 5 L4 10 M9 5 H0" stroke="#d99405" strokeWidth="1.5" />
                </svg>
              </button>
            )}
          </div>
          <p className="bignum" style={{ color: isPositive ? 'var(--text)' : 'var(--red)' }}>
            {fmtPnl(metrics.totalPnL)}
          </p>
          <div className="wl">
            <span style={{ color: 'var(--green)' }}>
              <svg width="17" height="10" viewBox="0 0 17 10" fill="none"><path d="M0 10 L6 4 L10 8 L17 0" stroke="#24c88a" strokeWidth="1.6" /></svg>
              {metrics.wins} wins
            </span>
            <span className="l" style={{ color: 'var(--red)' }}>
              <svg width="17" height="10" viewBox="0 0 17 10" fill="none"><path d="M0 0 L6 6 L10 2 L17 10" stroke="#ff4d5e" strokeWidth="1.6" /></svg>
              {metrics.losses} losses
            </span>
          </div>
          <div className="tri">
            <div className="inset">
              <p className="lbl">BEST DAY</p>
              {metrics.bestDay ? (
                <em className="g" style={{ color: c(metrics.bestDay[1]) }}>
                  {fmtPnl(metrics.bestDay[1])}
                  <span style={{ marginLeft: 8, fontFamily: 'var(--body)', fontSize: 10, color: 'var(--muted-2)' }}>
                    {format(new Date(metrics.bestDay[0]), 'dd/MM/yyyy')}
                  </span>
                </em>
              ) : <em>–</em>}
            </div>
            <div className="inset">
              <p className="lbl">WORST DAY</p>
              {metrics.worstDay ? (
                <em className="g" style={{ color: c(metrics.worstDay[1]) }}>
                  {fmtPnl(metrics.worstDay[1])}
                  <span style={{ marginLeft: 8, fontFamily: 'var(--body)', fontSize: 10, color: 'var(--muted-2)' }}>
                    {format(new Date(metrics.worstDay[0]), 'dd/MM/yyyy')}
                  </span>
                </em>
              ) : <em>Need 2+ days</em>}
            </div>
            <div className="inset">
              <p className="lbl">AVG TRADE</p>
              <em className="g" style={{ color: c(metrics.avgTrade) }}>{fmtPnl(metrics.avgTrade)}</em>
            </div>
          </div>
        </div>

        {/* execution score */}
        <div className="card score" style={{ alignSelf: 'stretch' }}>
          <div className="ring">
            <svg viewBox="0 0 120 120" width="80" height="80" fill="none">
              <circle cx="60" cy="60" r="54" stroke="#16202c" strokeWidth="7.5" />
              <circle
                cx="60" cy="60" r="54"
                stroke={scoreColor} strokeWidth="7.5" strokeLinecap="round"
                strokeDasharray={circumference} strokeDashoffset={strokeDashoffset}
                transform="rotate(-90 60 60)"
              />
            </svg>
            <span className="v">{metrics.execScore}</span>
          </div>
          <p className="ttl" style={{ color: scoreColor }}>Execution Score</p>
          <p>Win Rate + Profit Factor<br />+ Net Outcome</p>
        </div>
      </div>

      {/* stat strip */}
      <div className="stats">
        <div className="stat">
          <span className="accent" style={{ background: 'var(--green)' }} />
          <b>NET P&L</b>
          <em style={{ color: c(metrics.totalPnL) }}>{fmtPnl(metrics.totalPnL)}</em>
        </div>
        <div className="stat">
          <span className="accent" style={{ background: 'var(--teal)' }} />
          <b>TOTAL TRADES</b>
          <em>{metrics.closed.length}</em>
        </div>
        <div className="stat">
          <span className="accent" style={{ background: 'var(--amber)' }} />
          <b>WIN RATE</b>
          <em style={{ color: metrics.winRate >= 50 ? GREEN : RED }}>{metrics.winRate.toFixed(1)}%</em>
        </div>
        <div className="stat">
          <span className="accent" style={{ background: 'var(--pink)' }} />
          <b>PROFIT FACTOR</b>
          <em style={{ color: metrics.profitFactor >= 1 ? GREEN : RED }}>
            {metrics.profitFactor === Infinity ? '∞' : metrics.profitFactor.toFixed(2)}
          </em>
        </div>
      </div>

      <div className="grid2" style={{ marginTop: 32 }}>
        {/* equity curve */}
        <div className="card">
          <div className="cardhead">
            <div>
              <h3>Equity Curve</h3>
              <p className="sub">Account balance growth over time</p>
            </div>
            <div className="seg">
              {(['equity', 'drawdown'] as const).map(mode => (
                <button
                  key={mode}
                  className={equityMode === mode ? 'on' : undefined}
                  onClick={() => setEquityMode(mode)}
                  style={{ textTransform: 'capitalize' }}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>
          <div className="plot">
            {equityData.length > 1 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={equityData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                  <defs>
                    <linearGradient id="equityGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={equityMode === 'drawdown' ? '#ff4d5e' : '#2fd3c4'} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={equityMode === 'drawdown' ? '#ff4d5e' : '#2fd3c4'} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#0e1725" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#5c6b7e' }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#5c6b7e' }} tickLine={false} axisLine={false} tickFormatter={v => `$${v}`} />
                  <Tooltip
                    contentStyle={{ background: '#0c1119', border: '1px solid #182432', borderRadius: '2px', fontSize: '12px', color: '#edf2f7' }}
                    formatter={(val: unknown) => [formatCurrency(val as number), equityMode === 'drawdown' ? 'Drawdown' : 'Equity']}
                  />
                  <Area
                    type="monotone" dataKey="pnl"
                    stroke={equityMode === 'drawdown' ? '#ff4d5e' : '#2fd3c4'}
                    strokeWidth={2} fill="url(#equityGrad)" dot={false} isAnimationActive={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <span className="empty">Need at least 2 closed trades to show chart</span>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* top vs worst symbols */}
          <div className="card" style={{ padding: '19px 22px 8px' }}>
            <h4>Top vs Worst Symbols</h4>
            <p className="sub sm">Compare your strongest and weakest pairs</p>
            <p style={{ margin: '22px 0 0', fontWeight: 600, fontSize: 10, color: 'var(--green)', letterSpacing: '.04em' }}>TOP PERFORMERS</p>
            {metrics.topPerformers.length > 0 ? (
              <div style={{ marginTop: 6 }}>
                {metrics.topPerformers.map((s, i) => (
                  <div className="mrow" key={s.coin}>
                    <span className="ic">#{i + 1}</span>
                    <span className="lb">{s.coin}</span>
                    <span style={{ marginLeft: 10, fontSize: 11, color: 'var(--muted-2)' }}>{s.total} trades</span>
                    <span className="val" style={{ color: c(s.pnl) }}>{fmtPnl(s.pnl)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ margin: '6px 0 0', fontSize: 12, color: 'var(--muted)' }}>No profitable symbols yet</p>
            )}
            <p style={{ margin: '16px 0 0', fontWeight: 600, fontSize: 10, color: 'var(--red)', letterSpacing: '.04em' }}>BIGGEST LEAKS</p>
            {metrics.biggestLeaks.length > 0 ? (
              <div style={{ marginTop: 6 }}>
                {metrics.biggestLeaks.map((s, i) => (
                  <div className="mrow" key={s.coin}>
                    <span className="ic">#{i + 1}</span>
                    <span className="lb">{s.coin}</span>
                    <span style={{ marginLeft: 10, fontSize: 11, color: 'var(--muted-2)' }}>{s.total} trades</span>
                    <span className="val" style={{ color: c(s.pnl) }}>{fmtPnl(s.pnl)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ margin: '6px 0 0', fontSize: 12, color: 'var(--muted)' }}>No losing symbols</p>
            )}
          </div>

          {/* execution rhythm */}
          <div className="card" style={{ padding: '19px 22px 8px' }}>
            <h4>Execution Rhythm</h4>
            <p className="sub sm" style={{ lineHeight: '18px' }}>How consistent and active your trading cadence is</p>
            <div style={{ marginTop: 24 }}>
              <div className="mrow">
                <IcCalendar />
                <span className="lb">Avg trades / day</span>
                <span className="val">{metrics.avgTradesPerDay.toFixed(1)}</span>
              </div>
              <div className="mrow">
                <IcBox />
                <span className="lb">Longest idle gap</span>
                {metrics.longestIdle > 0
                  ? <span className="val">{metrics.longestIdle}d</span>
                  : <span className="val dash">–</span>}
              </div>
              <div className="mrow">
                <IcPulse />
                <span className="lb">Best active streak</span>
                {metrics.bestActiveStreak > 0
                  ? <span className="val">{metrics.bestActiveStreak} days</span>
                  : <span className="val dash">–</span>}
              </div>
              <div className="mrow">
                <IcTrend />
                <span className="lb">Best day</span>
                {metrics.bestDay ? (
                  <span className="val" style={{ color: c(metrics.bestDay[1]) }}>
                    <span style={{ marginRight: 8, fontFamily: 'var(--body)', fontSize: 10, color: 'var(--muted-2)' }}>{metrics.bestDayLabel}</span>
                    {fmtPnl(metrics.bestDay[1])}
                  </span>
                ) : <span className="val dash">–</span>}
              </div>
              {metrics.bounceBackRate !== null && (
                <div className="mrow">
                  <span className="ic" />
                  <span className="lb">Bounce-back rate</span>
                  <span className="val">{metrics.bounceBackRate}%</span>
                </div>
              )}
              {metrics.edgeConcentration !== null && (
                <div className="mrow">
                  <span className="ic" />
                  <span className="lb">Edge concentration</span>
                  <span className="val">{metrics.edgeConcentration}%</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid2" style={{ marginTop: 32 }}>
        {/* activity map */}
        <div className="card">
          <h3>Activity Map</h3>
          <p className="sub">Net P&L by weekday and session (local time)</p>
          <div className="amap">
            <div className="amaphead">
              <b>Sessions</b>
              {metrics.sessions.map(s => <span key={s.label}>{s.label.split(' ')[0]}</span>)}
            </div>
            <div>
              {metrics.weekdays.map((day, dayIdx) => (
                <div className="amaprow" key={day}>
                  <b>{day}</b>
                  {metrics.sessions.map((_, sessIdx) => {
                    const cell = metrics.heatmap.find(h => h.day === dayIdx && h.session === sessIdx);
                    const pnl = cell?.pnl ?? 0;
                    const count = cell?.count ?? 0;
                    const intensity = count > 0 ? Math.min(Math.abs(pnl) / metrics.heatmapMax, 1) : 0;
                    const alpha = count === 0 ? 0.05 : 0.18 + intensity * 0.62;
                    const bg = count === 0
                      ? undefined
                      : pnl >= 0
                        ? `rgba(36,200,138,${alpha})`
                        : `rgba(255,77,94,${alpha})`;
                    return (
                      <span
                        key={sessIdx}
                        className="cell"
                        style={bg ? { background: bg, color: 'var(--text)' } : undefined}
                        title={count > 0 ? `${fmtPnl(pnl)} across ${count} trade${count === 1 ? '' : 's'}` : 'No trades'}
                      >
                        {count > 0 ? (
                          <>
                            <span style={{ fontFamily: 'var(--mono)', color: c(pnl) }}>{fmtPnl(pnl)}</span>
                            <small style={{ marginLeft: 6, fontSize: 10, color: 'var(--muted-2)' }}>{count}</small>
                          </>
                        ) : '–'}
                      </span>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
          <p className="amapnote">Each cell shows total $ P&L and trade count for that weekday × session bucket.</p>

          {/* gross losses ◀ ▶ gross wins — total $ on each side of the ledger. */}
          {(metrics.grossProfit > 0 || metrics.grossLoss > 0) && (
            <div style={{ marginTop: 14 }}>
              <div style={{ display: 'flex', height: 6, background: 'var(--rail)', borderRadius: 2, overflow: 'hidden' }}>
                {(() => {
                  const total = metrics.grossProfit + metrics.grossLoss;
                  const lossPct = total > 0 ? (metrics.grossLoss / total) * 100 : 0;
                  const winPct = total > 0 ? (metrics.grossProfit / total) * 100 : 0;
                  return (
                    <>
                      {metrics.grossLoss > 0 && <div style={{ height: '100%', width: `${lossPct}%`, background: 'var(--red)' }} />}
                      {metrics.grossProfit > 0 && <div style={{ height: '100%', width: `${winPct}%`, background: 'var(--green)' }} />}
                    </>
                  );
                })()}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontFamily: 'var(--mono)', fontSize: 11 }}>
                <span style={{ color: 'var(--red)' }}>{fmtPnl(-metrics.grossLoss)}</span>
                <span style={{ color: 'var(--green)' }}>{fmtPnl(metrics.grossProfit)}</span>
              </div>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* focus & discipline */}
          <div className="card" style={{ padding: '19px 22px 8px' }}>
            <h4>Focus &amp; Discipline</h4>
            <p className="sub sm">See where attention and execution drift</p>
            <div style={{ marginTop: 16 }}>
              {metrics.topCoin && (
                <div className="mrow">
                  <IcPulse />
                  <span className="lb">Focus on {metrics.topCoin.coin}</span>
                  <span className="val">{metrics.focusPercent}%</span>
                </div>
              )}
              <div className="mrow">
                <IcCalendar />
                <span className="lb">Consistency (profitable days)</span>
                <span className="val">{metrics.consistencyPercent}%</span>
              </div>
              <div className="mrow">
                <IcTrend />
                <span className="lb">Long bias</span>
                <span className="val">{metrics.longBias}%</span>
              </div>
              <div className="mrow">
                <IcBox />
                <span className="lb">Avg hold time</span>
                <span className="val">{metrics.avgHoldMinutes}m</span>
              </div>
            </div>
          </div>

          {/* risk exposure */}
          <div className="card" style={{ padding: '19px 22px 8px' }}>
            <h4>Risk Exposure</h4>
            <p className="sub sm">How much damage each mistake can do</p>
            <div style={{ marginTop: 22 }}>
              <div className="mrow">
                <IcTrend />
                <span className="lb">Avg win</span>
                <span className="val" style={{ color: GREEN }}>{fmtPnl(metrics.avgWin)}</span>
              </div>
              <div className="mrow">
                <span className="ic" />
                <span className="lb">Avg loss</span>
                <span className="val" style={{ color: GREEN }}>{fmtPnl(-metrics.avgLoss)}</span>
              </div>
              <div className="mrow">
                <span className="ic" />
                <span className="lb">Biggest loss</span>
                <span className="val" style={{ color: GREEN }}>{fmtPnl(metrics.biggestLoss)}</span>
              </div>
              <div className="mrow">
                <span className="ic" />
                <span className="lb" style={{ marginLeft: 0 }}>Risk ratio (avg win / avg loss)</span>
                {metrics.riskRatio > 0
                  ? <span className="val">{metrics.riskRatio.toFixed(2)}</span>
                  : <span className="val dash">–</span>}
              </div>
              <div className="mrow">
                <span className="ic" />
                <span className="lb" style={{ marginLeft: 0 }}>P&L volatility (std dev)</span>
                {metrics.pnlStdDev > 0
                  ? <span className="val">{formatCurrency(metrics.pnlStdDev)}</span>
                  : <span className="val dash">–</span>}
              </div>
              <div className="mrow">
                <span className="ic" />
                <span className="lb" style={{ marginLeft: 0 }}>Breakeven win rate</span>
                {metrics.breakEvenWR > 0
                  ? <span className="val">{metrics.breakEvenWR.toFixed(1)}%</span>
                  : <span className="val dash">–</span>}
              </div>
              <div className="mrow">
                <span className="ic" />
                <span className="lb" style={{ marginLeft: 0 }}>Edge buffer</span>
                {metrics.edgeBuffer !== 0
                  ? <span className="val" style={{ color: metrics.edgeBuffer > 0 ? GREEN : RED }}>
                      {metrics.edgeBuffer > 0 ? '+' : ''}{metrics.edgeBuffer.toFixed(1)}%
                    </span>
                  : <span className="val dash">–</span>}
              </div>
              <div className="mrow">
                <span className="ic" />
                <span className="lb" style={{ marginLeft: 0 }}>Avg wins to recover biggest loss</span>
                {metrics.winsToRecoverBiggest > 0
                  ? <span className="val">{metrics.winsToRecoverBiggest}</span>
                  : <span className="val dash">–</span>}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* recent trades */}
      <div className="card" style={{ maxWidth: 800, marginTop: 32 }}>
        <div className="cardhead">
          <div>
            <h3>Recent Trades</h3>
            <p className="sub">Last activity in the selected period</p>
          </div>
          <button className="viewall" onClick={() => onNavigate('journal')}>
            View all
            <svg width="9" height="10" viewBox="0 0 9 10" fill="none"><path d="M4 0 L9 5 L4 10 M9 5 H0" stroke="#d99405" strokeWidth="1.5" /></svg>
          </button>
        </div>
        {recentTrades.length > 0 ? (
          <div style={{ marginTop: 18 }}>
            {recentTrades.map(t => {
              const dir = (t.direction ?? 'long')[0].toUpperCase();
              const dirColor = (t.direction ?? 'long') === 'long' ? GREEN : RED;
              const elapsed = t.exitDate
                ? Math.round((Date.now() - new Date(t.exitDate).getTime()) / 3600000)
                : null;
              const timeLabel = elapsed !== null
                ? elapsed < 24 ? `${elapsed}h` : `${Math.round(elapsed / 24)}d`
                : '';
              return (
                <div className="mrow" key={t.id}>
                  <span className="ic" style={{ color: dirColor, fontWeight: 700 }}>{dir}</span>
                  <span className="lb" style={{ color: 'var(--text)', fontWeight: 700 }}>{t.coin}</span>
                  <span style={{ marginLeft: 12, fontSize: 11, color: 'var(--muted-2)' }}>{timeLabel} ago</span>
                  <span style={{
                    marginLeft: 'auto', minWidth: 0, fontSize: 11, color: 'var(--muted-2)', fontFamily: 'var(--mono)',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    ENTRY {formatCurrency(t.entryPrice)}
                    {t.exitPrice ? ` · EXIT ${formatCurrency(t.exitPrice)}` : ''}
                    {t.exitDate ? ` · ${format(new Date(t.exitDate), 'dd/MM/yyyy, HH:mm')}` : ''}
                  </span>
                  <span className="val" style={{ flex: 'none', marginLeft: 20, color: c(t.actualPnL ?? 0) }}>{fmtPnl(t.actualPnL ?? 0)}</span>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="empty-line" style={{ padding: '36px 0 0' }}>No closed trades in this period</p>
        )}
      </div>

      {/* next best actions */}
      <div id="next-best-actions" className="card" style={{ maxWidth: 800, marginTop: 32, padding: '23px 28px' }}>
        <span className="accent" style={{ width: 56, background: 'var(--amber)' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <h3>Next Best Actions</h3>
          <span style={{ width: 8, height: 8, borderRadius: 2, background: 'var(--amber)' }} />
        </div>
        <p className="sub">Execute these top fixes first for the active period.</p>
        <p className="sub sm" style={{ marginTop: 6, color: 'var(--muted-2)' }}>Run active rule set for 5-7 sessions before switching.</p>
        <div className="nba">
          <div className="inset">
            <span className="accent" style={{ background: 'var(--amber)' }} />
            <p className="lbl">TOTAL LEAK BURDEN</p>
            <em style={{ color: 'var(--amber)' }}>{formatCurrency(metrics.totalLeakBurden)}</em>
            <small>gross drag detected</small>
          </div>
          <div className="inset">
            <span className="accent" style={{ background: 'var(--green)' }} />
            <p className="lbl">REALISTIC RECOVERABLE</p>
            <em style={{ color: 'var(--green)' }}>{formatCurrency(metrics.realisticRecoverable)}</em>
            <small>realistic in period</small>
          </div>
          <div className="inset">
            <span className="accent" style={{ background: 'var(--teal)' }} />
            <p className="lbl">CONSERVATIVE (TOP-3)</p>
            <em style={{ color: 'var(--teal)' }}>{formatCurrency(metrics.conservativeRecoverable)}</em>
            <small>focus-first amount</small>
          </div>
        </div>

        {metrics.leaks.length > 0 ? (
          <div style={{ marginTop: 26 }}>
            {metrics.leaks.map((leak, i) => {
              const sev = leak.severity === 'high' ? 'var(--red)' : leak.severity === 'medium' ? 'var(--amber)' : 'var(--teal)';
              return (
                <div key={i} className="mrow" style={{ alignItems: 'flex-start', padding: '14px 0' }}>
                  <span className="ic" style={{ color: sev, fontWeight: 700, fontFamily: 'var(--display)' }}>{i + 1}</span>
                  <span className="lb" style={{ flex: 1 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <b style={{ color: 'var(--text)', fontWeight: 700, fontSize: 13 }}>{leak.title}</b>
                      <span style={{
                        height: 18, padding: '0 8px', border: '1px solid currentColor', borderRadius: 2,
                        display: 'inline-flex', alignItems: 'center', fontWeight: 700, fontSize: 9, color: sev,
                      }}>{leak.severity}</span>
                    </span>
                    <span style={{ display: 'block', marginTop: 6, fontSize: 12, color: 'var(--muted-2)' }}>{leak.description}</span>
                  </span>
                  <span className="val" style={{ color: 'var(--green)' }}>
                    {formatCurrency(leak.amount)}
                    <small style={{ display: 'block', fontFamily: 'var(--body)', fontWeight: 400, fontSize: 10, color: 'var(--muted-2)', textAlign: 'right' }}>in range</small>
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="empty-line" style={{ padding: '18px 0 0' }}>No significant leaks detected. Keep it up!</p>
        )}

        <div className="note">Track this weekly: realized drag should move toward the conservative recoverable level.</div>
        <button className="ghostbtn" onClick={() => onNavigate('journal:verdicts')}>
          Open Verdicts
          <svg width="5" height="10" viewBox="0 0 5 10" fill="none"><path d="M0 0 L5 5 L0 10" stroke="#edf2f7" strokeWidth="1.5" /></svg>
        </button>
      </div>
    </div>
  );
}

// ─── Presentational icons (markup only — mirror the ATLAS reference SVGs) ──────
function IcCalendar() {
  return (
    <svg className="ic" viewBox="0 0 16 12" fill="none">
      <rect x=".65" y=".65" width="14.7" height="10.7" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
      <path d="M0 4h16M5 -2v4M11 -2v4" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  );
}

function IcBox() {
  return (
    <svg className="ic" viewBox="0 0 16 12" fill="none">
      <rect x=".65" y=".65" width="14.7" height="10.7" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
      <path d="M0 4h16" stroke="currentColor" strokeWidth="1.3" />
      <rect x="4" y="6.5" width="3" height="3" fill="currentColor" />
    </svg>
  );
}

function IcPulse() {
  return (
    <svg className="ic" viewBox="0 0 16 11" fill="none">
      <path d="M0 6 L3 6 L5 0 L8 11 L11 4 L13 6 L16 6" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  );
}

function IcTrend() {
  return (
    <svg className="ic" viewBox="0 0 16 11" fill="none">
      <path d="M0 11 L5 5 L9 8 L15 0M11 0h4v4" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  );
}
