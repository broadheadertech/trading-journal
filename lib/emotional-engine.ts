import { Trade, EmotionState, CircuitBreakerResult, CircuitBreakerType } from './types';

const DANGEROUS_EMOTIONS: EmotionState[] = ['Revenge Trading', 'FOMO', 'Greedy', 'Frustrated', 'Anxious', 'Overconfident', 'Impatient'];
const HIGH_RISK_EMOTIONS: EmotionState[] = ['Revenge Trading', 'FOMO', 'Frustrated'];

export function checkConsecutiveLosses(trades: Trade[]): CircuitBreakerResult | null {
  const closed = trades
    .filter(t => !t.isOpen && t.actualPnLPercent !== null)
    .sort((a, b) => new Date(b.exitDate!).getTime() - new Date(a.exitDate!).getTime());

  let consecutiveLosses = 0;
  for (const t of closed) {
    if ((t.actualPnLPercent ?? 0) <= 0) consecutiveLosses++;
    else break;
  }

  if (consecutiveLosses >= 3) {
    return {
      type: 'consecutive-loss',
      severity: 'block',
      message: `You have ${consecutiveLosses} consecutive losses. Take a mandatory break to reset your mindset.`,
      cooldownMs: 60 * 60 * 1000, // 1 hour
    };
  }
  if (consecutiveLosses >= 2) {
    return {
      type: 'consecutive-loss',
      severity: 'block',
      message: `You have ${consecutiveLosses} consecutive losses. A cooldown period is required.`,
      cooldownMs: 30 * 60 * 1000, // 30 min
    };
  }
  return null;
}

export function checkOvertrading(trades: Trade[]): CircuitBreakerResult | null {
  const now = new Date();
  const last24h = trades.filter(t => {
    const created = new Date(t.createdAt);
    return now.getTime() - created.getTime() < 24 * 60 * 60 * 1000;
  });

  if (last24h.length >= 8) {
    return {
      type: 'overtrading',
      severity: 'block',
      message: `You've logged ${last24h.length} trades in the last 24 hours. This is overtrading.`,
      cooldownMs: 60 * 60 * 1000,
    };
  }
  if (last24h.length >= 5) {
    return {
      type: 'overtrading',
      severity: 'warning',
      message: `You've logged ${last24h.length} trades in the last 24 hours. Consider slowing down.`,
    };
  }
  return null;
}

export function checkRevengeTradingRisk(
  trades: Trade[],
  emotion: EmotionState,
  intensity: number
): CircuitBreakerResult | null {
  const closed = trades
    .filter(t => !t.isOpen && t.actualPnLPercent !== null)
    .sort((a, b) => new Date(b.exitDate!).getTime() - new Date(a.exitDate!).getTime());

  if (closed.length === 0) return null;

  const lastTrade = closed[0];
  const lastTradeTime = new Date(lastTrade.exitDate!).getTime();
  const now = Date.now();
  const timeSinceLast = now - lastTradeTime;
  const isRecentLoss = (lastTrade.actualPnLPercent ?? 0) <= 0 && timeSinceLast < 60 * 60 * 1000;

  if (isRecentLoss && (emotion === 'Revenge Trading' || (HIGH_RISK_EMOTIONS.includes(emotion) && intensity >= 7))) {
    return {
      type: 'revenge-trading',
      severity: 'block',
      message: 'Revenge trading detected: You had a recent loss and are in a high-risk emotional state.',
      cooldownMs: 60 * 60 * 1000,
    };
  }

  if (isRecentLoss && DANGEROUS_EMOTIONS.includes(emotion)) {
    return {
      type: 'revenge-trading',
      severity: 'warning',
      message: 'Caution: Your last trade was a loss less than an hour ago. Make sure this isn\'t revenge trading.',
    };
  }

  return null;
}

export function checkHighRiskCapital(capital: number, trades: Trade[]): CircuitBreakerResult | null {
  const closed = trades.filter(t => !t.isOpen && t.actualPnL !== null);
  if (closed.length < 3) return null;

  const totalCapitalUsed = closed.reduce((sum, t) => sum + t.capital, 0);
  const avgPosition = totalCapitalUsed / closed.length;
  const estimatedPortfolio = avgPosition * 20; // rough estimate

  const positionPercent = (capital / estimatedPortfolio) * 100;

  if (positionPercent > 10) {
    return {
      type: 'high-risk-capital',
      severity: 'block',
      message: `This position ($${capital}) is ~${Math.round(positionPercent)}% of your estimated portfolio. Maximum recommended: 5%.`,
      cooldownMs: 10 * 60 * 1000,
    };
  }
  if (positionPercent > 5) {
    return {
      type: 'high-risk-capital',
      severity: 'warning',
      message: `This position ($${capital}) is ~${Math.round(positionPercent)}% of your estimated portfolio. Consider reducing size.`,
    };
  }
  return null;
}

