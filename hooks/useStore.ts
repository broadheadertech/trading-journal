'use client';

import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Trade, Strategy, PreTradeChecklist, JournalEntry, MonthlyGoal } from '@/lib/types';
import { v4 as uuidv4 } from 'uuid';
import { calculatePnL, generateVerdict } from '@/lib/utils';
import { migrateTrade } from '@/lib/migrate';

// ─── Trades ──────────────────────────────────────────────────────────────────

export function useTrades() {
  const tradesQuery = useQuery(api.trades.list);
  const addMutation = useMutation(api.trades.add);
  const updateMutation = useMutation(api.trades.update);
  const removeMutation = useMutation(api.trades.remove);

  const trades: Trade[] = (tradesQuery ?? []).map(migrateTrade);
  const isLoaded = tradesQuery !== undefined;

  const addTrade = (
    trade: Omit<Trade, 'id' | 'createdAt' | 'actualPnL' | 'actualPnLPercent' | 'verdict'>
  ) => {
    const hasBreak = (trade.ruleChecklist ?? []).some((r) => r.compliance === 'no');
    const rulesFollowed =
      trade.ruleChecklist.length === 0 ? trade.rulesFollowed : !hasBreak;

    const id = uuidv4();
    const createdAt = new Date().toISOString();
    let actualPnL: number | null = null;
    let actualPnLPercent: number | null = null;
    let verdict: Trade['verdict'] = null;

    if (trade.exitPrice !== null && !trade.isOpen) {
      const { pnlPercent, pnlDollar } = calculatePnL(
        trade.entryPrice,
        trade.exitPrice,
        trade.capital
      );
      actualPnL = pnlDollar;
      actualPnLPercent = pnlPercent;
      verdict = generateVerdict({
        ...trade,
        rulesFollowed,
        id: '',
        actualPnL,
        actualPnLPercent: pnlPercent,
        verdict: null,
        createdAt: '',
      } as Trade);
    }

    return addMutation({
      ...trade,
      rulesFollowed,
      id,
      createdAt,
      actualPnL,
      actualPnLPercent,
      verdict,
    });
  };

  const updateTrade = (id: string, updates: Partial<Trade>) => {
    // Find the current trade to recompute verdict if prices changed
    const current = trades.find((t) => t.id === id);
    let finalUpdates = { ...updates };

    if (current) {
      const merged = { ...current, ...updates };
      if (merged.exitPrice !== null && !merged.isOpen) {
        const { pnlPercent, pnlDollar } = calculatePnL(
          merged.entryPrice,
          merged.exitPrice,
          merged.capital
        );
        finalUpdates = {
          ...finalUpdates,
          actualPnL: pnlDollar,
          actualPnLPercent: pnlPercent,
          verdict: generateVerdict({ ...merged, actualPnLPercent: pnlPercent }),
        };
        if (updates.ruleChecklist !== undefined && updates.ruleChecklist.length > 0) {
          finalUpdates.rulesFollowed = !updates.ruleChecklist.some(
            (r) => r.compliance === 'no'
          );
        }
      }
    }

    return updateMutation({ id, updates: finalUpdates });
  };

  const deleteTrade = (id: string) => removeMutation({ id });

  return { trades, addTrade, updateTrade, deleteTrade, isLoaded };
}

// ─── Strategies ───────────────────────────────────────────────────────────────

export function useStrategies() {
  const strategiesQuery = useQuery(api.strategies.list);
  const addMutation = useMutation(api.strategies.add);
  const updateMutation = useMutation(api.strategies.update);
  const removeMutation = useMutation(api.strategies.remove);

  const strategies: Strategy[] = (strategiesQuery ?? []) as Strategy[];
  const isLoaded = strategiesQuery !== undefined;

  const addStrategy = (strategy: Omit<Strategy, 'id' | 'createdAt'>) => {
    return addMutation({ ...strategy, id: uuidv4(), createdAt: new Date().toISOString() });
  };

  const updateStrategy = (id: string, updates: Partial<Strategy>) => {
    return updateMutation({ id, updates });
  };

  const deleteStrategy = (id: string) => removeMutation({ id });

  return { strategies, addStrategy, updateStrategy, deleteStrategy, isLoaded };
}

