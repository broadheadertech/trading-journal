'use client';

import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import type { BrainState } from '@/lib/types';

/** Reactive brain state hook — auto-updates when server mutates brainStates. */
export function useBrainState() {
  const brainState = useQuery(api.brainQueries.getBrainState);
  return {
    brainState: (brainState ?? null) as BrainState | null,
    isLoading: brainState === undefined,
  };
}

/** Reactive migration status hook — detects when backfill completes for migration users. */
export function useMigrationStatus() {
  const status = useQuery(api.brainQueries.getMigrationStatus);
  return {
    migrationStatus: status ?? null,
    isMigrationLoading: status === undefined,
  };
}
