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
    Proceed: <CheckCircle size={20} className="text-[var(--green)]" />,
    Caution: <AlertTriangle size={20} className="text-[var(--yellow)]" />,
    Skip: <XCircle size={20} className="text-[var(--red)]" />,
  };

  const recColors = {
    Proceed: 'border-green-500/30 bg-green-500/10',
    Caution: 'border-yellow-500/30 bg-yellow-500/10',
    Skip: 'border-red-500/30 bg-red-500/10',
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">What-If Scenarios</h2>
        <p className="text-sm text-[var(--muted-foreground)]">AI trade assistant — analyze planned trades before execution</p>
      </div>

      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 sm:p-6 space-y-4 sm:space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Coin / Pair</label>
            <input value={coin} onChange={e => setCoin(e.target.value)} placeholder="e.g., BTC/USDT" list="coin-list" />
            <datalist id="coin-list">
              {CRYPTO_SUGGESTIONS.map(c => <option key={c} value={c} />)}
            </datalist>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Entry Price</label>
            <input type="number" step="any" value={entryPrice} onChange={e => setEntryPrice(e.target.value)} placeholder="0.00" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Position Size ($)</label>
            <input type="number" value={positionSize} onChange={e => setPositionSize(e.target.value)} placeholder="1000" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Strategy</label>
            <select value={strategyName} onChange={e => setStrategyName(e.target.value)}>
              <option value="">Select strategy</option>
              {strategies.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Current Emotional State</label>
          <div className="flex flex-wrap gap-2">
            {EMOTION_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => setCurrentEmotion(opt.value as EmotionState)}
                className={`px-3 py-2 text-sm rounded-lg border transition-colors ${currentEmotion === opt.value ? 'border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]' : 'border-[var(--border)] text-[var(--muted-foreground)]'}`}
              >
                {opt.emoji} {opt.label}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={handleAnalyze}
          disabled={!coin}
          className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl font-medium transition-all disabled:opacity-50"
        >
          <Sparkles size={18} /> Analyze Trade
        </button>
      </div>

      {/* Analysis Result */}
      {analysis && (
        <div className={`border rounded-xl p-6 space-y-4 animate-in ${recColors[analysis.recommendation]}`}>
          <div className="flex items-center gap-3">
            {recIcons[analysis.recommendation]}
            <div>
              <h3 className="font-bold text-lg">{analysis.recommendation}</h3>
              <p className="text-xs text-[var(--muted-foreground)]">{analysis.historicalContext}</p>
            </div>
            <div className="ml-auto text-right">
              <div className="text-xs text-[var(--muted-foreground)]">Risk Score</div>
              <div className={`text-2xl font-bold ${analysis.riskScore <= 40 ? 'text-[var(--green)]' : analysis.riskScore <= 65 ? 'text-[var(--yellow)]' : 'text-[var(--red)]'}`}>
                {analysis.riskScore}/100
              </div>
            </div>
          </div>

          <div className="space-y-2 pt-3 border-t border-[var(--border)]/50">
            <h4 className="text-sm font-medium">Analysis</h4>
            {analysis.reasons.map((reason, i) => (
              <div key={i} className="flex items-start gap-2 text-sm">
                <span className="text-[var(--muted-foreground)] mt-0.5">&#x2022;</span>
                <span>{reason}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
