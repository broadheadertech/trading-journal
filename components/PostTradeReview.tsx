'use client';

import { useState, useMemo } from 'react';
import { Trade, EmotionState, RuleCompliance, Direction } from '@/lib/types';
import { EMOTION_OPTIONS } from '@/lib/utils';
import { useCurrency } from '@/hooks/useCurrency';
import { TrendingUp, TrendingDown, SkipForward } from 'lucide-react';

export interface PostTradeSnapshot {
  coin: string;
  strategy: string;
  entryPrice: number;
  exitPrice: number | null;
  capital: number;
  confidence: number;
  stopLoss: number | null;
  ruleChecklist: { rule: string; compliance: RuleCompliance }[];
  direction?: Direction;
  leverage?: number | null;
}

interface Props {
  snapshot: PostTradeSnapshot;
  allTrades: Trade[];
  onSave: (emotion: EmotionState) => void;
  onSkip: () => void;
}

export default function PostTradeReview({ snapshot, allTrades, onSave, onSkip }: Props) {
  const { formatCurrency } = useCurrency();
  const [selectedEmotion, setSelectedEmotion] = useState<EmotionState>('Neutral');

  const pnlPercent = useMemo(() => {
    if (!snapshot.exitPrice || !snapshot.entryPrice) return null;
    const dir = snapshot.direction ?? 'long';
    const lev = snapshot.leverage && snapshot.leverage > 0 ? snapshot.leverage : 1;
    const raw = dir === 'short'
      ? ((snapshot.entryPrice - snapshot.exitPrice) / snapshot.entryPrice) * 100
      : ((snapshot.exitPrice - snapshot.entryPrice) / snapshot.entryPrice) * 100;
    return raw * lev;
  }, [snapshot]);

  const isWin = pnlPercent !== null && pnlPercent > 0;
  const pnlDollar = pnlPercent !== null ? (snapshot.capital * pnlPercent / 100) : null;

  const rMultiple = useMemo(() => {
    if (!snapshot.exitPrice || !snapshot.entryPrice || !snapshot.stopLoss) return null;
    const risk = Math.abs(snapshot.entryPrice - snapshot.stopLoss);
    if (risk === 0) return null;
    const dir = snapshot.direction ?? 'long';
    const move = dir === 'short'
      ? snapshot.entryPrice - snapshot.exitPrice
      : snapshot.exitPrice - snapshot.entryPrice;
    return move / risk;
  }, [snapshot]);

  const rulesYes = snapshot.ruleChecklist.filter(r => r.compliance === 'yes').length;
  const rulesPartial = snapshot.ruleChecklist.filter(r => r.compliance === 'partial').length;
  const rulesNo = snapshot.ruleChecklist.filter(r => r.compliance === 'no').length;

  const streak = useMemo(() => {
    const closed = allTrades
      .filter(t => !t.isOpen && t.exitDate && t.actualPnLPercent !== null)
      .sort((a, b) => (b.exitDate ?? '').localeCompare(a.exitDate ?? ''));
    if (closed.length === 0) return null;
    const firstIsWin = (closed[0].actualPnLPercent ?? 0) > 0;
    let count = 1;
    for (let i = 1; i < closed.length; i++) {
      if (((closed[i].actualPnLPercent ?? 0) > 0) === firstIsWin) count++;
      else break;
    }
    return count >= 2 ? { isWin: firstIsWin, count } : null;
  }, [allTrades]);

  const coinAvg = useMemo(() => {
    const same = allTrades.filter(
      t => !t.isOpen && t.coin.toLowerCase() === snapshot.coin.toLowerCase() && t.actualPnLPercent !== null
    );
    if (same.length === 0) return null;
    return same.reduce((s, t) => s + (t.actualPnLPercent ?? 0), 0) / same.length;
  }, [allTrades, snapshot.coin]);

  const vsAverage = useMemo(() => {
    const stratTrades = allTrades.filter(t => !t.isOpen && t.strategy === snapshot.strategy && t.capital > 0);
    const avgCapital = stratTrades.length >= 3 ? stratTrades.reduce((s, t) => s + t.capital, 0) / stratTrades.length : null;
    const allClosed = allTrades.filter(t => !t.isOpen && t.confidence > 0);
    const avgConf = allClosed.length >= 3 ? allClosed.reduce((s, t) => s + t.confidence, 0) / allClosed.length : null;
    if (!avgCapital && !avgConf) return null;
    const posRatio = avgCapital ? snapshot.capital / avgCapital : null;
    const confDelta = avgConf ? snapshot.confidence - avgConf : null;
    return { avgCapital, posRatio, avgConf, confDelta };
  }, [allTrades, snapshot.strategy, snapshot.capital, snapshot.confidence]);

  const hasInsights = snapshot.ruleChecklist.length > 0 || rMultiple !== null || streak !== null || coinAvg !== null || vsAverage !== null;

  return (
    <div className="space-y-5">
      {/* Result Banner */}
      <div className={`rounded-xl p-4 flex items-center justify-between ${
        isWin
          ? 'bg-green-500/10 border border-green-500/20'
          : 'bg-red-500/10 border border-red-500/20'
      }`}>
        <div>
          <p className="text-sm text-[var(--muted-foreground)]">
            {snapshot.coin}{snapshot.strategy ? ` · ${snapshot.strategy}` : ''}
          </p>
          <div className="flex items-center gap-2 mt-1">
            {isWin
              ? <TrendingUp size={20} className="text-[var(--green)]" />
              : <TrendingDown size={20} className="text-[var(--red)]" />
            }
            <span className={`text-2xl font-bold ${isWin ? 'text-[var(--green)]' : 'text-[var(--red)]'}`}>
              {pnlPercent !== null
                ? `${pnlPercent >= 0 ? '+' : ''}${pnlPercent.toFixed(2)}%`
                : '—'
              }
            </span>
            {pnlDollar !== null && (
              <span className="text-sm text-[var(--muted-foreground)]">
                ({pnlDollar >= 0 ? '+' : ''}{pnlDollar.toFixed(2)} USD)
              </span>
            )}
          </div>
        </div>
        <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
          isWin ? 'bg-green-500/20 text-[var(--green)]' : 'bg-red-500/20 text-[var(--red)]'
        }`}>
          {isWin ? 'WIN' : 'LOSS'}
        </span>
      </div>

      {/* Data Insights */}
      {hasInsights && (
        <div className="bg-[var(--muted)]/40 rounded-xl p-4 space-y-2.5">
          <h4 className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wide mb-3">
            What the data says
          </h4>

          {snapshot.ruleChecklist.length > 0 && (
            <div className="flex items-center flex-wrap gap-x-3 gap-y-1 text-sm">
              <span className="text-[var(--muted-foreground)]">Rules:</span>
              {rulesYes > 0 && <span className="text-[var(--green)]">✓ {rulesYes} followed</span>}
              {rulesPartial > 0 && <span className="text-[var(--yellow)]">~ {rulesPartial} partial</span>}
              {rulesNo > 0 && <span className="text-[var(--red)]">✗ {rulesNo} broke</span>}
            </div>
          )}

          {rMultiple !== null && (
            <div className="text-sm">
              <span className="text-[var(--muted-foreground)]">R-multiple: </span>
              <span className={`font-medium ${rMultiple >= 0 ? 'text-[var(--green)]' : 'text-[var(--red)]'}`}>
                {rMultiple >= 0 ? '+' : ''}{rMultiple.toFixed(2)}R
              </span>
            </div>
          )}

          {streak && (
            <div className="text-sm">
              <span className="text-[var(--muted-foreground)]">Streak: </span>
              <span className={streak.isWin ? 'text-[var(--green)]' : 'text-[var(--red)]'}>
                {streak.isWin ? '🔥' : '❄️'} {streak.count} {streak.isWin ? 'wins' : 'losses'} in a row
              </span>
            </div>
          )}

          {coinAvg !== null && pnlPercent !== null && (
            <div className="text-sm">
              <span className="text-[var(--muted-foreground)]">Your {snapshot.coin} avg: </span>
              <span className={coinAvg >= 0 ? 'text-[var(--green)]' : 'text-[var(--red)]'}>
                {coinAvg >= 0 ? '+' : ''}{coinAvg.toFixed(2)}%
              </span>
              <span className="text-[var(--muted-foreground)]">
                {' — this trade is '}
                <span className={pnlPercent > coinAvg ? 'text-[var(--green)]' : 'text-[var(--red)]'}>
                  {pnlPercent > coinAvg ? 'above' : 'below'} your average
                </span>
              </span>
            </div>
          )}

          {vsAverage && (
            <div className="text-xs text-[var(--muted-foreground)] border-t border-[var(--border)] pt-2.5 space-y-1">
              <p className="font-medium text-[var(--foreground)] text-xs mb-1">vs. your average</p>
              {vsAverage.avgCapital && (
                <p>
                  Position size: <span className={vsAverage.posRatio && vsAverage.posRatio > 1.5 ? 'text-yellow-400 font-medium' : 'text-[var(--foreground)]'}>
                    {formatCurrency(snapshot.capital)}
                  </span>
                  {vsAverage.posRatio && (
                    <span className={vsAverage.posRatio > 1.5 ? 'text-yellow-400' : ''}>
                      {' '}({vsAverage.posRatio.toFixed(1)}× your {snapshot.strategy || 'strategy'} avg)
                    </span>
                  )}
                </p>
              )}
              {vsAverage.avgConf && vsAverage.confDelta !== null && (
                <p>
                  Confidence: <span className={vsAverage.confDelta > 10 ? 'text-[var(--gain)]' : vsAverage.confDelta < -10 ? 'text-[var(--loss)]' : 'text-[var(--foreground)]'}>
                    {snapshot.confidence}%
                  </span>
                  <span>
                    {' '}({vsAverage.confDelta > 0 ? '+' : ''}{Math.round(vsAverage.confDelta)}% vs your avg)
                  </span>
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Post-Trade Emotion */}
      <div>
        <h4 className="text-sm font-medium mb-1">Exit Emotion <span className="text-xs font-normal text-[var(--muted-foreground)]">— how do you feel seeing this result?</span></h4>
        <div className="grid grid-cols-4 gap-2">
          {EMOTION_OPTIONS.map(opt => {
            const isSelected = selectedEmotion === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => setSelectedEmotion(opt.value as EmotionState)}
                className={`py-2.5 rounded-xl border-2 text-center transition-all ${
                  isSelected
                    ? 'border-[var(--accent)] bg-[var(--accent)]/10'
                    : 'border-[var(--border)] hover:border-[var(--accent)]/40'
                }`}
              >
                <div className="text-lg">{opt.emoji}</div>
                <div className="text-[10px] text-[var(--muted-foreground)] mt-0.5">{opt.label}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-3 border-t border-[var(--border)]">
        <button
          onClick={onSkip}
          className="flex items-center gap-1.5 px-3 py-2 text-sm text-[var(--muted-foreground)] hover:bg-[var(--muted)] rounded-lg transition-colors"
        >
          <SkipForward size={14} /> Skip
        </button>
        <button
          onClick={() => onSave(selectedEmotion)}
          className="px-5 py-2 text-sm bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white rounded-lg font-medium transition-colors"
        >
          Save Reflection
        </button>
      </div>
    </div>
  );
}
