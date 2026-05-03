'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import BrainMascot from '@/components/BrainMascot';

const COLS = [
  {
    heading: 'Product',
    links: [
      { label: 'Features',         href: '#features' },
      { label: 'How It Works',     href: '#how-it-works' },
      { label: 'Pricing',          href: '#pricing' },
      { label: 'Integrations',     href: '#features' },
      { label: 'Use Cases',        href: '#features' },
      { label: 'Interactive Demo', href: '/sign-up' },
    ],
  },
  {
    heading: 'Company',
    links: [
      { label: 'About',     href: '#' },
      { label: 'Security',  href: '#' },
      { label: 'Contact',   href: '#' },
      { label: 'Blog',      href: '#' },
      { label: 'Changelog', href: '#' },
    ],
  },
  {
    heading: 'Free Tools',
    links: [
      { label: 'Position Size Calculator', href: '#' },
      { label: 'Risk/Reward Calculator',   href: '#' },
      { label: 'Economic Calendar',        href: '/app' },
      { label: 'World Monitoring',         href: '/app' },
    ],
  },
  {
    heading: 'Popular Articles',
    links: [
      { label: 'How revenge trading costs you thousands', href: '#' },
      { label: 'The true cost of overtrading',            href: '#' },
      { label: 'Worst trading hours by market',           href: '#' },
      { label: 'Beyond the trading journal',              href: '#' },
      { label: 'Metrics every trader must track',         href: '#' },
    ],
  },
];

const LEGAL = [
  { label: 'Privacy Policy',   href: '/privacy' },
  { label: 'Terms of Service', href: '/terms' },
  { label: 'Risk Disclosure',  href: '#' },
  { label: 'Cookie Policy',    href: '#' },
];

export default function Footer() {
  return (
    <footer>
      {/* CTA Banner */}
      <section className="py-20 sm:py-24">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.5 }}
            className="rounded-2xl border border-[var(--accent)]/20 bg-gradient-to-br from-teal-500/5 to-teal-700/5 p-10 sm:p-14 text-center"
          >
            <h2 className="text-2xl sm:text-3xl font-bold text-[var(--foreground)] tracking-tight">
              See what your trading mistakes are{' '}
              <span className="bg-gradient-to-r from-teal-400 to-teal-600 bg-clip-text text-transparent">really costing you</span>
            </h2>
            <p className="mt-3 text-[var(--muted-foreground)] max-w-md mx-auto">
              14-day free trial. No credit card. Setup in 60 seconds.
            </p>
            <Link
              href="/sign-up"
              className="inline-flex items-center gap-2 mt-6 px-6 py-3 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white rounded-xl text-sm font-medium transition-colors"
            >
              Start Free Trial
              <ArrowRight size={16} />
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Footer link columns */}
      <div className="border-t border-[var(--border)] py-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-8 mb-10">
            <div className="col-span-2 lg:col-span-1">
              <div className="flex items-center gap-2 mb-3">
                <BrainMascot size={24} />
                <span className="text-sm font-semibold bg-gradient-to-r from-teal-400 to-teal-600 bg-clip-text text-transparent">Tradia</span>
              </div>
              <p className="text-xs text-[var(--muted-foreground)] leading-relaxed">
                Find the trading mistakes costing you thousands — and prove you fixed them.
              </p>
            </div>

            {COLS.map((col) => (
              <div key={col.heading}>
                <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--foreground)] mb-3">{col.heading}</h3>
                <ul className="space-y-2">
                  {col.links.map((l) => (
                    <li key={l.label}>
                      <Link href={l.href} className="text-xs text-[var(--muted-foreground)] hover:text-teal-400 transition-colors">
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Legal row */}
          <div className="pt-6 border-t border-[var(--border)] flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-[var(--muted-foreground)]">
              &copy; 2026 Tradia. All rights reserved.
            </p>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-[var(--muted-foreground)]">
              {LEGAL.map((l) => (
                <Link key={l.label} href={l.href} className="hover:text-teal-400 transition-colors">
                  {l.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
