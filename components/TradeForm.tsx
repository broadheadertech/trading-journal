'use client';

import { useMemo, useState } from 'react';
import { Trade, EmotionState, TradeTag, Strategy, Direction, MarketType, RuleCompliance, Verdict } from '@/lib/types';
import { CRYPTO_SUGGESTIONS, FOREX_SUGGESTIONS, METALS_SUGGESTIONS, OIL_SUGGESTIONS, STOCK_SUGGESTIONS, EMOTION_OPTIONS, TAG_OPTIONS } from '@/lib/utils';
import { useCurrency } from '@/hooks/useCurrency';
import { defaultPipSize, defaultLotSize, pipsBetween, notionalAmount, realizedPnL } from '@/lib/pip-math';
import { TrendingUp, TrendingDown, AlertTriangle, X } from 'lucide-react';
import { format, parseISO } from 'date-fns';

// ─── Constants ───────────────────────────────────────────────────────

const SESSIONS = [
  { value: 'asia',     label: 'Asia',     hint: '00:00 – 09:00 UTC' },
  { value: 'london',   label: 'London',   hint: '08:00 – 17:00 UTC' },
  { value: 'new-york', label: 'New York', hint: '13:00 – 22:00 UTC' },
  { value: 'overlap',  label: 'Overlap',  hint: 'London / NY 13:00 – 17:00 UTC' },
  { value: 'sydney',   label: 'Sydney',   hint: '21:00 – 06:00 UTC' },
] as const;

const TIMEFRAMES = ['M1', 'M5', 'M15', 'M30', 'H1', 'H4', 'D1', 'W1', 'MN'] as const;

const ENTRY_TYPES: { value: 'market' | 'stop' | 'limit'; label: string }[] = [
  { value: 'market', label: 'Market' },
  { value: 'stop',   label: 'Stop' },
  { value: 'limit',  label: 'Limit' },
];

const BIAS_OPTIONS: { value: 'bullish' | 'bearish' | 'neutral'; label: string }[] = [
  { value: 'bullish', label: 'Bullish' },
  { value: 'bearish', label: 'Bearish' },
  { value: 'neutral', label: 'Neutral' },
];

const SOURCE_SUGGESTIONS = [
  'Own analysis',
  'TradingView alert',
  'Signal from Telegram',
  'News play',
  'Backtested setup',
  'Mentor / Coach',
];

const MARKET_OPTIONS: { value: MarketType; label: string }[] = [
  { value: 'forex',   label: 'Forex' },
  { value: 'metals',  label: 'Metals' },
  { value: 'crypto',  label: 'Crypto' },
  { value: 'stocks',  label: 'Stocks' },
  { value: 'oil',     label: 'Oil' },
];

// ─── Helpers ─────────────────────────────────────────────────────────

/** Cheap heuristic for inferring market from the pair symbol — keeps the form usable
 *  even if the user hasn't touched the Market selector. */
function inferMarket(symbol: string): MarketType {
  const sym = symbol.toUpperCase();
  if (sym.startsWith('XAU') || sym.startsWith('XAG') || sym === 'GOLD' || sym === 'SILVER') return 'metals';
  if (/^(BTC|ETH|SOL|XRP|ADA|DOGE|DOT|MATIC|AVAX|LINK|BNB)/.test(sym)) return 'crypto';
  if (/^(USOIL|WTI|BRENT)/.test(sym)) return 'oil';
  if (/^[A-Z]{6}$/.test(sym) || sym.includes('USD') || sym.includes('EUR') || sym.includes('JPY') || sym.includes('GBP') || sym.includes('CHF')) return 'forex';
  return 'forex';
}

function suggestionsFor(market: MarketType): string[] {
  switch (market) {
    case 'crypto': return CRYPTO_SUGGESTIONS;
    case 'forex':  return FOREX_SUGGESTIONS;
    case 'metals': return METALS_SUGGESTIONS;
    case 'oil':    return OIL_SUGGESTIONS;
    case 'stocks': return STOCK_SUGGESTIONS;
    default:       return FOREX_SUGGESTIONS;
  }
}

function buildIsoDateTime(date: string, time: string): string {
  const d = date || format(new Date(), 'yyyy-MM-dd');
  const t = time || '09:00';
  // Local-time ISO; matches what `<input type="datetime-local">` produces.
  return `${d}T${t}:00`;
}

