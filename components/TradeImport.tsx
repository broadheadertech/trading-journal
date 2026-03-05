'use client';

import { useState, useCallback, useRef } from 'react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { Upload, FileText, Check, X, AlertTriangle, ChevronRight, ChevronLeft, Loader2 } from 'lucide-react';

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-[#0a0a14] border border-white/10 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <Upload size={20} className="text-white/60" />
            <h2 className="text-lg font-semibold text-white">Import Trades</h2>
          </div>
          <button onClick={onClose} className="text-white/40 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Steps indicator */}
        <div className="flex items-center gap-2 px-6 py-3 border-b border-white/5">
          {[1, 2, 3].map(s => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium ${
                step >= s ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40' : 'bg-white/5 text-white/30 border border-white/10'
              }`}>
                {step > s ? <Check size={14} /> : s}
              </div>
              <span className={`text-xs hidden sm:inline ${step >= s ? 'text-white/70' : 'text-white/30'}`}>
                {s === 1 ? 'Upload' : s === 2 ? 'Map Columns' : 'Preview & Import'}
              </span>
              {s < 3 && <ChevronRight size={14} className="text-white/20 mx-1" />}
            </div>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">

          {/* Step 1: Upload */}
          {step === 1 && (
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-xl p-12 text-center transition-colors cursor-pointer ${
                dragOver ? 'border-blue-400 bg-blue-500/10' : 'border-white/15 hover:border-white/30'
              }`}
              onClick={() => fileRef.current?.click()}
            >
              <input
                ref={fileRef}
                type="file"
                accept=".csv,.xlsx,.xls,.tsv"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
              />
              <FileText size={40} className="mx-auto text-white/30 mb-4" />
              <p className="text-white/70 text-sm mb-1">Drop your CSV or Excel file here</p>
              <p className="text-white/40 text-xs">or click to browse — .csv, .xlsx supported</p>
              <p className="text-white/30 text-xs mt-4">
                Supports exports from Binance, Bybit, TradingView, MetaTrader, and most brokers
              </p>
            </div>
          )}

          {/* Step 2: Column Mapping */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-white/60">
                  <span className="text-white font-medium">{rawRows.length}</span> rows detected in <span className="text-white/80">{fileName}</span>
                </p>
                <p className="text-xs text-white/40">{columns.length} columns</p>
              </div>

              <div className="space-y-2">
                {MAPPABLE_FIELDS.map(({ field, label, required }) => (
                  <div key={field} className="flex items-center gap-3">
                    <span className={`text-xs w-44 ${required ? 'text-white/80' : 'text-white/50'}`}>
                      {label} {required && <span className="text-red-400">*</span>}
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
                      className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white/80 outline-none focus:border-blue-500/50"
                    >
                      <option value="">— Not mapped —</option>
                      {columns.map(col => (
                        <option key={col} value={col}>{col}</option>
                      ))}
                    </select>
                    {Object.values(mapping).includes(field) && (
                      <Check size={14} className="text-emerald-400 flex-shrink-0" />
                    )}
                  </div>
                ))}
              </div>

              {/* Preview */}
              {rawRows.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs text-white/40 mb-2">Preview (first 3 rows):</p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-white/10">
                          {MAPPABLE_FIELDS.filter(f => Object.values(mapping).includes(f.field)).map(f => (
                            <th key={f.field} className="text-left text-white/50 px-2 py-1 font-medium">{f.label}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {rawRows.slice(0, 3).map((row, i) => (
                          <tr key={i} className="border-b border-white/5">
                            {MAPPABLE_FIELDS.filter(f => Object.values(mapping).includes(f.field)).map(f => {
                              const col = Object.entries(mapping).find(([, mf]) => mf === f.field)?.[0];
                              return <td key={f.field} className="px-2 py-1 text-white/70">{col ? row[col] || '—' : '—'}</td>;
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
            <div className="space-y-4">
              {/* Summary */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-emerald-400">{validation.valid.length}</p>
                  <p className="text-xs text-emerald-400/70">Valid trades</p>
                </div>
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-red-400">{validation.errors.length}</p>
                  <p className="text-xs text-red-400/70">Errors (skipped)</p>
                </div>
              </div>

              {/* Error details */}
              {validation.errors.length > 0 && (
                <div className="bg-red-500/5 border border-red-500/10 rounded-xl p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle size={14} className="text-red-400" />
                    <p className="text-xs text-red-400 font-medium">Rows with errors (will be skipped):</p>
                  </div>
                  <div className="max-h-32 overflow-y-auto space-y-0.5">
                    {validation.errors.slice(0, 20).map((err, i) => (
                      <p key={i} className="text-xs text-red-400/70">Row {err.row}: {err.reason}</p>
                    ))}
                    {validation.errors.length > 20 && (
                      <p className="text-xs text-red-400/50">...and {validation.errors.length - 20} more</p>
                    )}
                  </div>
                </div>
              )}

              {/* Valid trades preview */}
              {validation.valid.length > 0 && (
                <div>
                  <p className="text-xs text-white/40 mb-2">Preview of valid trades:</p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-white/10">
                          <th className="text-left text-white/50 px-2 py-1">Coin</th>
                          <th className="text-left text-white/50 px-2 py-1">Entry</th>
                          <th className="text-left text-white/50 px-2 py-1">Exit</th>
                          <th className="text-left text-white/50 px-2 py-1">Capital</th>
                          <th className="text-left text-white/50 px-2 py-1">P&L</th>
                          <th className="text-left text-white/50 px-2 py-1">Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {validation.valid.slice(0, 5).map((t, i) => (
                          <tr key={i} className="border-b border-white/5">
                            <td className="px-2 py-1 text-white/80 font-medium">{t.coin}</td>
                            <td className="px-2 py-1 text-white/60">${t.entryPrice.toLocaleString()}</td>
                            <td className="px-2 py-1 text-white/60">{t.exitPrice ? `$${t.exitPrice.toLocaleString()}` : '—'}</td>
                            <td className="px-2 py-1 text-white/60">${t.capital.toLocaleString()}</td>
                            <td className={`px-2 py-1 ${(t.actualPnL ?? 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                              {t.actualPnL !== null ? `$${t.actualPnL.toFixed(2)}` : '—'}
                            </td>
                            <td className="px-2 py-1 text-white/60">{t.entryDate.slice(0, 10)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {validation.valid.length > 5 && (
                      <p className="text-xs text-white/30 mt-1 px-2">...and {validation.valid.length - 5} more</p>
                    )}
                  </div>
                </div>
              )}

              {/* Progress bar */}
              {importing && (
                <div className="mt-4">
                  <div className="w-full bg-white/5 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-blue-500 h-full rounded-full transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <p className="text-xs text-white/40 mt-1 text-center">Importing... {progress}%</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-white/10">
          <button
            onClick={step === 1 ? onClose : () => setStep((step - 1) as 1 | 2)}
            className="flex items-center gap-2 px-4 py-2 text-sm text-white/60 hover:text-white transition-colors"
            disabled={importing}
          >
            <ChevronLeft size={16} /> {step === 1 ? 'Cancel' : 'Back'}
          </button>

          {step === 2 && (
            <button
              onClick={handleValidate}
              disabled={!requiredMapped}
              className="flex items-center gap-2 px-5 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Validate & Preview <ChevronRight size={16} />
            </button>
          )}

          {step === 3 && validation && (
            <button
              onClick={handleImport}
              disabled={importing || validation.valid.length === 0}
              className="flex items-center gap-2 px-5 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {importing ? (
                <><Loader2 size={16} className="animate-spin" /> Importing...</>
              ) : (
                <><Check size={16} /> Import {validation.valid.length} Trades</>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
