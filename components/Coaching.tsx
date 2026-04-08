'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { useUser } from '@clerk/nextjs';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import {
  Headphones, ArrowLeft, ArrowRight, Star, Clock, Send, Check,
  Calendar, MessageCircle, Video, X, Loader2, UserPlus,
} from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/components/ui/Toast';

type View = 'catalog' | 'detail' | 'mine' | 'session';

const uid = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
const fmt = (iso: string) => {
  if (!iso) return '';
  return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
};

export default function Coaching() {
  const { user } = useUser();
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
    <div className="relative space-y-10">
      <div className="hero-glow" />

      <header className="flex items-end justify-between flex-wrap gap-4 anim-fade-up">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass text-xs font-medium text-[var(--muted-foreground)]">
            <Headphones size={12} /> 1-on-1 sessions
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-[var(--foreground)]">
            Talk to a <span className="gradient-text">trading coach</span>
          </h1>
          <p className="text-base text-[var(--muted-foreground)] max-w-xl">
            Hire a vetted coach for live video sessions. Book by the slot, message after, review when done.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {user && (
            <button
              onClick={() => setView('mine')}
              className="px-5 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--card)]/60 backdrop-blur text-sm font-medium hover:bg-[var(--muted)]/60 transition-all"
            >
              My sessions ({myClientSessions.length})
            </button>
          )}
          {user && (
            <Link
              href="/coach"
              className="px-5 py-2.5 rounded-xl bg-gradient-to-br from-teal-500 to-teal-700 text-white text-sm font-semibold shadow-lg shadow-teal-500/30 hover:shadow-teal-500/50 transition-all hover:-translate-y-0.5 flex items-center gap-2"
            >
              <UserPlus size={16} />
              {myCoachProfile ? 'Coach Hub' : 'Become a coach'}
            </Link>
          )}
        </div>
      </header>

      {coaches.length === 0 ? (
        <div className="relative overflow-hidden rounded-3xl border border-dashed border-[var(--border)] bg-[var(--card)]/40 backdrop-blur p-16 text-center">
          <div className="mx-auto mb-4 w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-500/20 to-emerald-500/10 flex items-center justify-center">
            <Headphones size={28} className="text-teal-400" />
          </div>
          <p className="text-[var(--foreground)] font-medium">No coaches available yet</p>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">Check back soon — we&apos;re onboarding the first cohort.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {coaches.map((c: any, idx: number) => (
            <article
              key={c.id}
              style={{ animationDelay: `${idx * 60}ms` }}
              className="group glass rounded-3xl card-lift anim-fade-up cursor-pointer overflow-hidden"
              onClick={() => { setCoachId(c.id); setView('detail'); }}
            >
              <div className="p-6 flex items-start gap-4">
                {c.photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={c.photoUrl} alt={c.displayName} className="w-16 h-16 rounded-2xl object-cover border border-[var(--border)]" />
                ) : (
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-500/30 to-emerald-500/10 flex items-center justify-center text-2xl font-bold text-white">
                    {c.displayName.charAt(0)}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-lg text-[var(--foreground)] tracking-tight truncate">{c.displayName}</h3>
                  <p className="text-xs text-[var(--muted-foreground)] truncate">{c.headline}</p>
                  {(c.reviewCount ?? 0) > 0 && (
                    <div className="flex items-center gap-1 mt-1 text-xs">
                      <Star size={12} className="text-amber-400 fill-amber-400" />
                      <span className="font-bold text-[var(--foreground)]">{c.avgRating?.toFixed(1)}</span>
                      <span className="text-[var(--muted-foreground)]">({c.reviewCount})</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="px-6 pb-4 flex flex-wrap gap-1.5">
                {(c.specialties as string[]).slice(0, 3).map((s) => (
                  <span key={s} className="text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-400 font-medium">{s}</span>
                ))}
              </div>

              <div className="px-6 py-4 border-t border-[var(--border)] flex items-center justify-between">
                <div className="text-sm">
                  <span className="font-bold text-[var(--foreground)]">${c.hourlyRateUsd}</span>
                  <span className="text-[var(--muted-foreground)]"> / hr · {c.sessionDurationMin}min</span>
                </div>
                <div className="flex items-center gap-1 text-sm font-medium text-teal-400 group-hover:gap-2 transition-all">
                  Book <ArrowRight size={14} />
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
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
        <Loader2 className="w-8 h-8 animate-spin text-[var(--muted-foreground)]" />
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
      <button onClick={onBack} className="flex items-center gap-2 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)]">
        <ArrowLeft size={16} /> Back to coaches
      </button>

      <div className="glass rounded-3xl p-6 sm:p-8 anim-fade-up">
        <div className="flex items-start gap-6 flex-wrap">
          {coach.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={coach.photoUrl} alt={coach.displayName} className="w-28 h-28 rounded-3xl object-cover border border-[var(--border)]" />
          ) : (
            <div className="w-28 h-28 rounded-3xl bg-gradient-to-br from-teal-500/30 to-emerald-500/10 flex items-center justify-center text-4xl font-bold text-white">
              {coach.displayName.charAt(0)}
            </div>
          )}
          <div className="flex-1 min-w-0 space-y-2">
            <h1 className="text-3xl font-bold tracking-tight text-[var(--foreground)]">{coach.displayName}</h1>
            <p className="text-[var(--muted-foreground)]">{coach.headline}</p>
            {(coach.reviewCount ?? 0) > 0 && (
              <div className="flex items-center gap-1.5 text-sm">
                <Star size={14} className="text-amber-400 fill-amber-400" />
                <span className="font-bold text-[var(--foreground)]">{coach.avgRating?.toFixed(1)}</span>
                <span className="text-[var(--muted-foreground)]">· {coach.reviewCount} reviews · {coach.totalSessions ?? 0} sessions</span>
              </div>
            )}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {(coach.specialties as string[]).map((s) => (
                <span key={s} className="text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-400 font-medium">{s}</span>
              ))}
            </div>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-[var(--foreground)]">${coach.hourlyRateUsd}<span className="text-base text-[var(--muted-foreground)]">/hr</span></div>
            <div className="text-xs text-[var(--muted-foreground)] mt-1">{coach.sessionDurationMin}-min session = ${totalPrice.toFixed(2)}</div>
          </div>
        </div>

        <div className="mt-6 pt-6 border-t border-[var(--border)] whitespace-pre-wrap text-[var(--foreground)]">
          {coach.bio}
        </div>
      </div>

      {/* Available slots */}
      <div className="glass rounded-3xl p-6 anim-fade-up" style={{ animationDelay: '80ms' }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-[var(--foreground)] flex items-center gap-2">
            <Calendar size={18} className="text-teal-400" /> Available slots
          </h2>
          <span className="text-xs text-[var(--muted-foreground)]">{coach.timezone}</span>
        </div>
        {slots.length === 0 ? (
          <p className="text-sm text-[var(--muted-foreground)] py-6 text-center">No open slots right now. Check back soon.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {slots.map((s: any) => (
              <button
                key={s.id}
                onClick={() => { setSelectedSlot(s); setShowBooking(true); }}
                className="px-3 py-2 rounded-xl border border-[var(--border)] hover:border-teal-400/50 hover:bg-teal-500/5 text-sm text-[var(--foreground)] text-left transition-all"
              >
                <div className="font-medium">{new Date(s.startsAt).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</div>
                <div className="text-xs text-[var(--muted-foreground)]">{new Date(s.startsAt).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}</div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Reviews */}
      {reviews.length > 0 && (
        <div className="glass rounded-3xl p-6 anim-fade-up space-y-4" style={{ animationDelay: '160ms' }}>
          <h2 className="text-lg font-bold text-[var(--foreground)]">Reviews</h2>
          {reviews.map((r: any) => (
            <div key={r.id} className="border-b border-[var(--border)] last:border-0 pb-4 last:pb-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium text-[var(--foreground)] text-sm">{r.clientName}</span>
                <div className="flex">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <Star key={n} size={12} className={n <= r.rating ? 'text-amber-400 fill-amber-400' : 'text-[var(--muted-foreground)]/30'} />
                  ))}
                </div>
              </div>
              <p className="text-sm text-[var(--muted-foreground)]">{r.comment}</p>
            </div>
          ))}
        </div>
      )}

      {/* Booking modal */}
      {showBooking && selectedSlot && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="glass rounded-3xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-[var(--foreground)]">Book session</h2>
              <button onClick={() => setShowBooking(false)} className="p-1 rounded hover:bg-[var(--muted)]"><X size={18} /></button>
            </div>
            <div className="text-sm">
              <div className="text-[var(--muted-foreground)]">When</div>
              <div className="font-medium text-[var(--foreground)]">{fmt(selectedSlot.startsAt)} – {new Date(selectedSlot.endsAt).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}</div>
            </div>
            <div className="text-sm">
              <div className="text-[var(--muted-foreground)]">Total</div>
              <div className="font-bold text-[var(--foreground)] text-lg">${totalPrice.toFixed(2)}</div>
            </div>
            <div>
              <div className="text-xs font-medium text-[var(--muted-foreground)] mb-1">What do you want to work on?</div>
              <textarea
                value={goals}
                onChange={(e) => setGoals(e.target.value)}
                rows={4}
                placeholder="Specific goals, problems, or questions..."
                className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-sm"
              />
            </div>
            <button
              disabled={busy || !goals.trim()}
              onClick={handleBook}
              className="w-full py-2.5 rounded-xl bg-gradient-to-br from-teal-500 to-teal-700 text-white text-sm font-semibold shadow-lg shadow-teal-500/30 hover:shadow-teal-500/50 transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:transform-none"
            >
              {busy ? 'Booking…' : `Confirm & pay $${totalPrice.toFixed(2)}`}
            </button>
            <p className="text-[10px] text-[var(--muted-foreground)] text-center">
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
      <button onClick={onBack} className="flex items-center gap-2 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)]">
        <ArrowLeft size={16} /> Back to coaches
      </button>
      <h1 className="text-3xl font-bold tracking-tight text-[var(--foreground)]">My sessions</h1>
      {sessions.length === 0 ? (
        <p className="text-sm text-[var(--muted-foreground)]">You haven&apos;t booked any sessions yet.</p>
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
    confirmed:   'bg-teal-500/15 text-teal-400',
    in_progress: 'bg-blue-500/15 text-blue-400',
    completed:   'bg-emerald-500/15 text-emerald-400',
    cancelled:   'bg-[var(--muted)]/40 text-[var(--muted-foreground)]',
    disputed:    'bg-amber-500/15 text-amber-400',
    pending:     'bg-amber-500/15 text-amber-400',
  };
  return (
    <button
      onClick={onOpen}
      className="w-full text-left glass rounded-2xl p-4 flex items-center gap-3 card-lift"
    >
      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-teal-500/20 to-emerald-500/10 flex items-center justify-center">
        <Calendar size={20} className="text-teal-400" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-[var(--foreground)]">{fmt(session.startsAt)}</div>
        <div className="text-xs text-[var(--muted-foreground)]">{session.sessionDurationMin}-min · ${session.pricePaidUsd.toFixed(2)}</div>
      </div>
      <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full ${STATUS_COLORS[session.status]}`}>
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
        <Loader2 className="w-8 h-8 animate-spin text-[var(--muted-foreground)]" />
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
      <button onClick={onBack} className="flex items-center gap-2 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)]">
        <ArrowLeft size={16} /> Back
      </button>

      {/* Session header */}
      <div className="glass rounded-3xl p-6">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <div className="text-xs uppercase tracking-wider text-[var(--muted-foreground)] mb-1">Session</div>
            <h1 className="text-2xl font-bold text-[var(--foreground)]">{fmt(session.startsAt)}</h1>
            <p className="text-sm text-[var(--muted-foreground)] mt-1">
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
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-br from-teal-500 to-teal-700 text-white text-sm font-semibold shadow-lg shadow-teal-500/30"
              >
                <Video size={16} /> Join call
              </a>
            )}
            {session.status !== 'cancelled' && session.status !== 'completed' && (
              <button
                onClick={async () => {
                  if (!confirm('Cancel this session?')) return;
                  await cancel({ id: sessionId });
                  showToast('Session cancelled', 'success');
                }}
                className="px-4 py-2 rounded-xl border border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--red)] text-sm"
              >
                Cancel
              </button>
            )}
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-[var(--border)] text-sm">
          <div className="text-xs uppercase tracking-wider text-[var(--muted-foreground)] mb-1">Goals</div>
          <p className="text-[var(--foreground)]">{session.clientGoals}</p>
        </div>

        {/* Coach controls */}
        {role === 'coach' && session.status !== 'cancelled' && session.status !== 'completed' && (
          <div className="mt-4 pt-4 border-t border-[var(--border)] space-y-3">
            {!session.meetingUrl && (
              <div className="flex gap-2">
                <input
                  value={meetingUrlInput}
                  onChange={(e) => setMeetingUrlInput(e.target.value)}
                  placeholder="Paste meeting URL (Zoom, Meet, Daily.co...)"
                  className="flex-1 px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-sm"
                />
                <button
                  onClick={async () => {
                    if (!meetingUrlInput) return;
                    await setMeetingUrl({ id: sessionId, meetingUrl: meetingUrlInput });
                    setMeetingUrlInput('');
                    showToast('Meeting URL set', 'success');
                  }}
                  className="px-4 py-2 rounded-lg bg-teal-500 text-white text-sm font-medium"
                >
                  Save
                </button>
              </div>
            )}
            {session.status === 'confirmed' && session.meetingUrl && (
              <button
                onClick={() => markInProgress({ id: sessionId })}
                className="w-full py-2 rounded-lg bg-blue-500 text-white text-sm font-medium"
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
                  className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-sm"
                />
                <button
                  onClick={async () => {
                    await completeSession({ id: sessionId, coachNotes });
                    showToast('Session completed — funds released', 'success');
                  }}
                  className="w-full py-2 rounded-lg bg-emerald-500 text-white text-sm font-medium"
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
          className="w-full py-3 glass rounded-2xl text-sm font-medium text-[var(--foreground)] hover:bg-[var(--muted)]/40"
        >
          Leave a review →
        </button>
      )}
      {canReview && showReviewForm && (
        <div className="glass rounded-3xl p-6 space-y-3">
          <h3 className="font-bold text-[var(--foreground)]">How was your session?</h3>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} onClick={() => setReviewRating(n)}>
                <Star size={28} className={n <= reviewRating ? 'text-amber-400 fill-amber-400' : 'text-[var(--muted-foreground)]/30'} />
              </button>
            ))}
          </div>
          <textarea
            value={reviewComment}
            onChange={(e) => setReviewComment(e.target.value)}
            placeholder="Share your experience..."
            rows={3}
            className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-sm"
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
            className="w-full py-2 rounded-xl bg-gradient-to-br from-teal-500 to-teal-700 text-white text-sm font-semibold disabled:opacity-50"
          >
            Submit review
          </button>
        </div>
      )}

      {/* Messages */}
      <div className="glass rounded-3xl p-6 flex flex-col h-[500px]">
        <h3 className="font-bold text-[var(--foreground)] flex items-center gap-2 mb-3">
          <MessageCircle size={16} /> Messages
        </h3>
        <div className="flex-1 overflow-y-auto space-y-3 pr-2">
          {messages.length === 0 ? (
            <p className="text-sm text-[var(--muted-foreground)] text-center py-8">No messages yet. Say hello!</p>
          ) : (
            messages.map((m: any) => {
              const mine = m.fromUserId === user?.id;
              return (
                <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[75%] rounded-2xl px-4 py-2 ${
                    mine ? 'bg-gradient-to-br from-teal-500 to-teal-700 text-white' : 'bg-[var(--muted)]/40 text-[var(--foreground)]'
                  }`}>
                    {!mine && <div className="text-[10px] font-medium opacity-70 mb-0.5">{m.fromName}</div>}
                    <div className="text-sm whitespace-pre-wrap">{m.body}</div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>
        <div className="pt-3 border-t border-[var(--border)] mt-3 flex gap-2">
          <input
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            placeholder="Type a message..."
            className="flex-1 px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-xl text-sm"
          />
          <button
            onClick={handleSend}
            disabled={!body.trim()}
            className="px-4 py-2 rounded-xl bg-teal-500 text-white disabled:opacity-50"
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
