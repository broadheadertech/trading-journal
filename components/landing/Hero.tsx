'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, Zap, Database, Shield, LayoutDashboard, TrendingUp, GraduationCap, List, Headphones, Trophy, Activity, BookOpen, Gift, Newspaper, Wrench, MessagesSquare } from 'lucide-react';

export default function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/3 left-1/4 w-[500px] h-[400px] bg-teal-500 opacity-[0.05] rounded-full blur-[140px]" />
        <div className="absolute top-1/2 right-1/4 w-[400px] h-[350px] bg-emerald-500 opacity-[0.04] rounded-full blur-[120px]" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 pt-8 sm:pt-12 pb-12 sm:pb-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-10 items-center">
          {/* LEFT — Copy column */}
          <div className="text-left">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="inline-flex items-center gap-2 mb-4"
            >
              <span className="text-[10px] font-bold tracking-[0.2em] uppercase bg-gradient-to-r from-teal-400 to-cyan-400 bg-clip-text text-transparent">
                Behavioral Analytics for Active Traders
              </span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.05 }}
              className="text-3xl sm:text-4xl lg:text-5xl font-bold leading-[1.1] tracking-tight"
            >
              <span className="text-[var(--foreground)]">Find the trading mistakes costing you thousands </span>
              <span className="bg-gradient-to-r from-teal-400 to-cyan-400 bg-clip-text text-transparent">— and prove </span>
              <span className="bg-gradient-to-r from-emerald-400 to-lime-400 bg-clip-text text-transparent">you fixed them</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.15 }}
              className="mt-4 text-sm sm:text-base text-[var(--muted-foreground)] max-w-xl leading-relaxed"
            >
              Upload your trade history and get a dollar-ranked breakdown of every costly pattern — then track whether your fixes stick.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.25 }}
              className="mt-6 flex flex-col sm:flex-row items-start sm:items-center gap-3"
            >
              <Link
                href="/sign-up"
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold text-slate-900 bg-gradient-to-r from-teal-300 to-cyan-300 hover:from-teal-200 hover:to-cyan-200 shadow-[0_0_30px_-4px_rgba(45,212,191,0.5)] transition-all"
              >
                Start Free Trial
                <ArrowRight size={14} />
              </Link>
              <Link
                href="/demo"
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold text-[var(--foreground)] bg-[var(--card)] border border-[var(--border)] hover:bg-[var(--muted)]/50 transition-colors"
              >
                See Demo
                <ArrowRight size={14} />
              </Link>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.35 }}
              className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-[var(--muted-foreground)]"
            >
              <span>14 days free</span>
              <span className="opacity-30">·</span>
              <span>No credit card</span>
              <span className="opacity-30">·</span>
              <span>Setup in 60 seconds</span>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.45 }}
              className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-[var(--muted-foreground)]"
            >
              <span className="flex items-center gap-1.5"><Database size={11} className="text-teal-400" /> 67+ Brokers</span>
              <span className="opacity-30">·</span>
              <span className="flex items-center gap-1.5"><Zap size={11} className="text-teal-400" /> 28+ Detectors</span>
              <span className="opacity-30">·</span>
              <span className="flex items-center gap-1.5"><Shield size={11} className="text-teal-400" /> Read-Only & Secure</span>
            </motion.div>
          </div>

          {/* RIGHT — Tradia dashboard mock (mirrors our real app structure) */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, x: 16 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="relative"
          >
            <TradiaDashboardMock />
          </motion.div>
        </div>
      </div>
    </section>
  );
}

