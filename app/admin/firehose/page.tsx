'use client';

import { useMemo, useState } from 'react';
import {
  TrendUp, TrendDown, Warning, Brain, ShieldWarning,
  FileText, Sparkle, Lightning, BookOpen, MagnifyingGlass,
} from '@phosphor-icons/react';
import { Pulse as Activity } from '@phosphor-icons/react';
import { useAdminFirehose } from '@/hooks/useAdminStore';

type EventStyle = { icon: any; tint: string; label: string };
// `tint` carries the ATLAS accent color for the event's icon chip.

type FirehoseEvent = {
  id: string;
  type: string;
  userId: string;
  timestamp: string;
  summary: string;
};

const EVENT_STYLES: Record<string, EventStyle> = {
  trade_logged:     { icon: TrendUp,        tint: 'var(--teal)',   label: 'Trade logged' },
  trade_closed:     { icon: TrendDown,      tint: 'var(--green)',  label: 'Trade closed' },
  rule_break:       { icon: Warning,        tint: 'var(--red)',    label: 'Rule break' },
  circuit_breaker:  { icon: Warning,        tint: 'var(--red)',    label: 'Circuit breaker' },
  score_event:      { icon: Brain,          tint: 'var(--amber)',  label: 'Brain score' },
  anti_gaming_flag: { icon: ShieldWarning,  tint: 'var(--red)',    label: 'Anti-gaming' },
  daily_reflection: { icon: Sparkle,        tint: 'var(--pink)',   label: 'Reflection' },
  journal_entry:    { icon: FileText,       tint: 'var(--pink)',   label: 'Journal' },
  trigger_entry:    { icon: Lightning,      tint: 'var(--amber)',  label: 'Trigger' },
  strategy_created: { icon: BookOpen,       tint: 'var(--teal)',   label: 'Strategy' },
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
    <div style={{ maxWidth: 1180 }}>
      <div className="phead" style={{ marginBottom: 24 }}>
        <p className="eyebrow" style={{ margin: '0 0 12px' }}>Live stream</p>
        <h2 style={{ fontSize: 34, lineHeight: '38px' }}>Activity Firehose</h2>
        <p className="sub" style={{ marginTop: 14, fontSize: 14.5 }}>
          Real-time stream of every user action across the platform.
        </p>
      </div>

      {/* Filter bar */}
      <div className="card" style={{ padding: '18px 22px 20px' }}>
        <span className="accent" style={{ width: 56, background: 'var(--amber)' }} />
        <div className="flex flex-wrap items-center" style={{ gap: 8 }}>
          <button
            onClick={() => setFilters([])}
            className={filters.length === 0 ? 'chip on' : 'chip'}
          >
            All
          </button>
          {FILTERS.map((f) => {
            const active = filters.includes(f.type);
            return (
              <button
                key={f.type}
                onClick={() => toggle(f.type)}
                className={active ? 'chip on' : 'chip'}
              >
                {f.label}
              </button>
            );
          })}
        </div>
        <div className="field flex items-center" style={{ gap: 10, marginTop: 16 }}>
          <div className="box flex-1 min-w-0" style={{ height: 38, gap: 12 }}>
            <MagnifyingGlass size={14} style={{ color: 'var(--muted-3)', flex: 'none' }} />
            <input
              type="text"
              placeholder="Filter by user ID (paste full Clerk subject)…"
              value={userIdSearch}
              onChange={(e) => setUserIdSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && setAppliedUserId(userIdSearch.trim())}
              style={{
                flex: 1, minWidth: 0, height: '100%', border: 0, outline: 'none',
                background: 'transparent', fontSize: 12.5, color: 'var(--text)',
              }}
            />
          </div>
          <button
            onClick={() => setAppliedUserId(userIdSearch.trim())}
            className="btn-a"
            style={{ height: 38, flex: 'none' }}
          >
            Apply
          </button>
          {appliedUserId && (
            <button
              onClick={() => { setUserIdSearch(''); setAppliedUserId(''); }}
              className="btn-g"
              style={{ height: 38, flex: 'none' }}
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Stream */}
      <div className="card" style={{ marginTop: 24, padding: '14px 22px 8px' }}>
        {!events ? (
          <div className="animate-pulse" style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '8px 0' }}>
            {[...Array(8)].map((_, i) => (
              <div key={i} style={{ height: 44, background: 'var(--panel-2)', border: '1px solid var(--line)', borderRadius: 2 }} />
            ))}
          </div>
        ) : events.length === 0 ? (
          <p className="empty-line">No events match the current filter.</p>
        ) : (
          <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {(events as FirehoseEvent[]).map((e) => {
              const style = EVENT_STYLES[e.type] ?? { icon: Activity, tint: 'var(--muted)', label: e.type };
              const Icon = style.icon;
              return (
                <li
                  key={e.id}
                  className="flex items-start"
                  style={{ gap: 12, padding: '10px 0', borderBottom: '1px solid var(--hair)' }}
                >
                  <div
                    className="flex items-center justify-center shrink-0"
                    style={{ width: 26, height: 26, borderRadius: 2, border: `1px solid ${style.tint}`, background: 'var(--panel-2)' }}
                  >
                    <Icon size={13} style={{ color: style.tint }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline flex-wrap" style={{ gap: 10 }}>
                      <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.04em', textTransform: 'uppercase', color: 'var(--muted-2)' }}>{style.label}</span>
                      <span style={{ fontSize: 10.5, color: 'var(--muted-2)' }}>{formatTimeAgo(e.timestamp)}</span>
                      <span className="truncate max-w-[140px]" style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--muted-3)' }}>{e.userId.slice(0, 16)}…</span>
                    </div>
                    <div className="truncate" style={{ marginTop: 3, fontSize: 12.5, color: 'var(--text)' }}>{e.summary}</div>
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
