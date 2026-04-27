'use client';

import { Gift, Calendar, DollarSign, Sparkles, Ticket } from 'lucide-react';

export default function Rewards() {
  return (
    <div className="relative space-y-10">
      <div className="hero-glow" />

      <header className="space-y-3 anim-fade-up">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass text-xs font-medium text-[var(--muted-foreground)]">
          <Gift size={12} /> Loyalty program
        </div>
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-[var(--foreground)]">
          Rewards & <span className="gradient-text">Bonuses</span>
        </h1>
        <p className="text-base text-[var(--muted-foreground)] max-w-xl">
          Earn perks for being active — free subscription extensions, funded account raffles, and more.
        </p>
      </header>

      {/* Featured rewards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass rounded-3xl p-6 card-lift anim-fade-up">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500/30 to-teal-500/10 flex items-center justify-center text-2xl">
              🎁
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-bold text-lg text-[var(--foreground)]">Free 1-month subscription</h3>
                <span className="text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 font-bold">Active</span>
              </div>
              <p className="text-sm text-[var(--muted-foreground)] mb-3">
                Hit 30 trades logged + 7-day reflection streak this month → automatic next-month free extension.
              </p>
              <div className="h-2 rounded-full bg-[var(--muted)]/40 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-500" style={{ width: '0%' }} />
              </div>
              <div className="text-[10px] text-[var(--muted-foreground)] mt-1">0 / 30 trades · 0 / 7 reflection days</div>
            </div>
          </div>
        </div>

        <div className="glass rounded-3xl p-6 card-lift anim-fade-up" style={{ animationDelay: '60ms' }}>
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500/30 to-orange-500/10 flex items-center justify-center text-2xl">
              🎰
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-bold text-lg text-[var(--foreground)]">Funded Account Raffle</h3>
                <span className="text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 font-bold">Monthly</span>
              </div>
              <p className="text-sm text-[var(--muted-foreground)] mb-3">
                Every completed monthly review = 1 raffle ticket toward a $10K funded account challenge.
              </p>
              <div className="flex items-center gap-2 text-sm">
                <Ticket size={14} className="text-amber-400" />
                <span className="font-bold text-[var(--foreground)]">0 tickets</span>
                <span className="text-[var(--muted-foreground)] text-xs">· next draw on the 1st</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* How to earn */}
      <div className="glass rounded-3xl p-6 anim-fade-up" style={{ animationDelay: '120ms' }}>
        <h2 className="text-lg font-bold text-[var(--foreground)] mb-4 flex items-center gap-2">
          <Sparkles size={16} className="text-teal-400" /> Ways to earn
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { icon: Calendar, label: 'Daily reflection',  reward: '+1 streak point' },
            { icon: DollarSign, label: 'Hit weekly profit goal', reward: '+1 raffle ticket' },
            { icon: Gift,     label: 'Refer a friend',    reward: '1 month free per signup' },
            { icon: Ticket,   label: 'Complete a course', reward: '+3 raffle tickets' },
          ].map(({ icon: Icon, label, reward }) => (
            <div key={label} className="flex items-center gap-3 p-3 rounded-2xl bg-[var(--background)]/50 border border-[var(--border)]">
              <Icon size={16} className="text-teal-400" />
              <div className="flex-1 text-sm font-medium text-[var(--foreground)]">{label}</div>
              <div className="text-xs text-[var(--muted-foreground)]">{reward}</div>
            </div>
          ))}
        </div>
      </div>

      <p className="text-xs text-[var(--muted-foreground)] text-center">
        Tracking system in development — rewards will be auto-credited once activity tracking is live.
      </p>
    </div>
  );
}
