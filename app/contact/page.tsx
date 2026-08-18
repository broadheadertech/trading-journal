'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Mail, Clock, Check, X, ChevronDown } from 'lucide-react';
import { useState } from 'react';
import LandingNav from '@/components/landing/LandingNav';
import Footer from '@/components/landing/Footer';

const ROUTES = [
  { label: 'Product & onboarding',     email: 'support@atlas.app' },
  { label: 'Pricing & plans',          email: 'sales@atlas.app' },
  { label: 'Integrations & imports',   email: 'ops@atlas.app' },
  { label: 'Security & privacy',       email: 'security@atlas.app' },
];

const SCOPE = [
  'Product and workflow questions',
  'Import and integration guidance',
  'Plan and pricing questions',
  'Security and privacy requests',
  'Partnership and collaboration inquiries',
];

const OUT_OF_SCOPE = [
  'Investment advice',
  'Trade execution or signals',
  'Buy/sell recommendations',
  'Managed trading',
  'Guaranteed profitability claims',
];

const FAQ = [
  {
    q: 'How fast do you respond?',
    a: 'Standard response is typically within one business day. Pro subscribers get priority routing.',
  },
  {
    q: 'What are your support hours?',
    a: 'Monday through Friday within a UTC support window. Outside that window, expect next-business-day responses.',
  },
  {
    q: 'Do you offer phone support?',
    a: 'Email-only for now. It keeps issues searchable, traceable, and lets us route them to the right specialist.',
  },
  {
    q: 'Can I request a new broker integration?',
    a: 'Yes — email ops@atlas.app with a sample CSV/XLSX export. We aim to add new broker formats within 48 hours.',
  },
];

export default function ContactPage() {
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
            Talk to the{' '}
            <span className="bg-gradient-to-r from-pink-400 to-pink-600 bg-clip-text text-transparent">Atlas team</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="mt-5 text-base sm:text-lg text-[var(--muted-foreground)] max-w-2xl mx-auto"
          >
            Email-routed support so your question lands with the right specialist on the first try.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mt-6 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-pink-500/10 border border-pink-500/20 text-xs text-pink-400"
          >
            <Clock size={12} /> Mon–Fri, UTC business hours · Priority response for Pro subscribers
          </motion.div>
        </div>
      </section>

      <section className="py-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {ROUTES.map((r, i) => (
              <motion.a
                key={r.label}
                href={`mailto:${r.email}`}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-50px' }}
                transition={{ duration: 0.4, delay: i * 0.05 }}
                className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 hover:border-pink-500/30 transition-colors group"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-pink-500/10 flex items-center justify-center flex-shrink-0">
                    <Mail size={16} className="text-pink-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-bold text-[var(--foreground)] mb-1">{r.label}</h3>
                    <span className="text-xs text-pink-400 group-hover:text-pink-300 transition-colors break-all">{r.email}</span>
                  </div>
                </div>
              </motion.a>
            ))}
          </div>
        </div>
      </section>

      <section className="py-14">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6">
            <div className="flex items-center gap-2 mb-4">
              <Check size={16} className="text-pink-400" />
              <h2 className="text-xs font-bold uppercase tracking-widest text-[var(--muted-foreground)]">What we can help with</h2>
            </div>
            <ul className="space-y-2">
              {SCOPE.map(s => (
                <li key={s} className="flex items-start gap-2 text-sm text-[var(--foreground)]">
                  <Check size={14} className="text-pink-400 mt-0.5 flex-shrink-0" />
                  {s}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6">
            <div className="flex items-center gap-2 mb-4">
              <X size={16} className="text-[var(--muted-foreground)]" />
              <h2 className="text-xs font-bold uppercase tracking-widest text-[var(--muted-foreground)]">Outside our scope</h2>
            </div>
            <ul className="space-y-2">
              {OUT_OF_SCOPE.map(s => (
                <li key={s} className="flex items-start gap-2 text-sm text-[var(--muted-foreground)]">
                  <X size={14} className="text-[var(--muted-foreground)] mt-0.5 flex-shrink-0" />
                  {s}
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
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Or just start the trial</h2>
          <p className="mt-3 text-[var(--muted-foreground)]">Most product questions get answered faster by the app itself.</p>
          <Link href="/sign-up" className="inline-flex items-center gap-2 mt-6 px-6 py-3 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white rounded-xl text-sm font-medium transition-colors">
            Start Free Trial
          </Link>
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
