'use client';

import { useState, useMemo } from 'react';
import { Trade } from '@/lib/types';
import { getWinRate, getDirectionWinRates, getEdgeProfile, getConfidenceCalibration, getDurationStats, formatDuration, getDrawdownStats, getAllCoinProfiles } from '@/lib/utils';
import { useCurrency } from '@/hooks/useCurrency';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { format } from 'date-fns';
import { Download, BarChart3 } from 'lucide-react';

interface AnalyticsProps {
  trades: Trade[];
  initialCapital?: number;
  onAddTrade?: () => void;
}

const tooltipStyle = {
  background: 'var(--card)',
  border: '1px solid var(--border)',
  borderRadius: '8px',
  fontSize: '12px',
};

function WinRateTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  return (
    <div style={tooltipStyle} className="px-3 py-2">
      <p className="font-medium mb-0.5">{label}</p>
      <p>{payload[0]?.value}% win rate</p>
      <p className="text-[var(--muted-foreground)]">{d?.trades} trade{d?.trades !== 1 ? 's' : ''}</p>
    </div>
  );
}

export default function Analytics({ trades, initialCapital = 0, onAddTrade }: AnalyticsProps) {
  const { formatCurrency } = useCurrency();
  const closedTrades = trades.filter(t => !t.isOpen && t.actualPnL !== null);

  const directionStats = useMemo(() => getDirectionWinRates(trades), [trades]);
  const edgeProfile = useMemo(() => getEdgeProfile(closedTrades), [closedTrades]);
  const confidenceCalibration = useMemo(() => getConfidenceCalibration(closedTrades), [closedTrades]);
  const durationStats = useMemo(() => getDurationStats(closedTrades), [closedTrades]);
  const drawdown = useMemo(() => getDrawdownStats(trades, initialCapital), [trades, initialCapital]);
  const coinProfiles = useMemo(() => getAllCoinProfiles(trades), [trades]);
  const [selectedCoin, setSelectedCoin] = useState<string | null>(null);
  const [subTab, setSubTab] = useState<'overview' | 'strategies' | 'coins' | 'timing' | 'edge' | 'risk'>('overview');

  const {
    pnlOverTime,
    byStrategy,
    byCoin,
    winLossData,
    metrics,
    timeOfDay,
    byDayOfWeek,
    rrAnalysis,
  } = useMemo(() => {
    const sorted = [...closedTrades].sort(
      (a, b) => new Date(a.exitDate!).getTime() - new Date(b.exitDate!).getTime()
    );

    // Cumulative P&L
    let cumPnl = 0;
    const pnlOverTime = sorted.map(t => {
      cumPnl += t.actualPnL ?? 0;
      return { date: format(new Date(t.exitDate!), 'MMM dd'), pnl: Math.round(cumPnl * 100) / 100 };
    });

    // Strategy attribution (win rate + avg return + total P&L)
    const stratMap = new Map<string, { wins: number; losses: number; pnl: number; totalPct: number }>();
    closedTrades.forEach(t => {
      const key = t.strategy || 'No Strategy';
      const cur = stratMap.get(key) ?? { wins: 0, losses: 0, pnl: 0, totalPct: 0 };
      if ((t.actualPnLPercent ?? 0) > 0) cur.wins++;
      else cur.losses++;
      cur.pnl += t.actualPnL ?? 0;
      cur.totalPct += t.actualPnLPercent ?? 0;
      stratMap.set(key, cur);
    });
    const byStrategy = Array.from(stratMap.entries())
      .map(([name, d]) => ({
        name,
        trades: d.wins + d.losses,
        winRate: d.wins + d.losses > 0 ? Math.round((d.wins / (d.wins + d.losses)) * 100) : 0,
        avgReturn: d.wins + d.losses > 0 ? Math.round((d.totalPct / (d.wins + d.losses)) * 100) / 100 : 0,
        pnl: Math.round(d.pnl * 100) / 100,
      }))
      .sort((a, b) => b.trades - a.trades);

    // By coin
    const coinMap = new Map<string, number>();
    closedTrades.forEach(t => {
      coinMap.set(t.coin, (coinMap.get(t.coin) || 0) + (t.actualPnL ?? 0));
    });
    const byCoin = Array.from(coinMap.entries())
      .map(([name, pnl]) => ({ name, pnl: Math.round(pnl * 100) / 100 }))
      .sort((a, b) => b.pnl - a.pnl);

    // Win/Loss pie
    const wins = closedTrades.filter(t => (t.actualPnLPercent ?? 0) > 0).length;
    const losses = closedTrades.length - wins;
    const winLossData = [
      { name: 'Wins', value: wins },
      { name: 'Losses', value: losses },
    ];

    // Core metrics
    const winTrades = closedTrades.filter(t => (t.actualPnLPercent ?? 0) > 0);
    const lossTrades = closedTrades.filter(t => (t.actualPnLPercent ?? 0) <= 0);
    const avgWin = winTrades.length > 0
      ? winTrades.reduce((s, t) => s + (t.actualPnLPercent ?? 0), 0) / winTrades.length : 0;
    const avgLoss = lossTrades.length > 0
      ? lossTrades.reduce((s, t) => s + Math.abs(t.actualPnLPercent ?? 0), 0) / lossTrades.length : 0;
    const profitFactor = avgLoss > 0
      ? (avgWin * winTrades.length) / (avgLoss * lossTrades.length)
      : winTrades.length > 0 ? Infinity : 0;
    let maxDrawdown = 0, peak = 0, cumPnl2 = 0;
    sorted.forEach(t => {
      cumPnl2 += t.actualPnL ?? 0;
      if (cumPnl2 > peak) peak = cumPnl2;
      const dd = peak - cumPnl2;
      if (dd > maxDrawdown) maxDrawdown = dd;
    });
    const largestWin = winTrades.length > 0 ? Math.max(...winTrades.map(t => t.actualPnL ?? 0)) : 0;
    const largestLoss = lossTrades.length > 0 ? Math.min(...lossTrades.map(t => t.actualPnL ?? 0)) : 0;
    const ruleBreakers = closedTrades.filter(t => t.rulesFollowed === false);
    const ruleBreakersLosing = ruleBreakers.filter(t => (t.actualPnLPercent ?? 0) <= 0);
    const metrics = {
      totalTrades: closedTrades.length,
      winRate: getWinRate(trades),
      avgWin: Math.round(avgWin * 100) / 100,
      avgLoss: Math.round(avgLoss * 100) / 100,
      profitFactor: profitFactor === Infinity ? 'INF' : profitFactor.toFixed(2),
      maxDrawdown: Math.round(maxDrawdown * 100) / 100,
      largestWin,
      largestLoss,
      ruleInsight: ruleBreakers.length > 0 && lossTrades.length > 0
        ? `You broke your rules on ${ruleBreakers.length} trades. ${ruleBreakersLosing.length} of those were losing trades.`
        : null,
    };

    // ── Time-of-day win rate (exit hour, local) ──
    const slots = [
      { label: 'Morning', sub: '6am–12pm', range: [6, 12] },
      { label: 'Afternoon', sub: '12pm–6pm', range: [12, 18] },
      { label: 'Evening', sub: '6pm–12am', range: [18, 24] },
      { label: 'Night', sub: '12am–6am', range: [0, 6] },
    ];
    const timeOfDay = slots.map(slot => {
      const bucket = closedTrades.filter(t => {
        const h = new Date(t.exitDate!).getHours();
        return h >= slot.range[0] && h < slot.range[1];
      });
      const bWins = bucket.filter(t => (t.actualPnLPercent ?? 0) > 0).length;
      return { label: slot.label, sub: slot.sub, winRate: bucket.length > 0 ? Math.round((bWins / bucket.length) * 100) : 0, trades: bucket.length };
    });

    // ── Day-of-week win rate ──
    const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dayData = Array.from({ length: 7 }, (_, i) => ({ day: dayLabels[i], wins: 0, total: 0 }));
    closedTrades.forEach(t => {
      const d = new Date(t.exitDate!).getDay();
      dayData[d].total++;
      if ((t.actualPnLPercent ?? 0) > 0) dayData[d].wins++;
    });
    const byDayOfWeek = dayData.map(d => ({
      day: d.day,
      winRate: d.total > 0 ? Math.round((d.wins / d.total) * 100) : 0,
      trades: d.total,
    }));

    // ── R:R — Target vs Actual ──
    const rrTrades = closedTrades.filter(t => t.targetPnL !== null && t.targetPnL > 0);
    const avgTarget = rrTrades.length > 0
      ? rrTrades.reduce((s, t) => s + (t.targetPnL ?? 0), 0) / rrTrades.length : null;
    const rrWins = rrTrades.filter(t => (t.actualPnLPercent ?? 0) > 0);
    const avgActualWin = rrWins.length > 0
      ? rrWins.reduce((s, t) => s + (t.actualPnLPercent ?? 0), 0) / rrWins.length : null;
    const achieved = rrTrades.filter(t => (t.actualPnLPercent ?? 0) >= (t.targetPnL ?? 0)).length;
    const achieveRate = rrTrades.length > 0 ? Math.round((achieved / rrTrades.length) * 100) : null;

    const rrByStrategy = byStrategy
      .map(s => {
        const sTrades = closedTrades.filter(
          t => (t.strategy || 'No Strategy') === s.name && t.targetPnL !== null && t.targetPnL > 0
        );
        if (sTrades.length === 0) return null;
        const target = Math.round((sTrades.reduce((sum, t) => sum + (t.targetPnL ?? 0), 0) / sTrades.length) * 100) / 100;
        const actual = Math.round((sTrades.reduce((sum, t) => sum + (t.actualPnLPercent ?? 0), 0) / sTrades.length) * 100) / 100;
        return {
          name: s.name.length > 14 ? s.name.slice(0, 14) + '…' : s.name,
          target,
          actual,
        };
      })
      .filter((x): x is { name: string; target: number; actual: number } => x !== null);

    const rrAnalysis = { avgTarget, avgActualWin, achieveRate, rrCount: rrTrades.length, rrByStrategy };

    return { pnlOverTime, byStrategy, byCoin, winLossData, metrics, timeOfDay, byDayOfWeek, rrAnalysis };
  }, [trades, closedTrades]);

  function handleExportCSV() {
    const headers = ['Date', 'Coin', 'Strategy', 'Entry Price', 'Exit Price', 'Capital ($)', 'P&L ($)', 'P&L (%)', 'Target (%)', 'Emotion', 'Confidence', 'Rules Followed', 'Tags', 'Verdict', 'Notes'];
    const rows = [...closedTrades]
      .sort((a, b) => new Date(a.exitDate!).getTime() - new Date(b.exitDate!).getTime())
      .map(t => [
        format(new Date(t.exitDate!), 'yyyy-MM-dd'),
        t.coin,
        t.strategy || '',
        t.entryPrice,
        t.exitPrice ?? '',
        t.capital,
        (t.actualPnL ?? 0).toFixed(2),
        (t.actualPnLPercent ?? 0).toFixed(2),
        t.targetPnL ?? '',
        t.emotion,
        t.confidence,
        t.rulesFollowed === null ? '' : t.rulesFollowed ? 'Yes' : 'No',
        t.tags.join(';'),
        t.verdict ?? '',
        `"${(t.notes || '').replace(/"/g, '""')}"`,
      ]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `trades-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (closedTrades.length === 0) {
    return (
      <div className="space-y-6">
        <h2 className="text-xl font-bold">Performance Analytics</h2>
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-12 text-center">
          <p className="text-[var(--muted-foreground)]">Complete some trades to see analytics</p>
        </div>
      </div>
    );
  }

  type AnalyticsSubTab = 'overview' | 'strategies' | 'coins' | 'timing' | 'edge' | 'risk';
  const SUB_TABS: { id: AnalyticsSubTab; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'strategies', label: 'Strategies' },
    { id: 'coins', label: 'Coins' },
    { id: 'timing', label: 'Timing' },
    { id: 'edge', label: 'Edge' },
    { id: 'risk', label: 'Risk' },
  ];

  return (
    <div className="space-y-4 sm:space-y-6">

      {/* ── Header + Export ── */}
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-bold">Performance Analytics</h2>
        <button
          onClick={handleExportCSV}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-[var(--border)] rounded-lg text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:border-[var(--accent)]/40 transition-colors"
        >
          <Download className="w-3.5 h-3.5" />
          Export CSV
        </button>
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-1.5 flex-wrap">
        {SUB_TABS.map(tab => (
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

      {/* ── Empty State ── */}
      {closedTrades.length === 0 && (
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-[var(--muted)] flex items-center justify-center mx-auto">
            <BarChart3 size={24} className="text-[var(--muted-foreground)]" />
          </div>
          <h3 className="text-base font-semibold text-[var(--foreground)]">Not enough data yet</h3>
          <p className="text-sm text-[var(--muted-foreground)] max-w-xs mx-auto">
            Complete at least one trade to unlock performance analytics and insights.
          </p>
          {onAddTrade && (
            <button
              onClick={onAddTrade}
              className="px-5 py-2 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white rounded-xl text-sm font-medium transition-colors"
            >
              Log a Trade
            </button>
          )}
        </div>
      )}

      {/* ── Overview Tab ── */}
      {subTab === 'overview' && closedTrades.length > 0 && (<>

      {/* ── Metrics Grid ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3">
        {[
          { label: 'Total Trades', value: metrics.totalTrades },
          { label: 'Win Rate', value: `${metrics.winRate}%`, color: metrics.winRate >= 50 ? 'text-[var(--green)]' : 'text-[var(--red)]' },
          { label: 'Avg Win', value: `+${metrics.avgWin}%`, color: 'text-[var(--green)]' },
          { label: 'Avg Loss', value: `-${metrics.avgLoss}%`, color: 'text-[var(--red)]' },
          { label: 'Profit Factor', value: metrics.profitFactor },
          { label: 'Max Drawdown', value: formatCurrency(-metrics.maxDrawdown), color: 'text-[var(--red)]' },
          { label: 'Largest Win', value: formatCurrency(metrics.largestWin), color: 'text-[var(--green)]' },
          { label: 'Largest Loss', value: formatCurrency(metrics.largestLoss), color: 'text-[var(--red)]' },
        ].map(m => (
          <div key={m.label} className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-3 sm:p-4">
            <div className="text-[10px] sm:text-xs text-[var(--muted-foreground)] mb-1">{m.label}</div>
            <div className={`text-base sm:text-lg font-bold ${m.color || ''}`}>{m.value}</div>
          </div>
        ))}
      </div>

      {/* Rule Adherence Insight */}
      {metrics.ruleInsight && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 sm:p-4 text-sm text-[var(--red)]">
          {metrics.ruleInsight}
        </div>
      )}

      {/* Direction Performance Split */}
      {directionStats.short.total > 0 && (
        <div className="grid grid-cols-2 gap-2 sm:gap-3">
          {[
            { label: 'Longs', ...directionStats.long },
            { label: 'Shorts', ...directionStats.short },
          ].map(({ label, winRate, total }) => (
            <div key={label} className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-3 sm:p-4">
              <div className="text-[10px] sm:text-xs text-[var(--muted-foreground)] mb-1">{label}</div>
              <div className={`text-base sm:text-lg font-bold ${winRate >= 50 ? 'text-[var(--green)]' : 'text-[var(--red)]'}`}>
                {total > 0 ? `${winRate}%` : '—'}
              </div>
              <div className="text-[10px] text-[var(--muted-foreground)]">{total} trade{total !== 1 ? 's' : ''}</div>
            </div>
          ))}
        </div>
      )}

      {/* ── Cumulative P&L + Win/Loss ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4">
        <div className="lg:col-span-2 bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 sm:p-5">
          <h3 className="font-semibold mb-3 sm:mb-4">Cumulative P&L</h3>
          <div className="h-[200px] sm:h-[250px]">
            <ResponsiveContainer>
              <LineChart data={pnlOverTime}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} width={50} />
                <Tooltip contentStyle={tooltipStyle} />
                <Line type="monotone" dataKey="pnl" stroke="#6366f1" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 sm:p-5">
          <h3 className="font-semibold mb-3 sm:mb-4">Win / Loss</h3>
          <div className="h-[200px] sm:h-[250px]">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={winLossData} cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={4} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                  <Cell fill="#22c55e" />
                  <Cell fill="#ef4444" />
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ── Best / Worst Trades ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 sm:p-5">
          <h3 className="font-semibold mb-3 text-[var(--green)]">Best Trades</h3>
          <div className="space-y-2">
            {[...closedTrades].sort((a, b) => (b.actualPnL ?? 0) - (a.actualPnL ?? 0)).slice(0, 5).map(t => (
              <div key={t.id} className="flex justify-between text-xs sm:text-sm gap-2">
                <span className="truncate">
                  {t.coin} <span className="text-[var(--muted-foreground)]">({format(new Date(t.exitDate!), 'MMM dd')})</span>
                </span>
                <span className="text-[var(--green)] font-medium whitespace-nowrap">{formatCurrency(t.actualPnL ?? 0)}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 sm:p-5">
          <h3 className="font-semibold mb-3 text-[var(--red)]">Worst Trades</h3>
          <div className="space-y-2">
            {[...closedTrades].sort((a, b) => (a.actualPnL ?? 0) - (b.actualPnL ?? 0)).slice(0, 5).map(t => (
              <div key={t.id} className="flex justify-between text-xs sm:text-sm gap-2">
                <span className="truncate">
                  {t.coin} <span className="text-[var(--muted-foreground)]">({format(new Date(t.exitDate!), 'MMM dd')})</span>
                </span>
                <span className="text-[var(--red)] font-medium whitespace-nowrap">{formatCurrency(t.actualPnL ?? 0)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      </>)}

      {/* ── Strategies Tab ── */}
      {subTab === 'strategies' && closedTrades.length > 0 && (<>

      {/* ── Strategy Attribution Table (#6) ── */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 sm:p-5">
        <h3 className="font-semibold mb-3 sm:mb-4">Strategy Attribution</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[380px]">
            <thead>
              <tr className="text-left text-[10px] text-[var(--muted-foreground)] uppercase tracking-wide border-b border-[var(--border)]">
                <th className="pb-2 font-medium">Strategy</th>
                <th className="pb-2 font-medium text-right">Trades</th>
                <th className="pb-2 font-medium text-right">Win Rate</th>
                <th className="pb-2 font-medium text-right">Avg Return</th>
                <th className="pb-2 font-medium text-right">Total P&L</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {byStrategy.map(s => (
                <tr key={s.name}>
                  <td className="py-2.5 font-medium">{s.name}</td>
                  <td className="py-2.5 text-right text-[var(--muted-foreground)]">{s.trades}</td>
                  <td className="py-2.5 text-right">
                    <span className={s.winRate >= 50 ? 'text-[var(--green)]' : 'text-[var(--red)]'}>
                      {s.trades > 0 ? `${s.winRate}%` : '—'}
                    </span>
                  </td>
                  <td className={`py-2.5 text-right font-medium ${s.avgReturn >= 0 ? 'text-[var(--green)]' : 'text-[var(--red)]'}`}>
                    {s.trades > 0 ? `${s.avgReturn >= 0 ? '+' : ''}${s.avgReturn}%` : '—'}
                  </td>
                  <td className={`py-2.5 text-right font-semibold ${s.pnl >= 0 ? 'text-[var(--green)]' : 'text-[var(--red)]'}`}>
                    {formatCurrency(s.pnl)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      </>)}

      {/* ── Coins Tab ── */}
      {subTab === 'coins' && closedTrades.length > 0 && (<>

      {/* ── P&L by Coin ── */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 sm:p-5">
        <h3 className="font-semibold mb-3 sm:mb-4">P&L by Coin</h3>
        <div className="h-[200px] sm:h-[250px]">
          <ResponsiveContainer>
            <BarChart data={byCoin.slice(0, 10)} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" tick={{ fontSize: 10 }} />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={65} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="pnl" radius={[0, 4, 4, 0]}>
                {byCoin.map((entry, i) => (
                  <Cell key={i} fill={entry.pnl >= 0 ? '#22c55e' : '#ef4444'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Coin Intelligence (Q-15) ── */}
      {coinProfiles.length > 0 && (
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 sm:p-5">
          <h3 className="font-semibold mb-3 sm:mb-4">Coin Intelligence</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {coinProfiles.map(cp => {
              const isSelected = selectedCoin === cp.coin;
              return (
                <button
                  key={cp.coin}
                  onClick={() => setSelectedCoin(isSelected ? null : cp.coin)}
                  className={`text-left p-2.5 rounded-lg border transition-all ${
                    isSelected
                      ? 'border-[var(--accent)] bg-[var(--accent)]/5'
                      : 'border-[var(--border)] hover:border-[var(--accent)]/40'
                  }`}
                >
                  <div className="font-medium text-sm">{cp.coin}</div>
                  <div className={`text-lg font-bold ${cp.winRate >= 50 ? 'text-[var(--gain)]' : 'text-[var(--loss)]'}`}>
                    {cp.winRate}%
                  </div>
                  <div className="text-[10px] text-[var(--muted-foreground)]">{cp.totalTrades} trades</div>
                </button>
              );
            })}
          </div>
          {selectedCoin && (() => {
            const cp = coinProfiles.find(p => p.coin === selectedCoin);
            if (!cp) return null;
            return (
              <div className="mt-3 border-t border-[var(--border)] pt-3 animate-in space-y-2.5">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <span className="text-[var(--muted-foreground)] block text-[10px]">Win Rate</span>
                    <span className={`font-bold ${cp.winRate >= 50 ? 'text-[var(--gain)]' : 'text-[var(--loss)]'}`}>{cp.winRate}%</span>
                  </div>
                  <div>
                    <span className="text-[var(--muted-foreground)] block text-[10px]">Avg Return</span>
                    <span className={`font-bold ${cp.avgPnLPercent >= 0 ? 'text-[var(--gain)]' : 'text-[var(--loss)]'}`}>
                      {cp.avgPnLPercent >= 0 ? '+' : ''}{cp.avgPnLPercent}%
                    </span>
                  </div>
                  <div>
                    <span className="text-[var(--muted-foreground)] block text-[10px]">Rule Compliance</span>
                    <span className={`font-bold ${cp.complianceRate >= 70 ? 'text-[var(--gain)]' : cp.complianceRate >= 50 ? 'text-[var(--yellow)]' : 'text-[var(--loss)]'}`}>
                      {cp.complianceRate}%
                    </span>
                  </div>
                  <div>
                    <span className="text-[var(--muted-foreground)] block text-[10px]">Avg Position</span>
                    <span className="font-bold text-[var(--foreground)]">{formatCurrency(cp.avgCapital)}</span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 text-[10px]">
                  {cp.mostCommonEmotion && (
                    <span className="px-2 py-0.5 rounded-full bg-[var(--muted)] text-[var(--muted-foreground)]">
                      Most common: {cp.mostCommonEmotion}
                    </span>
                  )}
                  {cp.mostBrokenRule && (
                    <span className="px-2 py-0.5 rounded-full bg-[var(--loss)]/10 text-[var(--loss)]">
                      Weak rule: {cp.mostBrokenRule}
                    </span>
                  )}
                </div>
                {cp.trajectory && (
                  <div className="text-xs text-[var(--muted-foreground)]">
                    <span className="font-medium text-[var(--foreground)]">Trajectory: </span>
                    <span className={cp.trajectory.early < cp.trajectory.recent ? 'text-[var(--gain)]' : cp.trajectory.early > cp.trajectory.recent ? 'text-[var(--loss)]' : ''}>
                      {cp.trajectory.early}% → {cp.trajectory.mid}% → {cp.trajectory.recent}%
                      {cp.trajectory.recent - cp.trajectory.early > 10 && ' ↑'}
                      {cp.trajectory.early - cp.trajectory.recent > 10 && ' ↓'}
                    </span>
                  </div>
                )}
                <p className="text-[10px] text-[var(--muted-foreground)]/60">Based on {cp.sampleSize} trades</p>
              </div>
            );
          })()}
        </div>
      )}

      </>)}

      {/* ── Timing Tab ── */}
      {subTab === 'timing' && closedTrades.length > 0 && (<>

      {/* ── Time of Day + Day of Week (#6) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 sm:p-5">
          <h3 className="font-semibold mb-0.5">Win Rate by Time of Day</h3>
          <p className="text-[10px] text-[var(--muted-foreground)] mb-3">Based on exit time (local)</p>
          <div className="h-[180px]">
            <ResponsiveContainer>
              <BarChart data={timeOfDay} barSize={44}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 10 }} domain={[0, 100]} width={32} tickFormatter={v => `${v}%`} />
                <Tooltip content={<WinRateTooltip />} />
                <Bar dataKey="winRate" radius={[4, 4, 0, 0]}>
                  {timeOfDay.map((d, i) => (
                    <Cell key={i} fill={d.trades === 0 ? '#374151' : d.winRate >= 50 ? '#22c55e' : '#ef4444'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 sm:p-5">
          <h3 className="font-semibold mb-0.5">Win Rate by Day of Week</h3>
          <p className="text-[10px] text-[var(--muted-foreground)] mb-3">Based on exit date</p>
          <div className="h-[180px]">
            <ResponsiveContainer>
              <BarChart data={byDayOfWeek} barSize={30}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 10 }} domain={[0, 100]} width={32} tickFormatter={v => `${v}%`} />
                <Tooltip content={<WinRateTooltip />} />
                <Bar dataKey="winRate" radius={[4, 4, 0, 0]}>
                  {byDayOfWeek.map((d, i) => (
                    <Cell key={i} fill={d.trades === 0 ? '#374151' : d.winRate >= 50 ? '#22c55e' : '#ef4444'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      </>)}

      {/* ── Strategies Tab ── */}
      {subTab === 'strategies' && closedTrades.length > 0 && (<>

      {/* ── Target vs Actual Return (#48) ── */}
      {rrAnalysis.rrCount > 0 && (
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 sm:p-5">
          <h3 className="font-semibold mb-0.5">Target vs Actual Return</h3>
          <p className="text-[10px] text-[var(--muted-foreground)] mb-4">
            How often you reach your planned target — {rrAnalysis.rrCount} trades with a set target
          </p>

          {/* Summary stats */}
          <div className="grid grid-cols-3 gap-3 mb-5">
            {[
              {
                label: 'Avg Target',
                value: rrAnalysis.avgTarget !== null ? `+${rrAnalysis.avgTarget.toFixed(1)}%` : '—',
              },
              {
                label: 'Avg Win Return',
                value: rrAnalysis.avgActualWin !== null ? `+${rrAnalysis.avgActualWin.toFixed(1)}%` : '—',
                color: 'text-[var(--green)]',
              },
              {
                label: 'Target Hit Rate',
                value: rrAnalysis.achieveRate !== null ? `${rrAnalysis.achieveRate}%` : '—',
                color: rrAnalysis.achieveRate !== null && rrAnalysis.achieveRate >= 50
                  ? 'text-[var(--green)]' : 'text-[var(--red)]',
              },
            ].map(s => (
              <div key={s.label} className="text-center bg-[var(--background)]/40 rounded-lg py-3">
                <div className="text-[10px] text-[var(--muted-foreground)] mb-1">{s.label}</div>
                <div className={`text-lg font-bold ${s.color ?? ''}`}>{s.value}</div>
              </div>
            ))}
          </div>

          {/* Target vs Actual by strategy */}
          {rrAnalysis.rrByStrategy.length > 0 && (
            <div className="h-[180px]">
              <ResponsiveContainer>
                <BarChart data={rrAnalysis.rrByStrategy} barGap={4} barCategoryGap="30%">
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} width={32} tickFormatter={v => `${v}%`} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v: number | undefined) => `${v ?? 0}%`} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="target" name="Target %" fill="#6366f1" opacity={0.55} radius={[4, 4, 0, 0]} barSize={22} />
                  <Bar dataKey="actual" name="Actual %" radius={[4, 4, 0, 0]} barSize={22}>
                    {rrAnalysis.rrByStrategy.map((d, i) => (
                      <Cell key={i} fill={d.actual >= 0 ? '#22c55e' : '#ef4444'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      </>)}

      {/* ── Edge Tab ── */}
      {subTab === 'edge' && closedTrades.length > 0 && (<>

      {/* ── Edge Profile + Confidence Calibration (C-33, C-29) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">

        {/* Edge Profile (C-33) */}
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 sm:p-5">
          <h3 className="font-semibold mb-3 text-sm text-[var(--foreground)]">Your Trading Edge</h3>
          {!edgeProfile.bestEmotion && !edgeProfile.bestCoin ? (
            <div className="text-[var(--muted-foreground)] text-sm py-4 text-center">
              Log 3+ trades per emotion/coin to see your edge
            </div>
          ) : (
            <div className="space-y-3">
              {edgeProfile.bestEmotion && (
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-[var(--muted-foreground)] uppercase tracking-wide block">Best emotion</span>
                    <span className="text-sm font-semibold text-[var(--foreground)]">{edgeProfile.bestEmotion}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-bold text-[var(--gain)]">{edgeProfile.bestEmotionWR}%</span>
                    <span className="text-[10px] text-[var(--muted-foreground)] ml-1">win rate</span>
                    <div className="text-[10px] text-[var(--muted-foreground)]">{edgeProfile.bestEmotionCount} trades</div>
                  </div>
                </div>
              )}
              {edgeProfile.bestCoin && (
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-[var(--muted-foreground)] uppercase tracking-wide block">Best coin</span>
                    <span className="text-sm font-semibold text-[var(--foreground)]">{edgeProfile.bestCoin}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-bold text-[var(--gain)]">{edgeProfile.bestCoinWR}%</span>
                    <span className="text-[10px] text-[var(--muted-foreground)] ml-1">win rate</span>
                    <div className="text-[10px] text-[var(--muted-foreground)]">{edgeProfile.bestCoinCount} trades</div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Confidence Calibration (C-29 + C-21) */}
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 sm:p-5">
          <h3 className="font-semibold mb-3 text-sm text-[var(--foreground)]">Confidence Calibration</h3>
          {closedTrades.length < 5 ? (
            <div className="text-[var(--muted-foreground)] text-sm py-4 text-center">
              Log 5+ trades to see calibration
            </div>
          ) : (
            <div className="space-y-3">
              {/* Setup confidence row */}
              <div>
                <p className="text-xs text-[var(--muted-foreground)] mb-1.5 font-medium uppercase tracking-wide">Setup</p>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-[var(--muted-foreground)]">Wins</span>
                  <span className="text-sm font-semibold text-[var(--gain)]">
                    {confidenceCalibration.setupWinAvg > 0 ? confidenceCalibration.setupWinAvg.toFixed(1) : '—'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[var(--muted-foreground)]">Losses</span>
                  <span className="text-sm font-semibold text-[var(--loss)]">
                    {confidenceCalibration.setupLossAvg > 0 ? confidenceCalibration.setupLossAvg.toFixed(1) : '—'}
                  </span>
                </div>
              </div>
              {/* Execution confidence row */}
              <div className="pt-2 border-t border-[var(--border)]">
                <p className="text-xs text-[var(--muted-foreground)] mb-1.5 font-medium uppercase tracking-wide">Execution</p>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-[var(--muted-foreground)]">Wins</span>
                  <span className="text-sm font-semibold text-[var(--gain)]">
                    {confidenceCalibration.execWinAvg > 0 ? confidenceCalibration.execWinAvg.toFixed(1) : '—'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[var(--muted-foreground)]">Losses</span>
                  <span className="text-sm font-semibold text-[var(--loss)]">
                    {confidenceCalibration.execLossAvg > 0 ? confidenceCalibration.execLossAvg.toFixed(1) : '—'}
                  </span>
                </div>
              </div>
              {/* Overall label */}
              <div className={`flex items-center gap-2 p-2.5 rounded-lg text-sm font-medium ${
                confidenceCalibration.label === 'calibrated'
                  ? 'bg-[var(--gain)]/10 text-[var(--gain)]'
                  : 'bg-amber-500/10 text-amber-400'
              }`}>
                <span>{
                  confidenceCalibration.label === 'calibrated' ? '✓ Well calibrated' :
                  confidenceCalibration.label === 'overconfident' ? '⚠ Overconfident on losing trades' :
                  '⚠ Underestimating your winners'
                }</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Duration Discipline (A-13) ── */}
      {durationStats.byStrategy.length > 0 && (
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 sm:p-5">
          <h3 className="font-semibold mb-0.5">Duration Discipline</h3>
          <p className="text-[10px] text-[var(--muted-foreground)] mb-4">
            How long you typically hold each strategy — outliers reveal emotional timing decisions
          </p>

          {/* Avg duration per strategy */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 mb-5">
            {durationStats.byStrategy.map(s => (
              <div key={s.strategy} className="bg-[var(--muted)]/40 rounded-lg p-2.5">
                <p className="text-[10px] text-[var(--muted-foreground)] truncate mb-0.5">{s.strategy}</p>
                <p className="text-sm font-bold">{formatDuration(s.avgMinutes)}</p>
                <p className="text-[10px] text-[var(--muted-foreground)]">avg · {s.count} trades</p>
              </div>
            ))}
          </div>

          {/* Outliers */}
          {durationStats.outliers.length > 0 ? (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--muted-foreground)] mb-2">
                Notable Outliers
              </p>
              <div className="space-y-2">
                {durationStats.outliers.slice(0, 6).map(o => (
                  <div
                    key={o.trade.id}
                    className={`flex items-start gap-2 p-2.5 rounded-lg text-xs ${
                      o.type === 'cut-short'
                        ? 'bg-blue-500/10 border border-blue-500/20'
                        : 'bg-amber-500/10 border border-amber-500/20'
                    }`}
                  >
                    <span className="shrink-0 mt-0.5">{o.type === 'cut-short' ? '⚡' : '⏳'}</span>
                    <div className="flex-1 min-w-0">
                      <p className={o.type === 'cut-short' ? 'text-blue-400' : 'text-amber-400'}>
                        <span className="font-medium">{o.trade.coin}</span>
                        {o.trade.exitDate && (
                          <span className="text-[var(--muted-foreground)] ml-1">
                            ({format(new Date(o.trade.exitDate), 'MMM d')})
                          </span>
                        )}
                        {' '}— {o.type === 'cut-short' ? 'closed in' : 'held for'}{' '}
                        <span className="font-medium">{formatDuration(o.durationMinutes)}</span>
                      </p>
                      <p className="text-[var(--muted-foreground)] mt-0.5">
                        {(Math.round(o.ratio * 10) / 10)}×{' '}
                        {o.type === 'cut-short' ? 'shorter' : 'longer'} than your {o.strategy} avg ({formatDuration(o.avgMinutes)})
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-xs text-[var(--muted-foreground)]">
              No significant duration outliers — your exit timing is consistent.
            </p>
          )}
        </div>
      )}

      </>)}

      {/* ── Risk Tab ── */}
      {subTab === 'risk' && closedTrades.length > 0 && (<>

      {/* ── Drawdown ── */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 sm:p-5">
        <h3 className="font-semibold mb-4">Drawdown Analysis</h3>

        {/* Stat row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          <div className="bg-[var(--muted)]/40 rounded-lg p-3">
            <p className="text-[10px] uppercase tracking-wide text-[var(--muted-foreground)] mb-1">Max Drawdown</p>
            <p className={`text-lg font-bold ${drawdown.maxDrawdown > 0 ? 'text-[var(--loss)]' : 'text-[var(--muted-foreground)]'}`}>
              {drawdown.maxDrawdown > 0 ? `-${drawdown.maxDrawdown.toFixed(1)}%` : '—'}
            </p>
          </div>
          <div className="bg-[var(--muted)]/40 rounded-lg p-3">
            <p className="text-[10px] uppercase tracking-wide text-[var(--muted-foreground)] mb-1">Current Drawdown</p>
            <p className={`text-lg font-bold ${drawdown.currentDrawdown > 0 ? 'text-[var(--loss)]' : 'text-[var(--gain)]'}`}>
              {drawdown.currentDrawdown > 0 ? `-${drawdown.currentDrawdown.toFixed(1)}%` : '0%'}
            </p>
          </div>
          <div className="bg-[var(--muted)]/40 rounded-lg p-3">
            <p className="text-[10px] uppercase tracking-wide text-[var(--muted-foreground)] mb-1">Peak Balance</p>
            <p className="text-lg font-bold text-[var(--foreground)]">
              {drawdown.peakBalance > 0 ? formatCurrency(drawdown.peakBalance) : '—'}
            </p>
          </div>
          <div className="bg-[var(--muted)]/40 rounded-lg p-3">
            <p className="text-[10px] uppercase tracking-wide text-[var(--muted-foreground)] mb-1">Current Balance</p>
            <p className={`text-lg font-bold ${drawdown.currentBalance >= drawdown.peakBalance ? 'text-[var(--gain)]' : 'text-[var(--foreground)]'}`}>
              {formatCurrency(drawdown.currentBalance)}
            </p>
          </div>
        </div>

        {/* Drawdown curve chart */}
        {drawdown.drawdownCurveData.length > 1 ? (
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={drawdown.drawdownCurveData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="ddGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#fb923c" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#fb923c" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} tickLine={false} axisLine={false} />
                <YAxis
                  tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={v => `-${v}%`}
                  domain={[0, 'auto']}
                  reversed
                />
                <Tooltip
                  contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '6px', fontSize: '11px' }}
                  formatter={(val: unknown) => [`-${Number(val).toFixed(2)}%`, 'Drawdown']}
                />
                <Area type="monotone" dataKey="drawdown" stroke="#fb923c" strokeWidth={1.5} fill="url(#ddGrad)" dot={false} isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="text-xs text-[var(--muted-foreground)] text-center py-6">
            {closedTrades.length === 0 ? 'No closed trades yet.' : 'Need at least 2 closed trades to show the drawdown curve.'}
          </p>
        )}
      </div>

      </>)}

    </div>
  );
}
