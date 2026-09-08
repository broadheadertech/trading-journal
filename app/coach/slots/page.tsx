'use client';

import { useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useToast } from '@/components/ui/Toast';
import { Plus, Trash as Trash2, Calendar, Calendar as CalendarClock } from '@phosphor-icons/react';

const uid = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export default function CoachSlotsPage() {
  const profile = useQuery(api.coaches.getMyCoachProfile);
  const slots = useQuery(api.coaches.listSlotsForCoach, profile ? { coachId: profile.id } : 'skip') ?? [];
  const createSlot = useMutation(api.coaches.createSlot);
  const deleteSlot = useMutation(api.coaches.deleteSlot);
  const { showToast } = useToast();

  const [startsAt, setStartsAt] = useState('');

  if (!profile) {
    return <p className="empty-line">Apply to become a coach first.</p>;
  }

  const handleAdd = async () => {
    if (!startsAt) return;
    const start = new Date(startsAt);
    const end = new Date(start.getTime() + profile.sessionDurationMin * 60_000);
    try {
      await createSlot({ id: uid(), startsAt: start.toISOString(), endsAt: end.toISOString() });
      setStartsAt('');
      showToast('Slot added', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed', 'error');
    }
  };

  return (
    <div style={{ maxWidth: 720 }}>
      <div className="phead pwrap">
        <p className="eyebrow">
          <CalendarClock size={13} style={{ color: 'var(--amber)' }} /> BOOKING WINDOWS
        </p>
        <h2>Availability</h2>
        <p className="sub">
          Add the times you&apos;re available. Each slot creates a {profile.sessionDurationMin}-minute booking window.
        </p>
      </div>

      <div className="card pwrap">
        <span className="accent" style={{ width: 56, background: 'var(--amber)' }} />
        <div className="cardhead">
          <div>
            <h3>New slot</h3>
            <p className="sub">Times use your local timezone.</p>
          </div>
        </div>

        <div className="field" style={{ marginTop: 20 }}>
          <label>NEW SLOT START TIME</label>
          <div style={{ display: 'flex', gap: 10 }}>
            <input
              type="datetime-local"
              value={startsAt}
              onChange={(e) => setStartsAt(e.target.value)}
              className="box"
              style={{ flex: 1, minWidth: 0, display: 'block', outline: 'none' }}
            />
            <button
              disabled={!startsAt}
              onClick={handleAdd}
              className="btn-a disabled:opacity-50"
              style={{ height: 42, flex: 'none' }}
            >
              <Plus size={14} /> Add
            </button>
          </div>
        </div>
      </div>

      <p className="lbl b10" style={{ margin: '32px 0 14px' }}>
        UPCOMING SLOTS{slots.length > 0 && <span style={{ color: 'var(--amber)' }}> · {slots.length}</span>}
      </p>

      {slots.length === 0 ? (
        <p className="empty-line">No upcoming slots.</p>
      ) : (
        slots.map((s: any) => (
          <div
            key={s.id}
            className="card"
            style={{ padding: '14px 18px', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 14 }}
          >
            <div className="inset" style={{ width: 40, height: 40, padding: 0, flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Calendar size={18} style={{ color: 'var(--amber)' }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: 'var(--mono)', fontWeight: 500, fontSize: 13, color: 'var(--text)' }}>
                {new Date(s.startsAt).toLocaleString()}
              </div>
              <div style={{ fontSize: 11, color: 'var(--muted-2)', marginTop: 4 }}>
                {profile.sessionDurationMin}-minute window
              </div>
            </div>
            <span className="chip" style={{ color: s.isBooked ? 'var(--green)' : 'var(--muted)', flex: 'none' }}>
              <i style={{ background: s.isBooked ? 'var(--green)' : 'var(--muted-3)' }} />
              {s.isBooked ? 'Booked' : 'Open'}
            </span>
            {!s.isBooked && (
              <button
                onClick={() => deleteSlot({ id: s.id })}
                style={{
                  width: 30, height: 30, flex: 'none', borderRadius: 2,
                  border: '1px solid var(--line)', background: 'var(--panel-2)', color: 'var(--red)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
                aria-label="Delete slot"
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
        ))
      )}
    </div>
  );
}
