'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { LayoutDashboard, Search, Activity, BarChart3, Shield, ArrowRight } from 'lucide-react';
import LandingNav from '@/components/landing/LandingNav';
import Footer from '@/components/landing/Footer';

const FEATURES = [
  {
    icon: LayoutDashboard,
    title: 'Dashboard',
    desc: 'Your main command center — portfolio equity curve, net P&L, win rate, profit factor, activity heatmap, and trade history at a glance. All metrics update automatically as you import trades.',
  },
  {
    icon: Search,
    title: 'Leak Detection',
    desc: 'The verdict engine ranks every costly pattern by dollar impact — revenge trading, overtrading, bad session hours, FOMO entries — with evidence clusters and recovery estimates for each.',
  },
  {
    icon: Activity,
    title: 'Behavior Analysis',
    desc: 'Behavior analysis tracks your discipline score over time, monitors emotional pressure across sessions, and shows whether your fixes are actually sticking week over week.',
  },
  {
    icon: BarChart3,
    title: 'Performance Analytics',
    desc: 'Deep performance analytics — breakdown by symbol, time of day, session, and trade type. 50+ metrics to find exactly which setups make money and which ones bleed.',
  },
  {
    icon: Shield,
    title: 'Playbook',
    desc: 'Define your trading rules once — max trades per session, risk limits, session hours — and track compliance automatically on every trade you import. No self-grading, no bias.',
  },
];

export default function DemoPage() {
  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <LandingNav />

      <section className="relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-teal-500 opacity-[0.07] rounded-full blur-[120px]" />
        </div>

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-16 sm:pt-24 pb-10 sm:pb-14 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full border border-[var(--border)] bg-[var(--card)] text-xs text-[var(--muted-foreground)] mb-6"
          >
            <span className="flex h-2 w-2 relative">
              <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            Live Demo · Trading Analytics in Action
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-4xl sm:text-5xl lg:text-6xl font-bold text-[var(--foreground)] tracking-tight"
          >
            This is what your{' '}
            <span className="bg-gradient-to-r from-teal-400 to-teal-600 bg-clip-text text-transparent">dashboard looks like</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mt-5 text-base sm:text-lg text-[var(--muted-foreground)] max-w-2xl mx-auto"
          >
            Real screenshots from the live app with sample data. Upload your own trades and see your actual numbers in under 60 seconds.
          </motion.p>
        </div>
      </section>

      <section className="py-16 sm:py-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 space-y-12">
          {FEATURES.map((f, idx) => {
            const Icon = f.icon;
            const reverse = idx % 2 === 1;
            return (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-100px' }}
                transition={{ duration: 0.5 }}
                className={`grid grid-cols-1 lg:grid-cols-2 gap-8 items-center ${reverse ? 'lg:[direction:rtl]' : ''}`}
              >
                <div className={reverse ? '[direction:ltr]' : ''}>
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-teal-500/20 bg-teal-500/10 text-[10px] font-bold uppercase tracking-widest text-teal-400 mb-4">
                    <Icon size={12} /> {f.title}
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-bold text-[var(--foreground)] tracking-tight mb-3">{f.title}</h2>
                  <p className="text-[var(--muted-foreground)] leading-relaxed">{f.desc}</p>
                </div>
                <div className={`relative aspect-video rounded-2xl overflow-hidden border border-[var(--border)] bg-gradient-to-br from-teal-500/10 via-teal-700/5 to-emerald-500/10 ${reverse ? '[direction:ltr]' : ''}`}>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Icon size={64} className="text-teal-400/30" />
                  </div>
                  <div className="absolute bottom-3 left-3 px-2 py-0.5 rounded bg-black/50 backdrop-blur text-[10px] uppercase tracking-wider text-white">
                    Sample data
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </section>

      <section className="py-16 sm:py-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.5 }}
            className="rounded-3xl border border-[var(--accent)]/20 bg-gradient-to-br from-teal-500/5 to-teal-700/5 p-10 sm:p-14 text-center"
          >
            <h2 className="text-2xl sm:text-3xl font-bold text-[var(--foreground)] tracking-tight">
              Ready to see your <span className="bg-gradient-to-r from-teal-400 to-teal-600 bg-clip-text text-transparent">own numbers?</span>
            </h2>
            <p className="mt-4 text-[var(--muted-foreground)] max-w-xl mx-auto">
              Upload your first CSV and get your real dashboard — with your actual trades, your actual patterns, your actual dollar costs. Takes 60 seconds.
            </p>
            <Link
              href="/sign-up"
              className="inline-flex items-center gap-2 mt-6 px-6 py-3 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white rounded-xl text-sm font-medium transition-colors"
            >
              Start with Your Own Trades
              <ArrowRight size={16} />
            </Link>
            <p className="mt-4 text-xs text-[var(--muted-foreground)]">
              No credit card · 14-day full Pro access · 67+ broker formats
            </p>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
