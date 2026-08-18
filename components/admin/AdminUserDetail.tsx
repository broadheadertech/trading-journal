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
    <div className="atlas-dash fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,.7)' }} onClick={onClose}>
      <div
        className="w-full max-w-4xl max-h-[90vh] flex flex-col"
        style={{ background: '#080d14', border: '1px solid var(--line-2)', borderRadius: 2, position: 'relative' }}
        onClick={(e) => e.stopPropagation()}
      >
        <span className="accent" style={{ position: 'absolute', left: 0, top: -1, width: 120, height: 3, background: 'var(--amber)' }} />
        {/* Header */}
        <div
          className="flex items-center justify-between shrink-0"
          style={{ padding: '16px 22px', borderBottom: '1px solid var(--line)' }}
        >
          <div className="flex items-center min-w-0" style={{ gap: 14 }}>
            <h3 style={{ margin: 0, fontFamily: 'var(--display)', fontWeight: 700, fontSize: 15, color: 'var(--text)' }}>User Detail</h3>
            {detail && (
              <span className="truncate" style={{ fontFamily: 'var(--mono)', fontSize: 10.5, color: 'var(--muted-2)' }}>
                {detail.userId}
              </span>
            )}
          </div>
          <button onClick={onClose} className="shrink-0" style={{ color: 'var(--muted)' }}>
            <X size={18} />
          </button>
        </div>

        {/* Tabs */}
        <div className="tabs line shrink-0" style={{ marginBottom: 0, padding: '0 12px' }}>
          <TabButton active={tab === 'overview'} onClick={() => setTab('overview')} icon={<UserIcon size={14} />} label="Overview" />
          <TabButton active={tab === 'activity'} onClick={() => setTab('activity')} icon={<Activity size={14} />} label="Activity" />
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {tab === 'overview' && (
            !detail ? (
              <p className="empty-line animate-pulse">Loading…</p>
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
      className={`flex items-center ${active ? 'on' : ''}`}
      style={{ gap: 8 }}
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
    <div className="max-w-md mx-auto" style={{ padding: '20px 22px 28px' }}>
      <Row label="Signed Up" value={detail.signedUp ? new Date(detail.signedUp).toLocaleDateString() : '—'} />
      <Row label="Capital" value={`${detail.currency} ${detail.initialCapital.toLocaleString()}`} />

      <div className="mrow">
        <span className="ic" />
        <span className="lb" style={{ marginLeft: 0 }}>Status</span>
        {detail.isBanned ? (
          <span className="chip" style={{ marginLeft: 'auto', height: 22, padding: '0 10px', fontSize: 10.5, color: 'var(--amber)' }}>
            <ShieldAlert size={12} /> Banned
          </span>
        ) : (
          <span className="chip" style={{ marginLeft: 'auto', height: 22, padding: '0 10px', fontSize: 10.5, color: 'var(--green)' }}>
            <ShieldCheck size={12} /> Active
          </span>
        )}
      </div>
      {detail.isBanned && detail.bannedReason && (
        <div className="warn" style={{ marginTop: 14 }}>
          Reason: {detail.bannedReason}
        </div>
      )}

      <div style={{ marginTop: 20, paddingTop: 4, borderTop: '1px solid var(--line)' }}>
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

      <div style={{ marginTop: 20, paddingTop: 4, borderTop: '1px solid var(--line)' }}>
        <Row label="Current Plan" value={subscription?.planId ?? 'free'} />
        <Row label="Sub Status" value={subscription?.status ?? 'free'} />

        <div className="flex items-center" style={{ gap: 10, marginTop: 16 }}>
          <select
            value={selectedPlan}
            onChange={(e) => setSelectedPlan(e.target.value)}
            className="flex-1 min-w-0"
            style={{
              height: 36, padding: '0 12px', borderRadius: 2,
              border: '1px solid var(--line)', background: 'var(--panel-2)',
              fontSize: 12.5, color: 'var(--text)', outline: 'none',
            }}
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
            className="btn-a"
            style={{ height: 36, flex: 'none', opacity: busy || !selectedPlan ? 0.5 : 1 }}
          >
            Override
          </button>
        </div>
      </div>

      <div style={{ marginTop: 20, paddingTop: 18, borderTop: '1px solid var(--line)' }}>
        {detail.isBanned ? (
          <button
            onClick={handleUnban}
            disabled={busy}
            className="w-full flex items-center justify-center"
            style={{
              height: 38, borderRadius: 2, border: '1px solid rgba(36,200,138,.35)',
              background: '#0b1712', fontWeight: 700, fontSize: 12.5,
              color: 'var(--green)', opacity: busy ? 0.5 : 1,
            }}
          >
            Unban User
          </button>
        ) : showBanInput ? (
          <div className="field">
            <input
              type="text"
              placeholder="Ban reason..."
              value={banReason}
              onChange={(e) => setBanReason(e.target.value)}
              className="w-full"
              style={{
                height: 38, padding: '0 14px', borderRadius: 2,
                border: '1px solid var(--line)', background: 'var(--panel-2)',
                fontSize: 12.5, color: 'var(--text)', outline: 'none',
              }}
            />
            <div className="flex" style={{ gap: 10, marginTop: 10 }}>
              <button
                onClick={handleBan}
                disabled={busy || !banReason.trim()}
                className="btn-a flex-1"
                style={{ height: 38, opacity: busy || !banReason.trim() ? 0.5 : 1 }}
              >
                Confirm Ban
              </button>
              <button
                onClick={() => { setShowBanInput(false); setBanReason(''); }}
                className="btn-g flex-1"
                style={{ height: 38 }}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowBanInput(true)}
            disabled={busy}
            className="w-full flex items-center justify-center"
            style={{
              height: 38, borderRadius: 2, border: '1px solid #3a2a12',
              background: '#14100a', fontWeight: 700, fontSize: 12.5,
              color: 'var(--amber)', opacity: busy ? 0.5 : 1,
            }}
          >
            Ban User
          </button>
        )}
      </div>

      <div style={{ marginTop: 20, paddingTop: 18, borderTop: '1px solid #3a1218' }}>
        <div className="flex items-center" style={{ gap: 8, marginBottom: 12 }}>
          <AlertTriangle size={13} style={{ color: 'var(--red)' }} />
          <p className="lbl" style={{ margin: 0, color: 'var(--red)' }}>DANGER ZONE</p>
        </div>
        <button
          onClick={handleReset}
          disabled={busy}
          className="w-full flex items-center justify-center"
          style={{
            height: 38, borderRadius: 2, border: '1px solid #3a1218',
            background: '#160a0d', fontWeight: 700, fontSize: 12.5,
            color: 'var(--red)', opacity: busy ? 0.5 : 1,
          }}
        >
          Reset All User Data
        </button>
      </div>
    </div>
  );
}

