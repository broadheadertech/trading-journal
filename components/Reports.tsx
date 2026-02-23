'use client';

import { useMemo, useState } from 'react';
import { Trade, Strategy } from '@/lib/types';
import { formatPercent, getWinRate } from '@/lib/utils';
import { useCurrency } from '@/hooks/useCurrency';
import { format, startOfMonth, endOfMonth, subMonths, startOfWeek, endOfWeek, startOfYear, endOfYear, isWithinInterval } from 'date-fns';
import { FileText, Calendar, ChevronDown } from 'lucide-react';

interface Props {
  trades: Trade[];
  strategies: Strategy[];
}

type Period = 'week' | 'month' | 'year' | 'all';

export default function Reports({ trades, strategies }: Props) {
  const { formatCurrency } = useCurrency();
  const [period, setPeriod] = useState<Period>('month');
  const [compareMode, setCompareMode] = useState(false);

  const closedTrades = trades.filter(t => !t.isOpen && t.actualPnL !== null);

  const getPeriodTrades = (pd: Period, offset = 0): Trade[] => {
    const now = new Date();
    let start: Date;
    let end: Date;

    switch (pd) {
      case 'week':
        start = startOfWeek(subMonths(now, 0));
        end = endOfWeek(start);
        if (offset > 0) {
          start = new Date(start.getTime() - offset * 7 * 86400000);
          end = new Date(end.getTime() - offset * 7 * 86400000);
        }
        break;
      case 'month':
        start = startOfMonth(subMonths(now, offset));
        end = endOfMonth(start);
        break;
      case 'year':
        start = startOfYear(now);
        start.setFullYear(start.getFullYear() - offset);
        end = endOfYear(start);
        break;
      default:
        return closedTrades;
    }

    return closedTrades.filter(t => {
      const exitDate = new Date(t.exitDate!);
      return isWithinInterval(exitDate, { start, end });
    });
  };

  const generateReport = (periodTrades: Trade[]) => {
    if (periodTrades.length === 0) return null;

    const wins = periodTrades.filter(t => (t.actualPnLPercent ?? 0) > 0);
    const losses = periodTrades.filter(t => (t.actualPnLPercent ?? 0) <= 0);
    const totalPnl = periodTrades.reduce((s, t) => s + (t.actualPnL ?? 0), 0);
    const winRate = periodTrades.length > 0 ? Math.round((wins.length / periodTrades.length) * 100) : 0;
    const avgWin = wins.length > 0 ? wins.reduce((s, t) => s + (t.actualPnLPercent ?? 0), 0) / wins.length : 0;
    const avgLoss = losses.length > 0 ? losses.reduce((s, t) => s + Math.abs(t.actualPnLPercent ?? 0), 0) / losses.length : 0;

    // Rule adherence
    const withRuleData = periodTrades.filter(t => t.rulesFollowed !== null);
    const ruleFollowed = withRuleData.filter(t => t.rulesFollowed === true).length;
    const ruleAdherence = withRuleData.length > 0 ? Math.round((ruleFollowed / withRuleData.length) * 100) : null;

    // Top strategies
    const stratMap = new Map<string, { pnl: number; count: number }>();
    periodTrades.forEach(t => {
      const key = t.strategy || 'No Strategy';
      const cur = stratMap.get(key) || { pnl: 0, count: 0 };
      cur.pnl += t.actualPnL ?? 0;
      cur.count++;
      stratMap.set(key, cur);
    });
    const topStrategies = Array.from(stratMap.entries())
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.pnl - a.pnl);

    // Areas for improvement
    const improvements: string[] = [];
    if (winRate < 50) improvements.push('Win rate below 50% — focus on trade selection quality');
    if (ruleAdherence !== null && ruleAdherence < 80) improvements.push(`Rule adherence at ${ruleAdherence}% — discipline needs improvement`);
    const emotionLosses = losses.filter(t => ['FOMO', 'Revenge Trading', 'Greedy'].includes(t.emotion));
    if (emotionLosses.length > losses.length * 0.5) improvements.push('Over 50% of losses driven by negative emotions');
    if (avgLoss > avgWin * 1.5) improvements.push('Average loss significantly exceeds average win — tighten stop losses');

    return {
      totalTrades: periodTrades.length,
      wins: wins.length,
      losses: losses.length,
      totalPnl,
      winRate,
      avgWin: Math.round(avgWin * 100) / 100,
      avgLoss: Math.round(avgLoss * 100) / 100,
      ruleAdherence,
      topStrategies,
      improvements,
    };
  };

  const currentReport = generateReport(getPeriodTrades(period, 0));
  const previousReport = compareMode ? generateReport(getPeriodTrades(period, 1)) : null;

  // Monthly breakdown
  const monthlyBreakdown = useMemo(() => {
    const months: { month: string; pnl: number; trades: number; winRate: number }[] = [];
    for (let i = 0; i < 12; i++) {
      const monthTrades = getPeriodTrades('month', i);
      if (monthTrades.length === 0) continue;
      const pnl = monthTrades.reduce((s, t) => s + (t.actualPnL ?? 0), 0);
      const wins = monthTrades.filter(t => (t.actualPnLPercent ?? 0) > 0).length;
      months.push({
        month: format(subMonths(new Date(), i), 'MMM yyyy'),
        pnl: Math.round(pnl * 100) / 100,
        trades: monthTrades.length,
        winRate: Math.round((wins / monthTrades.length) * 100),
      });
    }
    return months;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trades]);

  const ReportCard = ({ title, report }: { title: string; report: ReturnType<typeof generateReport> }) => {
    if (!report) return (
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-8 text-center">
        <p className="text-[var(--muted-foreground)]">No trades in this period</p>
      </div>
    );

    return (
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 sm:p-6 space-y-4 sm:space-y-5">
        <h3 className="font-semibold text-base sm:text-lg">{title}</h3>

        {/* Key Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3">
          <div className="p-3 bg-[var(--muted)]/50 rounded-lg">
            <div className="text-xs text-[var(--muted-foreground)]">Total P&L</div>
            <div className={`text-lg font-bold ${report.totalPnl >= 0 ? 'text-[var(--green)]' : 'text-[var(--red)]'}`}>{formatCurrency(report.totalPnl)}</div>
          </div>
          <div className="p-3 bg-[var(--muted)]/50 rounded-lg">
            <div className="text-xs text-[var(--muted-foreground)]">Win Rate</div>
            <div className={`text-lg font-bold ${report.winRate >= 50 ? 'text-[var(--green)]' : 'text-[var(--red)]'}`}>{report.winRate}%</div>
          </div>
          <div className="p-3 bg-[var(--muted)]/50 rounded-lg">
            <div className="text-xs text-[var(--muted-foreground)]">Trades</div>
            <div className="text-lg font-bold">{report.totalTrades} <span className="text-xs text-[var(--muted-foreground)]">({report.wins}W / {report.losses}L)</span></div>
          </div>
          {report.ruleAdherence !== null && (
            <div className="p-3 bg-[var(--muted)]/50 rounded-lg">
              <div className="text-xs text-[var(--muted-foreground)]">Rule Adherence</div>
              <div className={`text-lg font-bold ${report.ruleAdherence >= 80 ? 'text-[var(--green)]' : 'text-[var(--yellow)]'}`}>{report.ruleAdherence}%</div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 bg-[var(--muted)]/50 rounded-lg">
            <div className="text-xs text-[var(--muted-foreground)]">Avg Win</div>
            <div className="text-sm font-medium text-[var(--green)]">+{report.avgWin}%</div>
          </div>
          <div className="p-3 bg-[var(--muted)]/50 rounded-lg">
            <div className="text-xs text-[var(--muted-foreground)]">Avg Loss</div>
            <div className="text-sm font-medium text-[var(--red)]">-{report.avgLoss}%</div>
          </div>
        </div>

        {/* Top Strategies */}
        {report.topStrategies.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-2">Strategy Performance</h4>
            <div className="space-y-1">
              {report.topStrategies.map((s, i) => (
                <div key={i} className="flex justify-between text-sm">
                  <span>{s.name} <span className="text-[var(--muted-foreground)]">({s.count})</span></span>
                  <span className={s.pnl >= 0 ? 'text-[var(--green)]' : 'text-[var(--red)]'}>{formatCurrency(s.pnl)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Improvements */}
        {report.improvements.length > 0 && (
          <div className="border-t border-[var(--border)] pt-4">
            <h4 className="text-sm font-medium mb-2 text-[var(--yellow)]">Areas for Improvement</h4>
            <ul className="space-y-1">
              {report.improvements.map((item, i) => (
                <li key={i} className="text-sm text-[var(--muted-foreground)] flex items-start gap-2">
                  <span className="text-[var(--yellow)] mt-0.5">&#x2022;</span> {item}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-start sm:items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold">Reports</h2>
          <p className="text-sm text-[var(--muted-foreground)]">Performance summaries and insights</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-0.5 sm:gap-1 p-1 bg-[var(--muted)] rounded-lg">
            {(['week', 'month', 'year', 'all'] as Period[]).map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-2 sm:px-3 py-1.5 text-xs sm:text-sm rounded-md transition-colors capitalize ${period === p ? 'bg-[var(--card)] shadow-sm font-medium' : 'text-[var(--muted-foreground)]'}`}
              >
                {p === 'all' ? 'All' : p === 'week' ? 'Week' : p === 'month' ? 'Month' : 'Year'}
              </button>
            ))}
          </div>
          {period !== 'all' && (
            <button
              onClick={() => setCompareMode(!compareMode)}
              className={`px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm rounded-lg border transition-colors ${compareMode ? 'border-[var(--accent)] text-[var(--accent)]' : 'border-[var(--border)] text-[var(--muted-foreground)]'}`}
            >
              Compare
            </button>
          )}
        </div>
      </div>

      {/* Reports */}
      <div className={compareMode && period !== 'all' ? 'grid grid-cols-1 lg:grid-cols-2 gap-4' : ''}>
        <ReportCard title={period === 'all' ? 'All Time' : `Current ${period.charAt(0).toUpperCase() + period.slice(1)}`} report={currentReport} />
        {compareMode && period !== 'all' && (
          <ReportCard title={`Previous ${period.charAt(0).toUpperCase() + period.slice(1)}`} report={previousReport} />
        )}
      </div>

      {/* Monthly Breakdown */}
      {monthlyBreakdown.length > 0 && (
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 sm:p-6">
          <h3 className="font-semibold mb-3 sm:mb-4">Monthly Breakdown</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[var(--muted-foreground)] border-b border-[var(--border)] text-xs uppercase">
                  <th className="pb-2 font-medium">Month</th>
                  <th className="pb-2 font-medium text-right">Trades</th>
                  <th className="pb-2 font-medium text-right">Win Rate</th>
                  <th className="pb-2 font-medium text-right">P&L</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {monthlyBreakdown.map((m, i) => (
                  <tr key={i} className="hover:bg-[var(--card-hover)]">
                    <td className="py-2.5">{m.month}</td>
                    <td className="py-2.5 text-right">{m.trades}</td>
                    <td className={`py-2.5 text-right ${m.winRate >= 50 ? 'text-[var(--green)]' : 'text-[var(--red)]'}`}>{m.winRate}%</td>
                    <td className={`py-2.5 text-right font-medium ${m.pnl >= 0 ? 'text-[var(--green)]' : 'text-[var(--red)]'}`}>{formatCurrency(m.pnl)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {closedTrades.length === 0 && (
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-12 text-center">
          <div className="w-16 h-16 rounded-full bg-[var(--muted)] flex items-center justify-center mx-auto text-[var(--muted-foreground)] mb-4">
            <FileText size={24} />
          </div>
          <p className="text-[var(--muted-foreground)]">Complete some trades to generate reports</p>
        </div>
      )}
    </div>
  );
}
