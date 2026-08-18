'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, DollarSign, Users, BarChart3, Gift, Mail, Link2 } from 'lucide-react';
import LandingNav from '@/components/landing/LandingNav';
import Footer from '@/components/landing/Footer';

const TIERS = [
  {
    name: 'Affiliate',
    commission: '30%',
    sub: 'Recurring, lifetime',
    perks: [
      'Personal referral link & dashboard',
      'Real-time click & conversion tracking',
      'Monthly payouts (PayPal / Wise / USDT)',
      '$50 minimum payout',
    ],
  },
  {
    name: 'Partner',
    commission: '40%',
    sub: 'After 25 paid referrals',
    perks: [
      'Higher commission tier unlocked',
      'Custom landing page & promo codes',
      'Priority affiliate support',
      'Co-marketing opportunities',
    ],
    highlighted: true,
  },
  {
    name: 'Ambassador',
    commission: '50%',
    sub: 'By invitation',
    perks: [
      'Top-tier recurring commission',
      'Direct line to founding team',
      'Exclusive content & early features',
      'Revenue-share on enterprise deals',
    ],
  },
];

const HOW = [
  { icon: Link2,     title: 'Get your link',    body: 'Sign up free, grab your unique referral link from the affiliate dashboard.' },
  { icon: Users,     title: 'Share with traders', body: 'Drop the link in Twitter, YouTube, Discord, blogs — anywhere traders gather.' },
  { icon: DollarSign, title: 'Earn recurring',   body: 'Get paid every month they stay subscribed. Lifetime commissions, no caps.' },
];

const FAQ = [
  {
    q: 'How long does the cookie last?',
    a: '90 days. If someone clicks your link and signs up within 90 days, you get credited.',
  },
  {
    q: 'When do I get paid?',
    a: 'Monthly, on the 5th of every month, for the previous month\'s validated referrals. Minimum payout is $50.',
  },
  {
    q: 'Is the commission really lifetime?',
    a: 'Yes. As long as your referral keeps their Atlas subscription active, you keep earning the commission percentage.',
  },
  {
    q: 'Can I run paid ads?',
    a: 'Yes, but not on branded keywords (e.g., "Atlas", "Atlas review"). Full guidelines in the affiliate agreement.',
  },
  {
    q: 'Do you offer custom deals for large audiences?',
    a: 'Absolutely. If you have 10K+ engaged trader followers, reach out for an Ambassador-tier conversation.',
  },
];

export default function AffiliatePage() {
  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <LandingNav />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-pink-500 opacity-[0.07] rounded-full blur-[120px]" />
        </div>
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-16 sm:pt-24 pb-10 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-pink-500/10 border border-pink-500/20 text-xs font-medium text-pink-400 mb-6"
          >
            <Gift size={12} /> Lifetime recurring commissions
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.05 }}
            className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight"
          >
            Get paid to share{' '}
            <span className="bg-gradient-to-r from-pink-400 to-pink-600 bg-clip-text text-transparent">Atlas</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="mt-5 text-base sm:text-lg text-[var(--muted-foreground)] max-w-2xl mx-auto"
          >
            Earn 30–50% recurring commission on every trader you refer. Lifetime. No caps. Monthly payouts.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.25 }}
            className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3"
          >
            <Link
              href="/sign-up"
              className="inline-flex items-center gap-2 px-6 py-3 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white rounded-xl text-sm font-medium transition-colors"
            >
              Become an Affiliate <ArrowRight size={16} />
            </Link>
            <Link
              href="#tiers"
              className="inline-flex items-center gap-2 px-6 py-3 border border-[var(--border)] text-[var(--foreground)] rounded-xl text-sm font-medium hover:bg-[var(--muted)] transition-colors"
            >
              See commission tiers
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Stats strip */}
      <section className="py-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { v: '50%', l: 'Top commission' },
              { v: '90d', l: 'Cookie window' },
              { v: '∞',   l: 'Lifetime payouts' },
              { v: '$50', l: 'Minimum payout' },
            ].map((s, i) => (
              <motion.div
                key={s.l}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-50px' }}
                transition={{ duration: 0.4, delay: i * 0.05 }}
                className="text-center rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5"
              >
                <div className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-pink-400 to-pink-600 bg-clip-text text-transparent">
                  {s.v}
                </div>
                <div className="mt-1 text-xs text-[var(--muted-foreground)]">{s.l}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">How it works</h2>
            <p className="mt-3 text-[var(--muted-foreground)]">Three steps from sign-up to your first payout.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {HOW.map((h, i) => (
              <motion.div
                key={h.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-50px' }}
                transition={{ duration: 0.4, delay: i * 0.05 }}
                className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 rounded-lg bg-pink-500/10 flex items-center justify-center">
                    <h.icon size={16} className="text-pink-400" />
                  </div>
                  <span className="text-xs font-bold uppercase tracking-widest text-[var(--muted-foreground)]">Step {i + 1}</span>
                </div>
                <h3 className="text-base font-bold text-[var(--foreground)] mb-1">{h.title}</h3>
                <p className="text-xs text-[var(--muted-foreground)] leading-relaxed">{h.body}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Tiers */}
      <section id="tiers" className="py-14">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Commission tiers</h2>
            <p className="mt-3 text-[var(--muted-foreground)]">Earn more as you grow. Tiers unlock automatically.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {TIERS.map((t, i) => (
              <motion.div
                key={t.name}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-50px' }}
                transition={{ duration: 0.4, delay: i * 0.05 }}
                className={`rounded-2xl border p-6 ${
                  t.highlighted ? 'border-pink-500/40 bg-pink-500/5' : 'border-[var(--border)] bg-[var(--card)]'
                }`}
              >
                <div className="text-xs font-bold uppercase tracking-widest text-[var(--muted-foreground)] mb-2">{t.name}</div>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-bold bg-gradient-to-r from-pink-400 to-pink-600 bg-clip-text text-transparent">
                    {t.commission}
                  </span>
                  <span className="text-xs text-[var(--muted-foreground)]">/ referral / month</span>
                </div>
                <p className="mt-1 text-xs text-[var(--muted-foreground)]">{t.sub}</p>
                <ul className="mt-5 space-y-2">
                  {t.perks.map(p => (
                    <li key={p} className="flex items-start gap-2 text-xs text-[var(--foreground)]">
                      <BarChart3 size={12} className="text-pink-400 mt-0.5 flex-shrink-0" />
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-14">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Frequently asked</h2>
          </div>
          <div className="space-y-3">
            {FAQ.map((f, i) => (
              <motion.div
                key={f.q}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-50px' }}
                transition={{ duration: 0.35, delay: i * 0.03 }}
                className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5"
              >
                <h3 className="text-sm font-bold text-[var(--foreground)] mb-1">{f.q}</h3>
                <p className="text-xs text-[var(--muted-foreground)] leading-relaxed">{f.a}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Ready to start earning?
          </h2>
          <p className="mt-3 text-[var(--muted-foreground)]">
            Free to join. Get your link in 60 seconds. Questions? <a href="mailto:affiliates@atlas.app" className="text-pink-400 hover:text-pink-300 transition-colors inline-flex items-center gap-1"><Mail size={12} /> affiliates@atlas.app</a>
          </p>
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/sign-up"
              className="inline-flex items-center gap-2 px-6 py-3 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white rounded-xl text-sm font-medium transition-colors"
            >
              Become an Affiliate <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
