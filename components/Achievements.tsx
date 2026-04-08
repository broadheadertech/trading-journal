'use client';

import { useMemo, useState } from 'react';
import { Trophy, Lock } from 'lucide-react';
import { computeBadges, tierGradient, type BadgeCategory, type EarnedBadge } from '@/lib/badges';
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
    <div className="space-y-6">
      {/* Header / progress summary */}
      <div className="glass rounded-3xl p-6 sm:p-8 relative overflow-hidden">
        <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full bg-gradient-to-br from-teal-500/20 to-emerald-500/10 blur-3xl pointer-events-none" />

        <div className="flex items-start justify-between flex-wrap gap-4 relative">
          <div>
            <div className="flex items-center gap-2 text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wider mb-1">
              <Trophy size={14} className="text-amber-400" /> Achievements
            </div>
            <h2 className="text-3xl font-bold tracking-tight text-[var(--foreground)]">
              {earned} <span className="text-[var(--muted-foreground)] text-2xl">/ {total}</span> badges earned
            </h2>
            <p className="text-sm text-[var(--muted-foreground)] mt-1">
              Hit milestones in volume, discipline, and reflection.
            </p>
          </div>

          {/* Circular progress */}
          <div className="relative w-24 h-24">
            <svg className="w-24 h-24 -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="42" strokeWidth="8" stroke="var(--border)" fill="none" />
              <circle
                cx="50"
                cy="50"
                r="42"
                strokeWidth="8"
                stroke="url(#grad)"
                fill="none"
                strokeLinecap="round"
                strokeDasharray={`${(pct / 100) * 264} 264`}
                className="transition-all duration-700"
              />
              <defs>
                <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#2dd4bf" />
                  <stop offset="100%" stopColor="#0d9488" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-xl font-bold text-[var(--foreground)]">{pct}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Category filter */}
      <div className="glass rounded-2xl p-1.5 inline-flex gap-1">
        {(Object.keys(CATEGORY_LABELS) as (BadgeCategory | 'all')[]).map(cat => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              filter === cat
                ? 'bg-gradient-to-br from-teal-500 to-teal-700 text-white shadow-lg shadow-teal-500/30'
                : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
            }`}
          >
            {CATEGORY_LABELS[cat]}
          </button>
        ))}
      </div>

      {/* Badge grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((b, idx) => (
          <BadgeCard key={b.id} badge={b} idx={idx} />
        ))}
      </div>
    </div>
  );
}

function BadgeCard({ badge, idx }: { badge: EarnedBadge; idx: number }) {
  return (
    <div
      style={{ animationDelay: `${idx * 50}ms` }}
      className={`glass rounded-2xl p-5 anim-fade-up relative overflow-hidden transition-all ${
        badge.earned ? 'border-amber-500/30' : ''
      }`}
    >
      {badge.earned && (
        <div className={`absolute -top-12 -right-12 w-32 h-32 rounded-full bg-gradient-to-br ${tierGradient(badge.tier)} opacity-20 blur-2xl pointer-events-none`} />
      )}

      <div className="flex items-start gap-4 relative">
        <div
          className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shrink-0 ${
            badge.earned
              ? `bg-gradient-to-br ${tierGradient(badge.tier)} shadow-lg`
              : 'bg-[var(--muted)]/30 grayscale opacity-40'
          }`}
        >
          {badge.earned ? badge.icon : <Lock size={20} className="text-[var(--muted-foreground)]" />}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <h3 className={`font-bold text-base ${badge.earned ? 'text-[var(--foreground)]' : 'text-[var(--muted-foreground)]'}`}>
              {badge.name}
            </h3>
            <span className={`text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded-full font-bold bg-gradient-to-br ${tierGradient(badge.tier)} ${badge.earned ? 'text-white' : 'opacity-30 text-white'}`}>
              {badge.tier}
            </span>
          </div>
          <p className="text-xs text-[var(--muted-foreground)] mb-3 leading-relaxed">{badge.description}</p>

          {/* Progress bar */}
          <div className="space-y-1">
            <div className="h-1.5 rounded-full bg-[var(--muted)]/40 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 bg-gradient-to-r ${tierGradient(badge.tier)}`}
                style={{ width: `${Math.round(badge.progressValue * 100)}%` }}
              />
            </div>
            <div className="text-[10px] text-[var(--muted-foreground)] font-medium">
              {badge.current} / {badge.target}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
