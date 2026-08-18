'use client';

import { useMemo } from 'react';
import {
  Users, TrendingDown, ShieldCheck, AlertTriangle, ExternalLink,
} from 'lucide-react';

interface MemberStat {
  userId: string;
  displayName: string;
  role: string;
  totalTrades: number;
  totalPnL: number;
  winRate: number;
  compliance: number;
}

interface ActivityEvent {
  userId: string;
  displayName: string;
  type: string;
  message: string;
  timestamp: string;
}

interface TeamOverviewProps {
  memberStats: MemberStat[];
  activityFeed: ActivityEvent[];
  timeRange: '7d' | '30d' | '90d';
}

function StatCard({ label, value, icon, color, accent }: { label: string; value: string | number; icon: React.ReactNode; color?: string; accent?: string }) {
  return (
    <div className="stat" style={{ height: 'auto', paddingBottom: 20 }}>
      <span className="accent" style={{ background: accent ?? 'var(--teal)' }} />
      <div className="flex items-start justify-between">
        <b>{label}</b>
        <span style={{ color: color ?? 'var(--muted-3)' }}>{icon}</span>
      </div>
      <em style={{ color: color ?? 'var(--text)' }}>{value}</em>
    </div>
  );
}

function ComplianceRing({ value }: { value: number }) {
  const radius = 37.5;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;
  const color = value >= 80 ? 'var(--green)' : value >= 60 ? 'var(--amber)' : 'var(--red)';

  return (
    <div className="ring" style={{ width: 96, height: 96 }}>
      <svg viewBox="0 0 80 80" className="w-full h-full">
        <circle cx="40" cy="40" r={radius} fill="none" stroke="#16202c" strokeWidth="5" />
        <circle
          cx="40" cy="40" r={radius} fill="none"
          stroke={color} strokeWidth="5" strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={offset}
          transform="rotate(-90 40 40)"
          className="transition-all duration-700"
        />
      </svg>
      <span className="v" style={{ fontSize: 26 }}>{Math.round(value)}%</span>
    </div>
  );
}

function getRiskLevel(compliance: number, pnl: number): 'low' | 'medium' | 'high' {
  if (compliance < 50 || pnl < -2000) return 'high';
  if (compliance < 75 || pnl < -500) return 'medium';
  return 'low';
}

const RISK_COLOR: Record<'low' | 'medium' | 'high', string> = {
  low: 'var(--green)',
  medium: 'var(--amber)',
  high: 'var(--red)',
};

function RiskDot({ level }: { level: 'low' | 'medium' | 'high' }) {
  return <span className="shrink-0" style={{ width: 8, height: 8, borderRadius: 1, background: RISK_COLOR[level] }} />;
}

