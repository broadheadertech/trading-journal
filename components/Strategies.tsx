'use client';

import { TrendingUp, BookOpen, Target, Zap } from 'lucide-react';

export default function Strategies() {
  return (
    <div className="relative space-y-10">
      <div className="hero-glow" />

      <header className="space-y-3 anim-fade-up">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass text-xs font-medium text-[var(--muted-foreground)]">
          <TrendingUp size={12} /> Curated playbooks
        </div>
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-[var(--foreground)]">
          Trading <span className="gradient-text">strategies</span>
        </h1>
        <p className="text-base text-[var(--muted-foreground)] max-w-xl">
          Explore vetted, battle-tested strategies built by senior traders.
        </p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          { title: 'Trend Continuation', tag: 'Swing', icon: TrendingUp },
          { title: 'Mean Reversion', tag: 'Intraday', icon: Target },
          { title: 'Breakout Pullback', tag: 'Day Trading', icon: Zap },
          { title: 'Liquidity Sweeps', tag: 'Smart Money', icon: BookOpen },
        ].map((s, idx) => {
          const Icon = s.icon;
          return (
            <div key={s.title} style={{ animationDelay: `${idx * 60}ms` }} className="glass rounded-3xl p-6 card-lift anim-fade-up">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-teal-500/20 to-emerald-500/10 flex items-center justify-center mb-4">
                <Icon size={20} className="text-teal-400" />
              </div>
              <span className="text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-400 font-medium">{s.tag}</span>
              <h3 className="font-bold text-lg text-[var(--foreground)] tracking-tight mt-2">{s.title}</h3>
              <p className="text-sm text-[var(--muted-foreground)] mt-1">Coming soon — full breakdown with rules, examples, and backtests.</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