function TradiaDashboardMock() {
  const tabs = [
    { i: LayoutDashboard, l: 'Dashboard', active: true },
    { i: TrendingUp,      l: 'Strategies' },
    { i: GraduationCap,   l: 'Courses' },
    { i: List,            l: 'Journal' },
    { i: Headphones,      l: 'Coaching' },
    { i: Gift,            l: 'Rewards' },
    { i: Activity,        l: 'Indicators' },
    { i: BookOpen,        l: 'Articles' },
    { i: MessagesSquare,  l: 'Community' },
    { i: Trophy,          l: 'Leaderboard' },
    { i: Newspaper,       l: 'News' },
    { i: Wrench,          l: 'Tools' },
  ];
  const ranges = ['1D', '1W', '1M', '3M', '1Y', 'ALL'];
  return (
    <div className="relative rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-2xl overflow-hidden">
      {/* Browser chrome */}
      <div className="flex items-center gap-1.5 px-3 py-2 border-b border-[var(--border)] bg-black/40">
        <span className="w-2 h-2 rounded-full bg-red-500/50" />
        <span className="w-2 h-2 rounded-full bg-amber-500/50" />
        <span className="w-2 h-2 rounded-full bg-emerald-500/50" />
        <div className="flex-1 mx-2 px-2 py-0.5 rounded bg-black/40 text-[9px] text-[var(--muted-foreground)] text-center font-mono">
          tradia.app/app
        </div>
      </div>

      <div className="grid grid-cols-[120px_1fr] min-h-[360px]">
        {/* Sidebar */}
        <div className="border-r border-[var(--border)] bg-black/20 p-2 space-y-0.5">
          <div className="flex items-center gap-1.5 px-2 py-1 mb-2">
            <Image src="/logo.png" alt="Tradia" width={20} height={20} className="w-5 h-5 object-contain" />
            <span className="text-[11px] font-bold bg-gradient-to-r from-teal-300 to-emerald-300 bg-clip-text text-transparent">Tradia</span>
          </div>
          {tabs.map(t => (
            <div
              key={t.l}
              className={`flex items-center gap-1.5 px-1.5 py-1 rounded text-[9px] ${
                t.active
                  ? 'bg-teal-500/15 text-teal-400 font-medium'
                  : 'text-[var(--muted-foreground)]'
              }`}
            >
              <t.i size={10} /> {t.l}
            </div>
          ))}
        </div>

        {/* Main panel */}
        <div className="p-3 space-y-2.5">
          {/* Top bar with time range */}
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted-foreground)]/70">Dashboard</span>
            <div className="flex items-center gap-0.5 rounded-md bg-black/30 border border-[var(--border)] p-0.5">
              {ranges.map(r => (
                <span
                  key={r}
                  className={`text-[8px] font-bold px-1.5 py-0.5 rounded ${
                    r === '1M' ? 'bg-teal-500/20 text-teal-300' : 'text-[var(--muted-foreground)]'
                  }`}
                >
                  {r}
                </span>
              ))}
            </div>
          </div>

          {/* KPI grid — matches Dashboard.tsx metrics */}
          <div className="grid grid-cols-3 gap-1.5">
            {[
              { l: 'Total P&L',     v: '+$4,230', sub: '+18.3%', tone: 'emerald' },
              { l: 'Win Rate',      v: '67%',     sub: '52W / 26L', tone: 'emerald' },
              { l: 'Profit Factor', v: '2.14',    sub: 'Gross 2.4x', tone: 'emerald' },
            ].map(s => (
              <div key={s.l} className="rounded-md border border-[var(--border)] bg-black/30 p-1.5">
                <div className="text-[7px] font-bold uppercase tracking-widest text-[var(--muted-foreground)]/70">{s.l}</div>
                <div className="text-xs font-bold text-emerald-300 tabular-nums leading-tight mt-0.5">{s.v}</div>
                <div className="text-[7px] text-[var(--muted-foreground)] tabular-nums">{s.sub}</div>
              </div>
            ))}
          </div>

          {/* Equity curve */}
          <div className="rounded-md border border-[var(--border)] bg-black/30 p-2">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[8px] font-bold uppercase tracking-widest text-[var(--muted-foreground)]/70">Equity Curve</span>
              <span className="text-[8px] text-emerald-400 tabular-nums">↑ +$4,230</span>
            </div>
            <svg className="w-full h-14" viewBox="0 0 200 50" preserveAspectRatio="none">
              <defs>
                <linearGradient id="heroEq" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#34d399" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#34d399" stopOpacity="0" />
                </linearGradient>
              </defs>
              <polygon
                fill="url(#heroEq)"
                points="0,50 0,42 15,38 30,40 50,32 70,34 90,28 110,30 130,22 150,24 170,16 190,12 200,10 200,50"
              />
              <polyline
                fill="none"
                stroke="#34d399"
                strokeWidth="1.2"
                points="0,42 15,38 30,40 50,32 70,34 90,28 110,30 130,22 150,24 170,16 190,12 200,10"
              />
            </svg>
          </div>

          {/* Bottom split: Streak + Execution Score */}
          <div className="grid grid-cols-2 gap-1.5">
            <div className="rounded-md border border-[var(--border)] bg-black/30 p-2">
              <div className="text-[7px] font-bold uppercase tracking-widest text-[var(--muted-foreground)]/70">Streak</div>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-sm font-bold text-emerald-300 tabular-nums">7</span>
                <span className="text-[8px] text-[var(--muted-foreground)]">winning trades</span>
              </div>
              <div className="flex gap-0.5 mt-1">
                {[1,1,1,1,1,1,1,0,0].map((w, i) => (
                  <div key={i} className={`flex-1 h-1 rounded-sm ${w ? 'bg-emerald-400' : 'bg-white/10'}`} />
                ))}
              </div>
            </div>
            <div className="rounded-md border border-[var(--border)] bg-black/30 p-2 flex items-center gap-2">
              <div className="relative">
                <svg width="36" height="36" viewBox="0 0 36 36">
                  <circle cx="18" cy="18" r="14" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="3" />
                  <circle
                    cx="18" cy="18" r="14"
                    fill="none"
                    stroke="url(#heroScore)"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeDasharray={`${(8 / 10) * 88} 88`}
                    transform="rotate(-90 18 18)"
                  />
                  <defs>
                    <linearGradient id="heroScore">
                      <stop offset="0%" stopColor="#5eead4" />
                      <stop offset="100%" stopColor="#22d3ee" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-[10px] font-bold text-teal-300 tabular-nums">8</span>
                </div>
              </div>
              <div>
                <div className="text-[7px] font-bold uppercase tracking-widest text-[var(--muted-foreground)]/70">Execution</div>
                <div className="text-[10px] text-teal-300 font-bold">/ 10</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
