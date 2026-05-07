'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, Lock, Eye, ShieldOff, Database, Layers, Repeat, FileSearch, KeyRound } from 'lucide-react';
import LandingNav from '@/components/landing/LandingNav';
import Footer from '@/components/landing/Footer';

const PILLARS = [
  {
    icon: Lock,
    title: 'Read-only account access',
    body: 'Use read-only credentials wherever connectors require them. Tradia is designed for post-trade data retrieval only.',
  },
  {
    icon: ShieldOff,
    title: 'No order execution path',
    body: 'The platform is analytics software. It does not submit, modify, or cancel orders â€” there is no code path that could.',
  },
  {
    icon: Eye,
    title: 'Scoped data usage',
    body: 'Imported payloads are used for normalization, analytics, and verdict generation only. Nothing else, nowhere else.',
  },
  {
    icon: Layers,
    title: 'Background task isolation',
    body: 'Import, aggregate, and verdict computations run via service/task boundaries to reduce request-layer risk.',
  },
  {
    icon: Repeat,
    title: 'Idempotent imports',
    body: 'Deterministic hashes prevent duplicate trade creation during reruns and recovery. Re-importing the same file is always safe.',
  },
  {
    icon: FileSearch,
    title: 'Operational visibility',
    body: 'Import logs track statuses, counters, and errors to support incident response and reproducibility.',
  },
];

const SETUP = [
  'Create dedicated exchange API keys for analytics only',
  'Disable trading and withdrawal permissions on those keys',
  'Rotate keys when access policies or account ownership changes',
  'Enable account-level MFA and exchange-side IP allowlists where available',
];

export default function SecurityPage() {
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
            <Lock size={12} /> Read-only & analytics-only
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.05 }}
            className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight"
          >
            Read-only analytics with explicit{' '}
            <span className="bg-gradient-to-r from-pink-400 to-pink-600 bg-clip-text text-transparent">non-trading boundaries</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="mt-5 text-base sm:text-lg text-[var(--muted-foreground)] max-w-2xl mx-auto"
          >
            Tradia never holds funds, executes orders, or asks for withdrawal access. Here&apos;s how the platform is engineered to keep your trade history safe.
          </motion.p>
        </div>
      </section>

      <section className="py-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {PILLARS.map((p, i) => (
              <motion.div
                key={p.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-50px' }}
                transition={{ duration: 0.4, delay: i * 0.04 }}
                className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6"
              >
                <div className="w-10 h-10 rounded-xl bg-pink-500/10 flex items-center justify-center mb-3">
                  <p.icon size={18} className="text-pink-400" />
                </div>
                <h3 className="text-base font-bold text-[var(--foreground)] mb-2">{p.title}</h3>
                <p className="text-xs text-[var(--muted-foreground)] leading-relaxed">{p.body}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-14">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-8">
            <div className="flex items-center gap-2 mb-5">
              <KeyRound size={16} className="text-pink-400" />
              <h2 className="text-xs font-bold uppercase tracking-widest text-[var(--muted-foreground)]">Recommended account setup</h2>
            </div>
            <ul className="space-y-3">
              {SETUP.map(s => (
                <li key={s} className="flex items-start gap-3 text-sm text-[var(--foreground)]">
                  <Database size={14} className="text-pink-400 mt-0.5 flex-shrink-0" />
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Questions about security?</h2>
          <p className="mt-3 text-[var(--muted-foreground)]">
            Reach our security team at <a href="mailto:security@tradia.app" className="text-pink-400 hover:text-pink-300">security@tradia.app</a> â€” or start with no commitment.
          </p>
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/sign-up" className="inline-flex items-center gap-2 px-6 py-3 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white rounded-xl text-sm font-medium transition-colors">
              Start Free Trial <ArrowRight size={16} />
            </Link>
            <Link href="/contact" className="inline-flex items-center gap-2 px-6 py-3 border border-[var(--border)] text-[var(--foreground)] rounded-xl text-sm font-medium hover:bg-[var(--muted)] transition-colors">
              Contact Us
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
