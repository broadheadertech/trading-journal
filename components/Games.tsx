'use client';

import { Gamepad2, Coins, Bell } from 'lucide-react';

export default function Games() {
  return (
    <div className="relative space-y-10">
      <div className="hero-glow" />

      <header className="space-y-3 anim-fade-up">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass text-xs font-medium text-[var(--muted-foreground)]">
          <Gamepad2 size={12} /> Soon to release
        </div>
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-[var(--foreground)]">
          Trading <span className="gradient-text">games</span>
        </h1>
        <p className="text-base text-[var(--muted-foreground)] max-w-xl">
          Sharpen your edge through gamified challenges. Compete, level up, and earn USDT rewards.
        </p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {[
          { title: 'Pattern Spotter', emoji: '🎯', desc: 'Identify chart patterns under time pressure.' },
          { title: 'Risk Manager',    emoji: '⚖️', desc: 'Survive 100 trades with the right position sizing.' },
          { title: 'Bias Buster',     emoji: '🧠', desc: 'Spot the cognitive bias before it hits your P&L.' },
          { title: 'Setup Sprint',    emoji: '⚡', desc: 'Build a rule-based setup in under 60 seconds.' },
          { title: 'Drawdown Run',    emoji: '🛡️', desc: 'Protect capital through a market storm.' },
          { title: 'News Reactor',    emoji: '📰', desc: 'Decide: trade the news or sit it out?' },
        ].map((g, idx) => (
          <div key={g.title} style={{ animationDelay: `${idx * 60}ms` }} className="glass rounded-3xl p-6 card-lift anim-fade-up relative overflow-hidden">
            <div className="absolute top-3 right-3 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 text-[9px] font-bold uppercase tracking-wider">
              <Bell size={10} /> Soon
            </div>
            <div className="text-5xl mb-3">{g.emoji}</div>
            <h3 className="font-bold text-lg text-[var(--foreground)] tracking-tight">{g.title}</h3>
            <p className="text-sm text-[var(--muted-foreground)] mt-1">{g.desc}</p>
            <div className="flex items-center gap-1.5 mt-4 text-xs font-medium text-emerald-400">
              <Coins size={12} /> Earn USDT
            </div>
          </div>
        ))}
      </div>

      <div className="glass rounded-3xl p-6 anim-fade-up text-center">
        <p className="text-sm text-[var(--foreground)] font-medium">Want early access?</p>
        <p className="text-xs text-[var(--muted-foreground)] mt-1">Active subscribers get the closed beta first. Stay tuned.</p>
      </div>
    </div>
  );
}
