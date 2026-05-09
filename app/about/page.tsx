'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, Target, Eye, Shield, Globe, Users, ChevronDown } from 'lucide-react';
import { useState } from 'react';
import LandingNav from '@/components/landing/LandingNav';
import Footer from '@/components/landing/Footer';

const PILLARS = [
  {
    icon: Eye,
    title: 'Make trading review measurable',
    body: 'Tradia turns raw trade history into evidence — costly patterns ranked by dollar impact, discipline tracked week over week, rule compliance scored trade by trade.',
  },
  {
    icon: Target,
    title: 'Behavioral, not advisory',
    body: 'We don\'t hand out signals or pick trades. We measure what already happened and quantify the gap between your plan and your execution.',
  },
  {
    icon: Shield,
    title: 'Read-only by design',
    body: 'Tradia never holds funds, never executes orders, never asks for withdrawal permissions. Analytics-only is a hard product boundary, not a marketing line.',
  },
  {
    icon: Globe,
    title: 'Privacy-first infrastructure',
    body: 'Hosted in Europe under GDPR. Idempotent imports, scoped data usage, isolated background tasks — engineered to be the safest place your trade history can live.',
  },
];

const FOR = [
  'Active traders — crypto, futures, forex, stocks, options',
  'Prop firm traders working toward funded accounts',
  'Trading coaches reviewing student performance',
  'Trading teams enforcing playbook discipline at scale',
];

const NOT_FOR = [
  'Auto-trading or copy-trading',
  'Buy/sell signals or trade picks',
  'Guaranteed-profit promises',
  'Broker, execution, or custody services',
];

const FAQ = [
  {
    q: 'Who built Tradia?',
    a: 'A small team of traders and engineers tired of journals that were either pretty notebooks or unreadable spreadsheets. We built the tool we wanted to use ourselves.',
  },
  {
    q: 'Where is your infrastructure hosted?',
    a: 'Europe, under GDPR. We use scoped data access, idempotent import pipelines, and isolated background tasks for verdict generation.',
  },
  {
    q: 'Do you ever execute trades?',
    a: 'No. Tradia is analytics software. It reads trade history; it does not submit, modify, or cancel orders.',
  },
  {
    q: 'What markets do you support?',
    a: 'Crypto spot, crypto perp futures, forex, equities, options, and futures — across 67+ brokers via CSV, XLSX, or live API.',
  },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <LandingNav />

      <section className="relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-pink-500 opacity-[0.07] rounded-full blur-[120px]" />
        </div>
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 pt-16 sm:pt-24 pb-10 text-center">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight"
          >
            Built to make trading review{' '}
            <span className="bg-gradient-to-r from-pink-400 to-pink-600 bg-clip-text text-transparent">measurable</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="mt-5 text-base sm:text-lg text-[var(--muted-foreground)] max-w-2xl mx-auto"
          >
            Tradia exists because most traders never see the dollar cost of their own behavior. We built the platform to fix that — and to make discipline something you can prove, not something you hope you have.
          </motion.p>
        </div>
      </section>

      <section className="py-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {PILLARS.map((p, i) => (
              <motion.div
                key={p.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-50px' }}
                transition={{ duration: 0.4, delay: i * 0.05 }}
                className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6"
              >
                <div className="w-10 h-10 rounded-xl bg-pink-500/10 flex items-center justify-center mb-3">
                  <p.icon size={18} className="text-pink-400" />
                </div>
                <h3 className="text-base font-bold text-[var(--foreground)] mb-2">{p.title}</h3>
                <p className="text-sm text-[var(--muted-foreground)] leading-relaxed">{p.body}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-14">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6">
            <div className="flex items-center gap-2 mb-4">
              <Users size={16} className="text-pink-400" />
              <h2 className="text-xs font-bold uppercase tracking-widest text-[var(--muted-foreground)]">Who Tradia is for</h2>
            </div>
            <ul className="space-y-2">
              {FOR.map(item => (
                <li key={item} className="text-sm text-[var(--foreground)] flex items-start gap-2">
                  <span className="text-pink-400 mt-0.5">·</span>{item}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6">
            <div className="flex items-center gap-2 mb-4">
              <Target size={16} className="text-pink-400" />
              <h2 className="text-xs font-bold uppercase tracking-widest text-[var(--muted-foreground)]">Outside our scope</h2>
            </div>
            <ul className="space-y-2">
              {NOT_FOR.map(item => (
                <li key={item} className="text-sm text-[var(--muted-foreground)] flex items-start gap-2">
                  <span className="text-[var(--muted-foreground)] mt-0.5">·</span>{item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="py-14">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-center mb-10">Frequently asked</h2>
          <div className="space-y-3">
            {FAQ.map((f, i) => <FAQItem key={f.q} q={f.q} a={f.a} idx={i} />)}
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">See your own dashboard</h2>
          <p className="mt-3 text-[var(--muted-foreground)]">14-day free trial. No credit card. Setup in 60 seconds.</p>
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

function FAQItem({ q, a, idx }: { q: string; a: string; idx: number }) {
  const [open, setOpen] = useState(idx === 0);
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.35, delay: idx * 0.03 }}
      className="rounded-2xl border border-[var(--border)] bg-[var(--card)] overflow-hidden"
    >
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-3 p-5 text-left hover:bg-[var(--muted)]/30 transition-colors"
      >
        <span className="text-sm font-bold text-[var(--foreground)]">{q}</span>
        <ChevronDown size={16} className={`text-[var(--muted-foreground)] transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <div className="px-5 pb-5 text-xs text-[var(--muted-foreground)] leading-relaxed">{a}</div>}
    </motion.div>
  );
}
