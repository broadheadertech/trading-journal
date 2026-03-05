'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { Trade, EmotionState, TradeTag, Strategy, RuleCompliance, Verdict, MarketType, Direction } from '@/lib/types';
import {
  CRYPTO_SUGGESTIONS, STOCK_SUGGESTIONS, FOREX_SUGGESTIONS, EMOTION_OPTIONS, TAG_OPTIONS,
  getSimilarTrades, formatPercent,
} from '@/lib/utils';
import { useCurrency } from '@/hooks/useCurrency';
import { TrendingUp, TrendingDown, ImagePlus, X, AlertTriangle, CheckCircle } from 'lucide-react';
import { SpeechButton } from '@/components/SpeechButton';
import { format } from 'date-fns';

async function compressImage(file: File): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const MAX_W = 1280;
        let w = img.width, h = img.height;
        if (w > MAX_W) { h = Math.round(h * MAX_W / w); w = MAX_W; }
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d')!.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', 0.75));
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}

interface PrefilledEmotion {
  emotion: EmotionState;
  intensity: number;
  reasoning: string;
}

interface TradeFormProps {
  strategies: Strategy[];
  trades: Trade[];
  editTrade?: Trade | null;
  onSubmit: (trade: Omit<Trade, 'id' | 'createdAt' | 'actualPnL' | 'actualPnLPercent' | 'verdict'>) => void;
  onCancel: () => void;
  prefilledEmotion?: PrefilledEmotion;
  onRuleBreak?: (ruleName: string, explanation: string) => void;
  availableBalance?: number;
}

const REVIEW_TAGS = [
  'Afternoon', 'Breakout', 'Loss', 'Mean Reversion', 'News Play',
  'Scalp', 'Supply/Demand', 'Support/Resistance', 'Swing', 'Trend Follow',
];

