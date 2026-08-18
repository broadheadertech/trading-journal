'use client';

import { motion } from 'framer-motion';
import { XCircle, CheckCircle2 } from 'lucide-react';
import AtmosphericBackground from './AtmosphericBackground';

const FAILURES = [
  'Overtrade',
  'Break Risk Rules',
  'Trade Emotionally',
  'Lack A Proven Process',
  'Never Review Their Performance',
];

export default function WhyTradersFail() {
  return (
    <section className="relative overflow-hidden py-20 sm:py-28 border-t border-[var(--border)]">
      <AtmosphericBackground />

      <div className="relative max-w-3xl mx-auto px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.5 }}
          className="text-center mb-10"
        >
          <span className="neon-eyebrow text-[11px] font-bold tracking-[0.2em] uppercase">
            The Hard Truth
          </span>
          <h2 className="mt-3 text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-[var(--foreground)]">
            Why Most Traders{' '}
            <span className="bg-gradient-to-r from-rose-400 to-red-500 bg-clip-text text-transparent">Fail</span>
          </h2>
          <p className="mt-4 text-[var(--muted-foreground)] max-w-2xl mx-auto">
            90% of traders don&apos;t fail because of their strategy. They fail because they:
          </p>
        </motion.div>

        {/* The five failures */}
        <div className="max-w-xl mx-auto space-y-2.5">
          {FAILURES.map((f, i) => (
            <motion.div
              key={f}
              initial={{ opacity: 0, x: -16 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.4, delay: i * 0.08 }}
              className="flex items-center gap-3 rounded-xl border border-rose-500/20 bg-rose-500/[0.05] px-4 py-3"
            >
              <XCircle size={20} className="text-rose-400 shrink-0" />
              <span className="text-sm sm:text-base font-semibold text-[var(--foreground)]">{f}</span>
            </motion.div>
          ))}
        </div>

        {/* The solution */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="mt-10 rounded-2xl border border-emerald-500/25 bg-gradient-to-br from-emerald-500/[0.08] to-[var(--card)] p-6 sm:p-8 text-center"
        >
          <CheckCircle2 size={28} className="mx-auto text-emerald-400 mb-3" />
          <p className="text-xl sm:text-2xl font-bold text-[var(--foreground)]">
            Atlas was built to <span className="neon-headline">solve all five.</span>
          </p>
          <p className="mt-3 text-[var(--muted-foreground)] max-w-xl mx-auto leading-relaxed">
            By combining education, analytics, accountability, and community, traders gain the tools needed to
            achieve long-term consistency.
          </p>
        </motion.div>
      </div>
    </section>
  );
}
