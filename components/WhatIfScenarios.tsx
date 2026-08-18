'use client';

import { useState, useMemo } from 'react';
import { Trade, Strategy, EmotionState } from '@/lib/types';
import { CRYPTO_SUGGESTIONS, EMOTION_OPTIONS } from '@/lib/utils';
import { Sparkles, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

interface Props {
  trades: Trade[];
  strategies: Strategy[];
}

type Recommendation = 'Proceed' | 'Caution' | 'Skip';

interface Analysis {
  recommendation: Recommendation;
  reasons: string[];
  riskScore: number;
  historicalContext: string;
}

export default function WhatIfScenarios({ trades, strategies }: Props) {
  const [coin, setCoin] = useState('');
  const [entryPrice, setEntryPrice] = useState('');
  const [positionSize, setPositionSize] = useState('');
  const [strategyName, setStrategyName] = useState('');
  const [currentEmotion, setCurrentEmotion] = useState<EmotionState>('Neutral');
  const [analysis, setAnalysis] = useState<Analysis | null>(null);

  const closedTrades = trades.filter(t => !t.isOpen && t.actualPnLPercent !== null);

  const handleAnalyze = () => {
    const selectedStrategy = strategies.find(s => s.name === strategyName);
    const coinTrades = closedTrades.filter(t => t.coin.toLowerCase() === coin.toLowerCase());
    const stratTrades = closedTrades.filter(t => t.strategy === strategyName);
    const emotionTrades = closedTrades.filter(t => t.emotion === currentEmotion);

    const reasons: string[] = [];
    let riskScore = 50;

    // Strategy check
    if (selectedStrategy) {
      reasons.push(`Strategy "${selectedStrategy.name}" has ${selectedStrategy.rules.length} rules defined.`);
      if (stratTrades.length > 0) {
        const stratWinRate = stratTrades.filter(t => (t.actualPnLPercent ?? 0) > 0).length / stratTrades.length;
        reasons.push(`Historical win rate with this strategy: ${Math.round(stratWinRate * 100)}% (${stratTrades.length} trades).`);
        if (stratWinRate < 0.4) riskScore += 15;
        else if (stratWinRate > 0.6) riskScore -= 15;
      }
      if (selectedStrategy.riskParams.maxPositionSize && positionSize && parseFloat(positionSize) > selectedStrategy.riskParams.maxPositionSize) {
        reasons.push(`WARNING: Position size ($${positionSize}) exceeds max ($${selectedStrategy.riskParams.maxPositionSize}).`);
        riskScore += 20;
      }
    } else if (strategyName) {
      reasons.push('Strategy not found in playbook. Consider defining it first.');
      riskScore += 10;
    } else {
      reasons.push('No strategy selected. Trading without a plan increases risk.');
      riskScore += 15;
    }

    // Coin history
    if (coinTrades.length > 0) {
      const coinWinRate = coinTrades.filter(t => (t.actualPnLPercent ?? 0) > 0).length / coinTrades.length;
      const avgPnl = coinTrades.reduce((s, t) => s + (t.actualPnLPercent ?? 0), 0) / coinTrades.length;
      reasons.push(`Your ${coin} history: ${Math.round(coinWinRate * 100)}% win rate, avg ${avgPnl > 0 ? '+' : ''}${avgPnl.toFixed(1)}% P&L (${coinTrades.length} trades).`);
      if (coinWinRate < 0.3) riskScore += 10;
    } else if (coin) {
      reasons.push(`No previous trades for ${coin}. Exercise extra caution with new pairs.`);
      riskScore += 5;
    }

    // Emotional state
    if (currentEmotion === 'Revenge Trading') {
      reasons.push('DANGER: Revenge trading detected. This is one of the most destructive patterns.');
      riskScore += 30;
    } else if (currentEmotion === 'FOMO') {
      reasons.push('FOMO detected. Ensure this trade meets your criteria, not just urgency.');
      riskScore += 20;
    } else if (currentEmotion === 'Greedy') {
      reasons.push('Greed can lead to oversized positions. Stick to your risk parameters.');
      riskScore += 15;
    } else if (currentEmotion === 'Fearful') {
      reasons.push('Fear may cause premature exits. Trust your stop loss.');
      riskScore += 5;
    } else if (currentEmotion === 'Confident') {
      if (emotionTrades.length > 0) {
        const confWinRate = emotionTrades.filter(t => (t.actualPnLPercent ?? 0) > 0).length / emotionTrades.length;
        reasons.push(`When confident, your win rate is ${Math.round(confWinRate * 100)}%.`);
        if (confWinRate > 0.6) riskScore -= 10;
      }
    }

    // Recent performance context
    const last10 = closedTrades.slice(0, 10);
    if (last10.length >= 5) {
      const recentWinRate = last10.filter(t => (t.actualPnLPercent ?? 0) > 0).length / last10.length;
      const recentPnl = last10.reduce((s, t) => s + (t.actualPnL ?? 0), 0);
      reasons.push(`Recent performance (last ${last10.length}): ${Math.round(recentWinRate * 100)}% win rate, ${recentPnl >= 0 ? '+' : ''}$${recentPnl.toFixed(0)} P&L.`);
    }

    riskScore = Math.max(0, Math.min(100, riskScore));

    let recommendation: Recommendation;
    if (riskScore <= 40) recommendation = 'Proceed';
    else if (riskScore <= 65) recommendation = 'Caution';
    else recommendation = 'Skip';

    const historicalContext = closedTrades.length > 0
      ? `Based on ${closedTrades.length} historical trades analyzed.`
      : 'Limited historical data. Build more trade history for better analysis.';

    setAnalysis({ recommendation, reasons, riskScore, historicalContext });
  };

  const recIcons = {
    Proceed: <CheckCircle size={20} style={{ color: 'var(--green)' }} />,
    Caution: <AlertTriangle size={20} style={{ color: 'var(--amber)' }} />,
    Skip: <XCircle size={20} style={{ color: 'var(--red)' }} />,
  };

  const recColors = {
    Proceed: 'var(--green)',
    Caution: 'var(--amber)',
    Skip: 'var(--red)',
  };

  return (
    <div className="relative">
      <div className="phead pwrap">
        <p className="eyebrow">
          <Sparkles size={13} style={{ color: 'var(--amber)' }} /> Pre-trade assistant
        </p>
        <h2>What-If Scenarios</h2>
        <p className="sub">Analyze a planned trade against your live history before you execute it.</p>
      </div>

      <div className="card">
        <span className="accent" style={{ width: 56, background: 'var(--amber)' }} />
        <div className="cardhead">
          <div>
            <h3>Trade setup</h3>
            <p className="sub">Fill in what you&apos;re about to take — everything is scored against your journal.</p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 16, marginTop: 22 }}>
          <div className="field">
            <label>COIN / PAIR</label>
            <input className="box w-full" value={coin} onChange={e => setCoin(e.target.value)} placeholder="e.g., BTC/USDT" list="coin-list" />
            <datalist id="coin-list">
              {CRYPTO_SUGGESTIONS.map(c => <option key={c} value={c} />)}
            </datalist>
          </div>
          <div className="field">
            <label>ENTRY PRICE</label>
            <input className="box w-full" type="number" step="any" value={entryPrice} onChange={e => setEntryPrice(e.target.value)} placeholder="0.00" />
          </div>
          <div className="field">
            <label>POSITION SIZE ($)</label>
            <input className="box w-full" type="number" value={positionSize} onChange={e => setPositionSize(e.target.value)} placeholder="1000" />
          </div>
          <div className="field">
            <label>STRATEGY</label>
            <select className="box w-full" value={strategyName} onChange={e => setStrategyName(e.target.value)}>
              <option value="">Select strategy</option>
              {strategies.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
            </select>
          </div>
        </div>

        <div className="field" style={{ marginTop: 22 }}>
          <label>CURRENT EMOTIONAL STATE</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {EMOTION_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => setCurrentEmotion(opt.value as EmotionState)}
                className={currentEmotion === opt.value ? 'chip on' : 'chip'}
              >
                {opt.emoji} {opt.label}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={handleAnalyze}
          disabled={!coin}
          className="btn-a disabled:opacity-50"
          style={{ width: '100%', marginTop: 24 }}
        >
          <Sparkles size={16} /> Analyze Trade
        </button>
      </div>

      {/* Analysis Result */}
      {analysis && (
        <div className="card" style={{ marginTop: 20 }}>
          <span className="accent" style={{ width: 56, background: recColors[analysis.recommendation] }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
            {recIcons[analysis.recommendation]}
            <div style={{ minWidth: 0 }}>
              <h3 style={{ color: recColors[analysis.recommendation] }}>{analysis.recommendation}</h3>
              <p className="sub">{analysis.historicalContext}</p>
            </div>
            <div className="inset" style={{ marginLeft: 'auto', textAlign: 'right' }}>
              <p className="lbl">RISK SCORE</p>
              <div
                style={{
                  marginTop: 6,
                  fontFamily: 'var(--mono)',
                  fontWeight: 500,
                  fontSize: 24,
                  lineHeight: '30px',
                  color: analysis.riskScore <= 40 ? 'var(--green)' : analysis.riskScore <= 65 ? 'var(--amber)' : 'var(--red)',
                }}
              >
                {analysis.riskScore}/100
              </div>
            </div>
          </div>

          <div style={{ height: 2, marginTop: 18, background: 'var(--rail)', position: 'relative' }}>
            <div
              style={{
                position: 'absolute', left: 0, top: 0, bottom: 0,
                width: `${Math.min(100, Math.max(0, analysis.riskScore))}%`,
                background: recColors[analysis.recommendation],
              }}
            />
          </div>

          <div style={{ marginTop: 22, paddingTop: 18, borderTop: '1px solid var(--line)' }}>
            <p className="lbl b10">ANALYSIS</p>
            <div style={{ marginTop: 10 }}>
              {analysis.reasons.map((reason, i) => (
                <div key={i} className="mrow" style={{ alignItems: 'flex-start' }}>
                  <span className="ic" style={{ width: 10, color: 'var(--amber)' }}>&#x2022;</span>
                  <span className="lb" style={{ marginLeft: 12, lineHeight: '19px' }}>{reason}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
