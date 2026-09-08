'use client';

import { useState, useCallback, useRef } from 'react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { UploadSimple as Upload, FileText, Check, X, Warning as AlertTriangle, CaretRight as ChevronRight, CaretLeft as ChevronLeft, CircleNotch as Loader2 } from '@phosphor-icons/react';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ImportedTrade {
  coin: string;
  entryPrice: number;
  exitPrice: number | null;
  entryDate: string;
  exitDate: string | null;
  capital: number;
  actualPnL: number | null;
  actualPnLPercent: number | null;
  strategy: string;
  direction: 'long' | 'short';
  leverage: number | null;
  stopLoss: number | null;
  notes: string;
  tags: string[];
  marketType: 'crypto' | 'stocks' | 'forex';
  isOpen: boolean;
}

interface TradeImportProps {
  onImport: (trades: ImportedTrade[]) => Promise<void>;
  onClose: () => void;
  strategies: string[];
}

type TradeField = keyof ImportedTrade;

interface ColumnMapping {
  field: TradeField;
  label: string;
  required: boolean;
}

const MAPPABLE_FIELDS: ColumnMapping[] = [
  { field: 'coin', label: 'Symbol / Pair', required: true },
  { field: 'entryPrice', label: 'Entry Price', required: true },
  { field: 'exitPrice', label: 'Exit Price', required: false },
  { field: 'entryDate', label: 'Entry Date', required: true },
  { field: 'exitDate', label: 'Exit Date', required: false },
  { field: 'capital', label: 'Position Size / Capital', required: true },
  { field: 'actualPnL', label: 'P&L ($)', required: false },
  { field: 'direction', label: 'Direction (Long/Short)', required: false },
  { field: 'leverage', label: 'Leverage', required: false },
  { field: 'stopLoss', label: 'Stop Loss', required: false },
  { field: 'strategy', label: 'Strategy', required: false },
  { field: 'notes', label: 'Notes', required: false },
  { field: 'tags', label: 'Tags', required: false },
  { field: 'marketType', label: 'Market Type', required: false },
];

// ─── Auto-detection patterns ─────────────────────────────────────────────────

const COLUMN_PATTERNS: Record<TradeField, string[]> = {
  coin: ['symbol', 'pair', 'ticker', 'asset', 'coin', 'instrument', 'market', 'name'],
  entryPrice: ['entry price', 'open price', 'buy price', 'entry', 'open', 'avg entry', 'average entry'],
  exitPrice: ['exit price', 'close price', 'sell price', 'exit', 'close', 'avg exit'],
  entryDate: ['entry date', 'open date', 'date', 'time', 'datetime', 'entry time', 'open time', 'timestamp'],
  exitDate: ['exit date', 'close date', 'exit time', 'close time', 'closed at'],
  capital: ['size', 'quantity', 'amount', 'capital', 'position size', 'volume', 'cost', 'notional', 'position'],
  actualPnL: ['pnl', 'p&l', 'profit', 'realized pnl', 'realized p&l', 'net pnl', 'gain/loss', 'gain', 'net profit', 'return'],
  actualPnLPercent: ['pnl %', 'p&l %', 'return %', 'profit %', 'pnl percent'],
  direction: ['direction', 'side', 'type', 'order type', 'trade type', 'action'],
  leverage: ['leverage', 'lev', 'margin'],
  stopLoss: ['stop loss', 'sl', 'stop', 'stoploss'],
  strategy: ['strategy', 'setup', 'system', 'method', 'plan'],
  notes: ['notes', 'comment', 'comments', 'memo', 'description', 'reason'],
  tags: ['tag', 'tags', 'label', 'labels', 'category'],
  marketType: ['market', 'market type', 'asset class', 'exchange'],
  isOpen: [],
};

function autoDetectMapping(columns: string[]): Record<string, TradeField | ''> {
  const mapping: Record<string, TradeField | ''> = {};
  const used = new Set<TradeField>();

  for (const col of columns) {
    const lower = col.toLowerCase().trim();
    let bestMatch: TradeField | '' = '';

    for (const [field, patterns] of Object.entries(COLUMN_PATTERNS) as [TradeField, string[]][]) {
      if (used.has(field)) continue;
      if (patterns.some(p => lower === p || lower.includes(p))) {
        bestMatch = field;
        break;
      }
    }

    mapping[col] = bestMatch;
    if (bestMatch) used.add(bestMatch);
  }

  return mapping;
}

