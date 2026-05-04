'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { Check, ArrowRight, Zap, Users } from 'lucide-react';

type Tier = {
  name: string;
  tagline: string;
  monthlyPrice: number;
  yearlyPrice: number;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  accent: string;
  features: string[];
  meta?: string;
  highlighted?: boolean;
};

const TIERS: Tier[] = [
  {
    name: 'Pro',
    tagline: 'For individual traders',
    monthlyPrice: 20,
    yearlyPrice: 200,
    icon: Zap,
    accent: 'from-teal-400 to-cyan-400',
    features: [
      'Unlimited trades',
      'Full verdict engine with 28+ detectors',
      'Playbook rules',
      'Performance analytics with 50+ metrics',
      'API sync for 5 exchanges',
      'Priority support',
      '14-day free trial included',
    ],
    highlighted: true,
  },
  {
    name: 'Team',
    tagline: 'For coaches, prop firms, and trading groups',
    monthlyPrice: 49,
    yearlyPrice: 490,
    icon: Users,
    accent: 'from-emerald-400 to-lime-400',
    meta: 'Includes 3 seats · Additional seats $15/mo each',
    features: [
      'Everything in Pro',
      'Shared workspace',
      'Team member management',
      'Cohort analytics',
      'Audit logs',
      'Aggregated reports',
      'Email invites',
    ],
  },
];

export default function Pricing() {
  const [interval, setInterval] = useState<'month' | 'year'>('month');

  return (
    <section id="pricing" className="relative py-20 sm:py-24">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-teal-500 opacity-[0.04] rounded-full blur-[140px]" />
      </div>

      <div className="relative max-w-6xl mx-auto px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.5 }}
          className="text-center mb-10"
        >
          <span className="text-[11px] font-bold tracking-[0.2em] uppercase bg-gradient-to-r from-teal-400 to-cyan-400 bg-clip-text text-transparent">
            Pricing
          </span>
          <h2 className="mt-3 text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight">
            Plans for{' '}
            <span className="bg-gradient-to-r from-teal-400 to-emerald-400 bg-clip-text text-transparent">solo traders and teams</span>
          </h2>
          <p className="mt-4 text-[var(--muted-foreground)] max-w-xl mx-auto">
            14-day free trial on every plan. No credit card to start.
          </p>

          {/* Billing toggle */}
          <div className="inline-flex items-center gap-1 mt-7 p-1 rounded-full border border-[var(--border)] bg-[var(--card)]">
            <button
              onClick={() => setInterval('month')}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
                interval === 'month'
                  ? 'bg-gradient-to-r from-teal-300 to-cyan-300 text-slate-900 shadow-[0_0_20px_-4px_rgba(45,212,191,0.5)]'
                  : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setInterval('year')}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5 ${
                interval === 'year'
                  ? 'bg-gradient-to-r from-teal-300 to-cyan-300 text-slate-900 shadow-[0_0_20px_-4px_rgba(45,212,191,0.5)]'
                  : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
              }`}
            >
              Annual
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                interval === 'year' ? 'bg-slate-900/20 text-slate-900' : 'bg-emerald-500/15 text-emerald-400'
              }`}>
                Save 17%
              </span>
            </button>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 max-w-4xl mx-auto">
          {TIERS.map((t, i) => <TierCard key={t.name} tier={t} interval={interval} idx={i} />)}
        </div>

        {/* Footnote */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-[var(--muted-foreground)]">
          <span className="flex items-center gap-1.5"><Check size={12} className="text-emerald-400" /> No credit card required</span>
          <span className="opacity-30">·</span>
          <span className="flex items-center gap-1.5"><Check size={12} className="text-emerald-400" /> Cancel anytime</span>
          <span className="opacity-30">·</span>
          <span className="flex items-center gap-1.5"><Check size={12} className="text-emerald-400" /> Full access during trial</span>
        </div>
      </div>
    </section>
  );
}

function TierCard({ tier, interval, idx }: { tier: Tier; interval: 'month' | 'year'; idx: number }) {
  const price = interval === 'year' ? tier.yearlyPrice : tier.monthlyPrice;
  const periodLabel = interval === 'year' ? '/year' : '/month';
  const effectiveMonthly = interval === 'year' ? (tier.yearlyPrice / 12).toFixed(0) : null;
  const Icon = tier.icon;
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-100px' }}
      transition={{ duration: 0.4, delay: idx * 0.08 }}
      className={`relative rounded-2xl p-6 sm:p-7 flex flex-col overflow-hidden ${
        tier.highlighted
          ? 'border border-teal-500/40 bg-gradient-to-br from-teal-500/10 via-cyan-500/5 to-transparent'
          : 'border border-[var(--border)] bg-[var(--card)]'
      }`}
    >
      {tier.highlighted && (
        <>
          <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-teal-400/10 blur-3xl" />
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-teal-400/50 to-transparent" />
        </>
      )}

      <div className="relative flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2.5">
          <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${tier.accent} bg-opacity-20 flex items-center justify-center`}>
            <Icon size={16} className="text-slate-900" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-[var(--foreground)]">{tier.name}</h3>
            <p className="text-[11px] text-[var(--muted-foreground)] leading-tight">{tier.tagline}</p>
          </div>
        </div>
        {tier.highlighted && (
          <span className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30">
            Most popular
          </span>
        )}
      </div>

      <div className="relative mt-2 flex items-baseline gap-1">
        <span className="text-5xl font-bold tabular-nums text-[var(--foreground)]">${price}</span>
        <span className="text-sm text-[var(--muted-foreground)]">{periodLabel}</span>
      </div>
      {effectiveMonthly && (
        <p className="relative text-[11px] text-emerald-400 mt-1 tabular-nums">
          ${effectiveMonthly}/mo effective · 2 months free
        </p>
      )}
      {!effectiveMonthly && (
        <p className="relative text-[11px] text-[var(--muted-foreground)] mt-1">Billed monthly</p>
      )}

      <ul className="relative mt-6 space-y-2.5 flex-1">
        {tier.features.map(f => (
          <li key={f} className="flex items-start gap-2 text-xs text-[var(--foreground)]">
            <Check size={13} className="mt-0.5 text-teal-400 shrink-0" />
            <span>{f}</span>
          </li>
        ))}
      </ul>

      {tier.meta && (
        <p className="relative mt-4 text-[10px] text-[var(--muted-foreground)] border-t border-[var(--border)] pt-3 leading-relaxed">
          {tier.meta}
        </p>
      )}

      <Link
        href="/sign-up"
        className={`relative mt-6 inline-flex items-center justify-center gap-2 w-full py-3 rounded-xl text-sm font-semibold transition-all ${
          tier.highlighted
            ? 'text-slate-900 bg-gradient-to-r from-teal-300 to-cyan-300 hover:from-teal-200 hover:to-cyan-200 shadow-[0_0_30px_-4px_rgba(45,212,191,0.5)]'
            : 'text-[var(--foreground)] border border-[var(--border)] bg-[var(--card)] hover:bg-[var(--muted)]/50'
        }`}
      >
        Start 14-Day Free Trial
        <ArrowRight size={14} />
      </Link>
      <p className="relative text-center text-[10px] text-[var(--muted-foreground)] mt-2">No credit card required</p>
    </motion.div>
  );
}
