'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, User, Users, FlaskConical, Shield } from 'lucide-react';
import LandingNav from '@/components/landing/LandingNav';
import Footer from '@/components/landing/Footer';

const CASES = [
  {
    icon: User,
    persona: 'Solo trader self-review',
    headline: 'Find what\'s costing you and fix it week-by-week',
    body: 'Import your trades, get behavioral feedback per session, surface costly errors, and watch your discipline score climb week-over-week. The journal you wish you had been keeping.',
    bullets: [
      'Daily and weekly performance summaries',
      'Pattern detectors ranked by dollar impact',
      'Discipline streak tracker',
    ],
  },
  {
    icon: Users,
    persona: 'Prop firm & team coaching',
    headline: 'Review every trader on one shared dashboard',
    body: 'Coaches and team managers review trader profiles side-by-side, surface common desk problems, and verify playbook adherence — especially critical for funded traders working under firm rules.',
    bullets: [
      'Multi-trader dashboards with role-based access',
      'Per-trader playbook compliance scoring',
      'Risk-rule violation alerts surfaced to managers',
    ],
  },
  {
    icon: FlaskConical,
    persona: 'Strategy validation',
    headline: 'Test what removing a leak would have done',
    body: 'Use the What-If simulation lab to remove specific behavior patterns from your historical trades and see how performance would have changed. Quantify the upside before committing to a fix.',
    bullets: [
      'What-if scenarios across rule sets',
      'Counterfactual P&L with confidence intervals',
      'Side-by-side strategy comparisons',
    ],
  },
  {
    icon: Shield,
    persona: 'Risk management auditing',
    headline: 'Position sizing, stops, and exposure under one roof',
    body: 'Monitor position sizing, stop-loss adherence, drawdown limits, and per-session exposure thresholds. Flag breaches automatically and review the trades that caused them.',
    bullets: [
      'Configurable risk-rule library',
      'Drawdown and exposure heatmaps',
      'Audit trail for every breach',
    ],
  },
];

export default function UseCasesPage() {
  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <LandingNav />

      <section className="relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-teal-500 opacity-[0.07] rounded-full blur-[120px]" />
        </div>
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 pt-16 sm:pt-24 pb-10 text-center">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight"
          >
            Use{' '}
            <span className="bg-gradient-to-r from-teal-400 to-teal-600 bg-clip-text text-transparent">cases</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="mt-5 text-base sm:text-lg text-[var(--muted-foreground)] max-w-2xl mx-auto"
          >
            How traders, prop firms, and coaches use Tradia to improve execution discipline.
          </motion.p>
        </div>
      </section>

      <section className="py-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 space-y-6">
          {CASES.map((c, i) => (
            <motion.div
              key={c.persona}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-50px' }}
              transition={{ duration: 0.4, delay: i * 0.05 }}
              className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-8 grid grid-cols-1 md:grid-cols-3 gap-6"
            >
              <div className="md:col-span-1">
                <div className="w-10 h-10 rounded-xl bg-teal-500/10 flex items-center justify-center mb-3">
                  <c.icon size={18} className="text-teal-400" />
                </div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted-foreground)] mb-2">{c.persona}</div>
                <h3 className="text-xl font-bold text-[var(--foreground)] leading-tight">{c.headline}</h3>
              </div>
              <div className="md:col-span-2">
                <p className="text-sm text-[var(--muted-foreground)] leading-relaxed mb-4">{c.body}</p>
                <ul className="space-y-2">
                  {c.bullets.map(b => (
                    <li key={b} className="flex items-start gap-2 text-sm text-[var(--foreground)]">
                      <span className="text-teal-400 mt-0.5">·</span>{b}
                    </li>
                  ))}
                </ul>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Find your use case in 60 seconds</h2>
          <p className="mt-3 text-[var(--muted-foreground)]">Upload one CSV. See your own version of the dashboards above.</p>
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/sign-up" className="inline-flex items-center gap-2 px-6 py-3 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white rounded-xl text-sm font-medium transition-colors">
              Start Free Trial <ArrowRight size={16} />
            </Link>
            <Link href="/demo" className="inline-flex items-center gap-2 px-6 py-3 border border-[var(--border)] text-[var(--foreground)] rounded-xl text-sm font-medium hover:bg-[var(--muted)] transition-colors">
              See Demo
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
