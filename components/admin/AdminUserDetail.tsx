'use client';

import { useMemo, useState } from 'react';
import {
  X, ShieldAlert, ShieldCheck, Activity, User as UserIcon,
  TrendingUp, TrendingDown, BookOpen, Map, Brain, AlertTriangle,
  Zap, Sparkles, Target, FileText, CreditCard, Crown,
  ChevronDown, ChevronRight,
} from 'lucide-react';
import {
  useAdminUserDetail,
  useAdminUserSubscription,
  useAdminPlans,
  useAdminUserActivityTimeline,
} from '@/hooks/useAdminStore';

interface AdminUserDetailProps {
  userId: string;
  onClose: () => void;
  onBan: (userId: string, reason: string) => Promise<unknown>;
  onUnban: (userId: string) => Promise<unknown>;
  onOverridePlan: (userId: string, planId: string) => Promise<unknown>;
  onResetData: (userId: string) => Promise<unknown>;
}

type TabId = 'overview' | 'activity';

export default function AdminUserDetail({
  userId, onClose, onBan, onUnban, onOverridePlan, onResetData,
}: AdminUserDetailProps) {
  const detail = useAdminUserDetail(userId);
  const subscription = useAdminUserSubscription(userId);
  const { plans } = useAdminPlans();
  const [tab, setTab] = useState<TabId>('overview');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col animate-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[var(--border)] shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <h3 className="text-sm font-bold text-[var(--foreground)]">User Detail</h3>
            {detail && (
              <span className="font-mono text-[10px] text-[var(--muted-foreground)] truncate">
                {detail.userId}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-[var(--muted)] text-[var(--muted-foreground)] shrink-0"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[var(--border)] shrink-0">
          <TabButton active={tab === 'overview'} onClick={() => setTab('overview')} icon={<UserIcon size={14} />} label="Overview" />
          <TabButton active={tab === 'activity'} onClick={() => setTab('activity')} icon={<Activity size={14} />} label="Activity" />
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {tab === 'overview' && (
            !detail ? (
              <div className="p-6 text-center text-sm text-[var(--muted-foreground)] animate-pulse">Loading…</div>
            ) : (
              <OverviewPanel
                userId={userId}
                detail={detail}
                subscription={subscription ?? null}
                plans={plans ?? null}
                onBan={onBan}
                onUnban={onUnban}
                onOverridePlan={onOverridePlan}
                onResetData={onResetData}
              />
            )
          )}
          {tab === 'activity' && <ActivityPanel userId={userId} />}
        </div>
      </div>
    </div>
  );
}

function TabButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2.5 text-xs font-medium border-b-2 transition-colors flex items-center gap-2 ${
        active
          ? 'border-[var(--accent)] text-[var(--foreground)]'
          : 'border-transparent text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

/* ─── Overview ────────────────────────────────────────────────────── */

interface OverviewProps {
  userId: string;
  detail: NonNullable<ReturnType<typeof useAdminUserDetail>>;
  subscription: ReturnType<typeof useAdminUserSubscription> | null;
  plans: ReturnType<typeof useAdminPlans>['plans'] | null;
  onBan: (userId: string, reason: string) => Promise<unknown>;
  onUnban: (userId: string) => Promise<unknown>;
  onOverridePlan: (userId: string, planId: string) => Promise<unknown>;
  onResetData: (userId: string) => Promise<unknown>;
}

function OverviewPanel({
  userId, detail, subscription, plans,
  onBan, onUnban, onOverridePlan, onResetData,
}: OverviewProps) {
  const [banReason, setBanReason] = useState('');
  const [showBanInput, setShowBanInput] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState('');
  const [busy, setBusy] = useState(false);

  const handleBan = async () => {
    if (!banReason.trim()) return;
    setBusy(true);
    try {
      await onBan(userId, banReason.trim());
      setShowBanInput(false);
      setBanReason('');
    } finally {
      setBusy(false);
    }
  };

  const handleUnban = async () => {
    setBusy(true);
    try { await onUnban(userId); } finally { setBusy(false); }
  };

  const handleOverridePlan = async () => {
    if (!selectedPlan) return;
    setBusy(true);
    try {
      await onOverridePlan(userId, selectedPlan);
      setSelectedPlan('');
    } finally {
      setBusy(false);
    }
  };

  const handleReset = async () => {
    if (!confirm(`Delete ALL data for user ${userId.slice(0, 16)}...? This cannot be undone.`)) return;
    if (!confirm('SECOND CONFIRMATION: This will permanently delete all trades, journals, strategies, and other data for this user.')) return;
    setBusy(true);
    try { await onResetData(userId); } finally { setBusy(false); }
  };

  return (
    <div className="p-4 space-y-3 max-w-md mx-auto">
      <Row label="Signed Up" value={detail.signedUp ? new Date(detail.signedUp).toLocaleDateString() : '—'} />
      <Row label="Capital" value={`${detail.currency} ${detail.initialCapital.toLocaleString()}`} />

      <div className="flex items-center justify-between text-sm">
        <span className="text-[var(--muted-foreground)]">Status</span>
        {detail.isBanned ? (
          <span className="flex items-center gap-1.5 text-amber-400">
            <ShieldAlert size={14} /> Banned
          </span>
        ) : (
          <span className="flex items-center gap-1.5 text-[var(--green)]">
            <ShieldCheck size={14} /> Active
          </span>
        )}
      </div>
      {detail.isBanned && detail.bannedReason && (
        <div className="text-xs text-[var(--muted-foreground)] bg-amber-500/5 px-3 py-2 rounded-lg">
          Reason: {detail.bannedReason}
        </div>
      )}

      <div className="border-t border-[var(--border)] pt-3 space-y-3">
        <Row label="Total Trades" value={String(detail.tradeCount)} />
        <Row label="Open / Closed" value={`${detail.openTrades} / ${detail.closedTrades}`} />
        <Row
          label="Total PnL"
          value={`$${detail.totalPnL.toFixed(2)}`}
          valueClass={detail.totalPnL >= 0 ? 'text-[var(--green)]' : 'text-[var(--red)]'}
        />
        <Row label="Win Rate" value={`${detail.winRate.toFixed(1)}%`} />
        <Row label="Strategies" value={String(detail.strategyCount)} />
        <Row label="Reflections" value={String(detail.reflectionCount)} />
      </div>

      <div className="border-t border-[var(--border)] pt-3 space-y-3">
        <Row label="Current Plan" value={subscription?.planId ?? 'free'} />
        <Row label="Sub Status" value={subscription?.status ?? 'free'} />

        <div className="flex items-center gap-2">
          <select
            value={selectedPlan}
            onChange={(e) => setSelectedPlan(e.target.value)}
            className="flex-1 px-2 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--input-bg)] text-xs text-[var(--foreground)]"
          >
            <option value="">Select plan...</option>
            <option value="free">Free</option>
            {plans?.filter((p) => p.isActive).map((p) => (
              <option key={p.planId} value={p.planId}>{p.name}</option>
            ))}
          </select>
          <button
            onClick={handleOverridePlan}
            disabled={busy || !selectedPlan}
            className="px-3 py-1.5 rounded-lg bg-[var(--accent)] text-white text-xs font-medium disabled:opacity-50 transition-colors"
          >
            Override
          </button>
        </div>
      </div>

      <div className="border-t border-[var(--border)] pt-3 space-y-2">
        {detail.isBanned ? (
          <button
            onClick={handleUnban}
            disabled={busy}
            className="w-full py-2 rounded-lg bg-[var(--green)]/10 text-[var(--green)] text-xs font-medium hover:bg-[var(--green)]/20 transition-colors disabled:opacity-50"
          >
            Unban User
          </button>
        ) : showBanInput ? (
          <div className="space-y-2">
            <input
              type="text"
              placeholder="Ban reason..."
              value={banReason}
              onChange={(e) => setBanReason(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--input-bg)] text-xs text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]"
            />
            <div className="flex gap-2">
              <button
                onClick={handleBan}
                disabled={busy || !banReason.trim()}
                className="flex-1 py-2 rounded-lg bg-amber-500 text-slate-900 text-xs font-semibold disabled:opacity-50 transition-colors hover:bg-amber-400"
              >
                Confirm Ban
              </button>
              <button
                onClick={() => { setShowBanInput(false); setBanReason(''); }}
                className="flex-1 py-2 rounded-lg border border-[var(--border)] text-[var(--muted-foreground)] text-xs font-medium hover:bg-[var(--muted)] transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowBanInput(true)}
            disabled={busy}
            className="w-full py-2 rounded-lg border border-amber-500/30 text-amber-300 text-xs font-medium hover:bg-amber-500/10 transition-colors disabled:opacity-50"
          >
            Ban User
          </button>
        )}
      </div>

      <div className="border-t border-amber-500/20 pt-3">
        <p className="text-[10px] font-medium text-amber-300 mb-2 uppercase tracking-wide">Danger Zone</p>
        <button
          onClick={handleReset}
          disabled={busy}
          className="w-full py-2 rounded-lg border border-[var(--red)]/30 text-[var(--red)] text-xs font-medium hover:bg-[var(--red)]/10 transition-colors disabled:opacity-50"
        >
          Reset All User Data
        </button>
      </div>
    </div>
  );
}

function Row({ label, value, mono, valueClass }: { label: string; value: string; mono?: boolean; valueClass?: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-[var(--muted-foreground)]">{label}</span>
      <span className={`font-medium ${mono ? 'text-xs' : ''} ${valueClass ?? 'text-[var(--foreground)]'}`}>
        {value}
      </span>
    </div>
  );
}

/* ─── Activity timeline ───────────────────────────────────────────── */

type EventStyle = { icon: typeof Activity; tint: string; label: string };

const EVENT_STYLES: Record<string, EventStyle> = {
  trade_logged:             { icon: TrendingUp,     tint: 'text-cyan-400 bg-cyan-500/10',         label: 'Trade logged' },
  trade_closed:             { icon: TrendingDown,   tint: 'text-emerald-400 bg-emerald-500/10',   label: 'Trade closed' },
  strategy_created:         { icon: BookOpen,       tint: 'text-pink-400 bg-pink-500/10',         label: 'Strategy' },
  checklist_created:        { icon: Map,            tint: 'text-orange-400 bg-orange-500/10',     label: 'Checklist' },
  journal_entry:            { icon: FileText,       tint: 'text-purple-400 bg-purple-500/10',     label: 'Journal' },
  monthly_goal:             { icon: Target,         tint: 'text-amber-400 bg-amber-500/10',       label: 'Goal' },
  trigger_entry:            { icon: Zap,            tint: 'text-rose-400 bg-rose-500/10',         label: 'Trigger' },
  daily_reflection:         { icon: Sparkles,       tint: 'text-violet-400 bg-violet-500/10',     label: 'Reflection' },
  weekly_review:            { icon: Sparkles,       tint: 'text-fuchsia-400 bg-fuchsia-500/10',   label: 'Review' },
  rule_break:               { icon: AlertTriangle,  tint: 'text-red-400 bg-red-500/10',           label: 'Rule break' },
  circuit_breaker:          { icon: AlertTriangle,  tint: 'text-red-400 bg-red-500/10',           label: 'Circuit breaker' },
  circuit_breaker_override: { icon: AlertTriangle,  tint: 'text-amber-400 bg-amber-500/10',       label: 'CB override' },
  score_event:              { icon: Brain,          tint: 'text-blue-400 bg-blue-500/10',         label: 'Brain score' },
  anti_gaming_flag:         { icon: ShieldAlert,    tint: 'text-red-400 bg-red-500/10',           label: 'Anti-gaming' },
  subscription_created:     { icon: CreditCard,     tint: 'text-emerald-400 bg-emerald-500/10',   label: 'Subscription' },
  subscription_change:      { icon: CreditCard,     tint: 'text-emerald-400 bg-emerald-500/10',   label: 'Sub change' },
  signup:                   { icon: UserIcon,       tint: 'text-cyan-400 bg-cyan-500/10',         label: 'Signup' },
};

function styleFor(type: string): EventStyle {
  if (type.startsWith('admin:')) return { icon: Crown, tint: 'text-amber-400 bg-amber-500/10', label: 'Admin action' };
  return EVENT_STYLES[type] ?? { icon: Activity, tint: 'text-slate-400 bg-slate-500/10', label: type };
}

function formatTimeAgo(iso: string) {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return iso;
  const sec = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (sec < 60) return `${sec}s ago`;
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
  if (sec < 86400 * 30) return `${Math.floor(sec / 86400)}d ago`;
  return new Date(iso).toLocaleDateString();
}

// Surface every event type the timeline knows about as a quick filter chip.
// Order matters — most-clicked first.
const FILTER_CHIPS: { type: string; label: string }[] = [
  { type: 'trade_logged',        label: 'Trades' },
  { type: 'trade_closed',        label: 'Closes' },
  { type: 'rule_break',          label: 'Rule breaks' },
  { type: 'anti_gaming_flag',    label: 'Anti-gaming' },
  { type: 'circuit_breaker',     label: 'Circuit breakers' },
  { type: 'score_event',         label: 'Brain score' },
  { type: 'journal_entry',       label: 'Journal' },
  { type: 'daily_reflection',    label: 'Reflections' },
  { type: 'trigger_entry',       label: 'Triggers' },
  { type: 'strategy_created',    label: 'Strategies' },
  { type: 'subscription_change', label: 'Subscription' },
];

function ActivityPanel({ userId }: { userId: string }) {
  const [filters, setFilters] = useState<string[]>([]);
  const data = useAdminUserActivityTimeline(
    userId,
    useMemo(() => ({ perSourceLimit: 120, types: filters.length ? filters : undefined }), [filters]),
  );

  const events = data?.events ?? [];
  const counts = data?.totalCounts;

  const toggle = (t: string) =>
    setFilters((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));

  return (
    <div className="p-4 space-y-4">
      {/* Lifetime stat strip — what's on file across all tables */}
      {counts && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2">
          <StatCell label="Trades"      value={counts.trades} />
          <StatCell label="Strategies"  value={counts.strategies} />
          <StatCell label="Reflections" value={counts.dailyReflections} />
          <StatCell label="Journal"     value={counts.journalEntries} />
          <StatCell label="Rule breaks" value={counts.ruleBreakLogs} tone={counts.ruleBreakLogs > 0 ? 'red' : 'normal'} />
          <StatCell label="Circuit hits" value={counts.circuitBreakerEvents} tone={counts.circuitBreakerEvents > 0 ? 'red' : 'normal'} />
          <StatCell label="Brain events" value={counts.scoreEvents} />
          <StatCell label="Triggers"    value={counts.triggerEntries} />
          <StatCell label="Checklists"  value={counts.checklists} />
          <StatCell label="Goals"       value={counts.monthlyGoals} />
          <StatCell label="Weekly reviews" value={counts.weeklyReviews} />
        </div>
      )}

      {/* Filter chips */}
      <div className="flex flex-wrap gap-1.5">
        <button
          onClick={() => setFilters([])}
          className={`px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors ${
            filters.length === 0
              ? 'border-[var(--accent)] text-[var(--accent)] bg-[var(--accent)]/10'
              : 'border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
          }`}
        >
          All
        </button>
        {FILTER_CHIPS.map((c) => {
          const active = filters.includes(c.type);
          return (
            <button
              key={c.type}
              onClick={() => toggle(c.type)}
              className={`px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors ${
                active
                  ? 'border-[var(--accent)] text-[var(--accent)] bg-[var(--accent)]/10'
                  : 'border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
              }`}
            >
              {c.label}
            </button>
          );
        })}
      </div>

      {/* Timeline */}
      {!data ? (
        <div className="text-center text-sm text-[var(--muted-foreground)] animate-pulse py-12">Loading activity…</div>
      ) : events.length === 0 ? (
        <div className="text-center text-sm text-[var(--muted-foreground)] py-12">No activity matches the current filter.</div>
      ) : (
        <ul className="space-y-1.5">
          {events.map((e) => (
            <TimelineRow key={e.id} event={e} />
          ))}
        </ul>
      )}
    </div>
  );
}

