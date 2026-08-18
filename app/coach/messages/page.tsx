'use client';

import { useState } from 'react';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { SessionView } from '@/components/Coaching';
import { MessageSquare, ArrowRight } from 'lucide-react';

export default function CoachMessagesPage() {
  const sessions = useQuery(api.coachSessions.myCoachSessions) ?? [];
  const [activeId, setActiveId] = useState<string | null>(null);

  if (activeId) {
    return <SessionView sessionId={activeId} role="coach" onBack={() => setActiveId(null)} />;
  }

  // Show only sessions that aren't cancelled
  const active = sessions.filter((s: any) => s.status !== 'cancelled');

  return (
    <div style={{ maxWidth: 900 }}>
      <div className="phead pwrap">
        <p className="eyebrow">
          <MessageSquare size={13} style={{ color: 'var(--amber)' }} /> CLIENT THREADS
        </p>
        <h2>Messages</h2>
        <p className="sub">One thread per active session. Open a client to read and reply.</p>
      </div>

      {active.length === 0 ? (
        <div className="blank" style={{ padding: '48px 28px' }}>
          <span className="corner" style={{ left: -1, top: -1, borderRight: 0, borderBottom: 0 }} />
          <span className="corner" style={{ right: -1, top: -1, borderLeft: 0, borderBottom: 0 }} />
          <span className="corner" style={{ left: -1, bottom: -1, borderRight: 0, borderTop: 0 }} />
          <span className="corner" style={{ right: -1, bottom: -1, borderLeft: 0, borderTop: 0 }} />
          <span className="badge" style={{ border: '1px solid rgba(47,211,196,.5)', background: 'var(--panel-2)' }}>
            <MessageSquare size={22} style={{ color: 'var(--teal)' }} />
          </span>
          <h4>No conversations yet</h4>
          <p>Threads open automatically once a trader books a session with you.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 10 }}>
          {active.map((s: any) => (
            <button
              key={s.id}
              onClick={() => setActiveId(s.id)}
              className="card"
              style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14, textAlign: 'left', width: '100%' }}
            >
              <div className="inset" style={{ width: 40, height: 40, padding: 0, flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <MessageSquare size={18} style={{ color: 'var(--amber)' }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>
                  {s.clientName}
                </div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--muted-2)', marginTop: 4 }}>
                  {new Date(s.startsAt).toLocaleString()}
                </div>
              </div>
              <span className="chip" style={{ flex: 'none', textTransform: 'capitalize' }}>
                {s.status.replace('_', ' ')}
              </span>
              <ArrowRight size={14} style={{ color: 'var(--amber)', flex: 'none' }} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
