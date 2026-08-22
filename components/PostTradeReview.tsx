'use client';

import { useState, useMemo } from 'react';
import { Trade, EmotionState, RuleCompliance, Direction } from '@/lib/types';
import { EMOTION_OPTIONS } from '@/lib/utils';
import { useCurrency } from '@/hooks/useCurrency';
import { TrendUp, TrendDown, SkipForward } from '@phosphor-icons/react';

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

  const tone = isWin ? 'var(--green)' : 'var(--red)';

  const hasInsights = snapshot.ruleChecklist.length > 0 || rMultiple !== null || streak !== null || coinAvg !== null || vsAverage !== null;

  return (
    <div>
      {/* Result Banner */}
      <div className="card" style={{ padding: '19px 22px 22px', display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
        <span className="accent" style={{ width: 56, background: tone }} />
        <div style={{ flex: 1, minWidth: 200 }}>
          <p style={{ margin: 0, fontSize: '11.5px', color: 'var(--muted-2)' }}>
            {snapshot.coin}{snapshot.strategy ? ` · ${snapshot.strategy}` : ''}
          </p>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap', marginTop: 10 }}>
            {isWin
              ? <TrendUp size={18} style={{ color: 'var(--green)', alignSelf: 'center' }} />
              : <TrendDown size={18} style={{ color: 'var(--red)', alignSelf: 'center' }} />
            }
            <span style={{ fontFamily: 'var(--mono)', fontWeight: 500, fontSize: 26, color: tone }}>
              {pnlPercent !== null
                ? `${pnlPercent >= 0 ? '+' : ''}${pnlPercent.toFixed(2)}%`
                : '—'
              }
            </span>
            {pnlDollar !== null && (
              <span style={{ fontFamily: 'var(--mono)', fontSize: '12.5px', color: 'var(--muted)' }}>
                ({pnlDollar >= 0 ? '+' : ''}{pnlDollar.toFixed(2)} USD)
              </span>
            )}
          </div>
        </div>
        <span className="chip" style={{ height: 26, fontWeight: 700, fontSize: '10.5px', letterSpacing: '.06em', color: tone, borderColor: tone }}>
          {isWin ? 'WIN' : 'LOSS'}
        </span>
      </div>

      {/* Data Insights */}
      {hasInsights && (
        <div className="card" style={{ marginTop: 18, padding: '20px 22px 24px' }}>
          <h4>What the data says</h4>

          {snapshot.ruleChecklist.length > 0 && (
            <div className="mrow" style={{ gap: 14, flexWrap: 'wrap' }}>
              <span style={{ color: 'var(--muted-2)' }}>Rules</span>
              <span style={{ marginLeft: 'auto', display: 'inline-flex', gap: 14, flexWrap: 'wrap', fontFamily: 'var(--mono)', fontSize: '12px' }}>
                {rulesYes > 0 && <span style={{ color: 'var(--green)' }}>✓ {rulesYes} followed</span>}
                {rulesPartial > 0 && <span style={{ color: 'var(--amber)' }}>~ {rulesPartial} partial</span>}
                {rulesNo > 0 && <span style={{ color: 'var(--red)' }}>✗ {rulesNo} broke</span>}
              </span>
            </div>
          )}

          {rMultiple !== null && (
            <div className="mrow">
              <span style={{ color: 'var(--muted-2)' }}>R-multiple</span>
              <span className="val" style={{ color: rMultiple >= 0 ? 'var(--green)' : 'var(--red)' }}>
                {rMultiple >= 0 ? '+' : ''}{rMultiple.toFixed(2)}R
              </span>
            </div>
          )}

          {streak && (
            <div className="mrow">
              <span style={{ color: 'var(--muted-2)' }}>Streak</span>
              <span style={{ marginLeft: 'auto', fontSize: '12px', color: streak.isWin ? 'var(--green)' : 'var(--red)' }}>
                {streak.isWin ? '🔥' : '❄️'} {streak.count} {streak.isWin ? 'wins' : 'losses'} in a row
              </span>
            </div>
          )}

          {coinAvg !== null && pnlPercent !== null && (
            <div className="mrow" style={{ flexWrap: 'wrap', gap: 8 }}>
              <span style={{ color: 'var(--muted-2)' }}>Your {snapshot.coin} avg</span>
              <span style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ fontFamily: 'var(--mono)', fontSize: '12.5px', color: coinAvg >= 0 ? 'var(--green)' : 'var(--red)' }}>
                  {coinAvg >= 0 ? '+' : ''}{coinAvg.toFixed(2)}%
                </span>
                <span style={{ fontSize: '11.5px', color: 'var(--muted-2)' }}>
                  {'— this trade is '}
                  <span style={{ color: pnlPercent > coinAvg ? 'var(--green)' : 'var(--red)' }}>
                    {pnlPercent > coinAvg ? 'above' : 'below'} your average
                  </span>
                </span>
              </span>
            </div>
          )}

          {vsAverage && (
            <div className="inset" style={{ marginTop: 16, padding: '13px 16px' }}>
              <p className="lbl" style={{ textTransform: 'uppercase' }}>VS. YOUR AVERAGE</p>
              {vsAverage.avgCapital && (
                <p style={{ margin: '10px 0 0', fontSize: '11.5px', lineHeight: '18px', color: 'var(--muted)' }}>
                  Position size: <span style={{ fontFamily: 'var(--mono)', color: vsAverage.posRatio && vsAverage.posRatio > 1.5 ? 'var(--amber)' : 'var(--text)' }}>
                    {formatCurrency(snapshot.capital)}
                  </span>
                  {vsAverage.posRatio && (
                    <span style={{ color: vsAverage.posRatio > 1.5 ? 'var(--amber)' : 'var(--muted)' }}>
                      {' '}({vsAverage.posRatio.toFixed(1)}× your {snapshot.strategy || 'strategy'} avg)
                    </span>
                  )}
                </p>
              )}
              {vsAverage.avgConf && vsAverage.confDelta !== null && (
                <p style={{ margin: '8px 0 0', fontSize: '11.5px', lineHeight: '18px', color: 'var(--muted)' }}>
                  Confidence: <span style={{ fontFamily: 'var(--mono)', color: vsAverage.confDelta > 10 ? 'var(--green)' : vsAverage.confDelta < -10 ? 'var(--red)' : 'var(--text)' }}>
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
      <div className="field" style={{ marginTop: 26 }}>
        <label style={{ textTransform: 'uppercase' }}>Exit Emotion — how do you feel seeing this result?</label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(88px,1fr))', gap: 8 }}>
          {EMOTION_OPTIONS.map(opt => {
            const isSelected = selectedEmotion === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => setSelectedEmotion(opt.value as EmotionState)}
                className="inset"
                style={{
                  textAlign: 'center', padding: '11px 8px', cursor: 'pointer',
                  borderColor: isSelected ? 'var(--amber)' : 'var(--line)',
                  background: isSelected ? 'var(--panel)' : 'var(--panel-2)',
                }}
              >
                <div style={{ fontSize: 17, lineHeight: '20px' }}>{opt.emoji}</div>
                <div style={{ marginTop: 4, fontSize: '9.5px', fontWeight: 700, letterSpacing: '.04em', color: isSelected ? 'var(--amber)' : 'var(--muted-2)' }}>{opt.label}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginTop: 24, paddingTop: 18, borderTop: '1px solid var(--line)' }}>
        <button onClick={onSkip} className="btn-g" style={{ height: 40 }}>
          <SkipForward size={14} /> Skip
        </button>
        <button onClick={() => onSave(selectedEmotion)} className="btn-a" style={{ height: 40 }}>
          Save Reflection
        </button>
      </div>
    </div>
  );
}
