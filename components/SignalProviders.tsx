'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { CircleNotch, UserPlus, UserCheck, ArrowRight, Radio } from '@phosphor-icons/react';

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

const ACCENTS = ['var(--amber)', 'var(--amber)', 'var(--amber)', 'var(--green)'];

function rateColor(rate: number) {
  if (rate >= 60) return 'var(--green)';
  if (rate >= 40) return 'var(--amber)';
  return 'var(--red)';
}

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
    return (
      <div className="empty-line">
        <CircleNotch size={20} className="animate-spin inline" style={{ color: 'var(--amber)' }} />
      </div>
    );
  }
  if (providers.length === 0) {
    return (
      <div className="empty-line">
        <Radio size={22} style={{ color: 'var(--muted-3)', display: 'block', margin: '0 auto 12px' }} />
        No signal providers yet — once traders start posting signals, they show up here.
      </div>
    );
  }

  return (
    <div>
      <p style={{ margin: '0 0 20px', fontWeight: 700, fontSize: 10, letterSpacing: '.04em', color: 'var(--amber)' }}>
        · {providers.length} ACTIVE
      </p>
      {/* 300px floor keeps this at 2-up inside the 720px `.split-2u` column,
          matching the reference; it still collapses to 1-up on narrow screens. */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: 24 }}>
        {(providers as Provider[]).map((p, i) => (
          <ProviderCard key={p.posterId} p={p} accent={ACCENTS[i % ACCENTS.length]} />
        ))}
      </div>
    </div>
  );
}

function ProviderCard({ p, accent }: { p: Provider; accent: string }) {
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
    <div className="provider">
      <span className="accent" style={{ background: accent }} />

      {/* Avatar */}
      <Link href={`/u/${p.handle}`} style={{ display: 'block' }}>
        <div
          className="av"
          style={{
            color: accent,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
          }}
        >
          {p.avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={p.avatar} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <span style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: 26, color: accent }}>
              {p.name.slice(0, 1).toUpperCase()}
            </span>
          )}
        </div>
      </Link>

      <h4>
        <Link href={`/u/${p.handle}`} style={{ color: 'inherit' }}>{p.name}</Link>
      </h4>
      <p className="meta">
        {tierLabel} · {p.followers} follower{p.followers === 1 ? '' : 's'}
      </p>

      {/* Win-rate showcase */}
      <div className="big">
        <b style={{ color: rateColor(p.hitRate) }}>{p.hitRate}%</b>
        <span>WIN RATE · {p.closed} CLOSED</span>
      </div>

      {/* Supporting stats */}
      <div className="row3">
        <div>
          <b>{p.won}/{p.lost}</b>
          <span>W / L</span>
        </div>
        <div>
          <b style={{ color: p.avgR >= 0 ? 'var(--green)' : 'var(--red)' }}>
            {p.avgR >= 0 ? '+' : ''}{p.avgR}R
          </b>
          <span>AVG R</span>
        </div>
        <div>
          <b>{p.total}</b>
          <span>SIGNALS</span>
        </div>
      </div>

      {/* Activity */}
      <p className="last">
        {p.active} active · {p.pending} pending{last ? ` · last ${last}` : ''}
      </p>

      {/* Follow / You */}
      {p.isSelf ? (
        <span
          className="follow"
          style={{ background: 'transparent', border: '1px solid var(--line-2)', color: 'var(--muted)' }}
        >
          You
        </span>
      ) : (
        <button
          onClick={toggle}
          disabled={busy}
          className="follow"
          style={{
            width: '100%',
            cursor: busy ? 'not-allowed' : 'pointer',
            opacity: busy ? 0.5 : 1,
            ...(following
              ? { background: 'transparent', border: '1px solid var(--line-2)', color: 'var(--text)' }
              : {}),
          }}
        >
          {following ? <><UserCheck size={14} /> Following</> : <><UserPlus size={14} /> Follow</>}
        </button>
      )}

      <Link href={`/u/${p.handle}`} className="vp">
        View profile <ArrowRight size={12} />
      </Link>
    </div>
  );
}
