'use client';

import { useState } from 'react';
import { useUser } from '@clerk/nextjs';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Users, Calendar, DollarSign, Plus, X, Check, Loader2, Star } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';

type Cohort = {
  _id: string;
  id: string;
  coachId: string;
  coachUserId: string;
  coachName: string;
  coachPhotoUrl?: string;
  name: string;
  description: string;
  schedule: string;
  nextSessionAt?: string;
  capacity: number;
  monthlyPriceUsd: number;
  isActive: boolean;
  memberCount: number;
  tags: string[];
  coverImage?: string;
};

const fmt = (iso?: string) => {
  if (!iso) return '';
  return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
};

export default function CoachingCohorts() {
  const { user } = useUser();
  const cohorts = useQuery(api.cohorts.listOpen) ?? [];
  const myMemberships = useQuery(api.cohorts.myCohorts) ?? [];
  const myCoachProfile = useQuery(api.coaches.getMyCoachProfile);
  const myCoachCohorts = useQuery(api.cohorts.myCohortsAsCoach) ?? [];

  const [showCreate, setShowCreate] = useState(false);

  const memberCohortIds = new Set(myMemberships.map((m: any) => m.cohort?.id).filter(Boolean));

  return (
    <div className="space-y-10">
      {/* ── My Cohorts (if any) ── */}
      {myMemberships.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold tracking-tight">Your cohorts</h2>
            <span className="text-xs text-[var(--muted-foreground)]">{myMemberships.length} active</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {myMemberships.map(({ cohort, membership }: any) => (
              <MyCohortCard key={cohort.id} cohort={cohort} membership={membership} />
            ))}
          </div>
        </section>
      )}

      {/* ── Coach-side: cohorts I host ── */}
      {myCoachProfile && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold tracking-tight">Cohorts you host</h2>
            <button
              onClick={() => setShowCreate(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-orange-400 to-amber-400 text-slate-900 text-sm font-semibold shadow-[0_0_20px_-4px_rgba(251,146,60,0.6)] hover:from-orange-300 hover:to-amber-300 transition-all"
            >
              <Plus size={16} /> New cohort
            </button>
          </div>
          {myCoachCohorts.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[var(--border)] p-8 text-center text-sm text-[var(--muted-foreground)]">
              You haven&apos;t created any cohorts yet. Tap <strong>New cohort</strong> to host your first group program.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {myCoachCohorts.map((c: any) => <CoachCohortCard key={c.id} cohort={c} />)}
            </div>
          )}
        </section>
      )}

      {/* ── Public catalog ── */}
      <section className="space-y-4">
        <div className="flex items-end justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">
              Open <span className="aurora-text-static">cohorts</span>
            </h2>
            <p className="text-sm text-[var(--muted-foreground)] mt-1">
              Weekly group calls hosted by vetted coaches. Lower price than 1:1, peer accountability included.
            </p>
          </div>
          <span className="text-xs text-[var(--muted-foreground)]">{cohorts.length} available</span>
        </div>

        {cohorts.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[var(--border)] p-12 text-center">
            <Users size={32} className="mx-auto text-[var(--muted-foreground)] mb-3" />
            <p className="text-[var(--foreground)] font-medium">No cohorts available yet</p>
            <p className="text-sm text-[var(--muted-foreground)] mt-1">
              Check back soon — coaches are setting up their first programs.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {cohorts.map((c: Cohort) => (
              <CohortCard
                key={c.id}
                cohort={c}
                alreadyMember={memberCohortIds.has(c.id)}
                userName={user?.fullName ?? user?.username ?? 'Anonymous'}
                userImage={user?.imageUrl}
              />
            ))}
          </div>
        )}
      </section>

      {showCreate && (
        <CreateCohortModal onClose={() => setShowCreate(false)} />
      )}
    </div>
  );
}

