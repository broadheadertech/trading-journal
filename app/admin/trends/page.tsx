'use client';

import { useState } from 'react';
import { TrendUp } from '@phosphor-icons/react';
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
      <div className="animate-pulse" style={{ maxWidth: 1060, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ height: 24, width: 190, background: 'var(--panel-2)', borderRadius: 2 }} />
        <div style={{ height: 34, width: 260, background: 'var(--panel-2)', borderRadius: 2 }} />
        <div className="split-3">
          <div style={{ height: 88, background: 'var(--panel-2)', border: '1px solid var(--line)', borderRadius: 2 }} />
          <div style={{ height: 88, background: 'var(--panel-2)', border: '1px solid var(--line)', borderRadius: 2 }} />
          <div style={{ height: 88, background: 'var(--panel-2)', border: '1px solid var(--line)', borderRadius: 2 }} />
        </div>
        <div style={{ height: 288, background: 'var(--panel-2)', border: '1px solid var(--line)', borderRadius: 2 }} />
        <div style={{ height: 192, background: 'var(--panel-2)', border: '1px solid var(--line)', borderRadius: 2 }} />
      </div>
    );
  }

  const trends = data.trends;

  // ─── Empty state ───────────────────────────────────────────────────
  if (trends.length === 0) {
    return (
      <div style={{ maxWidth: 1060 }}>
        <Header />
        <RangeSelector selectedDays={selectedDays} onSelect={setSelectedDays} />
        <div className="blank" style={{ marginTop: 24, padding: '52px 28px' }}>
          <span className="corner" style={{ left: -1, top: -1, borderRight: 0, borderBottom: 0 }} />
          <span className="corner" style={{ right: -1, bottom: -1, borderLeft: 0, borderTop: 0 }} />
          <div className="badge" style={{ border: '1px solid rgba(217,148,5,.4)', background: 'var(--panel-2)' }}>
            <TrendUp size={22} style={{ color: 'var(--amber)' }} />
          </div>
          <h4>No snapshot data</h4>
          <p>Daily snapshots are created at midnight UTC. Check back after the first snapshot runs.</p>
        </div>
      </div>
    );
  }

  // ─── Summary stats from latest date ────────────────────────────────
  const latest = trends[trends.length - 1];
  const earliest = trends[0];
  const scoreDrift = latest.avgScore - earliest.avgScore;

  return (
    <div style={{ maxWidth: 1060 }}>
      <Header />
      <RangeSelector selectedDays={selectedDays} onSelect={setSelectedDays} />

      {/* Summary stat cards */}
      <div className="split-3" style={{ marginTop: 24 }}>
        <StatCard label="Avg Score (latest)" value={String(latest.avgScore)} />
        <StatCard label="Median Score (latest)" value={String(latest.medianScore)} />
        <StatCard
          label={`Score Drift (${selectedDays}d)`}
          value={`${scoreDrift >= 0 ? '+' : ''}${scoreDrift.toFixed(1)}`}
          valueClass={scoreDrift > 0 ? 'text-green-400' : scoreDrift < 0 ? 'text-red-400' : undefined}
        />
      </div>

      {/* Score trend chart */}
      <div className="card" style={{ marginTop: 24 }}>
        <span className="accent" style={{ width: 56, background: 'var(--amber)' }} />
        <h3>Score Trends</h3>
        <p className="sub" style={{ marginBottom: 22 }}>Average and median Neuro Score across all tracked users</p>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={trends} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#0e1725" />
            <XAxis
              dataKey="date"
              tickFormatter={shortDate}
              stroke="#182432"
              fontSize={10}
              tick={{ fill: '#5c6b7e' }}
            />
            <YAxis
              stroke="#182432"
              fontSize={10}
              tick={{ fill: '#5c6b7e' }}
              domain={['dataMin - 20', 'dataMax + 20']}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#0c1119',
                border: '1px solid #182432',
                borderRadius: 2,
                color: '#edf2f7',
                fontSize: 12,
              }}
              labelFormatter={shortDate}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Line
              type="monotone"
              dataKey="avgScore"
              name="Avg Score"
              stroke="#d99405"
              strokeWidth={2}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="medianScore"
              name="Median Score"
              stroke="#d99405"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Daily delta chart */}
      <div className="card" style={{ marginTop: 24 }}>
        <span className="accent" style={{ width: 56, background: 'var(--green)' }} />
        <h3>Avg Daily Delta</h3>
        <p className="sub" style={{ marginBottom: 22 }}>Mean score change applied per day</p>
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={trends} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#0e1725" />
            <XAxis
              dataKey="date"
              tickFormatter={shortDate}
              stroke="#182432"
              fontSize={10}
              tick={{ fill: '#5c6b7e' }}
            />
            <YAxis
              stroke="#182432"
              fontSize={10}
              tick={{ fill: '#5c6b7e' }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#0c1119',
                border: '1px solid #182432',
                borderRadius: 2,
                color: '#edf2f7',
                fontSize: 12,
              }}
              labelFormatter={shortDate}
            />
            <Line
              type="monotone"
              dataKey="avgDelta"
              name="Avg Delta"
              stroke="#24c88a"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Stage distribution — latest snapshot */}
      <div className="card" style={{ marginTop: 24 }}>
        <span className="accent" style={{ width: 56, background: 'var(--amber)' }} />
        <h3>Stage Distribution</h3>
        <p className="sub">Latest snapshot: {shortDate(latest.date)}</p>
        <div style={{ marginTop: 22, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {STAGE_ORDER.map((stage) => {
            const count = latest.stageCounts[stage] ?? 0;
            const pct = latest.totalUsers > 0 ? (count / latest.totalUsers) * 100 : 0;
            const color = STAGE_COLORS[stage as Stage]?.accent ?? 'var(--muted)';
            return (
              <div key={stage}>
                <div className="flex items-baseline" style={{ gap: 12, marginBottom: 8 }}>
                  <span className="capitalize" style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.03em', color }}>
                    {stage}
                  </span>
                  <span style={{ marginLeft: 'auto', fontFamily: 'var(--mono)', fontWeight: 500, fontSize: 12.5, color: 'var(--text)' }}>
                    {count}
                  </span>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 11.5, color: 'var(--muted-2)', width: 52, textAlign: 'right' }}>
                    {pct.toFixed(1)}%
                  </span>
                </div>
                <div style={{ height: 2, background: 'var(--rail)', position: 'relative' }}>
                  <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${Math.max(pct, 1)}%`, background: color }} />
                </div>
              </div>
            );
          })}
        </div>
        <p className="note" style={{ marginTop: 22 }}>{latest.totalUsers} users tracked</p>
      </div>

      <p className="footnote">
        Trends computed from daily snapshots (midnight UTC). Data updates via Convex real-time subscriptions.
      </p>
    </div>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function Header() {
  return (
    <div className="phead" style={{ marginBottom: 24 }}>
      <p className="eyebrow" style={{ margin: '0 0 12px' }}>
        <TrendUp size={13} style={{ color: 'var(--amber)' }} />
        Neuro monitoring
      </p>
      <h2 style={{ fontSize: 34, lineHeight: '38px' }}>Score Trends</h2>
      <p className="sub" style={{ marginTop: 14, fontSize: 14.5 }}>
        Monitor Neuro Score distributions over time to detect systemic issues.
      </p>
    </div>
  );
}

function RangeSelector({ selectedDays, onSelect }: { selectedDays: number; onSelect: (d: number) => void }) {
  return (
    <div className="flex flex-wrap" style={{ gap: 8 }}>
      {RANGES.map((r) => (
        <button
          key={r.days}
          onClick={() => onSelect(r.days)}
          className={selectedDays === r.days ? 'chip on' : 'chip'}
        >
          {r.label}
        </button>
      ))}
    </div>
  );
}

function StatCard({ label, value, valueClass }: { label: string; value: string; valueClass?: string }) {
  const tone = valueClass === 'text-green-400' ? 'var(--green)' : valueClass === 'text-red-400' ? 'var(--red)' : 'var(--text)';
  return (
    <div className="stat" style={{ height: 'auto', minHeight: 88 }}>
      <span className="accent" style={{ background: tone }} />
      <b style={{ textTransform: 'uppercase' }}>{label}</b>
      <em style={{ fontSize: 24, lineHeight: '32px', color: tone }}>{value}</em>
    </div>
  );
}
