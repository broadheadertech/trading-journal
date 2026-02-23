'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { Trade, EmotionState, TradeTag, Strategy, RuleCompliance, Verdict, MarketType } from '@/lib/types';
import {
  CRYPTO_SUGGESTIONS, STOCK_SUGGESTIONS, FOREX_SUGGESTIONS, EMOTION_OPTIONS, TAG_OPTIONS,
  getSimilarTrades, getRMultiple, formatPercent,
} from '@/lib/utils';
import { useCurrency } from '@/hooks/useCurrency';
import { CheckCircle, AlertTriangle, X, TrendingUp, TrendingDown, Minus, ImagePlus } from 'lucide-react';

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
import { format } from 'date-fns';

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

const SELF_VERDICT_OPTIONS: { value: Verdict; label: string }[] = [
  { value: 'Well Executed', label: 'Good Trade' },
  { value: 'Good Discipline, Bad Luck', label: 'Mixed' },
  { value: 'Poorly Executed', label: 'Poor Trade' },
];

export default function TradeForm({
  strategies, trades, editTrade, onSubmit, onCancel, prefilledEmotion, onRuleBreak, availableBalance,
}: TradeFormProps) {
  const { formatCurrency } = useCurrency();
  const [isDetailed, setIsDetailed] = useState(!!editTrade || !!prefilledEmotion);
  const [marketType, setMarketType] = useState<MarketType>(editTrade?.marketType ?? 'crypto');
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
  const [ruleCompliances, setRuleCompliances] = useState<RuleCompliance[]>(() => {
    if (editTrade?.ruleChecklist?.length) {
      return editTrade.ruleChecklist.map(r => r.compliance ?? 'yes');
    }
    return [];
  });
  const [reasoning, setReasoning] = useState(editTrade?.reasoning ?? prefilledEmotion?.reasoning ?? '');
  const [emotion, setEmotion] = useState<EmotionState>(editTrade?.emotion ?? prefilledEmotion?.emotion ?? 'Neutral');
  const [setupConfidence, setSetupConfidence] = useState(editTrade?.setupConfidence ?? prefilledEmotion?.intensity ?? 5);
  const [executionConfidence, setExecutionConfidence] = useState(editTrade?.executionConfidence ?? 5);
  const [tags, setTags] = useState<TradeTag[]>(editTrade?.tags ?? []);
  const [setupNotes, setSetupNotes] = useState(editTrade?.setupNotes ?? '');
  const [executionNotes, setExecutionNotes] = useState(editTrade?.executionNotes ?? '');
  const [lessonNotes, setLessonNotes] = useState(editTrade?.lessonNotes ?? '');
  const [oneThingNote, setOneThingNote] = useState(editTrade?.oneThingNote ?? '');
  const [selfVerdict, setSelfVerdict] = useState<Verdict | null>(editTrade?.selfVerdict ?? null);
  const [screenshots, setScreenshots] = useState<string[]>(editTrade?.screenshots ?? []);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [insightDismissed, setInsightDismissed] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedStrategy = strategies.find(s => s.name === strategy);

  // Reset rule compliances when strategy changes
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

  // A-9: Similar trades for pre-log insight panel
  const similarTrades = useMemo(
    () => (coin ? getSimilarTrades(trades, coin, 3) : []),
    [trades, coin]
  );

  // Coin win rate for insight panel
  const coinWinRate = useMemo(() => {
    if (!similarTrades.length) return null;
    const allCoinTrades = trades.filter(t => !t.isOpen && t.coin === coin && t.actualPnL !== null);
    if (allCoinTrades.length < 2) return null;
    const wins = allCoinTrades.filter(t => (t.actualPnL ?? 0) > 0).length;
    return { rate: Math.round((wins / allCoinTrades.length) * 100), count: allCoinTrades.length };
  }, [trades, coin, similarTrades.length]);

  const pnlPreview = useMemo(() => {
    if (!entryPrice || !exitPrice || isOpen) return null;
    const entry = parseFloat(entryPrice);
    const exit = parseFloat(exitPrice);
    const cap = parseFloat(capital) || 0;
    if (!entry || !exit) return null;
    const pct = ((exit - entry) / entry) * 100;
    const dollar = (pct / 100) * cap;
    return { pct: pct.toFixed(2), dollar: dollar.toFixed(2), positive: pct >= 0 };
  }, [entryPrice, exitPrice, capital, isOpen]);

  // C-27: R-multiple preview
  const rMultiplePreview = useMemo(() => {
    if (!entryPrice || !exitPrice || !stopLossVal || !capital || isOpen) return null;
    const entry = parseFloat(entryPrice);
    const exit = parseFloat(exitPrice);
    const sl = parseFloat(stopLossVal);
    const cap = parseFloat(capital);
    if (!entry || !exit || !sl || !cap) return null;
    const riskPct = Math.abs((entry - sl) / entry);
    if (riskPct === 0) return null;
    const riskDollar = cap * riskPct;
    const pnlDollar = ((exit - entry) / entry) * cap;
    return Math.round((pnlDollar / riskDollar) * 10) / 10;
  }, [entryPrice, exitPrice, stopLossVal, capital, isOpen]);

  // C-35: Suggest tags from most common tags used with this coin+strategy
  const suggestedTags = useMemo(() => {
    if (!coin && !strategy) return [];
    const matching = trades.filter(t =>
      (coin ? t.coin === coin : true) && (strategy ? t.strategy === strategy : true)
    );
    const tagCount: Record<string, number> = {};
    matching.forEach(t => t.tags.forEach(tag => { tagCount[tag] = (tagCount[tag] ?? 0) + 1; }));
    return Object.entries(tagCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2)
      .map(([tag]) => tag as TradeTag)
      .filter(tag => !tags.includes(tag));
  }, [trades, coin, strategy, tags]);

  const setRuleCompliance = (idx: number, val: RuleCompliance) => {
    setRuleCompliances(prev => prev.map((c, i) => (i === idx ? val : c)));
  };

  const handleSubmit = () => {
    if (!coin || !entryPrice || !capital) return;

    const ruleChecklist = selectedStrategy
      ? selectedStrategy.rules.map((rule, i) => ({ rule, compliance: ruleCompliances[i] ?? 'yes' }))
      : [];

    // Call onRuleBreak if any rule was broken (lessonNotes is the explanation)
    if (hasRuleBreaks && onRuleBreak && selectedStrategy && lessonNotes.trim()) {
      const brokenRules = ruleChecklist.filter(r => r.compliance === 'no').map(r => r.rule).join(', ');
      onRuleBreak(brokenRules, lessonNotes);
    }

    onSubmit({
      marketType,
      coin,
      entryPrice: parseFloat(entryPrice),
      exitPrice: isOpen ? null : (exitPrice ? parseFloat(exitPrice) : null),
      entryDate,
      exitDate: isOpen ? null : (exitDate || null),
      capital: parseFloat(capital),
      targetPnL: targetPnL ? parseFloat(targetPnL) : null,
      stopLoss: stopLossVal ? parseFloat(stopLossVal) : null,
      strategy,
      rulesFollowed: ruleChecklist.length === 0 ? null : !ruleChecklist.some(r => r.compliance === 'no'),
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

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Mode Toggle */}
      <div className="flex gap-2 p-1 bg-[var(--muted)] rounded-lg w-fit">
        <button
          onClick={() => setIsDetailed(false)}
          className={`px-3 py-1.5 text-sm rounded-md transition-colors ${!isDetailed ? 'bg-[var(--card)] shadow-sm font-medium' : 'text-[var(--muted-foreground)]'}`}
        >
          Quick Add
        </button>
        <button
          onClick={() => setIsDetailed(true)}
          className={`px-3 py-1.5 text-sm rounded-md transition-colors ${isDetailed ? 'bg-[var(--card)] shadow-sm font-medium' : 'text-[var(--muted-foreground)]'}`}
        >
          Detailed
        </button>
      </div>

      {/* Checkpoint Badge */}
      {prefilledEmotion && (
        <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/20 rounded-xl text-sm">
          <CheckCircle size={16} className="text-[var(--green)]" />
          <span className="text-[var(--green)] font-medium">Emotional checkpoint completed</span>
          <span className="text-[var(--muted-foreground)]">
            — {EMOTION_OPTIONS.find(e => e.value === prefilledEmotion.emotion)?.emoji} {prefilledEmotion.emotion} ({prefilledEmotion.intensity}/10)
          </span>
        </div>
      )}

      {/* Market Type Selector */}
      <div>
        <label className="block text-sm font-medium mb-2">Market Type</label>
        <div className="flex gap-2">
          {([
            { value: 'crypto', label: '🪙 Crypto' },
            { value: 'stocks', label: '📈 Stocks' },
            { value: 'forex', label: '💱 Forex' },
          ] as const).map(opt => (
            <button
              key={opt.value}
              onClick={() => setMarketType(opt.value)}
              className={`flex-1 py-2 text-sm rounded-lg border transition-colors ${
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

      {/* Symbol — early for insight panel */}
      <div className="relative">
        <label className="block text-sm font-medium mb-1">Symbol</label>
        <input
          value={coin}
          onChange={e => { setCoin(e.target.value); setShowSuggestions(true); setInsightDismissed(false); }}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
          placeholder={marketType === 'stocks' ? 'e.g., AAPL' : marketType === 'forex' ? 'e.g., EUR/USD' : 'e.g., BTC/USDT'}
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

      {/* A-5 / A-9 / C-39: Pre-log Insight Panel */}
      {isDetailed && similarTrades.length > 0 && !insightDismissed && (
        <div className="bg-[var(--muted)]/50 border border-[var(--border)] rounded-xl p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wide">
              Your last {similarTrades.length} {coin} trade{similarTrades.length !== 1 ? 's' : ''}
              {coinWinRate && <span className="ml-2 text-[var(--accent)]">· {coinWinRate.rate}% win rate ({coinWinRate.count} trades)</span>}
            </span>
            <button onClick={() => setInsightDismissed(true)} className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors">
              <X size={14} />
            </button>
          </div>
          <div className="space-y-1">
            {similarTrades.map(t => {
              const isWin = (t.actualPnL ?? 0) > 0;
              const fullCompliance = t.ruleChecklist.length === 0 || !t.ruleChecklist.some(r => r.compliance === 'no');
              return (
                <div key={t.id} className="flex items-center gap-2 text-xs">
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${isWin ? 'bg-[var(--green)]' : 'bg-[var(--red)]'}`} />
                  <span className="text-[var(--muted-foreground)]">
                    {t.exitDate ? format(new Date(t.exitDate), 'MMM d') : '—'}
                  </span>
                  <span className={`font-medium ${isWin ? 'text-[var(--green)]' : 'text-[var(--red)]'}`}>
                    {t.actualPnLPercent !== null ? formatPercent(t.actualPnLPercent) : '—'}
                  </span>
                  <span className={`ml-auto px-1.5 py-0.5 rounded text-[10px] ${fullCompliance ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                    {fullCompliance ? '✓ rules' : '✗ rules'}
                  </span>
                </div>
              );
            })}
          </div>
          {/* One Thing Note from most recent similar trade */}
          {similarTrades[0]?.oneThingNote && (
            <div className="mt-1 pt-2 border-t border-[var(--border)] text-xs italic text-[var(--muted-foreground)]">
              💬 You said: &quot;{similarTrades[0].oneThingNote}&quot;
            </div>
          )}
        </div>
      )}

      {/* Core price fields */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Entry Price</label>
          <input type="number" step="any" value={entryPrice} onChange={e => setEntryPrice(e.target.value)} placeholder="0.00" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Exit Price</label>
          <div className="flex flex-col gap-1">
            <input
              type="number"
              step="any"
              value={exitPrice}
              onChange={e => setExitPrice(e.target.value)}
              placeholder="0.00"
              disabled={isOpen}
              className={isOpen ? 'opacity-50' : ''}
            />
            <label className="flex items-center gap-2 text-sm text-[var(--muted-foreground)] cursor-pointer">
              <input type="checkbox" checked={isOpen} onChange={e => setIsOpen(e.target.checked)} className="w-4 h-4 rounded accent-[var(--accent)]" />
              Still Open
            </label>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Position Size ($)</label>
          {(() => {
            const pos = parseFloat(capital) || 0;
            const bal = availableBalance ?? 0;
            const overLimit = bal > 0 && pos > bal;
            const overConcentration = bal > 0 && !overLimit && pos / bal > 0.2;
            return (
              <>
                <input
                  type="number"
                  step="any"
                  value={capital}
                  onChange={e => setCapital(e.target.value)}
                  placeholder="1000"
                  className={overLimit ? 'border-red-500 focus:ring-red-500' : overConcentration ? 'border-yellow-500 focus:ring-yellow-500' : ''}
                />
                {bal > 0 && (
                  <p className={`text-xs mt-1 ${overLimit ? 'text-red-400' : overConcentration ? 'text-yellow-400' : 'text-[var(--muted-foreground)]'}`}>
                    {overLimit
                      ? `⚠ Exceeds available balance (${formatCurrency(bal)})`
                      : overConcentration
                        ? `⚠ >20% concentration — available: ${formatCurrency(bal)}`
                        : `Available: ${formatCurrency(bal)}`}
                  </p>
                )}
              </>
            );
          })()}
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">P&L Preview</label>
          <div className={`h-[38px] flex items-center px-3 rounded-lg border border-[var(--border)] text-sm font-medium ${pnlPreview ? (pnlPreview.positive ? 'text-[var(--green)] bg-green-500/5' : 'text-[var(--red)] bg-red-500/5') : 'text-[var(--muted-foreground)]'}`}>
            {pnlPreview
              ? `${pnlPreview.positive ? '+' : ''}${pnlPreview.pct}% ($${pnlPreview.positive ? '+' : ''}${pnlPreview.dollar})${rMultiplePreview !== null ? ` · ${rMultiplePreview > 0 ? '+' : ''}${rMultiplePreview}R` : ''}`
              : isOpen ? 'Trade is open' : 'Enter prices'}
          </div>
        </div>
      </div>

      {/* Detailed Fields */}
      {isDetailed && (
        <div className="space-y-4 sm:space-y-5 pt-4 border-t border-[var(--border)] animate-in">

          {/* Strategy — moved up */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Strategy</label>
              <select value={strategy} onChange={e => setStrategy(e.target.value)}>
                <option value="">Select strategy</option>
                {strategies.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Stop Loss Price</label>
              <input type="number" step="any" value={stopLossVal} onChange={e => setStopLossVal(e.target.value)} placeholder="0.00" />
              {rMultiplePreview !== null && (
                <p className={`text-xs mt-1 font-medium ${rMultiplePreview >= 0 ? 'text-[var(--green)]' : 'text-[var(--red)]'}`}>
                  {rMultiplePreview > 0 ? '+' : ''}{rMultiplePreview}R vs your risk
                </p>
              )}
            </div>
          </div>

          {/* C-20 / C-23: Per-Rule Compliance Panel */}
          {selectedStrategy && selectedStrategy.rules.length > 0 && (
            <div className={`rounded-xl p-3 sm:p-4 border space-y-2 ${hasRuleBreaks ? 'border-amber-500/30 bg-amber-500/5' : 'border-[var(--border)] bg-[var(--muted)]/30'}`}>
              <div className="flex items-center gap-2 text-sm font-medium">
                {hasRuleBreaks ? <AlertTriangle size={14} className="text-amber-400" /> : <CheckCircle size={14} className="text-[var(--green)]" />}
                <span>Rule Check — {selectedStrategy.name}</span>
              </div>
              <div className="space-y-2">
                {selectedStrategy.rules.map((rule, i) => (
                  <div key={i} className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="text-sm text-[var(--foreground)] flex-1 min-w-0">{rule}</span>
                    <div className="flex gap-1 shrink-0">
                      <ComplianceBtn idx={i} val="yes" label="✓ Full" ruleCompliances={ruleCompliances} setRuleCompliance={setRuleCompliance} />
                      <ComplianceBtn idx={i} val="partial" label="~ Partial" ruleCompliances={ruleCompliances} setRuleCompliance={setRuleCompliance} />
                      <ComplianceBtn idx={i} val="no" label="✗ Broke" ruleCompliances={ruleCompliances} setRuleCompliance={setRuleCompliance} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* C-40: Emotional State — moved UP before price context */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Entry Emotion <span className="text-[var(--muted-foreground)] font-normal text-xs">— how you felt going in</span></label>
              <div className="grid grid-cols-3 gap-2">
                {EMOTION_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => !prefilledEmotion && setEmotion(opt.value as EmotionState)}
                    disabled={!!prefilledEmotion}
                    className={`py-2 text-xs rounded-lg border transition-colors ${emotion === opt.value ? 'border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]' : 'border-[var(--border)] text-[var(--muted-foreground)] hover:border-[var(--accent)]/50'} ${prefilledEmotion ? 'cursor-not-allowed opacity-70' : ''}`}
                  >
                    {opt.emoji} {opt.label}
                  </button>
                ))}
              </div>
              {prefilledEmotion && <p className="text-xs text-[var(--muted-foreground)] mt-1">Set during emotional checkpoint</p>}
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1.5">
                  Setup Confidence: <span className="text-[var(--accent)]">{setupConfidence}/10</span>
                  <span className="text-[var(--muted-foreground)] font-normal ml-1.5">How confident was I in the setup?</span>
                </label>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={setupConfidence}
                  onChange={e => !prefilledEmotion && setSetupConfidence(parseInt(e.target.value))}
                  disabled={!!prefilledEmotion}
                  className={`w-full accent-[var(--accent)] ${prefilledEmotion ? 'opacity-70 cursor-not-allowed' : ''}`}
                />
                <div className="flex justify-between text-xs text-[var(--muted-foreground)]">
                  <span>Uncertain</span><span>Certain</span>
                </div>
                {prefilledEmotion && <p className="text-xs text-[var(--muted-foreground)] mt-0.5">Set during emotional checkpoint</p>}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">
                  Execution Confidence: <span className="text-[var(--accent)]">{executionConfidence}/10</span>
                  <span className="text-[var(--muted-foreground)] font-normal ml-1.5">How well did I execute?</span>
                </label>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={executionConfidence}
                  onChange={e => setExecutionConfidence(parseInt(e.target.value))}
                  className="w-full accent-[var(--accent)]"
                />
                <div className="flex justify-between text-xs text-[var(--muted-foreground)]">
                  <span>Poor</span><span>Perfect</span>
                </div>
              </div>
              <p className="text-xs text-[var(--muted-foreground)]">
                Overall confidence: {Math.round((setupConfidence + executionConfidence) / 2)}/10 (average)
              </p>
            </div>
          </div>

          {/* Dates and Target */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Entry Date/Time</label>
              <input type="datetime-local" value={entryDate} onChange={e => setEntryDate(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Exit Date/Time</label>
              <input type="datetime-local" value={exitDate} onChange={e => setExitDate(e.target.value)} disabled={isOpen} className={isOpen ? 'opacity-50' : ''} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Target P&L %</label>
              <input type="number" step="0.1" value={targetPnL} onChange={e => setTargetPnL(e.target.value)} placeholder="e.g., 5" />
            </div>
          </div>

          {/* C-36: Three Targeted Notes */}
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium mb-1">What did you see? <span className="text-[var(--muted-foreground)] font-normal">(Setup)</span></label>
              <textarea
                value={setupNotes}
                onChange={e => setSetupNotes(e.target.value)}
                rows={2}
                placeholder="Describe the setup, market conditions, and what led you to this trade..."
              />
            </div>

            {/* Chart Screenshots */}
            <div>
              <label className="block text-sm font-medium mb-2">Chart Screenshots <span className="text-[var(--muted-foreground)] font-normal">(optional)</span></label>
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
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-[var(--red)] text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
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
                <ImagePlus size={14} /> Add chart image
              </button>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">What did you do? <span className="text-[var(--muted-foreground)] font-normal">(Execution)</span></label>
              <textarea
                value={executionNotes}
                onChange={e => setExecutionNotes(e.target.value)}
                rows={2}
                placeholder="How did you execute? Entry timing, sizing decisions, exits..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Context / Why You Entered</label>
              <textarea
                value={reasoning}
                onChange={e => setReasoning(e.target.value)}
                rows={2}
                placeholder="Your reasoning at the time..."
                readOnly={!!prefilledEmotion}
                className={prefilledEmotion ? 'opacity-70 cursor-not-allowed' : ''}
              />
              {prefilledEmotion && <p className="text-xs text-[var(--muted-foreground)] mt-1">Set during emotional checkpoint</p>}
            </div>
          </div>

          {/* Tags + C-35 suggestions */}
          <div>
            <label className="block text-sm font-medium mb-2">Tags</label>
            <div className="flex flex-wrap gap-2">
              {TAG_OPTIONS.map(tag => (
                <button
                  key={tag.value}
                  onClick={() => toggleTag(tag.value as TradeTag)}
                  className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${tags.includes(tag.value as TradeTag) ? 'border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]' : 'border-[var(--border)] text-[var(--muted-foreground)] hover:border-[var(--accent)]/50'}`}
                >
                  {tag.label}
                </button>
              ))}
            </div>
            {suggestedTags.length > 0 && (
              <div className="flex items-center gap-2 mt-1.5">
                <span className="text-[10px] text-[var(--muted-foreground)]">Suggested:</span>
                {suggestedTags.map(tag => (
                  <button
                    key={tag}
                    onClick={() => toggleTag(tag)}
                    className="px-2 py-0.5 text-[10px] rounded-full border border-dashed border-[var(--accent)]/50 text-[var(--accent)] hover:bg-[var(--accent)]/10 transition-colors"
                  >
                    + {TAG_OPTIONS.find(t => t.value === tag)?.label ?? tag}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* C-36 / C-28: Lesson Notes — amplified when rule broken */}
          <div className={`rounded-xl p-3 border ${hasRuleBreaks ? 'border-amber-500/40 bg-amber-500/5' : 'border-[var(--border)]'}`}>
            <label className="block text-sm font-medium mb-1">
              {hasRuleBreaks
                ? <span className="text-amber-400">⚠ What would you change? <span className="text-[var(--muted-foreground)] font-normal">(A rule was broken — what led to it?)</span></span>
                : <span>What would you change? <span className="text-[var(--muted-foreground)] font-normal">(Reflection)</span></span>
              }
            </label>
            <textarea
              value={lessonNotes}
              onChange={e => setLessonNotes(e.target.value)}
              rows={hasRuleBreaks ? 3 : 2}
              placeholder={hasRuleBreaks
                ? 'You broke a rule. What led to it? What will you do differently next time?'
                : 'What would you do differently? Any lessons learned from this trade?'
              }
              className={hasRuleBreaks ? 'border-amber-500/30 focus:border-amber-500' : ''}
            />
          </div>

          {/* A-6: One Thing Field */}
          <div>
            <label className="block text-sm font-medium mb-1">
              One thing for your future self <span className="text-[var(--muted-foreground)] font-normal">(optional)</span>
            </label>
            <input
              type="text"
              value={oneThingNote}
              onChange={e => setOneThingNote(e.target.value)}
              placeholder="What's the one thing you'd tell yourself before this trade type next time?"
            />
            <p className="text-[10px] text-[var(--muted-foreground)] mt-1">This will appear as a reminder the next time you log a {coin || 'similar'} trade.</p>
          </div>

          {/* C-22: Self-Verdict Selector */}
          <div>
            <label className="block text-sm font-medium mb-2">How do you rate this trade?</label>
            <div className="flex gap-2">
              {SELF_VERDICT_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setSelfVerdict(selfVerdict === opt.value ? null : opt.value)}
                  className={`flex-1 py-2 text-sm rounded-lg border transition-colors ${
                    selfVerdict === opt.value
                      ? opt.value === 'Well Executed'
                        ? 'border-[var(--green)] bg-green-500/10 text-[var(--green)]'
                        : opt.value === 'Good Discipline, Bad Luck'
                          ? 'border-amber-500 bg-amber-500/10 text-amber-400'
                          : 'border-red-500 bg-red-500/10 text-red-400'
                      : 'border-[var(--border)] text-[var(--muted-foreground)] hover:border-[var(--accent)]/40'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-[var(--muted-foreground)] mt-1">The journal will also assign its own verdict — compare them in your trade log.</p>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-3 border-t border-[var(--border)]">
        <button onClick={onCancel} className="px-4 py-2 text-sm rounded-lg hover:bg-[var(--muted)] transition-colors">Cancel</button>
        <button
          onClick={handleSubmit}
          disabled={!coin || !entryPrice || !capital}
          className="px-6 py-2 text-sm bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white rounded-lg font-medium transition-colors disabled:opacity-50"
        >
          {editTrade ? 'Update Trade' : 'Log Trade'}
        </button>
      </div>
    </div>
  );
}

// Extracted compliance button to avoid hooks-in-callbacks issue
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
    ? 'border-[var(--green)] bg-green-500/10 text-[var(--green)]'
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