// ─── My Cohort card (member-side) ───────────────────────────────────
function MyCohortCard({ cohort, membership }: { cohort: Cohort; membership: any }) {
  const leave = useMutation(api.cohorts.leave);
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  const handleLeave = async () => {
    if (!confirm(`Leave "${cohort.name}"? Your access stays until the end of the current billing period.`)) return;
    setBusy(true);
    try {
      await leave({ cohortId: cohort.id });
      toast.showToast('Cohort cancelled — access stays until period end');
    } catch (e) {
      toast.showToast((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)]/70 backdrop-blur p-5 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          {cohort.coachPhotoUrl ? (
            <img src={cohort.coachPhotoUrl} alt={cohort.coachName} className="w-10 h-10 rounded-full object-cover" />
          ) : (
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-500 to-orange-400 flex items-center justify-center text-sm font-bold text-slate-900">
              {cohort.coachName.charAt(0)}
            </div>
          )}
          <div className="min-w-0">
            <p className="font-semibold truncate">{cohort.name}</p>
            <p className="text-xs text-[var(--muted-foreground)] truncate">with {cohort.coachName}</p>
          </div>
        </div>
        <span className="text-[10px] uppercase tracking-widest font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shrink-0">
          Active
        </span>
      </div>
      <div className="text-xs space-y-1.5 text-[var(--muted-foreground)]">
        <div className="flex items-center gap-2"><Calendar size={12} /> {cohort.schedule}</div>
        {cohort.nextSessionAt && (
          <div className="flex items-center gap-2"><Calendar size={12} /> Next: {fmt(cohort.nextSessionAt)}</div>
        )}
        {membership.currentPeriodEnd && (
          <div className="text-[10px] opacity-60">Period ends {fmt(membership.currentPeriodEnd)}</div>
        )}
      </div>
      <button
        onClick={handleLeave}
        disabled={busy}
        className="w-full px-3 py-2 rounded-lg border border-[var(--border)] text-xs font-medium text-[var(--muted-foreground)] hover:text-amber-300 hover:border-amber-500/40 disabled:opacity-50 transition-colors"
      >
        {busy ? <Loader2 size={14} className="animate-spin mx-auto" /> : 'Cancel membership'}
      </button>
    </div>
  );
}

// ─── Coach-side card ─────────────────────────────────────────────────
function CoachCohortCard({ cohort }: { cohort: Cohort }) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)]/70 backdrop-blur p-5 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <p className="font-semibold">{cohort.name}</p>
        <span className={`text-[10px] uppercase tracking-widest font-bold px-2 py-0.5 rounded-full ${
          cohort.isActive
            ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
            : 'bg-[var(--muted)] text-[var(--muted-foreground)]'
        }`}>
          {cohort.isActive ? 'Live' : 'Paused'}
        </span>
      </div>
      <div className="text-xs space-y-1 text-[var(--muted-foreground)]">
        <div className="flex items-center gap-2"><Calendar size={12} /> {cohort.schedule}</div>
        <div className="flex items-center gap-2"><Users size={12} /> {cohort.memberCount} / {cohort.capacity} members</div>
        <div className="flex items-center gap-2"><DollarSign size={12} /> ${cohort.monthlyPriceUsd}/mo</div>
      </div>
      <div className="pt-2 border-t border-[var(--border)] text-[11px] text-emerald-300 font-bold tabular-nums">
        ${(cohort.memberCount * cohort.monthlyPriceUsd).toLocaleString()} <span className="text-[var(--muted-foreground)] font-normal">MRR</span>
      </div>
    </div>
  );
}

