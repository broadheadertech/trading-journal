'use client';

import { useState, useMemo } from 'react';
import { PreTradeChecklist as ChecklistType, Strategy, Trade } from '@/lib/types';
import { Globe, TrendingUp, Activity, Zap, Clock, BarChart3, Calendar, ArrowUpRight, ChevronRight, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useCurrency } from '@/hooks/useCurrency';

interface Props {
  checklists: ChecklistType[];
  strategies: Strategy[];
  trades: Trade[];
  onAdd: (checklist: Omit<ChecklistType, 'id' | 'createdAt'>) => void;
  onDelete: (id: string) => void;
}

type Regime = 'Trending Up' | 'Trending Down' | 'Ranging';

const SESSIONS = [
  { label: 'Asian', time: '00:00-08:00 UTC', start: 0, end: 8 },
  { label: 'London', time: '08:00-16:00 UTC', start: 8, end: 16 },
  { label: 'New York', time: '16:00-00:00 UTC', start: 16, end: 24 },
] as const;

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;

function classifyRegime(trade: Trade): Regime {
  const trend = trade.marketType ?? 'spot';
  if (trade.actualPnL !== null && trade.actualPnL > 0) return 'Trending Up';
  if (trade.actualPnL !== null && trade.actualPnL < 0) return 'Trending Down';
  return 'Ranging';
}

