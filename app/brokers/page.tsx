'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, CheckCircle2, ShieldCheck, Zap } from 'lucide-react';
import LandingNav from '@/components/landing/LandingNav';
import Footer from '@/components/landing/Footer';

const BROKER_GROUPS = [
  {
    title: 'Crypto Exchanges',
    items: [
      'Binance', 'Bybit', 'OKX', 'Coinbase', 'Kraken', 'KuCoin',
      'Bitget', 'Gate.io', 'MEXC', 'Bitfinex', 'Crypto.com', 'HTX',
    ],
  },
  {
    title: 'Forex / CFD',
    items: [
      'MetaTrader 4', 'MetaTrader 5', 'cTrader', 'IC Markets', 'Pepperstone',
      'OANDA', 'Forex.com', 'FXCM', 'IG', 'Saxo Bank', 'XM', 'FxPro',
    ],
  },
  {
    title: 'Stocks / Futures',
    items: [
      'Interactive Brokers', 'TD Ameritrade', 'TradeStation', 'NinjaTrader',
      'Tradovate', 'Webull', 'eToro', 'Robinhood', 'ThinkorSwim', 'Tastytrade',
      'AMP Futures', 'Charles Schwab',
    ],
  },
  {
    title: 'Prop Firms',
    items: [
      'FTMO', 'MyForexFunds', 'Apex Trader Funding', 'Topstep', 'Earn2Trade',
      'The Funded Trader', 'E8 Funding', 'FundedNext', 'OFP', 'TrueForexFunds',
    ],
  },
];

const FEATURES = [
  {
    icon: ShieldCheck,
    title: 'Read-only API keys',
    body: 'We never request withdrawal permissions. Your funds stay where they are.',
  },
  {
    icon: Zap,
    title: 'Auto-sync trades',
    body: 'Trades flow into Tradia within seconds of close. No manual logging.',
  },
  {
    icon: CheckCircle2,
    title: 'CSV fallback',
    body: 'No API? Upload a CSV from any broker — Tradia auto-detects the format.',
  },
];

export default function BrokersPage() {
  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <LandingNav />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-teal-500 opacity-[0.07] rounded-full blur-[120px]" />
        </div>
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-16 sm:pt-24 pb-10 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/10 border border-teal-500/20 text-xs font-medium text-teal-400 mb-6"
          >
            <ShieldCheck size={12} /> 67+ supported brokers & exchanges
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.05 }}
            className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight"
          >
            Connect every broker you{' '}
            <span className="bg-gradient-to-r from-teal-400 to-teal-600 bg-clip-text text-transparent">already trade on</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="mt-5 text-base sm:text-lg text-[var(--muted-foreground)] max-w-2xl mx-auto"
          >
            Crypto, forex, stocks, futures, prop firms — Tradia speaks the language of every major broker. Read-only, secure, and instant.
          </motion.p>
        </div>
      </section>

      {/* Trust features */}
      <section className="py-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {FEATURES.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-50px' }}
                transition={{ duration: 0.4, delay: i * 0.05 }}
                className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6"
              >
                <div className="w-9 h-9 rounded-lg bg-teal-500/10 flex items-center justify-center mb-3">
                  <f.icon size={16} className="text-teal-400" />
                </div>
                <h3 className="text-sm font-bold text-[var(--foreground)] mb-1">{f.title}</h3>
                <p className="text-xs text-[var(--muted-foreground)] leading-relaxed">{f.body}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Broker groups */}
      <section className="py-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 space-y-10">
          {BROKER_GROUPS.map((group, gi) => (
            <motion.div
              key={group.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-50px' }}
              transition={{ duration: 0.4, delay: gi * 0.05 }}
            >
              <h2 className="text-xs font-bold uppercase tracking-widest text-[var(--muted-foreground)] mb-4">
                {group.title}
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {group.items.map(name => (
                  <div
                    key={name}
                    className="rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-3 text-sm font-medium text-[var(--foreground)] hover:border-teal-500/30 transition-colors"
                  >
                    {name}
                  </div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Don&apos;t see your broker?
          </h2>
          <p className="mt-3 text-[var(--muted-foreground)]">
            CSV import works with any broker. We add new native integrations every month — request yours.
          </p>
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/sign-up"
              className="inline-flex items-center gap-2 px-6 py-3 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white rounded-xl text-sm font-medium transition-colors"
            >
              Start Free Trial <ArrowRight size={16} />
            </Link>
            <Link
              href="/demo"
              className="inline-flex items-center gap-2 px-6 py-3 border border-[var(--border)] text-[var(--foreground)] rounded-xl text-sm font-medium hover:bg-[var(--muted)] transition-colors"
            >
              See Demo
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
