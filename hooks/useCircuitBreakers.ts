'use client';

import { useEffect, useCallback } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { CircuitBreakerEvent, CooldownState, CircuitBreakerType } from '@/lib/types';
import { v4 as uuidv4 } from 'uuid';

export function useCircuitBreakers() {
  const eventsQuery = useQuery(api.circuitBreakers.listEvents);
  const cooldownsQuery = useQuery(api.circuitBreakers.listCooldowns);
  const logEventMutation = useMutation(api.circuitBreakers.logEvent);
  const overrideEventMutation = useMutation(api.circuitBreakers.overrideEvent);
  const startCooldownMutation = useMutation(api.circuitBreakers.startCooldown);
  const clearCooldownMutation = useMutation(api.circuitBreakers.clearCooldown);
  const cleanupMutation = useMutation(api.circuitBreakers.cleanupExpiredCooldowns);

  const breakerEvents: CircuitBreakerEvent[] = (eventsQuery ?? []).map(e => ({
    ...e,
    type: e.type as CircuitBreakerType,
  }));
  const cooldowns: CooldownState[] = (cooldownsQuery ?? []).map((c) => ({
    type: c.type as CircuitBreakerType,
    expiresAt: c.expiresAt,
    reason: c.reason,
  }));
  const eventsLoaded = eventsQuery !== undefined;
  const cooldownsLoaded = cooldownsQuery !== undefined;

  // Clean up expired cooldowns on mount (replaces the old useEffect + setCooldowns)
  useEffect(() => {
    if (cooldownsLoaded) {
      cleanupMutation();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cooldownsLoaded]);

  const logBreakerEvent = useCallback(
    (event: Omit<CircuitBreakerEvent, 'id' | 'triggeredAt' | 'overridden'>) => {
      const newEvent: CircuitBreakerEvent = {
        ...event,
        id: uuidv4(),
        triggeredAt: new Date().toISOString(),
        overridden: false,
      };
      logEventMutation(newEvent);
      return newEvent;
    },
    [logEventMutation]
  );

  const overrideBreaker = useCallback(
    (eventId: string) => overrideEventMutation({ id: eventId }),
    [overrideEventMutation]
  );

  const startCooldown = useCallback(
    (type: CircuitBreakerType, durationMs: number, reason: string) => {
      const expiresAt = new Date(Date.now() + durationMs).toISOString();
      return startCooldownMutation({ id: uuidv4(), type, expiresAt, reason });
    },
    [startCooldownMutation]
  );

  const clearCooldown = useCallback(
    (type: CircuitBreakerType) => clearCooldownMutation({ type }),
    [clearCooldownMutation]
  );

  const getActiveCooldowns = useCallback((): CooldownState[] => {
    const now = new Date().toISOString();
    return cooldowns.filter((c) => c.expiresAt > now);
  }, [cooldowns]);

  const hasActiveCooldown = useCallback(
    (): boolean => getActiveCooldowns().length > 0,
    [getActiveCooldowns]
  );

  return {
    breakerEvents,
    cooldowns,
    logBreakerEvent,
    overrideBreaker,
    startCooldown,
    clearCooldown,
    getActiveCooldowns,
    hasActiveCooldown,
    isLoaded: eventsLoaded && cooldownsLoaded,
  };
}
