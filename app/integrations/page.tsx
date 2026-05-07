'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, Plug, FileSpreadsheet, Globe2, Zap, ShieldCheck } from 'lucide-react';
import LandingNav from '@/components/landing/LandingNav';
import Footer from '@/components/landing/Footer';

const API_CONNECTORS = [
  { name: 'Binance',  scope: 'Spot + Perp Futures' },
  { name: 'Bybit',    scope: 'Spot + Derivatives' },
  { name: 'OKX',      scope: 'Spot + Perp + Options' },
  { name: 'Alpaca',   scope: 'US Equities + Crypto' },
  { name: 'OANDA',    scope: 'Forex + CFD' },
];

const MARKETS = [
  { tag: 'Crypto Spot',     count: '12 brokers' },
  { tag: 'Crypto Futures',  count: '10 brokers' },
  { tag: 'Forex',           count: '14 brokers' },
  { tag: 'Equities',        count: '12 brokers' },
  { tag: 'Options',         count: '6 brokers' },
  { tag: 'Futures',         count: '8 brokers' },
  { tag: 'CFDs',            count: '11 brokers' },
  { tag: 'ETFs',            count: '9 brokers' },
];

const FEATURES = [
  {
    icon: Zap,
    title: 'Live API sync',
    body: 'Five direct connectors stream trades into Tradia within seconds of close. Read-only keys only â€” no withdrawal, no execution.',
  },
  {
    icon: FileSpreadsheet,
    title: 'CSV & XLSX import',
    body: 'Upload trade history from any broker that exports CSV or Excel. Auto-detected and auto-normalized across 67+ formats.',
  },
  {
    icon: Globe2,
    title: 'Cross-market normalization',
    body: 'Every trade â€” crypto, forex, stocks, options â€” lands in the same unified schema. Run analytics across portfolios, not silos.',
  },
  {
    icon: ShieldCheck,
    title: 'Idempotent re-imports',
    body: 'Deterministic dedupe hashes mean you can re-import the same file safely. No phantom trades, ever.',
  },
];

export default function IntegrationsPage() {
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
            <Plug size={12} /> 67+ broker & exchange integrations
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.05 }}
            className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight"
          >
            Connect every broker.{' '}
            <span className="bg-gradient-to-r from-pink-400 to-pink-600 bg-clip-text text-transparent">Read-only, instant.</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="mt-5 text-base sm:text-lg text-[var(--muted-foreground)] max-w-2xl mx-auto"
          >
            Five live API connectors plus 67+ broker CSV/XLSX formats â€” auto-detected and normalized into a single trade structure.
          </motion.p>
        </div>
      </section>

      <section className="py-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {FEATURES.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-50px' }}
                transition={{ duration: 0.4, delay: i * 0.04 }}
                className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6"
              >
                <div className="w-9 h-9 rounded-lg bg-pink-500/10 flex items-center justify-center mb-3">
                  <f.icon size={16} className="text-pink-400" />
                </div>
                <h3 className="text-sm font-bold text-[var(--foreground)] mb-1">{f.title}</h3>
                <p className="text-xs text-[var(--muted-foreground)] leading-relaxed">{f.body}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-14">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Live API connectors</h2>
            <p className="mt-3 text-[var(--muted-foreground)]">Direct read-only connections. No withdrawal, no execution access.</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {API_CONNECTORS.map((c, i) => (
              <motion.div
                key={c.name}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-50px' }}
                transition={{ duration: 0.35, delay: i * 0.03 }}
                className="rounded-xl border border-pink-500/30 bg-pink-500/5 p-4 text-center"
              >
                <div className="text-sm font-bold text-[var(--foreground)]">{c.name}</div>
                <div className="text-[10px] text-[var(--muted-foreground)] mt-0.5">{c.scope}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-14">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Supported markets</h2>
            <p className="mt-3 text-[var(--muted-foreground)]">Eight asset classes, one normalized schema.</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {MARKETS.map((m, i) => (
              <motion.div
                key={m.tag}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-50px' }}
                transition={{ duration: 0.35, delay: i * 0.03 }}
                className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 text-center"
              >
                <div className="text-sm font-bold text-[var(--foreground)]">{m.tag}</div>
                <div className="text-[10px] text-[var(--muted-foreground)] mt-0.5">{m.count}</div>
              </motion.div>
            ))}
          </div>
          <div className="mt-8 text-center">
            <Link href="/brokers" className="inline-flex items-center gap-2 text-sm text-pink-400 hover:text-pink-300 transition-colors">
              See all 67+ supported brokers <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Don&apos;t see your broker?</h2>
          <p className="mt-3 text-[var(--muted-foreground)]">
            Email <a href="mailto:ops@tradia.app" className="text-pink-400 hover:text-pink-300">ops@tradia.app</a> with a sample export. We aim to add new formats within 48 hours.
          </p>
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
