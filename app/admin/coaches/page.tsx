'use client';

import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useToast } from '@/components/ui/Toast';
import { Check, X, Pause, Headphones, Users } from 'lucide-react';

// shared ATLAS chrome (markup-level styling only)
const iconBtn = (color: string): React.CSSProperties => ({
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  width: 32, height: 32, borderRadius: 2,
  border: '1px solid var(--line)', background: 'var(--panel-2)', color,
});

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
    pending:   'var(--amber)',
    approved:  'var(--green)',
    suspended: 'var(--red)',
    rejected:  'var(--muted-3)',
  };

  return (
    <div>
      <div className="phead" style={{ marginBottom: 24 }}>
        <p className="eyebrow" style={{ margin: '0 0 12px' }}>
          <Users size={13} style={{ color: 'var(--amber)' }} /> Marketplace
        </p>
        <h2 style={{ fontSize: 34, lineHeight: '38px' }}>Manage Coaches</h2>
        <p className="sub" style={{ marginTop: 14, fontSize: 14.5 }}>
          Review applications, approve profiles and audit booked sessions.
        </p>
      </div>

      {/* Applications toggle */}
      <div className="card">
        <span className="accent" style={{ width: 56, background: applicationsOpen ? 'var(--green)' : 'var(--muted-3)' }} />
        <div className="cardhead">
          <div>
            <h3>Coach applications</h3>
            <p className="sub">
              {applicationsOpen
                ? 'Users can apply to become coaches.'
                : 'Applications are closed. Users will see a "closed" message.'}
            </p>
          </div>
          <button
            onClick={async () => {
              await setOpen({ open: !applicationsOpen });
              showToast(`Applications ${!applicationsOpen ? 'opened' : 'closed'}`, 'success');
            }}
            className={applicationsOpen ? 'chip on' : 'chip'}
            style={{ marginLeft: 'auto', height: 32, padding: '0 18px', fontWeight: 700, fontSize: 12 }}
          >
            {applicationsOpen ? 'Open' : 'Closed'}
          </button>
        </div>
      </div>

      {/* Coach profiles */}
      <section className="card" style={{ marginTop: 24 }}>
        <span className="accent" style={{ width: 56, background: 'var(--amber)' }} />
        <div className="cardhead">
          <div>
            <h3>All coach profiles</h3>
            <p className="sub">Every submitted coach profile and its review state</p>
          </div>
          <span className="chip" style={{ marginLeft: 'auto', height: 26, padding: '0 10px', fontSize: 11 }}>{all.length}</span>
        </div>
        {all.length === 0 ? (
          <p className="empty-line" style={{ padding: '34px 0 8px' }}>No coach applications yet.</p>
        ) : (
          <div style={{ marginTop: 18 }}>
            {all.map((c: any) => (
              <div
                key={c.id}
                className="inset flex items-center gap-4"
                style={{ marginBottom: 10, padding: '14px 16px' }}
              >
                {c.photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={c.photoUrl}
                    alt={c.displayName}
                    className="object-cover shrink-0"
                    style={{ width: 44, height: 44, borderRadius: 3, border: '1px solid var(--line)' }}
                  />
                ) : (
                  <div
                    className="flex items-center justify-center shrink-0"
                    style={{
                      width: 44, height: 44, borderRadius: 3, background: 'var(--amber)',
                      color: 'var(--ink)', fontFamily: 'var(--display)', fontWeight: 700, fontSize: 18,
                    }}
                  >
                    {c.displayName.charAt(0)}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>{c.displayName}</div>
                  <div className="truncate" style={{ marginTop: 4, fontSize: 11.5, color: 'var(--muted-2)' }}>
                    {c.headline} · ${c.hourlyRateUsd}/hr
                  </div>
                </div>
                <span
                  className="chip shrink-0"
                  style={{ height: 20, padding: '0 10px', fontSize: 9, fontWeight: 700, letterSpacing: '.04em', color: STATUS[c.status] }}
                >
                  {String(c.status).toUpperCase()}
                </span>
                <div className="flex items-center gap-1 shrink-0">
                  {c.status !== 'approved' && (
                    <button
                      onClick={async () => { await approve({ id: c.id }); showToast('Approved', 'success'); }}
                      style={iconBtn('var(--green)')}
                      title="Approve"
                    >
                      <Check size={15} />
                    </button>
                  )}
                  {c.status === 'approved' && (
                    <button
                      onClick={async () => { await suspend({ id: c.id }); showToast('Suspended', 'success'); }}
                      style={iconBtn('var(--amber)')}
                      title="Suspend"
                    >
                      <Pause size={15} />
                    </button>
                  )}
                  {c.status === 'pending' && (
                    <button
                      onClick={async () => { await reject({ id: c.id }); showToast('Rejected', 'success'); }}
                      style={iconBtn('var(--red)')}
                      title="Reject"
                    >
                      <X size={15} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Sessions */}
      <section className="card" style={{ marginTop: 24 }}>
        <span className="accent" style={{ width: 56, background: 'var(--teal)' }} />
        <div className="cardhead">
          <div>
            <h3>All sessions</h3>
            <p className="sub">Every coaching session booked on the platform</p>
          </div>
          <span className="chip" style={{ marginLeft: 'auto', height: 26, padding: '0 10px', fontSize: 11 }}>{sessions.length}</span>
        </div>
        {sessions.length === 0 ? (
          <p className="empty-line" style={{ padding: '34px 0 8px' }}>No sessions yet.</p>
        ) : (
          <div style={{ marginTop: 18 }}>
            {sessions.map((s: any) => (
              <div key={s.id} className="mrow">
                <Headphones size={14} className="ic" style={{ color: 'var(--teal)' }} />
                <div className="lb" style={{ marginLeft: 16 }}>
                  <p style={{ margin: 0, fontSize: 12.5, fontWeight: 700, color: 'var(--text)' }}>{s.clientName}</p>
                  <p style={{ margin: '3px 0 0', fontSize: 11, color: 'var(--muted-2)' }}>
                    {new Date(s.startsAt).toLocaleString()} · ${s.pricePaidUsd}
                  </p>
                </div>
                <span
                  className="chip"
                  style={{ marginLeft: 'auto', height: 20, padding: '0 10px', fontSize: 9, fontWeight: 700, letterSpacing: '.04em' }}
                >
                  {String(s.status).toUpperCase()}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
