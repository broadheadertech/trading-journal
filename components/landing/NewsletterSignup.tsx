'use client';

import { useState } from 'react';
import { useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Mail, Check, Loader2 } from 'lucide-react';

export default function NewsletterSignup() {
  const subscribe = useMutation(api.newsletter.subscribe);
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setBusy(true);
    setError(null);
    try {
      await subscribe({ email, source: 'landing-footer' });
      setDone(true);
      setEmail('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Subscription failed');
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <div className="flex items-center gap-2 text-sm text-pink-400">
        <Check size={16} /> You&apos;re in. Watch your inbox.
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-2">
      <div className="text-xs font-bold uppercase tracking-wider text-[var(--foreground)]">Newsletter</div>
      <p className="text-xs text-[var(--muted-foreground)]">
        Weekly insights from the trading desk. No spam.
      </p>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Mail size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]" />
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@email.com"
            className="w-full pl-7 pr-2 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-xs"
          />
        </div>
        <button
          type="submit"
          disabled={busy}
          className="px-3 py-2 bg-gradient-to-br from-pink-500 to-pink-700 text-white rounded-lg text-xs font-semibold disabled:opacity-50 flex items-center gap-1"
        >
          {busy ? <Loader2 size={12} className="animate-spin" /> : 'Subscribe'}
        </button>
      </div>
      {error && <p className="text-[10px] text-red-400">{error}</p>}
    </form>
  );
}
