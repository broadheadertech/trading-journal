'use client';

import { motion } from 'framer-motion';
import { Clock, Zap, TrendingUp } from 'lucide-react';
import AtmosphericBackground from './AtmosphericBackground';

const PROOF = [
  { icon: Clock,      value: '10×',   label: 'Faster review',   sub: 'Weeks of self-analysis in one session' },
  { icon: Zap,        value: '30 sec', label: 'Per trade logged', sub: 'Auto-scored the moment you close' },
  { icon: TrendingUp, value: '1 year', label: 'Of insight, instantly', sub: 'Patterns that take pros months to spot' },
];

export default function EfficiencySection() {
  return (
    <section id="efficiency" className="relative overflow-hidden py-20 sm:py-28 border-t border-[var(--border)]">
      <AtmosphericBackground />

      <div className="relative max-w-6xl mx-auto px-4 sm:px-6">
        {/* Eyebrow + headline */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.5 }}
          className="text-center mb-10 sm:mb-14"
        >
          <span className="neon-eyebrow text-[11px] font-bold tracking-[0.2em] uppercase">
            Efficiency
          </span>
          <h2 className="mt-3 text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.05]">
            <span className="bg-gradient-to-b from-white via-slate-200 to-slate-500 bg-clip-text text-transparent">
              Gain a Year&rsquo;s Worth of
            </span>
            <br />
            <span className="neon-headline">Trading Insight in Weeks</span>
          </h2>
          <p className="mt-4 text-[var(--muted-foreground)] max-w-2xl mx-auto">
            What used to mean hours of spreadsheets and months of guesswork, Tradia does automatically — every trade
            journaled, scored, and turned into a lesson the moment you close it.
          </p>
        </motion.div>

        {/* Framed "screen" — plays your product demo video on loop */}
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.98 }}
          whileInView={{ opacity: 1, y: 0, scale: 1 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.6 }}
          className="relative rounded-2xl border border-[var(--border)] bg-[var(--card)] p-1.5 aurora-glow"
        >
          {/* Browser-chrome top bar */}
          <div className="flex items-center gap-1.5 px-3 py-2">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-400/70" />
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400/70" />
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400/70" />
          </div>
          <div className="relative rounded-xl overflow-hidden bg-black aspect-video">
            <video
              className="w-full h-full object-cover"
              src="/vid1.mp4"
              poster="/hero-bg.png"
              autoPlay
              loop
              muted
              playsInline
            />
            {/* subtle vignette so the frame edges blend */}
            <div className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-white/5 rounded-xl" />
          </div>
        </motion.div>

        {/* Proof points under the screen */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8">
          {PROOF.map((p, i) => (
            <motion.div
              key={p.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-100px' }}
              transition={{ duration: 0.4, delay: i * 0.08 }}
              className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 hover:border-pink-500/30 transition-colors"
            >
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-pink-400/20 to-fuchsia-500/10 border border-pink-500/20 flex items-center justify-center mb-3">
                <p.icon size={16} className="text-pink-400" />
              </div>
              <div className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-pink-300 to-fuchsia-300 bg-clip-text text-transparent tabular-nums leading-none">
                {p.value}
              </div>
              <div className="mt-2 text-[11px] font-bold uppercase tracking-widest text-[var(--foreground)]">{p.label}</div>
              <div className="mt-0.5 text-[11px] text-[var(--muted-foreground)]">{p.sub}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
