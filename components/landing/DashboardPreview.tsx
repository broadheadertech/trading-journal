'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { Search, Activity, BarChart3, AlertTriangle, TrendingUp, Flame } from 'lucide-react';
import AtmosphericBackground from './AtmosphericBackground';

export default function DashboardPreview() {
  return (
    <section id="dashboard-preview" className="relative overflow-hidden py-20 sm:py-28 border-t border-[var(--border)]">
      <AtmosphericBackground />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight">
            <span className="bg-gradient-to-r from-orange-400 to-amber-400 bg-clip-text text-transparent">Your dashboard after</span>{' '}
            <span className="neon-headline">one CSV upload</span>
          </h2>
          <p className="mt-4 text-[var(--muted-foreground)] max-w-2xl mx-auto">
            Three core dashboards, each one purpose-built to surface what&apos;s draining your account and what&apos;s working.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-10">
          <PillarCard delay={0} icon={Search} accent="from-rose-400 to-orange-400" title="Find Your Leaks" desc="Every costly pattern ranked by dollar impact. Revenge trading, overtrading, FOMO — each measured in real money lost.">
            <LeaksMock />
          </PillarCard>
          <PillarCard delay={0.1} icon={Activity} accent="from-pink-400 to-fuchsia-400" title="Track Your Discipline" desc="Your behavioral health score, emotional pressure tracking, and session-by-session discipline monitoring.">
            <DisciplineMock />
          </PillarCard>
          <PillarCard delay={0.2} icon={BarChart3} accent="from-fuchsia-400 to-pink-500" title="Measure Your Edge" desc="Win rate, profit factor, equity curve, symbol breakdown — all the metrics that matter, computed automatically.">
            <EdgeMock />
          </PillarCard>
        </div>

        <div className="flex justify-center">
          <Link
            href="/sign-up"
            className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl text-sm font-semibold text-slate-900 bg-gradient-to-r from-orange-400 to-amber-400 hover:from-orange-300 hover:to-amber-300 shadow-[0_0_30px_-4px_rgba(251,146,60,0.6)] transition-all"
          >
            Start Free — See Your Own Dashboard
          </Link>
        </div>
      </div>
    </section>
  );
}