// ─── Public catalog card ─────────────────────────────────────────────
function CohortCard({
  cohort, alreadyMember, userName, userImage,
}: {
  cohort: Cohort; alreadyMember: boolean; userName: string; userImage?: string;
}) {
  const join = useMutation(api.cohorts.join);
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  const handleJoin = async () => {
    setBusy(true);
    try {
      await join({ cohortId: cohort.id, userName, userImage });
      toast.showToast(`Joined "${cohort.name}"!`);
    } catch (e) {
      toast.showToast((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const full = cohort.memberCount >= cohort.capacity;
  const remaining = Math.max(0, cohort.capacity - cohort.memberCount);

  return (
    <div className="group rounded-2xl border border-[var(--border)] bg-[var(--card)]/70 backdrop-blur p-5 space-y-4 hover:border-pink-500/40 hover:-translate-y-0.5 transition-all">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {cohort.coachPhotoUrl ? (
            <img src={cohort.coachPhotoUrl} alt={cohort.coachName} className="w-11 h-11 rounded-full object-cover ring-2 ring-pink-500/20" />
          ) : (
            <div className="w-11 h-11 rounded-full bg-gradient-to-br from-pink-500 to-orange-400 flex items-center justify-center text-sm font-bold text-slate-900">
              {cohort.coachName.charAt(0)}
            </div>
          )}
          <div className="min-w-0">
            <p className="font-bold text-base truncate">{cohort.name}</p>
            <p className="text-xs text-[var(--muted-foreground)] truncate">hosted by {cohort.coachName}</p>
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className="text-lg font-bold aurora-text-static tabular-nums">${cohort.monthlyPriceUsd}</p>
          <p className="text-[9px] uppercase tracking-widest text-[var(--muted-foreground)]">/ month</p>
        </div>
      </div>

      <p className="text-xs text-[var(--muted-foreground)] leading-relaxed line-clamp-3">{cohort.description}</p>

      <div className="space-y-1.5 text-xs">
        <div className="flex items-center gap-2 text-[var(--muted-foreground)]">
          <Calendar size={12} className="text-pink-400" />
          <span>{cohort.schedule}</span>
        </div>
        {cohort.nextSessionAt && (
          <div className="flex items-center gap-2 text-[var(--muted-foreground)]">
            <Calendar size={12} className="text-pink-400" />
            <span>Next: {fmt(cohort.nextSessionAt)}</span>
          </div>
        )}
        <div className="flex items-center gap-2 text-[var(--muted-foreground)]">
          <Users size={12} className="text-pink-400" />
          <span>{cohort.memberCount} / {cohort.capacity} members</span>
          {!full && remaining <= 5 && (
            <span className="text-amber-300 font-semibold">· {remaining} spots left</span>
          )}
        </div>
      </div>

      {cohort.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {cohort.tags.slice(0, 4).map(t => (
            <span key={t} className="text-[10px] px-2 py-0.5 rounded-full bg-pink-500/10 text-pink-300 border border-pink-500/20">
              {t}
            </span>
          ))}
        </div>
      )}

      <button
        onClick={handleJoin}
        disabled={busy || alreadyMember || full}
        className={`w-full px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
          alreadyMember
            ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 cursor-default'
            : full
            ? 'bg-[var(--muted)] text-[var(--muted-foreground)] cursor-not-allowed'
            : 'bg-gradient-to-r from-orange-400 to-amber-400 text-slate-900 shadow-[0_0_20px_-4px_rgba(251,146,60,0.5)] hover:from-orange-300 hover:to-amber-300'
        } disabled:opacity-60`}
      >
        {busy ? <Loader2 size={14} className="animate-spin mx-auto" /> :
          alreadyMember ? <span className="inline-flex items-center gap-1.5"><Check size={14} /> Joined</span> :
          full ? 'Cohort full' :
          `Join — $${cohort.monthlyPriceUsd}/mo`}
      </button>
    </div>
  );
}

// ─── Create-cohort modal (coach-side) ────────────────────────────────
function CreateCohortModal({ onClose }: { onClose: () => void }) {
  const create = useMutation(api.cohorts.create);
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [schedule, setSchedule] = useState('');
  const [capacity, setCapacity] = useState('30');
  const [price, setPrice] = useState('59');
  const [tags, setTags] = useState('');

  const handleSubmit = async () => {
    if (!name.trim() || !description.trim() || !schedule.trim()) {
      toast.showToast('Name, description, and schedule are required');
      return;
    }
    setBusy(true);
    try {
      await create({
        name: name.trim(),
        description: description.trim(),
        schedule: schedule.trim(),
        capacity: parseInt(capacity, 10) || 30,
        monthlyPriceUsd: parseFloat(price) || 0,
        tags: tags.split(',').map(t => t.trim()).filter(Boolean),
      });
      toast.showToast('Cohort created!');
      onClose();
    } catch (e) {
      toast.showToast((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-lg bg-[var(--card)] border border-[var(--border)] rounded-2xl shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
          <h2 className="text-lg font-bold">New cohort</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[var(--muted)] text-[var(--muted-foreground)]">
            <X size={18} />
          </button>
        </div>
        <div className="px-5 py-4 space-y-4 max-h-[70vh] overflow-y-auto">
          <Field label="Name">
            <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Forex Discipline Cohort" className="w-full" />
          </Field>
          <Field label="Description">
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} placeholder="What members get out of joining this cohort" className="w-full resize-none" />
          </Field>
          <Field label="Schedule">
            <input type="text" value={schedule} onChange={e => setSchedule(e.target.value)} placeholder="e.g. Thursdays 7pm EST" className="w-full" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Capacity">
              <input type="number" min="1" max="500" value={capacity} onChange={e => setCapacity(e.target.value)} className="w-full" />
            </Field>
            <Field label="Monthly Price (USD)">
              <input type="number" min="0" step="any" value={price} onChange={e => setPrice(e.target.value)} className="w-full" />
            </Field>
          </div>
          <Field label="Tags (comma-separated)">
            <input type="text" value={tags} onChange={e => setTags(e.target.value)} placeholder="forex, discipline, beginners" className="w-full" />
          </Field>
        </div>
        <div className="flex justify-end gap-2 px-5 py-4 border-t border-[var(--border)]">
          <button onClick={onClose} className="px-4 py-2 rounded-lg border border-[var(--border)] text-sm">Cancel</button>
          <button
            onClick={handleSubmit}
            disabled={busy}
            className="px-4 py-2 rounded-lg bg-gradient-to-r from-orange-400 to-amber-400 text-slate-900 text-sm font-semibold disabled:opacity-50"
          >
            {busy ? <Loader2 size={14} className="animate-spin" /> : 'Create cohort'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold uppercase tracking-widest text-[var(--muted-foreground)] mb-1.5">{label}</label>
      {children}
    </div>
  );
}
