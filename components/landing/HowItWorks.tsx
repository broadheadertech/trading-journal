'use client';

import { motion } from 'framer-motion';
import { Upload, Search, Wrench } from 'lucide-react';

const STEPS = [
  {
    n: '01',
    icon: Upload,
    title: 'Upload trades',
    desc: '67+ brokers via CSV or API. Read-only, secure, and fully encrypted. Setup in under 60 seconds.',
  },
  {
    n: '02',
    icon: Search,
    title: 'Identify costly patterns',
    desc: '28+ behavioral detectors find your leaks and rank them by dollar impact. Evidence linked to the exact trades.',
  },
  {
    n: '03',
    icon: Wrench,
    title: 'Fix and track',
    desc: 'Set rules, monitor compliance week-over-week, and run what-if simulations to prove your fixes stick.',
  },
];

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="py-20 sm:py-28 bg-[var(--card)]/30 border-y border-[var(--border)]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.5 }}
          className="text-center mb-14"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[var(--border)] bg-[var(--card)] text-[10px] font-bold uppercase tracking-widest text-teal-400 mb-4">
            How it works
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-[var(--foreground)] tracking-tight">
            From trades to <span className="bg-gradient-to-r from-teal-400 to-teal-600 bg-clip-text text-transparent">fixed leaks</span> in three steps
          </h2>
          <p className="mt-4 text-[var(--muted-foreground)] max-w-xl mx-auto">
            No spreadsheets. No guesswork. Just a clear path from your raw trade history to a measurably better trader.
          </p>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
          className="grid grid-cols-1 md:grid-cols-3 gap-5 relative"
        >
          {/* Connecting line — desktop only */}
          <div className="hidden md:block absolute top-[60px] left-[16%] right-[16%] h-px bg-gradient-to-r from-transparent via-teal-500/30 to-transparent" />

          {STEPS.map((s) => {
            const Icon = s.icon;
            return (
              <motion.div
                key={s.n}
                variants={itemVariants}
                className="relative rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 hover:border-teal-500/30 transition-colors"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-500/20 to-teal-700/10 border border-teal-500/20 flex items-center justify-center">
                    <Icon size={20} className="text-teal-400" />
                  </div>
                  <span className="text-3xl font-bold text-[var(--muted-foreground)]/30 tabular-nums">{s.n}</span>
                </div>
                <h3 className="text-base font-bold text-[var(--foreground)] mb-2">{s.title}</h3>
                <p className="text-sm text-[var(--muted-foreground)] leading-relaxed">{s.desc}</p>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
