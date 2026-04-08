'use client';

import { useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useToast } from '@/components/ui/Toast';
import { Star, ShieldCheck, Clock } from 'lucide-react';

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
      <div className="max-w-xl">
        <div className="glass rounded-3xl p-8 text-center space-y-3">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-[var(--muted)]/40 flex items-center justify-center text-3xl">🚫</div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">Applications are closed</h1>
          <p className="text-sm text-[var(--muted-foreground)]">
            We&apos;re not accepting new coach applications right now. Check back soon.
          </p>
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
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-[var(--foreground)]">Become a coach</h1>
        <p className="text-sm text-[var(--muted-foreground)] mt-1">Apply to offer 1-on-1 trading sessions. Admin will review and approve.</p>
      </div>

      <div className="glass rounded-3xl p-6 space-y-4">
        <Field label="Display name" value={displayName} onChange={setDisplayName} />
        <Field label="URL slug" value={slug} onChange={setSlug} placeholder="your-name" />
        <Field label="Headline" value={headline} onChange={setHeadline} placeholder="One-sentence pitch" />
        <Field label="Bio" value={bio} onChange={setBio} multiline />
        <Field label="Photo URL (optional)" value={photoUrl} onChange={setPhotoUrl} />
        <Field label="Specialties (comma separated)" value={specialties} onChange={setSpecialties} placeholder="Day Trading, Psychology, Risk" />
        <Field label="Timezone" value={timezone} onChange={setTimezone} />
        <div className="grid grid-cols-2 gap-3">
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
          className="w-full py-2.5 rounded-xl bg-gradient-to-br from-teal-500 to-teal-700 text-white text-sm font-semibold disabled:opacity-50"
        >
          {busy ? 'Submitting…' : 'Submit application'}
        </button>
      </div>
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
    pending:   { label: 'Pending review', color: 'bg-amber-500/15 text-amber-400' },
    approved:  { label: 'Approved · Live', color: 'bg-emerald-500/15 text-emerald-400' },
    suspended: { label: 'Suspended', color: 'bg-[var(--red)]/15 text-[var(--red)]' },
    rejected:  { label: 'Rejected', color: 'bg-[var(--red)]/15 text-[var(--red)]' },
  };
  const st = STATUS[profile.status];

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight text-[var(--foreground)]">Coach profile</h1>
        <span className={`text-xs uppercase tracking-wider font-bold px-3 py-1 rounded-full ${st.color}`}>{st.label}</span>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="glass rounded-2xl p-4">
          <div className="text-xs text-[var(--muted-foreground)] flex items-center gap-1"><Star size={11} /> Rating</div>
          <div className="text-2xl font-bold text-[var(--foreground)]">{profile.avgRating?.toFixed(1) ?? '—'}</div>
        </div>
        <div className="glass rounded-2xl p-4">
          <div className="text-xs text-[var(--muted-foreground)] flex items-center gap-1"><ShieldCheck size={11} /> Reviews</div>
          <div className="text-2xl font-bold text-[var(--foreground)]">{profile.reviewCount ?? 0}</div>
        </div>
        <div className="glass rounded-2xl p-4">
          <div className="text-xs text-[var(--muted-foreground)] flex items-center gap-1"><Clock size={11} /> Sessions</div>
          <div className="text-2xl font-bold text-[var(--foreground)]">{profile.totalSessions ?? 0}</div>
        </div>
      </div>

      <div className="glass rounded-3xl p-6 space-y-4">
        <Field label="Headline" value={headline} onChange={setHeadline} />
        <Field label="Bio" value={bio} onChange={setBio} multiline />
        <Field label="Photo URL" value={photoUrl} onChange={setPhotoUrl} />
        <Field label="Specialties (comma separated)" value={specialties} onChange={setSpecialties} />
        <div className="grid grid-cols-2 gap-3">
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
          className="px-5 py-2 rounded-xl bg-gradient-to-br from-teal-500 to-teal-700 text-white text-sm font-semibold"
        >
          Save changes
        </button>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = 'text', multiline, placeholder }: any) {
  return (
    <label className="block">
      <div className="text-xs font-medium text-[var(--muted-foreground)] mb-1">{label}</div>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={4}
          placeholder={placeholder}
          className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-sm"
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-sm"
        />
      )}
    </label>
  );
}
