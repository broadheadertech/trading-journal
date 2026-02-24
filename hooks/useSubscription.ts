'use client';

import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { TabId } from '@/lib/types';
import { TierName, TIERS, getTierForPlan } from '@/lib/features';

export function useSubscription() {
  const subscription = useQuery(api.subscriptions.getUserSubscription);

  const isActive = subscription?.status === 'active' || subscription?.status === 'trialing';
  const isFree = !subscription || subscription.status === 'free';
  const planId = subscription?.planId ?? 'free';
  const tierName: TierName = getTierForPlan(planId);
  const tier = TIERS[tierName];

  const canAccessTab = (tabId: TabId): boolean => tier.tabs.includes(tabId);

  const limits = {
    maxTrades: tier.maxTrades,
    maxStrategies: tier.maxStrategies,
  };

  return {
    subscription,
    isActive,
    isFree,
    planId,
    tierName,
    canAccessTab,
    limits,
    isLoading: subscription === undefined,
  };
}
