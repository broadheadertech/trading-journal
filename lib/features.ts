import { TabId } from './types';

export type TierName = 'free' | 'essential' | 'pro' | 'elite';

export interface TierConfig {
  tabs: TabId[];
  maxTrades: number;       // -1 = unlimited
  maxStrategies: number;   // -1 = unlimited
  label: string;
}

const ALL_TABS: TabId[] = [
  'dashboard', 'trades', 'playbook', 'analytics', 'psychology',
  'goals', 'verdicts', 'checklist', 'brain', 'whatif', 'reports', 'news',
];

export const TIERS: Record<TierName, TierConfig> = {
  free: {
    tabs: ['dashboard', 'trades', 'playbook', 'analytics', 'psychology'],
    maxTrades: 50,
    maxStrategies: 3,
    label: 'Free',
  },
  essential: {
    tabs: ['dashboard', 'trades', 'playbook', 'analytics', 'psychology', 'goals', 'verdicts', 'checklist', 'brain'],
    maxTrades: 200,
    maxStrategies: 10,
    label: 'Essential',
  },
  pro: {
    tabs: ALL_TABS,
    maxTrades: -1,
    maxStrategies: -1,
    label: 'Pro',
  },
  elite: {
    tabs: ALL_TABS,
    maxTrades: -1,
    maxStrategies: -1,
    label: 'Elite',
  },
};

export function getTierForPlan(planId: string): TierName {
  if (planId in TIERS) return planId as TierName;
  return 'free';
}

const TIER_ORDER: TierName[] = ['free', 'essential', 'pro', 'elite'];

/** Returns the lowest tier that includes this tab. */
export function getRequiredTier(tabId: TabId): TierName {
  for (const tier of TIER_ORDER) {
    if (TIERS[tier].tabs.includes(tabId)) return tier;
  }
  return 'pro';
}
