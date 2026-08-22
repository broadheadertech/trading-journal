'use client';

import { useState } from 'react';
import { ShieldWarning, CaretRight } from '@phosphor-icons/react';
import { useAdminAntiGamingFlags, useAdminLogFlagView } from '@/hooks/useAdminStore';
import type { Id } from '@/convex/_generated/dataModel';

// ─── Flag badge config ───────────────────────────────────────────────────────
const FLAG_BADGE: Record<string, { label: string; color: string }> = {
  phantom_trade_detected: { label: 'Phantom Trade', color: 'var(--red)' },
  pnl_anomaly_flagged: { label: 'P&L Anomaly', color: 'var(--amber)' },
  recovery_lock_limit: { label: 'Lock Exceeded', color: 'var(--amber)' },
  recovery_lock_active: { label: 'Lock Active', color: 'var(--muted-2)' },
};

function getFlagBadge(flag: string) {
  return FLAG_BADGE[flag] ?? { label: flag, color: 'var(--muted-2)' };
}

// shared ATLAS chrome (markup-level styling only)
const flagChip: React.CSSProperties = {
  height: 20, padding: '0 10px', fontSize: 9.5, fontWeight: 700, letterSpacing: '.03em',
};

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
      <div className="max-w-5xl animate-pulse space-y-4">
        <div style={{ height: 32, width: 224, background: 'var(--panel-2)', borderRadius: 2 }} />
        <div style={{ height: 14, width: 320, background: 'var(--panel-2)', borderRadius: 2 }} />
        <div style={{ height: 64, width: 160, background: 'var(--panel-2)', border: '1px solid var(--line)', borderRadius: 2 }} />
        <div style={{ height: 288, background: 'var(--panel-2)', border: '1px solid var(--line)', borderRadius: 2 }} />
      </div>
    );
  }

  // Empty state
  if (data.flags.length === 0) {
    return (
      <div className="max-w-5xl">
        <div className="phead" style={{ marginBottom: 24 }}>
          <p className="eyebrow" style={{ margin: '0 0 12px' }}>
            <ShieldWarning size={13} style={{ color: 'var(--amber)' }} /> Integrity
          </p>
          <h2 style={{ fontSize: 34, lineHeight: '38px' }}>Anti-Gaming Alerts</h2>
          <p className="sub" style={{ marginTop: 14, fontSize: 14.5 }}>
            Review suspicious activity flagged by the anti-gaming engine
          </p>
        </div>
        <div className="blank">
          <span className="corner" style={{ left: -1, top: -1, borderRight: 0, borderBottom: 0 }} />
          <span className="corner" style={{ right: -1, bottom: -1, borderLeft: 0, borderTop: 0 }} />
          <div className="badge" style={{ border: '1px solid rgba(217,148,5,.4)', background: 'var(--panel-2)' }}>
            <ShieldWarning size={22} style={{ color: 'var(--amber)' }} />
          </div>
          <h4>No anti-gaming flags detected</h4>
          <p>Flags will appear here when phantom trades, P&amp;L anomalies, or recovery lock violations are detected.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl">
      {/* Header */}
      <div className="phead" style={{ marginBottom: 24 }}>
        <p className="eyebrow" style={{ margin: '0 0 12px' }}>
          <ShieldWarning size={13} style={{ color: 'var(--amber)' }} /> Integrity
        </p>
        <h2 style={{ fontSize: 34, lineHeight: '38px' }}>Anti-Gaming Alerts</h2>
        <p className="sub" style={{ marginTop: 14, fontSize: 14.5 }}>
          Review suspicious activity flagged by the anti-gaming engine
        </p>
      </div>

      {/* Summary card */}
      <div className="stats" style={{ marginTop: 0, gridTemplateColumns: 'minmax(0,260px)' }}>
        <div className="stat" style={{ height: 'auto', paddingBottom: 18 }}>
          <span className="accent" style={{ background: 'var(--red)' }} />
          <b>TOTAL FLAGGED EVENTS</b>
          <em>{data.total}</em>
          {data.total > 100 && (
            <p style={{ margin: '6px 0 0', fontSize: 11, color: 'var(--muted-2)' }}>
              Showing 100 most recent
            </p>
          )}
        </div>
      </div>

      {/* Flags table */}
      <div className="card" style={{ marginTop: 24, padding: '19px 24px 12px' }}>
        <span className="accent" style={{ width: 56, background: 'var(--amber)' }} />
        {/* Header row */}
        <div
          className="grid grid-cols-[140px_100px_1fr_80px_70px_24px] gap-3"
          style={{ padding: '0 0 10px', borderBottom: '1px solid var(--line-2)' }}
        >
          <span className="lbl">TIMESTAMP</span>
          <span className="lbl">USER</span>
          <span className="lbl">FLAGS</span>
          <span className="lbl">IMPACT</span>
          <span className="lbl text-right">DELTA</span>
          <span />
        </div>

        {/* Data rows */}
        <div>
          {data.flags.map((e) => {
            const isExpanded = expandedId === e._id;
            const isBlocking = e.delta === 0;

            return (
              <div key={e._id} style={{ borderBottom: '1px solid var(--hair)' }}>
                {/* Summary row */}
                <button
                  type="button"
                  onClick={() => handleRowClick(e._id, e.userId, e.antiGamingFlags)}
                  className="w-full grid grid-cols-[140px_100px_1fr_80px_70px_24px] gap-3 items-center text-left"
                  style={{ padding: '11px 0' }}
                >
                  {/* Timestamp */}
                  <span className="truncate" style={{ fontFamily: 'var(--mono)', fontSize: 11.5, color: 'var(--muted-2)' }}>
                    {new Date(e.createdAt).toLocaleString()}
                  </span>

                  {/* User ID (truncated) */}
                  <span className="truncate" style={{ fontFamily: 'var(--mono)', fontSize: 11.5, color: 'var(--text-2)' }} title={e.userId}>
                    {e.userId.length > 12 ? e.userId.slice(0, 12) + '\u2026' : e.userId}
                  </span>

                  {/* Flag badges */}
                  <div className="flex flex-wrap gap-1.5">
                    {e.antiGamingFlags.map((flag) => {
                      const badge = getFlagBadge(flag);
                      return (
                        <span key={flag} className="chip" style={{ ...flagChip, color: badge.color }}>
                          {badge.label}
                        </span>
                      );
                    })}
                  </div>

                  {/* Impact badge */}
                  <span
                    className="chip w-fit"
                    style={{ ...flagChip, color: isBlocking ? 'var(--red)' : 'var(--amber)' }}
                  >
                    {isBlocking ? 'Blocking' : 'Advisory'}
                  </span>

                  {/* Score delta */}
                  <span
                    className="text-right"
                    style={{
                      fontFamily: 'var(--mono)', fontWeight: 500, fontSize: 13,
                      color: e.delta > 0 ? 'var(--green)' : e.delta < 0 ? 'var(--red)' : 'var(--muted-2)',
                    }}
                  >
                    {e.delta > 0 ? `+${e.delta}` : e.delta}
                  </span>

                  {/* Expand arrow */}
                  <CaretRight
                    size={14}
                    className={`transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                    style={{ color: 'var(--muted-3)' }}
                  />
                </button>

                {/* Expanded details */}
                {isExpanded && (
                  <div className="inset" style={{ margin: '0 0 14px', padding: '16px 18px' }}>
                    <div className="grid grid-cols-2 gap-x-8 gap-y-2 max-w-2xl">
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
                    <div style={{ marginTop: 16 }}>
                      <p className="lbl" style={{ marginBottom: 8 }}>ANTI-GAMING FLAGS</p>
                      <div className="flex flex-wrap gap-1.5">
                        {e.antiGamingFlags.map((flag) => {
                          const badge = getFlagBadge(flag);
                          return (
                            <span key={flag} className="chip" style={{ ...flagChip, height: 24, color: badge.color }}>
                              {badge.label}
                            </span>
                          );
                        })}
                      </div>
                    </div>

                    {/* Rule compliance */}
                    {e.ruleCompliance && e.ruleCompliance.length > 0 && (
                      <div style={{ marginTop: 16 }}>
                        <p className="lbl" style={{ marginBottom: 8 }}>RULE COMPLIANCE</p>
                        <div>
                          {e.ruleCompliance.map((rc, i) => (
                            <div key={i} className="flex items-center gap-2" style={{ padding: '3px 0', fontSize: 12 }}>
                              <span
                                className="shrink-0"
                                style={{
                                  width: 6, height: 6, borderRadius: 1,
                                  background: rc.compliance === 'yes'
                                    ? 'var(--green)'
                                    : rc.compliance === 'partial'
                                      ? 'var(--amber)'
                                      : 'var(--red)',
                                }}
                              />
                              <span style={{ color: 'var(--text-2)' }}>{rc.rule}</span>
                              <span style={{ color: 'var(--muted-2)' }}>({rc.compliance})</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Metadata */}
                    {e.metadata != null && (
                      <div style={{ marginTop: 16 }}>
                        <p className="lbl" style={{ marginBottom: 8 }}>METADATA</p>
                        <pre
                          className="overflow-x-auto max-h-32"
                          style={{
                            margin: 0, padding: 12, borderRadius: 2,
                            border: '1px solid var(--line)', background: 'var(--panel)',
                            fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--muted)',
                          }}
                        >
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

      <p className="footnote" style={{ marginTop: 20, textAlign: 'left' }}>
        Flags update in real-time via Convex subscriptions. Expanding a flag logs the admin view for audit.
      </p>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ fontSize: 12 }}>
      <span style={{ color: 'var(--muted-2)' }}>{label}: </span>
      <span style={{ fontFamily: 'var(--mono)', color: 'var(--text)' }}>{value}</span>
    </div>
  );
}