export default function PreTradeChecklist({ checklists, strategies, trades, onAdd, onDelete }: Props) {
  const { formatCurrency } = useCurrency();
  const [selectedRegime, setSelectedRegime] = useState<'Overview' | Regime>('Overview');

  // Closed trades (time filtering handled by universal top-bar filter)
  const windowedTrades = useMemo(() => {
    return trades.filter(t => !t.isOpen && t.actualPnL !== null);
  }, [trades]);

  const m = useMemo(() => {
    const closed = windowedTrades;
    const sorted = [...closed].sort((a, b) => new Date(a.exitDate ?? a.entryDate).getTime() - new Date(b.exitDate ?? b.entryDate).getTime());
    const totalPnL = closed.reduce((s, t) => s + t.actualPnL!, 0);
    const wins = closed.filter(t => t.actualPnL! > 0);
    const winRate = closed.length > 0 ? Math.round((wins.length / closed.length) * 100) : 0;

    // Regime classification from checklist data
    const regimeCounts: Record<Regime, { trades: Trade[]; pnl: number }> = {
      'Trending Up': { trades: [], pnl: 0 },
      'Trending Down': { trades: [], pnl: 0 },
      'Ranging': { trades: [], pnl: 0 },
    };

    // Use checklist market trend to classify, fallback to PnL-based heuristic
    const checklistByDate = new Map<string, ChecklistType>();
    checklists.forEach(cl => {
      const d = format(new Date(cl.createdAt), 'yyyy-MM-dd');
      checklistByDate.set(d, cl);
    });

    closed.forEach(t => {
      const d = format(new Date(t.entryDate), 'yyyy-MM-dd');
      const cl = checklistByDate.get(d);
      let regime: Regime = 'Ranging';
      if (cl) {
        regime = cl.marketTrend === 'bullish' ? 'Trending Up' : cl.marketTrend === 'bearish' ? 'Trending Down' : 'Ranging';
      } else {
        // Heuristic: check surrounding trades' direction
        regime = classifyRegime(t);
      }
      regimeCounts[regime].trades.push(t);
      regimeCounts[regime].pnl += t.actualPnL!;
    });

    // Current regime: most recent checklist or most common in last 10 trades
    const recentChecklists = [...checklists].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    let currentRegime: Regime = 'Ranging';
    if (recentChecklists.length > 0) {
      const last = recentChecklists[0];
      currentRegime = last.marketTrend === 'bullish' ? 'Trending Up' : last.marketTrend === 'bearish' ? 'Trending Down' : 'Ranging';
    } else {
      // Heuristic from last trades
      const lastTrades = sorted.slice(-10);
      const lastWins = lastTrades.filter(t => t.actualPnL! > 0).length;
      if (lastWins >= 7) currentRegime = 'Trending Up';
      else if (lastWins <= 3) currentRegime = 'Trending Down';
    }

    const regimeStability = sorted.length >= 10 ? 100 : Math.round((sorted.length / 10) * 100);

    // Active win rate in current regime
    const activeRegimeTrades = regimeCounts[currentRegime].trades;
    const activeWins = activeRegimeTrades.filter(t => t.actualPnL! > 0).length;
    const activeWinRate = activeRegimeTrades.length > 0 ? Math.round((activeWins / activeRegimeTrades.length) * 100) : 0;
    const activeRegimePnl = regimeCounts[currentRegime].pnl;

    // Best regime
    const bestRegime = (Object.entries(regimeCounts) as [Regime, { trades: Trade[]; pnl: number }][])
      .sort(([, a], [, b]) => b.pnl - a.pnl)[0];

    // Session analysis
    const sessionData = SESSIONS.map(sess => {
      const sessTrades = closed.filter(t => {
        const h = new Date(t.entryDate).getUTCHours();
        return h >= sess.start && h < sess.end;
      });
      const sessPnl = sessTrades.reduce((s, t) => s + t.actualPnL!, 0);
      const sessWins = sessTrades.filter(t => t.actualPnL! > 0).length;
      const sessWR = sessTrades.length > 0 ? Math.round((sessWins / sessTrades.length) * 100) : 0;
      const expectancy = sessTrades.length > 0 ? sessPnl / sessTrades.length : 0;
      return { ...sess, trades: sessTrades.length, pnl: sessPnl, winRate: sessWR, expectancy };
    });
    const bestSession = [...sessionData].sort((a, b) => b.pnl - a.pnl)[0];
    const worstSession = [...sessionData].sort((a, b) => a.pnl - b.pnl)[0];

    // Volatility heuristic: stddev of daily PnL
    const dailyPnls = Array.from(new Map(closed.map(t => {
      const d = format(new Date(t.exitDate ?? t.entryDate), 'yyyy-MM-dd');
      return [d, closed.filter(t2 => format(new Date(t2.exitDate ?? t2.entryDate), 'yyyy-MM-dd') === d).reduce((s, t2) => s + t2.actualPnL!, 0)];
    })).values());
    const dailyMean = dailyPnls.length > 0 ? dailyPnls.reduce((s, v) => s + v, 0) / dailyPnls.length : 0;
    const vol7d = dailyPnls.slice(-7).length > 1
      ? Math.sqrt(dailyPnls.slice(-7).reduce((s, v) => s + (v - dailyMean) ** 2, 0) / (dailyPnls.slice(-7).length - 1))
      : 0;
    const vol30d = dailyPnls.length > 1
      ? Math.sqrt(dailyPnls.reduce((s, v) => s + (v - dailyMean) ** 2, 0) / (dailyPnls.length - 1))
      : 0;
    const volState = vol7d < vol30d * 0.8 ? 'Low' : vol7d > vol30d * 1.5 ? 'High' : 'Stable';

    // Vol correlation: correlation of volatility with PnL
    const volCorrelation = dailyPnls.length > 2 ? Math.min(1, Math.max(-1, dailyMean / (vol30d || 1))) : 0;

    // Equity curve data
    const equityData = sorted.reduce((acc, t, i) => {
      const prev = acc.length > 0 ? acc[acc.length - 1].pnl : 0;
      acc.push({ date: format(new Date(t.exitDate ?? t.entryDate), 'MMM dd'), pnl: prev + t.actualPnL!, idx: i + 1 });
      return acc;
    }, [] as { date: string; pnl: number; idx: number }[]);

    // Regime navigator data for selected regime
    const regimeFilter = selectedRegime === 'Overview' ? closed : (regimeCounts[selectedRegime]?.trades ?? []);
    const regimeEquity = [...regimeFilter].sort((a, b) => new Date(a.exitDate ?? a.entryDate).getTime() - new Date(b.exitDate ?? b.entryDate).getTime())
      .reduce((acc, t, i) => {
        const prev = acc.length > 0 ? acc[acc.length - 1].pnl : 0;
        acc.push({ date: format(new Date(t.exitDate ?? t.entryDate), 'MMM dd'), pnl: prev + t.actualPnL!, idx: i + 1 });
        return acc;
      }, [] as { date: string; pnl: number; idx: number }[]);
    const regimePnl = regimeFilter.reduce((s, t) => s + t.actualPnL!, 0);
    const regimeWins = regimeFilter.filter(t => t.actualPnL! > 0).length;
    const regimeWR = regimeFilter.length > 0 ? Math.round((regimeWins / regimeFilter.length) * 100) : 0;
    const regimeAvgHold = regimeFilter.length > 0
      ? regimeFilter.reduce((s, t) => s + (t.exitDate ? new Date(t.exitDate).getTime() - new Date(t.entryDate).getTime() : 0), 0) / regimeFilter.length
      : 0;
    const holdDays = Math.floor(regimeAvgHold / 86400000);
    const holdHours = Math.floor((regimeAvgHold % 86400000) / 3600000);
    const vsOverall = closed.length > 0
      ? (regimeFilter.length > 0 ? (regimeWins / regimeFilter.length) * 100 : 0) - (wins.length / closed.length) * 100
      : 0;

    // Weekday bias map
    const weekdayData = DAYS.map(day => {
      const dayTrades = closed.filter(t => {
        const d = new Date(t.entryDate);
        return DAYS[(d.getUTCDay() + 6) % 7] === day;
      });
      const dayPnl = dayTrades.reduce((s, t) => s + t.actualPnL!, 0);
      const dayWR = dayTrades.length > 0 ? Math.round((dayTrades.filter(t => t.actualPnL! > 0).length / dayTrades.length) * 100) : 0;
      return { day, pnl: dayPnl, trades: dayTrades.length, winRate: dayWR };
    });

    // High-impact days
    const dayMap = new Map<string, { pnl: number; trades: number; regime: string }>();
    closed.forEach(t => {
      const d = format(new Date(t.exitDate ?? t.entryDate), 'yyyy-MM-dd');
      const cl = checklistByDate.get(d);
      const regime = cl ? (cl.marketTrend === 'bullish' ? 'Trending Up' : cl.marketTrend === 'bearish' ? 'Trending Down' : 'Ranging') : 'Ranging';
      const prev = dayMap.get(d) ?? { pnl: 0, trades: 0, regime };
      prev.pnl += t.actualPnL!;
      prev.trades++;
      dayMap.set(d, prev);
    });
    const highImpactDays = [...dayMap.entries()]
      .map(([date, data]) => ({ date, ...data, verdict: data.pnl > 0 ? 'Edge' as const : 'Leaked' as const }))
      .sort((a, b) => Math.abs(b.pnl) - Math.abs(a.pnl))
      .slice(0, 10);

    // Context correlations
    const tradeFreqCorr = dailyPnls.length > 2
      ? (() => {
          const tradeCounts = Array.from(new Map(closed.map(t => {
            const d = format(new Date(t.exitDate ?? t.entryDate), 'yyyy-MM-dd');
            return [d, closed.filter(t2 => format(new Date(t2.exitDate ?? t2.entryDate), 'yyyy-MM-dd') === d).length];
          })).values());
          const meanTC = tradeCounts.reduce((s, v) => s + v, 0) / tradeCounts.length;
          const cov = tradeCounts.reduce((s, v, i) => s + (v - meanTC) * (dailyPnls[i] - dailyMean), 0) / tradeCounts.length;
          const stdTC = Math.sqrt(tradeCounts.reduce((s, v) => s + (v - meanTC) ** 2, 0) / tradeCounts.length);
          const stdPnl = Math.sqrt(dailyPnls.reduce((s, v) => s + (v - dailyMean) ** 2, 0) / dailyPnls.length);
          return stdTC > 0 && stdPnl > 0 ? cov / (stdTC * stdPnl) : 0;
        })()
      : 0;

    // Weekday effect correlation
    const weekdayCorr = weekdayData.length > 0
      ? (() => {
          const pnls = weekdayData.map(d => d.pnl);
          const indices = weekdayData.map((_, i) => i);
          const meanP = pnls.reduce((s, v) => s + v, 0) / pnls.length;
          const meanI = indices.reduce((s, v) => s + v, 0) / indices.length;
          const cov = indices.reduce((s, v, i) => s + (v - meanI) * (pnls[i] - meanP), 0) / pnls.length;
          const stdI = Math.sqrt(indices.reduce((s, v) => s + (v - meanI) ** 2, 0) / indices.length);
          const stdP = Math.sqrt(pnls.reduce((s, v) => s + (v - meanP) ** 2, 0) / pnls.length);
          return stdI > 0 && stdP > 0 ? cov / (stdI * stdP) : 0;
        })()
      : 0;

    // PnL consistency
    const pnlConsistency = dailyPnls.length > 1 ? 1 - Math.min(1, (vol30d / (Math.abs(dailyMean) || 1))) : 0;

    const correlations = [
      { label: 'Trade Frequency', value: tradeFreqCorr },
      { label: 'Volatility Pressure', value: volCorrelation },
      { label: 'Hold-Time Fit', value: 0 }, // placeholder
      { label: 'Weekday Effect', value: weekdayCorr },
      { label: 'PnL Consistency', value: pnlConsistency },
    ];

    // Action blueprint
    const actions: { color: string; title: string; desc: string }[] = [];
    if (worstSession && worstSession.pnl < 0) {
      actions.push({ color: '#f59e0b', title: `De-risk ${worstSession.label} window`, desc: `${worstSession.label} is your weakest window. Trade lower frequency or tighter filters there.` });
    }
    const worstDay = [...weekdayData].sort((a, b) => a.pnl - b.pnl)[0];
    if (worstDay && worstDay.pnl < 0) {
      actions.push({ color: '#f59e0b', title: `Throttle ${worstDay.day} risk`, desc: `${worstDay.day} underperforms (${formatCurrency(worstDay.pnl)}). Reduce risk cap or require higher setup quality that day.` });
    }
    actions.push({ color: '#3b82f6', title: 'Single-change protocol', desc: 'Run one adjustment at a time for 5-7 sessions, then evaluate expectancy and compliance drift.' });

    // Unique trading days
    const uniqueDays = new Set(closed.map(t => format(new Date(t.exitDate ?? t.entryDate), 'yyyy-MM-dd'))).size;

    return {
      closed, sorted, totalPnL, winRate, wins: wins.length,
      currentRegime, regimeStability, activeWinRate, activeRegimePnl,
      bestRegime, bestSession, worstSession,
      regimeCounts, sessionData,
      volState, vol7d, vol30d, volCorrelation,
      equityData, regimeEquity, regimePnl, regimeWR, regimeFilter,
      holdDays, holdHours, vsOverall,
      weekdayData, highImpactDays,
      correlations, actions, uniqueDays,
    };
  }, [windowedTrades, checklists, selectedRegime, formatCurrency]);

  const pnlColor = (v: number) => v > 0 ? 'text-emerald-400' : v < 0 ? 'text-red-400' : 'text-[var(--foreground)]';
  const fmtPnl = (v: number) => `${v >= 0 ? '+' : ''}${formatCurrency(v)}`;
  const corrLabel = (v: number) => Math.abs(v) > 0.7 ? 'Strong' : Math.abs(v) > 0.3 ? 'Moderate' : 'Weak';

  return (
    <div className="space-y-5 px-4 sm:px-6 py-6 max-w-[1400px] mx-auto">
      {/* ── Hero ── */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-4">
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <span className="px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-400 text-xs font-semibold flex items-center gap-1.5">
              <Globe size={14} /> MARKET CONTEXT COMMAND
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[var(--foreground)] mb-3">
            Trade Your Process To The Right Conditions
          </h1>
          <p className="text-sm text-[var(--muted-foreground)] mb-5 max-w-xl">
            This page maps where your strategy performs, where it leaks, and which market states need tighter risk controls.
          </p>
          <div className="flex items-center flex-wrap gap-2">
            <span className="px-3 py-1 rounded-full bg-[var(--muted)] text-[var(--muted-foreground)] text-xs">
              {m.uniqueDays} days &bull; {m.closed.length} trades
            </span>
          </div>
        </div>

        {/* Active Context */}
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5">
          <div className="text-[10px] text-[var(--muted-foreground)] uppercase tracking-wider font-semibold mb-3">Active Context</div>
          <div className="flex items-center gap-2 mb-3">
            <span className="px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-400 text-xs font-semibold">{m.currentRegime}</span>
            <span className="text-xs text-[var(--muted-foreground)]">{m.regimeStability}% stable in last 10 sessions</span>
          </div>
          <div className="text-sm text-[var(--foreground)] mb-1">
            Best regime: <span className="font-semibold text-cyan-400">{m.bestRegime[0]}</span>
          </div>
          <div className="text-xs text-[var(--muted-foreground)] mb-4">
            Best session: <span className="font-semibold text-[var(--foreground)]">{m.bestSession?.label}</span> &bull;
            Worst session: <span className="font-semibold text-[var(--foreground)]">{m.worstSession?.label}</span>
          </div>
          <button className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--muted)]/50 border border-[var(--border)] text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors">
            <RefreshCw size={14} /> Refresh context
          </button>
        </div>
      </div>

      {/* ── 4 Stat Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-4 sm:p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] text-[var(--muted-foreground)] uppercase tracking-wider font-semibold">Current Regime</span>
            <Globe size={16} className="text-[var(--muted-foreground)]" />
          </div>
          <div className="text-xl font-bold text-cyan-400">{m.currentRegime}</div>
          <div className="text-[10px] text-[var(--muted-foreground)] mt-1">100% confidence</div>
        </div>
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-4 sm:p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] text-[var(--muted-foreground)] uppercase tracking-wider font-semibold">Active Win Rate</span>
            <TrendingUp size={16} className="text-[var(--muted-foreground)]" />
          </div>
          <div className={`text-xl font-bold ${m.activeWinRate >= 50 ? 'text-emerald-400' : 'text-red-400'}`}>{m.activeWinRate}%</div>
          <div className="text-[10px] text-[var(--muted-foreground)] mt-1">{fmtPnl(m.activeRegimePnl)} in regime</div>
        </div>
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-4 sm:p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] text-[var(--muted-foreground)] uppercase tracking-wider font-semibold">Volatility State</span>
            <Zap size={16} className="text-[var(--muted-foreground)]" />
          </div>
          <div className="text-xl font-bold text-[var(--foreground)]">{m.volState}</div>
          <div className="text-[10px] text-[var(--muted-foreground)] mt-1">7d {m.vol7d.toFixed(1)} vs 30d {m.vol30d.toFixed(1)}</div>
        </div>
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-4 sm:p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] text-[var(--muted-foreground)] uppercase tracking-wider font-semibold">Vol Correlation</span>
            <Activity size={16} className="text-[var(--muted-foreground)]" />
          </div>
          <div className={`text-xl font-bold ${pnlColor(m.volCorrelation)}`}>{m.volCorrelation >= 0 ? '+' : ''}{m.volCorrelation.toFixed(2)}</div>
          <div className="text-[10px] text-[var(--muted-foreground)] mt-1">{corrLabel(m.volCorrelation)}</div>
        </div>
      </div>

      {/* ── Regime Navigator ── */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5">
        <h2 className="text-lg font-semibold text-[var(--foreground)] mb-1">Regime Navigator</h2>
        <p className="text-xs text-[var(--muted-foreground)] mb-4">Click a regime to inspect isolated performance and context fit.</p>

        <div className="grid grid-cols-1 xl:grid-cols-[280px_1fr] gap-4">
          {/* Regime list */}
          <div className="space-y-2">
            <button
              onClick={() => setSelectedRegime('Overview')}
              className={`w-full text-left rounded-xl border p-3 transition-colors ${selectedRegime === 'Overview' ? 'border-[var(--accent)] bg-[var(--accent)]/5' : 'border-[var(--border)] hover:border-[var(--muted-foreground)]/30'}`}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-[var(--foreground)]">Overview</span>
                <ChevronRight size={14} className="text-[var(--muted-foreground)]" />
              </div>
              <div className="text-[10px] text-[var(--muted-foreground)]">Full-period trajectory and regime transitions</div>
            </button>
            {(['Trending Up', 'Trending Down', 'Ranging'] as Regime[]).map(regime => {
              const data = m.regimeCounts[regime];
              const regimeWR = data.trades.length > 0 ? Math.round((data.trades.filter(t => t.actualPnL! > 0).length / data.trades.length) * 100) : 0;
              const totalTrades = m.closed.length || 1;
              return (
                <button
                  key={regime}
                  onClick={() => setSelectedRegime(regime)}
                  className={`w-full text-left rounded-xl border p-3 transition-colors ${selectedRegime === regime ? 'border-[var(--accent)] bg-[var(--accent)]/5' : 'border-[var(--border)] hover:border-[var(--muted-foreground)]/30'}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${regime === 'Trending Up' ? 'bg-emerald-400' : regime === 'Trending Down' ? 'bg-red-400' : 'bg-cyan-400'}`} />
                      <span className="text-sm font-medium text-[var(--foreground)]">{regime}</span>
                    </div>
                    <span className={`text-sm font-semibold ${pnlColor(data.pnl)}`}>{fmtPnl(data.pnl)}</span>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-[10px] text-[var(--muted-foreground)]">
                    <span>{regimeWR}% win</span>
                    <span>{data.trades.length} trades</span>
                    <span>{Math.round((data.trades.length / totalTrades) * 100)}% time</span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Regime chart + stats */}
          <div>
            {m.regimeEquity.length > 0 ? (
              <div className="h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={m.regimeEquity} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                    <defs>
                      <linearGradient id="regGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#22d3ee" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} tickLine={false} axisLine={false} tickFormatter={v => `$${v}`} />
                    <Tooltip contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '11px', color: 'var(--foreground)' }} />
                    <Area type="monotone" dataKey="pnl" stroke="#22d3ee" strokeWidth={2} fill="url(#regGrad)" dot={{ fill: '#22d3ee', r: 3 }} isAnimationActive={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[260px] flex items-center justify-center text-sm text-[var(--muted-foreground)]">No trades in this regime</div>
            )}

            {/* Regime color bar */}
            <div className="h-2 rounded-full overflow-hidden flex mt-3 mb-3">
              {m.closed.length > 0 && (['Trending Up', 'Trending Down', 'Ranging'] as Regime[]).map(r => {
                const pct = (m.regimeCounts[r].trades.length / m.closed.length) * 100;
                if (pct === 0) return null;
                return <div key={r} className="h-full" style={{ width: `${pct}%`, backgroundColor: r === 'Trending Up' ? '#22c55e' : r === 'Trending Down' ? '#ef4444' : '#22d3ee' }} />;
              })}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div className="bg-[var(--muted)]/30 border border-[var(--border)] rounded-lg p-2.5">
                <div className="text-[9px] text-[var(--muted-foreground)] uppercase">Win Rate</div>
                <div className="text-sm font-bold text-[var(--foreground)]">{m.regimeWR}%</div>
              </div>
              <div className="bg-[var(--muted)]/30 border border-[var(--border)] rounded-lg p-2.5">
                <div className="text-[9px] text-[var(--muted-foreground)] uppercase">Trades</div>
                <div className="text-sm font-bold text-[var(--foreground)]">{m.regimeFilter.length}</div>
              </div>
              <div className="bg-[var(--muted)]/30 border border-[var(--border)] rounded-lg p-2.5">
                <div className="text-[9px] text-[var(--muted-foreground)] uppercase">Avg Hold</div>
                <div className="text-sm font-bold text-[var(--foreground)]">{m.holdDays}d {m.holdHours}h</div>
              </div>
              <div className="bg-[var(--muted)]/30 border border-[var(--border)] rounded-lg p-2.5">
                <div className="text-[9px] text-[var(--muted-foreground)] uppercase">Vs Overall</div>
                <div className={`text-sm font-bold ${pnlColor(m.vsOverall)}`}>{m.vsOverall >= 0 ? '+' : ''}{m.vsOverall.toFixed(1)}pp</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Session Compatibility + Volatility Pressure ── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-lg font-semibold text-[var(--foreground)]">Session Compatibility</h2>
            <Clock size={18} className="text-[var(--muted-foreground)]" />
          </div>
          <p className="text-xs text-[var(--muted-foreground)] mb-4">Where your strategy aligns best with market flow.</p>
          <div className="space-y-3">
            {m.sessionData.map(sess => {
              const maxAbs = Math.max(...m.sessionData.map(s => Math.abs(s.pnl)), 1);
              return (
                <div key={sess.label} className="bg-[var(--muted)]/30 border border-[var(--border)] rounded-xl p-3.5">
                  <div className="flex items-center justify-between mb-1">
                    <div>
                      <div className="text-sm font-semibold text-[var(--foreground)]">{sess.label}</div>
                      <div className="text-[10px] text-[var(--muted-foreground)]">{sess.time}</div>
                    </div>
                    <div className="text-right">
                      <div className={`text-sm font-bold ${pnlColor(sess.pnl)}`}>{fmtPnl(sess.pnl)}</div>
                      <div className="text-[10px] text-[var(--muted-foreground)]">{sess.winRate}% &bull; {sess.trades} trades</div>
                    </div>
                  </div>
                  <div className="h-1.5 rounded-full bg-[var(--border)] overflow-hidden mt-2">
                    <div className={`h-full rounded-full ${sess.pnl >= 0 ? 'bg-emerald-500' : 'bg-red-500'}`}
                      style={{ width: `${Math.min((Math.abs(sess.pnl) / maxAbs) * 100, 100)}%` }} />
                  </div>
                  <div className="text-[10px] text-[var(--muted-foreground)] mt-1">Expectancy: <span className={pnlColor(sess.expectancy)}>{fmtPnl(sess.expectancy)}</span></div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-lg font-semibold text-[var(--foreground)]">Volatility Pressure</h2>
            <Zap size={18} className="text-[var(--muted-foreground)]" />
          </div>
          <p className="text-xs text-[var(--muted-foreground)] mb-4">PnL response during changing volatility.</p>
          {m.equityData.length > 0 ? (
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={m.equityData} margin={{ top: 5, right: 40, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} tickLine={false} axisLine={false} />
                  <YAxis yAxisId="pnl" tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} tickLine={false} axisLine={false} tickFormatter={v => `$${v}`} />
                  <YAxis yAxisId="vol" orientation="right" domain={[0, 100]} tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '11px', color: 'var(--foreground)' }} />
                  <Line yAxisId="pnl" type="monotone" dataKey="pnl" stroke="#22d3ee" strokeWidth={2} dot={{ fill: '#22d3ee', r: 3 }} name="PnL" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[280px] flex items-center justify-center text-sm text-[var(--muted-foreground)]">Need more trades for volatility analysis</div>
          )}
        </div>
      </div>

      {/* ── Context Correlations + Action Blueprint ── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-lg font-semibold text-[var(--foreground)]">Context Correlations</h2>
            <BarChart3 size={18} className="text-[var(--muted-foreground)]" />
          </div>
          <p className="text-xs text-[var(--muted-foreground)] mb-4">How strongly each market factor aligns with your PnL.</p>
          <div className="space-y-3">
            {m.correlations.map(c => (
              <div key={c.label} className="bg-[var(--muted)]/30 border border-[var(--border)] rounded-xl p-3.5">
                <div className="flex items-center justify-between mb-1">
                  <div>
                    <div className="text-sm font-medium text-[var(--foreground)]">{c.label}</div>
                    <div className="text-[10px] text-[var(--muted-foreground)]">{corrLabel(c.value)}</div>
                  </div>
                  <div className="text-right">
                    <div className={`text-sm font-bold ${pnlColor(c.value)}`}>{c.value >= 0 ? '+' : ''}{c.value.toFixed(2)}</div>
                    <div className="text-[10px] text-[var(--muted-foreground)]">Positive alignment</div>
                  </div>
                </div>
                <div className="h-1.5 rounded-full bg-[var(--border)] overflow-hidden mt-2">
                  <div className="h-full rounded-full bg-cyan-500 transition-all" style={{ width: `${Math.abs(c.value) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-lg font-semibold text-[var(--foreground)]">Action Blueprint</h2>
            <ArrowUpRight size={18} className="text-[var(--muted-foreground)]" />
          </div>
          <p className="text-xs text-[var(--muted-foreground)] mb-4">Context adjustments to deploy next.</p>
          <div className="space-y-3">
            {m.actions.map((a, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="w-2.5 h-2.5 rounded-full mt-1.5 shrink-0" style={{ backgroundColor: a.color }} />
                <div>
                  <div className="text-sm font-semibold text-[var(--foreground)]">{a.title}</div>
                  <p className="text-xs text-[var(--muted-foreground)] mt-0.5">{a.desc}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 bg-[var(--muted)]/30 border border-[var(--border)] rounded-lg px-3 py-2.5 text-xs text-[var(--muted-foreground)]">
            Execution rule: apply one context adjustment for 5-7 sessions before evaluating impact.
          </div>
        </div>
      </div>

      {/* ── Weekday Bias Map + High-Impact Days ── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-lg font-semibold text-[var(--foreground)]">Weekday Bias Map</h2>
            <Activity size={18} className="text-[var(--muted-foreground)]" />
          </div>
          <p className="text-xs text-[var(--muted-foreground)] mb-4">Net performance concentration by weekday.</p>
          {m.weekdayData.some(d => d.trades > 0) ? (
            <div className="h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={m.weekdayData} margin={{ top: 5, right: 40, left: 10, bottom: 5 }}>
                  <defs>
                    <linearGradient id="wdGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#22d3ee" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="day" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} tickLine={false} axisLine={false} />
                  <YAxis yAxisId="pnl" tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} tickLine={false} axisLine={false} tickFormatter={v => `$${v}`} />
                  <YAxis yAxisId="wr" orientation="right" domain={[0, 100]} tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} tickLine={false} axisLine={false} tickFormatter={v => `${v}%`} />
                  <Tooltip contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '11px', color: 'var(--foreground)' }} />
                  <Area yAxisId="pnl" type="monotone" dataKey="pnl" stroke="#22d3ee" strokeWidth={2} fill="url(#wdGrad)" name="PnL" />
                  <Line yAxisId="wr" type="monotone" dataKey="winRate" stroke="#22c55e" strokeWidth={1.5} strokeDasharray="4 4" dot={false} name="Win Rate %" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[240px] flex items-center justify-center text-sm text-[var(--muted-foreground)]">Need trades for weekday analysis</div>
          )}
        </div>

        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-lg font-semibold text-[var(--foreground)]">High-Impact Days</h2>
            <Calendar size={18} className="text-[var(--muted-foreground)]" />
          </div>
          <p className="text-xs text-[var(--muted-foreground)] mb-4">Largest market-context outcomes in selected range.</p>
          {m.highImpactDays.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[10px] text-[var(--muted-foreground)] uppercase tracking-wider">
                    <th className="text-left py-2 font-medium">Date</th>
                    <th className="text-left py-2 font-medium">Regime</th>
                    <th className="text-right py-2 font-medium">PnL</th>
                    <th className="text-center py-2 font-medium">Trades</th>
                    <th className="text-right py-2 font-medium">Verdict</th>
                  </tr>
                </thead>
                <tbody>
                  {m.highImpactDays.map(d => (
                    <tr key={d.date} className="border-t border-[var(--border)]">
                      <td className="py-2.5 text-[var(--foreground)]">{d.date}</td>
                      <td className="py-2.5 text-[var(--muted-foreground)]">{d.regime}</td>
                      <td className={`py-2.5 text-right font-semibold ${pnlColor(d.pnl)}`}>{fmtPnl(d.pnl)}</td>
                      <td className="py-2.5 text-center text-[var(--foreground)]">{d.trades}</td>
                      <td className="py-2.5 text-right">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${d.verdict === 'Edge' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-pink-500/15 text-pink-400'}`}>
                          {d.verdict}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-[var(--muted-foreground)]">No high-impact days in this range.</p>
          )}
        </div>
      </div>
    </div>
  );
}
