'use client';

import { useState, useEffect, useRef } from 'react';
import { Microscope, Search, ArrowDown, ArrowUp, Minus } from 'lucide-react';
import { useAdminUserBrainState, useAdminUserScoreEvents, useAdminLogBrainInspection } from '@/hooks/useAdminStore';
import { STAGE_COLORS } from '@/lib/stage-config';
import type { Stage } from '@/lib/types';

// ─── Event type labels ──────────────────────────────────────────────────────
const EVENT_TYPE_LABEL: Record<string, string> = {
  trade_scored: 'Trade Scored',
  decay_applied: 'Inactivity Decay',
  migration_replay: 'Migration Replay',
  retroactive_recalculation: 'Recalculation',
  admin_adjustment: 'Admin Adjustment',
  stage_transition: 'Stage Transition',
  vacation_activated: 'Vacation On',
  vacation_deactivated: 'Vacation Off',
  subscription_upgrade_unlock: 'Upgrade Unlock',
};

// ─── Anti-gaming flag badges (matches flags page pattern) ────────────────────
const FLAG_BADGE: Record<string, { label: string; bg: string; text: string }> = {
  phantom_trade_detected: { label: 'Phantom Trade', bg: '', text: 'var(--red)' },
  pnl_anomaly_flagged: { label: 'P&L Anomaly', bg: '', text: 'var(--amber)' },
  recovery_lock_limit: { label: 'Lock Exceeded', bg: '', text: 'var(--red)' },
  recovery_lock_active: { label: 'Lock Active', bg: '', text: 'var(--muted)' },
};

// ─── Plan label map ─────────────────────────────────────────────────────────
const PLAN_LABEL: Record<string, string> = {
  free: 'Free', essential: 'Essential', pro: 'Pro', elite: 'Elite',
};

// ─── Helper: format timestamp ────────────────────────────────────────────────
function fmtDate(ms: number): string {
  if (!ms) return 'Never';
  return new Date(ms).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}
