'use client';

import { useMemo, useState } from 'react';
import {
  Activity, TrendingUp, TrendingDown, AlertTriangle, Brain, ShieldAlert,
  FileText, Sparkles, Zap, BookOpen, Search,
} from 'lucide-react';
import { useAdminFirehose } from '@/hooks/useAdminStore';

type EventStyle = { icon: any; tint: string; label: string };

const EVENT_STYLES: Record<string, EventStyle> = {
  trade_logged:     { icon: TrendingUp,     tint: 'text-cyan-400 bg-cyan-500/10',         label: 'Trade logged' },
  trade_closed:     { icon: TrendingDown,   tint: 'text-emerald-400 bg-emerald-500/10',   label: 'Trade closed' },
  rule_break:       { icon: AlertTriangle,  tint: 'text-red-400 bg-red-500/10',           label: 'Rule break' },
  circuit_breaker:  { icon: AlertTriangle,  tint: 'text-red-400 bg-red-500/10',           label: 'Circuit breaker' },
  score_event:      { icon: Brain,          tint: 'text-blue-400 bg-blue-500/10',         label: 'Brain score' },
  anti_gaming_flag: { icon: ShieldAlert,    tint: 'text-red-400 bg-red-500/10',           label: 'Anti-gaming' },
  daily_reflection: { icon: Sparkles,       tint: 'text-violet-400 bg-violet-500/10',     label: 'Reflection' },
  journal_entry:    { icon: FileText,       tint: 'text-purple-400 bg-purple-500/10',     label: 'Journal' },
  trigger_entry:    { icon: Zap,            tint: 'text-rose-400 bg-rose-500/10',         label: 'Trigger' },
  strategy_created: { icon: BookOpen,       tint: 'text-pink-400 bg-pink-500/10',         label: 'Strategy' },
};

const FILTERS: { type: string; label: string }[] = [
  { type: 'trade_logged',     label: 'Trades' },
  { type: 'trade_closed',     label: 'Closes' },
  { type: 'rule_break',       label: 'Rule breaks' },
  { type: 'anti_gaming_flag', label: 'Anti-gaming' },
  { type: 'circuit_breaker',  label: 'Circuit hits' },
  { type: 'score_event',      label: 'Brain score' },
  { type: 'daily_reflection', label: 'Reflections' },
  { type: 'journal_entry',    label: 'Journal' },
  { type: 'trigger_entry',    label: 'Triggers' },
];

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

export default function AdminFirehosePage() {
  const [filters, setFilters] = useState<string[]>([]);
  const [userIdSearch, setUserIdSearch] = useState('');
  const [appliedUserId, setAppliedUserId] = useState('');

  const events = useAdminFirehose(useMemo(() => ({
    perSourceLimit: 80,
    limit: 300,
    types: filters.length ? filters : undefined,
    userId: appliedUserId || undefined,
  }), [filters, appliedUserId]));

  const toggle = (t: string) =>
    setFilters((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));

  return (
    <div className="space-y-5 max-w-6xl">
      <div>
        <h1 className="text-xl font-bold text-[var(--foreground)]">Activity Firehose</h1>
        <p className="text-sm text-[var(--muted-foreground)]">
          Real-time stream of every user action across the platform.
        </p>
      </div>

      {/* Filter bar */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-3 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
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
          {FILTERS.map((f) => {
            const active = filters.includes(f.type);
            return (
              <button
                key={f.type}
                onClick={() => toggle(f.type)}
                className={`px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors ${
                  active
                    ? 'border-[var(--accent)] text-[var(--accent)] bg-[var(--accent)]/10'
                    : 'border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
                }`}
              >
                {f.label}
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-2">
          <Search size={14} className="text-[var(--muted-foreground)]" />
          <input
            type="text"
            placeholder="Filter by user ID (paste full Clerk subject)…"
            value={userIdSearch}
            onChange={(e) => setUserIdSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && setAppliedUserId(userIdSearch.trim())}
            className="flex-1 px-2 py-1 rounded-md border border-[var(--border)] bg-[var(--input-bg)] text-xs text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]"
          />
          <button
            onClick={() => setAppliedUserId(userIdSearch.trim())}
            className="px-3 py-1 rounded-md bg-[var(--accent)] text-white text-xs font-medium"
          >
            Apply
          </button>
          {appliedUserId && (
            <button
              onClick={() => { setUserIdSearch(''); setAppliedUserId(''); }}
              className="px-3 py-1 rounded-md border border-[var(--border)] text-[var(--muted-foreground)] text-xs"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Stream */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-3">
        {!events ? (
          <div className="space-y-1">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-12 bg-[var(--muted)] rounded-lg animate-pulse" />
            ))}
          </div>
        ) : events.length === 0 ? (
          <div className="text-center text-sm text-[var(--muted-foreground)] py-12">
            No events match the current filter.
          </div>
        ) : (
          <ul className="space-y-1">
            {events.map((e) => {
              const style = EVENT_STYLES[e.type] ?? { icon: Activity, tint: 'text-slate-400 bg-slate-500/10', label: e.type };
              const Icon = style.icon;
              return (
                <li key={e.id} className="flex items-start gap-3 p-2 rounded-lg hover:bg-[var(--muted)]/40 transition-colors">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${style.tint}`}>
                    <Icon size={14} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">{style.label}</span>
                      <span className="text-[10px] text-[var(--muted-foreground)]">{formatTimeAgo(e.timestamp)}</span>
                      <span className="text-[10px] text-[var(--muted-foreground)] font-mono truncate max-w-[140px]">{e.userId.slice(0, 16)}…</span>
                    </div>
                    <div className="text-sm text-[var(--foreground)] truncate">{e.summary}</div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
