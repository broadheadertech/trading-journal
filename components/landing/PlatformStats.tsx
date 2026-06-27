'use client';

import { motion } from 'framer-motion';
import { Database, Zap, BarChart3, Activity, DollarSign } from 'lucide-react';
import AtmosphericBackground from './AtmosphericBackground';

const STATS = [
  { icon: BarChart3,  value: '100,800+', label: 'Trades Analyzed',    sub: 'Across every connected account' },
  { icon: Activity,   value: '16,760+',  label: 'Leaks Detected',     sub: 'Costly patterns surfaced' },
  { icon: DollarSign, value: '$547K+',   label: 'In Losses Found',    sub: 'Recoverable behavioral leaks' },
  { icon: Database,   value: '70+',      label: 'Supported Brokers',  sub: 'CSV, XLSX, and live API' },
  { icon: Zap,        value: '30+',      label: 'Verdict Detectors',  sub: 'Behavioral patterns scored' },
];

export default function PlatformStats() {
  return (
    <section id="stats" className="relative overflow-hidden py-20 sm:py-24 border-t border-[var(--border)]">
      <AtmosphericBackground />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <span className="neon-eyebrow text-[11px] font-bold tracking-[0.2em] uppercase">
            By The Numbers
          </span>
          <h2 className="mt-3 text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight">
            Trusted By{' '}
            <span className="neon-headline">Traders Worldwide</span>
          </h2>
          <p className="mt-4 text-[var(--muted-foreground)] max-w-2xl mx-auto">
            Brokers integrated, detectors shipped, metrics computed. Live platform numbers — not marketing fluff.
          </p>
        </motion.div>

        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
          {STATS.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-100px' }}
              transition={{ duration: 0.4, delay: i * 0.06 }}
              className="relative rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 hover:border-pink-500/30 transition-colors overflow-hidden group"
            >
              <div className="absolute -top-12 -right-12 w-32 h-32 rounded-full bg-pink-500/5 blur-2xl group-hover:bg-pink-500/10 transition-colors" />
              <div className="relative">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-pink-400/20 to-fuchsia-500/10 border border-pink-500/20 flex items-center justify-center mb-3">
                  <s.icon size={16} className="text-pink-400" />
                </div>
                <div className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-pink-300 to-fuchsia-300 bg-clip-text text-transparent tabular-nums leading-none">
                  {s.value}
                </div>
                <div className="mt-2 text-[10px] font-bold uppercase tracking-widest text-[var(--foreground)]">{s.label}</div>
                <div className="mt-0.5 text-[10px] text-[var(--muted-foreground)]">{s.sub}</div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
