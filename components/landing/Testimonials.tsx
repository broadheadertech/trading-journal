'use client';

import { motion } from 'framer-motion';

const testimonials = [
  {
    quote: 'PsychSync helped me see that my forex losses were emotion-driven. The discipline scoring changed my game completely.',
    author: 'Alex M.',
    role: 'Forex Swing Trader',
    initials: 'AM',
    color: 'from-indigo-500 to-blue-500',
  },
  {
    quote: 'I trade both crypto and stocks. PsychSync\'s AI Coach caught patterns across both markets I never noticed — my win rate improved 15% in two months.',
    author: 'Sarah K.',
    role: 'Multi-Market Day Trader',
    initials: 'SK',
    color: 'from-purple-500 to-pink-500',
  },
  {
    quote: 'The psychology journal showed me patterns across all my markets. Understanding my emotions was the missing piece to consistent profits.',
    author: 'David L.',
    role: 'Crypto Scalper',
    initials: 'DL',
    color: 'from-green-500 to-teal-500',
  },
];

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

export default function Testimonials() {
  return (
    <section className="py-20 sm:py-28">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.5 }}
          className="text-center mb-14"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-[var(--foreground)]">
            Trusted by Traders
          </h2>
          <p className="mt-4 text-[var(--muted-foreground)]">
            See what crypto, stock, and forex traders are saying about PsychSync.
          </p>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
          className="grid grid-cols-1 sm:grid-cols-3 gap-5"
        >
          {testimonials.map((t) => (
            <motion.div
              key={t.author}
              variants={itemVariants}
              className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6"
            >
              <p className="text-sm text-[var(--muted-foreground)] leading-relaxed italic">
                &ldquo;{t.quote}&rdquo;
              </p>
              <div className="flex items-center gap-3 mt-5">
                <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${t.color} flex items-center justify-center shrink-0`}>
                  <span className="text-white text-xs font-bold">{t.initials}</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-[var(--foreground)]">{t.author}</p>
                  <p className="text-xs text-[var(--muted-foreground)]">{t.role}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