// ─── Date parsing ────────────────────────────────────────────────────────────

function parseDate(value: string): string | null {
  if (!value || !value.trim()) return null;
  const v = value.trim();

  // Try ISO format first
  const isoDate = new Date(v);
  if (!isNaN(isoDate.getTime()) && v.length > 6) return isoDate.toISOString();

  // Try MM/DD/YYYY
  const usMatch = v.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(.*)$/);
  if (usMatch) {
    const d = new Date(`${usMatch[3]}-${usMatch[1].padStart(2, '0')}-${usMatch[2].padStart(2, '0')}${usMatch[4] || 'T00:00:00'}`);
    if (!isNaN(d.getTime())) return d.toISOString();
  }

  // Try DD/MM/YYYY
  const euMatch = v.match(/^(\d{1,2})[-.](\d{1,2})[-.](\d{4})(.*)$/);
  if (euMatch) {
    const d = new Date(`${euMatch[3]}-${euMatch[2].padStart(2, '0')}-${euMatch[1].padStart(2, '0')}${euMatch[4] || 'T00:00:00'}`);
    if (!isNaN(d.getTime())) return d.toISOString();
  }

  // Try Unix timestamp (seconds or ms)
  const num = Number(v);
  if (!isNaN(num) && num > 1e9) {
    const d = new Date(num > 1e12 ? num : num * 1000);
    if (!isNaN(d.getTime())) return d.toISOString();
  }

  return null;
}

function parseNumber(value: string): number | null {
  if (!value || !value.trim()) return null;
  const cleaned = value.replace(/[$,\s%]/g, '').trim();
  const num = Number(cleaned);
  return isNaN(num) ? null : num;
}

function parseDirection(value: string): 'long' | 'short' {
  const lower = (value || '').toLowerCase().trim();
  if (['short', 'sell', 's'].includes(lower)) return 'short';
  return 'long';
}

function parseMarketType(value: string): 'crypto' | 'stocks' | 'forex' {
  const lower = (value || '').toLowerCase().trim();
  if (['stock', 'stocks', 'equity', 'equities'].includes(lower)) return 'stocks';
  if (['forex', 'fx', 'currency'].includes(lower)) return 'forex';
  return 'crypto';
}

// ─── Validation ──────────────────────────────────────────────────────────────

interface ValidationResult {
  valid: ImportedTrade[];
  errors: { row: number; reason: string }[];
}

