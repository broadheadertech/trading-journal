'use client';

import { useTrades, useStrategies } from './useStore';
import { useSubscription } from './useSubscription';

interface UsageStat {
  current: number;
  max: number;
  percentage: number;
  isUnlimited: boolean;
  isNearLimit: boolean;
  isAtLimit: boolean;
}

function buildStat(current: number, max: number): UsageStat {
  const isUnlimited = max === -1;
  const percentage = isUnlimited ? 0 : max > 0 ? Math.round((current / max) * 100) : 0;
  return {
    current,
    max,
    percentage,
    isUnlimited,
    isNearLimit: !isUnlimited && percentage >= 80 && percentage < 100,
    isAtLimit: !isUnlimited && current >= max,
  };
}

export function useUsage() {
  const { trades } = useTrades();
  const { strategies } = useStrategies();
  const { limits, tierName, isFree } = useSubscription();

  return {
    trades: buildStat(trades.length, limits.maxTrades),
    strategies: buildStat(strategies.length, limits.maxStrategies),
    tierName,
    isFree,
  };
}
