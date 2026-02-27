'use client';

import { useState, useEffect } from 'react';
import { SlidersHorizontal, Save, RotateCcw } from 'lucide-react';
import { useAdminAntiGamingThresholds, useAdminUpdateThresholds } from '@/hooks/useAdminStore';

// ─── Default values (match convex/lib/antiGaming.ts exported constants) ─────
const DEFAULTS = {
  phantomTradeWindowMs: 3_600_000,       // 60 minutes
  phantomTradeThreshold: 10,             // trades in window
  pnlAnomalyMinTrades: 20,              // closed trades
  pnlAnomalyWinRate: 1.0,               // 100%
  recoveryLockDurationMs: 172_800_000,   // 48 hours
  recoveryLockMaxTradesPerDay: 3,        // trades/day
} as const;

type ThresholdKey = keyof typeof DEFAULTS;

// ─── Field config for rendering ─────────────────────────────────────────────
interface FieldConfig {
  key: ThresholdKey;
  label: string;
  description: string;
  unit: string;
  // Display conversion: raw → display value
  toDisplay: (raw: number) => number;
  // Save conversion: display → raw value
  toRaw: (display: number) => number;
  min: number;
  max: number;
  step: number;
}

const FIELDS: FieldConfig[] = [
  {
    key: 'phantomTradeWindowMs',
    label: 'Phantom Trade Window',
    description: 'Time window for counting trades. Trades exceeding the threshold within this window are flagged as phantom.',
    unit: 'minutes',
    toDisplay: (ms) => Math.round(ms / 60_000),
    toRaw: (min) => min * 60_000,
    min: 5,
    max: 1440,
    step: 5,
  },
  {
    key: 'phantomTradeThreshold',
    label: 'Phantom Trade Threshold',
    description: 'Maximum trades allowed within the window before flagging as phantom. Blocking — zeroes score.',
    unit: 'trades',
    toDisplay: (v) => v,
    toRaw: (v) => v,
    min: 2,
    max: 100,
    step: 1,
  },
  {
    key: 'pnlAnomalyMinTrades',
    label: 'P&L Anomaly Min Trades',
    description: 'Minimum closed trades before P&L anomaly detection activates. Advisory — does not zero score.',
    unit: 'trades',
    toDisplay: (v) => v,
    toRaw: (v) => v,
    min: 5,
    max: 200,
    step: 1,
  },
  {
    key: 'pnlAnomalyWinRate',
    label: 'P&L Anomaly Win Rate',
    description: 'Win rate threshold that triggers anomaly flag when met or exceeded. Advisory only.',
    unit: '%',
    toDisplay: (v) => Math.round(v * 100),
    toRaw: (pct) => pct / 100,
    min: 50,
    max: 100,
    step: 1,
  },
  {
    key: 'recoveryLockDurationMs',
    label: 'Recovery Lock Duration',
    description: 'Duration of recovery lock after a stage regression. Limits scored trades per day during this period.',
    unit: 'hours',
    toDisplay: (ms) => Math.round(ms / 3_600_000),
    toRaw: (h) => h * 3_600_000,
    min: 1,
    max: 168,
    step: 1,
  },
  {
    key: 'recoveryLockMaxTradesPerDay',
    label: 'Recovery Lock Max Trades/Day',
    description: 'Maximum scored trades per day during recovery lock. Exceeding this zeroes the score. Blocking.',
    unit: 'trades/day',
    toDisplay: (v) => v,
    toRaw: (v) => v,
    min: 1,
    max: 20,
    step: 1,
  },
];

