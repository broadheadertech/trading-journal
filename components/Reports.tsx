'use client';

import { useMemo, useState, useCallback } from 'react';
import { Trade, Strategy } from '@/lib/types';
import { useCurrency } from '@/hooks/useCurrency';
import {
  format, subDays, subMonths, startOfWeek, endOfWeek, isAfter, isBefore, isWithinInterval,
} from 'date-fns';
import {
  FileText, Download, BarChart3, Clock, Coins, Image,
  TrendingUp, RefreshCw, Search, ChevronDown, Sparkles, Copy, Check,
} from 'lucide-react';

interface Props {
  trades: Trade[];
  strategies: Strategy[];
}

/* ── Report type definitions ────────────────────────────── */

type ReportType = 'weekly' | 'monthly' | 'quarterly' | 'deep-dive' | 'custom';

interface ReportTypeConfig {
  id: ReportType;
  label: string;
  description: string;
  days: number;
}

const REPORT_TYPES: ReportTypeConfig[] = [
  { id: 'weekly', label: 'Weekly Pulse', description: 'Fast 7-day feedback loop', days: 7 },
  { id: 'monthly', label: 'Monthly Review', description: '30-day behavioral trends', days: 30 },
  { id: 'quarterly', label: 'Quarterly Board', description: '90-day regime overview', days: 90 },
  { id: 'deep-dive', label: 'Deep Dive', description: '45-day extended diagnostics', days: 45 },
  { id: 'custom', label: 'Custom Range', description: 'Uses your top-bar date range', days: 30 },
];

const BATCH_OPTIONS = [1, 4, 12, 24, 52];

/* ── Stored report type ─────────────────────────────────── */

interface StoredReport {
  id: string;
  type: ReportType;
  periodStart: string;
  periodEnd: string;
  grade: string;
  gradeScore: number;
  netPnL: number;
  tradeCount: number;
  createdAt: string;
}

/* ── Grade calculator ───────────────────────────────────── */

function computeGrade(trades: Trade[]): { grade: string; score: number } {
  if (trades.length === 0) return { grade: '--', score: 0 };
  const closed = trades.filter(t => !t.isOpen && t.actualPnL !== null);
  if (closed.length === 0) return { grade: '--', score: 0 };

  const winRate = closed.filter(t => t.actualPnL! > 0).length / closed.length;
  const ruleScore = closed.reduce((s, t) => {
    if (t.ruleChecklist.length === 0) return s + 0.5;
    const compliance = t.ruleChecklist.filter(r => r.compliance === 'yes').length / t.ruleChecklist.length;
    return s + compliance;
  }, 0) / closed.length;

  const score = Math.round((winRate * 40 + ruleScore * 60));
  if (score >= 90) return { grade: 'A', score };
  if (score >= 75) return { grade: 'B', score };
  if (score >= 60) return { grade: 'C', score };
  if (score >= 40) return { grade: 'D', score };
  return { grade: 'F', score };
}

/* ── CSV generators ─────────────────────────────────────── */

function generateTradeCSV(trades: Trade[]): string {
  const closed = trades.filter(t => !t.isOpen && t.actualPnL !== null);
  const headers = ['Coin', 'Entry Date', 'Exit Date', 'Entry Price', 'Exit Price', 'Capital', 'P&L', 'P&L %', 'Strategy', 'Emotion', 'Fees', 'Duration (h)'];
  const rows = closed.map(t => {
    const duration = t.exitDate ? Math.round((new Date(t.exitDate).getTime() - new Date(t.entryDate).getTime()) / 3600000) : '';
    return [t.coin, t.entryDate, t.exitDate ?? '', t.entryPrice, t.exitPrice ?? '', t.capital, t.actualPnL ?? '', t.actualPnLPercent ?? '', t.strategy, t.emotion, t.fees ?? 0, duration].join(',');
  });
  return [headers.join(','), ...rows].join('\n');
}

function generateDailyCSV(trades: Trade[]): string {
  const closed = trades.filter(t => !t.isOpen && t.actualPnL !== null);
  const dayMap = new Map<string, Trade[]>();
  closed.forEach(t => {
    const d = (t.exitDate ?? t.entryDate).slice(0, 10);
    if (!dayMap.has(d)) dayMap.set(d, []);
    dayMap.get(d)!.push(t);
  });

  const headers = ['Date', 'Net PnL', 'Fees', 'Trades', 'Wins', 'Losses'];
  const rows = [...dayMap.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([date, ts]) => {
    const net = ts.reduce((s, t) => s + (t.actualPnL ?? 0), 0);
    const fees = ts.reduce((s, t) => s + (t.fees ?? 0), 0);
    const wins = ts.filter(t => (t.actualPnL ?? 0) > 0).length;
    return [date, net.toFixed(2), fees.toFixed(2), ts.length, wins, ts.length - wins].join(',');
  });
  return [headers.join(','), ...rows].join('\n');
}

