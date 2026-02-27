'use client';

import { useMemo, useState } from 'react';
import {
  AreaChart, Area, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { Trade, Verdict } from '@/lib/types';
import { generateVerdict, getVerdictColor, getDisciplineScore, getDurationStats, getTradeDuration, formatDuration } from '@/lib/utils';
import { format, startOfWeek, parseISO } from 'date-fns';
import { Scale, ChevronLeft, ChevronRight } from 'lucide-react';

interface VerdictsProps {
  trades: Trade[];
}

const VERDICT_ORDER: Verdict[] = [
  'Well Executed',
  'Good Discipline, Bad Luck',
  'Poorly Executed',
];

const VERDICT_COLORS: Record<Verdict, string> = {
  'Well Executed': '#4ade80',
  'Good Discipline, Bad Luck': '#60a5fa',
  'Poorly Executed': '#f97316',
};

const VERDICT_ICONS: Record<Verdict, string> = {
  'Well Executed': '✓',
  'Good Discipline, Bad Luck': '~',
  'Poorly Executed': '✗',
};

// Short display labels — "Good Discipline, Bad Luck" is too long for tight spaces
const VERDICT_SHORT: Record<Verdict, string> = {
  'Well Executed': 'Well Executed',
  'Good Discipline, Bad Luck': 'Good Discipline',
  'Poorly Executed': 'Poorly Executed',
};

// selfVerdict stores Verdict values but the form labels them differently
const SELF_VERDICT_LABEL: Partial<Record<Verdict, string>> = {
  'Well Executed': 'Good Trade',
  'Good Discipline, Bad Luck': 'Mixed',
  'Poorly Executed': 'Poor Trade',
};

const PAGE_SIZE = 10;

export default function Verdicts({ trades }: VerdictsProps) {
  const [historyPage, setHistoryPage] = useState(1);

  const closedTrades = useMemo(
    () => trades.filter(t => !t.isOpen && t.actualPnL !== null),
    [trades],
  );

  // Enrich each trade with a computed verdict if the stored one is missing
  const assessed = useMemo(
    () => closedTrades.map(t => ({ ...t, verdict: t.verdict ?? generateVerdict(t) })),
    [closedTrades],
  );

  // ── Summary stats ────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const total = assessed.length;
    if (total === 0) return null;

    const we   = assessed.filter(t => t.verdict === 'Well Executed').length;
    const gdbl = assessed.filter(t => t.verdict === 'Good Discipline, Bad Luck').length;
    const pe   = assessed.filter(t => t.verdict === 'Poorly Executed').length;
    const good = we + gdbl;

    const withSelf  = assessed.filter(t => t.selfVerdict !== null);
    const selfMatch = withSelf.filter(t => t.selfVerdict === t.verdict).length;

    return {
      total,
      we,   wePct:   Math.round((we   / total) * 100),
      gdbl, gdblPct: Math.round((gdbl / total) * 100),
      pe,   pePct:   Math.round((pe   / total) * 100),
      good, goodPct: Math.round((good / total) * 100),
      selfCount:    withSelf.length,
      selfMatch,
      selfMatchPct: withSelf.length > 0 ? Math.round((selfMatch / withSelf.length) * 100) : null,
      disciplineScore: Math.round(getDisciplineScore(assessed) * 100),
    };
  }, [assessed]);

  // ── Weekly good-decision % trend ─────────────────────────────────────────────
  const weeklyTrend = useMemo(() => {
    const byWeek: Record<string, { good: number; total: number }> = {};
    [...assessed]
      .filter(t => t.exitDate)
      .sort((a, b) => new Date(a.exitDate!).getTime() - new Date(b.exitDate!).getTime())
      .forEach(t => {
        const w = format(startOfWeek(parseISO(t.exitDate!), { weekStartsOn: 1 }), 'MMM d');
        if (!byWeek[w]) byWeek[w] = { good: 0, total: 0 };
        byWeek[w].total++;
        if (t.verdict === 'Well Executed' || t.verdict === 'Good Discipline, Bad Luck') {
          byWeek[w].good++;
        }
      });
    return Object.entries(byWeek).map(([week, d]) => ({
      week,
      goodPct: d.total > 0 ? Math.round((d.good / d.total) * 100) : 0,
      total: d.total,
    }));
  }, [assessed]);

  // ── Verdict by coin ───────────────────────────────────────────────────────────
  const byCoin = useMemo(() => {
    const map: Record<string, { we: number; gdbl: number; pe: number; total: number }> = {};
    assessed.forEach(t => {
      const c = t.coin || 'Unknown';
      if (!map[c]) map[c] = { we: 0, gdbl: 0, pe: 0, total: 0 };
      map[c].total++;
      if      (t.verdict === 'Well Executed')            map[c].we++;
      else if (t.verdict === 'Good Discipline, Bad Luck') map[c].gdbl++;
      else if (t.verdict === 'Poorly Executed')          map[c].pe++;
    });
    return Object.entries(map)
      .map(([coin, d]) => ({ coin, ...d, goodPct: Math.round(((d.we + d.gdbl) / d.total) * 100) }))
      .filter(c => c.total >= 2)
      .sort((a, b) => b.total - a.total)
      .slice(0, 8);
  }, [assessed]);

  // ── Self-verdict calibration (trades where selfVerdict was set) ───────────────
  const calibration = useMemo(() => {
    const withSelf = assessed.filter(t => t.selfVerdict !== null);
    if (withSelf.length === 0) return null;

    // Overconfident: self said Good/Mixed, journal said Poorly Executed
    const overconfident = withSelf.filter(
      t => (t.selfVerdict === 'Well Executed' || t.selfVerdict === 'Good Discipline, Bad Luck') &&
           t.verdict === 'Poorly Executed',
    );
    // Underconfident: self said Poor, journal said good
    const underconfident = withSelf.filter(
      t => t.selfVerdict === 'Poorly Executed' &&
           (t.verdict === 'Well Executed' || t.verdict === 'Good Discipline, Bad Luck'),
    );

    return { count: withSelf.length, overconfident, underconfident };
  }, [assessed]);

  // ── Verdict history table ─────────────────────────────────────────────────────
  const sortedHistory = useMemo(
    () =>
      [...assessed].sort(
        (a, b) =>
          new Date(b.exitDate ?? b.createdAt).getTime() -
          new Date(a.exitDate ?? a.createdAt).getTime(),
      ),
    [assessed],
  );

  const totalHistoryPages = Math.max(1, Math.ceil(sortedHistory.length / PAGE_SIZE));
  const safePage = Math.min(historyPage, totalHistoryPages);
  const paginatedHistory = sortedHistory.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  // ── Duration outlier lookup (A-13) ───────────────────────────────────────────
  const durationOutlierMap = useMemo(() => {
    const { outliers } = getDurationStats(trades);
    const map = new Map<string, { type: 'cut-short' | 'held-long'; durationMinutes: number; avgMinutes: number }>();
    outliers.forEach(o => map.set(o.trade.id, { type: o.type, durationMinutes: o.durationMinutes, avgMinutes: o.avgMinutes }));
    return map;
  }, [trades]);

  // ── Empty state ───────────────────────────────────────────────────────────────
  if (closedTrades.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <Scale size={48} className="text-[var(--muted-foreground)] mb-4 opacity-40" />
        <h2 className="text-xl font-semibold mb-2">No Verdicts Yet</h2>
        <p className="text-[var(--muted-foreground)] text-sm max-w-xs">
          Close your first trade to see journal verdicts — an honest assessment of
          execution quality, independent of outcome.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">

      {/* Header */}
      <div>
        <h2 className="text-xl sm:text-2xl font-bold">Verdicts</h2>
        <p className="text-[var(--muted-foreground)] text-sm mt-1">
          Honest assessment of execution quality — independent of outcome.
        </p>
      </div>

      {stats && (
        <>
          {/* ── 4 stat cards ── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">

            <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--muted-foreground)] mb-1">Good Decisions</p>
              <p className="text-2xl sm:text-3xl font-bold text-green-400">{stats.goodPct}%</p>
              <p className="text-xs text-[var(--muted-foreground)] mt-1">{stats.good} of {stats.total} trades</p>
            </div>

            <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--muted-foreground)] mb-1">Poorly Executed</p>
              <p className="text-2xl sm:text-3xl font-bold text-orange-400">{stats.pe}</p>
              <p className="text-xs text-[var(--muted-foreground)] mt-1">
                {stats.pePct}% — rules broken
              </p>
            </div>

            <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--muted-foreground)] mb-1">Self-Calibration</p>
              {stats.selfMatchPct !== null ? (
                <>
                  <p className="text-2xl sm:text-3xl font-bold">{stats.selfMatchPct}%</p>
                  <p className="text-xs text-[var(--muted-foreground)] mt-1">
                    self-verdict matched journal ({stats.selfCount} rated)
                  </p>
                </>
              ) : (
                <>
                  <p className="text-2xl sm:text-3xl font-bold text-[var(--muted-foreground)]">—</p>
                  <p className="text-xs text-[var(--muted-foreground)] mt-1">rate trades to unlock</p>
                </>
              )}
            </div>

            <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--muted-foreground)] mb-1">Discipline Score</p>
              <p className="text-2xl sm:text-3xl font-bold text-[var(--accent)]">{stats.disciplineScore}%</p>
              <p className="text-xs text-[var(--muted-foreground)] mt-1">avg rule compliance</p>
            </div>

          </div>

          {/* ── Verdict distribution + calibration/lucky win ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

            {/* Verdict distribution bars */}
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4">
              <p className="text-sm font-semibold mb-4">Verdict Breakdown</p>
              <div className="space-y-3">
                {VERDICT_ORDER.map(v => {
                  const countAndPct: Record<Verdict, { count: number; pct: number }> = {
                    'Well Executed':               { count: stats.we,   pct: stats.wePct   },
                    'Good Discipline, Bad Luck':   { count: stats.gdbl, pct: stats.gdblPct },
                    'Poorly Executed':             { count: stats.pe,   pct: stats.pePct   },
                  };
                  const { count, pct } = countAndPct[v];
                  return (
                    <div key={v}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs">{VERDICT_SHORT[v]}</span>
                        <span className="text-xs font-semibold tabular-nums" style={{ color: VERDICT_COLORS[v] }}>
                          {count} · {pct}%
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-[var(--muted)] overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-300"
                          style={{ width: `${pct}%`, backgroundColor: VERDICT_COLORS[v] }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
              {/* Disciplined vs needs-review summary */}
              <div className="mt-4 pt-3 border-t border-[var(--border)] flex gap-6">
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-[var(--muted-foreground)]">Disciplined</p>
                  <p className="text-xl font-bold text-green-400">{stats.goodPct}%</p>
                  <p className="text-[10px] text-[var(--muted-foreground)]">WE + Good Discipline</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-[var(--muted-foreground)]">Needs Review</p>
                  <p className="text-xl font-bold text-orange-400">{100 - stats.goodPct}%</p>
                  <p className="text-[10px] text-[var(--muted-foreground)]">Poorly Executed</p>
                </div>
              </div>
            </div>

            {/* Calibration card (if enough self-verdicts) */}
            {calibration && calibration.count >= 3 ? (
              <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4">
                <p className="text-sm font-semibold mb-1">Self-Verdict Calibration</p>
                <p className="text-xs text-[var(--muted-foreground)] mb-4">
                  How well your self-assessments match the journal ({calibration.count} rated trades)
                </p>
                <div className="space-y-3">
                  <div className="flex items-center justify-between py-2.5 px-3 rounded-lg bg-[var(--muted)]">
                    <span className="text-xs">Matched journal verdict</span>
                    <span className="text-sm font-bold text-green-400">{stats.selfMatchPct}%</span>
                  </div>
                  {calibration.overconfident.length > 0 && (
                    <div className="flex items-center justify-between py-2.5 px-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                      <div>
                        <p className="text-xs font-medium text-yellow-400">Overconfident</p>
                        <p className="text-[10px] text-[var(--muted-foreground)]">
                          Rated Good — journal said Poorly Executed
                        </p>
                      </div>
                      <span className="text-sm font-bold text-yellow-400 ml-4">
                        {calibration.overconfident.length}
                      </span>
                    </div>
                  )}
                  {calibration.underconfident.length > 0 && (
                    <div className="flex items-center justify-between py-2.5 px-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                      <div>
                        <p className="text-xs font-medium text-blue-400">Underconfident</p>
                        <p className="text-[10px] text-[var(--muted-foreground)]">
                          Rated Poor — journal said Well Executed or Good Discipline
                        </p>
                      </div>
                      <span className="text-sm font-bold text-blue-400 ml-4">
                        {calibration.underconfident.length}
                      </span>
                    </div>
                  )}
                  {calibration.overconfident.length === 0 && calibration.underconfident.length === 0 && (
                    <div className="py-2.5 px-3 rounded-lg bg-green-500/10 border border-green-500/20">
                      <p className="text-xs font-medium text-green-400">Well calibrated</p>
                      <p className="text-[10px] text-[var(--muted-foreground)]">
                        Your self-assessments consistently match the journal
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4">
                <p className="text-sm font-semibold mb-1">Self-Verdict Calibration</p>
                <p className="text-xs text-[var(--muted-foreground)] mt-2">
                  Rate trades with Self-Verdict (in the trade form) to unlock calibration insights here.
                </p>
              </div>
            )}

          </div>

          {/* ── Weekly good-decision trend ── */}
          {weeklyTrend.length >= 2 && (
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4">
              <p className="text-sm font-semibold mb-1">Good Decision % by Week</p>
              <p className="text-xs text-[var(--muted-foreground)] mb-4">
                % of trades rated Well Executed or Good Discipline, Bad Luck
              </p>
              <ResponsiveContainer width="100%" height={160}>
                <AreaChart data={weeklyTrend} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="verdictGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#4ade80" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#4ade80" stopOpacity={0}   />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="week"
                    tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
                    axisLine={false} tickLine={false}
                  />
                  <YAxis
                    domain={[0, 100]}
                    tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
                    axisLine={false} tickLine={false}
                    tickFormatter={v => `${v}%`}
                  />
                  <Tooltip
                    contentStyle={{
                      background: 'var(--card)',
                      border: '1px solid var(--border)',
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                    formatter={(v: number | undefined) => [`${v ?? 0}%`, 'Good Decisions']}
                  />
                  <Area
                    type="monotone"
                    dataKey="goodPct"
                    stroke="#4ade80"
                    strokeWidth={2}
                    fill="url(#verdictGradient)"
                    dot={{ fill: '#4ade80', r: 3 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* ── Verdict by coin ── */}
          {byCoin.length >= 2 && (
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4">
              <p className="text-sm font-semibold mb-4">Verdict by Coin</p>
              <div className="space-y-3">
                {byCoin.map(c => (
                  <div key={c.coin}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium">{c.coin}</span>
                      <span className="text-xs text-[var(--muted-foreground)]">
                        {c.total} trade{c.total !== 1 ? 's' : ''} · {c.goodPct}% good decisions
                      </span>
                    </div>
                    <div className="h-3 rounded-full bg-[var(--muted)] overflow-hidden flex">
                      {c.we   > 0 && <div style={{ width: `${Math.round(c.we   / c.total * 100)}%`, backgroundColor: VERDICT_COLORS['Well Executed']            }} className="h-full" />}
                      {c.gdbl > 0 && <div style={{ width: `${Math.round(c.gdbl / c.total * 100)}%`, backgroundColor: VERDICT_COLORS['Good Discipline, Bad Luck'] }} className="h-full" />}
                      {c.pe   > 0 && <div style={{ width: `${Math.round(c.pe   / c.total * 100)}%`, backgroundColor: VERDICT_COLORS['Poorly Executed']           }} className="h-full" />}
                    </div>
                  </div>
                ))}
              </div>
              {/* Legend */}
              <div className="flex flex-wrap gap-3 mt-4 pt-3 border-t border-[var(--border)]">
                {VERDICT_ORDER.map(v => (
                  <div key={v} className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: VERDICT_COLORS[v] }} />
                    <span className="text-[10px] text-[var(--muted-foreground)]">{VERDICT_SHORT[v]}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

        </>
      )}

      {/* ── All trade verdicts table ── */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl overflow-hidden">
        <div className="p-4 border-b border-[var(--border)] flex items-center justify-between">
          <p className="text-sm font-semibold">All Trade Verdicts</p>
          <p className="text-xs text-[var(--muted-foreground)]">
            {assessed.length} total · page {safePage}/{totalHistoryPages}
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-[var(--muted-foreground)] border-b border-[var(--border)]">
                <th className="text-left py-3 px-3 font-medium">Date</th>
                <th className="text-left py-3 px-3 font-medium">Coin</th>
                <th className="text-left py-3 px-3 font-medium">Journal Verdict</th>
                <th className="text-left py-3 px-3 font-medium hidden sm:table-cell">Self-Verdict</th>
                <th className="text-right py-3 px-3 font-medium">P&amp;L</th>
              </tr>
            </thead>
            <tbody>
              {paginatedHistory.map(t => {
                const jVerdict = t.verdict as Verdict;
                const isProfit = (t.actualPnLPercent ?? 0) >= 0;
                const selfMatch =
                  t.selfVerdict !== null ? t.selfVerdict === jVerdict : null;

                return (
                  <tr
                    key={t.id}
                    className="border-b border-[var(--border)]/50 hover:bg-[var(--muted)]/30 transition-colors"
                  >
                    <td className="py-3 px-3 text-[var(--muted-foreground)] whitespace-nowrap">
                      {t.exitDate ? format(parseISO(t.exitDate), 'MMM d, yy') : '—'}
                    </td>
                    <td className="py-3 px-3">
                      <p className="font-medium">{t.coin}</p>
                      {(() => {
                        const dur = getTradeDuration(t);
                        const outlier = durationOutlierMap.get(t.id);
                        if (dur === null) return null;
                        return (
                          <p className={`text-[10px] mt-0.5 ${
                            outlier
                              ? outlier.type === 'cut-short' ? 'text-blue-400' : 'text-amber-400'
                              : 'text-[var(--muted-foreground)]'
                          }`}>
                            {formatDuration(dur)}
                            {outlier && (
                              <span className="ml-1" title={outlier.type === 'cut-short' ? 'Closed faster than usual' : 'Held longer than usual'}>
                                {outlier.type === 'cut-short' ? '⚡' : '⏳'}
                              </span>
                            )}
                          </p>
                        );
                      })()}
                    </td>
                    <td className="py-3 px-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border ${getVerdictColor(jVerdict)}`}>
                        {VERDICT_ICONS[jVerdict]} {VERDICT_SHORT[jVerdict]}
                      </span>
                    </td>
                    <td className="py-3 px-3 hidden sm:table-cell">
                      {t.selfVerdict ? (
                        <div className="flex items-center gap-1.5">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${getVerdictColor(t.selfVerdict)}`}>
                            {SELF_VERDICT_LABEL[t.selfVerdict] ?? t.selfVerdict}
                          </span>
                          {selfMatch !== null && (
                            <span className={`text-[10px] font-bold ${selfMatch ? 'text-green-400' : 'text-yellow-400'}`}>
                              {selfMatch ? '✓' : '≠'}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-[var(--muted-foreground)]">—</span>
                      )}
                    </td>
                    <td className={`py-3 px-3 text-right font-medium tabular-nums ${isProfit ? 'text-green-400' : 'text-red-400'}`}>
                      {t.actualPnLPercent !== null
                        ? `${isProfit ? '+' : ''}${t.actualPnLPercent.toFixed(2)}%`
                        : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalHistoryPages > 1 && (
          <div className="p-3 border-t border-[var(--border)] flex items-center justify-center gap-1.5">
            <button
              onClick={() => setHistoryPage(p => Math.max(1, p - 1))}
              disabled={safePage === 1}
              className="p-1.5 rounded hover:bg-[var(--muted)] disabled:opacity-30 transition-colors"
            >
              <ChevronLeft size={14} />
            </button>
            {Array.from({ length: Math.min(5, totalHistoryPages) }, (_, i) => {
              // Center the visible pages around the current page
              const half = 2;
              let start = Math.max(1, safePage - half);
              const end   = Math.min(totalHistoryPages, start + 4);
              start = Math.max(1, end - 4);
              const p = start + i;
              if (p > totalHistoryPages) return null;
              return (
                <button
                  key={p}
                  onClick={() => setHistoryPage(p)}
                  className={`w-7 h-7 rounded text-xs font-medium transition-colors ${
                    p === safePage
                      ? 'bg-[var(--accent)] text-white'
                      : 'hover:bg-[var(--muted)]'
                  }`}
                >
                  {p}
                </button>
              );
            })}
            <button
              onClick={() => setHistoryPage(p => Math.min(totalHistoryPages, p + 1))}
              disabled={safePage === totalHistoryPages}
              className="p-1.5 rounded hover:bg-[var(--muted)] disabled:opacity-30 transition-colors"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        )}
      </div>

    </div>
  );
}