// ─── Checklists ───────────────────────────────────────────────────────────────

export function useChecklists() {
  const checklistsQuery = useQuery(api.checklists.list);
  const addMutation = useMutation(api.checklists.add);
  const removeMutation = useMutation(api.checklists.remove);

  const checklists: PreTradeChecklist[] = (checklistsQuery ?? []) as PreTradeChecklist[];
  const isLoaded = checklistsQuery !== undefined;

  const addChecklist = (checklist: Omit<PreTradeChecklist, 'id' | 'createdAt'>) => {
    return addMutation({ ...checklist, id: uuidv4(), createdAt: new Date().toISOString() });
  };

  const deleteChecklist = (id: string) => removeMutation({ id });

  return { checklists, addChecklist, deleteChecklist, isLoaded };
}

// ─── Journal ─────────────────────────────────────────────────────────────────

export function useJournal() {
  const entriesQuery = useQuery(api.journal.list);
  const addMutation = useMutation(api.journal.add);
  const updateMutation = useMutation(api.journal.update);
  const removeMutation = useMutation(api.journal.remove);

  const entries: JournalEntry[] = (entriesQuery ?? []) as JournalEntry[];
  const isLoaded = entriesQuery !== undefined;

  const addEntry = (entry: Omit<JournalEntry, 'id' | 'createdAt'>) => {
    return addMutation({ ...entry, id: uuidv4(), createdAt: new Date().toISOString() });
  };

  const updateEntry = (id: string, updates: Partial<JournalEntry>) => {
    return updateMutation({ id, updates });
  };

  const deleteEntry = (id: string) => removeMutation({ id });

  return { entries, addEntry, updateEntry, deleteEntry, isLoaded };
}

// ─── Goals ───────────────────────────────────────────────────────────────────

export function useGoals() {
  const goalsQuery = useQuery(api.goals.list);
  const addMutation = useMutation(api.goals.add);
  const updateMutation = useMutation(api.goals.update);

  const goals: MonthlyGoal[] = (goalsQuery ?? []) as MonthlyGoal[];
  const isLoaded = goalsQuery !== undefined;

  const addGoal = (goal: Omit<MonthlyGoal, 'id' | 'createdAt'>) => {
    return addMutation({ ...goal, id: uuidv4(), createdAt: new Date().toISOString() });
  };

  const updateGoal = (id: string, updates: Partial<MonthlyGoal>) => {
    return updateMutation({ id, updates });
  };

  return { goals, addGoal, updateGoal, isLoaded };
}

// ─── Profile / Capital ────────────────────────────────────────────────────────

export function useProfile() {
  const profileQuery = useQuery(api.profile.get);
  const setCapitalMutation = useMutation(api.profile.setCapital);
  const setDailyGoalMutation = useMutation(api.profile.setDailyGoal);
  const setCurrencyMutation = useMutation(api.profile.setCurrency);
  const completeOnboardingMutation = useMutation(api.profile.completeOnboarding);

  const initialCapital: number = profileQuery?.initialCapital ?? 0;
  const dailyLossLimit: number | undefined = profileQuery?.dailyLossLimit;
  const dailyProfitTarget: number | undefined = profileQuery?.dailyProfitTarget;
  const goalMode: 'daily' | 'session' = profileQuery?.goalMode ?? 'daily';
  const currency: string = profileQuery?.currency ?? 'USD';
  const onboardingComplete: boolean = profileQuery?.onboardingComplete ?? false;
  const isLoaded = profileQuery !== undefined;

  const setInitialCapital = (amount: number) => setCapitalMutation({ amount });
  const setDailyGoal = (args: { dailyLossLimit?: number; dailyProfitTarget?: number; goalMode?: 'daily' | 'session' }) =>
    setDailyGoalMutation(args);
  const setCurrency = (code: string) => setCurrencyMutation({ currency: code });
  const completeOnboarding = (args: { initialCapital: number; currency: string; primaryMarket: string }) =>
    completeOnboardingMutation(args);

  return { initialCapital, setInitialCapital, dailyLossLimit, dailyProfitTarget, goalMode, setDailyGoal, currency, setCurrency, onboardingComplete, completeOnboarding, isLoaded };
}
