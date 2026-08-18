'use client';

import { useState } from 'react';
import { useMutation } from 'convex/react';
import { useRouter } from 'next/navigation';
import { api } from '@/convex/_generated/api';
import { X, Loader2, BarChart3 } from 'lucide-react';

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <form
        onSubmit={handleSubmit}
        onClick={e => e.stopPropagation()}
        className="relative w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-2xl"
      >
        <div className="sticky top-0 z-10 flex items-center justify-between p-5 border-b border-[var(--border)] bg-[var(--card)]">
          <h2 className="text-lg font-bold text-[var(--foreground)]">Edit profile</h2>
          <button type="button" onClick={onClose} className="p-1 rounded hover:bg-[var(--muted)]/50 transition-colors">
            <X size={18} className="text-[var(--muted-foreground)]" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <label className="block">
            <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted-foreground)] mb-1.5">
              Username
            </div>
            <div className="flex items-center gap-1.5 rounded-xl border border-[var(--border)] bg-black/20 px-3 py-2">
              <span className="text-sm text-[var(--muted-foreground)] select-none">atlas.app/u/</span>
              <input
                value={username}
                onChange={e => setUsernameValue(e.target.value)}
                placeholder="your_handle"
                maxLength={24}
                pattern="[a-zA-Z0-9_-]{3,24}"
                className="flex-1 bg-transparent border-none outline-none text-sm font-mono text-[var(--foreground)]"
              />
            </div>
            <div className="text-[10px] text-[var(--muted-foreground)] mt-1.5 leading-relaxed">
              3–24 characters · letters, numbers, underscores, hyphens. Leave blank to fall back to your Clerk username.
            </div>
          </label>

          <label className="block">
            <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted-foreground)] mb-1.5">
              Bio
            </div>
            <textarea
              value={bio}
              onChange={e => setBioValue(e.target.value)}
              rows={3}
              maxLength={280}
              placeholder="What you trade, how long you've been at it, your edge…"
              className="w-full rounded-xl border border-[var(--border)] bg-black/20 px-3 py-2 text-sm leading-relaxed outline-none"
            />
            <div className="text-[10px] text-[var(--muted-foreground)] text-right mt-1">{bio.length}/280</div>
          </label>

          {/* Share overall stats toggle */}
          <button
            type="button"
            onClick={() => setShareStats(v => !v)}
            className="w-full flex items-center justify-between gap-3 rounded-xl border border-[var(--border)] bg-black/20 px-3 py-2.5 text-left"
          >
            <div className="flex items-start gap-2.5 min-w-0">
              <BarChart3 size={16} className="text-pink-400 shrink-0 mt-0.5" />
              <div className="min-w-0">
                <div className="text-sm font-semibold text-[var(--foreground)]">Share overall stats publicly</div>
                <div className="text-[10px] text-[var(--muted-foreground)] leading-relaxed">
                  Shows your total wins/losses and net P&amp;L on your profile. Individual private trades are never exposed.
                </div>
              </div>
            </div>
            <span className={`relative inline-block w-10 h-5 rounded-full shrink-0 transition-colors ${shareStats ? 'bg-pink-500' : 'bg-[var(--muted)]'}`}>
              <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${shareStats ? 'translate-x-5' : ''}`} />
            </span>
          </button>

          {/* Socials */}
          <div className="space-y-2">
            <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted-foreground)]">
              Social links <span className="font-normal normal-case tracking-normal">· optional, shown only if filled</span>
            </div>
            {SOCIAL_FIELDS.map(f => (
              <label key={f.key} className="flex items-center gap-2">
                <span className="text-[11px] text-[var(--muted-foreground)] w-20 shrink-0">{f.label}</span>
                <input
                  value={socials[f.key]}
                  onChange={e => updateSocial(f.key, e.target.value)}
                  placeholder={f.placeholder}
                  maxLength={200}
                  className="flex-1 min-w-0 rounded-lg border border-[var(--border)] bg-black/20 px-2.5 py-1.5 text-xs font-mono text-[var(--foreground)] outline-none placeholder:text-[var(--muted-foreground)]/50"
                />
              </label>
            ))}
          </div>

          {error && (
            <div className="text-xs text-red-300 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-sm font-medium text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold text-slate-900 bg-gradient-to-r from-orange-400 to-amber-400 hover:from-orange-300 hover:to-amber-300 transition-all disabled:opacity-50"
            >
              {submitting && <Loader2 size={14} className="animate-spin" />}
              Save
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
