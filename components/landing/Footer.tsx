'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import BrainMascot from '@/components/BrainMascot';

export default function Footer() {
  return (
    <footer>
      {/* CTA Banner */}
      <section className="py-20 sm:py-24">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.5 }}
            className="rounded-2xl border border-[var(--accent)]/20 bg-gradient-to-br from-teal-500/5 to-teal-700/5 p-10 sm:p-14 text-center"
          >
            <h2 className="text-2xl sm:text-3xl font-bold text-[var(--foreground)]">
              Ready to Level Up Your Trading?
            </h2>
            <p className="mt-3 text-[var(--muted-foreground)] max-w-md mx-auto">
              Join traders who are building discipline and consistency. Start for free, no credit card required.
            </p>
            <Link
              href="/sign-up"
              className="inline-flex items-center gap-2 mt-6 px-6 py-3 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white rounded-xl text-sm font-medium transition-colors"
            >
              Get Started Free
              <ArrowRight size={16} />
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Footer links */}
      <div className="border-t border-[var(--border)] py-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <BrainMascot size={24} />
              <span className="text-sm font-semibold bg-gradient-to-r from-teal-400 to-teal-600 bg-clip-text text-transparent">Tradia</span>
            </div>

            <div className="flex items-center gap-6 text-xs text-[var(--muted-foreground)]">
              <a href="#features" className="hover:text-[var(--foreground)] transition-colors">Features</a>
              <a href="#pricing" className="hover:text-[var(--foreground)] transition-colors">Pricing</a>
              <span className="opacity-50">Terms</span>
              <span className="opacity-50">Privacy</span>
            </div>

            <p className="text-xs text-[var(--muted-foreground)]">
              &copy; 2026 Tradia. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
