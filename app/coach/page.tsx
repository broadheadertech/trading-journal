'use client';

import { useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useToast } from '@/components/ui/Toast';
import { Star, ShieldCheck, Clock, Prohibit as Ban, UserPlus } from '@phosphor-icons/react';

const uid = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export default function CoachProfilePage() {
  const profile = useQuery(api.coaches.getMyCoachProfile);
  const applicationsOpen = useQuery(api.coaches.getApplicationsOpen);
  const apply = useMutation(api.coaches.applyToCoach);
  const update = useMutation(api.coaches.updateMyProfile);
  const { showToast } = useToast();

  if (profile === undefined || applicationsOpen === undefined) return null;

  if (!profile && !applicationsOpen) {
    return (
      <div style={{ maxWidth: 680 }}>
        <div className="phead pwrap">
          <p className="eyebrow">
            <Ban size={13} style={{ color: 'var(--red)' }} /> COACH APPLICATIONS
          </p>
          <h2>Applications are closed</h2>
        </div>
        <div className="blank" style={{ padding: '48px 28px' }}>
          <span className="corner" style={{ left: -1, top: -1, borderRight: 0, borderBottom: 0 }} />
          <span className="corner" style={{ right: -1, top: -1, borderLeft: 0, borderBottom: 0 }} />
          <span className="corner" style={{ left: -1, bottom: -1, borderRight: 0, borderTop: 0 }} />
          <span className="corner" style={{ right: -1, bottom: -1, borderLeft: 0, borderTop: 0 }} />
          <span className="badge" style={{ border: '1px solid rgba(255,77,94,.4)', background: 'var(--panel-2)' }}>
            <Ban size={22} style={{ color: 'var(--red)' }} />
          </span>
          <h4>Not accepting applications</h4>
          <p>We&apos;re not accepting new coach applications right now. Check back soon.</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return <ApplyForm onSubmit={async (data) => {
      try {
        await apply({ id: uid(), ...data });
        showToast('Application submitted! Pending admin approval.', 'success');
      } catch (err) {
        showToast(err instanceof Error ? err.message : 'Failed', 'error');
      }
    }} />;
  }

  return <ExistingProfile profile={profile} onSave={async (data) => {
    await update(data);
    showToast('Profile updated', 'success');
  }} />;
}

function ApplyForm({ onSubmit }: { onSubmit: (d: any) => Promise<void> }) {
  const [displayName, setDisplayName] = useState('');
  const [slug, setSlug] = useState('');
  const [headline, setHeadline] = useState('');
  const [bio, setBio] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [specialties, setSpecialties] = useState('');
  const [timezone, setTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone);
  const [hourlyRateUsd, setHourlyRateUsd] = useState('100');
  const [sessionDurationMin, setSessionDurationMin] = useState('60');
  const [busy, setBusy] = useState(false);

  return (
    <div style={{ maxWidth: 720 }}>
      <div className="phead pwrap">
        <p className="eyebrow">
          <UserPlus size={13} style={{ color: 'var(--amber)' }} /> COACH APPLICATION
        </p>
        <h2>Become a coach</h2>
        <p className="sub">Apply to offer 1-on-1 trading sessions. Admin will review and approve.</p>
      </div>

      <div className="card pwrap">
        <span className="accent" style={{ width: 56, background: 'var(--amber)' }} />
        <div className="cardhead">
          <div>
            <h3>Application details</h3>
            <p className="sub">All fields except photo are required to submit.</p>
          </div>
        </div>

        <div style={{ display: 'grid', gap: 16, marginTop: 22 }}>
          <Field label="Display name" value={displayName} onChange={setDisplayName} />
          <Field label="URL slug" value={slug} onChange={setSlug} placeholder="your-name" />
          <Field label="Headline" value={headline} onChange={setHeadline} placeholder="One-sentence pitch" />
          <Field label="Bio" value={bio} onChange={setBio} multiline />
          <Field label="Photo URL (optional)" value={photoUrl} onChange={setPhotoUrl} />
          <Field label="Specialties (comma separated)" value={specialties} onChange={setSpecialties} placeholder="Day Trading, Psychology, Risk" />
          <Field label="Timezone" value={timezone} onChange={setTimezone} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Field label="Hourly rate USD" value={hourlyRateUsd} onChange={setHourlyRateUsd} type="number" />
            <Field label="Session duration (min)" value={sessionDurationMin} onChange={setSessionDurationMin} type="number" />
          </div>
          <button
            disabled={busy || !displayName || !slug || !bio}
            onClick={async () => {
              setBusy(true);
              try {
                await onSubmit({
                  slug, displayName, headline, bio,
                  photoUrl: photoUrl || undefined,
                  specialties: specialties.split(',').map(s => s.trim()).filter(Boolean),
                  timezone,
                  hourlyRateUsd: Number(hourlyRateUsd),
                  sessionDurationMin: Number(sessionDurationMin),
                });
              } finally { setBusy(false); }
            }}
            className="btn-a disabled:opacity-50"
            style={{ width: '100%' }}
          >
            {busy ? 'Submitting…' : 'Submit application'}
          </button>
        </div>
      </div>

      <p className="footnote">Approved coaches appear in the public coach catalog.</p>
    </div>
  );
}

function ExistingProfile({ profile, onSave }: { profile: any; onSave: (d: any) => Promise<void> }) {
  const [headline, setHeadline] = useState(profile.headline);
  const [bio, setBio] = useState(profile.bio);
  const [photoUrl, setPhotoUrl] = useState(profile.photoUrl ?? '');
  const [specialties, setSpecialties] = useState((profile.specialties as string[]).join(', '));
  const [hourlyRateUsd, setHourlyRateUsd] = useState(String(profile.hourlyRateUsd));
  const [sessionDurationMin, setSessionDurationMin] = useState(String(profile.sessionDurationMin));

  const STATUS: Record<string, { label: string; color: string }> = {
    pending:   { label: 'Pending review', color: 'var(--amber)' },
    approved:  { label: 'Approved · Live', color: 'var(--green)' },
    suspended: { label: 'Suspended', color: 'var(--red)' },
    rejected:  { label: 'Rejected', color: 'var(--red)' },
  };
  const st = STATUS[profile.status];

  return (
    <div style={{ maxWidth: 720 }}>
      <div className="phead pwrap">
        <p className="eyebrow">
          <ShieldCheck size={13} style={{ color: 'var(--amber)' }} /> COACH HUB
        </p>
        <h2>Coach profile</h2>
        <p className="sub">Your public listing in the coach catalog. Changes go live immediately.</p>
        <div className="actions">
          <span className="chip" style={{ color: st.color }}>
            <i style={{ background: st.color }} />
            {st.label}
          </span>
        </div>
      </div>

      {/* Stats */}
      <div className="stats" style={{ gridTemplateColumns: 'repeat(3,1fr)', marginTop: 0 }}>
        <div className="stat">
          <span className="accent" style={{ background: 'var(--amber)' }} />
          <b style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Star size={11} /> RATING</b>
          <em style={{ color: 'var(--text)' }}>{profile.avgRating?.toFixed(1) ?? '—'}</em>
        </div>
        <div className="stat">
          <span className="accent" style={{ background: 'var(--teal)' }} />
          <b style={{ display: 'flex', alignItems: 'center', gap: 6 }}><ShieldCheck size={11} /> REVIEWS</b>
          <em style={{ color: 'var(--text)' }}>{profile.reviewCount ?? 0}</em>
        </div>
        <div className="stat">
          <span className="accent" style={{ background: 'var(--green)' }} />
          <b style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Clock size={11} /> SESSIONS</b>
          <em style={{ color: 'var(--text)' }}>{profile.totalSessions ?? 0}</em>
        </div>
      </div>

      <div className="card pwrap" style={{ marginTop: 24 }}>
        <span className="accent" style={{ width: 56, background: 'var(--amber)' }} />
        <div className="cardhead">
          <div>
            <h3>Listing details</h3>
            <p className="sub">How traders see you in the catalog.</p>
          </div>
        </div>

        <div style={{ display: 'grid', gap: 16, marginTop: 22 }}>
          <Field label="Headline" value={headline} onChange={setHeadline} />
          <Field label="Bio" value={bio} onChange={setBio} multiline />
          <Field label="Photo URL" value={photoUrl} onChange={setPhotoUrl} />
          <Field label="Specialties (comma separated)" value={specialties} onChange={setSpecialties} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Field label="Hourly rate USD" value={hourlyRateUsd} onChange={setHourlyRateUsd} type="number" />
            <Field label="Session duration (min)" value={sessionDurationMin} onChange={setSessionDurationMin} type="number" />
          </div>
          <button
            onClick={() => onSave({
              headline, bio,
              photoUrl: photoUrl || undefined,
              specialties: specialties.split(',').map((s: string) => s.trim()).filter(Boolean),
              hourlyRateUsd: Number(hourlyRateUsd),
              sessionDurationMin: Number(sessionDurationMin),
            })}
            className="btn-a"
          >
            Save changes
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = 'text', multiline, placeholder }: any) {
  return (
    <div className="field">
      <label>{label.toUpperCase()}</label>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={4}
          placeholder={placeholder}
          className="box"
          style={{
            display: 'block', width: '100%', height: 'auto', padding: '11px 16px',
            fontFamily: 'inherit', resize: 'vertical', outline: 'none',
          }}
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="box"
          style={{ display: 'block', width: '100%', outline: 'none' }}
        />
      )}
    </div>
  );
}
