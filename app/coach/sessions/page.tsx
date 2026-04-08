'use client';

import { useState } from 'react';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { SessionRow, SessionView } from '@/components/Coaching';

export default function CoachSessionsPage() {
  const sessions = useQuery(api.coachSessions.myCoachSessions) ?? [];
  const [activeId, setActiveId] = useState<string | null>(null);

  if (activeId) {
    return <SessionView sessionId={activeId} role="coach" onBack={() => setActiveId(null)} />;
  }

  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="text-3xl font-bold tracking-tight text-[var(--foreground)]">Sessions</h1>
      {sessions.length === 0 ? (
        <p className="text-sm text-[var(--muted-foreground)]">No sessions yet.</p>
      ) : (
        <div className="space-y-2">
          {sessions.map((s: any) => (
            <SessionRow key={s.id} session={s} onOpen={() => setActiveId(s.id)} />
          ))}
        </div>
      )}
    </div>
  );
}
