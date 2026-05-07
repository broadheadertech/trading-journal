'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { LayoutDashboard, Search, Activity, BarChart3, Shield, ArrowRight, AlertTriangle, TrendingUp, Flame, CheckCircle2, Clock } from 'lucide-react';
import LandingNav from '@/components/landing/LandingNav';
import Footer from '@/components/landing/Footer';

const FEATURES = [
  {
    icon: LayoutDashboard,
    title: 'Dashboard',
    desc: 'Your main command center â€” portfolio equity curve, net P&L, win rate, profit factor, activity heatmap, and trade history at a glance. All metrics update automatically as you import trades.',
    Mock: DashboardMock,
  },
  {
    icon: Search,
    title: 'Leak Detection',
    desc: 'The verdict engine ranks every costly pattern by dollar impact â€” revenge trading, overtrading, bad session hours, FOMO entries â€” with evidence clusters and recovery estimates for each.',
    Mock: LeakMock,
  },
  {
    icon: Activity,
    title: 'Behavior Analysis',
    desc: 'Behavior analysis tracks your discipline score over time, monitors emotional pressure across sessions, and shows whether your fixes are actually sticking week over week.',
    Mock: BehaviorMock,
  },
  {
    icon: BarChart3,
    title: 'Performance Analytics',
    desc: 'Deep performance analytics â€” breakdown by symbol, time of day, session, and trade type. 50+ metrics to find exactly which setups make money and which ones bleed.',
    Mock: PerformanceMock,
  },
  {
    icon: Shield,
    title: 'Playbook',
    desc: 'Define your trading rules once â€” max trades per session, risk limits, session hours â€” and track compliance automatically on every trade you import. No self-grading, no bias.',
    Mock: PlaybookMock,
  },
];

