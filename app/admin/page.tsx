'use client';

import {
  Users, UserPlus, Activity, BarChart3, DollarSign,
  CreditCard, ShieldAlert, ShieldCheck, ArrowUpDown, Trash2,
} from 'lucide-react';
import AdminStatCard from '@/components/admin/AdminStatCard';
import { useAdminDashboard, useAdminRevenueStats, useAdminRecentEvents } from '@/hooks/useAdminStore';
import type { LucideIcon } from 'lucide-react';

const EVENT_CONFIG: Record<string, { icon: LucideIcon; color: string; label: string }> = {
  user_signup:         { icon: UserPlus,    color: 'var(--green)',  label: 'New signup' },
  subscription_change: { icon: CreditCard,  color: 'var(--blue)',   label: 'Subscription changed' },
  user_banned:         { icon: ShieldAlert, color: 'var(--red)',    label: 'User banned' },
  user_unbanned:       { icon: ShieldCheck, color: 'var(--green)',  label: 'User unbanned' },
  plan_override:       { icon: ArrowUpDown, color: 'var(--purple)', label: 'Plan overridden' },
  data_reset:          { icon: Trash2,      color: 'var(--yellow)', label: 'Data reset' },
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
  const config = EVENT_CONFIG[event.type] ?? { icon: Activity, color: 'var(--muted-foreground)', label: event.type };
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
    <div className="flex items-center gap-3 py-2 px-2 rounded-lg hover:bg-[var(--muted)] transition-colors">
      <div className="p-1.5 rounded-md" style={{ backgroundColor: `color-mix(in srgb, ${config.color} 15%, transparent)` }}>
        <Icon size={14} style={{ color: config.color }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-[var(--foreground)]">
          {config.label}
          <span className="text-[var(--muted-foreground)]">{detail}</span>
        </p>
        <p className="text-[10px] text-[var(--muted-foreground)] font-mono truncate">
          {event.userId.slice(0, 20)}...
        </p>
      </div>
      <span className="text-[10px] text-[var(--muted-foreground)] shrink-0">{getRelativeTime(event.timestamp)}</span>
    </div>
  );
}

export default function AdminDashboard() {
  const stats = useAdminDashboard();
  const { stats: revenue } = useAdminRevenueStats();
  const events = useAdminRecentEvents();

  if (!stats) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 w-48 bg-[var(--muted)] rounded" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-[var(--muted)] rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  const fmt = (n: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);

  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <h1 className="text-xl font-bold text-[var(--foreground)]">Dashboard</h1>
        <p className="text-sm text-[var(--muted-foreground)]">Platform overview at a glance</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
          icon={BarChart3}
          label="Total Trades"
          value={stats.totalTrades.toLocaleString()}
          subtitle="Across all users"
        />
      </div>

      {/* Revenue summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[var(--green)]/10">
              <DollarSign size={20} className="text-[var(--green)]" />
            </div>
            <div>
              <p className="text-xs text-[var(--muted-foreground)]">MRR</p>
              <p className="text-xl font-bold text-[var(--foreground)]">{revenue ? fmt(revenue.mrr) : '$0.00'}</p>
              <p className="text-[11px] text-[var(--muted-foreground)]">Monthly recurring revenue</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[var(--blue)]/10">
              <DollarSign size={20} className="text-[var(--blue)]" />
            </div>
            <div>
              <p className="text-xs text-[var(--muted-foreground)]">ARR</p>
              <p className="text-xl font-bold text-[var(--foreground)]">{revenue ? fmt(revenue.arr) : '$0.00'}</p>
              <p className="text-[11px] text-[var(--muted-foreground)]">Annual recurring revenue</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[var(--yellow)]/10">
              <Users size={20} className="text-[var(--yellow)]" />
            </div>
            <div>
              <p className="text-xs text-[var(--muted-foreground)]">Subscribers</p>
              <p className="text-xl font-bold text-[var(--foreground)]">{revenue?.totalActiveSubscribers ?? 0}</p>
              <p className="text-[11px] text-[var(--muted-foreground)]">Active paid users</p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5">
        <h2 className="text-sm font-semibold text-[var(--foreground)] mb-4">Recent Activity</h2>
        {!events ? (
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-10 bg-[var(--muted)] rounded-lg animate-pulse" />
            ))}
          </div>
        ) : events.length === 0 ? (
          <p className="text-sm text-[var(--muted-foreground)] text-center py-6">No activity yet.</p>
        ) : (
          <div className="space-y-0.5">
            {events.map((event) => (
              <ActivityRow key={event._id} event={event} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
