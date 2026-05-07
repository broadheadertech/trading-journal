'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, Sparkles } from 'lucide-react';
import LandingNav from '@/components/landing/LandingNav';
import Footer from '@/components/landing/Footer';

const ENTRIES = [
  {
    date: '2026-05-04',
    badge: 'Latest',
    title: 'Brokers & Affiliate pages',
    items: [
      'Dedicated /brokers page listing 46+ supported broker tiles across crypto, forex, stocks, and prop firms',
      'New affiliate program at /affiliate with 30/40/50% recurring commission tiers and lifetime payouts',
      'Nav and footer updated to surface both routes',
    ],
  },
  {
    date: '2026-05-01',
    title: 'Launch preparation & content sprint',
    items: [
      '120+ blog articles published with category, search, and popular-article surfacing',
      'Sample-data onboarding tour for first-time accounts',
      'Improved demo page with five alternating feature blocks',
    ],
  },
  {
    date: '2026-04-22',
    title: 'Teams, email sequences & accessibility',
    items: [
      'Full-scale Teams workspace with shared playbooks and reviewer roles',
      'Onboarding email sequences for new sign-ups',
      'WCAG AA color-contrast pass across landing and app surfaces',
    ],
  },
  {
    date: '2026-04-09',
    title: 'Conversion & SEO optimization',
    items: [
      'Enhanced 404 pages with smart article suggestions',
      'Structured data and Atom feed for the blog',
      'Comparison pages for top trading-journal alternatives',
    ],
  },
  {
    date: '2026-03-27',
    title: 'Import engine & broker support',
    items: [
      '67 YAML-driven CSV broker definitions with auto-detection',
      '5 live API connectors (Binance, Bybit, OKX, Alpaca, OANDA)',
      'Idempotent import pipeline with deterministic deduplication hashes',
    ],
  },
];

export default function ChangelogPage() {
  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <LandingNav />

      <section className="relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-pink-500 opacity-[0.07] rounded-full blur-[120px]" />
        </div>
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 pt-16 sm:pt-24 pb-10 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-pink-500/10 border border-pink-500/20 text-xs font-medium text-pink-400 mb-6"
          >
            <Sparkles size={12} /> Tradia ships fast
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.05 }}
            className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight"
          >
            Changelog
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="mt-5 text-base sm:text-lg text-[var(--muted-foreground)] max-w-2xl mx-auto"
          >
            What we&apos;ve shipped recently â€” features, fixes, and platform improvements.
          </motion.p>
        </div>
      </section>

      <section className="py-10">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <div className="space-y-6">
            {ENTRIES.map((e, i) => (
              <motion.div
                key={e.date}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-50px' }}
                transition={{ duration: 0.4, delay: i * 0.05 }}
                className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6"
              >
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-xs font-mono text-[var(--muted-foreground)]">{e.date}</span>
                  {e.badge && (
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-pink-500/15 text-pink-400">
                      {e.badge}
                    </span>
                  )}
                </div>
                <h2 className="text-lg font-bold text-[var(--foreground)] mb-3">{e.title}</h2>
                <ul className="space-y-2">
                  {e.items.map(item => (
                    <li key={item} className="flex items-start gap-2 text-sm text-[var(--muted-foreground)] leading-relaxed">
                      <span className="text-pink-400 mt-0.5 flex-shrink-0">Â·</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Try the latest build</h2>
          <p className="mt-3 text-[var(--muted-foreground)]">14-day free trial. No credit card. Setup in 60 seconds.</p>
          <Link href="/sign-up" className="inline-flex items-center gap-2 mt-6 px-6 py-3 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white rounded-xl text-sm font-medium transition-colors">
            Start Free Trial <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}
