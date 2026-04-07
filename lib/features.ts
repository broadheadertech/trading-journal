import { TabId } from './types';

export type TierName = 'free' | 'essential' | 'pro' | 'elite' | 'legend';

export interface TierConfig {
  tabs: TabId[];
  maxTrades: number;       // -1 = unlimited
  maxStrategies: number;   // -1 = unlimited
  hasTeam: boolean;
  label: string;
}

const ALL_TABS: TabId[] = [
  'dashboard', 'journal', 'playbook', 'analytics', 'psychology',
  'goals', 'verdicts', 'checklist', 'brain', 'whatif', 'reports', 'news', 'leaderboard', 'tools', 'courses', 'events', 'community',
];

export const TIERS: Record<TierName, TierConfig> = {
  free: {
    tabs: ['dashboard', 'journal', 'playbook', 'analytics', 'psychology', 'courses', 'events', 'community'],
    maxTrades: 50,
    maxStrategies: 3,
    hasTeam: false,
    label: 'Free',
  },
  essential: {
    tabs: ['dashboard', 'journal', 'playbook', 'analytics', 'psychology', 'goals', 'verdicts', 'checklist', 'brain', 'courses', 'events', 'community'],
    maxTrades: 200,
    maxStrategies: 10,
    hasTeam: false,
    label: 'Essential',
  },
  pro: {
    tabs: ALL_TABS,
    maxTrades: -1,
    maxStrategies: -1,
    hasTeam: false,
    label: 'Pro',
  },
  elite: {
    tabs: ALL_TABS,
    maxTrades: -1,
    maxStrategies: -1,
    hasTeam: false,
    label: 'Elite',
  },
  legend: {
    tabs: ALL_TABS,
    maxTrades: -1,
    maxStrategies: -1,
    hasTeam: true,
    label: 'Legend',
  },
};

export function getTierForPlan(planId: string): TierName {
  if (planId in TIERS) return planId as TierName;
  return 'free';
}

const TIER_ORDER: TierName[] = ['free', 'essential', 'pro', 'elite', 'legend'];

/** Returns the lowest tier that includes this tab. */
export function getRequiredTier(tabId: TabId): TierName {
  for (const tier of TIER_ORDER) {
    if (TIERS[tier].tabs.includes(tabId)) return tier;
  }
  return 'pro';
}
