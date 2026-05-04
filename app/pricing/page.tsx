'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Calendar, CheckCircle, ArrowRight, Check, X, ChevronDown, Upload, Search, TrendingUp, AlertTriangle, Activity } from 'lucide-react';
import { useState } from 'react';
import LandingNav from '@/components/landing/LandingNav';
import Pricing from '@/components/landing/Pricing';
import Footer from '@/components/landing/Footer';

const TIMELINE = [
  {
    day: 'Day 1',
    title: 'Upload your first trades',
    desc: 'Connect any of 67+ brokers via CSV or API. Auto-detected and normalized in under 60 seconds.',
    Mock: Day1Mock,
  },
  {
    day: 'Day 3',
    title: 'See your costliest leaks',
    desc: 'The verdict engine has now ranked every costly pattern by dollar impact. Bleeding patterns surfaced.',
    Mock: Day3Mock,
  },
  {
    day: 'Day 7',
    title: 'Set rules, track compliance',
    desc: 'Define a personal playbook. Compliance auto-tracked on every new trade. Discipline is now measurable.',
    Mock: Day7Mock,
  },
];

const COMPARISON = {
  features: [
    { cat: 'Core',         f: 'Trade imports', free: '50 / mo',  pro: 'Unlimited', team: 'Unlimited', elite: 'Unlimited' },
    { cat: 'Core',         f: 'Broker support', free: 'CSV only', pro: '67+ brokers', team: '67+ brokers', elite: '67+ brokers' },
    { cat: 'Core',         f: 'Strategies',     free: '3',        pro: 'Unlimited', team: 'Unlimited', elite: 'Unlimited' },
    { cat: 'Analytics',    f: 'Verdict detectors', free: '5',     pro: '28+',       team: '28+',      elite: '28+' },
    { cat: 'Analytics',    f: 'Performance metrics', free: '10', pro: '50+',       team: '50+',      elite: '50+' },
    { cat: 'Analytics',    f: 'What-if simulator', free: false, pro: true,        team: true,       elite: true },
    { cat: 'Discipline',   f: 'Discipline score',  free: false, pro: true,        team: true,       elite: true },
    { cat: 'Discipline',   f: 'Custom playbook rules', free: false, pro: true,    team: true,       elite: true },
    { cat: 'Discipline',   f: 'Behavior analysis',  free: false, pro: true,        team: true,       elite: true },
    { cat: 'Team',         f: 'Multi-trader workspace', free: false, pro: false, team: true,       elite: true },
    { cat: 'Team',         f: 'Coach review tools',  free: false, pro: false,    team: true,       elite: true },
    { cat: 'Support',      f: 'Priority support',  free: false, pro: false,      team: true,       elite: true },
    { cat: 'Support',      f: 'Dedicated CSM',     free: false, pro: false,      team: false,      elite: true },
  ],
};

