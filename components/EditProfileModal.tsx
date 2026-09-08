'use client';

import { useState } from 'react';
import { useMutation } from 'convex/react';
import { useRouter } from 'next/navigation';
import { api } from '@/convex/_generated/api';
import { X, CircleNotch, ChartBar } from '@phosphor-icons/react';

export interface ProfileSocials {
  x: string;
  instagram: string;
  youtube: string;
  telegram: string;
  tiktok: string;
  website: string;
}

interface Props {
  initialUsername: string;
  initialBio: string;
  initialShareStats: boolean;
  initialSocials: ProfileSocials;
  onClose: () => void;
}

const SOCIAL_FIELDS: { key: keyof ProfileSocials; label: string; placeholder: string }[] = [
  { key: 'x',        label: 'X / Twitter', placeholder: 'https://x.com/yourhandle' },
  { key: 'instagram', label: 'Instagram',  placeholder: 'https://instagram.com/yourhandle' },
  { key: 'youtube',  label: 'YouTube',     placeholder: 'https://youtube.com/@yourchannel' },
  { key: 'telegram', label: 'Telegram',    placeholder: 'https://t.me/yourhandle' },
  { key: 'tiktok',   label: 'TikTok',      placeholder: 'https://tiktok.com/@yourhandle' },
  { key: 'website',  label: 'Website',     placeholder: 'https://yoursite.com' },
];

/**
 * Edit profile modal — username, bio, opt-in stat sharing, and social links.
 * Username builds the public URL (/u/<username>); falls back to the Clerk
 * username if blank.
 */
