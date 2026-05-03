'use client';

import { motion } from 'framer-motion';
import { Database, Zap, BarChart3, Search } from 'lucide-react';

const STATS = [
  { icon: Database,  value: '67+',   label: 'Supported Brokers' },
  { icon: Zap,       value: '28+',   label: 'Verdict Detectors' },
  { icon: BarChart3, value: '50+',   label: 'Performance Metrics' },
  { icon: Search,    value: '60s',   label: 'Setup Time' },
];

export default function PlatformStats() {
  return (
    <section id="stats" className="py-20 sm:py-24 bg-[var(--card)]/30 border-y border-[var(--border)]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-[var(--foreground)] tracking-tight">
            Real numbers from{' '}
            <span className="bg-gradient-to-r from-teal-400 to-teal-600 bg-clip-text text-transparent">the platform</span>
          </h2>
          <p className="mt-4 text-[var(--muted-foreground)] max-w-xl mx-auto">
            Trades analyzed, leaks detected, brokers integrated. Live platform numbers — not marketing fluff.
          </p>
        </motion.div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
          {STATS.map((s, i) => {
            const Icon = s.icon;
            return (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-100px' }}
                transition={{ duration: 0.4, delay: i * 0.08 }}
                className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 text-center"
              >
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500/20 to-teal-700/10 border border-teal-500/20 flex items-center justify-center mx-auto mb-3">
                  <Icon size={18} className="text-teal-400" />
                </div>
                <div className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-teal-400 to-teal-600 bg-clip-text text-transparent tabular-nums">
                  {s.value}
                </div>
                <div className="text-xs text-[var(--muted-foreground)] uppercase tracking-wider mt-1">{s.label}</div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
