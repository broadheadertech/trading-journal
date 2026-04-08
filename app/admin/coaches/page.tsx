'use client';

import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useToast } from '@/components/ui/Toast';
import { Check, X, Pause, Headphones } from 'lucide-react';

export default function AdminCoachesPage() {
  const all = useQuery(api.coaches.listAll) ?? [];
  const sessions = useQuery(api.coachSessions.adminListAll) ?? [];
  const applicationsOpen = useQuery(api.coaches.getApplicationsOpen);
  const approve = useMutation(api.coaches.approveCoach);
  const reject = useMutation(api.coaches.rejectCoach);
  const suspend = useMutation(api.coaches.suspendCoach);
  const setOpen = useMutation(api.coaches.setApplicationsOpen);
  const { showToast } = useToast();

  const STATUS: Record<string, string> = {
    pending:   'bg-amber-500/15 text-amber-400',
    approved:  'bg-emerald-500/15 text-emerald-400',
    suspended: 'bg-[var(--red)]/15 text-[var(--red)]',
    rejected:  'bg-[var(--muted)]/40 text-[var(--muted-foreground)]',
  };

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold tracking-tight text-[var(--foreground)]">Manage Coaches</h1>

      {/* Applications toggle */}
      <div className="glass rounded-2xl p-4 flex items-center justify-between">
        <div>
          <div className="font-semibold text-[var(--foreground)]">Coach applications</div>
          <div className="text-xs text-[var(--muted-foreground)]">
            {applicationsOpen
              ? 'Users can apply to become coaches.'
              : 'Applications are closed. Users will see a "closed" message.'}
          </div>
        </div>
        <button
          onClick={async () => {
            await setOpen({ open: !applicationsOpen });
            showToast(`Applications ${!applicationsOpen ? 'opened' : 'closed'}`, 'success');
          }}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
            applicationsOpen
              ? 'bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25'
              : 'bg-[var(--muted)]/40 text-[var(--muted-foreground)] hover:bg-[var(--muted)]/60'
          }`}
        >
          {applicationsOpen ? 'Open' : 'Closed'}
        </button>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">All coach profiles ({all.length})</h2>
        {all.length === 0 ? (
          <p className="text-sm text-[var(--muted-foreground)]">No coach applications yet.</p>
        ) : (
          all.map((c: any) => (
            <div key={c.id} className="glass rounded-2xl p-4 flex items-center gap-4">
              {c.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={c.photoUrl} alt={c.displayName} className="w-12 h-12 rounded-xl object-cover" />
              ) : (
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-500/30 to-emerald-500/10 flex items-center justify-center text-white font-bold">
                  {c.displayName.charAt(0)}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-[var(--foreground)]">{c.displayName}</div>
                <div className="text-xs text-[var(--muted-foreground)] truncate">{c.headline} · ${c.hourlyRateUsd}/hr</div>
              </div>
              <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full ${STATUS[c.status]}`}>{c.status}</span>
              <div className="flex items-center gap-1">
                {c.status !== 'approved' && (
                  <button
                    onClick={async () => { await approve({ id: c.id }); showToast('Approved', 'success'); }}
                    className="p-2 rounded-lg text-emerald-400 hover:bg-emerald-500/10"
                    title="Approve"
                  >
                    <Check size={16} />
                  </button>
                )}
                {c.status === 'approved' && (
                  <button
                    onClick={async () => { await suspend({ id: c.id }); showToast('Suspended', 'success'); }}
                    className="p-2 rounded-lg text-amber-400 hover:bg-amber-500/10"
                    title="Suspend"
                  >
                    <Pause size={16} />
                  </button>
                )}
                {c.status === 'pending' && (
                  <button
                    onClick={async () => { await reject({ id: c.id }); showToast('Rejected', 'success'); }}
                    className="p-2 rounded-lg text-[var(--red)] hover:bg-[var(--red)]/10"
                    title="Reject"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">All sessions ({sessions.length})</h2>
        {sessions.length === 0 ? (
          <p className="text-sm text-[var(--muted-foreground)]">No sessions yet.</p>
        ) : (
          <div className="glass rounded-2xl divide-y divide-[var(--border)]">
            {sessions.map((s: any) => (
              <div key={s.id} className="p-3 flex items-center gap-3 text-sm">
                <Headphones size={14} className="text-teal-400" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-[var(--foreground)]">{s.clientName}</div>
                  <div className="text-xs text-[var(--muted-foreground)]">{new Date(s.startsAt).toLocaleString()} · ${s.pricePaidUsd}</div>
                </div>
                <span className="text-[10px] uppercase font-bold text-[var(--muted-foreground)]">{s.status}</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