export function checkLateNightTrading(): CircuitBreakerResult | null {
  const hour = new Date().getHours();
  if (hour >= 22 || hour < 6) {
    return {
      type: 'late-night',
      severity: 'warning',
      message: `It's ${hour >= 22 ? hour + ':00' : hour + ':00 AM'}. Late-night trading leads to impulsive decisions and fatigue-driven errors.`,
    };
  }
  return null;
}

export function checkFOMORisk(emotion: EmotionState, intensity: number): CircuitBreakerResult | null {
  if (emotion === 'FOMO' && intensity >= 7) {
    return {
      type: 'fomo-detected',
      severity: 'block',
      message: 'High-intensity FOMO detected. The best trades come from patience, not urgency.',
      cooldownMs: 10 * 60 * 1000,
    };
  }
  if (emotion === 'FOMO') {
    return {
      type: 'fomo-detected',
      severity: 'warning',
      message: 'FOMO detected. Ask yourself: would you take this trade if the price hadn\'t already moved?',
    };
  }
  return null;
}

export function runAllCircuitBreakers(
  trades: Trade[],
  emotion: EmotionState,
  intensity: number,
  capital?: number
): CircuitBreakerResult[] {
  const results: CircuitBreakerResult[] = [];

  const consecutive = checkConsecutiveLosses(trades);
  if (consecutive) results.push(consecutive);

  const overtrading = checkOvertrading(trades);
  if (overtrading) results.push(overtrading);

  const revenge = checkRevengeTradingRisk(trades, emotion, intensity);
  if (revenge) results.push(revenge);

  if (capital) {
    const highRisk = checkHighRiskCapital(capital, trades);
    if (highRisk) results.push(highRisk);
  }

  const lateNight = checkLateNightTrading();
  if (lateNight) results.push(lateNight);

  const fomo = checkFOMORisk(emotion, intensity);
  if (fomo) results.push(fomo);

  return results;
}

export function getEmotionWarning(trades: Trade[], emotion: EmotionState): string | null {
  const closed = trades.filter(t => !t.isOpen && t.actualPnLPercent !== null);
  const emotionTrades = closed.filter(t => t.emotion === emotion);

  if (emotionTrades.length < 3) return null;

  const wins = emotionTrades.filter(t => (t.actualPnLPercent ?? 0) > 0).length;
  const winRate = Math.round((wins / emotionTrades.length) * 100);
  const avgPnl = emotionTrades.reduce((s, t) => s + (t.actualPnLPercent ?? 0), 0) / emotionTrades.length;

  if (winRate < 40) {
    return `When you trade while ${emotion.toUpperCase()}, your win rate drops to ${winRate}% (${emotionTrades.length} trades, avg ${avgPnl > 0 ? '+' : ''}${avgPnl.toFixed(1)}% P&L).`;
  }
  if (winRate >= 60) {
    return `You perform well when ${emotion}: ${winRate}% win rate across ${emotionTrades.length} trades.`;
  }
  return `Your ${emotion} trades show a ${winRate}% win rate (${emotionTrades.length} trades).`;
}

