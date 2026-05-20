'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Check, ArrowRight, Zap, Users, Star, Target } from 'lucide-react';

type Plan = {
  _id: string;
  planId: string;
  name: string;
  tagline?: string;
  goal?: string;
  priceMonthly: number;
  priceYearly: number;
  features: string[];
  isActive: boolean;
  isHighlighted?: boolean;
  sortOrder: number;
};

const ICON_BY_PLAN: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  core: Zap,
  pro: Star,
  elite: Users,
};

const ACCENT_BY_PLAN: Record<string, string> = {
  core: 'from-pink-400 to-fuchsia-400',
  pro: 'from-orange-400 to-amber-400',
  elite: 'from-fuchsia-400 to-pink-500',
};

export default function Pricing() {
  const [interval, setInterval] = useState<'month' | 'year'>('month');
  const plans = useQuery(api.subscriptions.getActivePlans) as Plan[] | undefined;

  const sortedPlans = (plans ?? []).slice().sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <section id="pricing" className="relative py-20 sm:py-24">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-pink-500 opacity-[0.04] rounded-full blur-[140px]" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.5 }}
          className="text-center mb-10"
        >
          <span className="neon-eyebrow text-[11px] font-bold tracking-[0.2em] uppercase">
            Pricing
          </span>
          <h2 className="mt-3 text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight">
            Plans for{' '}
            <span className="neon-headline">solo traders and teams</span>
          </h2>
          <p className="mt-4 text-[var(--muted-foreground)] max-w-xl mx-auto">
            15-day free trial on every plan. No credit card to start.
          </p>

          <div className="inline-flex items-center gap-1 mt-7 p-1 rounded-full border border-[var(--border)] bg-[var(--card)]">
            <button
              onClick={() => setInterval('month')}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
                interval === 'month'
                  ? 'bg-gradient-to-r from-orange-400 to-amber-400 text-slate-900 shadow-[0_0_20px_-4px_rgba(251,146,60,0.6)]'
                  : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setInterval('year')}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5 ${
                interval === 'year'
                  ? 'bg-gradient-to-r from-orange-400 to-amber-400 text-slate-900 shadow-[0_0_20px_-4px_rgba(251,146,60,0.6)]'
                  : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
              }`}
            >
              Annual
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                interval === 'year' ? 'bg-slate-900/20 text-slate-900' : 'bg-pink-500/15 text-pink-400'
              }`}>
                Save 17%
              </span>
            </button>
          </div>
        </motion.div>

        {plans === undefined ? (
          <PricingSkeleton />
        ) : sortedPlans.length === 0 ? (
          <div className="text-center text-sm text-[var(--muted-foreground)] py-12">
            No active plans configured. Run <code className="text-pink-400">seedPlans</code> from the Convex dashboard to populate them.
          </div>
        ) : (
          <div className={`grid grid-cols-1 ${sortedPlans.length === 2 ? 'md:grid-cols-2 max-w-4xl' : 'md:grid-cols-3 max-w-6xl'} gap-5 mx-auto`}>
            {sortedPlans.map((p, i) => <TierCard key={p._id} plan={p} interval={interval} idx={i} />)}
          </div>
        )}

        <div className="mt-8 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-[var(--muted-foreground)]">
          <span className="flex items-center gap-1.5"><Check size={12} className="text-pink-400" /> No credit card required</span>
          <span className="opacity-30">·</span>
          <span className="flex items-center gap-1.5"><Check size={12} className="text-pink-400" /> Cancel anytime</span>
          <span className="opacity-30">·</span>
          <span className="flex items-center gap-1.5"><Check size={12} className="text-pink-400" /> Full access during trial</span>
        </div>
      </div>
    </section>
  );
}

function PricingSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-6xl mx-auto">
      {[0, 1, 2].map(i => (
        <div key={i} className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 sm:p-7 animate-pulse">
          <div className="h-9 w-24 rounded bg-[var(--muted)]/50 mb-4" />
          <div className="h-12 w-32 rounded bg-[var(--muted)]/50 mb-6" />
          <div className="space-y-2">
            {[0, 1, 2, 3, 4].map(j => <div key={j} className="h-3 rounded bg-[var(--muted)]/30" />)}
          </div>
        </div>
      ))}
    </div>
  );
}

