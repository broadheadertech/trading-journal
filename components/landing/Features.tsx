'use client';

import { motion } from 'framer-motion';
import { BarChart3, Brain, Scale, BookOpen, Target, Sparkles } from 'lucide-react';

const features = [
  {
    icon: BarChart3,
    title: 'Trade Logging & Analytics',
    description: 'Log every trade across crypto, stocks, and forex. Visualize your P&L, win rates, and patterns with interactive charts.',
  },
  {
    icon: Brain,
    title: 'AI Trading Coach',
    description: 'Get personalized insights powered by your own trading data. Discipline streaks, emotion-rule correlations, and market-specific focus recommendations.',
  },
  {
    icon: Scale,
    title: 'Discipline Scoring',
    description: 'Quantified trading discipline. Track rule compliance, circuit breakers, and build consistent habits over time.',
  },
  {
    icon: BookOpen,
    title: 'Psychology Journal',
    description: 'Daily reflections, trigger tracking, and emotion analytics. Understand the psychology behind your trading across all markets.',
  },
  {
    icon: Target,
    title: 'Goals & Accountability',
    description: 'Set trading goals, track progress, and build streaks. Daily and session-based goal modes to keep you accountable.',
  },
  {
    icon: Sparkles,
    title: 'What-If Scenarios',
    description: 'Replay your trades with different parameters. See how adjusting stop losses or entries would have changed outcomes across any market.',
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
          <h2 className="text-3xl sm:text-4xl font-bold text-[var(--foreground)]">
            Everything You Need to
            <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent"> Trade Better</span>
          </h2>
          <p className="mt-4 text-[var(--muted-foreground)] max-w-xl mx-auto">
            A complete trading toolkit for crypto, stock, and forex traders who want to master their psychology and grow their edge.
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
