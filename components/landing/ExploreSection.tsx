'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { ArrowRight, Sparkles, Workflow, DollarSign, Plug, Users, MonitorPlay, BookOpen } from 'lucide-react';

const ITEMS = [
  { icon: Sparkles,     title: 'Features',         desc: 'Leak detection, behavior scoring, playbook rules, 50+ metrics.',                   href: '#features' },
  { icon: Workflow,     title: 'How It Works',     desc: 'Three steps from CSV upload to measurable improvement.',                          href: '#how-it-works' },
  { icon: DollarSign,   title: 'Pricing',          desc: 'Pro $20/mo, Team $49/mo, 14-day free trial.',                                      href: '#pricing' },
  { icon: Plug,         title: 'Integrations',     desc: '67+ broker CSV formats and 5 live API connectors.',                               href: '#features' },
  { icon: Users,        title: 'Use Cases',        desc: 'Solo traders, prop firms, coaches, risk management.',                             href: '#features' },
  { icon: MonitorPlay,  title: 'Interactive Demo', desc: 'See the app with sample data before signing up.',                                 href: '/sign-up' },
  { icon: BookOpen,     title: 'Trading Blog',     desc: 'Articles on psychology, mistakes, and performance improvement.',                  href: '/app' },
];

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35 } },
};

export default function ExploreSection() {
  return (
    <section id="explore" className="py-20 sm:py-24">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-[var(--foreground)] tracking-tight">
            Explore <span className="bg-gradient-to-r from-teal-400 to-teal-600 bg-clip-text text-transparent">Tradia</span>
          </h2>
          <p className="mt-4 text-[var(--muted-foreground)] max-w-xl mx-auto">
            Everything you need to know — features, pricing, integrations, and where to go next.
          </p>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          {ITEMS.map((it) => {
            const Icon = it.icon;
            return (
              <motion.div key={it.title} variants={itemVariants}>
                <Link
                  href={it.href}
                  className="group block rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 hover:border-teal-500/30 transition-colors h-full"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500/20 to-teal-700/10 border border-teal-500/20 flex items-center justify-center shrink-0">
                      <Icon size={18} className="text-teal-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="text-sm font-bold text-[var(--foreground)]">{it.title}</h3>
                        <ArrowRight size={14} className="text-[var(--muted-foreground)] group-hover:text-teal-400 group-hover:translate-x-0.5 transition-all" />
                      </div>
                      <p className="text-xs text-[var(--muted-foreground)] mt-1 leading-relaxed">{it.desc}</p>
                    </div>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