function fmtDateTime(ms: number): string {
  if (!ms) return '—';
  return new Date(ms).toLocaleString(undefined, {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

// ─── Row helper ──────────────────────────────────────────────────────────────
function Row({ label, value, valueClass }: { label: string; value: string; valueClass?: string }) {
  const tone =
    valueClass === 'text-green-400' ? 'var(--green)'
    : valueClass === 'text-red-400' ? 'var(--red)'
    : valueClass === 'text-yellow-400' ? 'var(--amber)'
    : valueClass === 'text-[var(--muted-foreground)]' ? 'var(--muted)'
    : 'var(--text)';
  return (
    <div className="mrow">
      <span className="ic" />
      <span className="lb" style={{ marginLeft: 0 }}>{label}</span>
      <span className="val" style={{ color: tone }}>{value}</span>
    </div>
  );
}

// ─── Stage badge ─────────────────────────────────────────────────────────────
function StageBadge({ stage }: { stage: string }) {
  const color = STAGE_COLORS[stage as Stage]?.accent ?? 'var(--muted)';
  return (
    <span
      className="chip capitalize"
      style={{ height: 22, padding: '0 10px', fontSize: 10.5, fontWeight: 700, color, borderColor: `${color}55` }}
    >
      {stage}
    </span>
  );
}

// ─── Delta indicator ─────────────────────────────────────────────────────────
function DeltaDisplay({ delta }: { delta: number }) {
  const style: React.CSSProperties = { gap: 3, fontFamily: 'var(--mono)', fontSize: 11.5 };
  if (delta > 0) return <span className="inline-flex items-center" style={{ ...style, color: 'var(--green)' }}><ArrowUp size={11} />+{delta.toFixed(1)}</span>;
  if (delta < 0) return <span className="inline-flex items-center" style={{ ...style, color: 'var(--red)' }}><ArrowDown size={11} />{delta.toFixed(1)}</span>;
  return <span className="inline-flex items-center" style={{ ...style, color: 'var(--muted-2)' }}><Minus size={11} />0</span>;
}

export default function InspectPage() {
  const [searchInput, setSearchInput] = useState('');
  const [searchedUserId, setSearchedUserId] = useState<string | null>(null);
  const loggedRef = useRef<string | null>(null);

  const brainState = useAdminUserBrainState(searchedUserId);
  const scoreEvents = useAdminUserScoreEvents(searchedUserId);
  const logInspection = useAdminLogBrainInspection();

  // Fire-and-forget audit log on user selection (Story 8.2 lesson)
  useEffect(() => {
    if (searchedUserId && searchedUserId !== loggedRef.current) {
      loggedRef.current = searchedUserId;
      logInspection({ inspectedUserId: searchedUserId }).catch(() => {});
    }
  }, [searchedUserId, logInspection]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = searchInput.trim();
    if (trimmed) setSearchedUserId(trimmed);
  }

  // ─── Loading skeleton ──────────────────────────────────────────────
  const isLoading = searchedUserId && brainState === undefined;

  return (
    <div style={{ maxWidth: 900 }}>
      {/* Header */}
      <div className="phead" style={{ marginBottom: 24 }}>
        <p className="eyebrow" style={{ margin: '0 0 12px' }}>
          <Microscope size={13} style={{ color: 'var(--amber)' }} />
          Investigation
        </p>
        <h2 style={{ fontSize: 34, lineHeight: '38px' }}>Brain Inspect</h2>
        <p className="sub" style={{ marginTop: 14, fontSize: 14.5 }}>
          Inspect any user&apos;s brain state, score history, and event log for investigation.
        </p>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="field flex items-end" style={{ gap: 10 }}>
        <div className="flex-1 min-w-0">
          <label>USER ID</label>
          <div className="box" style={{ gap: 12 }}>
            <Search size={14} style={{ color: 'var(--muted-3)', flex: 'none' }} />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Enter user ID (e.g., user_2abc...)"
              style={{
                flex: 1, minWidth: 0, height: '100%', border: 0, outline: 'none',
                background: 'transparent', fontSize: 13, color: 'var(--text)',
              }}
            />
          </div>
        </div>
        <button type="submit" className="btn-a" style={{ height: 42, flex: 'none' }}>
          Inspect
        </button>
      </form>

      {/* Loading */}
      {isLoading && (
        <div className="animate-pulse" style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ height: 192, background: 'var(--panel-2)', border: '1px solid var(--line)', borderRadius: 2 }} />
          <div style={{ height: 128, background: 'var(--panel-2)', border: '1px solid var(--line)', borderRadius: 2 }} />
          <div style={{ height: 256, background: 'var(--panel-2)', border: '1px solid var(--line)', borderRadius: 2 }} />
        </div>
      )}

      {/* Empty: no user selected */}
      {!searchedUserId && (
        <div className="blank" style={{ marginTop: 24, padding: '52px 28px' }}>
          <span className="corner" style={{ left: -1, top: -1, borderRight: 0, borderBottom: 0 }} />
          <span className="corner" style={{ right: -1, bottom: -1, borderLeft: 0, borderTop: 0 }} />
          <div className="badge" style={{ border: '1px solid rgba(217,148,5,.4)', background: 'var(--panel-2)' }}>
            <Microscope size={22} style={{ color: 'var(--amber)' }} />
          </div>
          <h4>No user selected</h4>
          <p>Enter a user ID above to inspect their brain state. You can copy user IDs from the Users or Anti-Gaming Alerts pages.</p>
        </div>
      )}

      {/* Not found */}
      {searchedUserId && brainState === null && (
        <div className="blank" style={{ marginTop: 24, padding: '52px 28px' }}>
          <span className="corner" style={{ left: -1, top: -1, borderRight: 0, borderBottom: 0 }} />
          <span className="corner" style={{ right: -1, bottom: -1, borderLeft: 0, borderTop: 0 }} />
          <div className="badge" style={{ border: '1px solid rgba(255,77,94,.4)', background: 'var(--panel-2)' }}>
            <Microscope size={22} style={{ color: 'var(--red)' }} />
          </div>
          <h4>No brain state found</h4>
          <p>The user may not have logged any trades yet, or the ID may be incorrect.</p>
        </div>
      )}

      {/* Brain state found */}
      {brainState && brainState !== null && (
        <>
          {/* ── Brain State Summary ──────────────────────────────────── */}
          <div className="card" style={{ marginTop: 24 }}>
            <span className="accent" style={{ width: 56, background: 'var(--amber)' }} />
            <h3>Brain State</h3>
            <p className="sub">Current scoring state on record for this user</p>
            <div className="grid grid-cols-1 sm:grid-cols-2" style={{ marginTop: 18, columnGap: 32 }}>
              <Row label="User ID" value={brainState.userId} valueClass="text-xs text-[var(--foreground)]" />
              <Row label="Plan" value={PLAN_LABEL[brainState.planId] ?? brainState.planId} />
              <Row label="Current Score" value={String(brainState.currentScore)} />
              <div className="mrow">
                <span className="ic" />
                <span className="lb" style={{ marginLeft: 0 }}>Current Stage</span>
                <span style={{ marginLeft: 'auto' }}><StageBadge stage={brainState.currentStage} /></span>
              </div>
              {brainState.effectiveStage && brainState.effectiveStage !== brainState.currentStage && (
                <div className="mrow">
                  <span className="ic" />
                  <span className="lb" style={{ marginLeft: 0 }}>Effective Stage (capped)</span>
                  <span style={{ marginLeft: 'auto' }}><StageBadge stage={brainState.effectiveStage} /></span>
                </div>
              )}
              <Row label="Streak" value={`${brainState.streakDays} days (${brainState.streakMultiplier}x)`} />
              <Row
                label="Vacation Mode"
                value={brainState.isVacationMode ? 'Active' : 'Off'}
                valueClass={brainState.isVacationMode ? 'text-green-400' : 'text-[var(--muted-foreground)]'}
              />
              {brainState.isVacationMode && brainState.vacationEnd && (
                <Row label="Vacation Until" value={fmtDate(brainState.vacationEnd)} />
              )}
              <Row
                label="Recovery Lock"
                value={brainState.recoveryLockUntil && brainState.recoveryLockUntil > Date.now()
                  ? `Locked until ${fmtDate(brainState.recoveryLockUntil)}`
                  : 'Not locked'}
                valueClass={brainState.recoveryLockUntil && brainState.recoveryLockUntil > Date.now() ? 'text-red-400' : 'text-[var(--muted-foreground)]'}
              />
              <Row
                label="Has Regressed"
                value={brainState.hasRegressed ? 'Yes' : 'No'}
                valueClass={brainState.hasRegressed ? 'text-yellow-400' : 'text-[var(--muted-foreground)]'}
              />
              <Row
                label="Evolution Cooldown"
                value={brainState.evolutionCooldownStart ? 'Active' : 'None'}
              />
              <Row
                label="Regression Buffer"
                value={brainState.regressionBufferStart ? `Active (${brainState.regressionBufferDays}d)` : 'None'}
              />
              <Row label="Last Trade" value={fmtDate(brainState.lastTradeDate)} />
              <Row label="Created" value={fmtDate(brainState.createdAt)} />
            </div>

            {/* Latest coaching message */}
            {brainState.latestCoachingMessage && (
              <div style={{ marginTop: 20, paddingTop: 18, borderTop: '1px solid var(--line)' }}>
                <div className="flex items-center" style={{ gap: 10, marginBottom: 10 }}>
                  <p className="lbl" style={{ margin: 0 }}>LATEST COACHING</p>
                  <span className="chip" style={{ height: 20, padding: '0 9px', fontSize: 9.5 }}>
                    {brainState.latestCoachingMessage.category}
                  </span>
                </div>
                <p className="line-clamp-3" style={{ margin: 0, fontSize: 12.5, lineHeight: '19px', color: 'var(--text-2)' }}>
                  {brainState.latestCoachingMessage.message}
                </p>
              </div>
            )}
          </div>

          {/* ── Stage History ────────────────────────────────────────── */}
          {brainState.stageHistory && brainState.stageHistory.length > 0 && (
            <div className="card" style={{ marginTop: 24 }}>
              <span className="accent" style={{ width: 56, background: 'var(--teal)' }} />
              <h3>Stage History</h3>
              <p className="sub">Every stage this user has occupied</p>
              <div style={{ marginTop: 18 }}>
                {brainState.stageHistory.map((entry: { stage: string; reachedAt: number; leftAt?: number }, i: number) => (
                  <div key={i} className="flex items-center" style={{ gap: 12, padding: '10px 0', borderBottom: '1px solid var(--hair)' }}>
                    <StageBadge stage={entry.stage} />
                    <span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--muted)' }}>
                      {fmtDate(entry.reachedAt)}
                    </span>
                    <span style={{ color: 'var(--muted-3)' }}>→</span>
                    <span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--muted)' }}>
                      {entry.leftAt ? fmtDate(entry.leftAt) : (
                        <span style={{ fontFamily: 'var(--body)', fontSize: 11, fontWeight: 700, color: 'var(--green)' }}>Current</span>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Score Event Timeline ──────────────────────────────────── */}
          <div className="card" style={{ marginTop: 24 }}>
            <span className="accent" style={{ width: 56, background: 'var(--pink)' }} />
            <div className="cardhead">
              <div>
                <h3>Score Events</h3>
                <p className="sub">Full scoring audit trail for this user</p>
              </div>
              {scoreEvents && (
                <span className="chip" style={{ marginLeft: 'auto' }}>{scoreEvents.length}</span>
              )}
            </div>

            {scoreEvents && scoreEvents.length === 0 && (
              <p className="empty-line">No score events found for this user.</p>
            )}

            {scoreEvents && scoreEvents.length > 0 && (
              <div className="overflow-x-auto" style={{ marginTop: 18 }}>
              <div className="min-w-[500px]">
                {/* Header */}
                <div
                  className="grid grid-cols-[120px_100px_60px_60px_1fr] gap-2"
                  style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '.04em', textTransform: 'uppercase', color: 'var(--muted-2)', paddingBottom: 8, borderBottom: '1px solid var(--line)' }}
                >
                  <span>Time</span>
                  <span>Event</span>
                  <span className="text-right">Delta</span>
                  <span className="text-right">Score</span>
                  <span>Reason</span>
                </div>

                {scoreEvents.map((e) => (
                  <div
                    key={e._id}
                    className="grid grid-cols-[120px_100px_60px_60px_1fr] gap-2 items-start"
                    style={{ fontSize: 11.5, padding: '9px 0', borderBottom: '1px solid var(--hair)' }}
                  >
                    <span style={{ fontFamily: 'var(--mono)', color: 'var(--muted-2)' }}>
                      {fmtDateTime(e.timestamp)}
                    </span>
                    <span style={{ color: 'var(--text-2)' }}>
                      {EVENT_TYPE_LABEL[e.eventType] ?? e.eventType}
                    </span>
                    <span className="text-right">
                      <DeltaDisplay delta={e.delta} />
                    </span>
                    <span className="text-right" style={{ fontFamily: 'var(--mono)', color: 'var(--text)' }}>
                      {e.newScore}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate" title={e.reason} style={{ margin: 0, color: 'var(--muted)' }}>
                        {e.reason}
                      </p>
                      {e.antiGamingFlags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-0.5">
                          {e.antiGamingFlags.map((flag) => {
                            const badge = FLAG_BADGE[flag] ?? { label: flag, bg: '', text: 'var(--muted)' };
                            return (
                              <span
                                key={flag}
                                className="chip"
                                style={{ height: 20, padding: '0 9px', fontSize: 9.5, fontWeight: 700, color: badge.text }}
                              >
                                {badge.label}
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              </div>
            )}

            {/* Loading events */}
            {searchedUserId && scoreEvents === undefined && (
              <div className="animate-pulse" style={{ marginTop: 18, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} style={{ height: 32, background: 'var(--panel-2)', border: '1px solid var(--line)', borderRadius: 2 }} />
                ))}
              </div>
            )}
          </div>
        </>
      )}

      <p className="footnote">
        Brain inspection actions are logged to the admin audit trail. Data loads via Convex real-time subscriptions.
      </p>
    </div>
  );
}
