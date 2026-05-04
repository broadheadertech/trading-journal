'use client';

import Link from 'next/link';
import Image from 'next/image';
import NewsletterSignup from './NewsletterSignup';

const COLS = [
  {
    heading: 'Product',
    links: [
      { label: 'Features',         href: '/#features' },
      { label: 'How It Works',     href: '/#how-it-works' },
      { label: 'Pricing',          href: '/pricing' },
      { label: 'Integrations',     href: '/integrations' },
      { label: 'Use Cases',        href: '/use-cases' },
      { label: 'Interactive Demo', href: '/demo' },
    ],
  },
  {
    heading: 'Company',
    links: [
      { label: 'About',     href: '/about' },
      { label: 'Security',  href: '/security' },
      { label: 'Contact',   href: '/contact' },
      { label: 'Blog',      href: '/blog' },
      { label: 'Brokers',   href: '/brokers' },
      { label: 'Affiliate', href: '/affiliate' },
      { label: 'Changelog', href: '/changelog' },
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
      { label: 'What Is Revenge Trading?',         href: '/blog/revenge-trading-cost' },
      { label: 'The Hidden Cost of Overtrading',   href: '/blog/overtrading-hidden-cost' },
      { label: 'Find Your Worst Trading Hours',    href: '/blog/worst-trading-hours' },
      { label: 'Journal vs Behavioral Analytics',  href: '/blog/trading-journal-vs-behavioral-analytics' },
      { label: 'Best Trading Journal 2026',        href: '/blog/best-trading-journal-2026' },
      { label: '50 Trading Metrics Guide',         href: '/blog/50-trading-metrics-every-trader-should-track' },
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
    <footer className="border-t border-[var(--border)]">
      {/* Footer link columns */}

      {/* Footer link columns */}
      <div className="border-t border-[var(--border)] py-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-8 mb-10">
            <div className="col-span-2 lg:col-span-1 space-y-4">
              <div>
                <Link href="/" className="flex items-center gap-2 mb-3 group">
                  <Image src="/logo.png" alt="Tradia" width={28} height={28} className="w-7 h-7 object-contain" />
                  <span className="text-base font-bold bg-gradient-to-r from-teal-300 to-emerald-300 bg-clip-text text-transparent">Tradia</span>
                </Link>
                <p className="text-xs text-[var(--muted-foreground)] leading-relaxed">
                  Find the trading mistakes costing you thousands — and prove you fixed them.
                </p>
              </div>
              <NewsletterSignup />
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
