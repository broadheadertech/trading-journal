'use client';

import {
  Users, UserPlus, ChartBar, CurrencyDollar,
  CreditCard, ShieldWarning, ShieldCheck, Trash,
} from '@phosphor-icons/react';
import { ArrowsDownUp as ArrowUpDown, Pulse as Activity } from '@phosphor-icons/react';
import AdminStatCard from '@/components/admin/AdminStatCard';
import { useAdminDashboard, useAdminRevenueStats, useAdminRecentEvents } from '@/hooks/useAdminStore';
import type { Icon } from '@phosphor-icons/react';

const EVENT_CONFIG: Record<string, { icon: Icon | typeof ArrowUpDown; color: string; label: string }> = {
  user_signup:         { icon: UserPlus,      color: 'var(--green)',  label: 'New signup' },
  subscription_change: { icon: CreditCard,    color: 'var(--teal)',   label: 'Subscription changed' },
  user_banned:         { icon: ShieldWarning, color: 'var(--red)',    label: 'User banned' },
  user_unbanned:       { icon: ShieldCheck,   color: 'var(--green)',  label: 'User unbanned' },
  plan_override:       { icon: ArrowUpDown,   color: 'var(--pink)',   label: 'Plan overridden' },
  data_reset:          { icon: Trash,         color: 'var(--amber)',  label: 'Data reset' },
};

function getRelativeTime(isoString: string): string {
  const diffMs = Date.now() - new Date(isoString).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(isoString).toLocaleDateString();
}

