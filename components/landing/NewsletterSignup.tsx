'use client';

import { useState } from 'react';
import { useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { CircleNotch } from '@phosphor-icons/react';

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
      <div className="news">
        <h5>NEWSLETTER</h5>
        <p style={{ display: 'flex', alignItems: 'center', gap: '9px', color: 'var(--teal)' }}>
          <svg width="13" height="10" viewBox="0 0 13 10" fill="none" aria-hidden="true"><path d="M0 5 L4.5 10 L13 0" stroke="#2fd3c4" strokeWidth="1.8" /></svg>
          You&apos;re in. Watch your inbox.
        </p>
      </div>
    );
  }

  return (
    <div className="news">
      <h5>NEWSLETTER</h5>
      <p>Weekly insights from the trading desk. No spam.</p>
      <form onSubmit={submit}>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@email.com"
          aria-label="Email address"
        />
        <button type="submit" disabled={busy} style={{ opacity: busy ? 0.5 : 1 }}>
          {busy ? <CircleNotch size={14} className="animate-spin" style={{ display: 'inline-block' }} /> : 'Subscribe'}
        </button>
      </form>
      {error && (
        <p style={{ marginTop: '9px', fontSize: '11.5px', color: 'var(--red)' }}>{error}</p>
      )}
    </div>
  );
}