export default function TeamOverview({ memberStats, activityFeed, timeRange }: TeamOverviewProps) {
  const stats = useMemo(() => {
    const activeStudents = memberStats.filter(m => m.role === 'member').length;
    const totalPnL = memberStats.reduce((sum, m) => sum + m.totalPnL, 0);
    const avgCompliance = memberStats.length > 0
      ? memberStats.reduce((sum, m) => sum + m.compliance, 0) / memberStats.length
      : 0;

    // Risk alerts: members with compliance < 60 or large negative PnL
    const riskAlerts = memberStats.filter(m => m.compliance < 60 || m.totalPnL < -1000).length;

    // Bucketed PnL distribution
    const pnlBuckets = { 'under500': 0, 'neg500to0': 0, '0to500': 0, '500to2k': 0, 'over2k': 0 };
    for (const m of memberStats) {
      if (m.totalPnL < -500) pnlBuckets.under500++;
      else if (m.totalPnL < 0) pnlBuckets.neg500to0++;
      else if (m.totalPnL < 500) pnlBuckets['0to500']++;
      else if (m.totalPnL < 2000) pnlBuckets['500to2k']++;
      else pnlBuckets.over2k++;
    }

    return { activeStudents, totalPnL, avgCompliance, riskAlerts, pnlBuckets };
  }, [memberStats]);

  const maxBucket = Math.max(
    stats.pnlBuckets.under500, stats.pnlBuckets.neg500to0,
    stats.pnlBuckets['0to500'], stats.pnlBuckets['500to2k'], stats.pnlBuckets.over2k, 1
  );

  const pnlRows = [
    { label: '< -$500', count: stats.pnlBuckets.under500 },
    { label: '-$500-0', count: stats.pnlBuckets.neg500to0 },
    { label: '$0-500', count: stats.pnlBuckets['0to500'] },
    { label: '$500-2k', count: stats.pnlBuckets['500to2k'] },
    { label: '> $2k', count: stats.pnlBuckets.over2k },
  ];

  const students = memberStats.filter(m => m.role === 'member');
  const riskCounts = { low: 0, medium: 0, high: 0 };
  for (const s of students) {
    riskCounts[getRiskLevel(s.compliance, s.totalPnL)]++;
  }

  return (
    <div>
      <div className="phead" style={{ marginBottom: 24 }}>
        <p className="eyebrow" style={{ margin: '0 0 12px' }}>Team pulse · {timeRange}</p>
        <h2 style={{ fontSize: 34, lineHeight: '38px' }}>Overview</h2>
        <p className="sub" style={{ marginTop: 14, fontSize: 14.5 }}>
          Compliance, risk and activity across everyone in this workspace.
        </p>
      </div>

      {/* Top stat cards */}
      <div className="stats" style={{ marginTop: 0 }}>
        <StatCard label="ACTIVE STUDENTS" value={stats.activeStudents} icon={<Users size={16} />} accent="var(--teal)" />
        <StatCard
          label="TEAM NET P&L"
          value={`${stats.totalPnL < 0 ? '-' : ''}$${Math.abs(stats.totalPnL).toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
          icon={<TrendingDown size={16} />}
          color={stats.totalPnL >= 0 ? 'var(--green)' : 'var(--red)'}
          accent={stats.totalPnL >= 0 ? 'var(--green)' : 'var(--red)'}
        />
        <StatCard
          label="AVG COMPLIANCE"
          value={`${Math.round(stats.avgCompliance)}%`}
          icon={<ShieldCheck size={16} />}
          color="var(--green)"
          accent="var(--amber)"
        />
        <StatCard
          label="RISK ALERTS"
          value={stats.riskAlerts}
          icon={<AlertTriangle size={16} />}
          color={stats.riskAlerts > 0 ? 'var(--red)' : 'var(--muted)'}
          accent="var(--pink)"
        />
      </div>

      {/* Middle row: Health Score + Risk Map */}
      <div className="split" style={{ marginTop: 32 }}>
        {/* Team Health Score */}
        <div className="card">
          <span className="accent" style={{ width: 56, background: 'var(--amber)' }} />
          <h3>Team Health Score</h3>
          <p className="sub">Average rule compliance across the workspace</p>
          <div className="flex items-center gap-7" style={{ marginTop: 24 }}>
            <ComplianceRing value={stats.avgCompliance} />
            <div>
              <p className="lbl b10">COMPLIANCE</p>
              <p style={{ fontFamily: 'var(--mono)', fontWeight: 500, fontSize: 30, lineHeight: '38px', margin: '6px 0 0' }}>
                {Math.round(stats.avgCompliance)}%
              </p>
              <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--muted-2)' }}>
                {stats.avgCompliance >= 80 ? 'Healthy' : stats.avgCompliance >= 60 ? 'Needs attention' : 'At risk'}
              </p>
            </div>
          </div>
          <p className="lbl" style={{ marginTop: 22 }}>TREND ({timeRange.toUpperCase()})</p>
          {/* Simple trend line placeholder */}
          <div style={{ height: 6, marginTop: 8, background: 'var(--panel-2)', border: '1px solid var(--line)', borderRadius: 2, overflow: 'hidden' }}>
            <div style={{ height: '100%', background: 'var(--amber)', width: `${stats.avgCompliance}%` }} />
          </div>
        </div>

        {/* Student Risk Map */}
        <div className="card">
          <span className="accent" style={{ width: 56, background: 'var(--teal)' }} />
          <div className="cardhead">
            <div>
              <h3>Student Risk Map</h3>
              <p className="sub">Who needs attention right now</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap" style={{ marginTop: 16 }}>
            {(['low', 'medium', 'high'] as const).map(level => (
              <span key={level} className="chip capitalize">
                <i style={{ background: RISK_COLOR[level] }} />
                {level} ({riskCounts[level]})
              </span>
            ))}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2" style={{ marginTop: 18, maxHeight: 200, overflowY: 'auto' }}>
            {students.map(s => {
              const risk = getRiskLevel(s.compliance, s.totalPnL);
              return (
                <div key={s.userId} className="inset" style={{ padding: '10px 12px' }}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate" style={{ fontWeight: 700, fontSize: 12.5 }}>{s.displayName}</span>
                    <RiskDot level={risk} />
                  </div>
                  <p style={{ margin: '6px 0 0', fontSize: 10.5, color: 'var(--muted-2)' }}>
                    {Math.round(s.compliance)}% compliance
                  </p>
                  <p style={{
                    margin: '3px 0 0', fontFamily: 'var(--mono)', fontSize: 11,
                    color: s.totalPnL >= 0 ? 'var(--green)' : 'var(--red)',
                  }}>
                    {s.totalPnL >= 0 ? '+' : '-'}${Math.abs(s.totalPnL).toFixed(0)}
                  </p>
                </div>
              );
            })}

            {students.length === 0 && (
              <div className="col-span-full">
                <p className="empty-line" style={{ padding: '30px 0' }}>No students yet. Add members to get started.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom row: P&L Distribution + Activity Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6" style={{ marginTop: 32 }}>
        {/* P&L Distribution */}
        <div className="lg:col-span-3 card">
          <span className="accent" style={{ width: 56, background: 'var(--green)' }} />
          <h3>P&L Distribution</h3>
          <p className="sub">How many members sit in each P&L band</p>
          <div style={{ marginTop: 22 }}>
            {pnlRows.map(row => (
              <div key={row.label} className="mrow">
                <span style={{ width: 72, flex: 'none', fontSize: 11.5, color: 'var(--muted-2)', textAlign: 'right' }}>
                  {row.label}
                </span>
                <div style={{
                  flex: 1, height: 10, marginLeft: 16, background: 'var(--panel-2)',
                  border: '1px solid var(--line)', borderRadius: 2, overflow: 'hidden',
                }}>
                  <div style={{ height: '100%', background: 'var(--amber)', width: `${(row.count / maxBucket) * 100}%` }} />
                </div>
                <span className="val" style={{ width: 34, textAlign: 'right' }}>{row.count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Activity Feed */}
        <div className="lg:col-span-2 card">
          <span className="accent" style={{ width: 56, background: 'var(--pink)' }} />
          <div className="cardhead">
            <div>
              <h3>Activity Feed</h3>
              <p className="sub">Latest workspace events</p>
            </div>
            <button className="viewall">
              View all <ExternalLink size={12} />
            </button>
          </div>

          <div style={{ marginTop: 18, maxHeight: 220, overflowY: 'auto' }}>
            {activityFeed.map((event, i) => (
              <div key={i} className="flex items-start gap-3" style={{ padding: '10px 0', borderBottom: '1px solid var(--hair)' }}>
                <div
                  className="flex items-center justify-center shrink-0"
                  style={{
                    width: 26, height: 26, borderRadius: 2, background: 'var(--panel-2)',
                    border: '1px solid var(--line)', fontSize: 10, fontWeight: 700, color: 'var(--amber)',
                  }}
                >
                  {event.displayName[0]?.toUpperCase() ?? '?'}
                </div>
                <div className="min-w-0 flex-1">
                  <p style={{ margin: 0, fontSize: 12.5, lineHeight: '18px', color: 'var(--text-2)' }}>
                    <span style={{ fontWeight: 700, color: 'var(--text)' }}>{event.displayName}</span>{' '}
                    {event.message}
                  </p>
                </div>
                <span className="shrink-0 whitespace-nowrap" style={{ fontSize: 10.5, color: 'var(--muted-2)' }}>
                  {formatTimestamp(event.timestamp)}
                </span>
              </div>
            ))}

            {activityFeed.length === 0 && (
              <p className="empty-line" style={{ padding: '30px 0' }}>No activity yet</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function formatTimestamp(ts: string): string {
  try {
    const date = new Date(ts);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);

    if (diffHours < 1) return `${Math.round(diffMs / 60000)}m ago`;
    if (diffHours < 24) return `${Math.round(diffHours)}h ago`;

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch {
    return ts;
  }
}
