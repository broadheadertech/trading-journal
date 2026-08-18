'use client';

import { useState } from 'react';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { SessionRow, SessionView } from '@/components/Coaching';
import { Headphones } from 'lucide-react';

export default function CoachSessionsPage() {
  const sessions = useQuery(api.coachSessions.myCoachSessions) ?? [];
  const [activeId, setActiveId] = useState<string | null>(null);

  if (activeId) {
    return <SessionView sessionId={activeId} role="coach" onBack={() => setActiveId(null)} />;
  }

  return (
    <div style={{ maxWidth: 900 }}>
      <div className="phead pwrap">
        <p className="eyebrow">
          <Headphones size={13} style={{ color: 'var(--amber)' }} /> 1-ON-1 SESSIONS
        </p>
        <h2>Sessions</h2>
        <p className="sub">Every session booked with you. Open one to set the meeting link, chat and complete it.</p>
      </div>

      {sessions.length === 0 ? (
        <div className="blank" style={{ padding: '48px 28px' }}>
          <span className="corner" style={{ left: -1, top: -1, borderRight: 0, borderBottom: 0 }} />
          <span className="corner" style={{ right: -1, top: -1, borderLeft: 0, borderBottom: 0 }} />
          <span className="corner" style={{ left: -1, bottom: -1, borderRight: 0, borderTop: 0 }} />
          <span className="corner" style={{ right: -1, bottom: -1, borderLeft: 0, borderTop: 0 }} />
          <span className="badge" style={{ border: '1px solid rgba(217,148,5,.4)', background: 'var(--panel-2)' }}>
            <Headphones size={22} style={{ color: 'var(--amber)' }} />
          </span>
          <h4>No sessions yet</h4>
          <p>Add availability slots so traders can book time with you.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 10 }}>
          {sessions.map((s: any) => (
            <SessionRow key={s.id} session={s} onOpen={() => setActiveId(s.id)} />
          ))}
        </div>
      )}
    </div>
  );
}
