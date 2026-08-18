'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { useUser } from '@clerk/nextjs';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import {
  Headphones, ArrowLeft, ArrowRight, Star, Clock, Send, Check,
  Calendar, MessageCircle, Video, X, Loader2, UserPlus, Users,
} from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/components/ui/Toast';
import CoachingCohorts from './CoachingCohorts';

type View = 'catalog' | 'detail' | 'mine' | 'session';
type CoachingTab = 'sessions' | 'cohorts';

const uid = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
const fmt = (iso: string) => {
  if (!iso) return '';
  return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
};

// ATLAS form-control chrome (matches .field .box / .codebox in app/atlas-dashboard.css)
const atlasField: React.CSSProperties = {
  border: '1px solid var(--line)',
  borderRadius: 2,
  background: 'var(--panel-2)',
  color: 'var(--text)',
  padding: '10px 14px',
  font: 'inherit',
  fontSize: 13,
  outline: 'none',
};

export default function Coaching() {
  const { user } = useUser();
  const [tab, setTab] = useState<CoachingTab>('sessions');
  const [view, setView] = useState<View>('catalog');
  const [coachId, setCoachId] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);

  const coaches = useQuery(api.coaches.listApproved) ?? [];
  const myClientSessions = useQuery(api.coachSessions.myClientSessions) ?? [];
  const myCoachProfile = useQuery(api.coaches.getMyCoachProfile);

  if (view === 'detail' && coachId) {
    return (
      <CoachDetail
        coachId={coachId}
        onBack={() => { setCoachId(null); setView('catalog'); }}
        onBooked={(sid) => { setSessionId(sid); setView('session'); }}
      />
    );
  }

  if (view === 'session' && sessionId) {
    return (
      <SessionView
        sessionId={sessionId}
        role="client"
        onBack={() => { setSessionId(null); setView('mine'); }}
      />
    );
  }

  if (view === 'mine') {
    return (
      <MySessionsView
        sessions={myClientSessions}
        onBack={() => setView('catalog')}
        onOpen={(sid) => { setSessionId(sid); setView('session'); }}
      />
    );
  }

  return (
    <div>
      <div className="phead pwrap">
        <p className="eyebrow">
          <Headphones size={13} /> {tab === 'sessions' ? '1-on-1 sessions' : 'Group cohorts'}
        </p>
        <h2>{tab === 'sessions' ? 'Talk to a trading coach' : 'Join a trading cohort'}</h2>
        <p className="sub">
          {tab === 'sessions'
            ? 'Hire a vetted coach for live video sessions. Book by the slot, message after, review when done.'
            : 'Weekly group calls hosted by vetted coaches. Lower price than 1:1, peer accountability included.'}
        </p>
        <div className="actions">
          {user && tab === 'sessions' && (
            <button type="button" onClick={() => setView('mine')} className="btn-g" style={{ height: 44 }}>
              My sessions ({myClientSessions.length})
            </button>
          )}
          {user && (
            <Link href="/coach" className="btn-a" style={{ height: 44 }}>
              <UserPlus size={14} />
              {myCoachProfile ? 'Coach Hub' : 'Become a coach'}
            </Link>
          )}
        </div>
      </div>

      {/* ── Tab toggle: 1-on-1 sessions vs Cohorts ── */}
      <div className="tabs line" style={{ marginBottom: 42 }}>
        <button
          onClick={() => setTab('sessions')}
          className={tab === 'sessions' ? 'on' : undefined}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
        >
          <Headphones size={13} /> 1-on-1 Sessions
        </button>
        <button
          onClick={() => setTab('cohorts')}
          className={tab === 'cohorts' ? 'on' : undefined}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
        >
          <Users size={13} /> Cohorts
        </button>
      </div>

      {tab === 'cohorts' && <CoachingCohorts />}

      {tab === 'sessions' && (coaches.length === 0 ? (
        <div className="blank" style={{ minHeight: 300 }}>
          <span className="corner" style={{ left: 0, top: 0, borderRight: 0, borderBottom: 0 }} />
          <span className="corner" style={{ right: 0, top: 0, borderLeft: 0, borderBottom: 0 }} />
          <span className="corner" style={{ left: 0, bottom: 0, borderRight: 0, borderTop: 0 }} />
          <span className="corner" style={{ right: 0, bottom: 0, borderLeft: 0, borderTop: 0 }} />
          <span className="badge" style={{ border: '1px solid rgba(47,211,196,.5)', color: '#00ffe8' }}>
            <Headphones size={24} />
          </span>
          <h4>No coaches available yet</h4>
          <p>Check back soon — we&apos;re onboarding the first cohort.</p>
        </div>
      ) : (
        <div className="split-3">
          {coaches.map((c: any) => (
            <article
              key={c.id}
              className="provider"
              style={{ cursor: 'pointer', color: 'var(--amber)' }}
              onClick={() => { setCoachId(c.id); setView('detail'); }}
            >
              <span className="accent" style={{ background: 'var(--amber)' }} />
              {c.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={c.photoUrl}
                  alt={c.displayName}
                  className="av"
                  style={{ display: 'block', objectFit: 'cover' }}
                />
              ) : (
                <div
                  className="av"
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: 'var(--display)', fontWeight: 700, fontSize: 26, color: 'var(--text)',
                  }}
                >
                  {c.displayName.charAt(0)}
                </div>
              )}
              <h4>{c.displayName}</h4>
              <p className="meta" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.headline}</p>

              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center', marginTop: 14 }}>
                {(c.specialties as string[]).slice(0, 3).map((s) => (
                  <span key={s} className="chip" style={{ height: 22, padding: '0 10px', fontSize: '9.5px', letterSpacing: '.04em', textTransform: 'uppercase' }}>{s}</span>
                ))}
              </div>

              <div className="big">
                <b style={{ color: 'var(--text)' }}>${c.hourlyRateUsd}</b>
                <span>PER HOUR</span>
              </div>

              <div className="row3">
                <div>
                  <b style={{ color: 'var(--text)' }}>{(c.reviewCount ?? 0) > 0 ? c.avgRating?.toFixed(1) : '--'}</b>
                  <span>RATING</span>
                </div>
                <div>
                  <b style={{ color: 'var(--text)' }}>{c.reviewCount ?? 0}</b>
                  <span>REVIEWS</span>
                </div>
                <div>
                  <b style={{ color: 'var(--text)' }}>{c.sessionDurationMin}</b>
                  <span>MINUTES</span>
                </div>
              </div>

              <div className="follow">
                Book <ArrowRight size={14} />
              </div>
            </article>
          ))}
        </div>
      ))}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────
