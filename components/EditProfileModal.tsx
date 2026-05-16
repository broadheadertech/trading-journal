'use client';

import { useState } from 'react';
import { useMutation } from 'convex/react';
import { useRouter } from 'next/navigation';
import { api } from '@/convex/_generated/api';
import { X, Loader2 } from 'lucide-react';

interface Props {
  initialUsername: string;
  initialBio: string;
  onClose: () => void;
}

/**
 * Edit profile modal — sets the custom username and bio. The username is
 * what builds the public profile URL (/u/<username>); falls back to the
 * Clerk username if blank.
 */
export default function EditProfileModal({ initialUsername, initialBio, onClose }: Props) {
  const router = useRouter();
  const setUsername = useMutation(api.profile.setUsername);
  const setBio = useMutation(api.profile.setBio);

  const [username, setUsernameValue] = useState(initialUsername);
  const [bio, setBioValue] = useState(initialBio);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      // Save bio first (always safe), then username — if username collides
      // we'll get a clear error message back from the mutation.
      if (bio !== initialBio) {
        await setBio({ bio });
      }
      const trimmed = username.trim();
      if (trimmed && trimmed !== initialUsername) {
        await setUsername({ username: trimmed });
        // After claiming a new slug, navigate to it so the URL updates.
        router.replace(`/u/${trimmed}`);
      }
      onClose();
    } catch (err) {
      const raw = err instanceof Error ? err.message : 'Failed to save changes.';
      // Strip Convex's noisy prefix.
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
        className="relative w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-2xl"
      >
        <div className="flex items-center justify-between p-5 border-b border-[var(--border)]">
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
              <span className="text-sm text-[var(--muted-foreground)] select-none">tradia.app/u/</span>
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
