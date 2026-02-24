'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { ArrowDown, TrendingUp, Target } from 'lucide-react';
import BrainMascot from '@/components/BrainMascot';

export default function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-indigo-500 opacity-[0.07] rounded-full blur-[120px]" />
        <div className="absolute top-1/3 left-1/4 w-[300px] h-[300px] bg-purple-500 opacity-[0.05] rounded-full blur-[100px]" />
      </div>

      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-16 sm:pt-24 pb-16 sm:pb-24 text-center">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full border border-[var(--border)] bg-[var(--card)] text-xs text-[var(--muted-foreground)] mb-8"
        >
          <span className="flex gap-1.5">
            <span className="text-[var(--yellow)]">Crypto</span>
            <span className="opacity-40">&middot;</span>
            <span className="text-[var(--green)]">Stocks</span>
            <span className="opacity-40">&middot;</span>
            <span className="text-[var(--blue)]">Forex</span>
          </span>
        </motion.div>

        {/* Brain mascot */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, delay: 0.05 }}
          className="mb-6"
        >
          <BrainMascot size={100} glow className="mx-auto" />
        </motion.div>

        {/* Heading */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="text-4xl sm:text-5xl lg:text-6xl font-bold text-[var(--foreground)] leading-tight"
        >
          Unlock the Psychology
          <br />
          <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
            Behind Every Trade
          </span>
        </motion.h1>

        {/* Subtext */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.25 }}
          className="mt-5 text-base sm:text-lg text-[var(--muted-foreground)] max-w-2xl mx-auto leading-relaxed"
        >
          PsychSync is the AI-powered trading journal that helps you master your emotions,
          build discipline, and find your edge — across crypto, stocks, and forex.
        </motion.p>

        {/* CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.35 }}
          className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3"
        >
          <Link
            href="/sign-up"
            className="px-6 py-3 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white rounded-xl text-sm font-medium transition-colors"
          >
            Start Free
          </Link>
          <a
            href="#features"
            className="flex items-center gap-2 px-6 py-3 border border-[var(--border)] text-[var(--foreground)] rounded-xl text-sm font-medium hover:bg-[var(--muted)] transition-colors"
          >
            See Features
            <ArrowDown size={16} />
          </a>
        </motion.div>

        {/* Preview Card — Multi-market stats */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.5 }}
          className="mt-14 max-w-3xl mx-auto"
        >
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 sm:p-8 shadow-xl">
            {/* Market ticker row */}
            <div className="flex items-center justify-center gap-4 sm:gap-8 mb-5 text-xs text-[var(--muted-foreground)]">
              <span><span className="text-[var(--yellow)] font-semibold">BTC</span> $67,420</span>
              <span><span className="text-[var(--green)] font-semibold">AAPL</span> $198.50</span>
              <span><span className="text-[var(--blue)] font-semibold">EUR/USD</span> 1.0842</span>
            </div>

            <div className="grid grid-cols-3 gap-4 sm:gap-6">
              <div className="text-center">
                <div className="flex items-center justify-center gap-1.5 mb-1">
                  <TrendingUp size={16} className="text-[var(--green)]" />
                  <span className="text-xs text-[var(--muted-foreground)]">Win Rate</span>
                </div>
                <p className="text-2xl sm:text-3xl font-bold text-[var(--green)]">67%</p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-1.5 mb-1">
                  <TrendingUp size={16} className="text-[var(--gain)]" />
                  <span className="text-xs text-[var(--muted-foreground)]">Total P&L</span>
                </div>
                <p className="text-2xl sm:text-3xl font-bold text-[var(--gain)]">+$4,230</p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-1.5 mb-1">
                  <Target size={16} className="text-[var(--accent)]" />
                  <span className="text-xs text-[var(--muted-foreground)]">Discipline</span>
                </div>
                <p className="text-2xl sm:text-3xl font-bold text-[var(--accent)]">87</p>
              </div>
            </div>

            {/* Chart placeholder */}
            <div className="mt-6 h-24 sm:h-32 rounded-xl bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-indigo-500/10 flex items-center justify-center relative overflow-hidden">
              {/* Candlestick pattern decoration */}
              <div className="absolute inset-0 flex items-end justify-around px-4 opacity-20">
                {[40, 65, 55, 80, 45, 70, 60, 85, 50, 75, 55, 90, 65, 80, 70].map((h, i) => (
                  <div key={i} className="flex flex-col items-center gap-0.5">
                    <div className={`w-0.5 ${i % 3 === 0 ? 'bg-[var(--green)]' : 'bg-[var(--red)]'}`} style={{ height: `${h * 0.3}%` }} />
                    <div className={`w-1.5 rounded-sm ${i % 3 === 0 ? 'bg-[var(--green)]' : 'bg-[var(--red)]'}`} style={{ height: `${h * 0.5}%` }} />
                  </div>
                ))}
              </div>
              <span className="text-xs text-[var(--muted-foreground)] relative z-10">Interactive P&L Chart</span>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
