'use client';

import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';

export function useAdminDashboard() {
  return useQuery(api.admin.getDashboardStats);
}

export function useAdminUsers() {
  return useQuery(api.admin.listUsers);
}

export function useAdminUserDetail(userId: string | null) {
  return useQuery(
    api.admin.getUserDetail,
    userId ? { userId } : 'skip'
  );
}

export function useAdminSettings() {
  const settings = useQuery(api.admin.getSettings);
  const setSettingMut = useMutation(api.admin.setSetting);

  const getSetting = (key: string, fallback = '') =>
    settings?.find((s) => s.key === key)?.value ?? fallback;

  const setSetting = (key: string, value: string) =>
    setSettingMut({ key, value });

  return { settings, getSetting, setSetting, isLoading: settings === undefined };
}

export function useAdminPlans() {
  const plans = useQuery(api.admin.listPlans);
  const upsertPlan = useMutation(api.admin.upsertPlan);
  return { plans, upsertPlan, isLoading: plans === undefined };
}

export function useAdminRevenueStats() {
  const stats = useQuery(api.subscriptions.getRevenueStats);
  return { stats, isLoading: stats === undefined };
}

export function useAdminSubscriptions() {
  const subs = useQuery(api.subscriptions.listSubscriptions);
  return { subs, isLoading: subs === undefined };
}

// ─── Phase 2: User actions ────────────────────────────────────────────
export function useAdminUserActions() {
  const banUser = useMutation(api.admin.banUser);
  const unbanUser = useMutation(api.admin.unbanUser);
  const overridePlan = useMutation(api.admin.overridePlan);
  const resetUserData = useMutation(api.admin.resetUserData);
  return { banUser, unbanUser, overridePlan, resetUserData };
}

export function useAdminUserSubscription(userId: string | null) {
  return useQuery(
    api.admin.getAdminUserSubscription,
    userId ? { userId } : 'skip'
  );
}

// ─── Phase 2: Revenue charts ──────────────────────────────────────────
export function useAdminSubscriberGrowth() {
  return useQuery(api.subscriptions.getSubscriberGrowth);
}

export function useAdminPlanDistribution() {
  return useQuery(api.subscriptions.getPlanDistribution);
}

// ─── Phase 2: Activity feed ───────────────────────────────────────────
export function useAdminRecentEvents() {
  return useQuery(api.adminEvents.getRecentEvents, { limit: 20 });
}
