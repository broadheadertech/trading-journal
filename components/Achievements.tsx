'use client';

import { useMemo, useState } from 'react';
import { Trophy, Lock } from '@phosphor-icons/react';
import { computeBadges, type BadgeCategory, type BadgeTier, type EarnedBadge } from '@/lib/badges';
import type { Trade, DailyReflection } from '@/lib/types';

interface Props {
  trades: Trade[];
  reflections: DailyReflection[];
}

const CATEGORY_LABELS: Record<BadgeCategory | 'all', string> = {
  all: 'All',
  volume: 'Volume',
  discipline: 'Discipline',
  reflection: 'Reflection',
};

const TIER_TONE: Record<BadgeTier, string> = {
  // An ordered progression, so these need to stay distinguishable. Rendered
  // from the surviving palette: dim amber reads as bronze, amber as gold, and
  // near-white as platinum.
  bronze: '#8a6a18',
  silver: '#9fb0c2',
  gold: '#d99405',
  platinum: '#edf2f7',
};

export default function Achievements({ trades, reflections }: Props) {
  const [filter, setFilter] = useState<BadgeCategory | 'all'>('all');

  const badges = useMemo(
    () => computeBadges({ trades, reflections }),
    [trades, reflections],
  );

  const filtered = filter === 'all' ? badges : badges.filter(b => b.category === filter);
  const earned = badges.filter(b => b.earned).length;
  const total = badges.length;
  const pct = total > 0 ? Math.round((earned / total) * 100) : 0;

  return (
    <div>
      <div className="phead pwrap">
        <p className="eyebrow">
          <Trophy size={13} style={{ color: 'var(--amber)' }} /> Milestones
        </p>
        <h2>Achievements</h2>
        <p className="sub">Hit milestones in volume, discipline, and reflection.</p>
      </div>

      {/* Header / progress summary */}
      <div className="grid2">
        <div className="card" style={{ padding: '30px 28px' }}>
          <span className="accent" style={{ width: 80, background: 'var(--amber)' }} />
          <div className="row1" style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <p className="lbl b10">BADGES EARNED</p>
            <span className="pill">{pct}%</span>
          </div>
          <p className="bignum">
            {earned}
            <span style={{ fontSize: 26, color: 'var(--muted-2)' }}> / {total}</span>
          </p>
          <p className="sub" style={{ marginTop: 4 }}>
            Volume, discipline and reflection milestones tracked from your live journal.
          </p>
        </div>

        {/* Circular progress */}
        <div className="card score">
          <div className="scoredial">
            <svg viewBox="0 0 80 80" width="80" height="80" fill="none">
              <circle cx="40" cy="40" r="37.5" stroke="#16202c" strokeWidth="5" />
              <circle
                cx="40"
                cy="40"
                r="37.5"
                stroke="#24c88a"
                strokeWidth="5"
                strokeLinecap="round"
                strokeDasharray={`${(pct / 100) * 235.6} 235.6`}
                transform="rotate(-90 40 40)"
                className="transition-all duration-700"
              />
            </svg>
            <span className="v" style={{ fontSize: 26 }}>{pct}%</span>
          </div>
          <p className="ttl">Completion</p>
          <p>Volume + Discipline<br />+ Reflection</p>
        </div>
      </div>

      {/* Category filter */}
      <div className="tabs line" style={{ marginTop: 32 }}>
        {(Object.keys(CATEGORY_LABELS) as (BadgeCategory | 'all')[]).map(cat => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            className={filter === cat ? 'on' : undefined}
          >
            {CATEGORY_LABELS[cat]}
          </button>
        ))}
      </div>

      {/* Badge grid */}
      <div className="split-3">
        {filtered.map((b, idx) => (
          <BadgeCard key={b.id} badge={b} idx={idx} />
        ))}
      </div>
    </div>
  );
}

function BadgeCard({ badge, idx }: { badge: EarnedBadge; idx: number }) {
  const tone = TIER_TONE[badge.tier];
  return (
    <div
      style={{ animationDelay: `${idx * 50}ms`, opacity: badge.earned ? 1 : 0.72 }}
      className="reward anim-fade-up"
    >
      <span className="accent" style={{ background: badge.earned ? tone : 'var(--line-2)' }} />

      <div className="rtop">
        <span
          className="ic"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 20,
            border: `1px solid ${badge.earned ? tone : 'var(--line-2)'}`,
            background: 'var(--panel-2)',
            filter: badge.earned ? undefined : 'grayscale(1)',
          }}
        >
          {badge.earned ? badge.icon : <Lock size={18} style={{ color: 'var(--muted-2)' }} />}
        </span>

        <h4 style={{ color: badge.earned ? 'var(--text)' : 'var(--text-2)' }}>{badge.name}</h4>
        <span
          className="tag"
          style={{ background: 'var(--panel-2)', border: `1px solid ${tone}`, color: tone }}
        >
          {badge.tier.toUpperCase()}
        </span>
      </div>

      <p>{badge.description}</p>

      {/* Progress bar */}
      <div className="prog">
        <i
          className="transition-all duration-700"
          style={{ width: `${Math.round(badge.progressValue * 100)}%`, background: tone }}
        />
      </div>
      <p className="st">
        {badge.current} / {badge.target}
      </p>
    </div>
  );
}
