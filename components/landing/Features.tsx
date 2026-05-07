'use client';

import { motion } from 'framer-motion';
import { Search, Activity, BarChart3, Shield, LayoutDashboard, Sparkles } from 'lucide-react';

const features = [
  {
    icon: Search,
    accent: 'from-rose-400 to-orange-400',
    title: 'Leak Detection',
    description: 'Identifies repeated trading mistakes and quantifies their financial impact. Auto-ranked by P&L cost with evidence linked to specific trades.',
  },
  {
    icon: Activity,
    accent: 'from-pink-400 to-fuchsia-400',
    title: 'Behavior Analysis',
    description: 'A discipline score derived from actual trading data. Emotional pressure detection across sessions, with week-over-week trends.',
  },
  {
    icon: BarChart3,
    accent: 'from-fuchsia-400 to-pink-500',
    title: 'Performance Analytics',
    description: '50+ automated metrics including win rate, profit factor, equity curve, symbol breakdown, and time-of-day analysis.',
  },
  {
    icon: Shield,
    accent: 'from-fuchsia-400 to-pink-500',
    title: 'Playbook Rules',
    description: 'Define custom rules for position sizing, session limits, timing, and behavior. Compliance scored trade by trade.',
  },
  {
    icon: LayoutDashboard,
    accent: 'from-violet-400 to-fuchsia-400',
    title: 'Dashboard Overview',
    description: 'Net P&L, win rate, profit factor, equity curve, activity heatmap, and recent trade history â€” all updated automatically.',
  },
  {
    icon: Sparkles,
    accent: 'from-amber-400 to-yellow-400',
    title: 'What-If Scenarios',
    description: 'Replay your trades with different parameters. See how adjusting stops, entries, or rule compliance would have changed outcomes.',
  },
];

export default function Features() {
  return (
    <section id="features" className="relative py-20 sm:py-24 border-t border-[var(--border)] bg-[var(--card)]/20">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/3 left-1/4 w-[500px] h-[400px] bg-pink-500 opacity-[0.04] rounded-full blur-[140px]" />
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
            Platform
          </span>
          <h2 className="mt-3 text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight">
            Find Your Leaks.{' '}
            <span className="bg-gradient-to-r from-pink-400 to-fuchsia-400 bg-clip-text text-transparent">Track Your Discipline.</span>{' '}
            <span className="bg-gradient-to-r from-fuchsia-400 to-pink-500 bg-clip-text text-transparent">Measure Your Edge.</span>
          </h2>
          <p className="mt-4 text-[var(--muted-foreground)] max-w-2xl mx-auto">
            Identifies costly patterns ranked by financial impact. Behavioral health scoring,
            emotional pressure monitoring, and session-by-session discipline tracking â€” all in one platform.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-100px' }}
              transition={{ duration: 0.4, delay: i * 0.05 }}
              className="relative rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 hover:border-pink-500/30 transition-colors overflow-hidden group"
            >
              <div className={`absolute -top-12 -right-12 w-32 h-32 rounded-full bg-gradient-to-br ${f.accent} opacity-[0.06] blur-2xl group-hover:opacity-[0.1] transition-opacity`} />
              <div className="relative">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${f.accent} bg-opacity-20 flex items-center justify-center mb-3`}>
                  <f.icon size={18} className="text-slate-900" />
                </div>
                <h3 className="text-sm font-bold text-[var(--foreground)] mb-1.5">{f.title}</h3>
                <p className="text-xs text-[var(--muted-foreground)] leading-relaxed">{f.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