export default function ThresholdsPage() {
  const data = useAdminAntiGamingThresholds();
  const updateThresholds = useAdminUpdateThresholds();

  const [form, setForm] = useState<Record<ThresholdKey, number> | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveResult, setSaveResult] = useState<string | null>(null);

  // Initialize form when data loads
  useEffect(() => {
    if (data && !form) {
      setForm({ ...data });
    }
  }, [data, form]);

  // Loading skeleton
  if (data === undefined || !form) {
    return (
      <div className="space-y-4 max-w-3xl animate-pulse">
        <div className="h-8 w-56 bg-[var(--muted)] rounded" />
        <div className="h-4 w-80 bg-[var(--muted)] rounded" />
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="h-20 bg-[var(--muted)] rounded-xl" />
        ))}
      </div>
    );
  }

  // Capture narrowed data — TS doesn't narrow hook returns inside closures
  const currentData = data;
  const hasChanges = FIELDS.some((f) => form[f.key] !== currentData[f.key]);

  function handleChange(key: ThresholdKey, displayValue: number, field: FieldConfig) {
    setForm((prev) => prev ? { ...prev, [key]: field.toRaw(displayValue) } : prev);
    setSaveResult(null);
  }

  function handleResetField(key: ThresholdKey) {
    setForm((prev) => prev ? { ...prev, [key]: DEFAULTS[key] } : prev);
    setSaveResult(null);
  }

  function handleResetAll() {
    setForm({ ...DEFAULTS });
    setSaveResult(null);
  }

  async function handleSave() {
    if (!form) return;
    setSaving(true);
    setSaveResult(null);
    try {
      // Only send changed values
      const changed: Partial<Record<ThresholdKey, number>> = {};
      for (const f of FIELDS) {
        if (form[f.key] !== currentData[f.key]) {
          changed[f.key] = form[f.key];
        }
      }
      const result = await updateThresholds({ thresholds: changed });
      setSaveResult(`${result.updated} threshold${result.updated !== 1 ? 's' : ''} updated`);
    } catch {
      setSaveResult('Failed to save thresholds');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <SlidersHorizontal size={20} className="text-[var(--accent)]" />
          <h1 className="text-xl font-bold text-[var(--foreground)]">Anti-Gaming Thresholds</h1>
        </div>
        <p className="text-sm text-[var(--muted-foreground)]">
          Configure detection thresholds for the anti-gaming engine. Changes take effect immediately for new trades.
        </p>
      </div>

      {/* Threshold fields */}
      <div className="space-y-3">
        {FIELDS.map((field) => {
          const displayValue = field.toDisplay(form[field.key]);
          const defaultDisplay = field.toDisplay(DEFAULTS[field.key]);
          const isModified = form[field.key] !== DEFAULTS[field.key];

          return (
            <div
              key={field.key}
              className="rounded-xl border border-[var(--border)] bg-[var(--card)] px-5 py-4"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-[var(--foreground)]">{field.label}</p>
                    {isModified && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-yellow-500/15 text-yellow-400 font-medium">
                        Modified
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[var(--muted-foreground)] mt-0.5">{field.description}</p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <input
                    type="number"
                    value={displayValue}
                    onChange={(e) => handleChange(field.key, Number(e.target.value), field)}
                    min={field.min}
                    max={field.max}
                    step={field.step}
                    className="w-20 px-2 py-1.5 text-sm text-right font-mono tabular-nums rounded-lg border border-[var(--border)] bg-[var(--muted)]/40 text-[var(--foreground)] focus:outline-none focus:border-[var(--accent)]"
                  />
                  <span className="text-xs text-[var(--muted-foreground)] w-16">{field.unit}</span>

                  <button
                    type="button"
                    onClick={() => handleResetField(field.key)}
                    title={`Reset to default (${defaultDisplay} ${field.unit})`}
                    className="p-1 rounded text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors"
                  >
                    <RotateCcw size={14} />
                  </button>
                </div>
              </div>

              {/* Default indicator */}
              <p className="text-[11px] text-[var(--muted-foreground)] mt-1.5">
                Default: {defaultDisplay} {field.unit}
              </p>
            </div>
          );
        })}
      </div>

      {/* Actions bar */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || !hasChanges}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Save size={14} />
          {saving ? 'Saving...' : 'Save Changes'}
        </button>

        <button
          type="button"
          onClick={handleResetAll}
          disabled={saving}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium border border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors disabled:opacity-40"
        >
          <RotateCcw size={14} />
          Reset All to Defaults
        </button>

        {saveResult && (
          <span className={`text-xs font-medium ${saveResult.includes('Failed') ? 'text-red-400' : 'text-green-400'}`}>
            {saveResult}
          </span>
        )}
      </div>

      <p className="text-xs text-[var(--muted-foreground)]">
        Threshold changes are logged to the admin audit trail. Values take effect immediately via Convex real-time subscriptions.
      </p>
    </div>
  );
}
