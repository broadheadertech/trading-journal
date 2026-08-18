'use client';

import { motion } from 'framer-motion';
import { GraduationCap, Target, LineChart, RefreshCw, Rocket } from 'lucide-react';
import AtmosphericBackground from './AtmosphericBackground';

const STEPS = [
  { icon: GraduationCap, title: 'Learn',   desc: 'Master trading from beginner to advanced.',    accent: 'from-pink-400 to-fuchsia-400' },
  { icon: Target,        title: 'Execute', desc: 'Apply proven market structure concepts.',      accent: 'from-fuchsia-400 to-purple-400' },
  { icon: LineChart,     title: 'Analyze', desc: 'Review every trade with data.',                accent: 'from-purple-400 to-cyan-400' },
  { icon: RefreshCw,     title: 'Improve', desc: 'Refine your process continuously.',            accent: 'from-cyan-400 to-emerald-400' },
  { icon: Rocket,        title: 'Scale',   desc: 'Pass funding challenges and grow capital.',    accent: 'from-emerald-400 to-green-400' },
];

export default function AtlasMethod() {
  return (
    <section className="relative overflow-hidden py-20 sm:py-28 border-t border-[var(--border)]">
      <AtmosphericBackground />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.5 }}
          className="text-center mb-14"
        >
          <span className="neon-eyebrow text-[11px] font-bold tracking-[0.2em] uppercase">
            A Proven Process
          </span>
          <h2 className="mt-3 text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-[var(--foreground)]">
            The <span className="neon-headline">Atlas Method</span>
            <span className="align-super text-xl text-[var(--muted-foreground)]">™</span>
          </h2>
          <p className="mt-4 text-[var(--muted-foreground)] max-w-2xl mx-auto">
            A simple, repeatable path from your first trade to funded success.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            return (
              <motion.div
                key={s.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-80px' }}
                transition={{ duration: 0.45, delay: i * 0.08 }}
                className="relative rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 text-center hover:border-pink-500/30 transition-colors"
              >
                <div className="text-[11px] font-bold tracking-widest text-[var(--muted-foreground)]/60 tabular-nums">
                  0{i + 1}
                </div>
                <div className={`mx-auto mt-2 w-12 h-12 rounded-xl bg-gradient-to-br ${s.accent} flex items-center justify-center`}>
                  <Icon size={20} className="text-slate-900" strokeWidth={2.2} />
                </div>
                <h3 className="mt-3 text-lg font-bold text-[var(--foreground)]">{s.title}</h3>
                <p className="mt-1.5 text-xs text-[var(--muted-foreground)] leading-relaxed">{s.desc}</p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
