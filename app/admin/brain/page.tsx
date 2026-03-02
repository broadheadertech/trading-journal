'use client';

import { Brain, Wrench } from 'lucide-react';
import { useAdminBrainDistribution, useAdminMigrateBrainStages } from '@/hooks/useAdminStore';
import type { Stage } from '@/lib/types';
import { STAGE_COLORS } from '@/lib/stage-config';
import { useState } from 'react';

// M2 fix: typed as Record<Stage, string> so TypeScript enforces exhaustiveness
const STAGE_LABELS: Record<Stage, string> = {
  'beginner': 'Beginner',
  'intern': 'Intern',
  'advance': 'Advance',
  'professional': 'Professional',
  'advance-professional': 'Adv Professional',
  'guru': 'Guru',
};

// Free-tier cap is 'advance' — stages above this can be capped
const FREE_TIER_CAP: Stage = 'advance';
const STAGES_ABOVE_CAP: Stage[] = ['professional', 'advance-professional', 'guru'];

function PctBar({ pct, accent }: { pct: number; accent: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-[var(--muted)] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: accent }}
        />
      </div>
      <span className="text-xs text-[var(--muted-foreground)] w-10 text-right tabular-nums">
        {pct.toFixed(1)}%
      </span>
    </div>
  );
}

export default function BrainMonitorPage() {
  const data = useAdminBrainDistribution();
  const migrateBrainStages = useAdminMigrateBrainStages();
  const [migrating, setMigrating] = useState(false);
  const [migrateResult, setMigrateResult] = useState<{ migrated: number; total: number } | null>(null);

  const handleMigrate = async () => {
    setMigrating(true);
    setMigrateResult(null);
    try {
      const result = await migrateBrainStages({});
      setMigrateResult(result);
    } finally {
      setMigrating(false);
    }
  };

  if (data === undefined) {
    return (
      <div className="space-y-4 max-w-4xl animate-pulse">
        <div className="h-8 w-48 bg-[var(--muted)] rounded" />
        <div className="h-4 w-72 bg-[var(--muted)] rounded" />
        <div className="h-64 bg-[var(--muted)] rounded-xl" />
      </div>
    );
  }

  // L1 fix: empty state when no brain states exist yet
  if (data.total === 0) {
    return (
      <div className="space-y-6 max-w-4xl">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Brain size={20} className="text-[var(--accent)]" />
            <h1 className="text-xl font-bold text-[var(--foreground)]">Brain Monitor</h1>
          </div>
          <p className="text-sm text-[var(--muted-foreground)]">
            Neuro Score stage distribution across all users
          </p>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-12 text-center">
          <Brain size={32} className="mx-auto mb-3 text-[var(--muted-foreground)]" />
          <p className="text-sm font-medium text-[var(--foreground)]">No active brain states yet</p>
          <p className="text-xs text-[var(--muted-foreground)] mt-1">
            Users will appear here once they initialize their brain state.
          </p>
        </div>
      </div>
    );
  }

  // M1 fix: Math.max(0, ...) guards against data integrity edge cases
  const cappedUsers = data.distribution
    .filter((row) => STAGES_ABOVE_CAP.includes(row.stage as Stage))
    .reduce((sum, row) => sum + Math.max(0, row.currentCount - row.effectiveCount), 0);

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Brain size={20} className="text-[var(--accent)]" />
          <h1 className="text-xl font-bold text-[var(--foreground)]">Brain Monitor</h1>
        </div>
        <p className="text-sm text-[var(--muted-foreground)]">
          Neuro Score stage distribution across all users
        </p>
      </div>

      {/* Summary stats */}
      <div className="flex items-center gap-6">
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] px-5 py-4">
          <p className="text-xs text-[var(--muted-foreground)]">Users with active brains</p>
          <p className="text-2xl font-bold text-[var(--foreground)]">{data.total}</p>
        </div>
        {cappedUsers > 0 && (
          <div className="rounded-xl border border-[var(--yellow)]/30 bg-[var(--yellow)]/5 px-5 py-4">
            <p className="text-xs text-[var(--yellow)]">Free-tier capped users</p>
            <p className="text-2xl font-bold text-[var(--yellow)]">{cappedUsers}</p>
            <p className="text-[11px] text-[var(--muted-foreground)] mt-0.5">
              Earned stage above &quot;{FREE_TIER_CAP}&quot; but capped
            </p>
          </div>
        )}
      </div>

      {/* Distribution table */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] overflow-hidden">
        <div className="px-5 py-4 border-b border-[var(--border)]">
          <h2 className="text-sm font-semibold text-[var(--foreground)]">Stage Distribution</h2>
          <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
            <span className="font-medium">Earned</span> = true stage from Neuro Score &nbsp;·&nbsp;
            <span className="font-medium">Visible</span> = stage user sees (may be capped for free tier)
          </p>
        </div>

        <div className="divide-y divide-[var(--border)]">
          {/* Header row */}
          <div className="grid grid-cols-[120px_1fr_1fr] gap-4 px-5 py-2 bg-[var(--muted)]/40">
            <span className="text-[11px] font-medium text-[var(--muted-foreground)] uppercase tracking-wide">Stage</span>
            <span className="text-[11px] font-medium text-[var(--muted-foreground)] uppercase tracking-wide">Earned (current)</span>
            <span className="text-[11px] font-medium text-[var(--muted-foreground)] uppercase tracking-wide">Visible (effective)</span>
          </div>

          {data.distribution.map((row) => {
            // L4 fix: use canonical STAGE_COLORS from lib/stage-config instead of local map
            const stageKey = row.stage as Stage;
            const accent = STAGE_COLORS[stageKey]?.accent ?? 'var(--accent)';
            const isCapped = STAGES_ABOVE_CAP.includes(stageKey) &&
              row.currentCount > row.effectiveCount;
            const capAccent = STAGE_COLORS[FREE_TIER_CAP].accent;

            return (
              <div
                key={row.stage}
                className="grid grid-cols-[120px_1fr_1fr] gap-4 px-5 py-3 hover:bg-[var(--muted)]/30 transition-colors"
              >
                {/* Stage label */}
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: accent }} />
                  <span className="text-sm font-medium text-[var(--foreground)]">
                    {STAGE_LABELS[stageKey]}
                  </span>
                  {isCapped && (
                    <span className="text-[10px] text-[var(--yellow)] font-medium">cap</span>
                  )}
                </div>

                {/* Earned (currentStage) */}
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-semibold text-[var(--foreground)] tabular-nums w-8">
                      {row.currentCount}
                    </span>
                    <span className="text-xs text-[var(--muted-foreground)]">users</span>
                  </div>
                  <PctBar pct={row.currentPct} accent={accent} />
                </div>

                {/* Visible (effectiveStage) */}
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-semibold text-[var(--foreground)] tabular-nums w-8">
                      {row.effectiveCount}
                    </span>
                    <span className="text-xs text-[var(--muted-foreground)]">users</span>
                  </div>
                  <PctBar pct={row.effectivePct} accent={isCapped ? capAccent : accent} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <p className="text-xs text-[var(--muted-foreground)]">
        Data updates in real-time via Convex subscriptions. Free-tier users are capped at &quot;{FREE_TIER_CAP}&quot; for visible stage.
      </p>

      {/* Stage migration tool */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] px-5 py-4">
        <div className="flex items-center gap-2 mb-1">
          <Wrench size={14} className="text-amber-400" />
          <h3 className="text-sm font-semibold text-[var(--foreground)]">Stage Migration Tool</h3>
        </div>
        <p className="text-xs text-[var(--muted-foreground)] mb-3">
          Remaps legacy stage names (baby → beginner, toddler → intern, etc.) in all brain state documents.
          Run once after upgrading from the old stage system. Safe to run multiple times.
        </p>
        <div className="flex items-center gap-3">
          <button
            onClick={handleMigrate}
            disabled={migrating}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-lg font-medium disabled:opacity-50 transition-colors"
          >
            <Wrench size={14} /> {migrating ? 'Running…' : 'Fix Legacy Stages'}
          </button>
          {migrateResult && (
            <span className="text-sm text-[var(--muted-foreground)]">
              Done — {migrateResult.migrated} of {migrateResult.total} documents updated.
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