function splitDateTime(iso: string | null | undefined): { date: string; time: string } {
  if (!iso) {
    const now = new Date();
    return { date: format(now, 'yyyy-MM-dd'), time: format(now, 'HH:mm') };
  }
  try {
    const d = parseISO(iso);
    return { date: format(d, 'yyyy-MM-dd'), time: format(d, 'HH:mm') };
  } catch {
    return { date: format(new Date(), 'yyyy-MM-dd'), time: '09:00' };
  }
}

// ─── Component ───────────────────────────────────────────────────────

interface TradeFormProps {
  strategies: Strategy[];
  trades: Trade[];
  editTrade?: Trade | null;
  onSubmit: (trade: Omit<Trade, 'id' | 'createdAt' | 'actualPnL' | 'actualPnLPercent' | 'verdict'>) => void;
  onCancel: () => void;
  /** Ignored by the new FX form but kept in the prop signature so existing callers compile. */
  prefilledEmotion?: { emotion: EmotionState; intensity: number; reasoning: string };
  /** Ignored by the new FX form — rule-break logging now happens via the Playbook tab. */
  onRuleBreak?: (ruleName: string, explanation: string) => void;
  /** Optional hint for the Amount field — not enforced. */
  availableBalance?: number;
}

export default function TradeForm({
  strategies, trades, editTrade, onSubmit, onCancel,
}: TradeFormProps) {
  const { formatCurrency } = useCurrency();

  // ── Initial values (edit prefill / sensible blanks) ──
  const initEntry = splitDateTime(editTrade?.entryDate);
  const initExit = editTrade?.exitDate ? splitDateTime(editTrade.exitDate) : null;

  // ── Identity ──
  const [date, setDate] = useState(initEntry.date);
  const [time, setTime] = useState(initEntry.time);
  const [pair, setPair] = useState(editTrade?.coin ?? '');
  const [market, setMarket] = useState<MarketType>(editTrade?.marketType ?? 'forex');
  const [session, setSession] = useState<string>(editTrade?.session ?? 'london');
  const [strategy, setStrategy] = useState(editTrade?.strategy ?? '');
  const [source, setSource] = useState(editTrade?.source ?? '');

  // ── Setup ──
  const [entryType, setEntryType] = useState<'market' | 'stop' | 'limit'>(editTrade?.entryType ?? 'market');
  const [tfAnalysis, setTfAnalysis] = useState(editTrade?.timeframeAnalysis ?? 'H4');
  const [tfEntry, setTfEntry] = useState(editTrade?.timeframeEntry ?? 'M15');
  const [direction, setDirection] = useState<Direction>(editTrade?.direction ?? 'long');
  const [bias, setBias] = useState<'bullish' | 'bearish' | 'neutral'>(editTrade?.bias ?? 'bullish');

  // ── Levels ──
  const [entryPrice, setEntryPrice] = useState(editTrade ? String(editTrade.entryPrice) : '');
  const [stopLoss, setStopLoss] = useState(editTrade?.stopLoss != null ? String(editTrade.stopLoss) : '');
  const [takeProfit, setTakeProfit] = useState(editTrade?.takeProfit != null ? String(editTrade.takeProfit) : '');

  // ── Position ──
  const [lotSize, setLotSize] = useState(editTrade?.lotSize != null ? String(editTrade.lotSize) : '0.01');
  // Pips target — auto from |Entry − TP| / pip_size, manually overridable.
  const [pipsTarget, setPipsTarget] = useState(editTrade?.targetPips != null ? String(editTrade.targetPips) : '');
  const [pipsTouched, setPipsTouched] = useState(false);

  // ── Result ──
  const [isOpen, setIsOpen] = useState(editTrade?.isOpen ?? false);
  const [exitPrice, setExitPrice] = useState(editTrade?.exitPrice != null ? String(editTrade.exitPrice) : '');
  const [exitDate, setExitDate] = useState(initExit?.date ?? '');
  const [exitTime, setExitTime] = useState(initExit?.time ?? '');

  // ── Psychology (pre-trade) ──
  const [emotion, setEmotion] = useState<EmotionState>(editTrade?.emotion ?? 'Neutral');
  const [setupConfidence, setSetupConfidence] = useState(editTrade?.setupConfidence ?? 5);
  const [executionConfidence, setExecutionConfidence] = useState(editTrade?.executionConfidence ?? 5);
  const [tags, setTags] = useState<TradeTag[]>(editTrade?.tags ?? []);
  const [reasoning, setReasoning] = useState(editTrade?.reasoning ?? '');
  // Rule compliance — keyed by the rule text from the selected strategy. Each rule
  // gets a yes / partial / no chip; missing rules default to "yes" at submit time
  // to match the legacy behavior.
  const [ruleCompliances, setRuleCompliances] = useState<Record<string, RuleCompliance>>(() => {
    if (editTrade?.ruleChecklist) {
      return Object.fromEntries(editTrade.ruleChecklist.map(r => [r.rule, r.compliance]));
    }
    return {};
  });

  // ── Reflection (post-trade) ──
  const [exitEmotion, setExitEmotion] = useState<EmotionState | null>(editTrade?.exitEmotion ?? null);
  const [selfVerdict, setSelfVerdict] = useState<Verdict | null>(editTrade?.selfVerdict ?? null);
  const [lessonNotes, setLessonNotes] = useState(editTrade?.lessonNotes ?? '');
  const [lossHypothesis, setLossHypothesis] = useState(editTrade?.lossHypothesis ?? '');

  // Currently-selected strategy so we can render its rule checklist.
  const selectedStrategy = useMemo(() => strategies.find(s => s.name === strategy), [strategies, strategy]);
  const strategyRules = selectedStrategy?.rules ?? [];

  function toggleTag(tag: TradeTag) {
    setTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
  }
  function setRuleCompliance(rule: string, value: RuleCompliance) {
    setRuleCompliances(prev => ({ ...prev, [rule]: value }));
  }

  // ── Derived values ──
  const entryNum = parseFloat(entryPrice);
  const exitNum = parseFloat(exitPrice);
  const slNum = parseFloat(stopLoss);
  const tpNum = parseFloat(takeProfit);
  const lotNum = parseFloat(lotSize);

  // Pips target auto-fills from the absolute distance between Entry and TP,
  // measured in pips for the active market+symbol. User can override with a custom
  // pip target (e.g. partial-target trades where TP doesn't reflect the full edge).
  const autoPips = useMemo(() => {
    if (!Number.isFinite(entryNum) || !Number.isFinite(tpNum) || entryNum <= 0 || tpNum <= 0) return 0;
    return Math.abs(pipsBetween(market, pair, entryNum, tpNum));
  }, [market, pair, entryNum, tpNum]);
  const effectivePips = pipsTouched ? parseFloat(pipsTarget) : autoPips;
  // $ notional is no longer surfaced as a form field; keep it derived for any
  // downstream analytics that read `amount` (computed for display only).
  const derivedNotional = useMemo(() => {
    if (!Number.isFinite(lotNum) || !Number.isFinite(entryNum) || lotNum <= 0 || entryNum <= 0) return 0;
    return notionalAmount(market, pair, lotNum, entryNum);
  }, [market, pair, lotNum, entryNum]);

  // Pip gain/loss and realized $ P&L (only when closed + exit price set)
  const pipGain = useMemo(() => {
    if (isOpen || !Number.isFinite(entryNum) || !Number.isFinite(exitNum)) return null;
    const signed = pipsBetween(market, pair, entryNum, exitNum);
    return direction === 'long' ? signed : -signed;
  }, [isOpen, entryNum, exitNum, market, pair, direction]);

  const actualPnL = useMemo(() => {
    if (isOpen || !Number.isFinite(entryNum) || !Number.isFinite(exitNum) || !Number.isFinite(lotNum)) return null;
    return realizedPnL(market, pair, direction, entryNum, exitNum, lotNum);
  }, [isOpen, entryNum, exitNum, lotNum, market, pair, direction]);

  const actualPnLPercent = useMemo(() => {
    if (actualPnL === null || derivedNotional <= 0) return null;
    return (actualPnL / derivedNotional) * 100;
  }, [actualPnL, derivedNotional]);

  const winLossLabel: 'WIN' | 'LOSS' | 'BREAK-EVEN' | null = actualPnL === null
    ? null
    : actualPnL > 0 ? 'WIN' : actualPnL < 0 ? 'LOSS' : 'BREAK-EVEN';

  // ── Live counters (header) ──
  const today = format(new Date(), 'yyyy-MM-dd');
  const monthStart = format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), 'yyyy-MM-dd');
  const counters = useMemo(() => {
    // Existing trades NOT counting this one (so when editing we don't double-count).
    const others = editTrade ? trades.filter(t => t.id !== editTrade.id) : trades;
    const tradesToday = others.filter(t => (t.entryDate ?? '').slice(0, 10) === today).length;
    const monthWin = others
      .filter(t => (t.entryDate ?? '') >= monthStart && (t.actualPnL ?? 0) > 0)
      .reduce((sum, t) => sum + (t.actualPnL ?? 0), 0);
    return { tradesToday, monthWin };
  }, [trades, editTrade, today, monthStart]);

  // ── Validation ──
  const errors: string[] = [];
  if (!pair.trim()) errors.push('Pair is required');
  if (!Number.isFinite(entryNum) || entryNum <= 0) errors.push('Entry Price is required');
  if (!Number.isFinite(lotNum) || lotNum <= 0) errors.push('Lot Size is required');
  if (!isOpen && (!Number.isFinite(exitNum) || exitNum <= 0)) errors.push('Exit Price is required when trade is closed');
  const canSubmit = errors.length === 0;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;

    const entryDate = buildIsoDateTime(date, time);
    const exitDateIso = !isOpen && exitDate ? buildIsoDateTime(exitDate, exitTime || '17:00') : null;

    // Snapshot the cumulative-at-entry counters into the row so historical reporting
    // can replay them later without re-aggregating. Excludes the trade being edited.
    const submitted: Omit<Trade, 'id' | 'createdAt' | 'actualPnL' | 'actualPnLPercent' | 'verdict'> = {
      coin: pair.trim().toUpperCase(),
      entryPrice: entryNum,
      exitPrice: isOpen ? null : (Number.isFinite(exitNum) ? exitNum : null),
      entryDate,
      exitDate: exitDateIso,
      capital: derivedNotional,
      targetPnL: null,
      strategy: strategy.trim(),
      stopLoss: Number.isFinite(slNum) ? slNum : null,
      marketType: market,
      direction,
      // Psychology + reflection — captured by the form. Rule compliance defaults
      // to "yes" for any strategy rule the user didn't explicitly mark.
      ruleChecklist: strategyRules.map(rule => ({
        rule,
        compliance: ruleCompliances[rule] ?? 'yes',
      })),
      rulesFollowed: strategyRules.length === 0
        ? null
        : !strategyRules.some(rule => (ruleCompliances[rule] ?? 'yes') === 'no'),
      reasoning,
      emotion,
      exitEmotion: isOpen ? null : exitEmotion,
      // `confidence` is the legacy combined score still read by analytics — derive
      // it from the two split scores so downstream views keep working.
      confidence: Math.round((setupConfidence + executionConfidence) / 2),
      setupConfidence,
      executionConfidence,
      tags,
      lessonNotes,
      selfVerdict: isOpen ? null : selfVerdict,
      lossHypothesis: !isOpen && actualPnL !== null && actualPnL < 0 ? (lossHypothesis.trim() || null) : null,
      // Fields the new form doesn't surface — preserve existing values on edit, blank otherwise.
      screenshots: editTrade?.screenshots ?? [],
      notes: editTrade?.notes ?? '',
      setupNotes: editTrade?.setupNotes ?? '',
      executionNotes: editTrade?.executionNotes ?? '',
      oneThingNote: editTrade?.oneThingNote ?? '',
      leverage: editTrade?.leverage ?? null,
      fees: editTrade?.fees ?? null,
      funding: editTrade?.funding ?? null,
      margin: editTrade?.margin ?? null,
      followedPlan: editTrade?.followedPlan ?? null,
      visibility: editTrade?.visibility ?? 'private',
      isOpen,
      // ── New FX fields ──
      session,
      entryType,
      timeframeAnalysis: tfAnalysis,
      timeframeEntry: tfEntry,
      bias,
      takeProfit: Number.isFinite(tpNum) ? tpNum : null,
      lotSize: lotNum,
      amount: Number.isFinite(derivedNotional) ? derivedNotional : null,
      targetPips: Number.isFinite(effectivePips) && effectivePips > 0 ? effectivePips : null,
      pipGain,
      source: source.trim() || undefined,
      // Snapshot — only captured for brand-new trades. When editing, preserve the
      // original snapshot so historical reporting stays consistent.
      totalTradesAtEntry: editTrade?.totalTradesAtEntry ?? counters.tradesToday + 1,
      totalWinAmountAtEntry: editTrade?.totalWinAmountAtEntry ?? counters.monthWin,
    };

    onSubmit(submitted);
  }

  // ── Render ──
  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Live counter strip */}
      <div className="flex flex-wrap items-center gap-3 px-4 py-2.5 rounded-xl border border-[var(--border)] bg-black/20">
        <div className="text-[10px] uppercase tracking-widest text-[var(--muted-foreground)] font-bold">Today</div>
        <span className="text-sm font-bold tabular-nums text-[var(--foreground)]">{counters.tradesToday}</span>
        <span className="text-[11px] text-[var(--muted-foreground)]">trades · this will be #{counters.tradesToday + 1}</span>
        <span className="mx-2 text-[var(--muted-foreground)]/40">·</span>
        <div className="text-[10px] uppercase tracking-widest text-[var(--muted-foreground)] font-bold">Month wins</div>
        <span className="text-sm font-bold tabular-nums text-emerald-300">{formatCurrency(counters.monthWin)}</span>
      </div>

      {/* Section 1 — Identity */}
      <Section title="Identity">
        <Grid cols={2}>
          <Field label="Date">
            <input type="date" value={date} onChange={e => setDate(e.target.value)} />
          </Field>
          <Field label="Time">
            <input type="time" value={time} onChange={e => setTime(e.target.value)} />
          </Field>
        </Grid>
        <Grid cols={2}>
          <Field label="Pair">
            <input
              type="text"
              value={pair}
              onChange={e => {
                const v = e.target.value.toUpperCase();
                setPair(v);
                // Auto-infer market from a recognizable symbol.
                if (v.length >= 3) setMarket(inferMarket(v));
              }}
              placeholder="EURUSD"
              list="pair-suggestions"
            />
            <datalist id="pair-suggestions">
              {suggestionsFor(market).map(s => <option key={s} value={s} />)}
            </datalist>
          </Field>
          <Field label="Market (for pip math)">
            <select value={market} onChange={e => setMarket(e.target.value as MarketType)}>
              {MARKET_OPTIONS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </Field>
        </Grid>
        <Field label="Session">
          <Segmented
            value={session}
            onChange={setSession}
            options={SESSIONS.map(s => ({ value: s.value, label: s.label, hint: s.hint }))}
          />
        </Field>
        <Grid cols={2}>
          <Field label="Strategy">
            <select value={strategy} onChange={e => setStrategy(e.target.value)}>
              <option value="">— pick a strategy —</option>
              {strategies.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
            </select>
          </Field>
          <Field label="Source">
            <input
              type="text"
              value={source}
              onChange={e => setSource(e.target.value)}
              placeholder="Own analysis, signal, TradingView…"
              list="source-suggestions"
            />
            <datalist id="source-suggestions">
              {SOURCE_SUGGESTIONS.map(s => <option key={s} value={s} />)}
            </datalist>
          </Field>
        </Grid>
      </Section>

      {/* Section 2 — Setup */}
      <Section title="Setup">
        <Grid cols={2}>
          <Field label="Time Frame Analysis">
            <select value={tfAnalysis} onChange={e => setTfAnalysis(e.target.value)}>
              {TIMEFRAMES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </Field>
          <Field label="Time Frame Entry">
            <select value={tfEntry} onChange={e => setTfEntry(e.target.value)}>
              {TIMEFRAMES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </Field>
        </Grid>
        <Field label="Entry Type">
          <Segmented value={entryType} onChange={v => setEntryType(v as 'market' | 'stop' | 'limit')} options={ENTRY_TYPES} />
        </Field>
        <Grid cols={2}>
          <Field label="Buy / Sell">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setDirection('long')}
                className={`inline-flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-bold transition-colors border ${
                  direction === 'long'
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    : 'border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
                }`}
              >
                <TrendingUp size={14} /> Buy
              </button>
              <button
                type="button"
                onClick={() => setDirection('short')}
                className={`inline-flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-bold transition-colors border ${
                  direction === 'short'
                    ? 'bg-red-500/20 text-red-300 border-red-500/40'
                    : 'border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
                }`}
              >
                <TrendingDown size={14} /> Sell
              </button>
            </div>
          </Field>
          <Field label="Bias">
            <Segmented value={bias} onChange={v => setBias(v as 'bullish' | 'bearish' | 'neutral')} options={BIAS_OPTIONS} />
          </Field>
        </Grid>
      </Section>

      {/* Section 3 — Levels */}
      <Section title="Levels">
        <Grid cols={3}>
          <Field label="Entry Price">
            <input type="number" step="any" value={entryPrice} onChange={e => setEntryPrice(e.target.value)} placeholder="1.0850" />
          </Field>
          <Field label="Stop Loss">
            <input type="number" step="any" value={stopLoss} onChange={e => setStopLoss(e.target.value)} placeholder="1.0820" />
          </Field>
          <Field label="Take Profit">
            <input type="number" step="any" value={takeProfit} onChange={e => setTakeProfit(e.target.value)} placeholder="1.0920" />
          </Field>
        </Grid>
      </Section>

      {/* Section 4 — Position */}
      <Section title="Position">
        <Grid cols={2}>
          <Field label="Lot Size">
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={lotSize}
              onChange={e => setLotSize(e.target.value)}
              placeholder="0.01"
            />
            <div className="text-[10px] text-[var(--muted-foreground)] mt-1 tabular-nums">
              1 pip ≈ {formatCurrency(
                defaultPipSize(market, pair) * defaultLotSize(market, pair) * (Number.isFinite(lotNum) ? lotNum : 0.01),
              )} at this lot
            </div>
          </Field>
          <Field label={`Pips (${pipsTouched ? 'manual' : 'auto'})`}>
            <input
              type="number"
              step="1"
              value={pipsTouched ? pipsTarget : (autoPips > 0 ? autoPips.toFixed(0) : '')}
              onChange={e => { setPipsTarget(e.target.value); setPipsTouched(true); }}
              placeholder="1000"
            />
            {pipsTouched ? (
              <button
                type="button"
                onClick={() => { setPipsTouched(false); setPipsTarget(''); }}
                className="text-[10px] text-pink-400 hover:text-pink-300 mt-1"
              >
                Reset to auto ({autoPips > 0 ? `${autoPips.toFixed(0)} pips` : '—'})
              </button>
            ) : (
              <div className="text-[10px] text-[var(--muted-foreground)] mt-1 leading-snug">
                {autoPips > 0
                  ? <>Distance from Entry → Take Profit. ≈ {formatCurrency(autoPips * defaultPipSize(market, pair) * defaultLotSize(market, pair) * (Number.isFinite(lotNum) ? lotNum : 0))} at {lotSize} lot.</>
                  : 'Enter both Entry and Take Profit to auto-compute pips.'}
              </div>
            )}
          </Field>
        </Grid>
      </Section>

      {/* Section 5 — Result (record the outcome first, reflect afterwards) */}
      <Section title="Result">
        <label className="inline-flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={isOpen}
            onChange={e => setIsOpen(e.target.checked)}
            className="w-4 h-4 accent-pink-500"
          />
          <span className="text-[var(--foreground)]">Trade is still open</span>
        </label>
        {!isOpen && (
          <>
            <Grid cols={3}>
              <Field label="Exit Price">
                <input type="number" step="any" value={exitPrice} onChange={e => setExitPrice(e.target.value)} placeholder="1.0920" />
              </Field>
              <Field label="Exit Date">
                <input type="date" value={exitDate} onChange={e => setExitDate(e.target.value)} />
              </Field>
              <Field label="Exit Time">
                <input type="time" value={exitTime} onChange={e => setExitTime(e.target.value)} />
              </Field>
            </Grid>
            {winLossLabel && (
              <div className="grid grid-cols-3 gap-2">
                <Stat label="Win / Loss" valueClass={winLossLabel === 'WIN' ? 'text-emerald-300' : winLossLabel === 'LOSS' ? 'text-red-300' : 'text-[var(--muted-foreground)]'}>
                  {winLossLabel}
                </Stat>
                <Stat label="Pip Gain / Loss" valueClass={(pipGain ?? 0) >= 0 ? 'text-emerald-300' : 'text-red-300'}>
                  {pipGain !== null ? `${pipGain >= 0 ? '+' : ''}${pipGain.toFixed(1)} pips` : '—'}
                </Stat>
                <Stat label="P&L" valueClass={(actualPnL ?? 0) >= 0 ? 'text-emerald-300' : 'text-red-300'}>
                  {actualPnL !== null ? formatCurrency(actualPnL) : '—'}
                  {actualPnLPercent !== null && (
                    <div className="text-[10px] opacity-70 mt-0.5">
                      {actualPnLPercent >= 0 ? '+' : ''}{actualPnLPercent.toFixed(2)}%
                    </div>
                  )}
                </Stat>
              </div>
            )}
          </>
        )}
      </Section>

      {/* Section 6 — Psychology & Reflection (pre-trade + post-trade together) */}
      <Section title="Psychology & Reflection">
        <Field label="How did you feel entering?">
          <div className="flex flex-wrap gap-1.5">
            {EMOTION_OPTIONS.map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setEmotion(opt.value as EmotionState)}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-colors border ${
                  emotion === opt.value
                    ? 'bg-pink-500/20 text-pink-300 border-pink-500/40'
                    : 'border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
                }`}
              >
                <span aria-hidden>{opt.emoji}</span> {opt.label}
              </button>
            ))}
          </div>
        </Field>

        <Grid cols={2}>
          <Field label={`Setup Confidence — ${setupConfidence}/10`}>
            <input
              type="range"
              min="1"
              max="10"
              step="1"
              value={setupConfidence}
              onChange={e => setSetupConfidence(parseInt(e.target.value, 10))}
              className="confidence-slider"
              // Fill % matches thumb position: (value - min) / (max - min) × 100
              style={{ '--fill': `${((setupConfidence - 1) / 9) * 100}%` } as React.CSSProperties}
            />
            <div className="text-[10px] text-[var(--muted-foreground)] mt-0.5">How confident were you in the setup itself?</div>
          </Field>
          <Field label={`Execution Confidence — ${executionConfidence}/10`}>
            <input
              type="range"
              min="1"
              max="10"
              step="1"
              value={executionConfidence}
              onChange={e => setExecutionConfidence(parseInt(e.target.value, 10))}
              className="confidence-slider"
              style={{ '--fill': `${((executionConfidence - 1) / 9) * 100}%` } as React.CSSProperties}
            />
            <div className="text-[10px] text-[var(--muted-foreground)] mt-0.5">How well did you execute the entry?</div>
          </Field>
        </Grid>

        <Field label="Tags">
          <div className="flex flex-wrap gap-1.5">
            {TAG_OPTIONS.map(opt => {
              const active = tags.includes(opt.value as TradeTag);
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => toggleTag(opt.value as TradeTag)}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors border ${
                    active
                      ? 'bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-500/40'
                      : 'border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </Field>

        {/* Rule checklist — only shows when the selected strategy has rules to check against. */}
        {strategyRules.length > 0 && (
          <Field label={`Rule Compliance · ${selectedStrategy?.name}`}>
            <div className="space-y-1.5">
              {strategyRules.map(rule => {
                const value = ruleCompliances[rule] ?? 'yes';
                return (
                  <div key={rule} className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-black/20 px-3 py-2">
                    <span className="flex-1 text-xs text-[var(--foreground)]">{rule}</span>
                    <div className="flex items-center gap-1">
                      {(['yes', 'partial', 'no'] as RuleCompliance[]).map(opt => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => setRuleCompliance(rule, opt)}
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider transition-colors ${
                            value === opt
                              ? opt === 'yes'    ? 'bg-emerald-500/20 text-emerald-300'
                                : opt === 'partial' ? 'bg-amber-500/20 text-amber-300'
                                                    : 'bg-red-500/20 text-red-300'
                              : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
                          }`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </Field>
        )}

        <Field label="Reasoning — why this trade?">
          <textarea
            value={reasoning}
            onChange={e => setReasoning(e.target.value)}
            rows={3}
            maxLength={500}
            placeholder="Setup, catalyst, why you sized in. Future you will thank current you."
          />
          <div className="text-[10px] text-[var(--muted-foreground)] text-right mt-1">{reasoning.length}/500</div>
        </Field>

        {/* ── Post-trade reflection — only renders once the trade is closed. ── */}
        {!isOpen && (
          <>
            <Field label="How did you feel exiting?">
              <div className="flex flex-wrap gap-1.5">
                {EMOTION_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setExitEmotion(exitEmotion === opt.value ? null : opt.value as EmotionState)}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-colors border ${
                      exitEmotion === opt.value
                        ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                        : 'border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
                    }`}
                  >
                    <span aria-hidden>{opt.emoji}</span> {opt.label}
                  </button>
                ))}
              </div>
            </Field>

            <Field label="Self Verdict — what's your honest take?">
              <div className="grid grid-cols-3 gap-2">
                {([
                  { value: 'Well Executed',              label: 'Well Executed',     cls: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' },
                  { value: 'Poorly Executed',            label: 'Poorly Executed',   cls: 'bg-red-500/20 text-red-300 border-red-500/40' },
                  { value: 'Good Discipline, Bad Luck', label: 'Good Disc., Bad Luck', cls: 'bg-amber-500/20 text-amber-300 border-amber-500/40' },
                ] as { value: Verdict; label: string; cls: string }[]).map(v => (
                  <button
                    key={v.value}
                    type="button"
                    onClick={() => setSelfVerdict(selfVerdict === v.value ? null : v.value)}
                    className={`px-3 py-2 rounded-lg text-xs font-semibold transition-colors border ${
                      selfVerdict === v.value ? v.cls : 'border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
                    }`}
                  >
                    {v.label}
                  </button>
                ))}
              </div>
            </Field>

            <Field label="Lesson — what did you learn?">
              <textarea
                value={lessonNotes}
                onChange={e => setLessonNotes(e.target.value)}
                rows={3}
                maxLength={500}
                placeholder="One concrete behavior change you'd make on the next similar trade."
              />
              <div className="text-[10px] text-[var(--muted-foreground)] text-right mt-1">{lessonNotes.length}/500</div>
            </Field>

            {/* Loss-hypothesis input only when the trade actually lost money. */}
            {winLossLabel === 'LOSS' && (
              <Field label="Loss Hypothesis — why did this lose?">
                <input
                  type="text"
                  value={lossHypothesis}
                  onChange={e => setLossHypothesis(e.target.value)}
                  placeholder="Bad setup, bad execution, bad luck, or wrong context?"
                  maxLength={200}
                />
              </Field>
            )}
          </>
        )}
      </Section>

      {/* Validation banner */}
      {errors.length > 0 && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 flex items-start gap-2">
          <AlertTriangle size={14} className="text-amber-400 mt-0.5 shrink-0" />
          <ul className="text-xs text-amber-300 space-y-0.5">
            {errors.map(err => <li key={err}>{err}</li>)}
          </ul>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--border)]">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 rounded-xl text-sm font-medium text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
        >
          <X size={14} className="inline mr-1" /> Cancel
        </button>
        <button
          type="submit"
          disabled={!canSubmit}
          className="inline-flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold text-slate-900 bg-gradient-to-r from-orange-400 to-amber-400 hover:from-orange-300 hover:to-amber-300 shadow-[0_0_30px_-4px_rgba(251,146,60,0.6)] transition-all disabled:opacity-40"
        >
          {editTrade ? 'Save Trade' : 'Log Trade'}
        </button>
      </div>
    </form>
  );
}

// ─── Small layout primitives ─────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="space-y-3">
      <legend className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted-foreground)] px-1">{title}</legend>
      {children}
    </fieldset>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted-foreground)] mb-1.5">{label}</div>
      {children}
    </label>
  );
}

function Grid({ cols, children }: { cols: 2 | 3; children: React.ReactNode }) {
  return (
    <div className={`grid gap-3 ${cols === 3 ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-1 sm:grid-cols-2'}`}>
      {children}
    </div>
  );
}

function Segmented<T extends string>({
  value, onChange, options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string; hint?: string }[];
}) {
  return (
    <div className="inline-flex flex-wrap items-center gap-1.5 p-1 rounded-xl border border-[var(--border)] bg-black/20 w-full">
      {options.map(o => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          title={o.hint}
          className={`flex-1 min-w-[80px] px-2 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            value === o.value
              ? 'bg-pink-500/20 text-pink-300 border border-pink-500/40'
              : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Stat({ label, valueClass, children }: { label: string; valueClass?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-black/20 px-3 py-2">
      <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted-foreground)]">{label}</div>
      <div className={`text-sm font-bold tabular-nums mt-0.5 ${valueClass ?? 'text-[var(--foreground)]'}`}>
        {children}
      </div>
    </div>
  );
}