function PillarCard({ icon: Icon, accent, title, desc, children, delay }: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  accent: string; title: string; desc: string; children: React.ReactNode; delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-100px' }}
      transition={{ duration: 0.5, delay }}
      className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 hover:border-pink-500/30 transition-colors"
    >
      <div className="flex items-center gap-3 mb-4">
        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${accent} bg-opacity-20 flex items-center justify-center`}>
          <Icon size={18} className="text-slate-900" />
        </div>
        <h3 className="text-base font-bold text-[var(--foreground)]">{title}</h3>
      </div>
      <div className="rounded-xl border border-[var(--border)] bg-black/30 p-4 mb-4 min-h-[200px]">{children}</div>
      <p className="text-xs text-[var(--muted-foreground)] leading-relaxed">{desc}</p>
    </motion.div>
  );
}

function LeaksMock() {
  const leaks = [
    { name: 'Revenge Trading',  cost: '−$1,420', sev: 'high',   pct: 100 },
    { name: 'Oversized Position', cost: '−$890',  sev: 'high',   pct: 63 },
    { name: 'FOMO Entries',     cost: '−$540',  sev: 'med',    pct: 38 },
    { name: 'Late Session Drift', cost: '−$280', sev: 'med',    pct: 20 },
    { name: 'No Stop Loss',     cost: '−$140',  sev: 'low',    pct: 10 },
  ];
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest text-rose-400/80 mb-2">
        <Flame size={10} /> Leaks ranked by $ impact
      </div>
      {leaks.map((l, i) => (
        <div key={l.name} className="space-y-1">
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-[var(--foreground)] font-medium">{l.name}</span>
            <span className={`tabular-nums font-bold ${l.sev === 'high' ? 'text-rose-400' : l.sev === 'med' ? 'text-amber-400' : 'text-[var(--muted-foreground)]'}`}>
              {l.cost}
            </span>
          </div>
          <div className="h-1 rounded-full bg-white/5 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              whileInView={{ width: `${l.pct}%` }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.1 * i }}
              className={`h-full ${l.sev === 'high' ? 'bg-gradient-to-r from-rose-500 to-orange-400' : l.sev === 'med' ? 'bg-gradient-to-r from-amber-500 to-yellow-400' : 'bg-[var(--muted-foreground)]/40'}`}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function DisciplineMock() {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest text-pink-400/80">
        <Activity size={10} /> 30-day discipline score
      </div>
      <div className="flex items-center justify-center py-2">
        <div className="relative">
          <svg width="120" height="120" viewBox="0 0 120 120">
            <circle cx="60" cy="60" r="50" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
            <motion.circle
              cx="60" cy="60" r="50"
              fill="none"
              stroke="url(#discGrad)"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={`${(78 / 100) * 314} 314`}
              transform="rotate(-90 60 60)"
              initial={{ strokeDasharray: '0 314' }}
              whileInView={{ strokeDasharray: `${(78 / 100) * 314} 314` }}
              viewport={{ once: true }}
              transition={{ duration: 1 }}
            />
            <defs>
              <linearGradient id="discGrad">
                <stop offset="0%" stopColor="#22c55e" />
                <stop offset="100%" stopColor="#22c55e" />
              </linearGradient>
            </defs>
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold bg-gradient-to-r from-orange-400 to-amber-400 bg-clip-text text-transparent tabular-nums">78</span>
            <span className="text-[8px] uppercase tracking-widest text-[var(--muted-foreground)]">/ 100</span>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1">
        {[0.6, 0.4, 0.7, 0.85, 0.3, 0.9, 0.78].map((v, i) => (
          <div key={i} className="text-center">
            <div className="h-10 flex items-end justify-center">
              <div className="w-full rounded-sm bg-gradient-to-t from-green-500 to-green-400" style={{ height: `${v * 100}%` }} />
            </div>
            <div className="text-[8px] text-[var(--muted-foreground)] mt-0.5">{['M','T','W','T','F','S','S'][i]}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function EdgeMock() {
  const points = [10, 18, 14, 22, 28, 24, 32, 30, 38, 42, 46, 44, 52, 56, 54, 62];
  const max = Math.max(...points);
  const path = points.map((p, i) => `${(i / (points.length - 1)) * 100},${100 - (p / max) * 100}`).join(' ');
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest text-pink-400/80">
        <TrendingUp size={10} /> Equity curve · 30d
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-lg border border-[var(--border)] bg-black/30 p-2">
          <div className="text-[8px] uppercase tracking-widest text-[var(--muted-foreground)]/70">Win Rate</div>
          <div className="text-lg font-bold text-pink-300 tabular-nums">93%</div>
        </div>
        <div className="rounded-lg border border-[var(--border)] bg-black/30 p-2">
          <div className="text-[8px] uppercase tracking-widest text-[var(--muted-foreground)]/70">Profit Factor</div>
          <div className="text-lg font-bold text-pink-300 tabular-nums">2.14</div>
        </div>
      </div>
      <div className="rounded-lg border border-[var(--border)] bg-black/30 p-2">
        <svg className="w-full h-20" viewBox="0 0 100 100" preserveAspectRatio="none">
          <defs>
            <linearGradient id="edgeFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#22c55e" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#22c55e" stopOpacity="0" />
            </linearGradient>
          </defs>
          <polygon fill="url(#edgeFill)" points={`0,100 ${path} 100,100`} />
          <polyline fill="none" stroke="#22c55e" strokeWidth="1.2" points={path} />
        </svg>
      </div>
      <div className="flex items-center justify-between text-[9px]">
        <span className="text-[var(--muted-foreground)]">Sharpe 1.84</span>
        <span className="text-[var(--muted-foreground)]">Max DD 8.2%</span>
        <span className="text-pink-400">+$4,230</span>
      </div>
    </div>
  );
}
