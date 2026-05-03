'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { Search, Activity, BarChart3, ArrowRight } from 'lucide-react';

const PILLARS = [
  {
    icon: Search,
    title: 'Find Your Leaks',
    desc: 'Every costly pattern ranked by dollar impact. Revenge trading, overtrading, FOMO — each measured in real money lost.',
  },
  {
    icon: Activity,
    title: 'Track Your Discipline',
    desc: 'Your behavioral health score, emotional pressure tracking, and session-by-session discipline monitoring.',
  },
  {
    icon: BarChart3,
    title: 'Measure Your Edge',
    desc: 'Win rate, profit factor, equity curve, symbol breakdown — all the metrics that matter, computed automatically.',
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

export default function DashboardPreview() {
  return (
    <section id="dashboard-preview" className="py-20 sm:py-28">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.5 }}
          className="text-center mb-14"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-[var(--foreground)] tracking-tight">
            Your dashboard after one{' '}
            <span className="bg-gradient-to-r from-teal-400 to-teal-600 bg-clip-text text-transparent">CSV upload</span>
          </h2>
          <p className="mt-4 text-[var(--muted-foreground)] max-w-xl mx-auto">
            Three core dashboards, each one purpose-built to surface what's draining your account and what's working.
          </p>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
          className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-10"
        >
          {PILLARS.map((p) => {
            const Icon = p.icon;
            return (
              <motion.div
                key={p.title}
                variants={itemVariants}
                className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 hover:border-teal-500/30 transition-colors"
              >
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-500/20 to-teal-700/10 border border-teal-500/20 flex items-center justify-center mb-4">
                  <Icon size={20} className="text-teal-400" />
                </div>
                <h3 className="text-base font-bold text-[var(--foreground)] mb-2">{p.title}</h3>
                <p className="text-sm text-[var(--muted-foreground)] leading-relaxed">{p.desc}</p>
              </motion.div>
            );
          })}
        </motion.div>

        <div className="flex justify-center">
          <Link
            href="/sign-up"
            className="inline-flex items-center gap-2 px-6 py-3 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white rounded-xl text-sm font-medium transition-colors"
          >
            Start Free — See Your Own Dashboard
            <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </section>
  );
}
