'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Loader2, UserPlus, UserCheck } from 'lucide-react';

type Analyst = {
  posterId: string; name: string; handle: string; avatar: string | null;
  tier: string; winRate: number; won: number; lost: number;
  signals: number; trades: number; avgR: number; followers: number; isFollowing: boolean;
};

const ACCENTS = ['var(--teal)', 'var(--pink)', 'var(--amber)', 'var(--green)'];

function rateColor(rate: number) {
  if (rate >= 60) return 'var(--green)';
  if (rate >= 40) return 'var(--amber)';
  return 'var(--red)';
}

export default function TopAnalysts({ limit = 10 }: { limit?: number }) {
  const analysts = useQuery(api.discover.getTopAnalysts, { limit });

  if (analysts === undefined) {
    return (
      <div className="empty-line" style={{ padding: '28px 0' }}>
        <Loader2 size={18} className="animate-spin inline" style={{ color: 'var(--amber)' }} />
      </div>
    );
  }
  if (analysts.length === 0) {
    return (
      <p className="empty-line" style={{ padding: '28px 0', fontSize: 13 }}>
        No ranked analysts yet — they appear here once signals start closing.
      </p>
    );
  }
  return (
    <div>
      {(analysts as Analyst[]).map((a, i) => (
        <AnalystRow key={a.posterId} a={a} rank={i + 1} accent={ACCENTS[i % ACCENTS.length]} />
      ))}
    </div>
  );
}

function AnalystRow({ a, rank, accent }: { a: Analyst; rank: number; accent: string }) {
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
    <div className="analyst">
      <span className="rank">{rank}</span>

      {/* Identity */}
      <div className="whorow">
        <Link href={`/u/${a.handle}`} style={{ flex: 'none' }}>
          <span
            className="av"
            style={{
              color: accent,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
            }}
          >
            {a.avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={a.avatar} alt={a.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <span style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: 12, color: accent }}>
                {a.name.slice(0, 1).toUpperCase()}
              </span>
            )}
          </span>
        </Link>
        <div style={{ minWidth: 0 }}>
          <h5 style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            <Link href={`/u/${a.handle}`} style={{ color: 'inherit' }}>{a.name}</Link>
          </h5>
          <p>{tierLabel} · {a.followers} follower{a.followers === 1 ? '' : 's'}</p>
        </div>
      </div>

      {/* Stats */}
      <div className="row3">
        <div>
          <b style={{ color: rateColor(a.winRate) }}>{a.winRate}%</b>
          <span>WIN RATE</span>
        </div>
        <div>
          <b>{a.won}/{a.lost}</b>
          <span>W / L</span>
        </div>
        <div>
          <b style={{ color: a.avgR >= 0 ? 'var(--green)' : 'var(--red)' }}>
            {a.avgR >= 0 ? '+' : ''}{a.avgR}R
          </b>
          <span>AVG R</span>
        </div>
      </div>

      {/* Follow */}
      <button
        onClick={toggle}
        disabled={busy}
        className="follow"
        style={{
          width: '100%',
          gap: 8,
          cursor: busy ? 'not-allowed' : 'pointer',
          opacity: busy ? 0.5 : 1,
          ...(following
            ? { background: 'transparent', border: '1px solid var(--line-2)', color: 'var(--text)' }
            : {}),
        }}
      >
        {following ? <><UserCheck size={13} /> Following</> : <><UserPlus size={13} /> Follow</>}
      </button>
    </div>
  );
}
