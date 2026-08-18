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
  { value: 'tokyo',    label: 'Tokyo',    hint: '00:00 – 09:00 UTC' },
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
  onSubmit: (trade: Omit<Trade, 'id' | 'createdAt' | 'verdict'>) => void;
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

  // ── Result ──
  const [isOpen, setIsOpen] = useState(editTrade?.isOpen ?? false);
  const [exitPrice, setExitPrice] = useState(editTrade?.exitPrice != null ? String(editTrade.exitPrice) : '');
  const [exitDate, setExitDate] = useState(initExit?.date ?? '');
  const [exitTime, setExitTime] = useState(initExit?.time ?? '');
  // Amount = realized $ won/lost on this trade. Standalone field — the user
  // types what the broker actually settled at (which may differ slightly from
  // pure pip-math because of fees / swap / slippage). Auto-suggested from
  // lot × pip × pip_value when both Entry and Exit are set, but always overridable.
  const [amount, setAmount] = useState(editTrade?.actualPnL != null ? String(editTrade.actualPnL) : '');
  const [amountTouched, setAmountTouched] = useState(false);

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

  // Target pips — purely a planning display (Entry → TP distance). Read-only.
  const targetPipsDisplay = useMemo(() => {
    if (!Number.isFinite(entryNum) || !Number.isFinite(tpNum) || entryNum <= 0 || tpNum <= 0) return 0;
    return Math.abs(pipsBetween(market, pair, entryNum, tpNum));
  }, [market, pair, entryNum, tpNum]);
  // Notional position size — used for the actualPnLPercent denominator.
  const derivedNotional = useMemo(() => {
    if (!Number.isFinite(lotNum) || !Number.isFinite(entryNum) || lotNum <= 0 || entryNum <= 0) return 0;
    return notionalAmount(market, pair, lotNum, entryNum);
  }, [market, pair, lotNum, entryNum]);
  // Auto Amount = realized $ P&L from pip math. User can override via the input.
  const autoAmount = useMemo(() => {
    if (isOpen || !Number.isFinite(entryNum) || !Number.isFinite(exitNum) || !Number.isFinite(lotNum)) return null;
    return realizedPnL(market, pair, direction, entryNum, exitNum, lotNum);
  }, [isOpen, entryNum, exitNum, lotNum, market, pair, direction]);
  // What we'll persist as the trade's actualPnL.
  const effectiveAmount: number | null = isOpen
    ? null
    : amountTouched && amount.trim() !== ''
      ? (Number.isFinite(parseFloat(amount)) ? parseFloat(amount) : null)
      : autoAmount;

  // Realized pip gain/loss (signed) — derived from prices, NOT from the Amount input.
  const pipGain = useMemo(() => {
    if (isOpen || !Number.isFinite(entryNum) || !Number.isFinite(exitNum)) return null;
    const signed = pipsBetween(market, pair, entryNum, exitNum);
    return direction === 'long' ? signed : -signed;
  }, [isOpen, entryNum, exitNum, market, pair, direction]);

  // Win / Loss derives from the effective Amount (auto or user-typed). The user's
  // override wins over the math, so if their broker reports a small loss after fees
  // even though pips were +1, the badge respects the typed Amount.
  const actualPnLPercent: number | null = effectiveAmount === null || derivedNotional <= 0
    ? null
    : (effectiveAmount / derivedNotional) * 100;

  const winLossLabel: 'WIN' | 'LOSS' | 'BREAK-EVEN' | null = effectiveAmount === null
    ? null
    : effectiveAmount > 0 ? 'WIN' : effectiveAmount < 0 ? 'LOSS' : 'BREAK-EVEN';

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
    const submitted: Omit<Trade, 'id' | 'createdAt' | 'verdict'> = {
      coin: pair.trim().toUpperCase(),
      entryPrice: entryNum,
      exitPrice: isOpen ? null : (Number.isFinite(exitNum) ? exitNum : null),
      entryDate,
      exitDate: exitDateIso,
      capital: derivedNotional,
      // actualPnL = the Amount field (user-typed or auto). This becomes the trade's
      // realized $ outcome that drives every downstream "daily P&L / wins / losses" view.
      actualPnL: effectiveAmount,
      actualPnLPercent,
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
      lossHypothesis: !isOpen && effectiveAmount !== null && effectiveAmount < 0 ? (lossHypothesis.trim() || null) : null,
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
      amount: effectiveAmount,                                                  // legacy field — mirrors actualPnL for back-compat
      targetPips: targetPipsDisplay > 0 ? targetPipsDisplay : null,             // derived target distance (Entry → TP)
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
    <form onSubmit={handleSubmit}>
      {/* Live counter strip */}
      <div className="inset" style={{ position: 'relative', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12, padding: '13px 16px' }}>
        <span className="accent" style={{ position: 'absolute', left: 0, top: -1, width: 44, height: 3, background: 'var(--amber)' }} />
        <p className="lbl">TODAY</p>
        <span style={{ fontFamily: 'var(--mono)', fontWeight: 500, fontSize: 14, color: 'var(--text)' }}>{counters.tradesToday}</span>
        <span style={{ fontSize: '11px', color: 'var(--muted-2)' }}>trades · this will be #{counters.tradesToday + 1}</span>
        <span style={{ width: 1, height: 14, background: 'var(--line)' }} />
        <p className="lbl">MONTH WINS</p>
        <span style={{ fontFamily: 'var(--mono)', fontWeight: 500, fontSize: 14, color: 'var(--green)' }}>{formatCurrency(counters.monthWin)}</span>
      </div>

      {/* Section 1 — Identity */}
      <Section title="Identity">
        <Grid cols={2}>
          <Field label="Date">
            <input type="date" className="box w-full" value={date} onChange={e => setDate(e.target.value)} />
          </Field>
          <Field label="Time">
            <input type="time" className="box w-full" value={time} onChange={e => setTime(e.target.value)} />
          </Field>
        </Grid>
        <Grid cols={2}>
          <Field label="Pair">
            <input
              type="text"
              className="box w-full"
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
            <select className="box w-full" style={{ appearance: 'none' }} value={market} onChange={e => setMarket(e.target.value as MarketType)}>
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
            <select className="box w-full" style={{ appearance: 'none' }} value={strategy} onChange={e => setStrategy(e.target.value)}>
              <option value="">— pick a strategy —</option>
              {strategies.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
            </select>
          </Field>
          <Field label="Source">
            <input
              type="text"
              className="box w-full"
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
            <select className="box w-full" style={{ appearance: 'none' }} value={tfAnalysis} onChange={e => setTfAnalysis(e.target.value)}>
              {TIMEFRAMES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </Field>
          <Field label="Time Frame Entry">
            <select className="box w-full" style={{ appearance: 'none' }} value={tfEntry} onChange={e => setTfEntry(e.target.value)}>
              {TIMEFRAMES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </Field>
        </Grid>
        <Field label="Entry Type">
          <Segmented value={entryType} onChange={v => setEntryType(v as 'market' | 'stop' | 'limit')} options={ENTRY_TYPES} />
        </Field>
        <Grid cols={2}>
          <Field label="Buy / Sell">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <button
                type="button"
                onClick={() => setDirection('long')}
                className="chip"
                style={{
                  height: 42, justifyContent: 'center', fontWeight: 700, fontSize: 12.5,
                  color: direction === 'long' ? 'var(--green)' : 'var(--muted-2)',
                  borderColor: direction === 'long' ? 'var(--green)' : 'var(--line)',
                  background: direction === 'long' ? 'var(--panel)' : 'var(--panel-2)',
                }}
              >
                <TrendingUp size={14} /> Buy
              </button>
              <button
                type="button"
                onClick={() => setDirection('short')}
                className="chip"
                style={{
                  height: 42, justifyContent: 'center', fontWeight: 700, fontSize: 12.5,
                  color: direction === 'short' ? 'var(--red)' : 'var(--muted-2)',
                  borderColor: direction === 'short' ? 'var(--red)' : 'var(--line)',
                  background: direction === 'short' ? 'var(--panel)' : 'var(--panel-2)',
                }}
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
            <input type="number" step="any" className="box w-full" style={MONO_BOX} value={entryPrice} onChange={e => setEntryPrice(e.target.value)} placeholder="1.0850" />
          </Field>
          <Field label="Stop Loss">
            <input type="number" step="any" className="box w-full" style={MONO_BOX} value={stopLoss} onChange={e => setStopLoss(e.target.value)} placeholder="1.0820" />
          </Field>
          <Field label="Take Profit">
            <input type="number" step="any" className="box w-full" style={MONO_BOX} value={takeProfit} onChange={e => setTakeProfit(e.target.value)} placeholder="1.0920" />
          </Field>
        </Grid>
      </Section>

      {/* Section 4 — Position */}
      <Section title="Position">
        <Field label="Lot Size">
          <input
            type="number"
            step="0.01"
            min="0.01"
            className="box w-full"
            style={MONO_BOX}
            value={lotSize}
            onChange={e => setLotSize(e.target.value)}
            placeholder="0.01"
          />
          <p style={{ margin: '9px 0 0', fontSize: '10.5px', lineHeight: '16px', color: 'var(--muted-2)' }}>
            1 pip ≈ {formatCurrency(
              defaultPipSize(market, pair) * defaultLotSize(market, pair) * (Number.isFinite(lotNum) ? lotNum : 0.01),
            )} at this lot
            {targetPipsDisplay > 0 && (
              <>
                {' · '}Target: <span style={{ fontFamily: 'var(--mono)', color: 'var(--green)' }}>{targetPipsDisplay.toFixed(0)} pips</span> from Entry → TP
              </>
            )}
          </p>
        </Field>
      </Section>

      {/* Section 5 — Result (record the outcome first, reflect afterwards) */}
      <Section title="Result">
        <label className="inset" style={{ display: 'inline-flex', alignItems: 'center', gap: 10, cursor: 'pointer', padding: '10px 16px' }}>
          <input
            type="checkbox"
            checked={isOpen}
            onChange={e => setIsOpen(e.target.checked)}
            style={{ width: 14, height: 14, accentColor: 'var(--amber)' }}
          />
          <span style={{ fontSize: '12.5px', color: 'var(--text)' }}>Trade is still open</span>
        </label>
        {!isOpen && (
          <>
            <Grid cols={3}>
              <Field label="Exit Price">
                <input type="number" step="any" className="box w-full" style={MONO_BOX} value={exitPrice} onChange={e => setExitPrice(e.target.value)} placeholder="1.0920" />
              </Field>
              <Field label="Exit Date">
                <input type="date" className="box w-full" value={exitDate} onChange={e => setExitDate(e.target.value)} />
              </Field>
              <Field label="Exit Time">
                <input type="time" className="box w-full" value={exitTime} onChange={e => setExitTime(e.target.value)} />
              </Field>
            </Grid>
            {/* Amount — the realized $ outcome of the trade. Auto-suggested from
                pip math; type your broker's exact figure to override. This is what
                feeds every downstream "daily P&L / wins / losses" view. */}
            <Field label={`Amount (${amountTouched ? 'manual' : 'auto'}) — $ won / lost`}>
              <input
                type="number"
                step="any"
                className="box w-full"
                style={MONO_BOX}
                value={amountTouched ? amount : (autoAmount !== null ? autoAmount.toFixed(2) : '')}
                onChange={e => { setAmount(e.target.value); setAmountTouched(true); }}
                placeholder="0.00"
              />
              {amountTouched ? (
                <button
                  type="button"
                  onClick={() => { setAmountTouched(false); setAmount(''); }}
                  style={{ marginTop: 9, fontSize: '10.5px', fontWeight: 700, color: 'var(--amber)', borderBottom: '1px solid var(--amber)', lineHeight: '14px' }}
                >
                  Reset to auto ({autoAmount !== null ? formatCurrency(autoAmount) : '—'})
                </button>
              ) : (
                <p style={{ margin: '9px 0 0', fontSize: '10.5px', lineHeight: '16px', color: 'var(--muted-2)' }}>
                  {autoAmount !== null
                    ? <>Auto-computed from lot × pip × pip-value. Type a custom figure if your broker reported differently (fees, swaps, slippage).</>
                    : 'Fill in Entry Price, Exit Price, and Lot Size to auto-compute.'}
                </p>
              )}
            </Field>

            {winLossLabel && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <Stat label="Win / Loss" tone={winLossLabel === 'WIN' ? 'var(--green)' : winLossLabel === 'LOSS' ? 'var(--red)' : 'var(--muted)'}>
                  {winLossLabel}
                </Stat>
                <Stat label="Pip Gain / Loss" tone={(pipGain ?? 0) >= 0 ? 'var(--green)' : 'var(--red)'}>
                  {pipGain !== null ? `${pipGain >= 0 ? '+' : ''}${pipGain.toFixed(1)} pips` : '—'}
                </Stat>
              </div>
            )}
          </>
        )}
      </Section>

      {/* Section 6 — Psychology & Reflection (pre-trade + post-trade together) */}
      <Section title="Psychology & Reflection">
        <Field label="How did you feel entering?">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {EMOTION_OPTIONS.map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setEmotion(opt.value as EmotionState)}
                className={`chip${emotion === opt.value ? ' on' : ''}`}
                style={{ height: 30 }}
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
            <p style={{ margin: '8px 0 0', fontSize: '10.5px', color: 'var(--muted-2)' }}>How confident were you in the setup itself?</p>
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
            <p style={{ margin: '8px 0 0', fontSize: '10.5px', color: 'var(--muted-2)' }}>How well did you execute the entry?</p>
          </Field>
        </Grid>

        <Field label="Tags">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {TAG_OPTIONS.map(opt => {
              const active = tags.includes(opt.value as TradeTag);
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => toggleTag(opt.value as TradeTag)}
                  className={`chip${active ? ' on' : ''}`}
                  style={{ height: 30 }}
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
            <div style={{ display: 'grid', gap: 8 }}>
              {strategyRules.map(rule => {
                const value = ruleCompliances[rule] ?? 'yes';
                return (
                  <div key={rule} className="inset" style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', padding: '10px 14px' }}>
                    <span style={{ flex: 1, minWidth: 160, fontSize: '12px', color: 'var(--text)' }}>{rule}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {(['yes', 'partial', 'no'] as RuleCompliance[]).map(opt => (
                        <ComplianceBtn
                          key={opt}
                          rule={rule}
                          option={opt}
                          active={value === opt}
                          onSelect={setRuleCompliance}
                        />
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
            className="box w-full"
            style={TEXTAREA_BOX}
            value={reasoning}
            onChange={e => setReasoning(e.target.value)}
            rows={3}
            maxLength={500}
            placeholder="Setup, catalyst, why you sized in. Future you will thank current you."
          />
          <p style={{ margin: '8px 0 0', textAlign: 'right', fontFamily: 'var(--mono)', fontSize: '10px', color: 'var(--muted-2)' }}>{reasoning.length}/500</p>
        </Field>

        {/* ── Post-trade reflection — only renders once the trade is closed. ── */}
        {!isOpen && (
          <>
            <Field label="How did you feel exiting?">
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {EMOTION_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setExitEmotion(exitEmotion === opt.value ? null : opt.value as EmotionState)}
                    className="chip"
                    style={exitEmotion === opt.value
                      ? { height: 30, borderColor: 'var(--teal)', color: 'var(--teal)', fontWeight: 700 }
                      : { height: 30 }}
                  >
                    <span aria-hidden>{opt.emoji}</span> {opt.label}
                  </button>
                ))}
              </div>
            </Field>

            <Field label="Self Verdict — what's your honest take?">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: 8 }}>
                {([
                  { value: 'Well Executed',             label: 'Well Executed',        tone: 'var(--green)' },
                  { value: 'Poorly Executed',           label: 'Poorly Executed',      tone: 'var(--red)' },
                  { value: 'Good Discipline, Bad Luck', label: 'Good Disc., Bad Luck', tone: 'var(--amber)' },
                ] as { value: Verdict; label: string; tone: string }[]).map(v => (
                  <button
                    key={v.value}
                    type="button"
                    onClick={() => setSelfVerdict(selfVerdict === v.value ? null : v.value)}
                    className="chip"
                    style={{
                      height: 38, justifyContent: 'center', fontWeight: 700, fontSize: '11.5px',
                      color: selfVerdict === v.value ? v.tone : 'var(--muted-2)',
                      borderColor: selfVerdict === v.value ? v.tone : 'var(--line)',
                      background: selfVerdict === v.value ? 'var(--panel)' : 'var(--panel-2)',
                    }}
                  >
                    {v.label}
                  </button>
                ))}
              </div>
            </Field>

            <Field label="Lesson — what did you learn?">
              <textarea
                className="box w-full"
                style={TEXTAREA_BOX}
                value={lessonNotes}
                onChange={e => setLessonNotes(e.target.value)}
                rows={3}
                maxLength={500}
                placeholder="One concrete behavior change you'd make on the next similar trade."
              />
              <p style={{ margin: '8px 0 0', textAlign: 'right', fontFamily: 'var(--mono)', fontSize: '10px', color: 'var(--muted-2)' }}>{lessonNotes.length}/500</p>
            </Field>

            {/* Loss-hypothesis input only when the trade actually lost money. */}
            {winLossLabel === 'LOSS' && (
              <Field label="Loss Hypothesis — why did this lose?">
                <input
                  type="text"
                  className="box w-full"
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
        <div className="warn" style={{ marginTop: 4, marginBottom: 22 }}>
          <AlertTriangle size={16} style={{ color: 'var(--amber)', flex: 'none', marginTop: 2 }} />
          <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
            {errors.map(err => <li key={err}>{err}</li>)}
          </ul>
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 12, marginTop: 26, paddingTop: 18, borderTop: '1px solid var(--line)' }}>
        <button type="button" onClick={onCancel} className="btn-g" style={{ height: 40 }}>
          <X size={14} /> Cancel
        </button>
        <button type="submit" disabled={!canSubmit} className={canSubmit ? 'btn-a' : 'btn-d'} style={{ height: 40 }}>
          {editTrade ? 'Save Trade' : 'Log Trade'}
        </button>
      </div>
    </form>
  );
}

// ─── Small layout primitives ─────────────────────────────────────────

/** Shared inline styles — module-level so they don't re-create on every render. */
const MONO_BOX: React.CSSProperties = { fontFamily: 'var(--mono)', fontWeight: 500 };
const TEXTAREA_BOX: React.CSSProperties = {
  height: 'auto', minHeight: 84, display: 'block', padding: '12px 16px',
  lineHeight: '19px', resize: 'vertical',
};

const COMPLIANCE_TONE: Record<RuleCompliance, string> = {
  yes: 'var(--green)',
  partial: 'var(--amber)',
  no: 'var(--red)',
};

/** Kept at module level on purpose — re-creating it inside TradeForm would remount
 *  every compliance chip on each keystroke. */
function ComplianceBtn({
  rule, option, active, onSelect,
}: {
  rule: string;
  option: RuleCompliance;
  active: boolean;
  onSelect: (rule: string, value: RuleCompliance) => void;
}) {
  const tone = COMPLIANCE_TONE[option];
  return (
    <button
      type="button"
      onClick={() => onSelect(rule, option)}
      className="chip"
      style={{
        height: 24, padding: '0 10px', fontWeight: 700, fontSize: '9.5px',
        letterSpacing: '.06em', textTransform: 'uppercase',
        color: active ? tone : 'var(--muted-2)',
        borderColor: active ? tone : 'var(--line)',
        background: active ? 'var(--panel)' : 'var(--panel-2)',
      }}
    >
      {option}
    </button>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset style={{ border: 0, margin: '22px 0 0', padding: 0, minWidth: 0 }}>
      <legend style={{ padding: 0, width: '100%' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', paddingBottom: 11, borderBottom: '1px solid var(--line)' }}>
          <span style={{ width: 18, height: 2, background: 'var(--amber)', flex: 'none' }} />
          <span className="lbl b10" style={{ letterSpacing: '.08em', textTransform: 'uppercase' }}>{title}</span>
        </span>
      </legend>
      <div style={{ display: 'grid', gap: 16, marginTop: 18 }}>{children}</div>
    </fieldset>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="field">
      <label style={{ textTransform: 'uppercase' }}>{label}</label>
      {children}
    </div>
  );
}

function Grid({ cols, children }: { cols: 2 | 3; children: React.ReactNode }) {
  return (
    <div style={{
      display: 'grid', gap: 14,
      gridTemplateColumns: cols === 3 ? 'repeat(auto-fit,minmax(150px,1fr))' : 'repeat(auto-fit,minmax(200px,1fr))',
    }}>
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
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      {options.map(o => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          title={o.hint}
          className={`chip${value === o.value ? ' on' : ''}`}
          style={{ height: 32 }}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Stat({ label, tone, children }: { label: string; tone?: string; children: React.ReactNode }) {
  return (
    <div className="inset" style={{ padding: '11px 16px' }}>
      <p className="lbl" style={{ textTransform: 'uppercase' }}>{label}</p>
      <p style={{ margin: '8px 0 0', fontFamily: 'var(--mono)', fontWeight: 500, fontSize: 15, color: tone ?? 'var(--text)' }}>
        {children}
      </p>
    </div>
  );
}
