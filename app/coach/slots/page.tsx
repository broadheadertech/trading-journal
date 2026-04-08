'use client';

import { useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useToast } from '@/components/ui/Toast';
import { Plus, Trash2, Calendar } from 'lucide-react';

const uid = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export default function CoachSlotsPage() {
  const profile = useQuery(api.coaches.getMyCoachProfile);
  const slots = useQuery(api.coaches.listSlotsForCoach, profile ? { coachId: profile.id } : 'skip') ?? [];
  const createSlot = useMutation(api.coaches.createSlot);
  const deleteSlot = useMutation(api.coaches.deleteSlot);
  const { showToast } = useToast();

  const [startsAt, setStartsAt] = useState('');

  if (!profile) {
    return <p className="text-sm text-[var(--muted-foreground)]">Apply to become a coach first.</p>;
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
    <div className="max-w-2xl space-y-6">
      <h1 className="text-3xl font-bold tracking-tight text-[var(--foreground)]">Availability</h1>
      <p className="text-sm text-[var(--muted-foreground)]">
        Add the times you&apos;re available. Each slot creates a {profile.sessionDurationMin}-minute booking window.
      </p>

      <div className="glass rounded-3xl p-6 space-y-3">
        <div className="text-xs font-medium text-[var(--muted-foreground)]">New slot start time</div>
        <div className="flex gap-2">
          <input
            type="datetime-local"
            value={startsAt}
            onChange={(e) => setStartsAt(e.target.value)}
            className="flex-1 px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-sm"
          />
          <button
            disabled={!startsAt}
            onClick={handleAdd}
            className="px-4 py-2 rounded-lg bg-gradient-to-br from-teal-500 to-teal-700 text-white text-sm font-medium flex items-center gap-1 disabled:opacity-50"
          >
            <Plus size={14} /> Add
          </button>
        </div>
      </div>

      <div className="space-y-2">
        {slots.length === 0 && <p className="text-sm text-[var(--muted-foreground)]">No upcoming slots.</p>}
        {slots.map((s: any) => (
          <div key={s.id} className="glass rounded-2xl p-4 flex items-center gap-3">
            <Calendar size={16} className="text-teal-400" />
            <div className="flex-1 min-w-0">
              <div className="font-medium text-[var(--foreground)] text-sm">{new Date(s.startsAt).toLocaleString()}</div>
              <div className="text-xs text-[var(--muted-foreground)]">{s.isBooked ? 'Booked' : 'Open'}</div>
            </div>
            {!s.isBooked && (
              <button
                onClick={() => deleteSlot({ id: s.id })}
                className="p-2 rounded-lg hover:bg-[var(--red)]/10 text-[var(--red)]"
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
