'use client';

import { useCallback } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { TriggerEntry, DailyReflection, WeeklyReview, RuleBreakLog } from '@/lib/types';
import { v4 as uuidv4 } from 'uuid';

export function useTriggers() {
  const triggersQuery = useQuery(api.triggers.list);
  const addMutation = useMutation(api.triggers.add);
  const updateMutation = useMutation(api.triggers.update);
  const removeMutation = useMutation(api.triggers.remove);

  const triggers: TriggerEntry[] = (triggersQuery ?? []) as TriggerEntry[];
  const isLoaded = triggersQuery !== undefined;

  const addTrigger = useCallback(
    (trigger: Omit<TriggerEntry, 'id' | 'createdAt'>) =>
      addMutation({ ...trigger, id: uuidv4(), createdAt: new Date().toISOString() }),
    [addMutation]
  );

  const updateTrigger = useCallback(
    (id: string, updates: Partial<TriggerEntry>) => updateMutation({ id, updates }),
    [updateMutation]
  );

  const deleteTrigger = useCallback(
    (id: string) => removeMutation({ id }),
    [removeMutation]
  );

  return { triggers, addTrigger, updateTrigger, deleteTrigger, isLoaded };
}

export function useReflections() {
  const reflectionsQuery = useQuery(api.reflections.list);
  const addMutation = useMutation(api.reflections.add);

  const reflections: DailyReflection[] = reflectionsQuery ?? [];
  const isLoaded = reflectionsQuery !== undefined;

  const addReflection = useCallback(
    (reflection: Omit<DailyReflection, 'id' | 'createdAt'>) =>
      addMutation({ ...reflection, id: uuidv4(), createdAt: new Date().toISOString() }),
    [addMutation]
  );

  return { reflections, addReflection, isLoaded };
}

export function useWeeklyReviews() {
  const reviewsQuery = useQuery(api.weeklyReviews.list);
  const addMutation = useMutation(api.weeklyReviews.add);

  const reviews: WeeklyReview[] = (reviewsQuery ?? []) as WeeklyReview[];
  const isLoaded = reviewsQuery !== undefined;

  const addReview = useCallback(
    (review: Omit<WeeklyReview, 'id' | 'createdAt'>) =>
      addMutation({ ...review, id: uuidv4(), createdAt: new Date().toISOString() }),
    [addMutation]
  );

  return { reviews, addReview, isLoaded };
}

export function useRuleBreakLogs() {
  const logsQuery = useQuery(api.ruleBreaks.list);
  const addMutation = useMutation(api.ruleBreaks.add);

  const isLoaded = logsQuery !== undefined;

  const addRuleBreak = useCallback(
    (log: Omit<RuleBreakLog, 'id'>) => addMutation({ ...log, id: uuidv4() }),
    [addMutation]
  );

  return { ruleBreakLogs: logsQuery ?? [], addRuleBreak, isLoaded };
}
