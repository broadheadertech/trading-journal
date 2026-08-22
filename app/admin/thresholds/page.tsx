'use client';

import { useState, useEffect } from 'react';
import { SlidersHorizontal, FloppyDisk, ArrowCounterClockwise } from '@phosphor-icons/react';
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
        <div style={{ height: 32, width: 224, background: 'var(--panel-2)', borderRadius: 2 }} />
        <div style={{ height: 14, width: 320, background: 'var(--panel-2)', borderRadius: 2 }} />
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} style={{ height: 80, background: 'var(--panel-2)', border: '1px solid var(--line)', borderRadius: 2 }} />
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
    <div className="max-w-3xl">
      {/* Header */}
      <div className="phead" style={{ marginBottom: 24 }}>
        <p className="eyebrow" style={{ margin: '0 0 12px' }}>
          <SlidersHorizontal size={13} style={{ color: 'var(--amber)' }} /> Integrity
        </p>
        <h2 style={{ fontSize: 34, lineHeight: '38px' }}>Anti-Gaming Thresholds</h2>
        <p className="sub" style={{ marginTop: 14, fontSize: 14.5 }}>
          Configure detection thresholds for the anti-gaming engine. Changes take effect immediately for new trades.
        </p>
      </div>

      {/* Threshold fields */}
      <div>
        {FIELDS.map((field) => {
          const displayValue = field.toDisplay(form[field.key]);
          const defaultDisplay = field.toDisplay(DEFAULTS[field.key]);
          const isModified = form[field.key] !== DEFAULTS[field.key];

          return (
            <div key={field.key} className="card" style={{ marginBottom: 12 }}>
              <span className="accent" style={{ width: 56, background: isModified ? 'var(--amber)' : 'var(--line-2)' }} />
              <div className="flex items-start justify-between gap-6">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3">
                    <h4>{field.label}</h4>
                    {isModified && (
                      <span
                        className="chip"
                        style={{ height: 20, padding: '0 10px', fontSize: 9, fontWeight: 700, letterSpacing: '.04em', color: 'var(--amber)' }}
                      >
                        MODIFIED
                      </span>
                    )}
                  </div>
                  <p className="sub">{field.description}</p>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <input
                    type="number"
                    value={displayValue}
                    onChange={(e) => handleChange(field.key, Number(e.target.value), field)}
                    min={field.min}
                    max={field.max}
                    step={field.step}
                    className="text-right"
                    style={{
                      width: 84, height: 38, padding: '0 12px', borderRadius: 2,
                      border: '1px solid var(--line)', background: 'var(--panel-2)',
                      fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--text)', outline: 'none',
                    }}
                  />
                  <span style={{ width: 64, fontSize: 11.5, color: 'var(--muted-2)' }}>{field.unit}</span>

                  <button
                    type="button"
                    onClick={() => handleResetField(field.key)}
                    title={`Reset to default (${defaultDisplay} ${field.unit})`}
                    className="inline-flex items-center justify-center"
                    style={{
                      width: 30, height: 30, borderRadius: 2,
                      border: '1px solid var(--line)', background: 'var(--panel-2)', color: 'var(--muted-2)',
                    }}
                  >
                    <ArrowCounterClockwise size={14} />
                  </button>
                </div>
              </div>

              {/* Default indicator */}
              <p style={{ margin: '12px 0 0', fontSize: 11, color: 'var(--muted-2)' }}>
                Default: <span style={{ fontFamily: 'var(--mono)' }}>{defaultDisplay}</span> {field.unit}
              </p>
            </div>
          );
        })}
      </div>

      {/* Actions bar */}
      <div className="flex items-center gap-4 flex-wrap" style={{ marginTop: 24 }}>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || !hasChanges}
          className="btn-a disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <FloppyDisk size={14} />
          {saving ? 'Saving...' : 'Save Changes'}
        </button>

        <button
          type="button"
          onClick={handleResetAll}
          disabled={saving}
          className="btn-g disabled:opacity-40"
        >
          <ArrowCounterClockwise size={14} />
          Reset All to Defaults
        </button>

        {saveResult && (
          <span
            style={{
              fontSize: 12, fontWeight: 700,
              color: saveResult.includes('Failed') ? 'var(--red)' : 'var(--green)',
            }}
          >
            {saveResult}
          </span>
        )}
      </div>

      <p className="footnote" style={{ marginTop: 20, textAlign: 'left' }}>
        Threshold changes are logged to the admin audit trail. Values take effect immediately via Convex real-time subscriptions.
      </p>
    </div>
  );
}
