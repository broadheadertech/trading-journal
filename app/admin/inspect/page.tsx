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
  phantom_trade_detected: { label: 'Phantom Trade', bg: 'bg-red-500/15', text: 'text-red-400' },
  pnl_anomaly_flagged: { label: 'P&L Anomaly', bg: 'bg-yellow-500/15', text: 'text-yellow-400' },
  recovery_lock_limit: { label: 'Lock Exceeded', bg: 'bg-red-500/15', text: 'text-red-400' },
  recovery_lock_active: { label: 'Lock Active', bg: 'bg-zinc-500/15', text: 'text-zinc-400' },
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
  return (
    <div className="flex items-center justify-between text-sm py-1">
      <span className="text-[var(--muted-foreground)]">{label}</span>
      <span className={`font-medium ${valueClass ?? 'text-[var(--foreground)]'}`}>{value}</span>
    </div>
  );
}

// ─── Stage badge ─────────────────────────────────────────────────────────────
function StageBadge({ stage }: { stage: string }) {
  const color = STAGE_COLORS[stage as Stage]?.accent ?? 'var(--muted-foreground)';
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold capitalize"
      style={{ color, backgroundColor: `${color}20`, border: `1px solid ${color}40` }}
    >
      {stage}
    </span>
  );
}

// ─── Delta indicator ─────────────────────────────────────────────────────────
function DeltaDisplay({ delta }: { delta: number }) {
  if (delta > 0) return <span className="inline-flex items-center gap-0.5 text-green-400 text-xs"><ArrowUp size={12} />+{delta.toFixed(1)}</span>;
  if (delta < 0) return <span className="inline-flex items-center gap-0.5 text-red-400 text-xs"><ArrowDown size={12} />{delta.toFixed(1)}</span>;
  return <span className="inline-flex items-center gap-0.5 text-[var(--muted-foreground)] text-xs"><Minus size={12} />0</span>;
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
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Microscope size={20} className="text-[var(--accent)]" />
          <h1 className="text-xl font-bold text-[var(--foreground)]">Brain Inspect</h1>
        </div>
        <p className="text-sm text-[var(--muted-foreground)]">
          Inspect any user&apos;s brain state, score history, and event log for investigation.
        </p>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Enter user ID (e.g., user_2abc...)"
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-[var(--border)] bg-[var(--muted)]/40 text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:border-[var(--accent)]"
          />
        </div>
        <button
          type="submit"
          className="px-4 py-2 rounded-lg text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90 transition-opacity"
        >
          Inspect
        </button>
      </form>

      {/* Loading */}
      {isLoading && (
        <div className="space-y-4 animate-pulse">
          <div className="h-48 bg-[var(--muted)] rounded-xl" />
          <div className="h-32 bg-[var(--muted)] rounded-xl" />
          <div className="h-64 bg-[var(--muted)] rounded-xl" />
        </div>
      )}

      {/* Empty: no user selected */}
      {!searchedUserId && (
        <div className="text-center py-12 text-[var(--muted-foreground)]">
          <Microscope size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">Enter a user ID above to inspect their brain state.</p>
          <p className="text-xs mt-1">You can copy user IDs from the Users or Anti-Gaming Alerts pages.</p>
        </div>
      )}

      {/* Not found */}
      {searchedUserId && brainState === null && (
        <div className="text-center py-12 text-[var(--muted-foreground)]">
          <p className="text-sm font-medium">No brain state found for this user.</p>
          <p className="text-xs mt-1">The user may not have logged any trades yet, or the ID may be incorrect.</p>
        </div>
      )}

      {/* Brain state found */}
      {brainState && brainState !== null && (
        <>
          {/* ── Brain State Summary ──────────────────────────────────── */}
          <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] px-5 py-4">
            <p className="text-sm font-semibold text-[var(--foreground)] mb-3">Brain State</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1">
              <Row label="User ID" value={brainState.userId} valueClass="text-xs text-[var(--foreground)]" />
              <Row label="Plan" value={PLAN_LABEL[brainState.planId] ?? brainState.planId} />
              <Row label="Current Score" value={String(brainState.currentScore)} />
              <div className="flex items-center justify-between text-sm py-1">
                <span className="text-[var(--muted-foreground)]">Current Stage</span>
                <StageBadge stage={brainState.currentStage} />
              </div>
              {brainState.effectiveStage && brainState.effectiveStage !== brainState.currentStage && (
                <div className="flex items-center justify-between text-sm py-1">
                  <span className="text-[var(--muted-foreground)]">Effective Stage (capped)</span>
                  <StageBadge stage={brainState.effectiveStage} />
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
              <div className="mt-3 pt-3 border-t border-[var(--border)]">
                <p className="text-xs text-[var(--muted-foreground)] mb-1">
                  Latest Coaching
                  <span className="ml-1.5 px-1.5 py-0.5 rounded bg-[var(--muted)] text-[10px]">
                    {brainState.latestCoachingMessage.category}
                  </span>
                </p>
                <p className="text-sm text-[var(--foreground)] line-clamp-3">
                  {brainState.latestCoachingMessage.message}
                </p>
              </div>
            )}
          </div>

          {/* ── Stage History ────────────────────────────────────────── */}
          {brainState.stageHistory && brainState.stageHistory.length > 0 && (
            <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] px-5 py-4">
              <p className="text-sm font-semibold text-[var(--foreground)] mb-3">Stage History</p>
              <div className="space-y-2">
                {brainState.stageHistory.map((entry: { stage: string; reachedAt: number; leftAt?: number }, i: number) => (
                  <div key={i} className="flex items-center gap-3 text-sm">
                    <StageBadge stage={entry.stage} />
                    <span className="text-[var(--muted-foreground)]">
                      {fmtDate(entry.reachedAt)}
                    </span>
                    <span className="text-[var(--muted-foreground)]">→</span>
                    <span className="text-[var(--muted-foreground)]">
                      {entry.leftAt ? fmtDate(entry.leftAt) : (
                        <span className="text-green-400 text-xs font-medium">Current</span>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Score Event Timeline ──────────────────────────────────── */}
          <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] px-5 py-4">
            <p className="text-sm font-semibold text-[var(--foreground)] mb-3">
              Score Events
              {scoreEvents && <span className="text-[var(--muted-foreground)] font-normal ml-1.5">({scoreEvents.length})</span>}
            </p>

            {scoreEvents && scoreEvents.length === 0 && (
              <p className="text-sm text-[var(--muted-foreground)] py-4 text-center">No score events found for this user.</p>
            )}

            {scoreEvents && scoreEvents.length > 0 && (
              <div className="overflow-x-auto">
              <div className="min-w-[500px] space-y-1">
                {/* Header */}
                <div className="grid grid-cols-[120px_100px_60px_60px_1fr] gap-2 text-[10px] text-[var(--muted-foreground)] font-medium uppercase tracking-wider pb-1 border-b border-[var(--border)]">
                  <span>Time</span>
                  <span>Event</span>
                  <span className="text-right">Delta</span>
                  <span className="text-right">Score</span>
                  <span>Reason</span>
                </div>

                {scoreEvents.map((e) => (
                  <div
                    key={e._id}
                    className="grid grid-cols-[120px_100px_60px_60px_1fr] gap-2 items-start text-xs py-1.5 border-b border-[var(--border)]/50 last:border-0"
                  >
                    <span className="text-[var(--muted-foreground)] tabular-nums">
                      {fmtDateTime(e.timestamp)}
                    </span>
                    <span className="text-[var(--foreground)]">
                      {EVENT_TYPE_LABEL[e.eventType] ?? e.eventType}
                    </span>
                    <span className="text-right">
                      <DeltaDisplay delta={e.delta} />
                    </span>
                    <span className="text-right tabular-nums text-[var(--foreground)]">
                      {e.newScore}
                    </span>
                    <div className="min-w-0">
                      <p className="text-[var(--muted-foreground)] truncate" title={e.reason}>
                        {e.reason}
                      </p>
                      {e.antiGamingFlags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-0.5">
                          {e.antiGamingFlags.map((flag) => {
                            const badge = FLAG_BADGE[flag] ?? { label: flag, bg: 'bg-[var(--muted)]/40', text: 'text-[var(--muted-foreground)]' };
                            return (
                              <span key={flag} className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium ${badge.bg} ${badge.text}`}>
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
              <div className="animate-pulse space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-8 bg-[var(--muted)] rounded" />
                ))}
              </div>
            )}
          </div>
        </>
      )}

      <p className="text-xs text-[var(--muted-foreground)]">
        Brain inspection actions are logged to the admin audit trail. Data loads via Convex real-time subscriptions.
      </p>
    </div>
  );
}
