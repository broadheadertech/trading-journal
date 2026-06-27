'use client';

import { motion } from 'framer-motion';
import { BookOpen, BarChart3, Activity, ShieldCheck, CalendarClock, GraduationCap } from 'lucide-react';
import AtmosphericBackground from './AtmosphericBackground';

const features = [
  {
    icon: BookOpen,
    accent: 'from-pink-400 to-fuchsia-400',
    title: 'Trading Journal',
    description: 'Record and review every trade.',
  },
  {
    icon: BarChart3,
    accent: 'from-fuchsia-400 to-purple-400',
    title: 'Performance Analytics',
    description: 'Discover your strengths and weaknesses.',
  },
  {
    icon: Activity,
    accent: 'from-purple-400 to-pink-500',
    title: 'Behavioral Tracking',
    description: 'Measure discipline and emotional control.',
  },
  {
    icon: ShieldCheck,
    accent: 'from-rose-400 to-pink-500',
    title: 'Risk Management',
    description: 'Protect capital with proper sizing and rules.',
  },
  {
    icon: CalendarClock,
    accent: 'from-cyan-400 to-fuchsia-400',
    title: 'Economic Calendar',
    description: 'Stay ahead of market-moving events.',
  },
  {
    icon: GraduationCap,
    accent: 'from-amber-400 to-orange-400',
    title: 'Trading Academy',
    description: 'Access structured educational content.',
  },
];

export default function Features() {
  return (
    <section id="features" className="relative overflow-hidden py-20 sm:py-24 border-t border-[var(--border)] bg-[var(--card)]/20">
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
            Platform
          </span>
          <h2 className="mt-3 text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight">
            One Platform.{' '}
            <span className="neon-headline">Every Tool A Trader Needs.</span>
          </h2>
          <p className="mt-4 text-[var(--muted-foreground)] max-w-2xl mx-auto">
            Journaling, analytics, behavioral tracking, risk management, market intelligence, and education —
            everything you need to learn, execute, and improve, all in one place.
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