function StatCell({ label, value, tone = 'normal' }: { label: string; value: number; tone?: 'normal' | 'red' }) {
  return (
    <div className={`rounded-lg border px-2.5 py-2 ${tone === 'red' ? 'border-red-500/30 bg-red-500/5' : 'border-[var(--border)] bg-[var(--muted)]/30'}`}>
      <div className="text-[9px] uppercase tracking-wide text-[var(--muted-foreground)]">{label}</div>
      <div className={`text-base font-bold ${tone === 'red' ? 'text-red-400' : 'text-[var(--foreground)]'}`}>{value}</div>
    </div>
  );
}

interface TimelineEvent {
  id: string;
  type: string;
  timestamp: string;
  summary: string;
  meta?: Record<string, unknown> | null;
}

function TimelineRow({ event }: { event: TimelineEvent }) {
  const [open, setOpen] = useState(false);
  const style = styleFor(event.type);
  const Icon = style.icon;
  const hasMeta = event.meta && Object.keys(event.meta).length > 0;

  return (
    <li className="rounded-lg border border-[var(--border)] bg-[var(--muted)]/20 hover:bg-[var(--muted)]/40 transition-colors">
      <button
        onClick={() => hasMeta && setOpen((v) => !v)}
        disabled={!hasMeta}
        className="w-full flex items-start gap-3 p-2.5 text-left"
      >
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${style.tint}`}>
          <Icon size={14} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">{style.label}</span>
            <span className="text-[10px] text-[var(--muted-foreground)]">{formatTimeAgo(event.timestamp)}</span>
            <span className="text-[10px] text-[var(--muted-foreground)] font-mono">
              {new Date(event.timestamp).toLocaleString()}
            </span>
          </div>
          <div className="text-sm text-[var(--foreground)] truncate">{event.summary}</div>
        </div>
        {hasMeta && (
          <span className="text-[var(--muted-foreground)] shrink-0 mt-1">
            {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </span>
        )}
      </button>
      {open && hasMeta && (
        <pre className="px-3 pb-3 pt-0 text-[10px] text-[var(--muted-foreground)] font-mono overflow-x-auto">
{JSON.stringify(event.meta, null, 2)}
        </pre>
      )}
    </li>
  );
}