function TierCard({ plan, interval, idx }: { plan: Plan; interval: 'month' | 'year'; idx: number }) {
  const price = interval === 'year' ? plan.priceYearly : plan.priceMonthly;
  const periodLabel = interval === 'year' ? '/year' : '/month';
  const effectiveMonthly = interval === 'year' ? (plan.priceYearly / 12).toFixed(0) : null;
  const Icon = ICON_BY_PLAN[plan.planId] ?? Zap;
  const accent = ACCENT_BY_PLAN[plan.planId] ?? 'from-pink-400 to-fuchsia-400';
  const highlighted = plan.isHighlighted === true;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-100px' }}
      transition={{ duration: 0.4, delay: idx * 0.08 }}
      className={`relative rounded-2xl p-6 sm:p-7 flex flex-col overflow-hidden ${
        highlighted
          ? 'border border-orange-500/40 bg-gradient-to-br from-orange-500/10 via-amber-500/5 to-transparent'
          : 'border border-[var(--border)] bg-[var(--card)]'
      }`}
    >
      {highlighted && (
        <>
          <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-orange-400/10 blur-3xl" />
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-orange-400/50 to-transparent" />
        </>
      )}

      <div className="relative flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2.5">
          <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${accent} bg-opacity-20 flex items-center justify-center`}>
            <Icon size={16} className="text-slate-900" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-[var(--foreground)]">{plan.name}</h3>
            {plan.tagline && (
              <p className="text-[11px] text-[var(--muted-foreground)] leading-tight">{plan.tagline}</p>
            )}
          </div>
        </div>
        {highlighted && (
          <span className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-300 border border-orange-500/30">
            Most popular
          </span>
        )}
      </div>

      <div className="relative mt-2 flex items-baseline gap-1">
        <span className="text-5xl font-bold tabular-nums text-[var(--foreground)]">${price}</span>
        <span className="text-sm text-[var(--muted-foreground)]">{periodLabel}</span>
      </div>
      {effectiveMonthly ? (
        <p className="relative text-[11px] text-pink-400 mt-1 tabular-nums">
          ${effectiveMonthly}/mo effective · 2 months free
        </p>
      ) : (
        <p className="relative text-[11px] text-[var(--muted-foreground)] mt-1">Billed monthly</p>
      )}

      <ul className="relative mt-6 space-y-2.5 flex-1">
        {plan.features.map(f => (
          <li key={f} className="flex items-start gap-2 text-xs text-[var(--foreground)]">
            <Check size={13} className="mt-0.5 text-pink-400 shrink-0" />
            <span>{f}</span>
          </li>
        ))}
      </ul>

      {plan.goal && (
        <div className="relative mt-5 pt-4 border-t border-[var(--border)] flex items-start gap-2">
          <Target size={13} className="mt-0.5 text-pink-400 shrink-0" />
          <p className="text-[11px] text-[var(--muted-foreground)] leading-relaxed">
            <span className="font-semibold text-[var(--foreground)]">Goal: </span>
            {plan.goal}
          </p>
        </div>
      )}

      <Link
        href="/sign-up"
        className={`relative mt-6 inline-flex items-center justify-center gap-2 w-full py-3 rounded-xl text-sm font-semibold transition-all ${
          highlighted
            ? 'text-slate-900 bg-gradient-to-r from-orange-400 to-amber-400 hover:from-orange-300 hover:to-amber-300 shadow-[0_0_30px_-4px_rgba(251,146,60,0.6)]'
            : 'text-[var(--foreground)] border border-[var(--border)] bg-[var(--card)] hover:bg-[var(--muted)]/50'
        }`}
      >
        Start 15-Day Free Trial
        <ArrowRight size={14} />
      </Link>
      <p className="relative text-center text-[10px] text-[var(--muted-foreground)] mt-2">No credit card required</p>
    </motion.div>
  );
}