export default function EditProfileModal({
  initialUsername, initialBio, initialShareStats, initialSocials, onClose,
}: Props) {
  const router = useRouter();
  const setUsername = useMutation(api.profile.setUsername);
  const setBio = useMutation(api.profile.setBio);
  const setProfileMeta = useMutation(api.profile.setProfileMeta);

  const [username, setUsernameValue] = useState(initialUsername);
  const [bio, setBioValue] = useState(initialBio);
  const [shareStats, setShareStats] = useState(initialShareStats);
  const [socials, setSocials] = useState<ProfileSocials>(initialSocials);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const updateSocial = (key: keyof ProfileSocials, value: string) =>
    setSocials(prev => ({ ...prev, [key]: value }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      // Bio + meta first (always safe), then username — a username collision
      // surfaces as a clear error from the mutation.
      if (bio !== initialBio) {
        await setBio({ bio });
      }
      await setProfileMeta({
        shareStats,
        socialX: socials.x.trim(),
        socialInstagram: socials.instagram.trim(),
        socialYoutube: socials.youtube.trim(),
        socialTelegram: socials.telegram.trim(),
        socialTiktok: socials.tiktok.trim(),
        socialWebsite: socials.website.trim(),
      });
      const trimmed = username.trim();
      if (trimmed && trimmed !== initialUsername) {
        await setUsername({ username: trimmed });
        // After claiming a new slug, navigate to it so the URL updates.
        router.replace(`/u/${trimmed}`);
      }
      onClose();
    } catch (err) {
      const raw = err instanceof Error ? err.message : 'Failed to save changes.';
      const clean = raw.split('\n').pop()?.replace(/^Uncaught\s+Error:\s*/i, '').trim() ?? raw;
      setError(clean);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="atlas-dash fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(3,6,10,.78)' }}
      onClick={onClose}
    >
      <form
        onSubmit={handleSubmit}
        onClick={e => e.stopPropagation()}
        className="modal relative w-full max-w-md max-h-[90vh] overflow-y-auto"
        style={{ padding: 0, textAlign: 'left' }}
      >
        <span className="accent" style={{ width: 90 }} />
        <span className="corner" style={{ left: 0, top: 0, borderRight: 0, borderBottom: 0 }} />
        <span className="corner" style={{ right: 0, bottom: 0, borderLeft: 0, borderTop: 0 }} />

        <div
          className="sticky top-0 z-10 flex items-center justify-between"
          style={{ padding: '20px 24px', borderBottom: '1px solid var(--line)', background: '#080d14' }}
        >
          <h2 style={{ fontSize: 20, lineHeight: '22px' }}>Edit profile</h2>
          <button type="button" onClick={onClose} style={{ display: 'flex', color: 'var(--muted-2)' }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: '22px 24px 26px', display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="field">
            <label htmlFor="profile-username">USERNAME</label>
            <div className="box" style={{ gap: 6 }}>
              <span style={{ fontSize: 13, color: 'var(--muted-2)', userSelect: 'none' }}>atlas.app/u/</span>
              <input
                id="profile-username"
                value={username}
                onChange={e => setUsernameValue(e.target.value)}
                placeholder="your_handle"
                maxLength={24}
                pattern="[a-zA-Z0-9_-]{3,24}"
                style={{
                  flex: 1, minWidth: 0, background: 'transparent', border: 'none', outline: 'none',
                  fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--text)',
                }}
              />
            </div>
            <p style={{ margin: '9px 0 0', fontSize: 10.5, lineHeight: '16px', color: 'var(--muted-2)' }}>
              3–24 characters · letters, numbers, underscores, hyphens. Leave blank to fall back to your Clerk username.
            </p>
          </div>

          <div className="field">
            <label htmlFor="profile-bio">BIO</label>
            <textarea
              id="profile-bio"
              value={bio}
              onChange={e => setBioValue(e.target.value)}
              rows={3}
              maxLength={280}
              placeholder="What you trade, how long you've been at it, your edge…"
              className="box w-full"
              style={{ height: 'auto', minHeight: 74, display: 'block', padding: '11px 16px', lineHeight: '19px', resize: 'vertical' }}
            />
            <p style={{ margin: '7px 0 0', fontSize: 10.5, textAlign: 'right', color: 'var(--muted-2)', fontFamily: 'var(--mono)' }}>
              {bio.length}/280
            </p>
          </div>

          {/* Share overall stats toggle */}
          <button
            type="button"
            onClick={() => setShareStats(v => !v)}
            className="inset"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, width: '100%', textAlign: 'left', padding: '13px 16px' }}
          >
            <span style={{ display: 'flex', alignItems: 'flex-start', gap: 10, minWidth: 0 }}>
              <ChartBar size={15} style={{ color: shareStats ? 'var(--amber)' : 'var(--muted-2)', flex: 'none', marginTop: 2 }} />
              <span style={{ minWidth: 0 }}>
                <span style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: 'var(--text)' }}>Share overall stats publicly</span>
                <span style={{ display: 'block', marginTop: 5, fontSize: 10.5, lineHeight: '16px', color: 'var(--muted-2)' }}>
                  Shows your total wins/losses and net P&amp;L on your profile. Individual private trades are never exposed.
                </span>
              </span>
            </span>
            <span
              style={{
                position: 'relative', flex: 'none', width: 34, height: 16, borderRadius: 2,
                border: `1px solid ${shareStats ? 'var(--amber)' : 'var(--line)'}`,
                background: shareStats ? 'var(--amber)' : 'var(--rail)',
                transition: 'background .15s,border-color .15s',
              }}
            >
              <span
                style={{
                  position: 'absolute', top: 2, left: shareStats ? 20 : 2, width: 10, height: 10, borderRadius: 1,
                  background: shareStats ? 'var(--ink)' : 'var(--muted-2)', transition: 'left .15s',
                }}
              />
            </span>
          </button>

          {/* Socials */}
          <div className="field">
            <label>
              SOCIAL LINKS <span style={{ fontWeight: 400, letterSpacing: 0, textTransform: 'none' }}>· optional, shown only if filled</span>
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {SOCIAL_FIELDS.map(f => (
                <label key={f.key} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ width: 80, flex: 'none', fontSize: 11, color: 'var(--muted-2)' }}>{f.label}</span>
                  <input
                    value={socials[f.key]}
                    onChange={e => updateSocial(f.key, e.target.value)}
                    placeholder={f.placeholder}
                    maxLength={200}
                    className="box"
                    style={{ flex: 1, minWidth: 0, height: 34, fontFamily: 'var(--mono)', fontSize: 11.5 }}
                  />
                </label>
              ))}
            </div>
          </div>

          {error && (
            <div
              className="warn"
              style={{ marginTop: 0, borderColor: 'rgba(255,77,94,.4)', background: 'rgba(255,77,94,.07)', color: 'var(--red)', fontSize: 12 }}
            >
              {error}
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 12, paddingTop: 4, borderTop: '1px solid var(--line)', marginTop: 2 }}>
            <button type="button" onClick={onClose} className="btn-g" style={{ marginTop: 16 }}>
              Cancel
            </button>
            <button type="submit" disabled={submitting} className="btn-a disabled:opacity-50" style={{ marginTop: 16 }}>
              {submitting && <CircleNotch size={14} className="animate-spin" />}
              Save
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
