'use client';

import { motion } from 'framer-motion';
import { Upload, Search, Wrench, FileSpreadsheet, AlertTriangle, CheckCircle2 } from 'lucide-react';

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="relative py-20 sm:py-24 border-t border-[var(--border)] bg-[var(--card)]/20">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[300px] bg-pink-500 opacity-[0.04] rounded-full blur-[120px]" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <span className="text-[11px] font-bold tracking-[0.2em] uppercase bg-gradient-to-r from-pink-400 to-fuchsia-400 bg-clip-text text-transparent">
            How It Works
          </span>
          <h2 className="mt-3 text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight">
            Three steps to{' '}
            <span className="bg-gradient-to-r from-pink-400 to-fuchsia-400 bg-clip-text text-transparent">measurable improvement</span>
          </h2>
          <p className="mt-4 text-[var(--muted-foreground)] max-w-2xl mx-auto">
            No spreadsheets. No guesswork. A clear path from raw trade history to a measurably better trader.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <StepCard
            n="01"
            icon={Upload}
            title="Upload your trades"
            desc="67+ brokers supported, CSV or API. Auto-detected, auto-normalized. Takes 60 seconds."
            delay={0}
          >
            <UploadMock />
          </StepCard>
          <StepCard
            n="02"
            icon={Search}
            title="See what's costing you money"
            desc="28+ patterns detected and ranked by dollar impact — revenge trading, overtrading, bad sessions, with evidence."
            delay={0.1}
          >
            <DetectMock />
          </StepCard>
          <StepCard
            n="03"
            icon={Wrench}
            title="Fix it and prove it"
            desc="Set rules, track compliance, run what-if simulations. Watch your discipline score climb."
            delay={0.2}
          >
            <FixMock />
          </StepCard>
        </div>
      </div>
    </section>
  );
}

function StepCard({ n, icon: Icon, title, desc, children, delay }: {
  n: string; icon: React.ComponentType<{ size?: number; className?: string }>;
  title: string; desc: string; children: React.ReactNode; delay: number;
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
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-400/20 to-fuchsia-500/10 border border-pink-500/20 flex items-center justify-center">
          <Icon size={18} className="text-pink-400" />
        </div>
        <span className="text-2xl font-bold text-[var(--muted-foreground)]/30 tabular-nums">{n}</span>
      </div>
      <div className="rounded-xl border border-[var(--border)] bg-black/30 p-4 mb-4 min-h-[180px]">{children}</div>
      <h3 className="text-sm font-bold text-[var(--foreground)] mb-1.5">{title}</h3>
      <p className="text-xs text-[var(--muted-foreground)] leading-relaxed">{desc}</p>
    </motion.div>
  );
}

function UploadMock() {
  return (
    <div className="space-y-2">
      <div className="rounded-lg border-2 border-dashed border-pink-500/30 bg-pink-500/5 p-4 text-center">
        <FileSpreadsheet size={20} className="text-pink-400 mx-auto mb-1.5" />
        <div className="text-[10px] font-bold text-[var(--foreground)]">trades_q4_2025.csv</div>
        <div className="text-[8px] text-[var(--muted-foreground)] mt-0.5">2.4 MB · 386 trades</div>
      </div>
      <div className="space-y-1">
        {[
          { l: 'Detected: Binance Futures', ok: true },
          { l: 'Normalizing 386 fills', ok: true },
          { l: 'Computing P&L', ok: true },
          { l: 'Running 28 detectors', ok: false },
        ].map(s => (
          <div key={s.l} className="flex items-center gap-1.5 text-[9px]">
            <CheckCircle2 size={10} className={s.ok ? 'text-pink-400' : 'text-[var(--muted-foreground)]/40'} />
            <span className={s.ok ? 'text-[var(--foreground)]' : 'text-[var(--muted-foreground)]'}>{s.l}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function DetectMock() {
  const leaks = [
    { name: 'Revenge trading',  cost: '−$1,420', pct: 100, sev: 'high' },
    { name: 'Oversized risk',   cost: '−$890',  pct: 63, sev: 'high' },
    { name: 'Late session',     cost: '−$540',  pct: 38, sev: 'med' },
    { name: 'No stop loss',     cost: '−$220',  pct: 16, sev: 'low' },
  ];
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5 text-[8px] font-bold uppercase tracking-widest text-rose-400/80">
        <AlertTriangle size={9} /> Ranked by $ cost
      </div>
      {leaks.map((l, i) => (
        <div key={l.name} className="space-y-0.5">
          <div className="flex items-center justify-between text-[9px]">
            <span className="text-[var(--foreground)] font-medium">{l.name}</span>
            <span className={`tabular-nums font-bold ${l.sev === 'high' ? 'text-rose-400' : l.sev === 'med' ? 'text-amber-400' : 'text-[var(--muted-foreground)]'}`}>{l.cost}</span>
          </div>
          <div className="h-0.5 rounded-full bg-white/5 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              whileInView={{ width: `${l.pct}%` }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.1 * i }}
              className={`h-full ${l.sev === 'high' ? 'bg-rose-500' : l.sev === 'med' ? 'bg-amber-500' : 'bg-[var(--muted-foreground)]/40'}`}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function FixMock() {
  return (
    <div className="space-y-2.5">
      <div className="flex items-center gap-1.5 text-[8px] font-bold uppercase tracking-widest text-pink-400/80">
        <Wrench size={9} /> Discipline trend
      </div>
      <div className="grid grid-cols-4 gap-1">
        {[42, 58, 71, 84].map((v, i) => (
          <div key={i} className="text-center">
            <div className="h-12 flex items-end">
              <motion.div
                initial={{ height: 0 }}
                whileInView={{ height: `${v}%` }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.1 * i }}
                className="w-full rounded-sm bg-gradient-to-t from-pink-500 to-fuchsia-400"
              />
            </div>
            <div className="text-[8px] text-[var(--muted-foreground)] mt-1">W{i+1}</div>
            <div className="text-[8px] font-bold text-pink-300 tabular-nums">{v}</div>
          </div>
        ))}
      </div>
      <div className="rounded-md bg-pink-500/10 border border-pink-500/20 p-2">
        <div className="flex items-center gap-1.5 text-[9px] font-bold text-pink-300">
          <CheckCircle2 size={10} />
          Rule compliance: 92%
        </div>
        <div className="text-[8px] text-[var(--muted-foreground)] mt-0.5">Up from 64% last month</div>
      </div>
    </div>
  );
}