function Row({ label, value, mono, valueClass }: { label: string; value: string; mono?: boolean; valueClass?: string }) {
  const tone =
    valueClass === 'text-[var(--green)]' ? 'var(--green)'
    : valueClass === 'text-[var(--red)]' ? 'var(--red)'
    : 'var(--text)';
  return (
    <div className="mrow">
      <span className="ic" />
      <span className="lb" style={{ marginLeft: 0 }}>{label}</span>
      <span className="val" style={{ color: tone, fontSize: mono ? 11.5 : undefined }}>
        {value}
      </span>
    </div>
  );
}

/* ─── Activity timeline ───────────────────────────────────────────── */

type EventStyle = { icon: typeof Activity; tint: string; label: string };

const EVENT_STYLES: Record<string, EventStyle> = {
  trade_logged:             { icon: TrendingUp,     tint: 'var(--teal)',   label: 'Trade logged' },
  trade_closed:             { icon: TrendingDown,   tint: 'var(--green)',  label: 'Trade closed' },
  strategy_created:         { icon: BookOpen,       tint: 'var(--pink)',   label: 'Strategy' },
  checklist_created:        { icon: Map,            tint: 'var(--amber)',  label: 'Checklist' },
  journal_entry:            { icon: FileText,       tint: 'var(--pink)',   label: 'Journal' },
  monthly_goal:             { icon: Target,         tint: 'var(--amber)',  label: 'Goal' },
  trigger_entry:            { icon: Zap,            tint: 'var(--amber)',  label: 'Trigger' },
  daily_reflection:         { icon: Sparkles,       tint: 'var(--pink)',   label: 'Reflection' },
  weekly_review:            { icon: Sparkles,       tint: 'var(--pink)',   label: 'Review' },
  rule_break:               { icon: AlertTriangle,  tint: 'var(--red)',    label: 'Rule break' },
  circuit_breaker:          { icon: AlertTriangle,  tint: 'var(--red)',    label: 'Circuit breaker' },
  circuit_breaker_override: { icon: AlertTriangle,  tint: 'var(--amber)',  label: 'CB override' },
  score_event:              { icon: Brain,          tint: 'var(--amber)',  label: 'Brain score' },
  anti_gaming_flag:         { icon: ShieldAlert,    tint: 'var(--red)',    label: 'Anti-gaming' },
  subscription_created:     { icon: CreditCard,     tint: 'var(--green)',  label: 'Subscription' },
  subscription_change:      { icon: CreditCard,     tint: 'var(--green)',  label: 'Sub change' },
  signup:                   { icon: UserIcon,       tint: 'var(--teal)',   label: 'Signup' },
};

