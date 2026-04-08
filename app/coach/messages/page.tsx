'use client';

import { useState } from 'react';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { SessionView } from '@/components/Coaching';
import { MessageSquare } from 'lucide-react';

export default function CoachMessagesPage() {
  const sessions = useQuery(api.coachSessions.myCoachSessions) ?? [];
  const [activeId, setActiveId] = useState<string | null>(null);

  if (activeId) {
    return <SessionView sessionId={activeId} role="coach" onBack={() => setActiveId(null)} />;
  }

  // Show only sessions that aren't cancelled
  const active = sessions.filter((s: any) => s.status !== 'cancelled');

  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="text-3xl font-bold tracking-tight text-[var(--foreground)]">Messages</h1>
      {active.length === 0 ? (
        <p className="text-sm text-[var(--muted-foreground)]">No conversations yet.</p>
      ) : (
        <div className="space-y-2">
          {active.map((s: any) => (
            <button
              key={s.id}
              onClick={() => setActiveId(s.id)}
              className="w-full glass rounded-2xl p-4 flex items-center gap-3 card-lift text-left"
            >
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-teal-500/20 to-emerald-500/10 flex items-center justify-center">
                <MessageSquare size={16} className="text-teal-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-[var(--foreground)]">{s.clientName}</div>
                <div className="text-xs text-[var(--muted-foreground)]">{new Date(s.startsAt).toLocaleString()}</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
