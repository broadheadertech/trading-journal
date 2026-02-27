'use client';

import { useState } from 'react';
import { ShieldAlert, ChevronRight } from 'lucide-react';
import { useAdminAntiGamingFlags, useAdminLogFlagView } from '@/hooks/useAdminStore';
import type { Id } from '@/convex/_generated/dataModel';

// ─── Flag badge config ───────────────────────────────────────────────────────
const FLAG_BADGE: Record<string, { label: string; bg: string; text: string }> = {
  phantom_trade_detected: { label: 'Phantom Trade', bg: 'bg-red-500/15', text: 'text-red-400' },
  pnl_anomaly_flagged: { label: 'P&L Anomaly', bg: 'bg-yellow-500/15', text: 'text-yellow-400' },
  recovery_lock_limit: { label: 'Lock Exceeded', bg: 'bg-red-500/15', text: 'text-red-400' },
  recovery_lock_active: { label: 'Lock Active', bg: 'bg-zinc-500/15', text: 'text-zinc-400' },
};

function getFlagBadge(flag: string) {
  return FLAG_BADGE[flag] ?? { label: flag, bg: 'bg-zinc-500/15', text: 'text-zinc-400' };
}

export default function AntiGamingFlagsPage() {
  const data = useAdminAntiGamingFlags();
  const logFlagView = useAdminLogFlagView();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  function handleRowClick(eventId: Id<"scoreEvents">, userId: string, flags: string[]) {
    const isExpanding = expandedId !== eventId;
    setExpandedId(isExpanding ? eventId : null);
    if (isExpanding) {
      // M2 fix: fire-and-forget — audit logging shouldn't block UX
      logFlagView({ scoreEventId: eventId, flaggedUserId: userId, flags })
        .catch(() => {});
    }
  }

  // Loading skeleton
  if (data === undefined) {
    return (
      <div className="space-y-4 max-w-5xl animate-pulse">
        <div className="h-8 w-56 bg-[var(--muted)] rounded" />
        <div className="h-4 w-80 bg-[var(--muted)] rounded" />
        <div className="h-16 w-40 bg-[var(--muted)] rounded-xl" />
        <div className="h-72 bg-[var(--muted)] rounded-xl" />
      </div>
    );
  }

  // Empty state
  if (data.flags.length === 0) {
    return (
      <div className="space-y-6 max-w-5xl">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <ShieldAlert size={20} className="text-[var(--accent)]" />
            <h1 className="text-xl font-bold text-[var(--foreground)]">Anti-Gaming Alerts</h1>
          </div>
          <p className="text-sm text-[var(--muted-foreground)]">
            Review suspicious activity flagged by the anti-gaming engine
          </p>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-12 text-center">
          <ShieldAlert size={32} className="mx-auto mb-3 text-[var(--muted-foreground)]" />
          <p className="text-sm font-medium text-[var(--foreground)]">No anti-gaming flags detected</p>
          <p className="text-xs text-[var(--muted-foreground)] mt-1">
            Flags will appear here when phantom trades, P&amp;L anomalies, or recovery lock violations are detected.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <ShieldAlert size={20} className="text-[var(--accent)]" />
          <h1 className="text-xl font-bold text-[var(--foreground)]">Anti-Gaming Alerts</h1>
        </div>
        <p className="text-sm text-[var(--muted-foreground)]">
          Review suspicious activity flagged by the anti-gaming engine
        </p>
      </div>

      {/* Summary card */}
      <div className="flex items-center gap-6">
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] px-5 py-4">
          <p className="text-xs text-[var(--muted-foreground)]">Total flagged events</p>
          <p className="text-2xl font-bold text-[var(--foreground)]">{data.total}</p>
          {data.total > 100 && (
            <p className="text-[11px] text-[var(--muted-foreground)] mt-0.5">
              Showing 100 most recent
            </p>
          )}
        </div>
      </div>

      {/* Flags table */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] overflow-hidden">
        {/* Header row */}
        <div className="grid grid-cols-[140px_100px_1fr_80px_70px_24px] gap-3 px-5 py-2 bg-[var(--muted)]/40 border-b border-[var(--border)]">
          <span className="text-[11px] font-medium text-[var(--muted-foreground)] uppercase tracking-wide">Timestamp</span>
          <span className="text-[11px] font-medium text-[var(--muted-foreground)] uppercase tracking-wide">User</span>
          <span className="text-[11px] font-medium text-[var(--muted-foreground)] uppercase tracking-wide">Flags</span>
          <span className="text-[11px] font-medium text-[var(--muted-foreground)] uppercase tracking-wide">Impact</span>
          <span className="text-[11px] font-medium text-[var(--muted-foreground)] uppercase tracking-wide text-right">Delta</span>
          <span />
        </div>

        {/* Data rows */}
        <div className="divide-y divide-[var(--border)]">
          {data.flags.map((e) => {
            const isExpanded = expandedId === e._id;
            const isBlocking = e.delta === 0;

            return (
              <div key={e._id}>
                {/* Summary row */}
                <button
                  type="button"
                  onClick={() => handleRowClick(e._id, e.userId, e.antiGamingFlags)}
                  className="w-full grid grid-cols-[140px_100px_1fr_80px_70px_24px] gap-3 px-5 py-3 hover:bg-[var(--muted)]/30 transition-colors text-left"
                >
                  {/* Timestamp */}
                  <span className="text-xs text-[var(--muted-foreground)] tabular-nums truncate">
                    {new Date(e.createdAt).toLocaleString()}
                  </span>

                  {/* User ID (truncated) */}
                  <span className="text-xs text-[var(--foreground)] font-mono truncate" title={e.userId}>
                    {e.userId.length > 12 ? e.userId.slice(0, 12) + '\u2026' : e.userId}
                  </span>

                  {/* Flag badges */}
                  <div className="flex flex-wrap gap-1">
                    {e.antiGamingFlags.map((flag) => {
                      const badge = getFlagBadge(flag);
                      return (
                        <span
                          key={flag}
                          className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${badge.bg} ${badge.text}`}
                        >
                          {badge.label}
                        </span>
                      );
                    })}
                  </div>

                  {/* Impact badge */}
                  <span
                    className={`inline-flex items-center justify-center px-2 py-0.5 rounded text-[10px] font-semibold w-fit ${
                      isBlocking
                        ? 'bg-red-500/15 text-red-400'
                        : 'bg-yellow-500/15 text-yellow-400'
                    }`}
                  >
                    {isBlocking ? 'Blocking' : 'Advisory'}
                  </span>

                  {/* Score delta */}
                  <span
                    className={`text-sm font-semibold tabular-nums text-right ${
                      e.delta > 0
                        ? 'text-green-400'
                        : e.delta < 0
                          ? 'text-red-400'
                          : 'text-[var(--muted-foreground)]'
                    }`}
                  >
                    {e.delta > 0 ? `+${e.delta}` : e.delta}
                  </span>

                  {/* Expand arrow */}
                  <ChevronRight
                    size={14}
                    className={`text-[var(--muted-foreground)] transition-transform ${
                      isExpanded ? 'rotate-90' : ''
                    }`}
                  />
                </button>

                {/* Expanded details */}
                {isExpanded && (
                  <div className="px-5 pb-4 pt-1 bg-[var(--muted)]/20 border-t border-[var(--border)]">
                    <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-xs max-w-2xl">
                      {e.tradeId && (
                        <Detail label="Trade ID" value={e.tradeId} />
                      )}
                      <Detail label="Event Type" value={e.eventType} />
                      <Detail label="Reason" value={e.reason} />
                      <Detail
                        label="Score"
                        value={`${e.previousScore} → ${e.newScore} (${e.delta >= 0 ? '+' : ''}${e.delta})`}
                      />
                      <Detail label="User ID" value={e.userId} />
                      <Detail
                        label="Server Timestamp"
                        value={new Date(e.createdAt).toISOString()}
                      />
                    </div>

                    {/* Anti-gaming flags */}
                    <div className="mt-3">
                      <p className="text-[11px] font-medium text-[var(--muted-foreground)] uppercase tracking-wide mb-1">
                        Anti-Gaming Flags
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {e.antiGamingFlags.map((flag) => {
                          const badge = getFlagBadge(flag);
                          return (
                            <span
                              key={flag}
                              className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${badge.bg} ${badge.text}`}
                            >
                              {badge.label}
                            </span>
                          );
                        })}
                      </div>
                    </div>

                    {/* Rule compliance */}
                    {e.ruleCompliance && e.ruleCompliance.length > 0 && (
                      <div className="mt-3">
                        <p className="text-[11px] font-medium text-[var(--muted-foreground)] uppercase tracking-wide mb-1">
                          Rule Compliance
                        </p>
                        <div className="space-y-0.5">
                          {e.ruleCompliance.map((rc, i) => (
                            <div key={i} className="flex items-center gap-2 text-xs">
                              <span
                                className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                  rc.compliance === 'yes'
                                    ? 'bg-green-400'
                                    : rc.compliance === 'partial'
                                      ? 'bg-yellow-400'
                                      : 'bg-red-400'
                                }`}
                              />
                              <span className="text-[var(--foreground)]">{rc.rule}</span>
                              <span className="text-[var(--muted-foreground)]">({rc.compliance})</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Metadata */}
                    {e.metadata != null && (
                      <div className="mt-3">
                        <p className="text-[11px] font-medium text-[var(--muted-foreground)] uppercase tracking-wide mb-1">
                          Metadata
                        </p>
                        <pre className="text-[11px] text-[var(--muted-foreground)] bg-[var(--muted)]/40 rounded p-2 overflow-x-auto max-h-32">
                          {typeof e.metadata === 'string'
                            ? e.metadata
                            : JSON.stringify(e.metadata, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <p className="text-xs text-[var(--muted-foreground)]">
        Flags update in real-time via Convex subscriptions. Expanding a flag logs the admin view for audit.
      </p>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-[var(--muted-foreground)]">{label}: </span>
      <span className="text-[var(--foreground)] font-medium">{value}</span>
    </div>
  );
}
