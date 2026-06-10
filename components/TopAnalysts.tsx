'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Loader2, UserPlus, UserCheck } from 'lucide-react';

type Analyst = {
  posterId: string; name: string; handle: string; avatar: string | null;
  tier: string; total: number; won: number; lost: number;
  hitRate: number; avgR: number; followers: number; isFollowing: boolean;
};

export default function TopAnalysts({ limit = 10 }: { limit?: number }) {
  const analysts = useQuery(api.discover.getTopAnalysts, { limit });

  if (analysts === undefined) {
    return <div className="text-center py-8"><Loader2 size={18} className="animate-spin inline text-pink-400" /></div>;
  }
  if (analysts.length === 0) {
    return (
      <p className="text-sm text-[var(--muted-foreground)] text-center py-6">
        No ranked analysts yet — they appear here once signals start closing.
      </p>
    );
  }
  return (
    <div className="space-y-2">
      {(analysts as Analyst[]).map((a, i) => <AnalystRow key={a.posterId} a={a} rank={i + 1} />)}
    </div>
  );
}

function AnalystRow({ a, rank }: { a: Analyst; rank: number }) {
  const follow = useMutation(api.follows.follow);
  const unfollow = useMutation(api.follows.unfollow);
  const [following, setFollowing] = useState(a.isFollowing);
  const [busy, setBusy] = useState(false);

  const toggle = async () => {
    setBusy(true);
    const next = !following;
    setFollowing(next); // optimistic
    try {
      if (next) await follow({ targetUserId: a.posterId });
      else await unfollow({ targetUserId: a.posterId });
    } catch {
      setFollowing(!next); // revert on failure
    } finally {
      setBusy(false);
    }
  };

  const tierLabel = a.tier ? a.tier.charAt(0).toUpperCase() + a.tier.slice(1) : 'Analyst';

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-3.5 space-y-3">
      {/* Identity */}
      <div className="flex items-center gap-3">
        <Link href={`/u/${a.handle}`} className="relative shrink-0">
          {a.avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={a.avatar} alt={a.name} className="w-11 h-11 rounded-full object-cover border border-[var(--border)]" />
          ) : (
            <div className="w-11 h-11 rounded-full bg-gradient-to-br from-pink-500 to-fuchsia-500 flex items-center justify-center text-base font-bold text-white">
              {a.name.slice(0, 1).toUpperCase()}
            </div>
          )}
          <span className="absolute -top-1 -left-1 min-w-4.5 h-4.5 px-1 rounded-full bg-[var(--background)] border border-[var(--border)] text-[9px] font-bold flex items-center justify-center text-[var(--muted-foreground)] tabular-nums">
            {rank}
          </span>
        </Link>
        <div className="min-w-0 flex-1">
          <Link href={`/u/${a.handle}`} className="text-sm font-bold text-[var(--foreground)] hover:text-pink-300 transition-colors truncate block">
            {a.name}
          </Link>
          <div className="text-[11px] text-[var(--muted-foreground)] truncate">
            {tierLabel} · {a.followers} follower{a.followers === 1 ? '' : 's'}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-1.5">
        <Stat value={`${a.hitRate}%`} label="Hit rate" tone="emerald" />
        <Stat value={`${a.won}/${a.lost}`} label="W / L" />
        <Stat value={`${a.avgR >= 0 ? '+' : ''}${a.avgR}R`} label="Avg R" tone={a.avgR >= 0 ? 'emerald' : 'red'} />
      </div>

      {/* Follow */}
      <button
        onClick={toggle}
        disabled={busy}
        className={`w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all disabled:opacity-50 ${
          following
            ? 'border border-[var(--border)] text-[var(--foreground)] hover:border-red-500/40 hover:text-red-300'
            : 'text-slate-900 bg-gradient-to-r from-pink-400 to-fuchsia-400 hover:from-pink-300 hover:to-fuchsia-300'
        }`}
      >
        {following ? <><UserCheck size={13} /> Following</> : <><UserPlus size={13} /> Follow</>}
      </button>
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
