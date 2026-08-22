'use client';

import { Brain, Wrench } from '@phosphor-icons/react';
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
    <div className="flex items-center gap-3">
      <div className="flex-1" style={{ height: 2, background: 'var(--rail)', position: 'relative' }}>
        <div
          className="transition-all duration-500"
          style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${Math.min(pct, 100)}%`, background: accent }}
        />
      </div>
      <span
        className="text-right"
        style={{ width: 46, fontFamily: 'var(--mono)', fontWeight: 500, fontSize: 11.5, color: 'var(--muted-2)' }}
      >
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
      <div className="max-w-4xl animate-pulse space-y-4">
        <div style={{ height: 32, width: 192, background: 'var(--panel-2)', borderRadius: 2 }} />
        <div style={{ height: 14, width: 288, background: 'var(--panel-2)', borderRadius: 2 }} />
        <div style={{ height: 256, background: 'var(--panel-2)', border: '1px solid var(--line)', borderRadius: 2 }} />
      </div>
    );
  }

  // L1 fix: empty state when no brain states exist yet
  if (data.total === 0) {
    return (
      <div className="max-w-4xl">
        <div className="phead" style={{ marginBottom: 24 }}>
          <p className="eyebrow" style={{ margin: '0 0 12px' }}>
            <Brain size={13} style={{ color: 'var(--amber)' }} /> Neuro Score
          </p>
          <h2 style={{ fontSize: 34, lineHeight: '38px' }}>Brain Monitor</h2>
          <p className="sub" style={{ marginTop: 14, fontSize: 14.5 }}>
            Neuro Score stage distribution across all users
          </p>
        </div>
        <div className="blank">
          <span className="corner" style={{ left: -1, top: -1, borderRight: 0, borderBottom: 0 }} />
          <span className="corner" style={{ right: -1, bottom: -1, borderLeft: 0, borderTop: 0 }} />
          <div className="badge" style={{ border: '1px solid rgba(217,148,5,.4)', background: 'var(--panel-2)' }}>
            <Brain size={22} style={{ color: 'var(--amber)' }} />
          </div>
          <h4>No active brain states yet</h4>
          <p>Users will appear here once they initialize their brain state.</p>
        </div>
      </div>
    );
  }

  // M1 fix: Math.max(0, ...) guards against data integrity edge cases
  const cappedUsers = data.distribution
    .filter((row) => STAGES_ABOVE_CAP.includes(row.stage as Stage))
    .reduce((sum, row) => sum + Math.max(0, row.currentCount - row.effectiveCount), 0);

  return (
    <div className="max-w-4xl">
      <div className="phead" style={{ marginBottom: 24 }}>
        <p className="eyebrow" style={{ margin: '0 0 12px' }}>
          <Brain size={13} style={{ color: 'var(--amber)' }} /> Neuro Score
        </p>
        <h2 style={{ fontSize: 34, lineHeight: '38px' }}>Brain Monitor</h2>
        <p className="sub" style={{ marginTop: 14, fontSize: 14.5 }}>
          Neuro Score stage distribution across all users
        </p>
      </div>

      {/* Summary stats */}
      <div className="stats" style={{ marginTop: 0, gridTemplateColumns: cappedUsers > 0 ? 'repeat(2,minmax(0,1fr))' : 'minmax(0,1fr)' }}>
        <div className="stat">
          <span className="accent" style={{ background: 'var(--amber)' }} />
          <b>USERS WITH ACTIVE BRAINS</b>
          <em>{data.total}</em>
        </div>
        {cappedUsers > 0 && (
          <div className="stat" style={{ height: 'auto', paddingBottom: 18 }}>
            <span className="accent" style={{ background: 'var(--amber)' }} />
            <b style={{ color: 'var(--amber)' }}>FREE-TIER CAPPED USERS</b>
            <em style={{ color: 'var(--amber)' }}>{cappedUsers}</em>
            <p style={{ margin: '6px 0 0', fontSize: 11, color: 'var(--muted-2)' }}>
              Earned stage above &quot;{FREE_TIER_CAP}&quot; but capped
            </p>
          </div>
        )}
      </div>

      {/* Distribution table */}
      <div className="card" style={{ marginTop: 24 }}>
        <span className="accent" style={{ width: 56, background: 'var(--amber)' }} />
        <h3>Stage Distribution</h3>
        <p className="sub">
          <span style={{ fontWeight: 700, color: 'var(--text-2)' }}>Earned</span> = true stage from Neuro Score &nbsp;·&nbsp;
          <span style={{ fontWeight: 700, color: 'var(--text-2)' }}>Visible</span> = stage user sees (may be capped for free tier)
        </p>

        <div style={{ marginTop: 18 }}>
          {/* Header row */}
          <div
            className="grid grid-cols-[120px_1fr_1fr] gap-4"
            style={{ padding: '0 0 10px', borderBottom: '1px solid var(--line-2)' }}
          >
            <span className="lbl">STAGE</span>
            <span className="lbl">EARNED (CURRENT)</span>
            <span className="lbl">VISIBLE (EFFECTIVE)</span>
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
                className="grid grid-cols-[120px_1fr_1fr] gap-4 items-center"
                style={{ padding: '12px 0', borderBottom: '1px solid var(--hair)' }}
              >
                {/* Stage label */}
                <div className="flex items-center gap-2">
                  <span className="shrink-0" style={{ width: 7, height: 7, borderRadius: 1, background: accent }} />
                  <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text)' }}>
                    {STAGE_LABELS[stageKey]}
                  </span>
                  {isCapped && (
                    <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.04em', color: 'var(--amber)' }}>CAP</span>
                  )}
                </div>

                {/* Earned (currentStage) */}
                <div>
                  <div className="flex items-baseline gap-1.5">
                    <span style={{ fontFamily: 'var(--mono)', fontWeight: 500, fontSize: 14, color: 'var(--text)' }}>
                      {row.currentCount}
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--muted-2)' }}>users</span>
                  </div>
                  <div style={{ marginTop: 8 }}><PctBar pct={row.currentPct} accent={accent} /></div>
                </div>

                {/* Visible (effectiveStage) */}
                <div>
                  <div className="flex items-baseline gap-1.5">
                    <span style={{ fontFamily: 'var(--mono)', fontWeight: 500, fontSize: 14, color: 'var(--text)' }}>
                      {row.effectiveCount}
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--muted-2)' }}>users</span>
                  </div>
                  <div style={{ marginTop: 8 }}><PctBar pct={row.effectivePct} accent={isCapped ? capAccent : accent} /></div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <p className="footnote" style={{ marginTop: 20, textAlign: 'left' }}>
        Data updates in real-time via Convex subscriptions. Free-tier users are capped at &quot;{FREE_TIER_CAP}&quot; for visible stage.
      </p>

      {/* Stage migration tool */}
      <div className="card" style={{ marginTop: 24 }}>
        <span className="accent" style={{ width: 56, background: 'var(--amber)' }} />
        <div className="flex items-center gap-2">
          <Wrench size={15} style={{ color: 'var(--muted-3)' }} />
          <h3>Stage Migration Tool</h3>
        </div>
        <p className="sub">
          Remaps legacy stage names (baby → beginner, toddler → intern, etc.) in all brain state documents.
          Run once after upgrading from the old stage system. Safe to run multiple times.
        </p>
        <div className="flex items-center gap-4 flex-wrap" style={{ marginTop: 18 }}>
          <button
            onClick={handleMigrate}
            disabled={migrating}
            className="btn-g disabled:opacity-50"
            style={{ color: 'var(--amber)', borderColor: 'rgba(217,148,5,.4)' }}
          >
            <Wrench size={14} /> {migrating ? 'Running…' : 'Fix Legacy Stages'}
          </button>
          {migrateResult && (
            <span style={{ fontSize: 12.5, color: 'var(--muted)' }}>
              Done — {migrateResult.migrated} of {migrateResult.total} documents updated.
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
