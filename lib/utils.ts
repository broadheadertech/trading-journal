import { Trade, Verdict, RuleCompliance, EmotionState, JournalEntry, DailyReflection, Direction, TimeRange } from './types';
import { format, startOfWeek, endOfWeek, isWithinInterval, parseISO, subDays, subMonths, subYears } from 'date-fns';

export function calculatePnL(
  entryPrice: number,
  exitPrice: number,
  capital: number,
  direction: Direction = 'long',
  leverage: number = 1
): { pnlPercent: number; pnlDollar: number } {
  const rawPercent = direction === 'short'
    ? ((entryPrice - exitPrice) / entryPrice) * 100
    : ((exitPrice - entryPrice) / entryPrice) * 100;
  const pnlPercent = rawPercent * (leverage > 0 ? leverage : 1);
  const pnlDollar = (pnlPercent / 100) * capital;
  return { pnlPercent: Math.round(pnlPercent * 100) / 100, pnlDollar: Math.round(pnlDollar * 100) / 100 };
}

export function generateVerdict(trade: Trade): Verdict {
  if (trade.isOpen || trade.exitPrice === null) return 'Well Executed';
  const isProfit = (trade.actualPnLPercent ?? 0) > 0;
  const followedRules = trade.rulesFollowed ?? true;

  if (followedRules && isProfit) return 'Well Executed';
  if (followedRules && !isProfit) return 'Good Discipline, Bad Luck';
  return 'Poorly Executed';
}

export function getVerdictColor(verdict: Verdict | null): string {
  switch (verdict) {
    case 'Well Executed': return 'bg-green-500/20 text-green-400 border-green-500/30';
    case 'Good Discipline, Bad Luck': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    case 'Poorly Executed': return 'bg-red-500/20 text-red-400 border-red-500/30';
    default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
  }
}

// ─── Currency support ─────────────────────────────────────────────────────────

export const SUPPORTED_CURRENCIES = [
  { code: 'USD', label: 'US Dollar', symbol: '$' },
  { code: 'EUR', label: 'Euro', symbol: '\u20AC' },
  { code: 'GBP', label: 'British Pound', symbol: '\u00A3' },
  { code: 'JPY', label: 'Japanese Yen', symbol: '\u00A5' },
  { code: 'PHP', label: 'Philippine Peso', symbol: '\u20B1' },
  { code: 'INR', label: 'Indian Rupee', symbol: '\u20B9' },
  { code: 'AUD', label: 'Australian Dollar', symbol: 'A$' },
  { code: 'CAD', label: 'Canadian Dollar', symbol: 'C$' },
  { code: 'CHF', label: 'Swiss Franc', symbol: 'CHF' },
  { code: 'SGD', label: 'Singapore Dollar', symbol: 'S$' },
  { code: 'KRW', label: 'Korean Won', symbol: '\u20A9' },
  { code: 'BRL', label: 'Brazilian Real', symbol: 'R$' },
  { code: 'MXN', label: 'Mexican Peso', symbol: 'MX$' },
  { code: 'ZAR', label: 'South African Rand', symbol: 'R' },
  { code: 'NZD', label: 'New Zealand Dollar', symbol: 'NZ$' },
];

const CURRENCY_LOCALES: Record<string, string> = {
  USD: 'en-US', EUR: 'de-DE', GBP: 'en-GB', JPY: 'ja-JP',
  PHP: 'en-PH', INR: 'en-IN', AUD: 'en-AU', CAD: 'en-CA',
  CHF: 'de-CH', SGD: 'en-SG', KRW: 'ko-KR', BRL: 'pt-BR',
  MXN: 'es-MX', ZAR: 'en-ZA', NZD: 'en-NZ', HKD: 'en-HK',
};

function getCurrencyLocale(code: string): string {
  return CURRENCY_LOCALES[code] ?? 'en-US';
}

/** Returns the cutoff Date for a given TimeRange, or null for 'ALL'. */
export function getTimeRangeCutoff(range: TimeRange): Date | null {
  const now = new Date();
  switch (range) {
    case '1D': return subDays(now, 1);
    case '1W': return subDays(now, 7);
    case '1M': return subMonths(now, 1);
    case '3M': return subMonths(now, 3);
    case '1Y': return subYears(now, 1);
    case 'ALL': return null;
  }
}

/** Filter trades by TimeRange. */
export function filterTradesByTimeRange(trades: Trade[], range: TimeRange): Trade[] {
  const cutoff = getTimeRangeCutoff(range);
  if (!cutoff) return trades;
  const cutoffStr = cutoff.toISOString();
  return trades.filter(t => t.entryDate >= cutoffStr);
}

