'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { Zap, Database } from 'lucide-react';
import HeroGlobe from './HeroGlobe';

export default function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div
        className="absolute inset-0 pointer-events-none bg-cover bg-center opacity-[0.45]"
        style={{
          backgroundImage: "url('/tradia-background.png')",
          filter: 'blur(8px) saturate(1.1) brightness(1.05)',
          transform: 'scale(1.06)',
        }}
      />
      {/* Dark overlay so copy stays readable */}
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-[var(--background)]/80 via-[var(--background)]/70 to-[var(--background)]" />
      {/* Northern Lights aurora ambient pattern */}
      <div className="aurora-bg" />
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/3 left-1/4 w-[500px] h-[400px] bg-pink-500 opacity-[0.06] rounded-full blur-[140px]" />
        <div className="absolute top-1/4 right-1/3 w-[420px] h-[360px] bg-cyan-400 opacity-[0.05] rounded-full blur-[130px]" />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[350px] bg-emerald-400 opacity-[0.04] rounded-full blur-[120px]" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 pt-8 sm:pt-12 pb-12 sm:pb-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-10 items-center">
          {/* LEFT — Copy column */}
          <div className="text-left">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="inline-flex items-center gap-2 mb-4"
            >
              <span className="neon-eyebrow text-[10px] font-bold tracking-[0.2em] uppercase">
                Behavioral Analytics for Active Traders
              </span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.05 }}
              className="text-3xl sm:text-4xl lg:text-5xl font-bold leading-[1.1] tracking-tight"
            >
              <span className="text-[var(--foreground)]">Find the trading mistakes costing you thousands </span>
              <span className="aurora-text">— and prove </span>
              <span className="aurora-text">you fixed them</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.15 }}
              className="mt-4 text-sm sm:text-base text-[var(--muted-foreground)] max-w-xl leading-relaxed"
            >
              Upload your trade history and get a dollar-ranked breakdown of every costly pattern — then track whether your fixes stick.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.25 }}
              className="mt-6 flex flex-col sm:flex-row items-start sm:items-center gap-3"
            >
              <Link
                href="/sign-up"
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold text-slate-900 bg-gradient-to-r from-orange-400 to-amber-400 hover:from-orange-300 hover:to-amber-300 shadow-[0_0_30px_-4px_rgba(251,146,60,0.6)] transition-all"
              >
                Start Free Trial
              </Link>
              <Link
                href="/demo"
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold text-[var(--foreground)] bg-[var(--card)] border border-[var(--border)] hover:bg-[var(--muted)]/50 transition-colors"
              >
                See Demo
              </Link>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.35 }}
              className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-[var(--muted-foreground)]"
            >
              <span>15 days free trial</span>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.45 }}
              className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-[var(--muted-foreground)]"
            >
              <span className="flex items-center gap-1.5"><Database size={11} className="text-pink-400" /> 70+ Brokers</span>
              <span className="opacity-30">Â·</span>
              <span className="flex items-center gap-1.5"><Zap size={11} className="text-pink-400" /> 30+ Detectors</span>
            </motion.div>
          </div>

          {/* RIGHT — chrome-less 3D globe; sits on top of the atmospheric bg, no card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, x: 16 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="relative"
          >
            <HeroGlobe />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