function generateHourlyCSV(trades: Trade[]): string {
  const closed = trades.filter(t => !t.isOpen && t.actualPnL !== null);
  const hourMap = new Map<number, Trade[]>();
  closed.forEach(t => {
    const h = new Date(t.entryDate).getUTCHours();
    if (!hourMap.has(h)) hourMap.set(h, []);
    hourMap.get(h)!.push(t);
  });

  const headers = ['UTC Hour', 'Net PnL', 'Trades', 'Win Rate %'];
  const rows = [...hourMap.entries()].sort(([a], [b]) => a - b).map(([hour, ts]) => {
    const net = ts.reduce((s, t) => s + (t.actualPnL ?? 0), 0);
    const wr = Math.round((ts.filter(t => (t.actualPnL ?? 0) > 0).length / ts.length) * 100);
    return [`${hour}:00`, net.toFixed(2), ts.length, wr].join(',');
  });
  return [headers.join(','), ...rows].join('\n');
}

function generateSymbolCSV(trades: Trade[]): string {
  const closed = trades.filter(t => !t.isOpen && t.actualPnL !== null);
  const symMap = new Map<string, Trade[]>();
  closed.forEach(t => {
    if (!symMap.has(t.coin)) symMap.set(t.coin, []);
    symMap.get(t.coin)!.push(t);
  });

  const headers = ['Symbol', 'Net PnL', 'Trades', 'Win Rate %', 'Fees'];
  const rows = [...symMap.entries()].sort(([, a], [, b]) => {
    const na = a.reduce((s, t) => s + (t.actualPnL ?? 0), 0);
    const nb = b.reduce((s, t) => s + (t.actualPnL ?? 0), 0);
    return nb - na;
  }).map(([sym, ts]) => {
    const net = ts.reduce((s, t) => s + (t.actualPnL ?? 0), 0);
    const fees = ts.reduce((s, t) => s + (t.fees ?? 0), 0);
    const wr = Math.round((ts.filter(t => (t.actualPnL ?? 0) > 0).length / ts.length) * 100);
    return [sym, net.toFixed(2), ts.length, wr, fees.toFixed(2)].join(',');
  });
  return [headers.join(','), ...rows].join('\n');
}