function ActivityRow({ event }: { event: { type: string; userId: string; metadata: string; timestamp: string } }) {
  const config = EVENT_CONFIG[event.type] ?? { icon: Activity, color: 'var(--muted)', label: event.type };
  const Icon = config.icon;

  let detail = '';
  try {
    const meta = JSON.parse(event.metadata);
    if (event.type === 'user_banned' && meta.reason) detail = ` — ${meta.reason}`;
    if (event.type === 'plan_override' && meta.planName) detail = ` to ${meta.planName}`;
    if (event.type === 'subscription_change' && meta.planId) detail = ` (${meta.planId})`;
    if (event.type === 'data_reset' && meta.rowsDeleted) detail = ` — ${meta.rowsDeleted} rows`;
  } catch { /* ignore */ }

  return (
    <div className="flex items-center" style={{ gap: 12, padding: '10px 0', borderBottom: '1px solid var(--hair)' }}>
      <div
        className="flex items-center justify-center shrink-0"
        style={{
          width: 26, height: 26, borderRadius: 2,
          border: `1px solid ${config.color}`,
          background: 'var(--panel-2)',
        }}
      >
        <Icon size={13} style={{ color: config.color }} />
      </div>
      <div className="flex-1 min-w-0">
        <p style={{ margin: 0, fontSize: 12.5, lineHeight: '18px', color: 'var(--text)' }}>
          {config.label}
          <span style={{ color: 'var(--muted)' }}>{detail}</span>
        </p>
        <p style={{ margin: '3px 0 0', fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--muted-2)' }} className="truncate">
          {event.userId.slice(0, 20)}...
        </p>
      </div>
      <span className="shrink-0 whitespace-nowrap" style={{ fontSize: 10.5, color: 'var(--muted-2)' }}>
        {getRelativeTime(event.timestamp)}
      </span>
    </div>
  );
}

export default function AdminDashboard() {
  const stats = useAdminDashboard();
  const { stats: revenue } = useAdminRevenueStats();
  const events = useAdminRecentEvents();

  if (!stats) {
    return (
      <div className="animate-pulse" style={{ maxWidth: 1180 }}>
        <div style={{ height: 32, width: 220, background: 'var(--panel-2)', borderRadius: 2 }} />
        <div className="stats">
          {[...Array(4)].map((_, i) => (
            <div key={i} style={{ height: 104, background: 'var(--panel-2)', border: '1px solid var(--line)', borderRadius: 2 }} />
          ))}
        </div>
      </div>
    );
  }

  const fmt = (n: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);

  return (
    <div style={{ maxWidth: 1180 }}>
      <div className="phead" style={{ marginBottom: 24 }}>
        <p className="eyebrow" style={{ margin: '0 0 12px' }}>Back office</p>
        <h2 style={{ fontSize: 34, lineHeight: '38px' }}>Dashboard</h2>
        <p className="sub" style={{ marginTop: 14, fontSize: 14.5 }}>Platform overview at a glance</p>
      </div>

      <div className="stats" style={{ marginTop: 0 }}>
        <AdminStatCard
          icon={Users}
          label="Total Users"
          value={stats.totalUsers}
          subtitle={`${stats.totalTradeUsers} have traded`}
        />
        <AdminStatCard
          icon={UserPlus}
          label="New Today"
          value={stats.newToday}
          subtitle={`${stats.newThisWeek} this week / ${stats.newThisMonth} this month`}
        />
        <AdminStatCard
          icon={Activity}
          label="Active (7d)"
          value={stats.activeUsers7d}
          subtitle="Users who traded in last 7 days"
        />
        <AdminStatCard
          icon={ChartBar}
          label="Total Trades"
          value={stats.totalTrades.toLocaleString()}
          subtitle="Across all users"
        />
      </div>

      {/* Revenue summary */}
      <div className="split-3" style={{ marginTop: 24 }}>
        <div className="stat" style={{ height: 'auto', minHeight: 104 }}>
          <span className="accent" style={{ background: 'var(--green)' }} />
          <div className="flex items-center" style={{ gap: 8 }}>
            <CurrencyDollar size={13} style={{ color: 'var(--muted-3)', flex: 'none' }} />
            <b>MRR</b>
          </div>
          <em style={{ fontSize: 24, lineHeight: '32px', color: 'var(--green)' }}>{revenue ? fmt(revenue.mrr) : '$0.00'}</em>
          <small style={{ display: 'block', marginTop: 6, fontSize: 10.5, color: 'var(--muted-2)' }}>Monthly recurring revenue</small>
        </div>
        <div className="stat" style={{ height: 'auto', minHeight: 104 }}>
          <span className="accent" style={{ background: 'var(--teal)' }} />
          <div className="flex items-center" style={{ gap: 8 }}>
            <CurrencyDollar size={13} style={{ color: 'var(--muted-3)', flex: 'none' }} />
            <b>ARR</b>
          </div>
          <em style={{ fontSize: 24, lineHeight: '32px', color: 'var(--teal)' }}>{revenue ? fmt(revenue.arr) : '$0.00'}</em>
          <small style={{ display: 'block', marginTop: 6, fontSize: 10.5, color: 'var(--muted-2)' }}>Annual recurring revenue</small>
        </div>
        <div className="stat" style={{ height: 'auto', minHeight: 104 }}>
          <span className="accent" style={{ background: 'var(--amber)' }} />
          <div className="flex items-center" style={{ gap: 8 }}>
            <Users size={13} style={{ color: 'var(--muted-3)', flex: 'none' }} />
            <b>SUBSCRIBERS</b>
          </div>
          <em style={{ fontSize: 24, lineHeight: '32px', color: 'var(--text)' }}>{revenue?.totalActiveSubscribers ?? 0}</em>
          <small style={{ display: 'block', marginTop: 6, fontSize: 10.5, color: 'var(--muted-2)' }}>Active paid users</small>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="card" style={{ marginTop: 24 }}>
        <span className="accent" style={{ width: 56, background: 'var(--amber)' }} />
        <div className="cardhead">
          <div>
            <h3>Recent Activity</h3>
            <p className="sub">Latest platform-wide admin and account events</p>
          </div>
        </div>
        {!events ? (
          <div className="animate-pulse" style={{ marginTop: 18, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {[...Array(5)].map((_, i) => (
              <div key={i} style={{ height: 40, background: 'var(--panel-2)', border: '1px solid var(--line)', borderRadius: 2 }} />
            ))}
          </div>
        ) : events.length === 0 ? (
          <p className="empty-line" style={{ padding: '34px 0 8px' }}>No activity yet.</p>
        ) : (
          <div style={{ marginTop: 18 }}>
            {events.map((event) => (
              <ActivityRow key={event._id} event={event} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
