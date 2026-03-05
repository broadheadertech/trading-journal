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

function StatCard({ label, value, icon, color }: { label: string; value: string | number; icon: React.ReactNode; color?: string }) {
  return (
    <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm text-[var(--muted-foreground)]">{label}</span>
        <span className={color ?? 'text-[var(--muted-foreground)]'}>{icon}</span>
      </div>
      <p className="text-2xl font-black">{value}</p>
    </div>
  );
}

function ComplianceRing({ value }: { value: number }) {
  const radius = 44;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;
  const color = value >= 80 ? 'var(--accent)' : value >= 60 ? '#eab308' : '#ef4444';

  return (
    <div className="relative w-28 h-28">
      <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
        <circle cx="50" cy="50" r={radius} fill="none" stroke="var(--border)" strokeWidth="6" />
        <circle
          cx="50" cy="50" r={radius} fill="none"
          stroke={color} strokeWidth="6" strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={offset}
          className="transition-all duration-700"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-lg font-black">{Math.round(value)}%</span>
      </div>
    </div>
  );
}

function getRiskLevel(compliance: number, pnl: number): 'low' | 'medium' | 'high' {
  if (compliance < 50 || pnl < -2000) return 'high';
  if (compliance < 75 || pnl < -500) return 'medium';
  return 'low';
}

function RiskDot({ level }: { level: 'low' | 'medium' | 'high' }) {
  const color = level === 'low' ? 'bg-green-400' : level === 'medium' ? 'bg-yellow-400' : 'bg-red-400';
  return <span className={`w-2.5 h-2.5 rounded-full ${color} shrink-0`} />;
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
    <div className="space-y-6">
      {/* Top stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Active Students" value={stats.activeStudents} icon={<Users size={20} />} />
        <StatCard
          label="Team Net P&L"
          value={`${stats.totalPnL < 0 ? '-' : ''}$${Math.abs(stats.totalPnL).toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
          icon={<TrendingDown size={20} />}
          color={stats.totalPnL >= 0 ? 'text-green-400' : 'text-red-400'}
        />
        <StatCard
          label="Avg Compliance"
          value={`${Math.round(stats.avgCompliance)}%`}
          icon={<ShieldCheck size={20} />}
          color="text-green-400"
        />
        <StatCard
          label="Risk Alerts"
          value={stats.riskAlerts}
          icon={<AlertTriangle size={20} />}
          color={stats.riskAlerts > 0 ? 'text-red-400' : 'text-[var(--muted-foreground)]'}
        />
      </div>

      {/* Middle row: Health Score + Risk Map */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Team Health Score */}
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5">
          <h3 className="font-bold mb-4">Team Health Score</h3>
          <div className="flex items-center gap-6">
            <ComplianceRing value={stats.avgCompliance} />
            <div>
              <p className="text-sm text-[var(--muted-foreground)]">Compliance</p>
              <p className="text-2xl font-black">{Math.round(stats.avgCompliance)}%</p>
              <p className="text-xs text-[var(--muted-foreground)] mt-1">
                {stats.avgCompliance >= 80 ? 'Healthy' : stats.avgCompliance >= 60 ? 'Needs attention' : 'At risk'}
              </p>
            </div>
          </div>
          <p className="text-xs text-[var(--muted-foreground)] mt-4">Trend ({timeRange})</p>
          {/* Simple trend line placeholder */}
          <div className="h-1.5 mt-2 bg-[var(--muted)] rounded-full overflow-hidden">
            <div className="h-full bg-[var(--accent)] rounded-full" style={{ width: `${stats.avgCompliance}%` }} />
          </div>
        </div>

        {/* Student Risk Map */}
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold">Student Risk Map</h3>
            <div className="flex items-center gap-2">
              {(['low', 'medium', 'high'] as const).map(level => (
                <span key={level} className="px-2.5 py-1 rounded-lg border border-[var(--border)] text-xs font-medium capitalize">
                  {level} ({riskCounts[level]})
                </span>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-48 overflow-y-auto">
            {students.map(s => {
              const risk = getRiskLevel(s.compliance, s.totalPnL);
              return (
                <div key={s.userId} className="border border-[var(--border)] rounded-lg p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-semibold truncate">{s.displayName}</span>
                    <RiskDot level={risk} />
                  </div>
                  <p className="text-[10px] text-[var(--muted-foreground)]">{Math.round(s.compliance)}% compliance</p>
                  <p className={`text-[10px] font-medium ${s.totalPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {s.totalPnL >= 0 ? '+' : '-'}${Math.abs(s.totalPnL).toFixed(0)}
                  </p>
                </div>
              );
            })}

            {students.length === 0 && (
              <div className="col-span-full text-center py-8">
                <p className="text-sm text-[var(--muted-foreground)]">No students yet. Add members to get started.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom row: P&L Distribution + Activity Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* P&L Distribution */}
        <div className="lg:col-span-3 bg-[var(--card)] border border-[var(--border)] rounded-xl p-5">
          <h3 className="font-bold mb-4">P&L Distribution</h3>
          <div className="space-y-3">
            {pnlRows.map(row => (
              <div key={row.label} className="flex items-center gap-3">
                <span className="text-xs text-[var(--muted-foreground)] w-16 text-right shrink-0">{row.label}</span>
                <div className="flex-1 h-5 bg-[var(--muted)] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[var(--accent)] rounded-full transition-all"
                    style={{ width: `${(row.count / maxBucket) * 100}%` }}
                  />
                </div>
                <span className="text-xs font-semibold w-8 text-right">{row.count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Activity Feed */}
        <div className="lg:col-span-2 bg-[var(--card)] border border-[var(--border)] rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold">Activity Feed</h3>
            <button className="flex items-center gap-1 text-xs text-[var(--accent)] font-medium hover:underline">
              View all <ExternalLink size={12} />
            </button>
          </div>

          <div className="space-y-3 max-h-52 overflow-y-auto">
            {activityFeed.map((event, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-full bg-[var(--accent)]/20 flex items-center justify-center text-[10px] font-bold text-[var(--accent)] shrink-0 mt-0.5">
                  {event.displayName[0]?.toUpperCase() ?? '?'}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm">
                    <span className="font-semibold">{event.displayName}</span>{' '}
                    <span className="text-[var(--muted-foreground)]">{event.message}</span>
                  </p>
                </div>
                <span className="text-[10px] text-[var(--muted-foreground)] shrink-0 whitespace-nowrap">
                  {formatTimestamp(event.timestamp)}
                </span>
              </div>
            ))}

            {activityFeed.length === 0 && (
              <p className="text-sm text-[var(--muted-foreground)] text-center py-8">
                No activity yet
              </p>
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