function downloadCSV(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/* ── Main Component ───────────────────────────────────────── */

export default function Reports({ trades, strategies }: Props) {
  const { formatCurrency } = useCurrency();
  const [selectedType, setSelectedType] = useState<ReportType>('weekly');
  const [batch, setBatch] = useState(1);
  const [reports, setReports] = useState<StoredReport[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<ReportType | 'all'>('all');

  const closedTrades = trades.filter(t => !t.isOpen && t.actualPnL !== null);

  const selectedConfig = REPORT_TYPES.find(r => r.id === selectedType)!;
  const periodEnd = new Date();
  const periodStart = subDays(periodEnd, selectedConfig.days);

  // Period-over-Period Audit
  const currentPeriodTrades = useMemo(() => {
    return closedTrades.filter(t => {
      const d = new Date(t.exitDate ?? t.entryDate);
      return isAfter(d, periodStart) && isBefore(d, periodEnd);
    });
  }, [closedTrades, selectedType]);

  const previousPeriodStart = subDays(periodStart, selectedConfig.days);
  const previousPeriodTrades = useMemo(() => {
    return closedTrades.filter(t => {
      const d = new Date(t.exitDate ?? t.entryDate);
      return isAfter(d, previousPeriodStart) && isBefore(d, periodStart);
    });
  }, [closedTrades, selectedType]);

  const auditMetrics = useMemo(() => {
    const compute = (ts: Trade[]) => ({
      netPnL: ts.reduce((s, t) => s + (t.actualPnL ?? 0), 0),
      fees: ts.reduce((s, t) => s + (t.fees ?? 0), 0),
      trades: ts.length,
      wins: ts.filter(t => (t.actualPnL ?? 0) > 0).length,
      losses: ts.filter(t => (t.actualPnL ?? 0) < 0).length,
    });
    return { current: compute(currentPeriodTrades), previous: compute(previousPeriodTrades) };
  }, [currentPeriodTrades, previousPeriodTrades]);

  const handleGenerateReport = () => {
    const periodTrades = currentPeriodTrades;
    const { grade, score } = computeGrade(periodTrades);
    const newReport: StoredReport = {
      id: `rpt-${Date.now()}`,
      type: selectedType,
      periodStart: format(periodStart, 'dd/MM/yyyy'),
      periodEnd: format(periodEnd, 'dd/MM/yyyy'),
      grade,
      gradeScore: score,
      netPnL: periodTrades.reduce((s, t) => s + (t.actualPnL ?? 0), 0),
      tradeCount: periodTrades.length,
      createdAt: format(new Date(), 'dd/MM/yyyy, HH:mm'),
    };
    setReports(prev => [newReport, ...prev]);
  };

  const filteredReports = useMemo(() => {
    let result = reports;
    if (filterType !== 'all') result = result.filter(r => r.type === filterType);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(r =>
        r.type.toLowerCase().includes(q) ||
        r.periodStart.includes(q) ||
        r.periodEnd.includes(q) ||
        r.grade.toLowerCase().includes(q)
      );
    }
    return result;
  }, [reports, filterType, searchQuery]);

  const handleDownloadReport = (report: StoredReport) => {
    const periodTrades = closedTrades.filter(t => {
      const d = new Date(t.exitDate ?? t.entryDate);
      const [dd, mm, yyyy] = report.periodStart.split('/').map(Number);
      const [dd2, mm2, yyyy2] = report.periodEnd.split('/').map(Number);
      const start = new Date(yyyy, mm - 1, dd);
      const end = new Date(yyyy2, mm2 - 1, dd2);
      return isAfter(d, start) && isBefore(d, end);
    });

    const typeLabel = REPORT_TYPES.find(r => r.id === report.type)?.label ?? report.type;
    const content = [
      `${typeLabel} Report`,
      `Period: ${report.periodStart} -> ${report.periodEnd}`,
      `Grade: ${report.grade} (${report.gradeScore})`,
      `Net PnL: $${report.netPnL.toFixed(2)}`,
      `Trades: ${report.tradeCount}`,
      '',
      generateTradeCSV(periodTrades),
    ].join('\n');

    downloadCSV(content, `${report.type}-report-${report.periodStart.replace(/\//g, '-')}.csv`);
  };

  const [copiedId, setCopiedId] = useState<string | null>(null);
  const handleCopyReport = (report: StoredReport) => {
    const typeLabel = REPORT_TYPES.find(r => r.id === report.type)?.label ?? report.type;
    const text = `${typeLabel} | ${report.periodStart} -> ${report.periodEnd} | Grade: ${report.grade} (${report.gradeScore}) | Net: $${report.netPnL.toFixed(2)} | Trades: ${report.tradeCount}`;
    navigator.clipboard.writeText(text);
    setCopiedId(report.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="max-w-[1400px] mx-auto px-3 sm:px-6 py-6 space-y-6">

      {/* ── Title ── */}
      <div>
        <h1 className="text-3xl sm:text-4xl font-black mb-1">Reports & Exports</h1>
        <p className="text-sm text-[var(--muted-foreground)]">
          Generate PDF reports, export trade data, and download performance cards.
        </p>
      </div>

      {/* ── Generate PDF Report ── */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5 sm:p-6 space-y-5">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[var(--muted)] flex items-center justify-center">
            <FileText size={16} className="text-[var(--muted-foreground)]" />
          </div>
          <p className="font-semibold">Generate PDF Report</p>
        </div>

        {/* Report type cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {REPORT_TYPES.map(rt => (
            <button
              key={rt.id}
              onClick={() => setSelectedType(rt.id)}
              className={`text-left rounded-xl p-4 border transition-colors ${
                selectedType === rt.id
                  ? 'border-[var(--accent)] bg-[var(--accent)]/5'
                  : 'border-[var(--border)] hover:border-[var(--accent)]/40'
              }`}
            >
              <p className={`font-semibold text-sm mb-0.5 ${selectedType === rt.id ? 'text-[var(--accent)]' : ''}`}>
                {rt.label}
              </p>
              <p className="text-xs text-[var(--muted-foreground)] mb-2">{rt.description}</p>
              <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted-foreground)]">
                {rt.days} DAYS
              </p>
            </button>
          ))}
        </div>

        {/* Period + Batch + Generate */}
        <div className="flex flex-wrap items-center gap-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--muted-foreground)] mb-1.5">Period</p>
            <div className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-[var(--muted)] border border-[var(--border)] text-sm font-medium">
              <span>{format(periodStart, 'dd/MM/yyyy')}</span>
              <span className="text-[var(--muted-foreground)]">-&gt;</span>
              <span>{format(periodEnd, 'dd/MM/yyyy')}</span>
              <span className="text-xs text-[var(--muted-foreground)]">({selectedConfig.days}d)</span>
            </div>
          </div>

          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--muted-foreground)] mb-1.5">Batch</p>
            <div className="flex items-center gap-1">
              {BATCH_OPTIONS.map(b => (
                <button
                  key={b}
                  onClick={() => setBatch(b)}
                  className={`w-9 h-9 text-sm rounded-lg border font-medium transition-colors ${
                    batch === b
                      ? 'border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]'
                      : 'border-[var(--border)] text-[var(--muted-foreground)] hover:border-[var(--accent)]/40'
                  }`}
                >
                  {b}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 flex justify-end">
            <button
              onClick={handleGenerateReport}
              className="flex items-center gap-2 px-6 py-3 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white rounded-full font-semibold transition-colors"
            >
              <Sparkles size={16} /> Generate Report
            </button>
          </div>
        </div>
      </div>

      {/* ── Data Exports ── */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5 sm:p-6 space-y-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[var(--muted)] flex items-center justify-center">
            <Download size={16} className="text-[var(--muted-foreground)]" />
          </div>
          <p className="font-semibold">Data Exports</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Trade History CSV */}
          <div className="flex items-center justify-between p-4 rounded-xl border border-[var(--border)]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[var(--muted)] flex items-center justify-center">
                <FileText size={18} className="text-[var(--muted-foreground)]" />
              </div>
              <div>
                <p className="font-medium text-sm">Trade History (CSV)</p>
                <p className="text-xs text-[var(--muted-foreground)]">All closed trades with PnL, fees, duration, and sizing.</p>
              </div>
            </div>
            <button
              onClick={() => downloadCSV(generateTradeCSV(trades), `trade-history-${format(new Date(), 'yyyy-MM-dd')}.csv`)}
              className="flex items-center gap-1.5 px-4 py-2 text-sm rounded-lg border border-[var(--border)] hover:border-[var(--accent)]/40 hover:text-[var(--foreground)] text-[var(--muted-foreground)] transition-colors font-medium shrink-0"
            >
              <Download size={14} /> Download
            </button>
          </div>

          {/* Daily Analytics CSV */}
          <div className="flex items-center justify-between p-4 rounded-xl border border-[var(--border)]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[var(--muted)] flex items-center justify-center">
                <BarChart3 size={18} className="text-[var(--muted-foreground)]" />
              </div>
              <div>
                <p className="font-medium text-sm">Daily Analytics (CSV)</p>
                <p className="text-xs text-[var(--muted-foreground)]">Daily net PnL, fees, win/loss counts, and hold times.</p>
              </div>
            </div>
            <button
              onClick={() => downloadCSV(generateDailyCSV(trades), `daily-analytics-${format(new Date(), 'yyyy-MM-dd')}.csv`)}
              className="flex items-center gap-1.5 px-4 py-2 text-sm rounded-lg border border-[var(--border)] hover:border-[var(--accent)]/40 hover:text-[var(--foreground)] text-[var(--muted-foreground)] transition-colors font-medium shrink-0"
            >
              <Download size={14} /> Download
            </button>
          </div>

          {/* Hourly Analytics CSV */}
          <div className="flex items-center justify-between p-4 rounded-xl border border-[var(--border)]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[var(--muted)] flex items-center justify-center">
                <Clock size={18} className="text-[var(--muted-foreground)]" />
              </div>
              <div>
                <p className="font-medium text-sm">Hourly Analytics (CSV)</p>
                <p className="text-xs text-[var(--muted-foreground)]">Performance breakdown by UTC hour across all trades.</p>
              </div>
            </div>
            <button
              onClick={() => downloadCSV(generateHourlyCSV(trades), `hourly-analytics-${format(new Date(), 'yyyy-MM-dd')}.csv`)}
              className="flex items-center gap-1.5 px-4 py-2 text-sm rounded-lg border border-[var(--border)] hover:border-[var(--accent)]/40 hover:text-[var(--foreground)] text-[var(--muted-foreground)] transition-colors font-medium shrink-0"
            >
              <Download size={14} /> Download
            </button>
          </div>

          {/* Symbol Analytics CSV */}
          <div className="flex items-center justify-between p-4 rounded-xl border border-[var(--border)]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[var(--muted)] flex items-center justify-center">
                <Coins size={18} className="text-[var(--muted-foreground)]" />
              </div>
              <div>
                <p className="font-medium text-sm">Symbol Analytics (CSV)</p>
                <p className="text-xs text-[var(--muted-foreground)]">Per-symbol PnL, win rate, trade counts, and fees.</p>
              </div>
            </div>
            <button
              onClick={() => downloadCSV(generateSymbolCSV(trades), `symbol-analytics-${format(new Date(), 'yyyy-MM-dd')}.csv`)}
              className="flex items-center gap-1.5 px-4 py-2 text-sm rounded-lg border border-[var(--border)] hover:border-[var(--accent)]/40 hover:text-[var(--foreground)] text-[var(--muted-foreground)] transition-colors font-medium shrink-0"
            >
              <Download size={14} /> Download
            </button>
          </div>

          {/* Performance Card PNG — full width */}
          <div className="sm:col-span-2 flex items-center justify-between p-4 rounded-xl border border-[var(--border)]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[var(--muted)] flex items-center justify-center">
                <Image size={18} className="text-[var(--muted-foreground)]" />
              </div>
              <div>
                <p className="font-medium text-sm">Performance Card (PNG)</p>
                <p className="text-xs text-[var(--muted-foreground)]">Shareable 1200x630 image with key metrics and score.</p>
              </div>
            </div>
            <button
              className="flex items-center gap-1.5 px-4 py-2 text-sm rounded-lg border border-[var(--border)] text-[var(--muted-foreground)] opacity-50 cursor-not-allowed font-medium shrink-0"
              disabled
              title="Coming soon"
            >
              <Download size={14} /> Download
            </button>
          </div>
        </div>
      </div>

      {/* ── Period-over-Period Audit ── */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5 sm:p-6">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[var(--muted)] flex items-center justify-center">
              <TrendingUp size={16} className="text-[var(--accent)]" />
            </div>
            <p className="font-semibold">Period-over-Period Audit</p>
          </div>
          <button className="flex items-center gap-1.5 px-4 py-2 text-sm rounded-lg border border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:border-[var(--accent)]/40 transition-colors font-medium">
            <BarChart3 size={14} /> Refresh Audit
          </button>
        </div>

        <div className="border border-[var(--border)] rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)]">
                <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-widest text-[var(--muted-foreground)]">Metric</th>
                <th className="text-right px-5 py-3 text-xs font-semibold uppercase tracking-widest text-[var(--muted-foreground)]">Current</th>
                <th className="text-right px-5 py-3 text-xs font-semibold uppercase tracking-widest text-[var(--muted-foreground)]">Previous</th>
                <th className="text-right px-5 py-3 text-xs font-semibold uppercase tracking-widest text-[var(--muted-foreground)]">Change</th>
              </tr>
            </thead>
            <tbody>
              {([
                { label: 'Net PnL', current: auditMetrics.current.netPnL, previous: auditMetrics.previous.netPnL, fmt: formatCurrency },
                { label: 'Fees', current: auditMetrics.current.fees, previous: auditMetrics.previous.fees, fmt: formatCurrency },
                { label: 'Trades', current: auditMetrics.current.trades, previous: auditMetrics.previous.trades, fmt: (n: number) => String(n) },
                { label: 'Wins', current: auditMetrics.current.wins, previous: auditMetrics.previous.wins, fmt: (n: number) => String(n) },
                { label: 'Losses', current: auditMetrics.current.losses, previous: auditMetrics.previous.losses, fmt: (n: number) => String(n) },
              ] as const).map(row => {
                const delta = row.current - row.previous;
                const isMonetary = row.label === 'Net PnL' || row.label === 'Fees';
                return (
                  <tr key={row.label} className="border-b border-[var(--border)] last:border-b-0">
                    <td className="px-5 py-3 font-medium">{row.label}</td>
                    <td className="px-5 py-3 text-right">{row.fmt(row.current)}</td>
                    <td className="px-5 py-3 text-right text-[var(--muted-foreground)]">{row.fmt(row.previous)}</td>
                    <td className={`px-5 py-3 text-right font-medium ${
                      delta === 0 ? 'text-[var(--muted-foreground)]'
                        : (row.label === 'Losses' || row.label === 'Fees') ? (delta < 0 ? 'text-green-400' : 'text-red-400')
                        : delta > 0 ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {delta === 0 ? (isMonetary ? row.fmt(0) : '--') : `${delta > 0 ? '+' : ''}${row.fmt(delta)}`}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <p className="text-xs text-[var(--muted-foreground)] mt-3">
          Current: {format(periodStart, 'dd/MM/yyyy')} -&gt; {format(periodEnd, 'dd/MM/yyyy')}
          {' '} Previous: {format(previousPeriodStart, 'dd/MM/yyyy')} -&gt; {format(periodStart, 'dd/MM/yyyy')}
        </p>
      </div>

      {/* ── Report Library ── */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5 sm:p-6">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-8 h-8 rounded-lg bg-[var(--muted)] flex items-center justify-center">
            <FileText size={16} className="text-[var(--muted-foreground)]" />
          </div>
          <p className="font-semibold">Report Library</p>
        </div>
        <p className="text-xs text-[var(--muted-foreground)] mb-4">{reports.length} item{reports.length !== 1 ? 's' : ''}</p>

        {/* Search + Filter */}
        <div className="flex items-center gap-3 mb-4">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]" />
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search reports..."
              className="w-full pl-9 pr-3 py-2.5 text-sm bg-[var(--muted)] border border-[var(--border)] rounded-lg"
            />
          </div>
          <div className="relative">
            <select
              value={filterType}
              onChange={e => setFilterType(e.target.value as ReportType | 'all')}
              className="appearance-none pl-3 pr-8 py-2.5 text-sm bg-[var(--muted)] border border-[var(--border)] rounded-lg font-medium"
            >
              <option value="all">All types</option>
              {REPORT_TYPES.map(rt => (
                <option key={rt.id} value={rt.id}>{rt.label}</option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] pointer-events-none" />
          </div>
        </div>

        {/* Report table */}
        {filteredReports.length > 0 ? (
          <div className="border border-[var(--border)] rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-widest text-[var(--muted-foreground)]">Status</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-widest text-[var(--muted-foreground)]">Type</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-widest text-[var(--muted-foreground)]">Period</th>
                  <th className="text-center px-5 py-3 text-xs font-semibold uppercase tracking-widest text-[var(--muted-foreground)]">Grade</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold uppercase tracking-widest text-[var(--muted-foreground)]">Net PnL</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold uppercase tracking-widest text-[var(--muted-foreground)]">Trades</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-widest text-[var(--muted-foreground)]">Created</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold uppercase tracking-widest text-[var(--muted-foreground)]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredReports.map(report => {
                  const typeLabel = REPORT_TYPES.find(r => r.id === report.type)?.label ?? report.type;
                  return (
                    <tr key={report.id} className="border-b border-[var(--border)] last:border-b-0 hover:bg-[var(--muted)]/30">
                      <td className="px-5 py-3">
                        <span className="inline-flex items-center gap-1.5 text-green-400 text-xs font-medium">
                          <span className="w-2 h-2 rounded-full bg-green-400" /> Success
                        </span>
                      </td>
                      <td className="px-5 py-3 font-semibold">{typeLabel}</td>
                      <td className="px-5 py-3 text-[var(--muted-foreground)]">{report.periodStart} -&gt; {report.periodEnd}</td>
                      <td className="px-5 py-3 text-center">
                        <span className="text-[var(--muted-foreground)]">
                          {report.grade} <span className="text-xs">({report.gradeScore})</span>
                        </span>
                      </td>
                      <td className={`px-5 py-3 text-right font-medium ${report.netPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {formatCurrency(report.netPnL)}
                      </td>
                      <td className="px-5 py-3 text-right text-[var(--muted-foreground)]">{report.tradeCount}</td>
                      <td className="px-5 py-3 text-[var(--muted-foreground)]">{report.createdAt}</td>
                      <td className="px-5 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleDownloadReport(report)}
                            className="flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg border border-[var(--border)] hover:border-[var(--accent)]/40 text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors font-medium"
                          >
                            <Download size={12} /> PDF
                          </button>
                          <button
                            onClick={() => handleCopyReport(report)}
                            className="p-1.5 rounded-lg border border-[var(--border)] hover:border-[var(--accent)]/40 text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
                          >
                            {copiedId === report.id ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12 text-sm text-[var(--muted-foreground)]">
            {reports.length === 0
              ? 'No reports generated yet. Use the section above to create one.'
              : 'No reports match your search.'}
          </div>
        )}
      </div>
    </div>
  );
}
