'use client';

import { motion } from 'framer-motion';
import { Calendar, CheckCircle, ArrowRight } from 'lucide-react';
import LandingNav from '@/components/landing/LandingNav';
import Pricing from '@/components/landing/Pricing';
import Footer from '@/components/landing/Footer';

const TIMELINE = [
  {
    day: 'Day 1',
    title: 'Upload your first trades',
    desc: 'Connect any of 67+ brokers via CSV or API. Auto-detected and normalized in under 60 seconds. Your dashboard populates immediately.',
  },
  {
    day: 'Day 3',
    title: 'See your costliest leaks',
    desc: 'The verdict engine has now ranked every costly pattern by dollar impact. You know exactly which mistake is bleeding your account the most.',
  },
  {
    day: 'Day 7',
    title: 'Set rules, track compliance',
    desc: 'Define a personal playbook. Compliance is auto-tracked on every new trade. Your discipline score is now measurable, week over week.',
  },
];

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <LandingNav />

      <section className="relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-teal-500 opacity-[0.07] rounded-full blur-[120px]" />
        </div>
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-16 sm:pt-24 pb-6 text-center">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight"
          >
            Pricing that scales with{' '}
            <span className="bg-gradient-to-r from-teal-400 to-teal-600 bg-clip-text text-transparent">your edge</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="mt-5 text-[var(--muted-foreground)] max-w-2xl mx-auto"
          >
            14-day free trial on every plan. No credit card to start. Full access during the trial — cancel anytime.
          </motion.p>
        </div>
      </section>

      <Pricing />

      {/* First Week Timeline */}
      <section className="py-16 sm:py-24 bg-[var(--card)]/30 border-y border-[var(--border)]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.5 }}
            className="text-center mb-12"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[var(--border)] bg-[var(--card)] text-[10px] font-bold uppercase tracking-widest text-teal-400 mb-3">
              <Calendar size={12} /> Your first week
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
              From signup to <span className="bg-gradient-to-r from-teal-400 to-teal-600 bg-clip-text text-transparent">measurable improvement</span>
            </h2>
            <p className="mt-3 text-[var(--muted-foreground)] max-w-xl mx-auto">
              The fastest path from "I just signed up" to "I know exactly what's costing me money."
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {TIMELINE.map((t, i) => (
              <motion.div
                key={t.day}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-100px' }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
                className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6"
              >
                <div className="text-xs font-bold uppercase tracking-widest text-teal-400 mb-2">{t.day}</div>
                <h3 className="text-base font-bold mb-2">{t.title}</h3>
                <p className="text-sm text-[var(--muted-foreground)] leading-relaxed">{t.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Trial / signup reassurance */}
      <section className="py-16 sm:py-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.5 }}
            className="rounded-3xl border border-[var(--accent)]/20 bg-gradient-to-br from-teal-500/5 to-teal-700/5 p-10 sm:p-14"
          >
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-center">
              14-day free trial on every plan
            </h2>
            <ul className="mt-6 space-y-2 max-w-md mx-auto">
              {[
                'No credit card required',
                'Full Pro access for 14 days',
                'Cancel anytime',
              ].map((item) => (
                <li key={item} className="flex items-center gap-2 text-sm">
                  <CheckCircle size={16} className="text-emerald-400 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
            <div className="flex justify-center mt-8">
              <a
                href="/sign-up"
                className="inline-flex items-center gap-2 px-6 py-3 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white rounded-xl text-sm font-medium transition-colors"
              >
                Start Free Trial
                <ArrowRight size={16} />
              </a>
            </div>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
