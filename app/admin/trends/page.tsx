'use client';

import { useState } from 'react';
import { TrendingUp } from 'lucide-react';
import { useAdminNeuroScoreTrends } from '@/hooks/useAdminStore';
import { STAGE_COLORS, STAGE_ORDER } from '@/lib/stage-config';
import type { Stage } from '@/lib/types';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts';

// ─── Date range options ─────────────────────────────────────────────────────
const RANGES = [
  { label: '30d', days: 30 },
  { label: '60d', days: 60 },
  { label: '90d', days: 90 },
  { label: 'All', days: 365 },
] as const;

// ─── Helper: short date label ───────────────────────────────────────────────
function shortDate(label: unknown): string {
  const d = new Date(String(label) + 'T00:00:00');
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default function TrendsPage() {
  const [selectedDays, setSelectedDays] = useState(30);
  const data = useAdminNeuroScoreTrends(selectedDays);

  // ─── Loading skeleton ──────────────────────────────────────────────
  if (data === undefined) {
    return (
      <div className="space-y-6 max-w-5xl animate-pulse">
        <div className="h-6 w-48 bg-[var(--muted)] rounded" />
        <div className="h-8 w-64 bg-[var(--muted)] rounded" />
        <div className="flex gap-3">
          <div className="h-20 flex-1 bg-[var(--muted)] rounded-xl" />
          <div className="h-20 flex-1 bg-[var(--muted)] rounded-xl" />
          <div className="h-20 flex-1 bg-[var(--muted)] rounded-xl" />
        </div>
        <div className="h-72 bg-[var(--muted)] rounded-xl" />
        <div className="h-48 bg-[var(--muted)] rounded-xl" />
      </div>
    );
  }

  const trends = data.trends;

  // ─── Empty state ───────────────────────────────────────────────────
  if (trends.length === 0) {
    return (
      <div className="space-y-6 max-w-5xl">
        <Header />
        <RangeSelector selectedDays={selectedDays} onSelect={setSelectedDays} />
        <div className="text-center py-16 text-[var(--muted-foreground)]">
          <TrendingUp size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm font-medium">No snapshot data available for this period.</p>
          <p className="text-xs mt-1">Daily snapshots are created at midnight UTC. Check back after the first snapshot runs.</p>
        </div>
      </div>
    );
  }

  // ─── Summary stats from latest date ────────────────────────────────
  const latest = trends[trends.length - 1];
  const earliest = trends[0];
  const scoreDrift = latest.avgScore - earliest.avgScore;

  return (
    <div className="space-y-6 max-w-5xl">
      <Header />
      <RangeSelector selectedDays={selectedDays} onSelect={setSelectedDays} />

      {/* Summary stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <StatCard label="Avg Score (latest)" value={String(latest.avgScore)} />
        <StatCard label="Median Score (latest)" value={String(latest.medianScore)} />
        <StatCard
          label={`Score Drift (${selectedDays}d)`}
          value={`${scoreDrift >= 0 ? '+' : ''}${scoreDrift.toFixed(1)}`}
          valueClass={scoreDrift > 0 ? 'text-green-400' : scoreDrift < 0 ? 'text-red-400' : undefined}
        />
      </div>

      {/* Score trend chart */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] px-5 py-4">
        <p className="text-sm font-semibold text-[var(--foreground)] mb-4">Score Trends</p>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={trends} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis
              dataKey="date"
              tickFormatter={shortDate}
              stroke="var(--muted-foreground)"
              fontSize={11}
              tick={{ fill: 'var(--muted-foreground)' }}
            />
            <YAxis
              stroke="var(--muted-foreground)"
              fontSize={11}
              tick={{ fill: 'var(--muted-foreground)' }}
              domain={['dataMin - 20', 'dataMax + 20']}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'var(--card)',
                border: '1px solid var(--border)',
                borderRadius: 8,
                color: 'var(--foreground)',
                fontSize: 12,
              }}
              labelFormatter={shortDate}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Line
              type="monotone"
              dataKey="avgScore"
              name="Avg Score"
              stroke="hsl(220, 70%, 55%)"
              strokeWidth={2}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="medianScore"
              name="Median Score"
              stroke="hsl(45, 80%, 55%)"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Daily delta chart */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] px-5 py-4">
        <p className="text-sm font-semibold text-[var(--foreground)] mb-4">Avg Daily Delta</p>
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={trends} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis
              dataKey="date"
              tickFormatter={shortDate}
              stroke="var(--muted-foreground)"
              fontSize={11}
              tick={{ fill: 'var(--muted-foreground)' }}
            />
            <YAxis
              stroke="var(--muted-foreground)"
              fontSize={11}
              tick={{ fill: 'var(--muted-foreground)' }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'var(--card)',
                border: '1px solid var(--border)',
                borderRadius: 8,
                color: 'var(--foreground)',
                fontSize: 12,
              }}
              labelFormatter={shortDate}
            />
            <Line
              type="monotone"
              dataKey="avgDelta"
              name="Avg Delta"
              stroke="hsl(142, 60%, 55%)"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Stage distribution — latest snapshot */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] px-5 py-4">
        <p className="text-sm font-semibold text-[var(--foreground)] mb-3">
          Stage Distribution
          <span className="text-[var(--muted-foreground)] font-normal ml-1.5">(latest: {shortDate(latest.date)})</span>
        </p>
        <div className="space-y-2">
          {STAGE_ORDER.map((stage) => {
            const count = latest.stageCounts[stage] ?? 0;
            const pct = latest.totalUsers > 0 ? (count / latest.totalUsers) * 100 : 0;
            const color = STAGE_COLORS[stage as Stage]?.accent ?? 'var(--muted-foreground)';
            return (
              <div key={stage} className="flex items-center gap-3 text-sm">
                <span
                  className="w-16 text-xs font-semibold capitalize"
                  style={{ color }}
                >
                  {stage}
                </span>
                <div className="flex-1 h-5 bg-[var(--muted)]/30 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${Math.max(pct, 1)}%`, backgroundColor: color, opacity: 0.7 }}
                  />
                </div>
                <span className="w-10 text-right text-xs tabular-nums text-[var(--muted-foreground)]">
                  {count}
                </span>
                <span className="w-12 text-right text-xs tabular-nums text-[var(--muted-foreground)]">
                  {pct.toFixed(1)}%
                </span>
              </div>
            );
          })}
        </div>
        <p className="text-xs text-[var(--muted-foreground)] mt-2">
          {latest.totalUsers} users tracked
        </p>
      </div>

      <p className="text-xs text-[var(--muted-foreground)]">
        Trends computed from daily snapshots (midnight UTC). Data updates via Convex real-time subscriptions.
      </p>
    </div>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function Header() {
  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <TrendingUp size={20} className="text-[var(--accent)]" />
        <h1 className="text-xl font-bold text-[var(--foreground)]">Score Trends</h1>
      </div>
      <p className="text-sm text-[var(--muted-foreground)]">
        Monitor Neuro Score distributions over time to detect systemic issues.
      </p>
    </div>
  );
}

function RangeSelector({ selectedDays, onSelect }: { selectedDays: number; onSelect: (d: number) => void }) {
  return (
    <div className="flex gap-1.5">
      {RANGES.map((r) => (
        <button
          key={r.days}
          onClick={() => onSelect(r.days)}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            selectedDays === r.days
              ? 'bg-[var(--accent)] text-white'
              : 'bg-[var(--muted)]/40 text-[var(--muted-foreground)] hover:bg-[var(--muted)]'
          }`}
        >
          {r.label}
        </button>
      ))}
    </div>
  );
}

function StatCard({ label, value, valueClass }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-3">
      <p className="text-[10px] uppercase tracking-wider text-[var(--muted-foreground)] mb-1">{label}</p>
      <p className={`text-lg font-bold tabular-nums ${valueClass ?? 'text-[var(--foreground)]'}`}>{value}</p>
    </div>
  );
}