const EMOTION_TAGS: { value: EmotionState; label: string; color: string }[] = [
  { value: 'FOMO', label: 'FOMO', color: 'bg-red-500/15 text-red-400 border-red-500/30' },
  { value: 'Revenge Trading', label: 'Revenge', color: 'bg-red-500/15 text-red-400 border-red-500/30' },
  { value: 'Neutral', label: 'Boredom', color: 'bg-gray-500/15 text-gray-400 border-gray-500/30' },
  { value: 'Confident', label: 'Confident', color: 'bg-green-500/15 text-green-400 border-green-500/30' },
  { value: 'Anxious', label: 'Anxious', color: 'bg-amber-500/15 text-amber-400 border-amber-500/30' },
  { value: 'Calm', label: 'Flow State', color: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30' },
  { value: 'Greedy', label: 'Greedy', color: 'bg-orange-500/15 text-orange-400 border-orange-500/30' },
  { value: 'Fearful', label: 'Fearful', color: 'bg-purple-500/15 text-purple-400 border-purple-500/30' },
];

export default function TradeForm({
  strategies, trades, editTrade, onSubmit, onCancel, prefilledEmotion, onRuleBreak, availableBalance,
}: TradeFormProps) {
  const { formatCurrency } = useCurrency();
  const [marketType, setMarketType] = useState<MarketType>(editTrade?.marketType ?? 'crypto');
  const [direction, setDirection] = useState<Direction>(editTrade?.direction ?? 'long');
  const [coin, setCoin] = useState(editTrade?.coin ?? '');
  const [entryPrice, setEntryPrice] = useState(editTrade?.entryPrice?.toString() ?? '');
  const [exitPrice, setExitPrice] = useState(editTrade?.exitPrice?.toString() ?? '');
  const [isOpen, setIsOpen] = useState(editTrade?.isOpen ?? false);
  const [capital, setCapital] = useState(editTrade?.capital?.toString() ?? '');
  const [entryDate, setEntryDate] = useState(editTrade?.entryDate ?? new Date().toISOString().slice(0, 16));
  const [exitDate, setExitDate] = useState(editTrade?.exitDate ?? '');
  const [strategy, setStrategy] = useState(editTrade?.strategy ?? '');
  const [targetPnL, setTargetPnL] = useState(editTrade?.targetPnL?.toString() ?? '');
  const [stopLossVal, setStopLossVal] = useState(editTrade?.stopLoss?.toString() ?? '');
  const [leverageVal, setLeverageVal] = useState(editTrade?.leverage ? editTrade.leverage.toString() : '');
  const [feesVal, setFeesVal] = useState(editTrade?.fees ? editTrade.fees.toString() : '');
  const [fundingVal, setFundingVal] = useState(editTrade?.funding ? editTrade.funding.toString() : '');
  const [marginVal, setMarginVal] = useState(editTrade?.margin ? editTrade.margin.toString() : '');
  const [realizedPnlVal, setRealizedPnlVal] = useState('');
  const [reasoning, setReasoning] = useState(editTrade?.reasoning ?? prefilledEmotion?.reasoning ?? '');
  const [emotion, setEmotion] = useState<EmotionState>(editTrade?.emotion ?? prefilledEmotion?.emotion ?? 'Neutral');
  const [setupConfidence, setSetupConfidence] = useState(editTrade?.setupConfidence ?? prefilledEmotion?.intensity ?? 5);
  const [executionConfidence, setExecutionConfidence] = useState(editTrade?.executionConfidence ?? 5);
  const [tags, setTags] = useState<TradeTag[]>(editTrade?.tags ?? []);
  const [reviewTags, setReviewTags] = useState<string[]>([]);
  const [customTag, setCustomTag] = useState('');
  const [followedPlan, setFollowedPlan] = useState<boolean | null>(editTrade?.followedPlan ?? null);
  const [setupNotes, setSetupNotes] = useState(editTrade?.setupNotes ?? '');
  const [executionNotes, setExecutionNotes] = useState(editTrade?.executionNotes ?? '');
  const [lessonNotes, setLessonNotes] = useState(editTrade?.lessonNotes ?? '');
  const [oneThingNote, setOneThingNote] = useState(editTrade?.oneThingNote ?? '');
  const [selfVerdict, setSelfVerdict] = useState<Verdict | null>(editTrade?.selfVerdict ?? null);
  const [screenshots, setScreenshots] = useState<string[]>(editTrade?.screenshots ?? []);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [ruleCompliances, setRuleCompliances] = useState<RuleCompliance[]>(() => {
    if (editTrade?.ruleChecklist?.length) {
      return editTrade.ruleChecklist.map(r => r.compliance ?? 'yes');
    }
    return [];
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedStrategy = strategies.find(s => s.name === strategy);

  useEffect(() => {
    if (!editTrade) {
      setRuleCompliances(selectedStrategy ? selectedStrategy.rules.map(() => 'yes') : []);
    }
  }, [strategy, editTrade]);

  const hasRuleBreaks = ruleCompliances.some(c => c === 'no');

  const filteredSuggestions = useMemo(() => {
    const list = marketType === 'stocks' ? STOCK_SUGGESTIONS : marketType === 'forex' ? FOREX_SUGGESTIONS : CRYPTO_SUGGESTIONS;
    return list.filter(c => c.toLowerCase().includes(coin.toLowerCase()));
  }, [coin, marketType]);

  const similarTrades = useMemo(
    () => (coin ? getSimilarTrades(trades, coin, 3) : []),
    [trades, coin]
  );

  const pnlPreview = useMemo(() => {
    if (!entryPrice || !exitPrice || isOpen) return null;
    const entry = parseFloat(entryPrice);
    const exit = parseFloat(exitPrice);
    const cap = parseFloat(capital) || 0;
    if (!entry || !exit) return null;
    const rawPct = direction === 'short'
      ? ((entry - exit) / entry) * 100
      : ((exit - entry) / entry) * 100;
    const lev = parseFloat(leverageVal) || 1;
    const pct = rawPct * (lev > 0 ? lev : 1);
    const dollar = (pct / 100) * cap;
    return { pct: pct.toFixed(2), dollar: dollar.toFixed(2), positive: pct >= 0 };
  }, [entryPrice, exitPrice, capital, isOpen, direction, leverageVal]);

  const setRuleCompliance = (idx: number, val: RuleCompliance) => {
    setRuleCompliances(prev => prev.map((c, i) => (i === idx ? val : c)));
  };

  // Validation
  const errors: string[] = [];
  if (!coin) errors.push('Symbol is required');
  if (!entryPrice) errors.push('Entry Price is required');
  if (!capital) errors.push('Lots/Qty/Size is required');

  const handleSubmit = () => {
    if (errors.length > 0) return;

    const ruleChecklist = selectedStrategy
      ? selectedStrategy.rules.map((rule, i) => ({ rule, compliance: ruleCompliances[i] ?? 'yes' }))
      : [];

    if (hasRuleBreaks && onRuleBreak && selectedStrategy && lessonNotes.trim()) {
      const brokenRules = ruleChecklist.filter(r => r.compliance === 'no').map(r => r.rule).join(', ');
      onRuleBreak(brokenRules, lessonNotes);
    }

    onSubmit({
      marketType,
      direction,
      leverage: leverageVal ? parseFloat(leverageVal) : null,
      fees: feesVal ? parseFloat(feesVal) : null,
      funding: fundingVal ? parseFloat(fundingVal) : null,
      margin: marginVal ? parseFloat(marginVal) : null,
      followedPlan,
      coin,
      entryPrice: parseFloat(entryPrice),
      exitPrice: isOpen ? null : (exitPrice ? parseFloat(exitPrice) : null),
      entryDate,
      exitDate: isOpen ? null : (exitDate || null),
      capital: parseFloat(capital),
      targetPnL: targetPnL ? parseFloat(targetPnL) : null,
      stopLoss: stopLossVal ? parseFloat(stopLossVal) : null,
      strategy,
      rulesFollowed: ruleChecklist.length === 0 ? (followedPlan ?? null) : !ruleChecklist.some(r => r.compliance === 'no'),
      ruleChecklist,
      reasoning,
      emotion,
      setupConfidence,
      executionConfidence,
      confidence: Math.round((setupConfidence + executionConfidence) / 2),
      tags,
      screenshots,
      notes: editTrade?.notes ?? '',
      setupNotes,
      executionNotes,
      lessonNotes,
      oneThingNote,
      selfVerdict,
      lossHypothesis: editTrade?.lossHypothesis ?? null,
      exitEmotion: editTrade?.exitEmotion ?? null,
      isOpen,
    });
  };

  const toggleTag = (tag: TradeTag) => {
    setTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
  };

  const toggleReviewTag = (tag: string) => {
    setReviewTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
  };

  const addCustomTag = () => {
    if (customTag.trim() && !reviewTags.includes(customTag.trim())) {
      setReviewTags(prev => [...prev, customTag.trim()]);
      setCustomTag('');
    }
  };

  return (
    <div className="space-y-5">
      {/* ── Market Type ── */}
      <div>
        <label className="block text-xs font-semibold uppercase tracking-widest text-[var(--muted-foreground)] mb-2">Market Type</label>
        <div className="flex gap-2">
          {([
            { value: 'crypto', label: 'Crypto' },
            { value: 'stocks', label: 'Stocks' },
            { value: 'forex', label: 'Forex' },
          ] as const).map(opt => (
            <button
              key={opt.value}
              onClick={() => setMarketType(opt.value)}
              className={`flex-1 py-2 text-sm rounded-lg border transition-colors font-medium ${
                marketType === opt.value
                  ? 'border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]'
                  : 'border-[var(--border)] text-[var(--muted-foreground)] hover:border-[var(--accent)]/40'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Symbol + Side ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="relative">
          <label className="block text-xs font-semibold uppercase tracking-widest text-[var(--muted-foreground)] mb-1.5">Symbol</label>
          <input
            value={coin}
            onChange={e => { setCoin(e.target.value); setShowSuggestions(true); }}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
            placeholder={marketType === 'stocks' ? 'e.g., AAPL' : marketType === 'forex' ? 'e.g., EUR/USD' : 'e.g., BTC/USDT'}
            className="w-full"
          />
          {showSuggestions && coin && filteredSuggestions.length > 0 && (
            <div className="absolute z-10 top-full mt-1 w-full bg-[var(--card)] border border-[var(--border)] rounded-lg shadow-lg max-h-40 overflow-y-auto">
              {filteredSuggestions.slice(0, 8).map(s => (
                <button
                  key={s}
                  onMouseDown={() => { setCoin(s); setShowSuggestions(false); }}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-[var(--muted)] transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase tracking-widest text-[var(--muted-foreground)] mb-1.5">Side</label>
          <div className="flex gap-2 h-[38px]">
            <button
              onClick={() => setDirection('long')}
              className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg border text-sm font-semibold transition-colors ${
                direction === 'long'
                  ? 'border-green-500 bg-green-500/10 text-green-400'
                  : 'border-[var(--border)] text-[var(--muted-foreground)] hover:border-green-500/40'
              }`}
            >
              <TrendingUp size={14} /> Long
            </button>
            <button
              onClick={() => setDirection('short')}
              className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg border text-sm font-semibold transition-colors ${
                direction === 'short'
                  ? 'border-red-500 bg-red-500/10 text-red-400'
                  : 'border-[var(--border)] text-[var(--muted-foreground)] hover:border-red-500/40'
              }`}
            >
              <TrendingDown size={14} /> Short
            </button>
          </div>
        </div>
      </div>

      {/* ── Open Time / Close Time ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-widest text-[var(--muted-foreground)] mb-1.5">Open Time</label>
          <input type="datetime-local" value={entryDate} onChange={e => setEntryDate(e.target.value)} className="w-full" />
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase tracking-widest text-[var(--muted-foreground)] mb-1.5">Close Time</label>
          <input type="datetime-local" value={exitDate} onChange={e => setExitDate(e.target.value)} disabled={isOpen} className={`w-full ${isOpen ? 'opacity-50' : ''}`} />
          <label className="flex items-center gap-2 text-xs text-[var(--muted-foreground)] cursor-pointer mt-1.5">
            <input type="checkbox" checked={isOpen} onChange={e => setIsOpen(e.target.checked)} className="w-3.5 h-3.5 rounded accent-[var(--accent)]" />
            Still Open
          </label>
        </div>
      </div>

      {/* ── Entry Price / Exit Price ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-widest text-[var(--muted-foreground)] mb-1.5">Entry Price</label>
          <input type="number" step="any" value={entryPrice} onChange={e => setEntryPrice(e.target.value)} placeholder="0.00" className="w-full" />
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase tracking-widest text-[var(--muted-foreground)] mb-1.5">Exit Price</label>
          <input type="number" step="any" value={exitPrice} onChange={e => setExitPrice(e.target.value)} placeholder="0.00" disabled={isOpen} className={`w-full ${isOpen ? 'opacity-50' : ''}`} />
        </div>
      </div>

      {/* ── Lots/Qty/Size, Realized P&L, Fees ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-widest text-[var(--muted-foreground)] mb-1.5">
            Lots/Qty/Size <span className="text-[var(--accent)]">*</span>
          </label>
          <input type="number" step="any" value={capital} onChange={e => setCapital(e.target.value)} placeholder="1000" className="w-full" />
          {availableBalance !== undefined && availableBalance > 0 && (
            <p className="text-[10px] text-[var(--muted-foreground)] mt-0.5">Available: {formatCurrency(availableBalance)}</p>
          )}
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase tracking-widest text-[var(--muted-foreground)] mb-1.5">
            Realized P&L <span className="text-[var(--accent)]">*</span>
          </label>
          <div className={`h-[38px] flex items-center px-3 rounded-lg border border-[var(--border)] text-sm font-medium ${pnlPreview ? (pnlPreview.positive ? 'text-green-400 bg-green-500/5' : 'text-red-400 bg-red-500/5') : 'text-[var(--muted-foreground)]'}`}>
            {pnlPreview
              ? `${pnlPreview.positive ? '+' : ''}$${pnlPreview.dollar}`
              : isOpen ? 'Open' : 'Auto'}
          </div>
          <p className="text-[10px] text-[var(--muted-foreground)] mt-0.5">Calculated from entry/exit</p>
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase tracking-widest text-[var(--muted-foreground)] mb-1.5">
            Fees <span className="text-[var(--accent)]">*</span>
          </label>
          <input type="number" step="any" value={feesVal} onChange={e => setFeesVal(e.target.value)} placeholder="0.00" className="w-full" />
        </div>
      </div>

      {/* ── Funding, Leverage, Margin ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-widest text-[var(--muted-foreground)] mb-1.5">Funding</label>
          <input type="number" step="any" value={fundingVal} onChange={e => setFundingVal(e.target.value)} placeholder="0.00" className="w-full" />
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase tracking-widest text-[var(--muted-foreground)] mb-1.5">
            Leverage <span className="text-[var(--accent)]">*</span>
          </label>
          <input type="number" step="any" min="1" value={leverageVal} onChange={e => setLeverageVal(e.target.value)} placeholder="1x (spot)" className="w-full" />
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase tracking-widest text-[var(--muted-foreground)] mb-1.5">
            Margin <span className="text-[var(--accent)]">*</span>
          </label>
          <input type="number" step="any" value={marginVal} onChange={e => setMarginVal(e.target.value)} placeholder="0.00" className="w-full" />
        </div>
      </div>

      {/* ── Strategy + Stop Loss + Target ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-widest text-[var(--muted-foreground)] mb-1.5">Strategy</label>
          <select value={strategy} onChange={e => setStrategy(e.target.value)} className="w-full">
            <option value="">Select strategy</option>
            {strategies.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase tracking-widest text-[var(--muted-foreground)] mb-1.5">Stop Loss</label>
          <input type="number" step="any" value={stopLossVal} onChange={e => setStopLossVal(e.target.value)} placeholder="0.00" className="w-full" />
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase tracking-widest text-[var(--muted-foreground)] mb-1.5">Target P&L %</label>
          <input type="number" step="0.1" value={targetPnL} onChange={e => setTargetPnL(e.target.value)} placeholder="e.g., 5" className="w-full" />
        </div>
      </div>

      {/* ── Per-Rule Compliance Panel ── */}
      {selectedStrategy && selectedStrategy.rules.length > 0 && (
        <div className={`rounded-xl p-3 sm:p-4 border space-y-2 ${hasRuleBreaks ? 'border-amber-500/30 bg-amber-500/5' : 'border-[var(--border)] bg-[var(--muted)]/30'}`}>
          <div className="flex items-center gap-2 text-sm font-medium">
            {hasRuleBreaks ? <AlertTriangle size={14} className="text-amber-400" /> : <CheckCircle size={14} className="text-green-400" />}
            <span>Rule Check — {selectedStrategy.name}</span>
          </div>
          <div className="space-y-2">
            {selectedStrategy.rules.map((rule, i) => (
              <div key={i} className="flex items-center justify-between gap-2 flex-wrap">
                <span className="text-sm text-[var(--foreground)] flex-1 min-w-0">{rule}</span>
                <div className="flex gap-1 shrink-0">
                  <ComplianceBtn idx={i} val="yes" label="Yes" ruleCompliances={ruleCompliances} setRuleCompliance={setRuleCompliance} />
                  <ComplianceBtn idx={i} val="partial" label="Partial" ruleCompliances={ruleCompliances} setRuleCompliance={setRuleCompliance} />
                  <ComplianceBtn idx={i} val="no" label="No" ruleCompliances={ruleCompliances} setRuleCompliance={setRuleCompliance} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── REVIEW Section ── */}
      <div className="border-t border-[var(--border)] pt-5 space-y-5">
        <div className="inline-flex px-3 py-1 rounded-full bg-[var(--accent)]/10 text-xs text-[var(--accent)] font-semibold uppercase tracking-widest">
          Review
        </div>

        {/* Review Tags */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-widest text-[var(--muted-foreground)] mb-2">Tags</label>
          <div className="flex flex-wrap gap-2">
            {REVIEW_TAGS.map(tag => (
              <button
                key={tag}
                onClick={() => toggleReviewTag(tag)}
                className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${
                  reviewTags.includes(tag)
                    ? 'border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]'
                    : 'border-[var(--border)] text-[var(--muted-foreground)] hover:border-[var(--accent)]/50'
                }`}
              >
                {tag}
              </button>
            ))}
            {TAG_OPTIONS.map(tag => (
              <button
                key={tag.value}
                onClick={() => toggleTag(tag.value as TradeTag)}
                className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${
                  tags.includes(tag.value as TradeTag)
                    ? 'border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]'
                    : 'border-[var(--border)] text-[var(--muted-foreground)] hover:border-[var(--accent)]/50'
                }`}
              >
                {tag.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 mt-2">
            <input
              type="text"
              value={customTag}
              onChange={e => setCustomTag(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addCustomTag()}
              placeholder="Custom..."
              className="flex-1 text-xs"
            />
            <button
              onClick={addCustomTag}
              className="px-3 py-1.5 text-xs rounded-lg bg-[var(--muted)] text-[var(--muted-foreground)] hover:bg-[var(--accent)]/10 hover:text-[var(--accent)] transition-colors"
            >
              Add
            </button>
          </div>
          {reviewTags.filter(t => !REVIEW_TAGS.includes(t)).length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {reviewTags.filter(t => !REVIEW_TAGS.includes(t)).map(tag => (
                <span key={tag} className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] rounded-full bg-[var(--accent)]/10 text-[var(--accent)]">
                  {tag}
                  <button onClick={() => toggleReviewTag(tag)} className="hover:text-[var(--foreground)]"><X size={10} /></button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Execution Rating 1-5 */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-widest text-[var(--muted-foreground)] mb-2">
            Execution <span className="text-[var(--accent)] ml-1">{executionConfidence}/10</span>
          </label>
          <div className="flex gap-1.5">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(v => (
              <button
                key={v}
                onClick={() => setExecutionConfidence(v)}
                className={`w-8 h-8 rounded-lg text-xs font-bold transition-colors ${
                  executionConfidence === v
                    ? 'bg-[var(--accent)] text-white'
                    : v <= executionConfidence
                      ? 'bg-[var(--accent)]/20 text-[var(--accent)]'
                      : 'bg-[var(--muted)] text-[var(--muted-foreground)] hover:bg-[var(--accent)]/10'
                }`}
              >
                {v}
              </button>
            ))}
          </div>
        </div>

        {/* Followed Plan */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-widest text-[var(--muted-foreground)] mb-2">Followed Plan</label>
          <div className="flex gap-2">
            <button
              onClick={() => setFollowedPlan(true)}
              className={`flex-1 py-2 text-sm rounded-lg border font-medium transition-colors ${
                followedPlan === true
                  ? 'border-green-500 bg-green-500/10 text-green-400'
                  : 'border-[var(--border)] text-[var(--muted-foreground)] hover:border-green-500/40'
              }`}
            >
              Yes
            </button>
            <button
              onClick={() => setFollowedPlan(false)}
              className={`flex-1 py-2 text-sm rounded-lg border font-medium transition-colors ${
                followedPlan === false
                  ? 'border-red-500 bg-red-500/10 text-red-400'
                  : 'border-[var(--border)] text-[var(--muted-foreground)] hover:border-red-500/40'
              }`}
            >
              No
            </button>
          </div>
        </div>

        {/* Confidence 1-5 */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-widest text-[var(--muted-foreground)] mb-2">
            Confidence <span className="text-[var(--accent)] ml-1">{setupConfidence}/10</span>
          </label>
          <div className="flex gap-1.5">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(v => (
              <button
                key={v}
                onClick={() => !prefilledEmotion && setSetupConfidence(v)}
                disabled={!!prefilledEmotion}
                className={`w-8 h-8 rounded-lg text-xs font-bold transition-colors ${
                  setupConfidence === v
                    ? 'bg-[var(--accent)] text-white'
                    : v <= setupConfidence
                      ? 'bg-[var(--accent)]/20 text-[var(--accent)]'
                      : 'bg-[var(--muted)] text-[var(--muted-foreground)] hover:bg-[var(--accent)]/10'
                } ${prefilledEmotion ? 'opacity-70 cursor-not-allowed' : ''}`}
              >
                {v}
              </button>
            ))}
          </div>
          {prefilledEmotion && <p className="text-[10px] text-[var(--muted-foreground)] mt-1">Set during emotional checkpoint</p>}
        </div>

        {/* Emotion Tags */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-widest text-[var(--muted-foreground)] mb-2">Emotion</label>
          <div className="flex flex-wrap gap-2">
            {EMOTION_TAGS.map(emo => (
              <button
                key={emo.value}
                onClick={() => !prefilledEmotion && setEmotion(emo.value)}
                disabled={!!prefilledEmotion}
                className={`px-3 py-1.5 text-xs rounded-full border transition-colors font-medium ${
                  emotion === emo.value
                    ? emo.color
                    : 'border-[var(--border)] text-[var(--muted-foreground)] hover:border-[var(--accent)]/50'
                } ${prefilledEmotion ? 'opacity-70 cursor-not-allowed' : ''}`}
              >
                {emo.label}
              </button>
            ))}
          </div>
          {prefilledEmotion && <p className="text-[10px] text-[var(--muted-foreground)] mt-1">Set during emotional checkpoint</p>}
        </div>

        {/* Notes */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs font-semibold uppercase tracking-widest text-[var(--muted-foreground)]">Notes</label>
            <SpeechButton value={setupNotes} onChange={setSetupNotes} />
          </div>
          <textarea
            value={setupNotes}
            onChange={e => setSetupNotes(e.target.value)}
            rows={3}
            placeholder="Describe the setup, market conditions, execution details..."
            className="w-full"
          />
        </div>

        {/* Lesson */}
        <div className={`rounded-xl p-3 border ${hasRuleBreaks ? 'border-amber-500/40 bg-amber-500/5' : 'border-[var(--border)]'}`}>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs font-semibold uppercase tracking-widest text-[var(--muted-foreground)]">
              {hasRuleBreaks ? 'Lesson (rule broken)' : 'Lesson'}
            </label>
            <SpeechButton value={lessonNotes} onChange={setLessonNotes} />
          </div>
          <textarea
            value={lessonNotes}
            onChange={e => setLessonNotes(e.target.value)}
            rows={2}
            placeholder={hasRuleBreaks
              ? 'You broke a rule. What led to it? What will you do differently?'
              : 'Key takeaway from this trade...'
            }
            className="w-full"
          />
        </div>

        {/* Attach Media */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-widest text-[var(--muted-foreground)] mb-2">Attach Media</label>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={async (e) => {
              const files = Array.from(e.target.files ?? []);
              const compressed = await Promise.all(files.map(compressImage));
              setScreenshots(prev => [...prev, ...compressed]);
              e.target.value = '';
            }}
          />
          {screenshots.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2">
              {screenshots.map((src, i) => (
                <div key={i} className="relative group">
                  <img src={src} alt={`Chart ${i + 1}`} className="w-24 h-16 object-cover rounded-lg border border-[var(--border)]" />
                  <button
                    onClick={() => setScreenshots(prev => prev.filter((_, idx) => idx !== i))}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X size={10} />
                  </button>
                </div>
              ))}
            </div>
          )}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-3 py-2 text-sm border border-dashed border-[var(--border)] hover:border-[var(--accent)]/60 text-[var(--muted-foreground)] hover:text-[var(--foreground)] rounded-lg transition-colors w-full justify-center"
          >
            <ImagePlus size={14} /> Attach chart image
          </button>
        </div>
      </div>

      {/* ── Validation Errors ── */}
      {errors.length > 0 && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 space-y-1">
          {errors.map((err, i) => (
            <p key={i} className="text-xs text-red-400 flex items-center gap-2">
              <AlertTriangle size={12} /> {err}
            </p>
          ))}
        </div>
      )}

      {/* ── Actions ── */}
      <div className="flex justify-end gap-3 pt-3 border-t border-[var(--border)]">
        <button onClick={onCancel} className="px-5 py-2.5 text-sm rounded-lg hover:bg-[var(--muted)] transition-colors font-medium">
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={errors.length > 0}
          className="px-6 py-2.5 text-sm bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white rounded-lg font-semibold transition-colors disabled:opacity-50"
        >
          {editTrade ? 'Update Trade' : 'Save Trade'}
        </button>
      </div>
    </div>
  );
}

function ComplianceBtn({
  idx, val, label, ruleCompliances, setRuleCompliance,
}: {
  idx: number;
  val: RuleCompliance;
  label: string;
  ruleCompliances: RuleCompliance[];
  setRuleCompliance: (idx: number, val: RuleCompliance) => void;
}) {
  const active = ruleCompliances[idx] === val;
  const colors = val === 'yes'
    ? 'border-green-500 bg-green-500/10 text-green-400'
    : val === 'partial'
      ? 'border-amber-500 bg-amber-500/10 text-amber-400'
      : 'border-red-500 bg-red-500/10 text-red-400';
  return (
    <button
      onClick={() => setRuleCompliance(idx, val)}
      className={`px-2 py-1 text-xs rounded-lg border transition-colors ${active ? colors : 'border-[var(--border)] text-[var(--muted-foreground)] hover:border-[var(--accent)]/40'}`}
    >
      {label}
    </button>
  );
}
