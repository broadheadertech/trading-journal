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

// ─── Epic 8: Brain admin ──────────────────────────────────────────────
export function useAdminBrainDistribution() {
  return useQuery(api.brainAdmin.getBrainStageDistribution);
}

export function useAdminAntiGamingFlags() {
  return useQuery(api.brainAdmin.getAntiGamingFlags);
}

export function useAdminLogFlagView() {
  return useMutation(api.brainAdmin.logAdminFlagView);
}

export function useAdminAntiGamingThresholds() {
  return useQuery(api.brainAdmin.getAntiGamingThresholds);
}

export function useAdminUpdateThresholds() {
  return useMutation(api.brainAdmin.updateAntiGamingThresholds);
}

// ─── Epic 8: Brain inspection (Story 8.4) ────────────────────────────
export function useAdminUserBrainState(userId: string | null) {
  return useQuery(
    api.brainAdmin.getAdminUserBrainState,
    userId ? { userId } : 'skip'
  );
}

export function useAdminUserScoreEvents(userId: string | null) {
  return useQuery(
    api.brainAdmin.getAdminUserScoreEvents,
    userId ? { userId } : 'skip'
  );
}

export function useAdminLogBrainInspection() {
  return useMutation(api.brainAdmin.logAdminBrainInspection);
}

// ─── Epic 8: Neuro Score trends (Story 8.5) ─────────────────────────
export function useAdminNeuroScoreTrends(days: number) {
  return useQuery(api.brainAdmin.getNeuroScoreTrends, { days });
}

export function useAdminMigrateBrainStages() {
  return useMutation(api.brainAdmin.migrateAllBrainStages);
}
