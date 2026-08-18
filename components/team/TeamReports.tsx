'use client';

import { useState } from 'react';
import { BarChart3, Layers, Users, ShieldCheck, Plus } from 'lucide-react';

// shared ATLAS input chrome (markup-level styling only)
const inputBox: React.CSSProperties = {
  width: '100%', height: 42, padding: '0 14px', borderRadius: 2,
  border: '1px solid var(--line)', background: 'var(--panel-2)',
  fontSize: 13, color: 'var(--text)', outline: 'none',
};

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
    <div>
      {/* Header */}
      <div className="phead" style={{ marginBottom: 24 }}>
        <p className="eyebrow" style={{ margin: '0 0 12px' }}>Exports</p>
        <h2 style={{ fontSize: 34, lineHeight: '38px' }}>Reports</h2>
        <p className="sub" style={{ marginTop: 14, fontSize: 14.5 }}>Generate and download team reports</p>
      </div>

      {/* Report type cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {reportTypes.map(rt => (
          <button
            key={rt.id}
            onClick={() => setSelectedType(rt.id)}
            className="stat flex flex-col items-start text-left"
            style={{
              height: 'auto', paddingBottom: 20,
              borderColor: selectedType === rt.id ? 'var(--amber)' : 'var(--line)',
            }}
          >
            <span className="accent" style={{ background: selectedType === rt.id ? 'var(--amber)' : 'var(--line-2)' }} />
            <span style={{ color: selectedType === rt.id ? 'var(--amber)' : 'var(--muted-3)' }}>
              {rt.icon}
            </span>
            <b style={{ marginTop: 12, color: selectedType === rt.id ? 'var(--amber)' : 'var(--muted-2)' }}>
              {rt.label.toUpperCase()}
            </b>
          </button>
        ))}
      </div>

      {/* Generate form */}
      <div className="card" style={{ marginTop: 24 }}>
        <span className="accent" style={{ width: 56, background: 'var(--teal)' }} />
        <h3>Generate Report</h3>
        <p className="sub">Pick a type, range and cohort scope</p>
        <div className="flex items-end gap-4 flex-wrap" style={{ marginTop: 20 }}>
          <div className="field">
            <label>TYPE</label>
            <select
              value={selectedType}
              onChange={e => setSelectedType(e.target.value as ReportType)}
              style={{ ...inputBox, width: 'auto', minWidth: 190, cursor: 'pointer' }}
            >
              {reportTypes.map(rt => (
                <option key={rt.id} value={rt.id}>{rt.label}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>FROM</label>
            <input
              type="date"
              value={fromDate}
              onChange={e => setFromDate(e.target.value)}
              style={{ ...inputBox, width: 'auto' }}
            />
          </div>
          <div className="field">
            <label>TO</label>
            <input
              type="date"
              value={toDate}
              onChange={e => setToDate(e.target.value)}
              style={{ ...inputBox, width: 'auto' }}
            />
          </div>
          <div className="field">
            <label>COHORT (OPTIONAL)</label>
            <select
              value={cohortFilter}
              onChange={e => setCohortFilter(e.target.value)}
              style={{ ...inputBox, width: 'auto', minWidth: 130, cursor: 'pointer' }}
            >
              <option value="all">All</option>
            </select>
          </div>
          <button onClick={handleGenerate} className="btn-a" style={{ height: 42 }}>
            <Plus size={14} />
            Generate
          </button>
        </div>
      </div>

      {/* Generated reports list */}
      <div className="card" style={{ marginTop: 24 }}>
        <span className="accent" style={{ width: 56, background: 'var(--amber)' }} />
        <div className="cardhead">
          <div>
            <h3>Generated Reports</h3>
            <p className="sub">This session&apos;s exports</p>
          </div>
          <span className="chip" style={{ marginLeft: 'auto', height: 26, padding: '0 10px', fontSize: 11 }}>
            {generatedReports.length}
          </span>
        </div>
        {generatedReports.length === 0 ? (
          <p className="empty-line" style={{ padding: '34px 0 8px' }}>
            No reports generated yet. Use the form above to create one.
          </p>
        ) : (
          <div style={{ marginTop: 18 }}>
            {generatedReports.map(report => (
              <div key={report.id} className="mrow">
                <BarChart3 size={15} className="ic" style={{ color: 'var(--amber)' }} />
                <div className="lb" style={{ marginLeft: 16 }}>
                  <p style={{ margin: 0, fontSize: 12.5, fontWeight: 700, color: 'var(--text)' }}>
                    {reportTypes.find(r => r.id === report.type)?.label}
                  </p>
                  <p style={{ margin: '3px 0 0', fontSize: 11, color: 'var(--muted-2)' }}>
                    {new Date(report.from).toLocaleDateString()} - {new Date(report.to).toLocaleDateString()}
                  </p>
                </div>
                <span className="val" style={{ fontSize: 11, color: 'var(--muted-2)' }}>
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