const FAQ = [
  { q: 'Do I need a credit card to start the trial?', a: 'No. The 14-day free trial is genuinely no-card. You only enter payment details if you decide to continue after the trial ends.' },
  { q: 'What happens after my trial?',                a: 'You drop to the Free plan automatically — no surprise charges. Your data is preserved. You can upgrade any time.' },
  { q: 'Can I cancel anytime?',                       a: 'Yes. One click in Settings → Subscription. No retention calls, no questions asked. You keep access until the end of the billing period.' },
  { q: 'Do you support my broker?',                   a: 'Probably yes — we cover 67+ brokers via CSV/XLSX and 5 native API integrations. If we don\'t, email ops@tradia.app and we add new formats within 48 hours.' },
  { q: 'Is my trade data safe?',                      a: 'API keys are read-only by design. Tradia never holds funds, never executes orders. Hosted in Europe under GDPR with isolated background tasks.' },
  { q: 'Do you offer refunds?',                       a: 'If you cancel within 7 days of your first paid charge, we refund in full. After that, we prorate to the end of the billing period.' },
];

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <LandingNav />

      <Pricing />

      {/* Feature comparison matrix */}
      <section className="py-16 sm:py-20 border-t border-[var(--border)]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.5 }}
            className="text-center mb-10"
          >
            <span className="text-[11px] font-bold tracking-[0.2em] uppercase bg-gradient-to-r from-teal-400 to-cyan-400 bg-clip-text text-transparent">Compare</span>
            <h2 className="mt-3 text-3xl sm:text-4xl font-bold tracking-tight">
              What&apos;s included on{' '}
              <span className="bg-gradient-to-r from-teal-400 to-emerald-400 bg-clip-text text-transparent">each tier</span>
            </h2>
          </motion.div>

          <ComparisonMatrix />
        </div>
      </section>

      {/* First Week Timeline with mocks */}
      <section className="py-16 sm:py-20 border-t border-[var(--border)] bg-[var(--card)]/20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.5 }}
            className="text-center mb-12"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[var(--border)] bg-[var(--card)] text-[10px] font-bold uppercase tracking-widest text-teal-400 mb-3">
              <Calendar size={12} /> Your first week
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
              From signup to{' '}
              <span className="bg-gradient-to-r from-teal-400 to-emerald-400 bg-clip-text text-transparent">measurable improvement</span>
            </h2>
            <p className="mt-3 text-[var(--muted-foreground)] max-w-xl mx-auto">
              The fastest path from &quot;I just signed up&quot; to &quot;I know exactly what&apos;s costing me money.&quot;
            </p>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {TIMELINE.map((t, i) => {
              const Mock = t.Mock;
              return (
                <motion.div
                  key={t.day}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-100px' }}
                  transition={{ duration: 0.4, delay: i * 0.1 }}
                  className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5"
                >
                  <div className="text-[10px] font-bold uppercase tracking-widest text-teal-400 mb-2">{t.day}</div>
                  <h3 className="text-base font-bold mb-2">{t.title}</h3>
                  <p className="text-xs text-[var(--muted-foreground)] leading-relaxed mb-4">{t.desc}</p>
                  <div className="rounded-xl border border-[var(--border)] bg-black/30 p-3 min-h-[200px]">
                    <Mock />
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 sm:py-20 border-t border-[var(--border)]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.5 }}
            className="text-center mb-10"
          >
            <span className="text-[11px] font-bold tracking-[0.2em] uppercase bg-gradient-to-r from-teal-400 to-cyan-400 bg-clip-text text-transparent">FAQ</span>
            <h2 className="mt-3 text-3xl sm:text-4xl font-bold tracking-tight">Pricing questions</h2>
          </motion.div>
          <div className="space-y-3">
            {FAQ.map((f, i) => <FAQItem key={f.q} q={f.q} a={f.a} idx={i} />)}
          </div>
        </div>
      </section>

      {/* Trial CTA */}
      <section className="py-16 sm:py-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.5 }}
            className="rounded-3xl border border-teal-500/20 bg-gradient-to-br from-teal-500/5 via-emerald-500/5 to-cyan-500/5 p-10 sm:p-14 text-center"
          >
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
              14-day free trial on{' '}
              <span className="bg-gradient-to-r from-teal-400 to-emerald-400 bg-clip-text text-transparent">every plan</span>
            </h2>
            <ul className="mt-6 space-y-2 max-w-md mx-auto text-left">
              {['No credit card required', 'Full Pro access for 14 days', 'Cancel anytime — one click'].map(item => (
                <li key={item} className="flex items-center gap-2 text-sm">
                  <CheckCircle size={16} className="text-emerald-400 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
            <Link
              href="/sign-up"
              className="inline-flex items-center gap-2 mt-8 px-6 py-3.5 rounded-xl text-sm font-semibold text-slate-900 bg-gradient-to-r from-teal-300 to-cyan-300 hover:from-teal-200 hover:to-cyan-200 shadow-[0_0_30px_-4px_rgba(45,212,191,0.5)] transition-all"
            >
              Start Free Trial
              <ArrowRight size={16} />
            </Link>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
}

/* ──────────────── Comparison Matrix ──────────────── */
function ComparisonMatrix() {
  const tiers = ['Free', 'Pro', 'Team', 'Elite'] as const;
  type Tier = typeof tiers[number];
  const tierKey = { Free: 'free', Pro: 'pro', Team: 'team', Elite: 'elite' } as const;
  const cell = (v: string | boolean) => {
    if (v === true) return <Check size={14} className="text-emerald-400 mx-auto" />;
    if (v === false) return <X size={14} className="text-[var(--muted-foreground)]/40 mx-auto" />;
    return <span className="text-xs text-[var(--foreground)] tabular-nums">{v}</span>;
  };
  const cats = Array.from(new Set(COMPARISON.features.map(f => f.cat)));
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] overflow-hidden">
      <div className="grid grid-cols-[1.4fr_repeat(4,1fr)] border-b border-[var(--border)] bg-black/20">
        <div className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-[var(--muted-foreground)]">Feature</div>
        {tiers.map(t => (
          <div key={t} className={`px-4 py-3 text-center text-[10px] font-bold uppercase tracking-widest ${
            t === 'Pro' ? 'text-teal-400 bg-teal-500/5' : 'text-[var(--muted-foreground)]'
          }`}>{t}</div>
        ))}
      </div>
      {cats.map(cat => (
        <div key={cat}>
          <div className="px-4 py-2 text-[9px] font-bold uppercase tracking-widest text-[var(--muted-foreground)]/70 bg-black/20 border-y border-[var(--border)]">
            {cat}
          </div>
          {COMPARISON.features.filter(f => f.cat === cat).map((f, i) => (
            <div key={f.f} className={`grid grid-cols-[1.4fr_repeat(4,1fr)] items-center ${i % 2 ? 'bg-black/10' : ''}`}>
              <div className="px-4 py-2.5 text-xs text-[var(--foreground)]">{f.f}</div>
              {tiers.map(t => {
                const k = tierKey[t];
                return (
                  <div key={t} className={`px-4 py-2.5 text-center ${t === 'Pro' ? 'bg-teal-500/[0.03]' : ''}`}>
                    {cell(f[k as keyof typeof f] as string | boolean)}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

/* ──────────────── Day 1 Mock ──────────────── */
function Day1Mock() {
  return (
    <div className="space-y-2">
      <div className="text-[8px] font-bold uppercase tracking-widest text-teal-400/80 flex items-center gap-1">
        <Upload size={9} /> Importing
      </div>
      <div className="rounded-md border-2 border-dashed border-teal-500/30 bg-teal-500/5 p-3 text-center">
        <Upload size={16} className="text-teal-400 mx-auto mb-1" />
        <div className="text-[9px] font-bold text-[var(--foreground)]">trades_q4.csv</div>
        <div className="text-[7px] text-[var(--muted-foreground)]">2.4 MB · 386 trades</div>
      </div>
      <div className="space-y-1">
        {['Detected: Binance Futures', 'Normalizing 386 fills', 'Computing metrics', 'Dashboard ready'].map((s, i) => (
          <div key={s} className="flex items-center gap-1.5 text-[8px]">
            <CheckCircle size={9} className="text-emerald-400" />
            <span className="text-[var(--foreground)]">{s}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ──────────────── Day 3 Mock ──────────────── */
function Day3Mock() {
  const leaks = [
    { n: 'Revenge Trading',    c: '−$1,420', p: 100 },
    { n: 'Oversized Position', c: '−$890',  p: 63 },
    { n: 'FOMO Entries',       c: '−$540',  p: 38 },
    { n: 'Late Session',       c: '−$280',  p: 20 },
  ];
  return (
    <div className="space-y-2">
      <div className="text-[8px] font-bold uppercase tracking-widest text-rose-400/80 flex items-center gap-1">
        <AlertTriangle size={9} /> Verdicts ranked
      </div>
      {leaks.map((l, i) => (
        <div key={l.n} className="space-y-0.5">
          <div className="flex items-center justify-between text-[9px]">
            <span className="text-[var(--foreground)] font-medium">{l.n}</span>
            <span className="text-rose-400 tabular-nums font-bold">{l.c}</span>
          </div>
          <div className="h-1 rounded-full bg-white/5 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              whileInView={{ width: `${l.p}%` }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.08 * i }}
              className="h-full bg-gradient-to-r from-rose-500 to-orange-400"
            />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ──────────────── Day 7 Mock ──────────────── */
function Day7Mock() {
  return (
    <div className="space-y-2.5">
      <div className="text-[8px] font-bold uppercase tracking-widest text-emerald-400/80 flex items-center gap-1">
        <TrendingUp size={9} /> Discipline trend
      </div>
      <div className="grid grid-cols-4 gap-1">
        {[42, 58, 71, 84].map((v, i) => (
          <div key={i} className="text-center">
            <div className="h-12 flex items-end">
              <motion.div
                initial={{ height: 0 }}
                whileInView={{ height: `${v}%` }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.1 * i }}
                className="w-full rounded-sm bg-gradient-to-t from-emerald-500 to-teal-400"
              />
            </div>
            <div className="text-[7px] text-[var(--muted-foreground)] mt-0.5">W{i+1}</div>
            <div className="text-[8px] font-bold text-emerald-300 tabular-nums">{v}</div>
          </div>
        ))}
      </div>
      <div className="rounded bg-emerald-500/10 border border-emerald-500/20 p-1.5">
        <div className="flex items-center gap-1 text-[9px] font-bold text-emerald-300">
          <Activity size={9} /> Compliance: 92%
        </div>
        <div className="text-[7px] text-[var(--muted-foreground)]">Up from 64% last month</div>
      </div>
    </div>
  );
}

/* ──────────────── FAQ Item ──────────────── */
function FAQItem({ q, a, idx }: { q: string; a: string; idx: number }) {
  const [open, setOpen] = useState(idx === 0);
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.35, delay: idx * 0.03 }}
      className="rounded-xl border border-[var(--border)] bg-[var(--card)] overflow-hidden"
    >
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-3 p-4 text-left hover:bg-[var(--muted)]/30 transition-colors"
      >
        <span className="text-sm font-bold text-[var(--foreground)]">{q}</span>
        <ChevronDown size={16} className={`text-[var(--muted-foreground)] transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <div className="px-4 pb-4 text-xs text-[var(--muted-foreground)] leading-relaxed">{a}</div>}
    </motion.div>
  );
}

/* unused import guard */
void Search;
