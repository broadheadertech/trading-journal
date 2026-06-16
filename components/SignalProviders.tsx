'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Loader2, UserPlus, UserCheck, ArrowRight, Radio } from 'lucide-react';

type Provider = {
  posterId: string;
  name: string;
  handle: string;
  avatar: string | null;
  tier: string;
  total: number;
  won: number;
  lost: number;
  active: number;
  pending: number;
  closed: number;
  hitRate: number;
  avgR: number;
  markets: string[];
  followers: number;
  isFollowing: boolean;
  isSelf: boolean;
  lastPostedAt: string;
};

function timeAgo(iso: string) {
  if (!iso) return null;
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 2592000) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(iso).toLocaleDateString();
}

export default function SignalProviders() {
  const providers = useQuery(api.discover.getSignalProviders);

  if (providers === undefined) {
    return <div className="text-center py-16"><Loader2 size={22} className="animate-spin inline text-pink-400" /></div>;
  }
  if (providers.length === 0) {
    return (
      <div className="text-center py-16 rounded-2xl border border-dashed border-[var(--border)] bg-[var(--card)]/50">
        <Radio size={26} className="mx-auto text-[var(--muted-foreground)] mb-3" />
        <p className="text-base font-semibold text-[var(--foreground)]">No signal providers yet</p>
        <p className="text-sm text-[var(--muted-foreground)] mt-1">Once traders start posting signals, they'll show up here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--muted-foreground)]">
        Signal providers <span className="text-[var(--muted-foreground)]/60">· {providers.length}</span>
      </h2>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {(providers as Provider[]).map(p => <ProviderCard key={p.posterId} p={p} />)}
      </div>
    </div>
  );
}

function ProviderCard({ p }: { p: Provider }) {
  const follow = useMutation(api.follows.follow);
  const unfollow = useMutation(api.follows.unfollow);
  const [following, setFollowing] = useState(p.isFollowing);
  const [busy, setBusy] = useState(false);

  const tierLabel = p.tier ? p.tier.charAt(0).toUpperCase() + p.tier.slice(1) : 'Analyst';
  const last = timeAgo(p.lastPostedAt);

  const toggle = async () => {
    setBusy(true);
    const next = !following;
    setFollowing(next);
    try {
      if (next) await follow({ targetUserId: p.posterId });
      else await unfollow({ targetUserId: p.posterId });
    } catch {
      setFollowing(!next);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 flex flex-col">
      {/* Identity */}
      <div className="flex items-start gap-3">
        <Link href={`/u/${p.handle}`} className="shrink-0">
          {p.avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={p.avatar} alt={p.name} className="w-12 h-12 rounded-full object-cover border border-[var(--border)]" />
          ) : (
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-pink-500 to-fuchsia-500 flex items-center justify-center text-lg font-bold text-white">
              {p.name.slice(0, 1).toUpperCase()}
            </div>
          )}
        </Link>
        <div className="min-w-0 flex-1">
          <Link href={`/u/${p.handle}`} className="text-base font-bold text-[var(--foreground)] hover:text-pink-300 transition-colors leading-tight block">
            {p.name}
          </Link>
          <div className="text-[11px] text-[var(--muted-foreground)] truncate">
            {tierLabel} · {p.followers} follower{p.followers === 1 ? '' : 's'}
          </div>
        </div>
        {p.isSelf ? (
          <span className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold shrink-0 border border-[var(--border)] text-[var(--muted-foreground)]">
            You
          </span>
        ) : (
          <button
            onClick={toggle}
            disabled={busy}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold shrink-0 transition-all disabled:opacity-50 ${
              following
                ? 'border border-[var(--border)] text-[var(--foreground)] hover:border-red-500/40 hover:text-red-300'
                : 'text-slate-900 bg-gradient-to-r from-pink-400 to-fuchsia-400 hover:from-pink-300 hover:to-fuchsia-300'
            }`}
          >
            {following ? <><UserCheck size={13} /> Following</> : <><UserPlus size={13} /> Follow</>}
          </button>
        )}
      </div>

      {/* Signal summary */}
      <div className="grid grid-cols-4 gap-2 mt-4">
        <Stat value={`${p.hitRate}%`} label="Hit rate" tone="emerald" />
        <Stat value={`${p.won}/${p.lost}`} label="W / L" />
        <Stat value={`${p.avgR >= 0 ? '+' : ''}${p.avgR}R`} label="Avg R" tone={p.avgR >= 0 ? 'emerald' : 'red'} />
        <Stat value={`${p.total}`} label="Signals" />
      </div>

      {/* Activity + link */}
      <div className="flex items-center justify-between gap-2 mt-3 pt-3 border-t border-[var(--border)] text-[11px]">
        <span className="text-[var(--muted-foreground)] truncate">
          {p.active} active · {p.pending} pending{last ? ` · last ${last}` : ''}
        </span>
        <Link href={`/u/${p.handle}`} className="inline-flex items-center gap-1 font-semibold text-pink-300 hover:text-pink-200 shrink-0">
          View profile <ArrowRight size={12} />
        </Link>
      </div>
    </div>
  );
}

function Stat({ value, label, tone }: { value: string; label: string; tone?: 'emerald' | 'red' }) {
  const color = tone === 'emerald' ? 'text-emerald-400' : tone === 'red' ? 'text-red-400' : 'text-[var(--foreground)]';
  return (
    <div className="rounded-lg bg-[var(--background)]/50 border border-[var(--border)] py-1.5 px-1 text-center">
      <div className={`text-sm font-bold tabular-nums leading-tight ${color}`}>{value}</div>
      <div className="text-[9px] uppercase tracking-wide text-[var(--muted-foreground)] truncate mt-0.5">{label}</div>
    </div>
  );
}
