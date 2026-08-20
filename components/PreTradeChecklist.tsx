'use client';

import { useState, useMemo } from 'react';
import { PreTradeChecklist as ChecklistType, Strategy, Trade } from '@/lib/types';
import { Globe, TrendUp, Lightning, Clock, ChartBar, Calendar, ArrowUpRight, CaretRight, ArrowsClockwise } from '@phosphor-icons/react';
import { Pulse as Activity } from '@phosphor-icons/react';
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

  const pnlColor = (v: number) => v > 0 ? 'var(--green)' : v < 0 ? 'var(--red)' : 'var(--text)';
  // formatCurrency already signs the number — no need to manually prepend '+'.
  const fmtPnl = (v: number) => formatCurrency(v);
  const corrLabel = (v: number) => Math.abs(v) > 0.7 ? 'Strong' : Math.abs(v) > 0.3 ? 'Moderate' : 'Weak';

  return (
    <div className="relative anim-fade-up">
      {/* ── Hero ── */}
      <div className="phead pwrap">
        <p className="eyebrow">
          <Globe size={13} style={{ color: 'var(--amber)' }} /> Market context command
        </p>
        <h2>Trade Your Process To The Right Conditions</h2>
        <p className="sub">
          This page maps where your strategy performs, where it leaks, and which market states need tighter risk controls.
        </p>
        <div className="actions">
          <span className="chip">{m.uniqueDays} days &bull; {m.closed.length} trades</span>
        </div>
      </div>

      {/* Active Context */}
      <div className="card">
        <span className="accent" style={{ width: 56, background: 'var(--amber)' }} />
        <div className="cardhead">
          <div>
            <h3>Active Context</h3>
            <p className="sub">Current market read derived from your latest checklists and closed trades.</p>
          </div>
          <button className="btn-g" style={{ marginLeft: 'auto', height: 34 }}>
            <ArrowsClockwise size={13} /> Refresh context
          </button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 12, marginTop: 20 }}>
          <div className="inset">
            <p className="lbl">CURRENT REGIME</p>
            <em style={{ display: 'block', fontStyle: 'normal', fontFamily: 'var(--display)', fontWeight: 700, fontSize: 16, marginTop: 8, color: 'var(--teal)' }}>
              {m.currentRegime}
            </em>
            <small style={{ display: 'block', fontSize: 10.5, color: 'var(--muted-2)', marginTop: 6 }}>
              {m.regimeStability}% stable in last 10 sessions
            </small>
          </div>
          <div className="inset">
            <p className="lbl">BEST REGIME</p>
            <em style={{ display: 'block', fontStyle: 'normal', fontFamily: 'var(--display)', fontWeight: 700, fontSize: 16, marginTop: 8, color: 'var(--amber)' }}>
              {m.bestRegime[0]}
            </em>
            <small style={{ display: 'block', fontSize: 10.5, color: 'var(--muted-2)', marginTop: 6 }}>
              highest net P&amp;L bucket
            </small>
          </div>
          <div className="inset">
            <p className="lbl">SESSION EDGE</p>
            <em style={{ display: 'block', fontStyle: 'normal', fontFamily: 'var(--display)', fontWeight: 700, fontSize: 16, marginTop: 8, color: 'var(--text)' }}>
              {m.bestSession?.label}
            </em>
            <small style={{ display: 'block', fontSize: 10.5, color: 'var(--muted-2)', marginTop: 6 }}>
              worst: {m.worstSession?.label}
            </small>
          </div>
        </div>
      </div>

      {/* ── 4 Stat Cards ── */}
      <div className="stats">
        <div className="stat" style={{ height: 'auto', minHeight: 104 }}>
          <span className="accent" style={{ background: 'var(--teal)' }} />
          <b>CURRENT REGIME</b>
          <em style={{ fontSize: 19, color: 'var(--teal)' }}>{m.currentRegime}</em>
          <small style={{ display: 'block', fontSize: 10, color: 'var(--muted-2)', marginTop: 4 }}>
            <Globe size={10} style={{ display: 'inline', marginRight: 5 }} />{m.regimeStability}% confidence
          </small>
        </div>
        <div className="stat" style={{ height: 'auto', minHeight: 104 }}>
          <span className="accent" style={{ background: 'var(--green)' }} />
          <b>ACTIVE WIN RATE</b>
          <em style={{ color: m.activeWinRate >= 50 ? 'var(--green)' : 'var(--red)' }}>{m.activeWinRate}%</em>
          <small style={{ display: 'block', fontSize: 10, color: 'var(--muted-2)', marginTop: 4 }}>
            <TrendUp size={10} style={{ display: 'inline', marginRight: 5 }} />{fmtPnl(m.activeRegimePnl)} in regime
          </small>
        </div>
        <div className="stat" style={{ height: 'auto', minHeight: 104 }}>
          <span className="accent" style={{ background: 'var(--amber)' }} />
          <b>VOLATILITY STATE</b>
          <em style={{ fontSize: 22 }}>{m.volState}</em>
          <small style={{ display: 'block', fontSize: 10, color: 'var(--muted-2)', marginTop: 4 }}>
            <Lightning size={10} style={{ display: 'inline', marginRight: 5 }} />7d {m.vol7d.toFixed(1)} vs 30d {m.vol30d.toFixed(1)}
          </small>
        </div>
        <div className="stat" style={{ height: 'auto', minHeight: 104 }}>
          <span className="accent" style={{ background: 'var(--pink)' }} />
          <b>VOL CORRELATION</b>
          <em style={{ color: pnlColor(m.volCorrelation) }}>{m.volCorrelation >= 0 ? '+' : ''}{m.volCorrelation.toFixed(2)}</em>
          <small style={{ display: 'block', fontSize: 10, color: 'var(--muted-2)', marginTop: 4 }}>
            <Activity size={10} style={{ display: 'inline', marginRight: 5 }} />{corrLabel(m.volCorrelation)}
          </small>
        </div>
      </div>

      {/* ── Regime Navigator ── */}
      <div className="card" style={{ marginTop: 32 }}>
        <span className="accent" style={{ width: 56, background: 'var(--teal)' }} />
        <h3>Regime Navigator</h3>
        <p className="sub">Click a regime to inspect isolated performance and context fit.</p>

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(240px,280px) 1fr', gap: 20, marginTop: 22 }} className="max-xl:!grid-cols-1">
          {/* Regime list */}
          <div>
            <button
              onClick={() => setSelectedRegime('Overview')}
              className="inset"
              style={{
                display: 'block',
                width: '100%',
                textAlign: 'left',
                marginBottom: 8,
                padding: '13px 16px',
                borderColor: selectedRegime === 'Overview' ? 'var(--amber)' : 'var(--line)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <span style={{ fontWeight: 700, fontSize: 12.5, color: 'var(--text)' }}>Overview</span>
                <CaretRight size={14} style={{ marginLeft: 'auto', color: 'var(--muted-2)' }} />
              </div>
              <div style={{ fontSize: 10.5, color: 'var(--muted-2)', marginTop: 5 }}>Full-period trajectory and regime transitions</div>
            </button>
            {(['Trending Up', 'Trending Down', 'Ranging'] as Regime[]).map(regime => {
              const data = m.regimeCounts[regime];
              const regimeWR = data.trades.length > 0 ? Math.round((data.trades.filter(t => t.actualPnL! > 0).length / data.trades.length) * 100) : 0;
              const totalTrades = m.closed.length || 1;
              return (
                <button
                  key={regime}
                  onClick={() => setSelectedRegime(regime)}
                  className="inset"
                  style={{
                    display: 'block',
                    width: '100%',
                    textAlign: 'left',
                    marginBottom: 8,
                    padding: '13px 16px',
                    borderColor: selectedRegime === regime ? 'var(--amber)' : 'var(--line)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <i
                      style={{
                        width: 7,
                        height: 7,
                        borderRadius: 1,
                        flex: 'none',
                        background: regime === 'Trending Up' ? 'var(--green)' : regime === 'Trending Down' ? 'var(--red)' : 'var(--teal)',
                      }}
                    />
                    <span style={{ fontSize: 12.5, color: 'var(--text)' }}>{regime}</span>
                    <span style={{ marginLeft: 'auto', fontFamily: 'var(--mono)', fontWeight: 500, fontSize: 12.5, color: pnlColor(data.pnl) }}>
                      {fmtPnl(data.pnl)}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 14, marginTop: 6, fontSize: 10.5, color: 'var(--muted-2)' }}>
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
                        <stop offset="5%" stopColor="#24c88a" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#24c88a" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--grid)" />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--muted-2)' }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: 'var(--muted-2)' }} tickLine={false} axisLine={false} tickFormatter={v => `$${v}`} />
                    <Tooltip contentStyle={{ background: 'var(--panel-2)', border: '1px solid var(--line-2)', borderRadius: '2px', fontSize: '11px', color: 'var(--text)' }} />
                    <Area type="monotone" dataKey="pnl" stroke="#24c88a" strokeWidth={2} fill="url(#regGrad)" dot={{ fill: '#24c88a', r: 3 }} isAnimationActive={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[260px] flex items-center justify-center">
                <span className="empty-line" style={{ padding: 0 }}>No trades in this regime</span>
              </div>
            )}

            {/* Regime color bar */}
            <div className="flex" style={{ height: 3, background: 'var(--rail)', margin: '14px 0' }}>
              {m.closed.length > 0 && (['Trending Up', 'Trending Down', 'Ranging'] as Regime[]).map(r => {
                const pct = (m.regimeCounts[r].trades.length / m.closed.length) * 100;
                if (pct === 0) return null;
                return <div key={r} className="h-full" style={{ width: `${pct}%`, backgroundColor: r === 'Trending Up' ? '#24c88a' : r === 'Trending Down' ? '#ff4d5e' : '#2fd3c4' }} />;
              })}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="inset" style={{ padding: '11px 14px' }}>
                <p className="lbl">WIN RATE</p>
                <em style={{ display: 'block', fontStyle: 'normal', fontFamily: 'var(--mono)', fontWeight: 500, fontSize: 16, marginTop: 6, color: 'var(--text)' }}>{m.regimeWR}%</em>
              </div>
              <div className="inset" style={{ padding: '11px 14px' }}>
                <p className="lbl">TRADES</p>
                <em style={{ display: 'block', fontStyle: 'normal', fontFamily: 'var(--mono)', fontWeight: 500, fontSize: 16, marginTop: 6, color: 'var(--text)' }}>{m.regimeFilter.length}</em>
              </div>
              <div className="inset" style={{ padding: '11px 14px' }}>
                <p className="lbl">AVG HOLD</p>
                <em style={{ display: 'block', fontStyle: 'normal', fontFamily: 'var(--mono)', fontWeight: 500, fontSize: 16, marginTop: 6, color: 'var(--text)' }}>{m.holdDays}d {m.holdHours}h</em>
              </div>
              <div className="inset" style={{ padding: '11px 14px' }}>
                <p className="lbl">VS OVERALL</p>
                <em style={{ display: 'block', fontStyle: 'normal', fontFamily: 'var(--mono)', fontWeight: 500, fontSize: 16, marginTop: 6, color: pnlColor(m.vsOverall) }}>{m.vsOverall >= 0 ? '+' : ''}{m.vsOverall.toFixed(1)}pp</em>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Session Compatibility + Volatility Pressure ── */}
      <div className="split" style={{ marginTop: 32 }}>
        <div className="card">
          <span className="accent" style={{ width: 48, background: 'var(--green)' }} />
          <div className="cardhead">
            <div>
              <h3>Session Compatibility</h3>
              <p className="sub">Where your strategy aligns best with market flow.</p>
            </div>
            <Clock size={16} style={{ marginLeft: 'auto', color: 'var(--muted-3)' }} />
          </div>
          <div style={{ marginTop: 20 }}>
            {m.sessionData.map(sess => {
              const maxAbs = Math.max(...m.sessionData.map(s => Math.abs(s.pnl)), 1);
              return (
                <div key={sess.label} className="inset" style={{ padding: '13px 16px', marginBottom: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                    <div>
                      <p className="lbl b95">{sess.label.toUpperCase()}</p>
                      <div style={{ fontSize: 10.5, color: 'var(--muted-2)', marginTop: 5 }}>{sess.time}</div>
                    </div>
                    <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                      <div style={{ fontFamily: 'var(--mono)', fontWeight: 500, fontSize: 14, color: pnlColor(sess.pnl) }}>{fmtPnl(sess.pnl)}</div>
                      <div style={{ fontSize: 10.5, color: 'var(--muted-2)', marginTop: 4 }}>{sess.winRate}% &bull; {sess.trades} trades</div>
                    </div>
                  </div>
                  <div style={{ height: 2, background: 'var(--rail)', position: 'relative', marginTop: 12 }}>
                    <div
                      style={{
                        position: 'absolute', left: 0, top: 0, bottom: 0,
                        width: `${Math.min((Math.abs(sess.pnl) / maxAbs) * 100, 100)}%`,
                        background: sess.pnl >= 0 ? 'var(--green)' : 'var(--red)',
                      }}
                    />
                  </div>
                  <div style={{ fontSize: 10.5, color: 'var(--muted-2)', marginTop: 10 }}>
                    Expectancy: <span style={{ color: pnlColor(sess.expectancy), fontFamily: 'var(--mono)' }}>{fmtPnl(sess.expectancy)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="card">
          <span className="accent" style={{ width: 48, background: 'var(--amber)' }} />
          <div className="cardhead">
            <div>
              <h3>Volatility Pressure</h3>
              <p className="sub">PnL response during changing volatility.</p>
            </div>
            <Lightning size={16} style={{ marginLeft: 'auto', color: 'var(--muted-3)' }} />
          </div>
          <div style={{ height: 16 }} />
          {m.equityData.length > 0 ? (
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={m.equityData} margin={{ top: 5, right: 40, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--grid)" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--muted-2)' }} tickLine={false} axisLine={false} />
                  <YAxis yAxisId="pnl" tick={{ fontSize: 10, fill: 'var(--muted-2)' }} tickLine={false} axisLine={false} tickFormatter={v => `$${v}`} />
                  <YAxis yAxisId="vol" orientation="right" domain={[0, 100]} tick={{ fontSize: 10, fill: 'var(--muted-2)' }} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ background: 'var(--panel-2)', border: '1px solid var(--line-2)', borderRadius: '2px', fontSize: '11px', color: 'var(--text)' }} />
                  <Line yAxisId="pnl" type="monotone" dataKey="pnl" stroke="#24c88a" strokeWidth={2} dot={{ fill: '#24c88a', r: 3 }} name="PnL" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[280px] flex items-center justify-center">
              <span className="empty-line" style={{ padding: 0 }}>Need more trades for volatility analysis</span>
            </div>
          )}
        </div>
      </div>

      {/* ── Context Correlations + Action Blueprint ── */}
      <div className="split" style={{ marginTop: 32 }}>
        <div className="card">
          <span className="accent" style={{ width: 48, background: 'var(--pink)' }} />
          <div className="cardhead">
            <div>
              <h3>Context Correlations</h3>
              <p className="sub">How strongly each market factor aligns with your PnL.</p>
            </div>
            <ChartBar size={16} style={{ marginLeft: 'auto', color: 'var(--muted-3)' }} />
          </div>
          <div style={{ marginTop: 20 }}>
            {m.correlations.map(c => (
              <div key={c.label} className="inset" style={{ padding: '13px 16px', marginBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                  <div>
                    <p className="lbl b95">{c.label.toUpperCase()}</p>
                    <div style={{ fontSize: 10.5, color: 'var(--muted-2)', marginTop: 5 }}>{corrLabel(c.value)}</div>
                  </div>
                  <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                    <div style={{ fontFamily: 'var(--mono)', fontWeight: 500, fontSize: 14, color: pnlColor(c.value) }}>
                      {c.value >= 0 ? '+' : ''}{c.value.toFixed(2)}
                    </div>
                    <div style={{ fontSize: 10.5, color: 'var(--muted-2)', marginTop: 4 }}>Positive alignment</div>
                  </div>
                </div>
                <div style={{ height: 2, background: 'var(--rail)', position: 'relative', marginTop: 12 }}>
                  <div
                    className="transition-all"
                    style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${Math.abs(c.value) * 100}%`, background: 'var(--pink)' }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <span className="accent" style={{ width: 48, background: 'var(--amber)' }} />
          <div className="cardhead">
            <div>
              <h3>Action Blueprint</h3>
              <p className="sub">Context adjustments to deploy next.</p>
            </div>
            <ArrowUpRight size={16} style={{ marginLeft: 'auto', color: 'var(--muted-3)' }} />
          </div>
          <div className="steps">
            {m.actions.map((a, i) => (
              <div key={i} className="step">
                <span className="n" style={{ borderColor: a.color, color: a.color }}>{i + 1}</span>
                <div>
                  <h5>{a.title}</h5>
                  <p>{a.desc}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="note" style={{ height: 'auto', minHeight: 44, padding: '12px 18px' }}>
            Execution rule: apply one context adjustment for 5-7 sessions before evaluating impact.
          </div>
        </div>
      </div>

      {/* ── Weekday Bias Map + High-Impact Days ── */}
      <div className="split" style={{ marginTop: 32 }}>
        <div className="card">
          <span className="accent" style={{ width: 48, background: 'var(--teal)' }} />
          <div className="cardhead">
            <div>
              <h3>Weekday Bias Map</h3>
              <p className="sub">Net performance concentration by weekday.</p>
            </div>
            <Activity size={16} style={{ marginLeft: 'auto', color: 'var(--muted-3)' }} />
          </div>
          <div style={{ height: 16 }} />
          {m.weekdayData.some(d => d.trades > 0) ? (
            <div className="h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={m.weekdayData} margin={{ top: 5, right: 40, left: 10, bottom: 5 }}>
                  <defs>
                    <linearGradient id="wdGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#24c88a" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#24c88a" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--grid)" />
                  <XAxis dataKey="day" tick={{ fontSize: 11, fill: 'var(--muted-2)' }} tickLine={false} axisLine={false} />
                  <YAxis yAxisId="pnl" tick={{ fontSize: 10, fill: 'var(--muted-2)' }} tickLine={false} axisLine={false} tickFormatter={v => `$${v}`} />
                  <YAxis yAxisId="wr" orientation="right" domain={[0, 100]} tick={{ fontSize: 10, fill: 'var(--muted-2)' }} tickLine={false} axisLine={false} tickFormatter={v => `${v}%`} />
                  <Tooltip contentStyle={{ background: 'var(--panel-2)', border: '1px solid var(--line-2)', borderRadius: '2px', fontSize: '11px', color: 'var(--text)' }} />
                  <Area yAxisId="pnl" type="monotone" dataKey="pnl" stroke="#24c88a" strokeWidth={2} fill="url(#wdGrad)" name="PnL" />
                  <Line yAxisId="wr" type="monotone" dataKey="winRate" stroke="#24c88a" strokeWidth={1.5} strokeDasharray="4 4" dot={false} name="Win Rate %" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[240px] flex items-center justify-center">
              <span className="empty-line" style={{ padding: 0 }}>Need trades for weekday analysis</span>
            </div>
          )}
        </div>

        <div className="card">
          <span className="accent" style={{ width: 48, background: 'var(--pink)' }} />
          <div className="cardhead">
            <div>
              <h3>High-Impact Days</h3>
              <p className="sub">Largest market-context outcomes in selected range.</p>
            </div>
            <Calendar size={16} style={{ marginLeft: 'auto', color: 'var(--muted-3)' }} />
          </div>
          {m.highImpactDays.length > 0 ? (
            <div style={{ overflowX: 'auto', marginTop: 18 }}>
              <table className="w-full" style={{ fontSize: 12.5, borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--line-2)' }}>
                    <th className="text-left" style={{ padding: '0 0 10px', fontWeight: 700, fontSize: 9, color: 'var(--muted-2)', letterSpacing: '.04em' }}>DATE</th>
                    <th className="text-left" style={{ padding: '0 0 10px', fontWeight: 700, fontSize: 9, color: 'var(--muted-2)', letterSpacing: '.04em' }}>REGIME</th>
                    <th className="text-right" style={{ padding: '0 0 10px', fontWeight: 700, fontSize: 9, color: 'var(--muted-2)', letterSpacing: '.04em' }}>PNL</th>
                    <th className="text-center" style={{ padding: '0 0 10px', fontWeight: 700, fontSize: 9, color: 'var(--muted-2)', letterSpacing: '.04em' }}>TRADES</th>
                    <th className="text-right" style={{ padding: '0 0 10px', fontWeight: 700, fontSize: 9, color: 'var(--muted-2)', letterSpacing: '.04em' }}>VERDICT</th>
                  </tr>
                </thead>
                <tbody>
                  {m.highImpactDays.map(d => (
                    <tr key={d.date} style={{ borderBottom: '1px solid var(--hair)' }}>
                      <td style={{ padding: '10px 0', color: 'var(--text-2)' }}>{d.date}</td>
                      <td style={{ padding: '10px 0', color: 'var(--muted-2)' }}>{d.regime}</td>
                      <td className="text-right" style={{ padding: '10px 0', fontFamily: 'var(--mono)', fontWeight: 500, color: pnlColor(d.pnl) }}>{fmtPnl(d.pnl)}</td>
                      <td className="text-center" style={{ padding: '10px 0', fontFamily: 'var(--mono)', color: 'var(--text)' }}>{d.trades}</td>
                      <td className="text-right" style={{ padding: '10px 0' }}>
                        <span
                          style={{
                            display: 'inline-flex', alignItems: 'center', height: 20, padding: '0 10px', borderRadius: 2,
                            fontWeight: 700, fontSize: 9.5, letterSpacing: '.03em',
                            border: `1px solid ${d.verdict === 'Edge' ? 'var(--green)' : 'var(--pink)'}`,
                            color: d.verdict === 'Edge' ? 'var(--green)' : 'var(--pink)',
                          }}
                        >
                          {d.verdict.toUpperCase()}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="empty-line">No high-impact days in this range.</p>
          )}
        </div>
      </div>
    </div>
  );
}
