'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export default function MidCTA() {
  return (
    <section className="py-20 sm:py-24">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.5 }}
          className="rounded-3xl border border-[var(--accent)]/20 bg-gradient-to-br from-teal-500/5 via-teal-700/5 to-emerald-500/5 p-10 sm:p-14 text-center"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-[var(--foreground)] tracking-tight">
            Your next trade doesn&apos;t have to{' '}
            <span className="bg-gradient-to-r from-teal-400 to-teal-600 bg-clip-text text-transparent">repeat the same mistake</span>
          </h2>
          <p className="mt-4 text-[var(--muted-foreground)] max-w-2xl mx-auto">
            Upload your trades. See the dollar cost of every pattern. Fix the biggest one first.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/sign-up"
              className="inline-flex items-center gap-2 px-6 py-3 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white rounded-xl text-sm font-medium transition-colors"
            >
              Start Free Trial
              <ArrowRight size={16} />
            </Link>
            <a
              href="#features"
              className="inline-flex items-center gap-2 px-6 py-3 border border-[var(--border)] text-[var(--foreground)] rounded-xl text-sm font-medium hover:bg-[var(--muted)] transition-colors"
            >
              See Demo First
            </a>
          </div>

          <p className="mt-6 text-xs text-[var(--muted-foreground)]">
            14 days free · No credit card · Setup in 60 seconds
          </p>
        </motion.div>
      </div>
    </section>
  );
}
