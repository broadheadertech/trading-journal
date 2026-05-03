'use client';

import { motion } from 'framer-motion';
import { Search, Activity, BarChart3, Shield, LayoutDashboard, Sparkles } from 'lucide-react';

const features = [
  {
    icon: Search,
    title: 'Leak Detection',
    description: 'Identifies repeated trading mistakes and quantifies their financial impact. The system automatically ranks mistakes by P&L cost and links evidence to specific trades — revenge trading, oversized positions, session drift.',
  },
  {
    icon: Activity,
    title: 'Behavior Analysis',
    description: 'A discipline score derived from actual trading data. Emotional pressure detection across sessions, with week-over-week trends to prove improvement.',
  },
  {
    icon: BarChart3,
    title: 'Performance Analytics',
    description: '50+ automated metrics including win rate, profit factor, equity curve analysis, symbol breakdown, and time-of-day analysis — updated automatically on every trade import.',
  },
  {
    icon: Shield,
    title: 'Playbook Rules',
    description: 'Define custom rules for position sizing, session limits, timing, and behavior. Generates a compliance score so you can verify adherence trade by trade.',
  },
  {
    icon: LayoutDashboard,
    title: 'Dashboard Overview',
    description: 'Central command center: net P&L, win rate, profit factor, equity curve, activity heatmap, and recent trade history — all updated automatically.',
  },
  {
    icon: Sparkles,
    title: 'What-If Scenarios',
    description: 'Replay your trades with different parameters. See how adjusting stop losses, entries, or rule compliance would have changed your outcomes.',
  },
];

const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

export default function Features() {
  return (
    <section id="features" className="py-20 sm:py-28">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.5 }}
          className="text-center mb-14"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-[var(--foreground)] tracking-tight">
            Find Your Leaks.{' '}
            <span className="bg-gradient-to-r from-teal-400 to-teal-600 bg-clip-text text-transparent">Track Your Discipline.</span>{' '}
            Measure Your Edge.
          </h2>
          <p className="mt-4 text-[var(--muted-foreground)] max-w-2xl mx-auto">
            Identifies costly patterns ranked by financial impact. Behavioral health scoring,
            emotional pressure monitoring, and session-by-session discipline tracking — all in one platform.
          </p>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5"
        >
          {features.map((feature) => (
            <motion.div
              key={feature.title}
              variants={itemVariants}
              className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 hover:border-[var(--accent)]/30 transition-colors"
            >
              <div className="w-10 h-10 rounded-lg bg-[var(--accent)]/10 flex items-center justify-center mb-4">
                <feature.icon size={20} className="text-[var(--accent)]" />
              </div>
              <h3 className="text-sm font-bold text-[var(--foreground)] mb-2">{feature.title}</h3>
              <p className="text-xs text-[var(--muted-foreground)] leading-relaxed">{feature.description}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
