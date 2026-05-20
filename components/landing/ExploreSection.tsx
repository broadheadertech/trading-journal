'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { ArrowUpRight, Sparkles, Workflow, DollarSign, Plug, Users, MonitorPlay, BookOpen } from 'lucide-react';

const ITEMS = [
  { icon: Sparkles,    accent: 'from-pink-400 to-fuchsia-400',     title: 'Features',         desc: 'Leak detection, behavior scoring, playbook rules, 50+ metrics.', href: '/#features' },
  { icon: Workflow,    accent: 'from-fuchsia-400 to-pink-500',  title: 'How It Works',     desc: 'Three steps from CSV upload to measurable improvement.',         href: '/#how-it-works' },
  { icon: DollarSign,  accent: 'from-amber-400 to-orange-400',  title: 'Pricing',          desc: 'Pro $20/mo, Team $49/mo, 14-day free trial.',                    href: '/pricing' },
  { icon: Plug,        accent: 'from-fuchsia-400 to-pink-500',     title: 'Integrations',     desc: '67+ broker CSV formats and 5 live API connectors.',              href: '/integrations' },
  { icon: Users,       accent: 'from-violet-400 to-fuchsia-400', title: 'Use Cases',       desc: 'Solo traders, prop firms, coaches, risk management.',            href: '/use-cases' },
  { icon: MonitorPlay, accent: 'from-rose-400 to-pink-400',     title: 'Interactive Demo', desc: 'See the app with sample data before signing up.',                href: '/demo' },
  { icon: BookOpen,    accent: 'from-yellow-400 to-amber-400',  title: 'Trading Blog',     desc: 'Articles on psychology, mistakes, and performance improvement.', href: '/blog' },
];

export default function ExploreSection() {
  return (
    <section id="explore" className="relative py-20 sm:py-24 border-t border-[var(--border)]">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 right-1/4 w-[500px] h-[400px] bg-fuchsia-500 opacity-[0.04] rounded-full blur-[140px]" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <span className="neon-eyebrow text-[11px] font-bold tracking-[0.2em] uppercase">
            Explore
          </span>
          <h2 className="mt-3 text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight">
            Explore <span className="neon-headline">Tradia</span>
          </h2>
          <p className="mt-4 text-[var(--muted-foreground)] max-w-2xl mx-auto">
            Everything you need to know — features, pricing, integrations, and where to go next.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {ITEMS.map((it, i) => (
            <motion.div
              key={it.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-50px' }}
              transition={{ duration: 0.35, delay: i * 0.04 }}
            >
              <Link
                href={it.href}
                className="group relative block rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 hover:border-pink-500/30 transition-all overflow-hidden h-full"
              >
                <div className={`absolute -top-12 -right-12 w-32 h-32 rounded-full bg-gradient-to-br ${it.accent} opacity-[0.06] blur-2xl group-hover:opacity-[0.12] transition-opacity`} />
                <div className="relative flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${it.accent} bg-opacity-20 flex items-center justify-center shrink-0`}>
                    <it.icon size={18} className="text-slate-900" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <h3 className="text-sm font-bold text-[var(--foreground)]">{it.title}</h3>
                      <ArrowUpRight size={14} className="text-[var(--muted-foreground)] group-hover:text-pink-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
                    </div>
                    <p className="text-xs text-[var(--muted-foreground)] leading-relaxed">{it.desc}</p>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