function validateAndConvert(
  rows: Record<string, string>[],
  mapping: Record<string, TradeField | ''>
): ValidationResult {
  const valid: ImportedTrade[] = [];
  const errors: { row: number; reason: string }[] = [];

  const reverseMap: Partial<Record<TradeField, string>> = {};
  for (const [col, field] of Object.entries(mapping)) {
    if (field) reverseMap[field] = col;
  }

  const get = (row: Record<string, string>, field: TradeField): string => {
    const col = reverseMap[field];
    return col ? (row[col] || '') : '';
  };

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2; // +2 for header + 1-based

    // Required fields
    const coin = get(row, 'coin').trim();
    if (!coin) { errors.push({ row: rowNum, reason: 'Missing symbol/coin' }); continue; }

    const entryPrice = parseNumber(get(row, 'entryPrice'));
    if (entryPrice === null || entryPrice <= 0) { errors.push({ row: rowNum, reason: 'Invalid entry price' }); continue; }

    const entryDate = parseDate(get(row, 'entryDate'));
    if (!entryDate) { errors.push({ row: rowNum, reason: 'Invalid entry date' }); continue; }

    const capital = parseNumber(get(row, 'capital'));
    if (capital === null || capital <= 0) { errors.push({ row: rowNum, reason: 'Invalid capital/position size' }); continue; }

    // Optional fields
    const exitPrice = parseNumber(get(row, 'exitPrice'));
    const exitDate = parseDate(get(row, 'exitDate'));
    const direction = parseDirection(get(row, 'direction'));
    const leverage = parseNumber(get(row, 'leverage'));
    const stopLoss = parseNumber(get(row, 'stopLoss'));
    const strategy = get(row, 'strategy').trim() || 'Imported';
    const notes = get(row, 'notes').trim();
    const tagsRaw = get(row, 'tags').trim();
    const tags = tagsRaw ? tagsRaw.split(',').map(t => t.trim()).filter(Boolean) : [];
    const marketType = parseMarketType(get(row, 'marketType'));

    // P&L calculation
    let actualPnL = parseNumber(get(row, 'actualPnL'));
    let actualPnLPercent = parseNumber(get(row, 'actualPnLPercent'));

    if (actualPnL === null && exitPrice !== null) {
      const lev = leverage ?? 1;
      if (direction === 'long') {
        actualPnLPercent = ((exitPrice - entryPrice) / entryPrice) * 100 * lev;
      } else {
        actualPnLPercent = ((entryPrice - exitPrice) / entryPrice) * 100 * lev;
      }
      actualPnL = (actualPnLPercent / 100) * capital;
    } else if (actualPnL !== null && actualPnLPercent === null) {
      actualPnLPercent = (actualPnL / capital) * 100;
    }

    const isOpen = exitPrice === null && exitDate === null && actualPnL === null;

    valid.push({
      coin, entryPrice, exitPrice, entryDate, exitDate,
      capital, actualPnL, actualPnLPercent, strategy,
      direction, leverage, stopLoss, notes, tags, marketType, isOpen,
    });
  }

  return { valid, errors };
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function TradeImport({ onImport, onClose, strategies }: TradeImportProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [fileName, setFileName] = useState('');
  const [rawRows, setRawRows] = useState<Record<string, string>[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Record<string, TradeField | ''>>({});
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFile = useCallback((file: File) => {
    setFileName(file.name);
    const ext = file.name.split('.').pop()?.toLowerCase();

    if (ext === 'csv' || ext === 'tsv') {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          const rows = results.data as Record<string, string>[];
          const cols = results.meta.fields || [];
          setRawRows(rows);
          setColumns(cols);
          setMapping(autoDetectMapping(cols));
          setStep(2);
        },
        error: () => alert('Failed to parse CSV file'),
      });
    } else if (ext === 'xlsx' || ext === 'xls') {
      const reader = new FileReader();
      reader.onload = (e) => {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, { raw: false });
        const cols = rows.length > 0 ? Object.keys(rows[0]) : [];
        setRawRows(rows);
        setColumns(cols);
        setMapping(autoDetectMapping(cols));
        setStep(2);
      };
      reader.readAsArrayBuffer(file);
    } else {
      alert('Unsupported file type. Please use .csv or .xlsx');
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleValidate = () => {
    const result = validateAndConvert(rawRows, mapping);
    setValidation(result);
    setStep(3);
  };

  const handleImport = async () => {
    if (!validation) return;
    setImporting(true);
    setProgress(0);

    try {
      // Simulate progress
      const interval = setInterval(() => {
        setProgress(p => Math.min(p + 10, 90));
      }, 200);

      await onImport(validation.valid);

      clearInterval(interval);
      setProgress(100);
    } catch (err) {
      alert('Import failed: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setImporting(false);
    }
  };

  const requiredMapped = MAPPABLE_FIELDS
    .filter(f => f.required)
    .every(f => Object.values(mapping).includes(f.field));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(4,7,11,.86)' }}>
      <div className="w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col"
        style={{ border: '1px solid var(--line)', borderRadius: 2, background: 'var(--panel)', position: 'relative' }}>
        <span className="accent" style={{ position: 'absolute', left: 0, top: -1, width: 120, height: 3, background: 'var(--amber)' }} />
        {/* Header */}
        <div className="flex items-center justify-between" style={{ padding: '20px 26px', borderBottom: '1px solid var(--line)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Upload size={16} style={{ color: 'var(--amber)', flex: 'none' }} />
            <h3 style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: 17, margin: 0 }}>Import Trades</h3>
          </div>
          <button onClick={onClose} className="chip" style={{ width: 32, height: 32, padding: 0, justifyContent: 'center' }} aria-label="Close">
            <X size={16} />
          </button>
        </div>

        {/* Steps indicator */}
        <div className="flex items-center flex-wrap" style={{ gap: 10, padding: '14px 26px', borderBottom: '1px solid var(--hair, var(--line))' }}>
          {[1, 2, 3].map(s => (
            <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{
                width: 24, height: 24, borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'var(--display)', fontWeight: 700, fontSize: 12,
                border: `1px solid ${step >= s ? 'var(--amber)' : 'var(--line)'}`,
                color: step >= s ? 'var(--amber)' : 'var(--muted-3)',
                background: 'var(--panel-2)',
              }}>
                {step > s ? <Check size={12} /> : s}
              </span>
              <span className="hidden sm:inline" style={{ fontSize: '11.5px', fontWeight: step >= s ? 700 : 400, color: step >= s ? 'var(--text)' : 'var(--muted-3)' }}>
                {s === 1 ? 'Upload' : s === 2 ? 'Map Columns' : 'Preview & Import'}
              </span>
              {s < 3 && <ChevronRight size={13} style={{ color: 'var(--muted-3)', margin: '0 4px' }} />}
            </div>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto" style={{ padding: '24px 26px' }}>

          {/* Step 1: Upload */}
          {step === 1 && (
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              className="blank"
              style={{
                padding: '48px 28px', textAlign: 'center', cursor: 'pointer',
                borderStyle: 'dashed',
                borderColor: dragOver ? 'var(--amber)' : 'var(--line-2)',
              }}
              onClick={() => fileRef.current?.click()}
            >
              <span className="corner" style={{ left: -1, top: -1, borderRight: 0, borderBottom: 0 }} />
              <span className="corner" style={{ right: -1, bottom: -1, borderLeft: 0, borderTop: 0 }} />
              <input
                ref={fileRef}
                type="file"
                accept=".csv,.xlsx,.xls,.tsv"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
              />
              <div className="badge" style={{ margin: '0 auto 24px', border: '1px solid rgba(217,148,5,.4)', background: 'var(--panel-2)' }}>
                <FileText size={24} style={{ color: 'var(--amber)' }} />
              </div>
              <h4>Drop your CSV or Excel file here</h4>
              <p>or click to browse — .csv, .xlsx supported</p>
              <p className="footnote" style={{ marginTop: 20 }}>
                Supports exports from Binance, Bybit, TradingView, MetaTrader, and most brokers
              </p>
            </div>
          )}

          {/* Step 2: Column Mapping */}
          {step === 2 && (
            <div>
              <div className="inset" style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', padding: '11px 16px' }}>
                <p style={{ margin: 0, fontSize: '12px', color: 'var(--muted)' }}>
                  <span style={{ fontFamily: 'var(--mono)', color: 'var(--text)' }}>{rawRows.length}</span> rows detected in <span style={{ color: 'var(--text-2, var(--text))' }}>{fileName}</span>
                </p>
                <p style={{ margin: 0, marginLeft: 'auto', fontFamily: 'var(--mono)', fontSize: '11px', color: 'var(--muted-2)' }}>{columns.length} columns</p>
              </div>

              <div style={{ display: 'grid', gap: 8, marginTop: 18 }}>
                {MAPPABLE_FIELDS.map(({ field, label, required }) => (
                  <div key={field} style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                    <span style={{ width: 172, flex: 'none', fontSize: '11.5px', color: required ? 'var(--text)' : 'var(--muted-2)' }}>
                      {label} {required && <span style={{ color: 'var(--red)' }}>*</span>}
                    </span>
                    <select
                      value={Object.entries(mapping).find(([, f]) => f === field)?.[0] || ''}
                      onChange={(e) => {
                        const newMapping = { ...mapping };
                        // Clear old mapping for this field
                        for (const [col, f] of Object.entries(newMapping)) {
                          if (f === field) newMapping[col] = '';
                        }
                        // Set new mapping
                        if (e.target.value) newMapping[e.target.value] = field;
                        setMapping(newMapping);
                      }}
                      style={{
                        flex: 1, minWidth: 160, height: 36, appearance: 'none',
                        border: '1px solid var(--line)', borderRadius: 2, background: 'var(--panel-2)',
                        padding: '0 12px', fontSize: '12.5px', color: 'var(--text)', outline: 'none',
                      }}
                    >
                      <option value="">— Not mapped —</option>
                      {columns.map(col => (
                        <option key={col} value={col}>{col}</option>
                      ))}
                    </select>
                    <span style={{ width: 14, flex: 'none' }}>
                      {Object.values(mapping).includes(field) && (
                        <Check size={14} style={{ color: 'var(--green)' }} />
                      )}
                    </span>
                  </div>
                ))}
              </div>

              {/* Preview */}
              {rawRows.length > 0 && (
                <div style={{ marginTop: 22 }}>
                  <p className="lbl b95" style={{ marginBottom: 10 }}>PREVIEW (FIRST 3 ROWS)</p>
                  <div style={{ overflowX: 'auto', border: '1px solid var(--line)', borderRadius: 2, background: 'var(--panel-2)' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11.5px' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--line)' }}>
                          {MAPPABLE_FIELDS.filter(f => Object.values(mapping).includes(f.field)).map(f => (
                            <th key={f.field} style={TH_STYLE}>{f.label}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {rawRows.slice(0, 3).map((row, i) => (
                          <tr key={i} style={{ borderBottom: '1px solid var(--hair, var(--line))' }}>
                            {MAPPABLE_FIELDS.filter(f => Object.values(mapping).includes(f.field)).map(f => {
                              const col = Object.entries(mapping).find(([, mf]) => mf === f.field)?.[0];
                              return <td key={f.field} style={TD_STYLE}>{col ? row[col] || '—' : '—'}</td>;
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Preview & Import */}
          {step === 3 && validation && (
            <div>
              {/* Summary */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 12 }}>
                <div className="inset" style={{ position: 'relative', padding: '16px 18px' }}>
                  <span className="accent" style={{ position: 'absolute', left: 0, top: -1, width: 36, height: 3, background: 'var(--green)' }} />
                  <p style={{ margin: 0, fontFamily: 'var(--mono)', fontWeight: 500, fontSize: 26, color: 'var(--green)' }}>{validation.valid.length}</p>
                  <p className="lbl" style={{ marginTop: 8 }}>VALID TRADES</p>
                </div>
                <div className="inset" style={{ position: 'relative', padding: '16px 18px' }}>
                  <span className="accent" style={{ position: 'absolute', left: 0, top: -1, width: 36, height: 3, background: 'var(--red)' }} />
                  <p style={{ margin: 0, fontFamily: 'var(--mono)', fontWeight: 500, fontSize: 26, color: 'var(--red)' }}>{validation.errors.length}</p>
                  <p className="lbl" style={{ marginTop: 8 }}>ERRORS (SKIPPED)</p>
                </div>
              </div>

              {/* Error details */}
              {validation.errors.length > 0 && (
                <div className="inset" style={{ marginTop: 16, borderLeft: '3px solid var(--red)', padding: '13px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                    <AlertTriangle size={13} style={{ color: 'var(--red)', flex: 'none' }} />
                    <p className="lbl" style={{ color: 'var(--red)' }}>ROWS WITH ERRORS (WILL BE SKIPPED)</p>
                  </div>
                  <div style={{ maxHeight: 128, overflowY: 'auto', marginTop: 10 }}>
                    {validation.errors.slice(0, 20).map((err, i) => (
                      <p key={i} style={{ margin: '3px 0 0', fontSize: '11px', color: 'var(--muted)' }}>Row {err.row}: {err.reason}</p>
                    ))}
                    {validation.errors.length > 20 && (
                      <p style={{ margin: '3px 0 0', fontSize: '11px', color: 'var(--muted-2)' }}>...and {validation.errors.length - 20} more</p>
                    )}
                  </div>
                </div>
              )}

              {/* Valid trades preview */}
              {validation.valid.length > 0 && (
                <div style={{ marginTop: 22 }}>
                  <p className="lbl b95" style={{ marginBottom: 10 }}>PREVIEW OF VALID TRADES</p>
                  <div style={{ overflowX: 'auto', border: '1px solid var(--line)', borderRadius: 2, background: 'var(--panel-2)' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11.5px' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--line)' }}>
                          <th style={TH_STYLE}>Coin</th>
                          <th style={TH_STYLE}>Entry</th>
                          <th style={TH_STYLE}>Exit</th>
                          <th style={TH_STYLE}>Capital</th>
                          <th style={TH_STYLE}>P&L</th>
                          <th style={TH_STYLE}>Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {validation.valid.slice(0, 5).map((t, i) => (
                          <tr key={i} style={{ borderBottom: '1px solid var(--hair, var(--line))' }}>
                            <td style={{ ...TD_STYLE, color: 'var(--text)', fontWeight: 700 }}>{t.coin}</td>
                            <td style={TD_NUM}>${t.entryPrice.toLocaleString()}</td>
                            <td style={TD_NUM}>{t.exitPrice ? `$${t.exitPrice.toLocaleString()}` : '—'}</td>
                            <td style={TD_NUM}>${t.capital.toLocaleString()}</td>
                            <td style={{ ...TD_NUM, color: (t.actualPnL ?? 0) >= 0 ? 'var(--green)' : 'var(--red)' }}>
                              {t.actualPnL !== null ? `$${t.actualPnL.toFixed(2)}` : '—'}
                            </td>
                            <td style={TD_NUM}>{t.entryDate.slice(0, 10)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {validation.valid.length > 5 && (
                    <p style={{ margin: '8px 0 0', fontSize: '11px', color: 'var(--muted-2)' }}>...and {validation.valid.length - 5} more</p>
                  )}
                </div>
              )}

              {/* Progress bar */}
              {importing && (
                <div style={{ marginTop: 22 }}>
                  <span style={{ display: 'block', width: '100%', height: 2, background: 'var(--rail)' }}>
                    <i className="transition-all duration-300" style={{ display: 'block', width: `${progress}%`, height: 2, background: 'var(--amber)' }} />
                  </span>
                  <p style={{ margin: '10px 0 0', textAlign: 'center', fontFamily: 'var(--mono)', fontSize: '11px', color: 'var(--muted-2)' }}>Importing... {progress}%</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between" style={{ gap: 12, padding: '18px 26px', borderTop: '1px solid var(--line)' }}>
          <button
            onClick={step === 1 ? onClose : () => setStep((step - 1) as 1 | 2)}
            className="btn-g"
            style={{ height: 38 }}
            disabled={importing}
          >
            <ChevronLeft size={14} /> {step === 1 ? 'Cancel' : 'Back'}
          </button>

          {step === 2 && (
            <button
              onClick={handleValidate}
              disabled={!requiredMapped}
              className={requiredMapped ? 'btn-a' : 'btn-d'}
              style={{ height: 38 }}
            >
              Validate & Preview <ChevronRight size={14} />
            </button>
          )}

          {step === 3 && validation && (
            <button
              onClick={handleImport}
              disabled={importing || validation.valid.length === 0}
              className={importing || validation.valid.length === 0 ? 'btn-d' : 'btn-a'}
              style={{ height: 38 }}
            >
              {importing ? (
                <><Loader2 size={14} className="animate-spin" /> Importing...</>
              ) : (
                <><Check size={14} /> Import {validation.valid.length} Trades</>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Shared table chrome (module-level so it doesn't re-create per render) ────

const TH_STYLE: React.CSSProperties = {
  textAlign: 'left', padding: '9px 12px', fontWeight: 700, fontSize: '9px',
  letterSpacing: '.04em', textTransform: 'uppercase', color: 'var(--muted-2)', whiteSpace: 'nowrap',
};

const TD_STYLE: React.CSSProperties = {
  padding: '9px 12px', color: 'var(--muted)', whiteSpace: 'nowrap',
};

const TD_NUM: React.CSSProperties = {
  ...TD_STYLE, fontFamily: 'var(--mono)', fontWeight: 500,
};