function styleFor(type: string): EventStyle {
  if (type.startsWith('admin:')) return { icon: Crown, tint: 'var(--amber)', label: 'Admin action' };
  return EVENT_STYLES[type] ?? { icon: Activity, tint: 'var(--muted)', label: type };
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
    <div style={{ padding: '20px 22px 28px' }}>
      {/* Lifetime stat strip — what's on file across all tables */}
      {counts && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6" style={{ gap: 8 }}>
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
      <div className="flex flex-wrap" style={{ gap: 8, marginTop: 18 }}>
        <button
          onClick={() => setFilters([])}
          className={filters.length === 0 ? 'chip on' : 'chip'}
        >
          All
        </button>
        {FILTER_CHIPS.map((c) => {
          const active = filters.includes(c.type);
          return (
            <button
              key={c.type}
              onClick={() => toggle(c.type)}
              className={active ? 'chip on' : 'chip'}
            >
              {c.label}
            </button>
          );
        })}
      </div>

      {/* Timeline */}
      {!data ? (
        <p className="empty-line animate-pulse">Loading activity…</p>
      ) : events.length === 0 ? (
        <p className="empty-line">No activity matches the current filter.</p>
      ) : (
        <ul style={{ listStyle: 'none', margin: '18px 0 0', padding: 0 }}>
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
    <div
      className="inset"
      style={{ padding: '10px 12px', borderColor: tone === 'red' ? '#3a1218' : undefined }}
    >
      <p className="lbl" style={{ textTransform: 'uppercase' }}>{label}</p>
      <div style={{ marginTop: 6, fontFamily: 'var(--mono)', fontWeight: 500, fontSize: 16, lineHeight: '20px', color: tone === 'red' ? 'var(--red)' : 'var(--text)' }}>
        {value}
      </div>
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
    <li style={{ border: '1px solid var(--line)', borderRadius: 2, background: 'var(--panel-2)', marginBottom: 8 }}>
      <button
        onClick={() => hasMeta && setOpen((v) => !v)}
        disabled={!hasMeta}
        className="w-full flex items-start text-left"
        style={{ gap: 12, padding: '10px 12px' }}
      >
        <div
          className="flex items-center justify-center shrink-0"
          style={{ width: 26, height: 26, borderRadius: 2, border: `1px solid ${style.tint}`, background: 'var(--panel)' }}
        >
          <Icon size={13} style={{ color: style.tint }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline flex-wrap" style={{ gap: 10 }}>
            <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.04em', textTransform: 'uppercase', color: 'var(--muted-2)' }}>{style.label}</span>
            <span style={{ fontSize: 10.5, color: 'var(--muted-2)' }}>{formatTimeAgo(event.timestamp)}</span>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--muted-3)' }}>
              {new Date(event.timestamp).toLocaleString()}
            </span>
          </div>
          <div className="truncate" style={{ marginTop: 3, fontSize: 12.5, color: 'var(--text)' }}>{event.summary}</div>
        </div>
        {hasMeta && (
          <span className="shrink-0" style={{ marginTop: 4, color: 'var(--muted-3)' }}>
            {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </span>
        )}
      </button>
      {open && hasMeta && (
        <pre className="overflow-x-auto" style={{ padding: '0 12px 12px', fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--muted)' }}>
{JSON.stringify(event.meta, null, 2)}
        </pre>
      )}
    </li>
  );
}
