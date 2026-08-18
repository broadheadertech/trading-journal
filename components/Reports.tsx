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
    <div className="pwrap">
      {/* ── Page head ── */}
      <div className="phead">
        <p className="eyebrow" style={{ color: 'var(--amber)', fontWeight: 700, letterSpacing: '.04em', fontSize: 10, textTransform: 'uppercase' }}>
          <FileText size={12} /> Reporting Desk
        </p>
        <h2>Reports &amp; Exports</h2>
        <p className="sub">Generate PDF reports, export trade data, and download performance cards.</p>
      </div>

      {/* ── Generate PDF Report ── */}
      <div className="card" style={{ padding: '25px 28px 30px' }}>
        <span className="accent" style={{ width: 56, background: 'var(--amber)' }} />
        <div className="cardhead">
          <div>
            <h3>Generate PDF Report</h3>
            <p className="sub">Pick a cadence, then build the report for the matching window.</p>
          </div>
          <FileText size={16} style={{ marginLeft: 'auto', color: 'var(--amber)' }} />
        </div>

        {/* Report type cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))',
            gap: 12,
            marginTop: 24,
          }}
        >
          {REPORT_TYPES.map(rt => (
            <button
              key={rt.id}
              onClick={() => setSelectedType(rt.id)}
              className="inset"
              style={{
                textAlign: 'left',
                padding: '14px 16px',
                borderColor: selectedType === rt.id ? 'var(--amber)' : 'var(--line)',
              }}
            >
              <p className="lbl b10" style={{ color: selectedType === rt.id ? 'var(--amber)' : 'var(--text)' }}>
                {rt.label.toUpperCase()}
              </p>
              <p style={{ margin: '9px 0 0', fontSize: 12, color: 'var(--muted)' }}>{rt.description}</p>
              <p style={{ margin: '10px 0 0', fontWeight: 700, fontSize: 9, letterSpacing: '.04em', color: 'var(--muted-2)' }}>
                {rt.days} DAYS
              </p>
            </button>
          ))}
        </div>

        {/* Period + Batch + Generate */}
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', gap: 24, marginTop: 26 }}>
          <div>
            <p className="lbl" style={{ marginBottom: 9 }}>PERIOD</p>
            <span className="chip" style={{ height: 36, fontFamily: 'var(--mono)' }}>
              <span>{format(periodStart, 'dd/MM/yyyy')}</span>
              <span style={{ color: 'var(--muted-2)' }}>-&gt;</span>
              <span>{format(periodEnd, 'dd/MM/yyyy')}</span>
              <span style={{ color: 'var(--muted-2)', fontSize: 11 }}>({selectedConfig.days}d)</span>
            </span>
          </div>

          <div>
            <p className="lbl" style={{ marginBottom: 9 }}>BATCH</p>
            <div className="seg" style={{ marginLeft: 0, gap: 6 }}>
              {BATCH_OPTIONS.map(b => (
                <button
                  key={b}
                  onClick={() => setBatch(b)}
                  className={batch === b ? 'on' : undefined}
                  style={{
                    height: 36,
                    minWidth: 38,
                    border: `1px solid ${batch === b ? 'var(--amber)' : 'var(--line)'}`,
                    fontFamily: 'var(--mono)',
                  }}
                >
                  {b}
                </button>
              ))}
            </div>
          </div>

          <button onClick={handleGenerateReport} className="btn-a" style={{ marginLeft: 'auto', height: 44 }}>
            <Sparkles size={16} /> Generate Report
          </button>
        </div>
      </div>

      {/* ── Data Exports ── */}
      <div className="card" style={{ marginTop: 24, padding: '25px 28px 30px' }}>
        <span className="accent" style={{ width: 56, background: 'var(--teal)' }} />
        <div className="cardhead">
          <div>
            <h3>Data Exports</h3>
            <p className="sub">Raw CSV extracts of every closed trade and its aggregates.</p>
          </div>
          <Download size={16} style={{ marginLeft: 'auto', color: 'var(--teal)' }} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(320px,1fr))', gap: 12, marginTop: 24 }}>
          {/* Trade History CSV */}
          <div className="inset" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px' }}>
            <FileText size={18} style={{ color: 'var(--amber)', flex: 'none' }} />
            <div style={{ minWidth: 0 }}>
              <p style={{ margin: 0, fontWeight: 700, fontSize: 12.5, color: 'var(--text)' }}>Trade History (CSV)</p>
              <p style={{ margin: '6px 0 0', fontSize: 11.5, color: 'var(--muted-2)' }}>All closed trades with PnL, fees, duration, and sizing.</p>
            </div>
            <button
              onClick={() => downloadCSV(generateTradeCSV(trades), `trade-history-${format(new Date(), 'yyyy-MM-dd')}.csv`)}
              className="btn-g"
              style={{ marginLeft: 'auto', height: 32, padding: '0 14px', fontSize: 12, flex: 'none' }}
            >
              <Download size={14} /> Download
            </button>
          </div>

          {/* Daily Analytics CSV */}
          <div className="inset" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px' }}>
            <BarChart3 size={18} style={{ color: 'var(--teal)', flex: 'none' }} />
            <div style={{ minWidth: 0 }}>
              <p style={{ margin: 0, fontWeight: 700, fontSize: 12.5, color: 'var(--text)' }}>Daily Analytics (CSV)</p>
              <p style={{ margin: '6px 0 0', fontSize: 11.5, color: 'var(--muted-2)' }}>Daily net PnL, fees, win/loss counts, and hold times.</p>
            </div>
            <button
              onClick={() => downloadCSV(generateDailyCSV(trades), `daily-analytics-${format(new Date(), 'yyyy-MM-dd')}.csv`)}
              className="btn-g"
              style={{ marginLeft: 'auto', height: 32, padding: '0 14px', fontSize: 12, flex: 'none' }}
            >
              <Download size={14} /> Download
            </button>
          </div>

          {/* Hourly Analytics CSV */}
          <div className="inset" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px' }}>
            <Clock size={18} style={{ color: 'var(--green)', flex: 'none' }} />
            <div style={{ minWidth: 0 }}>
              <p style={{ margin: 0, fontWeight: 700, fontSize: 12.5, color: 'var(--text)' }}>Hourly Analytics (CSV)</p>
              <p style={{ margin: '6px 0 0', fontSize: 11.5, color: 'var(--muted-2)' }}>Performance breakdown by UTC hour across all trades.</p>
            </div>
            <button
              onClick={() => downloadCSV(generateHourlyCSV(trades), `hourly-analytics-${format(new Date(), 'yyyy-MM-dd')}.csv`)}
              className="btn-g"
              style={{ marginLeft: 'auto', height: 32, padding: '0 14px', fontSize: 12, flex: 'none' }}
            >
              <Download size={14} /> Download
            </button>
          </div>

          {/* Symbol Analytics CSV */}
          <div className="inset" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px' }}>
            <Coins size={18} style={{ color: 'var(--pink)', flex: 'none' }} />
            <div style={{ minWidth: 0 }}>
              <p style={{ margin: 0, fontWeight: 700, fontSize: 12.5, color: 'var(--text)' }}>Symbol Analytics (CSV)</p>
              <p style={{ margin: '6px 0 0', fontSize: 11.5, color: 'var(--muted-2)' }}>Per-symbol PnL, win rate, trade counts, and fees.</p>
            </div>
            <button
              onClick={() => downloadCSV(generateSymbolCSV(trades), `symbol-analytics-${format(new Date(), 'yyyy-MM-dd')}.csv`)}
              className="btn-g"
              style={{ marginLeft: 'auto', height: 32, padding: '0 14px', fontSize: 12, flex: 'none' }}
            >
              <Download size={14} /> Download
            </button>
          </div>

          {/* Performance Card PNG — full width */}
          <div className="inset" style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px' }}>
            {/* eslint-disable-next-line jsx-a11y/alt-text */}
            <Image size={18} style={{ color: 'var(--muted-3)', flex: 'none' }} />
            <div style={{ minWidth: 0 }}>
              <p style={{ margin: 0, fontWeight: 700, fontSize: 12.5, color: 'var(--text)' }}>Performance Card (PNG)</p>
              <p style={{ margin: '6px 0 0', fontSize: 11.5, color: 'var(--muted-2)' }}>Shareable 1200x630 image with key metrics and score.</p>
            </div>
            <button
              className="btn-d"
              style={{ marginLeft: 'auto', height: 32, padding: '0 14px', fontSize: 12, gap: 8, flex: 'none' }}
              disabled
              title="Coming soon"
            >
              <Download size={14} /> Download
            </button>
          </div>
        </div>
      </div>

      {/* ── Period-over-Period Audit ── */}
      <div className="card" style={{ marginTop: 24, padding: '25px 28px 30px' }}>
        <span className="accent" style={{ width: 56, background: 'var(--green)' }} />
        <div className="cardhead">
          <div>
            <h3>Period-over-Period Audit</h3>
            <p className="sub">Current window measured against the immediately preceding one.</p>
          </div>
          <button className="btn-g" style={{ marginLeft: 'auto', height: 32, padding: '0 14px', fontSize: 12 }}>
            <BarChart3 size={14} /> Refresh Audit
          </button>
        </div>

        <div style={{ marginTop: 24, overflowX: 'auto' }}>
          <table style={{ width: '100%', minWidth: 520, borderCollapse: 'collapse', fontSize: 12.5 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--line)' }}>
                <th className="lbl" style={{ textAlign: 'left', padding: '10px 14px' }}>METRIC</th>
                <th className="lbl" style={{ textAlign: 'right', padding: '10px 14px' }}>CURRENT</th>
                <th className="lbl" style={{ textAlign: 'right', padding: '10px 14px' }}>PREVIOUS</th>
                <th className="lbl" style={{ textAlign: 'right', padding: '10px 14px' }}>CHANGE</th>
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
                  <tr key={row.label} style={{ borderBottom: '1px solid var(--hair)' }}>
                    <td style={{ padding: '11px 14px', color: 'var(--text-2)' }}>{row.label}</td>
                    <td style={{ padding: '11px 14px', textAlign: 'right', fontFamily: 'var(--mono)', color: 'var(--text)' }}>{row.fmt(row.current)}</td>
                    <td style={{ padding: '11px 14px', textAlign: 'right', fontFamily: 'var(--mono)', color: 'var(--muted)' }}>{row.fmt(row.previous)}</td>
                    <td
                      style={{
                        padding: '11px 14px',
                        textAlign: 'right',
                        fontFamily: 'var(--mono)',
                        color:
                          delta === 0 ? 'var(--muted)'
                            : (row.label === 'Losses' || row.label === 'Fees') ? (delta < 0 ? 'var(--green)' : 'var(--red)')
                            : delta > 0 ? 'var(--green)' : 'var(--red)',
                      }}
                    >
                      {delta === 0 ? (isMonetary ? row.fmt(0) : '--') : `${delta > 0 ? '+' : ''}${row.fmt(delta)}`}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="note" style={{ fontFamily: 'var(--mono)', fontSize: 11.5 }}>
          Current: {format(periodStart, 'dd/MM/yyyy')} -&gt; {format(periodEnd, 'dd/MM/yyyy')}
          {' '} Previous: {format(previousPeriodStart, 'dd/MM/yyyy')} -&gt; {format(periodStart, 'dd/MM/yyyy')}
        </div>
      </div>

      {/* ── Report Library ── */}
      <div className="card" style={{ marginTop: 24, padding: '25px 28px 30px' }}>
        <span className="accent" style={{ width: 56, background: 'var(--pink)' }} />
        <div className="cardhead">
          <div>
            <h3>Report Library</h3>
            <p className="sub">{reports.length} item{reports.length !== 1 ? 's' : ''} generated in this session.</p>
          </div>
          <FileText size={16} style={{ marginLeft: 'auto', color: 'var(--pink)' }} />
        </div>

        {/* Search + Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 24, flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: '1 1 220px' }}>
            <Search size={14} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted-2)' }} />
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search reports..."
              style={{
                width: '100%', height: 38, paddingLeft: 36, paddingRight: 14,
                border: '1px solid var(--line)', borderRadius: 2, background: 'var(--panel-2)',
                color: 'var(--text)', fontSize: 12.5, outline: 'none',
              }}
            />
          </div>
          <div style={{ position: 'relative' }}>
            <select
              value={filterType}
              onChange={e => setFilterType(e.target.value as ReportType | 'all')}
              style={{
                appearance: 'none', height: 38, paddingLeft: 14, paddingRight: 32,
                border: '1px solid var(--line)', borderRadius: 2, background: 'var(--panel-2)',
                color: 'var(--text)', fontSize: 12.5, fontWeight: 700, outline: 'none',
              }}
            >
              <option value="all">All types</option>
              {REPORT_TYPES.map(rt => (
                <option key={rt.id} value={rt.id}>{rt.label}</option>
              ))}
            </select>
            <ChevronDown size={14} style={{ position: 'absolute', right: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted-2)', pointerEvents: 'none' }} />
          </div>
        </div>

        {/* Report table */}
        {filteredReports.length > 0 ? (
          <div style={{ marginTop: 20, overflowX: 'auto' }}>
            <table style={{ width: '100%', minWidth: 900, borderCollapse: 'collapse', fontSize: 12.5 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--line)' }}>
                  <th className="lbl" style={{ textAlign: 'left', padding: '10px 14px' }}>STATUS</th>
                  <th className="lbl" style={{ textAlign: 'left', padding: '10px 14px' }}>TYPE</th>
                  <th className="lbl" style={{ textAlign: 'left', padding: '10px 14px' }}>PERIOD</th>
                  <th className="lbl" style={{ textAlign: 'center', padding: '10px 14px' }}>GRADE</th>
                  <th className="lbl" style={{ textAlign: 'right', padding: '10px 14px' }}>NET PNL</th>
                  <th className="lbl" style={{ textAlign: 'right', padding: '10px 14px' }}>TRADES</th>
                  <th className="lbl" style={{ textAlign: 'left', padding: '10px 14px' }}>CREATED</th>
                  <th className="lbl" style={{ textAlign: 'right', padding: '10px 14px' }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {filteredReports.map(report => {
                  const typeLabel = REPORT_TYPES.find(r => r.id === report.type)?.label ?? report.type;
                  return (
                    <tr key={report.id} style={{ borderBottom: '1px solid var(--hair)' }}>
                      <td style={{ padding: '11px 14px' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, color: 'var(--green)', fontWeight: 700, fontSize: 11 }}>
                          <i style={{ width: 7, height: 7, borderRadius: 1, background: 'var(--green)' }} /> Success
                        </span>
                      </td>
                      <td style={{ padding: '11px 14px', fontWeight: 700, color: 'var(--text)' }}>{typeLabel}</td>
                      <td style={{ padding: '11px 14px', color: 'var(--muted)', fontFamily: 'var(--mono)' }}>{report.periodStart} -&gt; {report.periodEnd}</td>
                      <td style={{ padding: '11px 14px', textAlign: 'center' }}>
                        <span className="chip" style={{ height: 24, padding: '0 10px', fontFamily: 'var(--mono)' }}>
                          {report.grade} <span style={{ color: 'var(--muted-2)' }}>({report.gradeScore})</span>
                        </span>
                      </td>
                      <td style={{ padding: '11px 14px', textAlign: 'right', fontFamily: 'var(--mono)', color: report.netPnL >= 0 ? 'var(--green)' : 'var(--red)' }}>
                        {formatCurrency(report.netPnL)}
                      </td>
                      <td style={{ padding: '11px 14px', textAlign: 'right', fontFamily: 'var(--mono)', color: 'var(--muted)' }}>{report.tradeCount}</td>
                      <td style={{ padding: '11px 14px', color: 'var(--muted)', fontFamily: 'var(--mono)' }}>{report.createdAt}</td>
                      <td style={{ padding: '11px 14px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
                          <button
                            onClick={() => handleDownloadReport(report)}
                            className="btn-g"
                            style={{ height: 28, padding: '0 12px', fontSize: 11.5, gap: 6 }}
                          >
                            <Download size={12} /> PDF
                          </button>
                          <button
                            onClick={() => handleCopyReport(report)}
                            className="btn-g"
                            style={{ height: 28, width: 28, padding: 0 }}
                          >
                            {copiedId === report.id ? <Check size={14} style={{ color: 'var(--green)' }} /> : <Copy size={14} />}
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
          <p className="empty-line">
            {reports.length === 0
              ? 'No reports generated yet. Use the section above to create one.'
              : 'No reports match your search.'}
          </p>
        )}
      </div>
    </div>
  );
}