function CoachDetail({
  coachId, onBack, onBooked,
}: {
  coachId: string;
  onBack: () => void;
  onBooked: (sessionId: string) => void;
}) {
  const { user } = useUser();
  const { showToast } = useToast();
  const coach = useQuery(api.coaches.getById, { id: coachId });
  const slots = useQuery(api.coaches.listSlotsForCoach, { coachId, onlyUnbooked: true }) ?? [];
  const reviews = useQuery(api.coachReviews.listForCoach, { coachId }) ?? [];
  const bookSession = useMutation(api.coachSessions.bookSessionStub);

  const [showBooking, setShowBooking] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<any | null>(null);
  const [goals, setGoals] = useState('');
  const [busy, setBusy] = useState(false);

  if (!coach) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={26} className="animate-spin" style={{ color: 'var(--muted)' }} />
      </div>
    );
  }

  const totalPrice = coach.hourlyRateUsd * (coach.sessionDurationMin / 60);

  const handleBook = async () => {
    if (!selectedSlot || !goals.trim() || !user) return;
    setBusy(true);
    try {
      const sessionId = uid();
      await bookSession({
        id: sessionId,
        coachId,
        slotId: selectedSlot.id,
        clientName: user.fullName || user.username || 'Anonymous',
        clientImage: user.imageUrl ?? undefined,
        clientGoals: goals,
      });
      showToast('Session booked!', 'success');
      setShowBooking(false);
      onBooked(sessionId);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Booking failed', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <button onClick={onBack} className="btn-g" style={{ height: 36 }}>
        <ArrowLeft size={12} /> Back to coaches
      </button>

      <div className="card pwrap" style={{ padding: '28px 28px 24px' }}>
        <span className="accent" style={{ width: 56, background: 'var(--amber)' }} />
        <div className="flex items-start gap-6 flex-wrap">
          {coach.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={coach.photoUrl} alt={coach.displayName} style={{ width: 96, height: 96, borderRadius: 3, objectFit: 'cover', border: '1px solid var(--line)', flex: 'none' }} />
          ) : (
            <div
              className="flex items-center justify-center"
              style={{ width: 96, height: 96, borderRadius: 3, background: 'var(--amber)', color: 'var(--ink)', fontFamily: 'var(--display)', fontWeight: 700, fontSize: 36, flex: 'none' }}
            >
              {coach.displayName.charAt(0)}
            </div>
          )}
          <div className="flex-1 min-w-0 space-y-2">
            <h3 style={{ fontSize: 30, lineHeight: '33px' }}>{coach.displayName}</h3>
            <p style={{ margin: 0, fontSize: 14, color: 'var(--muted)' }}>{coach.headline}</p>
            {(coach.reviewCount ?? 0) > 0 && (
              <div className="flex items-center gap-1.5" style={{ fontSize: '12.5px', color: 'var(--muted-2)' }}>
                <Star size={14} style={{ color: 'var(--amber)', fill: 'currentColor' }} />
                <b style={{ color: 'var(--text)' }}>{coach.avgRating?.toFixed(1)}</b>
                <span>· {coach.reviewCount} reviews · {coach.totalSessions ?? 0} sessions</span>
              </div>
            )}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {(coach.specialties as string[]).map((s) => (
                <span key={s} className="chip" style={{ height: 22, padding: '0 10px', fontSize: '9.5px', letterSpacing: '.04em', textTransform: 'uppercase' }}>{s}</span>
              ))}
            </div>
          </div>
          <div className="inset" style={{ textAlign: 'right' }}>
            <b style={{ display: 'block', fontFamily: 'var(--mono)', fontWeight: 500, fontSize: 30, lineHeight: '38px', color: 'var(--text)' }}>
              ${coach.hourlyRateUsd}<span style={{ fontSize: 13, color: 'var(--muted-2)' }}>/hr</span>
            </b>
            <span style={{ display: 'block', fontSize: 11, color: 'var(--muted-2)' }}>{coach.sessionDurationMin}-min session = ${totalPrice.toFixed(2)}</span>
          </div>
        </div>

        <div className="mt-6 pt-6 whitespace-pre-wrap" style={{ borderTop: '1px solid var(--line)', fontSize: '13px', lineHeight: '20px', color: 'var(--muted)' }}>
          {coach.bio}
        </div>
      </div>

      {/* Available slots */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="flex items-center gap-2">
            <Calendar size={16} style={{ color: 'var(--amber)' }} /> Available slots
          </h3>
          <span className="lbl b95">{coach.timezone}</span>
        </div>
        {slots.length === 0 ? (
          <p className="empty-line">No open slots right now. Check back soon.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {slots.map((s: any) => (
              <button
                key={s.id}
                onClick={() => { setSelectedSlot(s); setShowBooking(true); }}
                className="inset"
                style={{ textAlign: 'left', cursor: 'pointer' }}
              >
                <div style={{ fontWeight: 700, fontSize: 12.5, color: 'var(--text)' }}>{new Date(s.startsAt).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</div>
                <div style={{ marginTop: 4, fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--muted-2)' }}>{new Date(s.startsAt).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}</div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Reviews */}
      {reviews.length > 0 && (
        <div className="card space-y-4">
          <h3>Reviews</h3>
          {reviews.map((r: any) => (
            <div key={r.id} className="last:border-0 pb-4 last:pb-0" style={{ borderBottom: '1px solid var(--hair)' }}>
              <div className="flex items-center gap-2 mb-1">
                <span style={{ fontWeight: 700, fontSize: 12.5, color: 'var(--text)' }}>{r.clientName}</span>
                <div className="flex">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <Star key={n} size={12} style={n <= r.rating ? { color: 'var(--amber)', fill: 'currentColor' } : { color: 'var(--muted-4)' }} />
                  ))}
                </div>
              </div>
              <p style={{ margin: 0, fontSize: 12.5, lineHeight: '19px', color: 'var(--muted)' }}>{r.comment}</p>
            </div>
          ))}
        </div>
      )}

      {/* Booking modal */}
      {showBooking && selectedSlot && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="card max-w-md w-full space-y-4">
            <div className="flex items-center justify-between">
              <h3>Book session</h3>
              <button onClick={() => setShowBooking(false)} className="chip" style={{ width: 28, height: 28, padding: 0, justifyContent: 'center' }}><X size={14} /></button>
            </div>
            <div>
              <p className="lbl">WHEN</p>
              <div style={{ marginTop: 6, fontSize: 13, color: 'var(--text)' }}>{fmt(selectedSlot.startsAt)} – {new Date(selectedSlot.endsAt).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}</div>
            </div>
            <div>
              <p className="lbl">TOTAL</p>
              <div style={{ marginTop: 6, fontFamily: 'var(--mono)', fontWeight: 500, fontSize: 20, color: 'var(--text)' }}>${totalPrice.toFixed(2)}</div>
            </div>
            <div>
              <p className="lbl" style={{ marginBottom: 9 }}>WHAT DO YOU WANT TO WORK ON?</p>
              <textarea
                value={goals}
                onChange={(e) => setGoals(e.target.value)}
                rows={4}
                placeholder="Specific goals, problems, or questions..."
                className="w-full" style={atlasField}
              />
            </div>
            <button
              disabled={busy || !goals.trim()}
              onClick={handleBook}
              className="btn-a w-full disabled:opacity-50"
            >
              {busy ? 'Booking…' : `Confirm & pay $${totalPrice.toFixed(2)}`}
            </button>
            <p style={{ margin: 0, textAlign: 'center', fontSize: 10.5, color: 'var(--muted-2)' }}>
              Stub mode: payment is recorded automatically. Real Stripe Connect to be wired later.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────
export function MySessionsView({
  sessions, onBack, onOpen,
}: {
  sessions: any[];
  onBack: () => void;
  onOpen: (id: string) => void;
}) {
  return (
    <div className="space-y-6">
      <button onClick={onBack} className="btn-g" style={{ height: 36 }}>
        <ArrowLeft size={12} /> Back to coaches
      </button>
      <div className="phead"><h2>My sessions</h2></div>
      {sessions.length === 0 ? (
        <p className="empty-line">You haven&apos;t booked any sessions yet.</p>
      ) : (
        <div className="space-y-2">
          {sessions.map((s) => <SessionRow key={s.id} session={s} onOpen={() => onOpen(s.id)} />)}
        </div>
      )}
    </div>
  );
}

export function SessionRow({ session, onOpen }: { session: any; onOpen: () => void }) {
  const STATUS_COLORS: Record<string, string> = {
    confirmed:   'var(--pink)',
    in_progress: 'var(--teal)',
    completed:   'var(--green)',
    cancelled:   'var(--muted-2)',
    disputed:    'var(--red)',
    pending:     'var(--amber)',
  };
  return (
    <button
      onClick={onOpen}
      className="card w-full text-left flex items-center gap-3"
      style={{ padding: '14px 18px' }}
    >
      <div className="inset flex items-center justify-center" style={{ width: 44, height: 44, padding: 0, flex: 'none' }}>
        <Calendar size={18} style={{ color: 'var(--amber)' }} />
      </div>
      <div className="flex-1 min-w-0">
        <div style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>{fmt(session.startsAt)}</div>
        <div style={{ marginTop: 5, fontSize: 11.5, color: 'var(--muted-2)' }}>{session.sessionDurationMin}-min · ${session.pricePaidUsd.toFixed(2)}</div>
      </div>
      <span
        className="chip"
        style={{
          flex: 'none', height: 20, padding: '0 10px', fontWeight: 700, fontSize: 9,
          letterSpacing: '.04em', textTransform: 'uppercase',
          color: STATUS_COLORS[session.status], borderColor: STATUS_COLORS[session.status],
        }}
      >
        {session.status.replace('_', ' ')}
      </span>
    </button>
  );
}

// ──────────────────────────────────────────────────────────────────────
export function SessionView({
  sessionId, role, onBack,
}: {
  sessionId: string;
  role: 'client' | 'coach';
  onBack: () => void;
}) {
  const { user } = useUser();
  const { showToast } = useToast();
  const session = useQuery(api.coachSessions.getSession, { id: sessionId });
  const messages = useQuery(api.coachMessages.listForSession, { sessionId }) ?? [];
  const myReviews = useQuery(api.coachReviews.listForCoach, { coachId: session?.coachId ?? '' }) ?? [];

  const send = useMutation(api.coachMessages.send);
  const markRead = useMutation(api.coachMessages.markAllRead);
  const cancel = useMutation(api.coachSessions.cancelSession);
  const setMeetingUrl = useMutation(api.coachSessions.setMeetingUrl);
  const markInProgress = useMutation(api.coachSessions.markInProgress);
  const completeSession = useMutation(api.coachSessions.completeSession);
  const submitReview = useMutation(api.coachReviews.submit);

  const [body, setBody] = useState('');
  const [meetingUrlInput, setMeetingUrlInput] = useState('');
  const [coachNotes, setCoachNotes] = useState('');
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [showReviewForm, setShowReviewForm] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages.length]);
  useEffect(() => {
    if (session) markRead({ sessionId }).catch(() => {});
  }, [session, sessionId, markRead]);

  if (!session) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={26} className="animate-spin" style={{ color: 'var(--muted)' }} />
      </div>
    );
  }

  const myReview = myReviews.find((r: any) => r.sessionId === sessionId);
  const canReview = role === 'client' && session.status === 'completed' && !myReview;

  const handleSend = async () => {
    if (!body.trim() || !user) return;
    await send({
      id: uid(),
      sessionId,
      body,
      fromName: user.fullName || user.username || 'Anonymous',
      fromImage: user.imageUrl ?? undefined,
    });
    setBody('');
  };

  return (
    <div className="space-y-6">
      <button onClick={onBack} className="btn-g" style={{ height: 36 }}>
        <ArrowLeft size={12} /> Back
      </button>

      {/* Session header */}
      <div className="card pwrap">
        <span className="accent" style={{ width: 56, background: 'var(--amber)' }} />
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <p className="lbl">SESSION</p>
            <h3 style={{ marginTop: 9 }}>{fmt(session.startsAt)}</h3>
            <p style={{ margin: '8px 0 0', fontSize: 12.5, color: 'var(--muted)' }}>
              {session.sessionDurationMin} minutes · ${session.pricePaidUsd.toFixed(2)} ·{' '}
              <span className="capitalize">{session.status.replace('_', ' ')}</span>
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {session.meetingUrl && session.status !== 'cancelled' && session.status !== 'completed' && (
              <a
                href={session.meetingUrl}
                target="_blank"
                rel="noreferrer"
                className="btn-a"
              >
                <Video size={14} /> Join call
              </a>
            )}
            {session.status !== 'cancelled' && session.status !== 'completed' && (
              <button
                onClick={async () => {
                  if (!confirm('Cancel this session?')) return;
                  await cancel({ id: sessionId });
                  showToast('Session cancelled', 'success');
                }}
                className="btn-g"
              >
                Cancel
              </button>
            )}
          </div>
        </div>

        <div className="mt-4 pt-4 text-sm" style={{ borderTop: '1px solid var(--line)' }}>
          <p className="lbl" style={{ marginBottom: 6 }}>GOALS</p>
          <p style={{ margin: 0, color: 'var(--text)' }}>{session.clientGoals}</p>
        </div>

        {/* Coach controls */}
        {role === 'coach' && session.status !== 'cancelled' && session.status !== 'completed' && (
          <div className="mt-4 pt-4 space-y-3" style={{ borderTop: '1px solid var(--line)' }}>
            {!session.meetingUrl && (
              <div className="flex gap-2">
                <input
                  value={meetingUrlInput}
                  onChange={(e) => setMeetingUrlInput(e.target.value)}
                  placeholder="Paste meeting URL (Zoom, Meet, Daily.co...)"
                  className="flex-1 min-w-0" style={atlasField}
                />
                <button
                  onClick={async () => {
                    if (!meetingUrlInput) return;
                    await setMeetingUrl({ id: sessionId, meetingUrl: meetingUrlInput });
                    setMeetingUrlInput('');
                    showToast('Meeting URL set', 'success');
                  }}
                  className="btn-a"
                >
                  Save
                </button>
              </div>
            )}
            {session.status === 'confirmed' && session.meetingUrl && (
              <button
                onClick={() => markInProgress({ id: sessionId })}
                className="btn-a w-full"
              >
                Start session
              </button>
            )}
            {session.status === 'in_progress' && (
              <div className="space-y-2">
                <textarea
                  value={coachNotes}
                  onChange={(e) => setCoachNotes(e.target.value)}
                  placeholder="Post-session notes (private to you)"
                  rows={3}
                  className="w-full" style={atlasField}
                />
                <button
                  onClick={async () => {
                    await completeSession({ id: sessionId, coachNotes });
                    showToast('Session completed — funds released', 'success');
                  }}
                  className="btn-a w-full"
                >
                  Mark as completed
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Review form (client, after completed) */}
      {canReview && !showReviewForm && (
        <button
          onClick={() => setShowReviewForm(true)}
          className="btn-g w-full"
        >
          Leave a review →
        </button>
      )}
      {canReview && showReviewForm && (
        <div className="card space-y-3">
          <h3>How was your session?</h3>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} onClick={() => setReviewRating(n)}>
                <Star size={28} style={n <= reviewRating ? { color: 'var(--amber)', fill: 'currentColor' } : { color: 'var(--muted-4)' }} />
              </button>
            ))}
          </div>
          <textarea
            value={reviewComment}
            onChange={(e) => setReviewComment(e.target.value)}
            placeholder="Share your experience..."
            rows={3}
            className="w-full" style={atlasField}
          />
          <button
            disabled={!reviewComment.trim()}
            onClick={async () => {
              await submitReview({
                id: uid(),
                sessionId,
                rating: reviewRating,
                comment: reviewComment,
                clientName: user?.fullName || user?.username || 'Anonymous',
              });
              showToast('Review submitted!', 'success');
              setShowReviewForm(false);
            }}
            className="btn-a w-full disabled:opacity-50"
          >
            Submit review
          </button>
        </div>
      )}

      {/* Messages */}
      <div className="card flex flex-col h-[500px]">
        <h3 className="flex items-center gap-2 mb-3">
          <MessageCircle size={16} style={{ color: 'var(--amber)' }} /> Messages
        </h3>
        <div className="flex-1 overflow-y-auto space-y-3 pr-2">
          {messages.length === 0 ? (
            <p className="empty-line">No messages yet. Say hello!</p>
          ) : (
            messages.map((m: any) => {
              const mine = m.fromUserId === user?.id;
              return (
                <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className="max-w-[75%] px-4 py-2"
                    style={mine
                      ? { borderRadius: 2, background: 'var(--amber)', color: 'var(--ink)' }
                      : { borderRadius: 2, background: 'var(--panel-2)', border: '1px solid var(--line)', color: 'var(--text)' }}
                  >
                    {!mine && <div className="text-[10px] font-medium opacity-70 mb-0.5">{m.fromName}</div>}
                    <div className="whitespace-pre-wrap" style={{ fontSize: 12.5, lineHeight: '19px' }}>{m.body}</div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>
        <div className="pt-3 mt-3 flex gap-2" style={{ borderTop: '1px solid var(--line)' }}>
          <input
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            placeholder="Type a message..."
            className="flex-1 min-w-0" style={atlasField}
          />
          <button
            onClick={handleSend}
            disabled={!body.trim()}
            className="btn-a disabled:opacity-50"
          >
            <Send size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