export default function DemoPage() {
  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <LandingNav />

      <section className="relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-pink-500 opacity-[0.07] rounded-full blur-[120px]" />
        </div>

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-16 sm:pt-20 pb-10 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full border border-[var(--border)] bg-[var(--card)] text-xs text-[var(--muted-foreground)] mb-6"
          >
            <span className="flex h-2 w-2 relative">
              <span className="absolute inline-flex h-full w-full rounded-full bg-pink-400 opacity-75 animate-ping" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-pink-500" />
            </span>
            Live Demo Â· Trading Analytics in Action
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-3xl sm:text-4xl lg:text-5xl font-bold text-[var(--foreground)] tracking-tight"
          >
            This is what your{' '}
            <span className="bg-gradient-to-r from-pink-400 to-fuchsia-400 bg-clip-text text-transparent">dashboard looks like</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mt-5 text-base sm:text-lg text-[var(--muted-foreground)] max-w-2xl mx-auto"
          >
            Real screens from the live app with sample data. Upload your own trades and see your actual numbers in under 60 seconds.
          </motion.p>
        </div>
      </section>

      <section className="py-12 sm:py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 space-y-16">
          {FEATURES.map((f, idx) => {
            const Icon = f.icon;
            const Mock = f.Mock;
            const reverse = idx % 2 === 1;
            return (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-100px' }}
                transition={{ duration: 0.5 }}
                className={`grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center ${reverse ? 'lg:[direction:rtl]' : ''}`}
              >
                <div className={reverse ? '[direction:ltr]' : ''}>
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-pink-500/20 bg-pink-500/10 text-[10px] font-bold uppercase tracking-widest text-pink-400 mb-4">
                    <Icon size={12} /> {f.title}
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-bold text-[var(--foreground)] tracking-tight mb-3">{f.title}</h2>
                  <p className="text-sm sm:text-base text-[var(--muted-foreground)] leading-relaxed">{f.desc}</p>
                </div>
                <div className={`relative ${reverse ? '[direction:ltr]' : ''}`}>
                  <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-2xl overflow-hidden">
                    {/* Browser chrome */}
                    <div className="flex items-center gap-1.5 px-3 py-2 border-b border-[var(--border)] bg-black/40">
                      <span className="w-2 h-2 rounded-full bg-red-500/50" />
                      <span className="w-2 h-2 rounded-full bg-amber-500/50" />
                      <span className="w-2 h-2 rounded-full bg-pink-500/50" />
                      <div className="flex-1 mx-2 px-2 py-0.5 rounded bg-black/40 text-[9px] text-[var(--muted-foreground)] text-center font-mono">
                        tradia.app/app
                      </div>
                    </div>
                    <div className="p-4 sm:p-5 bg-black/20 min-h-[320px]">
                      <Mock />
                    </div>
                  </div>
                  <div className="absolute -bottom-2 -right-2 px-2 py-0.5 rounded bg-pink-500 text-[9px] font-bold uppercase tracking-wider text-slate-900">
                    Sample data
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </section>

      <section className="py-16 sm:py-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.5 }}
            className="rounded-3xl border border-pink-500/20 bg-gradient-to-br from-pink-500/5 to-fuchsia-500/5 p-10 sm:p-14 text-center"
          >
            <h2 className="text-2xl sm:text-3xl font-bold text-[var(--foreground)] tracking-tight">
              Ready to see your <span className="bg-gradient-to-r from-pink-400 to-fuchsia-400 bg-clip-text text-transparent">own numbers?</span>
            </h2>
            <p className="mt-4 text-[var(--muted-foreground)] max-w-xl mx-auto">
              Upload your first CSV and get your real dashboard â€” with your actual trades, your actual patterns, your actual dollar costs. Takes 60 seconds.
            </p>
            <Link
              href="/sign-up"
              className="inline-flex items-center gap-2 mt-6 px-6 py-3.5 rounded-xl text-sm font-semibold text-slate-900 bg-gradient-to-r from-orange-400 to-amber-400 hover:from-orange-300 hover:to-amber-300 shadow-[0_0_30px_-4px_rgba(251,146,60,0.6)] transition-all"
            >
              Start with Your Own Trades
              <ArrowRight size={16} />
            </Link>
            <p className="mt-4 text-xs text-[var(--muted-foreground)]">
              No credit card Â· 14-day full Pro access Â· 67+ broker formats
            </p>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
}

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ Dashboard Mock â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
function DashboardMock() {
  const ranges = ['1D', '1W', '1M', '3M', '1Y', 'ALL'];
  const heatmap = Array.from({ length: 28 }, (_, i) => Math.random() * 100 - 30);
  return (
    <div className="space-y-3">
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted-foreground)]/70">Dashboard</div>
          <div className="text-xl font-bold text-[var(--foreground)]">Welcome back, trader</div>
        </div>
        <div className="flex items-center gap-0.5 rounded-md bg-black/30 border border-[var(--border)] p-0.5">
          {ranges.map(r => (
            <span key={r} className={`text-[8px] font-bold px-2 py-1 rounded ${r === '1M' ? 'bg-pink-500/20 text-pink-300' : 'text-[var(--muted-foreground)]'}`}>{r}</span>
          ))}
        </div>
      </div>

      {/* KPI tiles */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { l: 'Net P&L',       v: '+$4,230', sub: '+18.3%',     tone: 'emerald' },
          { l: 'Win Rate',      v: '67%',     sub: '52W / 26L',  tone: 'emerald' },
          { l: 'Profit Factor', v: '2.14',    sub: 'Gross 2.4x', tone: 'emerald' },
          { l: 'Avg Trade',     v: '+$54',    sub: '78 trades',  tone: 'emerald' },
        ].map(s => (
          <div key={s.l} className="rounded-lg border border-[var(--border)] bg-black/30 p-2.5">
            <div className="text-[8px] font-bold uppercase tracking-widest text-[var(--muted-foreground)]/70">{s.l}</div>
            <div className="text-base font-bold text-pink-300 tabular-nums leading-tight mt-0.5">{s.v}</div>
            <div className="text-[8px] text-[var(--muted-foreground)] tabular-nums">{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Equity curve */}
      <div className="rounded-lg border border-[var(--border)] bg-black/30 p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[9px] font-bold uppercase tracking-widest text-[var(--muted-foreground)]/70">Equity Curve Â· 30d</span>
          <span className="text-[9px] text-pink-400 tabular-nums">â†‘ +$4,230</span>
        </div>
        <svg className="w-full h-24" viewBox="0 0 300 80" preserveAspectRatio="none">
          <defs>
            <linearGradient id="eqA" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#34d399" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#34d399" stopOpacity="0" />
            </linearGradient>
          </defs>
          <polygon
            fill="url(#eqA)"
            points="0,80 0,68 25,62 50,65 75,55 100,58 125,48 150,52 175,40 200,42 225,30 250,28 275,18 300,12 300,80"
          />
          <polyline fill="none" stroke="#34d399" strokeWidth="1.5" points="0,68 25,62 50,65 75,55 100,58 125,48 150,52 175,40 200,42 225,30 250,28 275,18 300,12" />
        </svg>
      </div>

      {/* Activity heatmap */}
      <div className="rounded-lg border border-[var(--border)] bg-black/30 p-3">
        <div className="text-[9px] font-bold uppercase tracking-widest text-[var(--muted-foreground)]/70 mb-2">Activity Heatmap</div>
        <div className="grid grid-cols-7 gap-1">
          {heatmap.map((v, i) => {
            const intensity = Math.abs(v) / 100;
            const positive = v > 0;
            return (
              <div
                key={i}
                className="aspect-square rounded-sm"
                style={{
                  backgroundColor: positive
                    ? `rgba(52, 211, 153, ${0.15 + intensity * 0.6})`
                    : `rgba(244, 63, 94, ${0.1 + intensity * 0.5})`,
                }}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ Leak Detection Mock â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
function LeakMock() {
  const leaks = [
    { name: 'Revenge Trading',  evidence: '14 trades', cost: 'âˆ’$1,420', recovery: '+$840 if fixed',  pct: 100, sev: 'high' },
    { name: 'Oversized Position', evidence: '8 trades',  cost: 'âˆ’$890',  recovery: '+$520 if fixed',  pct: 63, sev: 'high' },
    { name: 'FOMO Entries',     evidence: '11 trades', cost: 'âˆ’$540',  recovery: '+$310 if fixed',  pct: 38, sev: 'med' },
    { name: 'Late Session Drift', evidence: '6 trades',  cost: 'âˆ’$280',  recovery: '+$180 if fixed',  pct: 20, sev: 'med' },
    { name: 'No Stop Loss',     evidence: '4 trades',  cost: 'âˆ’$140',  recovery: '+$95 if fixed',   pct: 10, sev: 'low' },
  ];
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-widest text-rose-400/80 flex items-center gap-1.5">
            <Flame size={11} /> Verdicts Â· ranked by $ impact
          </div>
          <div className="text-xl font-bold text-[var(--foreground)] mt-0.5">5 patterns detected</div>
        </div>
        <div className="text-right">
          <div className="text-[8px] font-bold uppercase tracking-widest text-[var(--muted-foreground)]/70">Total cost</div>
          <div className="text-lg font-bold text-rose-400 tabular-nums">âˆ’$3,270</div>
        </div>
      </div>
      <div className="space-y-2">
        {leaks.map((l, i) => (
          <div key={l.name} className="rounded-lg border border-[var(--border)] bg-black/30 p-2.5">
            <div className="flex items-start justify-between gap-3 mb-1.5">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <AlertTriangle size={10} className={l.sev === 'high' ? 'text-rose-400' : l.sev === 'med' ? 'text-amber-400' : 'text-[var(--muted-foreground)]'} />
                  <span className="text-xs font-bold text-[var(--foreground)]">{l.name}</span>
                  <span className={`text-[8px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded ${l.sev === 'high' ? 'bg-rose-500/15 text-rose-300' : l.sev === 'med' ? 'bg-amber-500/15 text-amber-300' : 'bg-white/5 text-[var(--muted-foreground)]'}`}>
                    {l.sev}
                  </span>
                </div>
                <div className="text-[9px] text-[var(--muted-foreground)] mt-0.5">{l.evidence} Â· {l.recovery}</div>
              </div>
              <div className={`tabular-nums font-bold text-sm ${l.sev === 'high' ? 'text-rose-400' : l.sev === 'med' ? 'text-amber-400' : 'text-[var(--muted-foreground)]'}`}>{l.cost}</div>
            </div>
            <div className="h-1 rounded-full bg-white/5 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                whileInView={{ width: `${l.pct}%` }}
                viewport={{ once: true }}
                transition={{ duration: 0.7, delay: 0.08 * i }}
                className={`h-full ${l.sev === 'high' ? 'bg-gradient-to-r from-rose-500 to-orange-400' : l.sev === 'med' ? 'bg-gradient-to-r from-amber-500 to-yellow-400' : 'bg-[var(--muted-foreground)]/40'}`}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ Behavior Analysis Mock â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
function BehaviorMock() {
  const emotions = [
    { l: 'Calm',       v: 78, c: 'emerald' },
    { l: 'Confident',  v: 64, c: 'emerald' },
    { l: 'FOMO',       v: 42, c: 'amber' },
    { l: 'Frustrated', v: 28, c: 'rose' },
    { l: 'Tilted',     v: 12, c: 'rose' },
  ];
  return (
    <div className="space-y-3">
      <div className="text-[10px] font-bold uppercase tracking-widest text-pink-400/80 flex items-center gap-1.5">
        <Activity size={11} /> Behavioral Health Â· 30d
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* Discipline donut */}
        <div className="rounded-lg border border-[var(--border)] bg-black/30 p-3 flex items-center gap-3">
          <div className="relative">
            <svg width="80" height="80" viewBox="0 0 80 80">
              <circle cx="40" cy="40" r="32" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6" />
              <motion.circle
                cx="40" cy="40" r="32"
                fill="none"
                stroke="url(#discG)"
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray="201"
                initial={{ strokeDashoffset: 201 }}
                whileInView={{ strokeDashoffset: 201 - (78 / 100) * 201 }}
                viewport={{ once: true }}
                transition={{ duration: 1 }}
                transform="rotate(-90 40 40)"
              />
              <defs>
                <linearGradient id="discG">
                  <stop offset="0%" stopColor="#5eead4" />
                  <stop offset="100%" stopColor="#22d3ee" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-xl font-bold bg-gradient-to-r from-orange-400 to-amber-400 bg-clip-text text-transparent tabular-nums">78</span>
              <span className="text-[7px] uppercase tracking-widest text-[var(--muted-foreground)]">/ 100</span>
            </div>
          </div>
          <div>
            <div className="text-[8px] font-bold uppercase tracking-widest text-[var(--muted-foreground)]/70">Discipline Score</div>
            <div className="text-[10px] text-pink-400 tabular-nums mt-1">â†‘ +14 vs last month</div>
            <div className="text-[9px] text-[var(--muted-foreground)] mt-1">Above your 90-day avg</div>
          </div>
        </div>

        {/* Streak block */}
        <div className="rounded-lg border border-[var(--border)] bg-black/30 p-3">
          <div className="text-[8px] font-bold uppercase tracking-widest text-[var(--muted-foreground)]/70">Compliance Streak</div>
          <div className="flex items-baseline gap-1.5 mt-0.5">
            <span className="text-2xl font-bold text-pink-300 tabular-nums">12</span>
            <span className="text-[9px] text-[var(--muted-foreground)]">days following plan</span>
          </div>
          <div className="grid grid-cols-14 gap-0.5 mt-2" style={{ gridTemplateColumns: 'repeat(14,1fr)' }}>
            {Array.from({ length: 14 }, (_, i) => (
              <div key={i} className={`h-3 rounded-sm ${i < 12 ? 'bg-gradient-to-t from-pink-500 to-pink-400' : 'bg-white/5'}`} />
            ))}
          </div>
        </div>
      </div>

      {/* Emotional pressure */}
      <div className="rounded-lg border border-[var(--border)] bg-black/30 p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[9px] font-bold uppercase tracking-widest text-[var(--muted-foreground)]/70">Emotional Pressure Â· session avg</span>
          <span className="text-[9px] text-pink-400">Net positive 7/10</span>
        </div>
        <div className="space-y-1.5">
          {emotions.map(e => (
            <div key={e.l} className="flex items-center gap-2">
              <span className="text-[9px] text-[var(--foreground)] w-16 shrink-0">{e.l}</span>
              <div className="flex-1 h-1.5 rounded-full bg-white/5 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  whileInView={{ width: `${e.v}%` }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.7 }}
                  className={`h-full ${
                    e.c === 'emerald' ? 'bg-gradient-to-r from-pink-500 to-pink-400' :
                    e.c === 'amber'   ? 'bg-gradient-to-r from-amber-500 to-yellow-400' :
                                        'bg-gradient-to-r from-rose-500 to-orange-400'
                  }`}
                />
              </div>
              <span className="text-[9px] tabular-nums text-[var(--muted-foreground)] w-7 text-right">{e.v}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ Performance Analytics Mock â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
function PerformanceMock() {
  const symbols = [
    { s: 'SOL/USDT',  pnl: '+$1,240', wr: 82, n: 14 },
    { s: 'BTC/USDT',  pnl: '+$890',  wr: 68, n: 22 },
    { s: 'ETH/USDT',  pnl: '+$420',  wr: 61, n: 18 },
    { s: 'AVAX/USDT', pnl: 'âˆ’$180',  wr: 41, n: 9  },
    { s: 'BNB/USDT',  pnl: 'âˆ’$340',  wr: 29, n: 7  },
  ];
  const hours = Array.from({ length: 24 }, (_, h) => {
    const v = Math.sin((h - 6) / 6) * 80 + (h >= 9 && h <= 16 ? 40 : 0);
    return Math.max(-60, Math.min(120, v));
  });
  return (
    <div className="space-y-3">
      <div className="text-[10px] font-bold uppercase tracking-widest text-pink-400/80 flex items-center gap-1.5">
        <BarChart3 size={11} /> Performance Â· 50+ metrics
      </div>

      {/* Symbol breakdown */}
      <div className="rounded-lg border border-[var(--border)] bg-black/30 p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[9px] font-bold uppercase tracking-widest text-[var(--muted-foreground)]/70">By Symbol</span>
          <span className="text-[9px] text-[var(--muted-foreground)]">5 of 12 shown</span>
        </div>
        <div className="space-y-1.5">
          {symbols.map(s => (
            <div key={s.s} className="grid grid-cols-[80px_1fr_60px_40px] items-center gap-2">
              <span className="text-[10px] font-bold text-[var(--foreground)] tabular-nums">{s.s}</span>
              <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  whileInView={{ width: `${s.wr}%` }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.7 }}
                  className={`h-full ${s.wr >= 60 ? 'bg-gradient-to-r from-pink-500 to-pink-400' : s.wr >= 45 ? 'bg-amber-500' : 'bg-rose-500'}`}
                />
              </div>
              <span className={`text-[10px] font-bold tabular-nums text-right ${s.pnl.startsWith('+') ? 'text-pink-400' : 'text-rose-400'}`}>{s.pnl}</span>
              <span className="text-[9px] tabular-nums text-[var(--muted-foreground)] text-right">{s.n}t</span>
            </div>
          ))}
        </div>
      </div>

      {/* Time of day */}
      <div className="rounded-lg border border-[var(--border)] bg-black/30 p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[9px] font-bold uppercase tracking-widest text-[var(--muted-foreground)]/70">Hourly P&L distribution</span>
          <span className="text-[9px] text-pink-400 flex items-center gap-1"><Clock size={9} /> Peak: 13:00</span>
        </div>
        <div className="h-20 flex items-end gap-0.5">
          {hours.map((v, i) => (
            <motion.div
              key={i}
              initial={{ height: 0 }}
              whileInView={{ height: `${Math.abs(v) * 0.7}%` }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: 0.02 * i }}
              className={`flex-1 rounded-t-sm ${v > 0 ? 'bg-gradient-to-t from-pink-500 to-pink-400' : 'bg-gradient-to-t from-rose-500 to-orange-400'}`}
              style={{ minHeight: '2px', alignSelf: v >= 0 ? 'flex-end' : 'flex-start' }}
            />
          ))}
        </div>
        <div className="flex justify-between text-[8px] text-[var(--muted-foreground)] mt-1">
          <span>00:00</span><span>06:00</span><span>12:00</span><span>18:00</span><span>23:00</span>
        </div>
      </div>

      {/* Bottom stats */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { l: 'Sharpe',   v: '1.84' },
          { l: 'Max DD',   v: '8.2%' },
          { l: 'Avg Hold', v: '4h 12m' },
        ].map(s => (
          <div key={s.l} className="rounded-md border border-[var(--border)] bg-black/30 p-2 text-center">
            <div className="text-[8px] font-bold uppercase tracking-widest text-[var(--muted-foreground)]/70">{s.l}</div>
            <div className="text-sm font-bold text-pink-300 tabular-nums">{s.v}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ Playbook Mock â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
function PlaybookMock() {
  const rules = [
    { r: 'Max 3 trades per session',       comp: 92, status: 'pass'   },
    { r: 'Risk â‰¤ 1.5% per trade',          comp: 88, status: 'pass'   },
    { r: 'No trading 21:00â€“06:00 UTC',     comp: 78, status: 'warn'   },
    { r: 'Stop loss within 0.8% of entry', comp: 95, status: 'pass'   },
    { r: 'No revenge trade after âˆ’2R loss', comp: 64, status: 'fail'   },
    { r: 'Avoid first 15min after news',   comp: 100, status: 'pass'  },
  ];
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-[10px] font-bold uppercase tracking-widest text-fuchsia-400/80 flex items-center gap-1.5">
          <Shield size={11} /> Playbook compliance
        </div>
        <div className="text-[10px] text-pink-400 tabular-nums font-bold">86% overall</div>
      </div>

      {/* Score block */}
      <div className="rounded-lg border border-pink-500/20 bg-gradient-to-br from-pink-500/10 to-pink-500/5 p-3">
        <div className="flex items-center gap-3">
          <div className="text-3xl font-bold bg-gradient-to-r from-pink-300 to-pink-300 bg-clip-text text-transparent tabular-nums">86</div>
          <div>
            <div className="text-[10px] font-bold text-pink-300">Compliance Score</div>
            <div className="text-[9px] text-[var(--muted-foreground)]">5 of 6 rules followed Â· up from 64% last month</div>
          </div>
        </div>
        <div className="mt-2 h-1.5 rounded-full bg-white/5 overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            whileInView={{ width: '86%' }}
            viewport={{ once: true }}
            transition={{ duration: 1 }}
            className="h-full bg-gradient-to-r from-fuchsia-400 to-pink-400"
          />
        </div>
      </div>

      {/* Rule list */}
      <div className="space-y-1.5">
        {rules.map((r, i) => (
          <motion.div
            key={r.r}
            initial={{ opacity: 0, x: -8 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.3, delay: 0.05 * i }}
            className="rounded-md border border-[var(--border)] bg-black/30 p-2 flex items-center gap-2"
          >
            <CheckCircle2 size={12} className={r.status === 'pass' ? 'text-pink-400' : r.status === 'warn' ? 'text-amber-400' : 'text-rose-400'} />
            <span className="text-[10px] text-[var(--foreground)] flex-1">{r.r}</span>
            <div className="w-16 h-1 rounded-full bg-white/5 overflow-hidden">
              <div className={`h-full ${r.status === 'pass' ? 'bg-pink-400' : r.status === 'warn' ? 'bg-amber-400' : 'bg-rose-400'}`} style={{ width: `${r.comp}%` }} />
            </div>
            <span className={`text-[9px] tabular-nums font-bold w-8 text-right ${r.status === 'pass' ? 'text-pink-400' : r.status === 'warn' ? 'text-amber-400' : 'text-rose-400'}`}>
              {r.comp}%
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
