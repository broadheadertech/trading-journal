'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Check, Loader2 } from 'lucide-react';
import Link from 'next/link';

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

export default function Pricing() {
  const plans = useQuery(api.subscriptions.getActivePlans);
  const [interval, setInterval] = useState<'month' | 'year'>('month');

  type Plan = NonNullable<typeof plans>[number];
  const sorted = plans ? [...plans].sort((a: Plan, b: Plan) => a.sortOrder - b.sortOrder) : [];

  return (
    <section id="pricing" className="py-20 sm:py-28">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.5 }}
          className="text-center mb-10"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-[var(--foreground)]">
            Simple, Transparent Pricing
          </h2>
          <p className="mt-4 text-[var(--muted-foreground)] max-w-xl mx-auto">
            Start free and upgrade as your trading grows. No hidden fees, cancel anytime.
          </p>

          {/* Interval toggle */}
          <div className="flex items-center justify-center gap-2 mt-6">
            <button
              onClick={() => setInterval('month')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                interval === 'month'
                  ? 'bg-[var(--accent)] text-white'
                  : 'bg-[var(--muted)] text-[var(--muted-foreground)]'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setInterval('year')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                interval === 'year'
                  ? 'bg-[var(--accent)] text-white'
                  : 'bg-[var(--muted)] text-[var(--muted-foreground)]'
              }`}
            >
              Yearly
              <span className="ml-1.5 text-xs opacity-75">Save ~17%</span>
            </button>
          </div>
        </motion.div>

        {!plans ? (
          <div className="flex justify-center py-12">
            <Loader2 size={24} className="animate-spin text-[var(--muted-foreground)]" />
          </div>
        ) : (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-100px' }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 max-w-4xl mx-auto"
          >
            {/* Free tier */}
            <motion.div variants={itemVariants} className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 flex flex-col">
              <h3 className="text-sm font-bold text-[var(--foreground)]">Free</h3>
              <p className="text-3xl font-bold text-[var(--foreground)] mt-3">
                $0<span className="text-sm font-normal text-[var(--muted-foreground)]">/mo</span>
              </p>
              <ul className="mt-5 space-y-2.5 flex-1">
                <li className="flex items-start gap-2 text-xs text-[var(--muted-foreground)]">
                  <Check size={14} className="mt-0.5 text-[var(--green)] shrink-0" />
                  Basic trade journal
                </li>
                <li className="flex items-start gap-2 text-xs text-[var(--muted-foreground)]">
                  <Check size={14} className="mt-0.5 text-[var(--green)] shrink-0" />
                  Up to 50 trades
                </li>
                <li className="flex items-start gap-2 text-xs text-[var(--muted-foreground)]">
                  <Check size={14} className="mt-0.5 text-[var(--green)] shrink-0" />
                  3 strategies
                </li>
                <li className="flex items-start gap-2 text-xs text-[var(--muted-foreground)]">
                  <Check size={14} className="mt-0.5 text-[var(--green)] shrink-0" />
                  5 core tabs
                </li>
              </ul>
              <Link
                href="/sign-up"
                className="mt-5 w-full py-2.5 text-center rounded-lg border border-[var(--border)] text-sm font-medium text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors block"
              >
                Get Started
              </Link>
            </motion.div>

            {/* Paid plans */}
            {sorted.map((plan: Plan, i: number) => {
              const price = interval === 'year' ? plan.priceYearly : plan.priceMonthly;
              const priceLabel = interval === 'year' ? '/yr' : '/mo';
              const isPopular = i === Math.floor(sorted.length / 2);

              return (
                <motion.div
                  key={plan._id}
                  variants={itemVariants}
                  className={`rounded-xl border bg-[var(--card)] p-6 flex flex-col relative ${
                    isPopular ? 'border-[var(--accent)] ring-1 ring-[var(--accent)]' : 'border-[var(--border)]'
                  }`}
                >
                  {isPopular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-[var(--accent)] text-white text-[10px] font-semibold rounded-full">
                      Most Popular
                    </div>
                  )}
                  <h3 className="text-sm font-bold text-[var(--foreground)]">{plan.name}</h3>
                  <p className="text-3xl font-bold text-[var(--foreground)] mt-3">
                    ${price}<span className="text-sm font-normal text-[var(--muted-foreground)]">{priceLabel}</span>
                  </p>
                  <ul className="mt-5 space-y-2.5 flex-1">
                    {plan.features.map((f: string, fi: number) => (
                      <li key={fi} className="flex items-start gap-2 text-xs text-[var(--muted-foreground)]">
                        <Check size={14} className="mt-0.5 text-[var(--green)] shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Link
                    href="/sign-up"
                    className={`mt-5 w-full py-2.5 text-center rounded-lg text-sm font-medium transition-colors block ${
                      isPopular
                        ? 'bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)]'
                        : 'border border-[var(--border)] text-[var(--foreground)] hover:bg-[var(--muted)]'
                    }`}
                  >
                    Get Started
                  </Link>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </div>
    </section>
  );
}