export function formatCurrency(value: number, currencyCode: string = 'USD'): string {
  const sign = value >= 0 ? '+' : '';
  const formatted = new Intl.NumberFormat(getCurrencyLocale(currencyCode), {
    style: 'currency',
    currency: currencyCode,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(value));
  return `${sign}${value < 0 ? '-' : ''}${formatted}`;
}

export function formatPercent(value: number): string {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}

export function formatPrice(value: number, currencyCode: string = 'USD'): string {
  const locale = getCurrencyLocale(currencyCode);
  const opts = { style: 'currency' as const, currency: currencyCode };
  if (value >= 1000) {
    return new Intl.NumberFormat(locale, { ...opts, minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
  }
  if (value >= 1) {
    return new Intl.NumberFormat(locale, { ...opts, minimumFractionDigits: 4, maximumFractionDigits: 4 }).format(value);
  }
  return new Intl.NumberFormat(locale, { ...opts, minimumFractionDigits: 8, maximumFractionDigits: 8 }).format(value);
}

export function getWinRate(trades: Trade[]): number {
  const closed = trades.filter(t => !t.isOpen && t.actualPnLPercent !== null);
  if (closed.length === 0) return 0;
  const wins = closed.filter(t => (t.actualPnLPercent ?? 0) > 0).length;
  return Math.round((wins / closed.length) * 100);
}

export function getDirectionWinRates(trades: Trade[]): {
  long: { winRate: number; total: number };
  short: { winRate: number; total: number };
} {
  const closed = trades.filter(t => !t.isOpen && t.actualPnLPercent !== null);
  const longs = closed.filter(t => (t.direction ?? 'long') === 'long');
  const shorts = closed.filter(t => (t.direction ?? 'long') === 'short');
  const wr = (pool: Trade[]) => pool.length === 0 ? 0 : Math.round((pool.filter(t => (t.actualPnLPercent ?? 0) > 0).length / pool.length) * 100);
  return {
    long: { winRate: wr(longs), total: longs.length },
    short: { winRate: wr(shorts), total: shorts.length },
  };
}

export function getTotalPnL(trades: Trade[]): number {
  return trades
    .filter(t => !t.isOpen && t.actualPnL !== null)
    .reduce((sum, t) => sum + (t.actualPnL ?? 0), 0);
}

export function getCurrentStreak(trades: Trade[]): { type: 'win' | 'loss' | 'none'; count: number } {
  const closed = trades
    .filter(t => !t.isOpen && t.actualPnLPercent !== null)
    .sort((a, b) => new Date(b.exitDate!).getTime() - new Date(a.exitDate!).getTime());

  if (closed.length === 0) return { type: 'none', count: 0 };

  const firstIsWin = (closed[0].actualPnLPercent ?? 0) > 0;
  let count = 0;
  for (const trade of closed) {
    const isWin = (trade.actualPnLPercent ?? 0) > 0;
    if (isWin === firstIsWin) count++;
    else break;
  }
  return { type: firstIsWin ? 'win' : 'loss', count };
}

export function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

export function getEquityCurveData(trades: Trade[]): { date: string; pnl: number }[] {
  const closed = trades
    .filter(t => !t.isOpen && t.actualPnL !== null && t.exitDate !== null)
    .sort((a, b) => new Date(a.exitDate!).getTime() - new Date(b.exitDate!).getTime());

  let cumulative = 0;
  return closed.map(t => {
    cumulative = Math.round((cumulative + (t.actualPnL ?? 0)) * 100) / 100;
    return { date: format(new Date(t.exitDate!), 'MMM dd'), pnl: cumulative };
  });
}

export function getDrawdownStats(
  trades: Trade[],
  initialCapital: number = 0
): {
  currentDrawdown: number;
  maxDrawdown: number;
  peakBalance: number;
  currentBalance: number;
  drawdownCurveData: { date: string; balance: number; drawdown: number }[];
} {
  const closed = [...trades]
    .filter(t => !t.isOpen && t.actualPnL !== null && t.exitDate !== null)
    .sort((a, b) => new Date(a.exitDate!).getTime() - new Date(b.exitDate!).getTime());

  if (closed.length === 0) {
    return {
      currentDrawdown: 0, maxDrawdown: 0,
      peakBalance: initialCapital, currentBalance: initialCapital,
      drawdownCurveData: [],
    };
  }

  let balance = initialCapital;
  let peak = initialCapital;
  let maxDrawdown = 0;
  const drawdownCurveData: { date: string; balance: number; drawdown: number }[] = [];

  for (const t of closed) {
    balance = Math.round((balance + (t.actualPnL ?? 0)) * 100) / 100;
    if (balance > peak) peak = balance;
    const drawdown = peak > 0 ? Math.round(((peak - balance) / peak) * 10000) / 100 : 0;
    if (drawdown > maxDrawdown) maxDrawdown = drawdown;
    drawdownCurveData.push({ date: format(new Date(t.exitDate!), 'MMM dd'), balance, drawdown });
  }

  const currentDrawdown = drawdownCurveData[drawdownCurveData.length - 1].drawdown;

  return { currentDrawdown, maxDrawdown, peakBalance: peak, currentBalance: balance, drawdownCurveData };
}

export function getVerdictDistribution(
  trades: Trade[]
): { name: string; value: number; color: string }[] {
  const VERDICT_COLORS: Record<string, string> = {
    'Well Executed': '#2dd4bf',
    'Good Discipline, Bad Luck': '#eab308',
    'Poorly Executed': '#fb923c',
  };
  const counts: Record<string, number> = {
    'Well Executed': 0,
    'Good Discipline, Bad Luck': 0,
    'Poorly Executed': 0,
  };
  trades
    .filter(t => !t.isOpen && t.verdict != null)
    .forEach(t => {
      if (t.verdict && counts[t.verdict] !== undefined) counts[t.verdict]++;
    });
  return (Object.entries(counts) as [string, number][])
    .filter(([, count]) => count > 0)
    .map(([name, value]) => ({ name, value, color: VERDICT_COLORS[name] }));
}

export function getWinRateDelta(
  trades: Trade[]
): { current: number; delta: number | null } {
  const now = Date.now();
  const ms30 = 30 * 24 * 60 * 60 * 1000;
  const closed = trades.filter(t => !t.isOpen && t.actualPnLPercent !== null && t.exitDate !== null);

  const last30 = closed.filter(t => new Date(t.exitDate!).getTime() >= now - ms30);
  const prev30 = closed.filter(t => {
    const exit = new Date(t.exitDate!).getTime();
    return exit >= now - 2 * ms30 && exit < now - ms30;
  });

  const calcRate = (pool: Trade[]) => {
    if (pool.length === 0) return 0;
    return Math.round((pool.filter(t => (t.actualPnLPercent ?? 0) > 0).length / pool.length) * 100);
  };

  const current = calcRate(last30);
  const delta = prev30.length >= 3 ? current - calcRate(prev30) : null;
  return { current, delta };
}

export function getGoodDecisionRate(trades: Trade[]): number {
  const assessed = trades.filter(t => !t.isOpen && t.verdict != null);
  if (assessed.length === 0) return 0;
  const good = assessed.filter(
    t => t.verdict === 'Well Executed' || t.verdict === 'Good Discipline, Bad Luck'
  ).length;
  return Math.round((good / assessed.length) * 100);
}

export function generateDashboardInsights(trades: Trade[]): string[] {
  const closed = trades.filter(t => !t.isOpen && t.actualPnLPercent !== null);
  if (closed.length < 3) return [];

  const insights: string[] = [];

  // Best coin by win rate (min 3 trades on that coin)
  const coinMap = new Map<string, { wins: number; total: number }>();
  closed.forEach(t => {
    const prev = coinMap.get(t.coin) ?? { wins: 0, total: 0 };
    coinMap.set(t.coin, {
      wins: prev.wins + ((t.actualPnLPercent ?? 0) > 0 ? 1 : 0),
      total: prev.total + 1,
    });
  });
  const qualifyingCoins = Array.from(coinMap.entries())
    .filter(([, v]) => v.total >= 3)
    .sort((a, b) => b[1].wins / b[1].total - a[1].wins / a[1].total);
  if (qualifyingCoins.length >= 2) {
    const [bestCoin, bestData] = qualifyingCoins[0];
    const [worstCoin, worstData] = qualifyingCoins[qualifyingCoins.length - 1];
    const bestRate = Math.round((bestData.wins / bestData.total) * 100);
    const worstRate = Math.round((worstData.wins / worstData.total) * 100);
    const label = bestCoin.replace('/USDT', '');
    if (bestRate > worstRate) insights.push(`Your ${label} win rate (${bestRate}%) leads your tracked coins`);
    void worstCoin;
  } else if (qualifyingCoins.length === 1) {
    const [coin, data] = qualifyingCoins[0];
    const rate = Math.round((data.wins / data.total) * 100);
    insights.push(`Your ${coin.replace('/USDT', '')} win rate is ${rate}% across ${data.total} trades`);
  }

  // Best emotional state by avg P&L (min 3 trades with that emotion)
  const emotionMap = new Map<string, { sum: number; count: number }>();
  closed.forEach(t => {
    const prev = emotionMap.get(t.emotion) ?? { sum: 0, count: 0 };
    emotionMap.set(t.emotion, { sum: prev.sum + (t.actualPnLPercent ?? 0), count: prev.count + 1 });
  });
  const bestEmotion = Array.from(emotionMap.entries())
    .filter(([, v]) => v.count >= 3)
    .map(([emotion, v]) => ({ emotion, avg: v.sum / v.count }))
    .sort((a, b) => b.avg - a.avg)[0];
  if (bestEmotion) {
    const sign = bestEmotion.avg >= 0 ? '+' : '';
    insights.push(`Trading while ${bestEmotion.emotion} averages ${sign}${bestEmotion.avg.toFixed(1)}% per trade`);
  }

  // Win rate trend (only if |delta| >= 5)
  const { current, delta } = getWinRateDelta(trades);
  if (delta !== null && Math.abs(delta) >= 5) {
    const dir = delta > 0 ? 'up' : 'down';
    insights.push(`Win rate is ${dir} ${Math.abs(delta)}% vs last month (now ${current}%)`);
  }

  // Discipline observation (only if >= 8 of last 10 followed rules)
  const recent10 = [...closed]
    .sort((a, b) => new Date(b.exitDate!).getTime() - new Date(a.exitDate!).getTime())
    .slice(0, 10);
  const goodRecent = recent10.filter(
    t => t.verdict === 'Well Executed' || t.verdict === 'Good Discipline, Bad Luck'
  ).length;
  if (recent10.length >= 5 && goodRecent >= Math.ceil(recent10.length * 0.8)) {
    insights.push(`You made good decisions on ${goodRecent} of your last ${recent10.length} trades`);
  }

  // Best time-of-day pattern (only if 15%+ gap between buckets)
  const hourMap = new Map<string, { wins: number; total: number }>();
  closed.forEach(t => {
    if (!t.exitDate) return;
    const h = new Date(t.exitDate).getHours();
    const bucket = h < 12 ? 'morning' : h < 17 ? 'afternoon' : 'evening';
    const prev = hourMap.get(bucket) ?? { wins: 0, total: 0 };
    hourMap.set(bucket, { wins: prev.wins + ((t.actualPnLPercent ?? 0) > 0 ? 1 : 0), total: prev.total + 1 });
  });
  const timeBuckets = Array.from(hourMap.entries())
    .filter(([, v]) => v.total >= 3)
    .map(([label, v]) => ({ label, rate: Math.round((v.wins / v.total) * 100) }))
    .sort((a, b) => b.rate - a.rate);
  if (timeBuckets.length >= 2 && timeBuckets[0].rate - timeBuckets[timeBuckets.length - 1].rate >= 15) {
    insights.push(`Your ${timeBuckets[0].label} trades have the highest win rate (${timeBuckets[0].rate}%)`);
  }

  return insights.filter(s => s.length <= 82).slice(0, 5);
}

export function getCalendarData(trades: Trade[]): Map<string, number> {
  const map = new Map<string, number>();
  trades
    .filter(t => !t.isOpen && t.actualPnL !== null && t.exitDate)
    .forEach(t => {
      const key = format(new Date(t.exitDate!), 'yyyy-MM-dd');
      map.set(key, (map.get(key) ?? 0) + (t.actualPnL ?? 0));
    });
  return map;
}

// ── New brainstorming-session utilities ─────────────────────────────────────

// C-42: Discipline score — yes=1, partial=0.5, no=0, averaged across all rules
export function getDisciplineScore(trades: Trade[]): number {
  const closed = trades.filter(t => !t.isOpen && t.ruleChecklist.length > 0);
  if (closed.length === 0) return 0;
  let totalScore = 0;
  let totalRules = 0;
  closed.forEach(t => {
    t.ruleChecklist.forEach(r => {
      totalRules++;
      if (r.compliance === 'yes') totalScore += 1;
      else if (r.compliance === 'partial') totalScore += 0.5;
    });
  });
  return totalRules === 0 ? 0 : Math.round((totalScore / totalRules) * 100);
}

// A-11: Trades entered within 60 minutes after a losing trade — cooling-off violations
export function getCoolingOffPairs(trades: Trade[]): Trade[] {
  const closed = trades
    .filter(t => !t.isOpen && t.actualPnL !== null && t.exitDate)
    .sort((a, b) => new Date(a.exitDate!).getTime() - new Date(b.exitDate!).getTime());

  const violations: Trade[] = [];
  for (let i = 1; i < closed.length; i++) {
    const prev = closed[i - 1];
    const curr = closed[i];
    if ((prev.actualPnL ?? 0) < 0) {
      const gapMs = new Date(curr.exitDate!).getTime() - new Date(prev.exitDate!).getTime();
      if (gapMs > 0 && gapMs <= 60 * 60 * 1000) {
        violations.push(curr);
      }
    }
  }
  return violations;
}

// A-9: Last N closed trades with the same coin
export function getSimilarTrades(trades: Trade[], coin: string, limit = 3): Trade[] {
  return trades
    .filter(t => !t.isOpen && t.coin === coin && t.actualPnL !== null && t.exitDate)
    .sort((a, b) => new Date(b.exitDate!).getTime() - new Date(a.exitDate!).getTime())
    .slice(0, limit);
}

// C-24: Cross-reference emotion × rule compliance
// Returns: { emotion: { ruleName: complianceRate(0-100) } }
export function getEmotionalRuleMap(trades: Trade[]): Record<string, Record<string, number>> {
  const closed = trades.filter(t => !t.isOpen && t.ruleChecklist.length > 0);
  // Accumulate: emotion → rule → { yes, total }
  const acc: Record<string, Record<string, { yes: number; total: number }>> = {};
  closed.forEach(t => {
    const em = t.emotion as string;
    if (!acc[em]) acc[em] = {};
    t.ruleChecklist.forEach(r => {
      if (!acc[em][r.rule]) acc[em][r.rule] = { yes: 0, total: 0 };
      acc[em][r.rule].total++;
      if (r.compliance === 'yes') acc[em][r.rule].yes++;
      else if (r.compliance === 'partial') acc[em][r.rule].yes += 0.5;
    });
  });
  // Convert to percentages, only include emotion+rule combos with ≥3 data points
  const result: Record<string, Record<string, number>> = {};
  Object.entries(acc).forEach(([em, rules]) => {
    const validRules: Record<string, number> = {};
    Object.entries(rules).forEach(([rule, { yes, total }]) => {
      if (total >= 3) validRules[rule] = Math.round((yes / total) * 100);
    });
    if (Object.keys(validRules).length > 0) result[em] = validRules;
  });
  return result;
}

// C-27: R-multiple = actualPnL / (capital × riskPercent)
// riskPercent derived from stopLoss: |(entryPrice - stopLoss) / entryPrice|
export function getRMultiple(trade: Trade): number | null {
  if (trade.isOpen || trade.actualPnL === null || !trade.stopLoss) return null;
  const riskPercent = Math.abs((trade.entryPrice - trade.stopLoss) / trade.entryPrice);
  if (riskPercent === 0) return null;
  const riskDollar = trade.capital * riskPercent;
  if (riskDollar === 0) return null;
  return Math.round((trade.actualPnL / riskDollar) * 10) / 10;
}

// C-29 + C-21: Confidence calibration — overall + setup vs execution breakdown
export function getConfidenceCalibration(trades: Trade[]): {
  winAvg: number;
  lossAvg: number;
  setupWinAvg: number;
  setupLossAvg: number;
  execWinAvg: number;
  execLossAvg: number;
  label: 'calibrated' | 'overconfident' | 'underconfident';
} {
  const closed = trades.filter(t => !t.isOpen && t.actualPnL !== null && t.confidence > 0);
  const wins = closed.filter(t => (t.actualPnL ?? 0) > 0);
  const losses = closed.filter(t => (t.actualPnL ?? 0) < 0);
  const avg = (pool: Trade[], field: keyof Trade) =>
    pool.length === 0
      ? 0
      : Math.round((pool.reduce((s, t) => s + ((t[field] as number) || t.confidence), 0) / pool.length) * 10) / 10;
  const winAvg = avg(wins, 'confidence');
  const lossAvg = avg(losses, 'confidence');
  const setupWinAvg = avg(wins, 'setupConfidence');
  const setupLossAvg = avg(losses, 'setupConfidence');
  const execWinAvg = avg(wins, 'executionConfidence');
  const execLossAvg = avg(losses, 'executionConfidence');
  // Overconfident = high confidence on trades that turned out to be losses
  let label: 'calibrated' | 'overconfident' | 'underconfident';
  if (lossAvg > winAvg + 1) label = 'overconfident';
  else if (winAvg > lossAvg + 1) label = 'calibrated';
  else label = 'calibrated';
  return { winAvg, lossAvg, setupWinAvg, setupLossAvg, execWinAvg, execLossAvg, label };
}

// C-33: Best emotion + best coin by win rate (min 3 trades)
export function getEdgeProfile(trades: Trade[]): {
  bestEmotion: string;
  bestEmotionWR: number;
  bestEmotionCount: number;
  bestCoin: string;
  bestCoinWR: number;
  bestCoinCount: number;
} {
  const closed = trades.filter(t => !t.isOpen && t.actualPnL !== null);

  // Emotion win rate
  const emotionMap = new Map<string, { wins: number; total: number }>();
  closed.forEach(t => {
    const prev = emotionMap.get(t.emotion) ?? { wins: 0, total: 0 };
    emotionMap.set(t.emotion, { wins: prev.wins + ((t.actualPnL ?? 0) > 0 ? 1 : 0), total: prev.total + 1 });
  });
  const bestEmotionEntry = Array.from(emotionMap.entries())
    .filter(([, v]) => v.total >= 3)
    .sort((a, b) => b[1].wins / b[1].total - a[1].wins / a[1].total)[0];

  // Coin win rate
  const coinMap = new Map<string, { wins: number; total: number }>();
  closed.forEach(t => {
    const prev = coinMap.get(t.coin) ?? { wins: 0, total: 0 };
    coinMap.set(t.coin, { wins: prev.wins + ((t.actualPnL ?? 0) > 0 ? 1 : 0), total: prev.total + 1 });
  });
  const bestCoinEntry = Array.from(coinMap.entries())
    .filter(([, v]) => v.total >= 3)
    .sort((a, b) => b[1].wins / b[1].total - a[1].wins / a[1].total)[0];

  return {
    bestEmotion: bestEmotionEntry?.[0] ?? '',
    bestEmotionWR: bestEmotionEntry ? Math.round((bestEmotionEntry[1].wins / bestEmotionEntry[1].total) * 100) : 0,
    bestEmotionCount: bestEmotionEntry?.[1].total ?? 0,
    bestCoin: bestCoinEntry?.[0] ?? '',
    bestCoinWR: bestCoinEntry ? Math.round((bestCoinEntry[1].wins / bestCoinEntry[1].total) * 100) : 0,
    bestCoinCount: bestCoinEntry?.[1].total ?? 0,
  };
}

// C-41: Generate data-driven weekly review questions from the trader's own data
export function getWeeklyDataQuestions(trades: Trade[], weekStart: string): {
  summary: {
    total: number;
    wins: number;
    losses: number;
    topBrokenRule: string | null;
    topEmotion: string | null;
    avgConfidenceOnLoss: number | null;
  };
  questions: { field: 'emotionalMistakes' | 'patternsNoticed' | 'improvementPlan'; prompt: string }[];
} {
  const start = parseISO(weekStart);
  const end = endOfWeek(start, { weekStartsOn: 1 });
  const weekTrades = trades.filter(t => {
    if (!t.exitDate || t.isOpen) return false;
    return isWithinInterval(parseISO(t.exitDate), { start, end });
  });

  const wins = weekTrades.filter(t => (t.actualPnL ?? 0) > 0).length;
  const losses = weekTrades.filter(t => (t.actualPnL ?? 0) < 0).length;

  // Top broken rule
  const ruleBreakCount: Record<string, number> = {};
  weekTrades.forEach(t => {
    t.ruleChecklist.filter(r => r.compliance === 'no').forEach(r => {
      ruleBreakCount[r.rule] = (ruleBreakCount[r.rule] ?? 0) + 1;
    });
  });
  const topBrokenRule = Object.entries(ruleBreakCount).sort((a, b) => b[1] - a[1])[0] ?? null;

  // Top emotion
  const emotionCount: Record<string, number> = {};
  weekTrades.forEach(t => { emotionCount[t.emotion] = (emotionCount[t.emotion] ?? 0) + 1; });
  const topEmotionEntry = Object.entries(emotionCount).sort((a, b) => b[1] - a[1])[0] ?? null;

  // Avg confidence on losses
  const lossesWithConf = weekTrades.filter(t => (t.actualPnL ?? 0) < 0 && t.confidence > 0);
  const avgConfidenceOnLoss = lossesWithConf.length > 0
    ? Math.round((lossesWithConf.reduce((s, t) => s + t.confidence, 0) / lossesWithConf.length) * 10) / 10
    : null;

  // Generate targeted prompts
  const questions: { field: 'emotionalMistakes' | 'patternsNoticed' | 'improvementPlan'; prompt: string }[] = [];

  if (topEmotionEntry && topEmotionEntry[1] >= 2) {
    questions.push({
      field: 'emotionalMistakes',
      prompt: `You traded ${topEmotionEntry[0]} in ${topEmotionEntry[1]} trades this week — how did it affect your execution?`,
    });
  } else {
    questions.push({ field: 'emotionalMistakes', prompt: 'What emotional patterns showed up in your trading this week?' });
  }

  if (topBrokenRule && topBrokenRule[1] >= 2) {
    questions.push({
      field: 'patternsNoticed',
      prompt: `"${topBrokenRule[0]}" was broken ${topBrokenRule[1]} times — what triggered it?`,
    });
  } else if (topBrokenRule) {
    questions.push({ field: 'patternsNoticed', prompt: `You broke "${topBrokenRule[0]}" — what was different about that trade?` });
  } else {
    questions.push({ field: 'patternsNoticed', prompt: 'What patterns did you notice in your setups or entries this week?' });
  }

  if (avgConfidenceOnLoss !== null && avgConfidenceOnLoss >= 7) {
    questions.push({
      field: 'improvementPlan',
      prompt: `You rated your confidence ${avgConfidenceOnLoss}/10 on losing trades — what will you change in your plan review before entering?`,
    });
  } else {
    questions.push({ field: 'improvementPlan', prompt: 'What one specific change will you make next week to improve discipline?' });
  }

  return {
    summary: {
      total: weekTrades.length,
      wins,
      losses,
      topBrokenRule: topBrokenRule ? `${topBrokenRule[0]} (×${topBrokenRule[1]})` : null,
      topEmotion: topEmotionEntry ? `${topEmotionEntry[0]} (${topEmotionEntry[1]} trades)` : null,
      avgConfidenceOnLoss,
    },
    questions,
  };
}

// A-13: Trade Duration Discipline Score

export function getTradeDuration(trade: Trade): number | null {
  if (!trade.entryDate || !trade.exitDate) return null;
  const ms = new Date(trade.exitDate).getTime() - new Date(trade.entryDate).getTime();
  return ms > 0 ? ms / 60000 : null; // minutes
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${Math.round(minutes)}m`;
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h < 24) return m > 0 ? `${h}h ${m}m` : `${h}h`;
  const d = Math.floor(h / 24);
  const rh = h % 24;
  return rh > 0 ? `${d}d ${rh}h` : `${d}d`;
}

export function getDurationStats(trades: Trade[]): {
  byStrategy: { strategy: string; avgMinutes: number; medianMinutes: number; count: number }[];
  outliers: { trade: Trade; durationMinutes: number; avgMinutes: number; ratio: number; type: 'cut-short' | 'held-long'; strategy: string }[];
} {
  const closed = trades.filter(t => !t.isOpen && t.entryDate && t.exitDate && t.actualPnL !== null);

  // Group by strategy
  const stratMap: Record<string, { durs: number[]; trades: Trade[] }> = {};
  closed.forEach(t => {
    const dur = getTradeDuration(t);
    if (dur === null) return;
    const strat = t.strategy || 'No Strategy';
    if (!stratMap[strat]) stratMap[strat] = { durs: [], trades: [] };
    stratMap[strat].durs.push(dur);
    stratMap[strat].trades.push(t);
  });

  // Need ≥3 trades per strategy for a meaningful baseline
  const byStrategy = Object.entries(stratMap)
    .filter(([, { durs }]) => durs.length >= 3)
    .map(([strategy, { durs }]) => {
      const sorted = [...durs].sort((a, b) => a - b);
      const avg = durs.reduce((s, d) => s + d, 0) / durs.length;
      const median = sorted[Math.floor(sorted.length / 2)];
      return { strategy, avgMinutes: Math.round(avg), medianMinutes: Math.round(median), count: durs.length };
    })
    .sort((a, b) => b.count - a.count);

  // Outliers: <40% of avg = cut-short (fear exit), >250% = held-long (hope hold)
  const outliers: { trade: Trade; durationMinutes: number; avgMinutes: number; ratio: number; type: 'cut-short' | 'held-long'; strategy: string }[] = [];
  byStrategy.forEach(({ strategy, avgMinutes }) => {
    stratMap[strategy].trades.forEach(t => {
      const dur = getTradeDuration(t);
      if (dur === null) return;
      const ratio = dur / avgMinutes;
      if (ratio < 0.4) {
        outliers.push({ trade: t, durationMinutes: dur, avgMinutes, ratio, type: 'cut-short', strategy });
      } else if (ratio > 2.5) {
        outliers.push({ trade: t, durationMinutes: dur, avgMinutes, ratio, type: 'held-long', strategy });
      }
    });
  });

  // Most recent first
  outliers.sort((a, b) => new Date(b.trade.exitDate!).getTime() - new Date(a.trade.exitDate!).getTime());

  return { byStrategy, outliers };
}

export const CRYPTO_SUGGESTIONS = [
  'BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'BNB/USDT', 'XRP/USDT',
  'ADA/USDT', 'DOGE/USDT', 'AVAX/USDT', 'DOT/USDT', 'MATIC/USDT',
  'LINK/USDT', 'UNI/USDT', 'ATOM/USDT', 'LTC/USDT', 'FIL/USDT',
  'NEAR/USDT', 'APT/USDT', 'ARB/USDT', 'OP/USDT', 'SUI/USDT',
  'SEI/USDT', 'INJ/USDT', 'TIA/USDT', 'JUP/USDT', 'WIF/USDT',
  'PEPE/USDT', 'BONK/USDT', 'RENDER/USDT', 'FET/USDT', 'TAO/USDT',
];

export const STOCK_SUGGESTIONS = [
  // Mega-cap tech
  'AAPL', 'MSFT', 'NVDA', 'GOOGL', 'GOOG', 'AMZN', 'META', 'TSLA', 'AVGO', 'ORCL',
  // Finance
  'JPM', 'BAC', 'WFC', 'GS', 'MS', 'V', 'MA', 'AXP', 'BRK.B', 'C',
  // Healthcare
  'JNJ', 'UNH', 'LLY', 'PFE', 'ABBV', 'MRK', 'TMO', 'ABT', 'DHR', 'BMY',
  // Consumer / Retail
  'WMT', 'COST', 'HD', 'MCD', 'NKE', 'SBUX', 'TGT', 'LOW', 'TJX', 'AMGN',
  // Energy
  'XOM', 'CVX', 'COP', 'EOG', 'SLB', 'OXY', 'PSX', 'VLO', 'MPC', 'PXD',
  // Semiconductors
  'AMD', 'INTC', 'QCOM', 'MU', 'AMAT', 'LRCX', 'KLAC', 'MRVL', 'ON', 'TXN',
  // ETFs & Indices
  'SPY', 'QQQ', 'IWM', 'DIA', 'VOO', 'VTI', 'GLD', 'SLV', 'TLT', 'HYG',
  // Other popular
  'NFLX', 'DIS', 'PYPL', 'CRM', 'NOW', 'SHOP', 'UBER', 'LYFT', 'COIN', 'PLTR',
];

export const FOREX_SUGGESTIONS = [
  // Majors
  'EUR/USD', 'GBP/USD', 'USD/JPY', 'USD/CHF', 'AUD/USD', 'USD/CAD', 'NZD/USD',
  // Crosses
  'EUR/GBP', 'EUR/JPY', 'GBP/JPY', 'EUR/CHF', 'GBP/CHF', 'AUD/JPY', 'CAD/JPY',
  // Exotics
  'USD/SGD', 'USD/HKD', 'USD/MXN', 'USD/ZAR', 'USD/TRY', 'USD/NOK', 'USD/SEK',
  // Metals (spot)
  'XAU/USD', 'XAG/USD',
];

export const EMOTION_OPTIONS: { value: string; label: string; emoji: string }[] = [
  { value: 'Confident', label: 'Confident', emoji: '💪' },
  { value: 'Fearful', label: 'Fearful', emoji: '😰' },
  { value: 'FOMO', label: 'FOMO', emoji: '🏃' },
  { value: 'Greedy', label: 'Greedy', emoji: '🤑' },
  { value: 'Neutral', label: 'Neutral', emoji: '😐' },
  { value: 'Revenge Trading', label: 'Revenge Trading', emoji: '😤' },
  { value: 'Anxious', label: 'Anxious', emoji: '😟' },
  { value: 'Excited', label: 'Excited', emoji: '🤩' },
  { value: 'Frustrated', label: 'Frustrated', emoji: '😣' },
  { value: 'Calm', label: 'Calm', emoji: '🧘' },
  { value: 'Impatient', label: 'Impatient', emoji: '⏰' },
  { value: 'Overconfident', label: 'Overconfident', emoji: '👑' },
];

export const TAG_OPTIONS: { value: string; label: string }[] = [
  { value: 'scalp', label: 'Scalp' },
  { value: 'swing', label: 'Swing' },
  { value: 'breakout', label: 'Breakout' },
  { value: 'dip-buy', label: 'Dip Buy' },
  { value: 'momentum', label: 'Momentum' },
  { value: 'reversal', label: 'Reversal' },
  { value: 'news-play', label: 'News Play' },
  { value: 'range-trade', label: 'Range Trade' },
];

export const STRATEGY_TYPES: { value: string; label: string }[] = [
  { value: 'scalping', label: 'Scalping' },
  { value: 'swing', label: 'Swing Trading' },
  { value: 'breakout', label: 'Breakout' },
  { value: 'trend-following', label: 'Trend Following' },
  { value: 'mean-reversion', label: 'Mean Reversion' },
  { value: 'momentum', label: 'Momentum' },
  { value: 'arbitrage', label: 'Arbitrage' },
  { value: 'other', label: 'Other' },
];

// ─── AI Coach Utility Functions ───────────────────────────────────────────────

/** Counts consecutive most-recent days where ALL rules were followed (no 'no' compliance). */
export function getDisciplineStreak(trades: Trade[]): { count: number } {
  const closed = trades.filter(t => !t.isOpen && t.ruleChecklist.length > 0);
  if (closed.length === 0) return { count: 0 };
  const byDay = new Map<string, boolean>();
  closed.forEach(t => {
    if (!t.exitDate) return;
    const day = t.exitDate.slice(0, 10);
    const fullCompliance = !t.ruleChecklist.some(r => r.compliance === 'no');
    if (!byDay.has(day)) byDay.set(day, fullCompliance);
    else if (!fullCompliance) byDay.set(day, false);
  });
  const days = [...byDay.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  let count = 0;
  for (const [, ok] of days) {
    if (ok) count++;
    else break;
  }
  return { count };
}

/** Per-rule compliance counts for trades closed in the last 7 days, sorted by most broken first. */
export function getWeeklyRuleReport(trades: Trade[]): { rule: string; followed: number; partial: number; broken: number; total: number }[] {
  const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const recent = trades.filter(t =>
    !t.isOpen && t.exitDate && new Date(t.exitDate).getTime() >= cutoff && t.ruleChecklist.length > 0
  );
  const ruleMap = new Map<string, { followed: number; partial: number; broken: number }>();
  recent.forEach(t => {
    t.ruleChecklist.forEach(({ rule, compliance }) => {
      const prev = ruleMap.get(rule) ?? { followed: 0, partial: 0, broken: 0 };
      ruleMap.set(rule, {
        followed: prev.followed + (compliance === 'yes' ? 1 : 0),
        partial: prev.partial + (compliance === 'partial' ? 1 : 0),
        broken: prev.broken + (compliance === 'no' ? 1 : 0),
      });
    });
  });
  return [...ruleMap.entries()]
    .map(([rule, v]) => ({ rule, ...v, total: v.followed + v.partial + v.broken }))
    .sort((a, b) => b.broken - a.broken);
}

/** The single most-broken rule from the past 7 days, or null if none broken. */
export function getWeeklyFocusInsight(trades: Trade[]): { rule: string; breakCount: number; tradeCount: number } | null {
  const report = getWeeklyRuleReport(trades);
  if (report.length === 0) return null;
  const top = report[0];
  if (top.broken === 0) return null;
  return { rule: top.rule, breakCount: top.broken, tradeCount: top.total };
}

/** One-sentence warm opening message based on the most recent session's outcome. */
export function getWarmOpeningMessage(trades: Trade[]): string {
  const closed = trades
    .filter(t => !t.isOpen && t.exitDate)
    .sort((a, b) => new Date(b.exitDate!).getTime() - new Date(a.exitDate!).getTime());
  if (closed.length === 0) return 'Welcome. Start logging trades to unlock your AI coaching insights.';
  const lastDay = closed[0].exitDate!.slice(0, 10);
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  if (lastDay !== today && lastDay !== yesterday) return 'Welcome back.';
  const lastDayTrades = closed.filter(t => t.exitDate!.slice(0, 10) === lastDay);
  const allFollowed = lastDayTrades.every(t => !t.ruleChecklist.some(r => r.compliance === 'no'));
  const totalPnL = lastDayTrades.reduce((s, t) => s + (t.actualPnL ?? 0), 0);
  if (allFollowed && totalPnL > 0) return 'Good session yesterday. You followed every rule and came out ahead.';
  if (allFollowed && totalPnL <= 0) return 'Yesterday was disciplined. You followed your rules — the result was tough, but the process was right.';
  if (!allFollowed && totalPnL > 0) return 'Yesterday was profitable, but some rules were broken — profits can mask patterns worth reviewing.';
  return 'Yesterday was tough. Today is a fresh slate.';
}

// ─── Tier 2 AI Coach Utilities ────────────────────────────────────────────────

/** Q-3: Counts how many days in the past `windowDays` the user hit their daily loss limit. */
export function getMultiDayBreaches(
  trades: Trade[],
  dailyLossLimit: number,
  windowDays = 7
): { breachCount: number; windowDays: number } | null {
  if (!dailyLossLimit || dailyLossLimit <= 0) return null;
  const cutoff = Date.now() - windowDays * 24 * 60 * 60 * 1000;
  const byDay = new Map<string, number>();
  trades
    .filter(t => !t.isOpen && t.exitDate && new Date(t.exitDate).getTime() >= cutoff && t.actualPnL !== null)
    .forEach(t => {
      const day = t.exitDate!.slice(0, 10);
      byDay.set(day, (byDay.get(day) ?? 0) + (t.actualPnL ?? 0));
    });
  const breachCount = [...byDay.values()].filter(pnl => pnl < -dailyLossLimit).length;
  if (breachCount === 0) return null;
  return { breachCount, windowDays };
}

/** Q-9: Finds the single worst emotion+rule break correlation (≥3 samples, ≥50% break rate). */
export function getEmotionRuleBreakInsight(trades: Trade[]): {
  emotion: string;
  rule: string;
  breakCount: number;
  sampleCount: number;
} | null {
  const closed = trades.filter(t => !t.isOpen && t.ruleChecklist.length > 0);
  const acc: Record<string, Record<string, { broken: number; total: number }>> = {};
  closed.forEach(t => {
    const em = t.emotion as string;
    if (!acc[em]) acc[em] = {};
    t.ruleChecklist.forEach(r => {
      if (!acc[em][r.rule]) acc[em][r.rule] = { broken: 0, total: 0 };
      acc[em][r.rule].total++;
      if (r.compliance === 'no') acc[em][r.rule].broken++;
    });
  });
  let worst: { emotion: string; rule: string; breakCount: number; sampleCount: number } | null = null;
  Object.entries(acc).forEach(([emotion, rules]) => {
    Object.entries(rules).forEach(([rule, { broken, total }]) => {
      if (total < 3) return;
      if (broken / total < 0.5) return;
      if (!worst || broken > worst.breakCount) {
        worst = { emotion, rule, breakCount: broken, sampleCount: total };
      }
    });
  });
  return worst;
}

/** Q-12/13: Classifies the current win streak as earned (discipline) or lucky, based on rule compliance. */
export function getLuckyVsDisciplineStreak(trades: Trade[]): {
  type: 'discipline' | 'lucky';
  count: number;
  compliancePct: number;
} | null {
  const closed = trades
    .filter(t => !t.isOpen && t.actualPnLPercent !== null && t.exitDate)
    .sort((a, b) => new Date(b.exitDate!).getTime() - new Date(a.exitDate!).getTime());
  if (closed.length === 0) return null;
  if ((closed[0].actualPnLPercent ?? 0) <= 0) return null;
  const streakTrades: Trade[] = [];
  for (const t of closed) {
    if ((t.actualPnLPercent ?? 0) > 0) streakTrades.push(t);
    else break;
  }
  if (streakTrades.length < 2) return null;
  const withRules = streakTrades.filter(t => t.ruleChecklist.length > 0);
  if (withRules.length === 0) return null;
  let yesScore = 0, totalRules = 0;
  withRules.forEach(t => {
    t.ruleChecklist.forEach(r => {
      totalRules++;
      if (r.compliance === 'yes') yesScore += 1;
      else if (r.compliance === 'partial') yesScore += 0.5;
    });
  });
  const compliancePct = totalRules === 0 ? 0 : Math.round((yesScore / totalRules) * 100);
  return {
    type: compliancePct >= 80 ? 'discipline' : 'lucky',
    count: streakTrades.length,
    compliancePct,
  };
}

/** Q-14: Returns best and worst coins by win rate (min 3 trades each, gap >10%). */
export function getCoinWinRateInsights(trades: Trade[]): {
  best: { coin: string; winRate: number; total: number } | null;
  worst: { coin: string; winRate: number; total: number } | null;
} {
  const closed = trades.filter(t => !t.isOpen && t.actualPnLPercent !== null);
  const coinMap = new Map<string, { wins: number; total: number }>();
  closed.forEach(t => {
    const prev = coinMap.get(t.coin) ?? { wins: 0, total: 0 };
    coinMap.set(t.coin, {
      wins: prev.wins + ((t.actualPnLPercent ?? 0) > 0 ? 1 : 0),
      total: prev.total + 1,
    });
  });
  const qualifying = Array.from(coinMap.entries())
    .filter(([, v]) => v.total >= 3)
    .map(([coin, v]) => ({
      coin: coin.replace('/USDT', '').replace('/USD', ''),
      winRate: Math.round((v.wins / v.total) * 100),
      total: v.total,
    }))
    .sort((a, b) => b.winRate - a.winRate);
  if (qualifying.length < 2) return { best: null, worst: null };
  const best = qualifying[0];
  const worst = qualifying[qualifying.length - 1];
  if (best.winRate - worst.winRate <= 10) return { best: null, worst: null };
  return { best, worst };
}

/** Q-4: Returns a process reinforcement badge when the most recent session was a disciplined loss. */
export function getProcessReinforcementBadge(trades: Trade[]): {
  sessionDate: string;
  tradeCount: number;
} | null {
  const closed = trades
    .filter(t => !t.isOpen && t.exitDate)
    .sort((a, b) => new Date(b.exitDate!).getTime() - new Date(a.exitDate!).getTime());
  if (closed.length === 0) return null;
  const lastDay = closed[0].exitDate!.slice(0, 10);
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  if (lastDay !== today && lastDay !== yesterday) return null;
  const sessionTrades = closed.filter(
    t => t.exitDate!.slice(0, 10) === lastDay && t.ruleChecklist.length > 0
  );
  if (sessionTrades.length === 0) return null;
  const netPnL = sessionTrades.reduce((s, t) => s + (t.actualPnL ?? 0), 0);
  if (netPnL > 0) return null; // Win + 100% compliance is already praised by warm opening
  const allCompliant = sessionTrades.every(t => !t.ruleChecklist.some(r => r.compliance === 'no'));
  if (!allCompliant) return null;
  return { sessionDate: lastDay, tradeCount: sessionTrades.length };
}

/** Q-17: Surfaces the trader's own past written reflections at key moments (losing streak or FOMO/Revenge). */
export function findRelevantReflection(
  trades: Trade[],
  journalEntries: JournalEntry[],
  dailyReflections: DailyReflection[]
): { date: string; text: string; source: string } | null {
  const closed = trades
    .filter(t => !t.isOpen && t.exitDate)
    .sort((a, b) => new Date(b.exitDate!).getTime() - new Date(a.exitDate!).getTime());
  if (closed.length === 0) return null;
  const today = new Date().toISOString().slice(0, 10);

  // Case 1: Losing streak of 2+
  let lossStreak = 0;
  for (const t of closed) {
    if ((t.actualPnL ?? 0) < 0) lossStreak++;
    else break;
  }
  if (lossStreak >= 2) {
    const candidates: { date: string; text: string; source: string }[] = [];
    closed.forEach(t => {
      if (t.exitDate!.slice(0, 10) >= today) return;
      if ((t.actualPnL ?? 0) < 0) {
        if (t.lessonNotes?.trim()) candidates.push({ date: t.exitDate!.slice(0, 10), text: t.lessonNotes, source: 'trade lesson' });
        if (t.oneThingNote?.trim()) candidates.push({ date: t.exitDate!.slice(0, 10), text: t.oneThingNote, source: 'trade note' });
      }
    });
    [...dailyReflections].sort((a, b) => b.date.localeCompare(a.date)).forEach(r => {
      if (r.date >= today) return;
      if (r.biggestLesson?.trim()) candidates.push({ date: r.date, text: r.biggestLesson, source: 'daily reflection' });
    });
    [...journalEntries].sort((a, b) => b.date.localeCompare(a.date)).forEach(e => {
      if (e.date >= today) return;
      if (e.lessonLearned?.trim()) candidates.push({ date: e.date, text: e.lessonLearned, source: 'journal' });
    });
    const best = candidates.sort((a, b) => b.date.localeCompare(a.date)).find(c => c.text.length > 10);
    if (best) return best;
  }

  // Case 2: Most recent trade was FOMO or Revenge
  const lastTrade = closed[0];
  if (lastTrade.exitDate!.slice(0, 10) < today &&
    (lastTrade.emotion === 'FOMO' || lastTrade.emotion === 'Revenge Trading')) {
    const past = closed.filter(
      t => t.emotion === lastTrade.emotion &&
        t.exitDate!.slice(0, 10) < today &&
        t.lessonNotes?.trim()
    );
    if (past.length > 0) {
      return { date: past[0].exitDate!.slice(0, 10), text: past[0].lessonNotes!, source: 'trade lesson' };
    }
  }

  return null;
}

// ─── Tier 3 AI Coach Utilities ────────────────────────────────────────────────

/** Q-10: Returns today's trade count vs historical daily average.
 *  Returns null if < 10 past trading days or ratio < 1.8x. */
export function getTodayFrequencySpike(trades: Trade[]): {
  todayCount: number;
  avgDailyCount: number;
  ratio: number;
  pastDayCount: number;
} | null {
  const todayStr = new Date().toISOString().slice(0, 10);
  const todayCount = trades.filter(t => t.entryDate.slice(0, 10) === todayStr).length;

  const dayMap = new Map<string, number>();
  trades.forEach(t => {
    const day = t.entryDate.slice(0, 10);
    if (day < todayStr) dayMap.set(day, (dayMap.get(day) ?? 0) + 1);
  });

  const pastDays = Array.from(dayMap.values());
  if (pastDays.length < 10 || todayCount === 0) return null;

  const avgDailyCount = pastDays.reduce((s, v) => s + v, 0) / pastDays.length;
  if (avgDailyCount < 1) return null;
  const ratio = todayCount / avgDailyCount;
  if (ratio < 1.8) return null;

  return {
    todayCount,
    avgDailyCount: Math.round(avgDailyCount * 10) / 10,
    ratio: Math.round(ratio * 10) / 10,
    pastDayCount: pastDays.length,
  };
}

/** Q-11: On no-trade days, returns a quiet historical insight. */
export function getRestDayInsight(trades: Trade[]): {
  type: 'best-rest-followup' | 'discipline-pattern' | 'generic';
  text: string;
} | null {
  const todayStr = new Date().toISOString().slice(0, 10);
  if (trades.some(t => t.entryDate.slice(0, 10) === todayStr)) return null;

  const closed = trades
    .filter(t => !t.isOpen && t.actualPnL !== null && t.exitDate)
    .sort((a, b) => new Date(a.exitDate!).getTime() - new Date(b.exitDate!).getTime());
  if (closed.length < 5) return null;

  const tradingDays = new Set(closed.map(t => t.exitDate!.slice(0, 10)));

  // Find best follow-up session after a gap day
  let bestWR = 0;
  let bestDate = '';
  const sortedDays = [...tradingDays].sort();
  for (let i = 1; i < sortedDays.length; i++) {
    const gap = (new Date(sortedDays[i]).getTime() - new Date(sortedDays[i - 1]).getTime()) / 86400000;
    if (gap >= 2) {
      const sessionTrades = closed.filter(t => t.exitDate!.slice(0, 10) === sortedDays[i]);
      if (sessionTrades.length === 0) continue;
      const wins = sessionTrades.filter(t => (t.actualPnL ?? 0) > 0).length;
      const wr = wins / sessionTrades.length;
      if (wr > bestWR) { bestWR = wr; bestDate = sortedDays[i]; }
    }
  }

  if (bestWR >= 0.7 && bestDate) {
    return {
      type: 'best-rest-followup',
      text: `After your last break, your next session had a ${Math.round(bestWR * 100)}% win rate. Rest is part of the process.`,
    };
  }

  const withChecklist = closed.filter(t => t.ruleChecklist.length > 0);
  if (withChecklist.length >= 5) {
    const followed = withChecklist.filter(t => !t.ruleChecklist.some(r => r.compliance === 'no')).length;
    const pct = Math.round((followed / withChecklist.length) * 100);
    return {
      type: 'discipline-pattern',
      text: `You've followed your rules fully in ${followed} of ${withChecklist.length} trades (${pct}%). Rest days give you clarity to keep that up.`,
    };
  }

  return { type: 'generic', text: 'No trades today. A quiet day is still a day in the process.' };
}

/** Q-21/22: Full milestone state — trade count milestones, skill milestones, personal best. */
export interface MilestoneState {
  achieved: number[];
  nextTarget: number | null;
  toNext: number | null;
  totalTrades: number;
  firstDisciplinedWeek: boolean;
  longestDisciplineStreak: number;
  hasPositiveMonth: boolean;
  personalBestMonth: { month: string; winRate: number } | null;
  personalBestMonthIsRecent: boolean;
}

export function getFullMilestoneState(trades: Trade[]): MilestoneState {
  const COUNT_MILESTONES = [25, 50, 100, 200, 500];
  const total = trades.length;
  const achieved = COUNT_MILESTONES.filter(m => total >= m);
  const nextTarget = COUNT_MILESTONES.find(m => total < m) ?? null;
  const toNext = nextTarget !== null ? nextTarget - total : null;

  // Personal best month
  const monthlyMap = new Map<string, { wins: number; total: number }>();
  trades.filter(t => !t.isOpen && t.exitDate && t.actualPnLPercent !== null).forEach(t => {
    const month = t.exitDate!.slice(0, 7);
    const prev = monthlyMap.get(month) ?? { wins: 0, total: 0 };
    monthlyMap.set(month, {
      wins: prev.wins + ((t.actualPnLPercent ?? 0) > 0 ? 1 : 0),
      total: prev.total + 1,
    });
  });
  const peakEntry = Array.from(monthlyMap.entries())
    .filter(([, v]) => v.total >= 5)
    .map(([month, v]) => ({ month, winRate: Math.round((v.wins / v.total) * 100) }))
    .sort((a, b) => b.winRate - a.winRate)[0] ?? null;

  const personalBestMonth = peakEntry;
  const recentCutoff = new Date(Date.now() - 90 * 86400000).toISOString().slice(0, 7);
  const personalBestMonthIsRecent = personalBestMonth !== null && personalBestMonth.month >= recentCutoff;

  // First disciplined week (any 7-day span with ≥3 trades, zero 'no' compliance)
  const withRules = trades.filter(t => !t.isOpen && t.ruleChecklist.length > 0 && t.exitDate);
  let firstDisciplinedWeek = false;
  if (withRules.length >= 3) {
    const weekMap = new Map<string, boolean>();
    withRules.forEach(t => {
      const d = new Date(t.exitDate!);
      const jan1 = new Date(d.getFullYear(), 0, 1);
      const weekNum = Math.ceil(((d.getTime() - jan1.getTime()) / 86400000 + jan1.getDay() + 1) / 7);
      const key = `${d.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
      const hasBreak = t.ruleChecklist.some(r => r.compliance === 'no');
      if (!weekMap.has(key)) weekMap.set(key, !hasBreak);
      else if (hasBreak) weekMap.set(key, false);
    });
    firstDisciplinedWeek = Array.from(weekMap.values()).some(v => v);
  }

  // Longest consecutive discipline days
  const byDay = new Map<string, boolean>();
  withRules.forEach(t => {
    const day = t.exitDate!.slice(0, 10);
    const clean = !t.ruleChecklist.some(r => r.compliance === 'no');
    if (!byDay.has(day)) byDay.set(day, clean);
    else if (!clean) byDay.set(day, false);
  });
  const days = [...byDay.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  let longestDisciplineStreak = 0, cur = 0;
  for (const [, ok] of days) {
    if (ok) { cur++; longestDisciplineStreak = Math.max(longestDisciplineStreak, cur); }
    else cur = 0;
  }

  const hasPositiveMonth = Array.from(monthlyMap.values()).some(v => v.total >= 3 && v.wins / v.total > 0.5);

  return {
    achieved, nextTarget, toNext, totalTrades: total,
    firstDisciplinedWeek, longestDisciplineStreak, hasPositiveMonth,
    personalBestMonth, personalBestMonthIsRecent,
  };
}

/** Q-15: Full per-coin profile. Returns null if < 3 closed trades on that coin. */
export interface CoinProfile {
  coin: string;
  totalTrades: number;
  winRate: number;
  avgPnLPercent: number;
  complianceRate: number;
  mostBrokenRule: string | null;
  avgCapital: number;
  mostCommonEmotion: string | null;
  trajectory: { early: number; mid: number; recent: number } | null;
  sampleSize: number;
}

export function getCoinProfile(trades: Trade[], coin: string): CoinProfile | null {
  const coinTrades = trades
    .filter(t => !t.isOpen && t.coin === coin && t.actualPnLPercent !== null && t.exitDate)
    .sort((a, b) => new Date(a.exitDate!).getTime() - new Date(b.exitDate!).getTime());
  if (coinTrades.length < 3) return null;

  const wins = coinTrades.filter(t => (t.actualPnLPercent ?? 0) > 0).length;
  const winRate = Math.round((wins / coinTrades.length) * 100);
  const avgPnLPercent = Math.round(coinTrades.reduce((s, t) => s + (t.actualPnLPercent ?? 0), 0) / coinTrades.length * 100) / 100;
  const avgCapital = Math.round(coinTrades.reduce((s, t) => s + t.capital, 0) / coinTrades.length);

  let totalScore = 0, totalCount = 0;
  const ruleBreaks: Record<string, number> = {};
  coinTrades.forEach(t => t.ruleChecklist.forEach(r => {
    totalCount++;
    if (r.compliance === 'yes') totalScore += 1;
    else if (r.compliance === 'partial') totalScore += 0.5;
    else ruleBreaks[r.rule] = (ruleBreaks[r.rule] ?? 0) + 1;
  }));
  const complianceRate = totalCount > 0 ? Math.round((totalScore / totalCount) * 100) : 100;
  const mostBrokenRule = Object.entries(ruleBreaks).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  const emotionCount: Record<string, number> = {};
  coinTrades.forEach(t => { emotionCount[t.emotion] = (emotionCount[t.emotion] ?? 0) + 1; });
  const mostCommonEmotion = Object.entries(emotionCount).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  let trajectory: CoinProfile['trajectory'] = null;
  if (coinTrades.length >= 9) {
    const n = Math.floor(coinTrades.length / 3);
    const wr = (pool: Trade[]) => Math.round((pool.filter(t => (t.actualPnLPercent ?? 0) > 0).length / pool.length) * 100);
    trajectory = { early: wr(coinTrades.slice(0, n)), mid: wr(coinTrades.slice(n, 2 * n)), recent: wr(coinTrades.slice(2 * n)) };
  }

  return {
    coin: coin.replace('/USDT', '').replace('/USD', ''),
    totalTrades: coinTrades.length, winRate, avgPnLPercent, complianceRate,
    mostBrokenRule, avgCapital, mostCommonEmotion, trajectory, sampleSize: coinTrades.length,
  };
}

/** Q-15: Returns profiles for all coins with >= 3 trades, sorted by trade count desc. */
export function getAllCoinProfiles(trades: Trade[]): CoinProfile[] {
  const coins = new Set(trades.filter(t => !t.isOpen && t.actualPnLPercent !== null).map(t => t.coin));
  return Array.from(coins)
    .map(coin => getCoinProfile(trades, coin))
    .filter((p): p is CoinProfile => p !== null)
    .sort((a, b) => b.totalTrades - a.totalTrades);
}

/** Q-18: Finds pairs of similar reflections over time showing growth.
 *  Groups by emotion, returns earliest + latest entries ≥30 days apart. */
export interface ReflectionEvolution {
  emotion: string;
  earlier: { date: string; text: string; source: string };
  later: { date: string; text: string; source: string };
  daysBetween: number;
}

export function getReflectionEvolution(
  trades: Trade[],
  reflections: DailyReflection[]
): ReflectionEvolution | null {
  const items: { date: string; emotion: string; text: string; source: string }[] = [];

  trades.filter(t => !t.isOpen && t.exitDate && t.lessonNotes?.trim()).forEach(t => {
    items.push({ date: t.exitDate!.slice(0, 10), emotion: t.emotion, text: t.lessonNotes, source: 'trade lesson' });
  });
  trades.filter(t => !t.isOpen && t.exitDate && t.oneThingNote?.trim()).forEach(t => {
    items.push({ date: t.exitDate!.slice(0, 10), emotion: t.emotion, text: t.oneThingNote, source: 'trade note' });
  });
  reflections.filter(r => r.biggestLesson?.trim()).forEach(r => {
    items.push({ date: r.date, emotion: 'reflection', text: r.biggestLesson, source: 'daily reflection' });
  });

  items.sort((a, b) => a.date.localeCompare(b.date));

  const byEmotion = new Map<string, typeof items>();
  items.forEach(item => {
    if (!byEmotion.has(item.emotion)) byEmotion.set(item.emotion, []);
    byEmotion.get(item.emotion)!.push(item);
  });

  let bestPair: ReflectionEvolution | null = null;
  byEmotion.forEach((group, emotion) => {
    if (group.length < 2) return;
    const earliest = group[0];
    const latest = group[group.length - 1];
    const daysBetween = Math.round(
      (new Date(latest.date).getTime() - new Date(earliest.date).getTime()) / 86400000
    );
    if (daysBetween < 30) return;
    if (!bestPair || daysBetween > bestPair.daysBetween) {
      bestPair = { emotion, earlier: earliest, later: latest, daysBetween };
    }
  });

  return bestPair;
}
