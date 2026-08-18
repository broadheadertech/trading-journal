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
    <div>
      {/* ── My Cohorts (if any) ── */}
      {myMemberships.length > 0 && (
        <section style={{ marginBottom: 40 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
            <p className="lbl b10">YOUR COHORTS</p>
            <span className="chip" style={{ height: 22, marginLeft: 'auto', fontSize: 10.5 }}>
              {myMemberships.length} active
            </span>
          </div>
          <div className="split">
            {myMemberships.map(({ cohort, membership }: any) => (
              <MyCohortCard key={cohort.id} cohort={cohort} membership={membership} />
            ))}
          </div>
        </section>
      )}

      {/* ── Coach-side: cohorts I host ── */}
      {myCoachProfile && (
        <section style={{ marginBottom: 40 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
            <p className="lbl b10">COHORTS YOU HOST</p>
            <button onClick={() => setShowCreate(true)} className="btn-a" style={{ height: 34, marginLeft: 'auto', fontSize: 12 }}>
              <Plus size={12} /> New cohort
            </button>
          </div>
          {myCoachCohorts.length === 0 ? (
            <div className="blank" style={{ height: 'auto', minHeight: 180, padding: '40px 28px', textAlign: 'center' }}>
              <span className="corner" style={{ left: 0, top: 0, borderRight: 0, borderBottom: 0 }} />
              <span className="corner" style={{ right: 0, top: 0, borderLeft: 0, borderBottom: 0 }} />
              <span className="corner" style={{ left: 0, bottom: 0, borderRight: 0, borderTop: 0 }} />
              <span className="corner" style={{ right: 0, bottom: 0, borderLeft: 0, borderTop: 0 }} />
              <h4>No cohorts yet</h4>
              <p>
                You haven&apos;t created any cohorts yet. Tap <strong style={{ color: 'var(--amber)' }}>New cohort</strong> to host your first group program.
              </p>
            </div>
          ) : (
            <div className="split">
              {myCoachCohorts.map((c: any) => <CoachCohortCard key={c.id} cohort={c} />)}
            </div>
          )}
        </section>
      )}

      {/* ── Public catalog ── */}
      <section>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
          <div>
            <p className="lbl b10">OPEN COHORTS</p>
            <p className="sub" style={{ margin: '9px 0 0', fontSize: 12.5, color: 'var(--muted-2)', maxWidth: 560 }}>
              Weekly group calls hosted by vetted coaches. Lower price than 1:1, peer accountability included.
            </p>
          </div>
          <span className="chip" style={{ height: 22, fontSize: 10.5 }}>{cohorts.length} available</span>
        </div>

        {cohorts.length === 0 ? (
          <div className="blank" style={{ height: 'auto', minHeight: 280, padding: '48px 28px' }}>
            <span className="corner" style={{ left: 0, top: 0, borderRight: 0, borderBottom: 0 }} />
            <span className="corner" style={{ right: 0, top: 0, borderLeft: 0, borderBottom: 0 }} />
            <span className="corner" style={{ left: 0, bottom: 0, borderRight: 0, borderTop: 0 }} />
            <span className="corner" style={{ right: 0, bottom: 0, borderLeft: 0, borderTop: 0 }} />
            <span className="badge" style={{ border: '1px solid rgba(47,211,196,.5)', color: 'var(--teal)' }}>
              <Users size={24} />
            </span>
            <h4>No cohorts available yet</h4>
            <p>Check back soon — coaches are setting up their first programs.</p>
          </div>
        ) : (
          <div className="split-3">
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
    <div className="card" style={{ padding: '19px 22px 20px' }}>
      <span className="accent" style={{ width: 44, background: 'var(--green)' }} />
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
          {cohort.coachPhotoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={cohort.coachPhotoUrl}
              alt={cohort.coachName}
              style={{ width: 38, height: 38, borderRadius: 3, objectFit: 'cover', border: '1px solid var(--line)', flex: 'none' }}
            />
          ) : (
            <div
              style={{
                width: 38, height: 38, borderRadius: 3, flex: 'none',
                border: '1px solid var(--line)', background: 'var(--panel-2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'var(--display)', fontWeight: 700, fontSize: 15, color: 'var(--amber)',
              }}
            >
              {cohort.coachName.charAt(0)}
            </div>
          )}
          <div style={{ minWidth: 0 }}>
            <h4 className="truncate">{cohort.name}</h4>
            <p style={{ margin: '6px 0 0', fontSize: 11.5, color: 'var(--muted-2)' }} className="truncate">
              with {cohort.coachName}
            </p>
          </div>
        </div>
        <span
          className="chip"
          style={{ marginLeft: 'auto', flex: 'none', height: 20, fontSize: 9.5, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', borderColor: 'var(--green)', color: 'var(--green)' }}
        >
          Active
        </span>
      </div>

      <div style={{ marginTop: 14 }}>
        <div className="mrow">
          <Calendar size={12} className="ic" />
          <span className="lb">{cohort.schedule}</span>
        </div>
        {cohort.nextSessionAt && (
          <div className="mrow">
            <Calendar size={12} className="ic" />
            <span className="lb">Next session</span>
            <span className="val">{fmt(cohort.nextSessionAt)}</span>
          </div>
        )}
        {membership.currentPeriodEnd && (
          <div className="mrow">
            <span className="ic" />
            <span className="lb">Period ends</span>
            <span className="val">{fmt(membership.currentPeriodEnd)}</span>
          </div>
        )}
      </div>

      <button
        onClick={handleLeave}
        disabled={busy}
        className="btn-g disabled:opacity-50"
        style={{ width: '100%', height: 34, marginTop: 16, fontSize: 12 }}
      >
        {busy ? <Loader2 size={14} className="animate-spin" /> : 'Cancel membership'}
      </button>
    </div>
  );
}

// ─── Coach-side card ─────────────────────────────────────────────────
function CoachCohortCard({ cohort }: { cohort: Cohort }) {
  return (
    <div className="card" style={{ padding: '19px 22px 20px' }}>
      <span className="accent" style={{ width: 44, background: cohort.isActive ? 'var(--teal)' : 'var(--muted-3)' }} />
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <h4 style={{ minWidth: 0 }}>{cohort.name}</h4>
        <span
          className="chip"
          style={{
            marginLeft: 'auto', flex: 'none', height: 20, fontSize: 9.5, fontWeight: 700,
            letterSpacing: '.06em', textTransform: 'uppercase',
            borderColor: cohort.isActive ? 'var(--teal)' : 'var(--line)',
            color: cohort.isActive ? 'var(--teal)' : 'var(--muted-2)',
          }}
        >
          {cohort.isActive ? 'Live' : 'Paused'}
        </span>
      </div>

      <div style={{ marginTop: 14 }}>
        <div className="mrow">
          <Calendar size={12} className="ic" />
          <span className="lb">{cohort.schedule}</span>
        </div>
        <div className="mrow">
          <Users size={12} className="ic" />
          <span className="lb">Members</span>
          <span className="val">{cohort.memberCount} / {cohort.capacity}</span>
        </div>
        <div className="mrow">
          <DollarSign size={12} className="ic" />
          <span className="lb">Price</span>
          <span className="val">${cohort.monthlyPriceUsd}/mo</span>
        </div>
      </div>

      <div className="inset" style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 14 }}>
        <p className="lbl">MRR</p>
        <span style={{ marginLeft: 'auto', fontFamily: 'var(--mono)', fontWeight: 500, fontSize: 15, color: 'var(--green)' }}>
          ${(cohort.memberCount * cohort.monthlyPriceUsd).toLocaleString()}
        </span>
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
    <div className="card" style={{ padding: '19px 22px 20px', display: 'flex', flexDirection: 'column' }}>
      <span className="accent" style={{ width: 56, background: 'var(--amber)' }} />
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0, flex: 1 }}>
          {cohort.coachPhotoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={cohort.coachPhotoUrl}
              alt={cohort.coachName}
              style={{ width: 42, height: 42, borderRadius: 3, objectFit: 'cover', border: '1px solid var(--line)', flex: 'none' }}
            />
          ) : (
            <div
              style={{
                width: 42, height: 42, borderRadius: 3, flex: 'none',
                border: '1px solid var(--line)', background: 'var(--panel-2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'var(--display)', fontWeight: 700, fontSize: 17, color: 'var(--amber)',
              }}
            >
              {cohort.coachName.charAt(0)}
            </div>
          )}
          <div style={{ minWidth: 0 }}>
            <h4 className="truncate">{cohort.name}</h4>
            <p className="truncate" style={{ margin: '6px 0 0', fontSize: 11.5, color: 'var(--muted-2)' }}>
              hosted by {cohort.coachName}
            </p>
          </div>
        </div>
        <div style={{ flex: 'none', textAlign: 'right' }}>
          <div style={{ fontFamily: 'var(--mono)', fontWeight: 500, fontSize: 20, lineHeight: '24px', color: 'var(--text)' }}>
            ${cohort.monthlyPriceUsd}
          </div>
          <p className="lbl" style={{ marginTop: 4 }}>/ MONTH</p>
        </div>
      </div>

      <p className="sub" style={{ margin: '16px 0 0', fontSize: 12, lineHeight: '19px', color: 'var(--muted)' }}>
        {cohort.description}
      </p>

      <div style={{ marginTop: 14 }}>
        <div className="mrow">
          <Calendar size={12} className="ic" style={{ color: 'var(--amber)' }} />
          <span className="lb">{cohort.schedule}</span>
        </div>
        {cohort.nextSessionAt && (
          <div className="mrow">
            <Calendar size={12} className="ic" style={{ color: 'var(--amber)' }} />
            <span className="lb">Next session</span>
            <span className="val">{fmt(cohort.nextSessionAt)}</span>
          </div>
        )}
        <div className="mrow">
          <Users size={12} className="ic" style={{ color: 'var(--amber)' }} />
          <span className="lb">
            Members
            {!full && remaining <= 5 && (
              <span style={{ marginLeft: 8, fontWeight: 700, fontSize: 11, color: 'var(--amber)' }}>· {remaining} spots left</span>
            )}
          </span>
          <span className="val">{cohort.memberCount} / {cohort.capacity}</span>
        </div>
      </div>

      {cohort.tags.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 14 }}>
          {cohort.tags.slice(0, 4).map(t => (
            <span
              key={t}
              className="chip"
              style={{ height: 22, padding: '0 10px', fontSize: 9.5, letterSpacing: '.04em', textTransform: 'uppercase' }}
            >
              {t}
            </span>
          ))}
        </div>
      )}

      {/* marginTop:auto pins the CTA to the card floor so a row of stretched
          .split-3 cards keeps its buttons on one baseline. */}
      <div style={{ marginTop: 'auto', paddingTop: 18 }}>
        <button
          onClick={handleJoin}
          disabled={busy || alreadyMember || full}
          className={alreadyMember || full ? 'btn-g' : 'btn-a'}
          style={{
            width: '100%',
            ...(alreadyMember ? { borderColor: 'var(--green)', color: 'var(--green)', cursor: 'default' } : null),
            ...(full && !alreadyMember ? { color: 'var(--muted-2)', cursor: 'not-allowed' } : null),
          }}
        >
          {busy ? <Loader2 size={14} className="animate-spin" /> :
            alreadyMember ? <span className="inline-flex items-center gap-1.5"><Check size={14} /> Joined</span> :
            full ? 'Cohort full' :
            `Join — $${cohort.monthlyPriceUsd}/mo`}
        </button>
      </div>
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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ background: 'rgba(3,6,10,.78)' }}
      onClick={onClose}
    >
      <div
        className="modal w-full max-w-lg"
        style={{ padding: 0, textAlign: 'left' }}
        onClick={e => e.stopPropagation()}
      >
        <span className="accent" style={{ width: 90 }} />
        <span className="corner" style={{ left: 0, top: 0, borderRight: 0, borderBottom: 0 }} />
        <span className="corner" style={{ right: 0, bottom: 0, borderLeft: 0, borderTop: 0 }} />

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: '1px solid var(--line)' }}>
          <h2 style={{ fontSize: 20, lineHeight: '22px' }}>New cohort</h2>
          <button onClick={onClose} style={{ display: 'flex', color: 'var(--muted-2)' }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: '22px 24px', display: 'flex', flexDirection: 'column', gap: 18, maxHeight: '70vh', overflowY: 'auto' }}>
          <Field label="NAME">
            <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Forex Discipline Cohort" className="box w-full" />
          </Field>
          <Field label="DESCRIPTION">
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={3}
              placeholder="What members get out of joining this cohort"
              className="box w-full"
              style={{ height: 'auto', minHeight: 74, display: 'block', padding: '11px 16px', lineHeight: '19px', resize: 'vertical' }}
            />
          </Field>
          <Field label="SCHEDULE">
            <input type="text" value={schedule} onChange={e => setSchedule(e.target.value)} placeholder="e.g. Thursdays 7pm EST" className="box w-full" />
          </Field>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <Field label="CAPACITY">
              <input type="number" min="1" max="500" value={capacity} onChange={e => setCapacity(e.target.value)} className="box w-full" />
            </Field>
            <Field label="MONTHLY PRICE (USD)">
              <input type="number" min="0" step="any" value={price} onChange={e => setPrice(e.target.value)} className="box w-full" />
            </Field>
          </div>
          <Field label="TAGS (COMMA-SEPARATED)">
            <input type="text" value={tags} onChange={e => setTags(e.target.value)} placeholder="forex, discipline, beginners" className="box w-full" />
          </Field>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, padding: '18px 24px', borderTop: '1px solid var(--line)' }}>
          <button onClick={onClose} className="btn-g">Cancel</button>
          <button onClick={handleSubmit} disabled={busy} className="btn-a disabled:opacity-50">
            {busy ? <Loader2 size={14} className="animate-spin" /> : 'Create cohort'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="field">
      <label>{label}</label>
      {children}
    </div>
  );
}
