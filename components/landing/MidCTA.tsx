'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export default function MidCTA() {
  return (
    <section className="relative py-20 sm:py-24">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] bg-pink-500 opacity-[0.05] rounded-full blur-[140px]" />
      </div>

      <div className="relative max-w-5xl mx-auto px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.5 }}
          className="relative rounded-3xl border border-pink-500/20 bg-gradient-to-br from-pink-500/5 via-emerald-500/5 to-fuchsia-500/5 p-10 sm:p-14 text-center overflow-hidden"
        >
          {/* Inner glow */}
          <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-[400px] h-[200px] bg-pink-400 opacity-[0.08] rounded-full blur-[80px]" />
          {/* Grid backdrop */}
          <div className="absolute inset-0 opacity-[0.04]" style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }} />

          <div className="relative">
            <span className="text-[11px] font-bold tracking-[0.2em] uppercase bg-gradient-to-r from-pink-400 to-fuchsia-400 bg-clip-text text-transparent">
              Stop Repeating
            </span>
            <h2 className="mt-3 text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight leading-tight">
              Your next trade doesn&apos;t have to{' '}
              <span className="bg-gradient-to-r from-pink-400 to-fuchsia-400 bg-clip-text text-transparent">repeat the same mistake</span>
            </h2>
            <p className="mt-4 text-base text-[var(--muted-foreground)] max-w-2xl mx-auto">
              Upload your trades. See the dollar cost of every pattern. Fix the biggest one first.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href="/sign-up"
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl text-sm font-semibold text-slate-900 bg-gradient-to-r from-orange-400 to-amber-400 hover:from-orange-300 hover:to-amber-300 shadow-[0_0_30px_-4px_rgba(251,146,60,0.6)] transition-all"
              >
                Start Free Trial
                <ArrowRight size={16} />
              </Link>
              <Link
                href="/demo"
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl text-sm font-semibold text-[var(--foreground)] bg-[var(--card)] border border-[var(--border)] hover:bg-[var(--muted)]/50 transition-colors"
              >
                See Demo First
              </Link>
            </div>

            <p className="mt-5 text-xs text-[var(--muted-foreground)]">
              14 days free Â· No credit card Â· Setup in 60 seconds
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
