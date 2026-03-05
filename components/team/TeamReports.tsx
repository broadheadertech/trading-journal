'use client';

import { useState } from 'react';
import { BarChart3, Layers, Users, ShieldCheck, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MemberStat {
  userId: string;
  displayName: string;
  role: string;
  totalTrades: number;
  totalPnL: number;
  winRate: number;
  compliance: number;
}

interface TeamReportsProps {
  workspaceId: string;
  memberStats: MemberStat[];
}

type ReportType = 'team-performance' | 'cohort-analysis' | 'member-audit' | 'compliance-summary';

const reportTypes: { id: ReportType; label: string; icon: React.ReactNode }[] = [
  { id: 'team-performance', label: 'Team Performance', icon: <BarChart3 size={18} /> },
  { id: 'cohort-analysis', label: 'Cohort Analysis', icon: <Layers size={18} /> },
  { id: 'member-audit', label: 'Member Audit', icon: <Users size={18} /> },
  { id: 'compliance-summary', label: 'Compliance Summary', icon: <ShieldCheck size={18} /> },
];

interface GeneratedReport {
  id: string;
  type: ReportType;
  from: string;
  to: string;
  generatedAt: string;
}

export default function TeamReports({ workspaceId, memberStats }: TeamReportsProps) {
  const [selectedType, setSelectedType] = useState<ReportType>('team-performance');
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().slice(0, 10);
  });
  const [toDate, setToDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [cohortFilter, setCohortFilter] = useState('all');
  const [generatedReports, setGeneratedReports] = useState<GeneratedReport[]>([]);

  const handleGenerate = () => {
    const report: GeneratedReport = {
      id: `rpt-${Date.now()}`,
      type: selectedType,
      from: fromDate,
      to: toDate,
      generatedAt: new Date().toISOString(),
    };
    setGeneratedReports(prev => [report, ...prev]);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold">Reports</h2>
        <p className="text-sm text-[var(--muted-foreground)]">Generate and download team reports</p>
      </div>

      {/* Report type cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {reportTypes.map(rt => (
          <button
            key={rt.id}
            onClick={() => setSelectedType(rt.id)}
            className={cn(
              'flex items-center gap-3 p-4 rounded-xl border transition-colors text-left',
              selectedType === rt.id
                ? 'bg-[var(--accent)]/10 border-[var(--accent)]/40 text-[var(--accent)]'
                : 'bg-[var(--card)] border-[var(--border)] text-[var(--foreground)] hover:bg-[var(--muted)]'
            )}
          >
            <span className={selectedType === rt.id ? 'text-[var(--accent)]' : 'text-[var(--muted-foreground)]'}>
              {rt.icon}
            </span>
            <span className="text-sm font-medium">{rt.label}</span>
          </button>
        ))}
      </div>

      {/* Generate form */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5">
        <h3 className="font-bold mb-4">Generate Report</h3>
        <div className="flex items-end gap-4 flex-wrap">
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)] mb-1.5 block">Type</label>
            <select
              value={selectedType}
              onChange={e => setSelectedType(e.target.value as ReportType)}
              className="px-3 py-2.5 bg-[var(--muted)] border border-[var(--border)] rounded-lg text-sm outline-none min-w-[180px]"
            >
              {reportTypes.map(rt => (
                <option key={rt.id} value={rt.id}>{rt.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)] mb-1.5 block">From</label>
            <input
              type="date"
              value={fromDate}
              onChange={e => setFromDate(e.target.value)}
              className="px-3 py-2.5 bg-[var(--muted)] border border-[var(--border)] rounded-lg text-sm outline-none"
            />
          </div>
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)] mb-1.5 block">To</label>
            <input
              type="date"
              value={toDate}
              onChange={e => setToDate(e.target.value)}
              className="px-3 py-2.5 bg-[var(--muted)] border border-[var(--border)] rounded-lg text-sm outline-none"
            />
          </div>
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)] mb-1.5 block">Cohort (optional)</label>
            <select
              value={cohortFilter}
              onChange={e => setCohortFilter(e.target.value)}
              className="px-3 py-2.5 bg-[var(--muted)] border border-[var(--border)] rounded-lg text-sm outline-none min-w-[120px]"
            >
              <option value="all">All</option>
            </select>
          </div>
          <button
            onClick={handleGenerate}
            className="flex items-center gap-2 px-5 py-2.5 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white rounded-lg text-sm font-semibold transition-colors"
          >
            <Plus size={16} />
            Generate
          </button>
        </div>
      </div>

      {/* Generated reports list */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5">
        <h3 className="font-bold mb-4">Generated Reports</h3>
        {generatedReports.length === 0 ? (
          <p className="text-sm text-[var(--muted-foreground)] text-center py-8">
            No reports generated yet. Use the form above to create one.
          </p>
        ) : (
          <div className="space-y-2">
            {generatedReports.map(report => (
              <div key={report.id} className="flex items-center justify-between py-3 px-4 rounded-lg border border-[var(--border)] hover:bg-[var(--muted)]/50">
                <div className="flex items-center gap-3">
                  <BarChart3 size={16} className="text-[var(--accent)]" />
                  <div>
                    <p className="text-sm font-medium">
                      {reportTypes.find(r => r.id === report.type)?.label}
                    </p>
                    <p className="text-[11px] text-[var(--muted-foreground)]">
                      {new Date(report.from).toLocaleDateString()} - {new Date(report.to).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <span className="text-[11px] text-[var(--muted-foreground)]">
                  {new Date(report.generatedAt).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