export function generateEmotionCoachAdvice(
  trades: Trade[],
  emotion: EmotionState,
  intensity: number,
  circuitBreakers: CircuitBreakerResult[]
): string {
  const parts: string[] = [];
  const closed = trades.filter(t => !t.isOpen && t.actualPnLPercent !== null);

  // Emotion assessment
  if (HIGH_RISK_EMOTIONS.includes(emotion)) {
    parts.push(`Your current emotional state (${emotion}) is associated with impulsive decision-making.`);
  } else if (emotion === 'Calm' || emotion === 'Neutral' || emotion === 'Confident') {
    parts.push(`Your emotional state (${emotion}) is generally favorable for trading decisions.`);
  } else {
    parts.push(`Your current state (${emotion}) requires awareness. Stay mindful of how it affects your decisions.`);
  }

  // Intensity assessment
  if (intensity >= 8) {
    parts.push(`Your emotional intensity is very high (${intensity}/10). Strong emotions cloud judgment. Consider waiting until intensity drops below 6.`);
  } else if (intensity >= 6) {
    parts.push(`Your emotional intensity is moderate-high (${intensity}/10). Proceed carefully and stick strictly to your plan.`);
  }

  // Historical context
  const emotionTrades = closed.filter(t => t.emotion === emotion);
  if (emotionTrades.length >= 3) {
    const wins = emotionTrades.filter(t => (t.actualPnLPercent ?? 0) > 0).length;
    const winRate = Math.round((wins / emotionTrades.length) * 100);
    parts.push(`Historically, your ${emotion} trades have a ${winRate}% win rate (${emotionTrades.length} trades).`);
  }

  // Recent performance
  const last5 = closed.slice(0, 5);
  if (last5.length >= 3) {
    const recentWins = last5.filter(t => (t.actualPnLPercent ?? 0) > 0).length;
    const recentWinRate = Math.round((recentWins / last5.length) * 100);
    if (recentWinRate < 40) {
      parts.push(`Your recent performance is struggling (${recentWinRate}% win rate last ${last5.length} trades). Consider reducing position size.`);
    }
  }

  // Circuit breaker context
  const blocks = circuitBreakers.filter(cb => cb.severity === 'block');
  const warnings = circuitBreakers.filter(cb => cb.severity === 'warning');
  if (blocks.length > 0) {
    parts.push(`CRITICAL: ${blocks.length} circuit breaker(s) triggered. A cooldown period is strongly recommended.`);
  } else if (warnings.length > 0) {
    parts.push(`${warnings.length} warning(s) active. Extra caution advised.`);
  }

  // Recommendation
  if (blocks.length > 0 || (HIGH_RISK_EMOTIONS.includes(emotion) && intensity >= 7)) {
    parts.push('\nRECOMMENDATION: SKIP this trade. Step away from the screen, take a walk, or do the breathing exercise.');
  } else if (warnings.length > 0 || intensity >= 6) {
    parts.push('\nRECOMMENDATION: PROCEED WITH CAUTION. Reduce position size by 50% and set tight stop losses.');
  } else {
    parts.push('\nRECOMMENDATION: You appear in a good state to trade. Ensure you follow your playbook rules.');
  }

  return parts.join(' ');
}

export function getReflectivePrompts(breakerType?: CircuitBreakerType): string[] {
  const general = [
    'What would happen if you didn\'t take this trade?',
    'Would your future self thank you for this trade?',
    'Is this trade part of your plan, or an impulse?',
    'What\'s the worst-case scenario, and can you accept it?',
    'Are you trading to make money, or to feel something?',
  ];

  const specific: Record<CircuitBreakerType, string[]> = {
    'consecutive-loss': [
      'Are you trying to make back money you lost?',
      'Losses are part of trading. Would adding another loss make things worse?',
      'What would a mentor say about trading right now?',
    ],
    'overtrading': [
      'Quality over quantity. Is this trade truly necessary?',
      'Are you addicted to the action, or trading with purpose?',
      'What would happen if you only took your BEST setups?',
    ],
    'revenge-trading': [
      'The market doesn\'t owe you anything. Are you trying to get revenge?',
      'This feeling will pass. Will the regret of a bad trade?',
      'Close your eyes. Take 10 deep breaths. Do you still want this trade?',
    ],
    'high-risk-capital': [
      'How would losing this amount affect your trading capital?',
      'Is the potential reward worth the risk to your account?',
      'Could you achieve similar exposure with a smaller position?',
    ],
    'late-night': [
      'Your decision-making is impaired by fatigue. Is this wise?',
      'The market will still be there tomorrow. Will your capital?',
      'Sleep on it. If it\'s still a good trade tomorrow, take it then.',
    ],
    'fomo-detected': [
      'The move already happened. Are you catching a falling knife?',
      'There will always be another opportunity. Patience is a superpower.',
      'Missing a trade costs $0. Entering a bad trade costs real money.',
    ],
  };

  if (breakerType && specific[breakerType]) {
    return [...specific[breakerType], ...general];
  }
  return general;
}

export function getCooldownDuration(breakerType: CircuitBreakerType): number {
  switch (breakerType) {
    case 'revenge-trading': return 60 * 60 * 1000; // 1 hour
    case 'consecutive-loss': return 30 * 60 * 1000; // 30 min
    case 'overtrading': return 60 * 60 * 1000; // 1 hour
    case 'high-risk-capital': return 10 * 60 * 1000; // 10 min
    case 'fomo-detected': return 10 * 60 * 1000; // 10 min
    case 'late-night': return 0; // warning only
    default: return 10 * 60 * 1000;
  }
}
