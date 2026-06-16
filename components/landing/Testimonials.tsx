'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Quote } from 'lucide-react';
import AtmosphericBackground from './AtmosphericBackground';

// Round-robin avatar gradients — keeps the grid visually varied without
// hand-coding a color per testimonial.
const AVATAR_GRADIENTS = [
  'from-pink-500 to-fuchsia-500',
  'from-fuchsia-500 to-purple-500',
  'from-purple-500 to-blue-500',
  'from-blue-500 to-cyan-500',
  'from-cyan-500 to-emerald-500',
  'from-emerald-500 to-green-500',
  'from-amber-500 to-orange-500',
  'from-orange-500 to-rose-500',
  'from-rose-500 to-pink-500',
  'from-pink-500 to-purple-500',
  'from-cyan-500 to-blue-500',
  'from-fuchsia-500 to-pink-500',
];

type Testimonial = { quote: string; author: string; role: string; initials: string };

const testimonials: Testimonial[] = [
  { quote: 'Tradia helped me see that my forex losses were emotion-driven. The discipline scoring changed my game completely.', author: 'Alex M.', role: 'Forex Swing Trader', initials: 'AM' },
  { quote: "I trade both crypto and stocks. The AI Coach caught patterns across both markets I never noticed — my win rate improved 15% in two months.", author: 'Sarah K.', role: 'Multi-Market Day Trader', initials: 'SK' },
  { quote: 'The psychology journal showed me patterns across all my markets. Understanding my emotions was the missing piece.', author: 'David L.', role: 'Crypto Scalper', initials: 'DL' },
  { quote: 'Found out 40% of my losses came from trades I opened within an hour of waking up. Stopped trading mornings — fixed it in two weeks.', author: 'Miguel R.', role: 'Futures Day Trader', initials: 'MR' },
  { quote: 'Revenge trades after a loss cost me $8K in Q1. Tradia flagged the pattern in week one and I haven’t repeated it since.', author: 'Priya N.', role: 'FX / Gold Scalper', initials: 'PN' },
  { quote: 'The dollar-cost ranking is what finally clicked. Not just "you traded emotional" — "this pattern cost you $2,340". Hard to ignore.', author: 'Jonas H.', role: 'Stock Swing Trader', initials: 'JH' },
  { quote: 'Six brokers, one dashboard. The CSV import figured out all of them without me touching a single column mapping.', author: 'Wei T.', role: 'Algorithmic Trader', initials: 'WT' },
  { quote: 'Hit a 9-day discipline streak for the first time in two years. The streak tracking is dumb-simple but it works.', author: 'Carmela V.', role: 'Options Trader', initials: 'CV' },
  { quote: 'I always knew FOMO entries were my biggest problem. Tradia put a price on it: $4,200 over six months. Now I think twice.', author: 'Tomás G.', role: 'Crypto Swing Trader', initials: 'TG' },
  { quote: 'The leak ranking told me my evening trades had a 31% lower win rate. Cut sessions after 8pm. P&L immediately steadied.', author: 'Henrik B.', role: 'European Forex Trader', initials: 'HB' },
  { quote: 'My playbook went from a Google Doc to something I actually follow. The pre-trade checklist forces discipline before I size in.', author: 'Olamide F.', role: 'Index Futures', initials: 'OF' },
  { quote: 'Stop-loss adherence was my weakest metric. Tradia surfaced it on day one. Now my stop hit rate is 94% — used to be 60%.', author: 'Lin Y.', role: 'Crypto Day Trader', initials: 'LY' },
  { quote: 'First trading tool that didn’t try to sell me a course. Just shows me what’s actually wrong with my trading and lets me fix it.', author: 'Ben K.', role: 'Stock Options', initials: 'BK' },
  { quote: 'I exported eight years of trades from MT5. The patterns Tradia found in week one would have taken me three months manually.', author: 'Yuki S.', role: 'Forex Long-term', initials: 'YS' },
  { quote: 'The discipline score is the only metric I check now. If it dips the night before, I take the next morning off.', author: 'Rachid A.', role: 'Gold / FX Trader', initials: 'RA' },
  { quote: 'Trading books told me to "be calm". Tradia told me my Tuesday trades after losing Mondays lose 71% of the time. Actionable.', author: 'Marta R.', role: 'Equities Swing', initials: 'MR' },
  { quote: 'Three weeks in I cut my position size on coins I’d lost money on. Net P&L went green for the first time in fourteen months.', author: 'Ifeoma O.', role: 'Crypto Spot', initials: 'IO' },
  { quote: 'Honest, evidence-based. No "trust me bro" guru vibes. I trust this more than any signal service I’ve ever paid for.', author: 'Reto F.', role: 'Swiss Futures', initials: 'RF' },
  { quote: 'Caught a recurring "oversized after small wins" pattern. Now I check the streak multiplier before sizing up. Saved my March gains.', author: 'Jin-Ho K.', role: 'Crypto Futures', initials: 'JK' },
  { quote: 'Joined Tradia for the leak detection. Stayed for the playbook engine. Both are best-in-class.', author: 'Aaron D.', role: 'Forex Algorithmic', initials: 'AD' },
  { quote: 'I knew I traded too much. I didn’t know each over-trade day was costing $180 on average. Now I cap at 4 setups daily.', author: 'Karim T.', role: 'Index / FX Day', initials: 'KT' },
  { quote: 'Sharing my journal with my coach via the team workspace cut our review time in half. He sees the same data I see.', author: 'Selina M.', role: 'Funded Trader', initials: 'SM' },
  { quote: 'The mobile sync from MT5 is brilliant. Trade closes, two minutes later it’s reviewed and tagged in Tradia. Zero data entry.', author: 'Vivek S.', role: 'Indian Forex', initials: 'VS' },
  { quote: 'Honestly I bought it for the brain visualization. Stayed for the cold-blooded P&L attribution that fixed my entries.', author: 'Robbie W.', role: 'Crypto Perps', initials: 'RW' },
  { quote: 'Tradia’s R-multiple math is correct. Most journals get this wrong. The R chart per setup type told me which strategy actually works.', author: 'Dimitri P.', role: 'Russian / EU Forex', initials: 'DP' },
  { quote: 'I’m profitable on paper. Tradia showed me 80% of my P&L came from 11% of setup types. I cut everything else.', author: 'Bonnie L.', role: 'Equity Swing', initials: 'BL' },
  { quote: 'Six months in and I’ve doubled my win rate. Not by trading better — by NOT taking the trades Tradia flagged as low-edge.', author: 'Yusuf D.', role: 'Forex / Commodities', initials: 'YD' },
  { quote: 'Pre-trade checklist + emotion check at entry. Stops me from chasing pumps. The friction is the point.', author: 'Anya K.', role: 'Crypto Spot', initials: 'AK' },
  { quote: 'The "one thing" coaching note I write after every trade is now the single most useful thing in my process.', author: 'Théo R.', role: 'French Stocks', initials: 'TR' },
  { quote: 'Saw I had a late-Friday losing pattern. Friday after 3pm = 22% win rate. Stopped trading Friday afternoons entirely.', author: 'Camille B.', role: 'European Equities', initials: 'CB' },
  { quote: 'Migrated from TraderSync. Tradia’s leak detection is leagues ahead. The integration was easier than I expected.', author: 'Devon H.', role: 'Options Trader', initials: 'DH' },
  { quote: 'My circuit breaker on consecutive losses has saved me four times. Cool-off prompts work because they’re hard to bypass.', author: 'Lakshmi V.', role: 'Indian Equities', initials: 'LV' },
  { quote: 'I’m a quant. The exported analytics are clean and column-named correctly. Pulled them straight into Python — no mess.', author: 'Greg N.', role: 'Quant Researcher', initials: 'GN' },
  { quote: 'Hit-rate by hour-of-day was the chart that broke through. I trade two windows now. Sessions cut in half, P&L doubled.', author: 'Hideo M.', role: 'Japan FX Trader', initials: 'HM' },
  { quote: 'Discipline grade started at C+. Three months in I’m A-. The grade is a moving average so you can’t cheese it short-term.', author: 'Tobias K.', role: 'Stocks Day Trader', initials: 'TK' },
  { quote: 'Tradia’s emotion tagging caught a pattern: I’m 3x more likely to revenge-trade after a loss above $400. $400 is now my hard stop.', author: 'Femi L.', role: 'Forex Scalper', initials: 'FL' },
  { quote: 'Worth every cent of the Pro plan. The strategy attribution chart alone replaces my $30/mo subscription to a third-party tool.', author: 'Maja S.', role: 'Crypto Spot Investor', initials: 'MS' },
  { quote: 'The signal community is the cleanest I’ve found. Real R:R math, posters with verifiable hit rates, no "guaranteed win" nonsense.', author: 'Igor T.', role: 'Signals Subscriber', initials: 'IT' },
  { quote: 'Tradia’s neuro-score chart over time is humbling. You see exactly when discipline slipped. Hard to lie to yourself.', author: 'Nadia B.', role: 'Crypto Day', initials: 'NB' },
  { quote: 'I was breaking 9 rules a week on average. After installing the pre-trade checklist, I’m down to less than 1.', author: 'Eitan K.', role: 'Forex Swing', initials: 'EK' },
  { quote: 'Found that my best setup wasn’t my favorite setup. The data forced me to pick the most profitable one. Up 22% the next quarter.', author: 'Pat J.', role: 'US Day Trader', initials: 'PJ' },
  { quote: 'The brain stages are gimmicky but addicting. I’m chasing "advance" next week. Whatever motivates discipline, I’ll take.', author: 'Jules S.', role: 'Crypto Beginner', initials: 'JS' },
  { quote: 'Daily reflection takes me four minutes. Once a quarter I read the last 90. That’s the most valuable review I do.', author: 'Camilo R.', role: 'Latam Forex', initials: 'CR' },
  { quote: 'Trade tagging is fast — keyboard-driven, no menus. Compound filters then show patterns instantly across thousands of trades.', author: 'Halle G.', role: 'Options Income', initials: 'HG' },
  { quote: 'Cohort feature for my mentor’s group is great. Anonymized leaderboard keeps everyone honest. We share notes in the workspace.', author: 'Sven L.', role: 'Funded Group', initials: 'SL' },
  { quote: 'Tradia exposed the lie I was telling myself — that I was a swing trader. I was actually a 4-hour scalper. Repositioned my whole approach.', author: 'Cy W.', role: 'Stocks / Crypto', initials: 'CW' },
  { quote: 'The UI is gorgeous but the substance is what made me subscribe. Numbers don’t lie and Tradia’s numbers are correct.', author: 'Anika P.', role: 'Forex / Indices', initials: 'AP' },
  { quote: 'I had three different journals before. Now I have one. The pain of context-switching is gone.', author: 'Mauricio G.', role: 'Multi-Asset Discretionary', initials: 'MG' },
  { quote: 'Found a "first trade of the day" losing pattern: I lose 65% on the open. Now I paper-trade the first hour. Win rate up across the day.', author: 'Solene D.', role: 'European FX', initials: 'SD' },
  { quote: 'Best six months of my trading career. Tradia is the single thing that changed.', author: 'Trent K.', role: 'Funded Futures', initials: 'TK' },
  { quote: 'The recovery-lock when I’m tilted is annoying. I love it. The annoying-ness is what makes it work.', author: 'Niloofar A.', role: 'Crypto Day', initials: 'NA' },
  { quote: 'The leak descriptions are written like a coach, not a chart. "Recurring oversized risk after small wins" — that’s actionable English.', author: 'Bradley S.', role: 'Stock Options', initials: 'BS' },
  { quote: 'Sat down to "check Tradia for 10 minutes" on a Sunday. Three hours later I had a completely new playbook for Q2.', author: 'Hanan A.', role: 'Forex / Metals', initials: 'HA' },
  { quote: 'My partner asked me to show her what I do. Tradia made it explainable. She saw real progress for the first time.', author: 'Khalid I.', role: 'FX Long-term', initials: 'KI' },
  { quote: 'The risk-per-trade chart told me my sizing got loose after winning weeks. I hard-coded 1R regardless. Equity curve smoothed out.', author: 'Janelle B.', role: 'Crypto Perps', initials: 'JB' },
  { quote: 'I’ve subscribed to four trading platforms over five years. Tradia is the only one I still log into every single day.', author: 'Lukas E.', role: 'Polish Forex', initials: 'LE' },
  { quote: 'Tradia caught an "oversized after coffee" joke pattern. I logged caffeine for two weeks — it was real. I cap espresso at one before the open.', author: 'Aurelio M.', role: 'Italian Equities', initials: 'AM' },
  { quote: 'The vacation mode pause kept my brain score from rotting while I was traveling. Small thing, big retention move.', author: 'Maya J.', role: 'Crypto Swing', initials: 'MJ' },
  { quote: 'Worth subscribing just for the discipline-score gamification. I’m shockingly motivated by a single letter grade.', author: 'Roland P.', role: 'EU Forex Scalper', initials: 'RP' },
  { quote: 'Most journals tell you what happened. Tradia tells you what’s recurring. Different category of tool entirely.', author: 'Beatrice O.', role: 'African Forex', initials: 'BO' },
];

// Show a curated handful in a carousel rather than the whole wall of quotes.
const REVIEWS = testimonials.slice(0, 10);

const slideVariants = {
  enter: (dir: number) => ({ opacity: 0, x: dir > 0 ? 60 : -60 }),
  center: { opacity: 1, x: 0 },
  exit: (dir: number) => ({ opacity: 0, x: dir > 0 ? -60 : 60 }),
};

export default function Testimonials() {
  // [activeIndex, direction] — direction drives the slide-in/out animation.
  const [[active, dir], setActive] = useState<[number, number]>([0, 0]);
  const [paused, setPaused] = useState(false);

  const go = (next: number) => {
    const wrapped = (next + REVIEWS.length) % REVIEWS.length;
    setActive(([prev]) => [wrapped, wrapped > prev || (prev === REVIEWS.length - 1 && wrapped === 0) ? 1 : -1]);
  };

  // Auto-advance every 6s unless the user is hovering the carousel.
  useEffect(() => {
    if (paused) return;
    const id = setInterval(() => setActive(([prev]) => [(prev + 1) % REVIEWS.length, 1]), 6000);
    return () => clearInterval(id);
  }, [paused]);

  const t = REVIEWS[active];
  const color = AVATAR_GRADIENTS[active % AVATAR_GRADIENTS.length];

  return (
    <section className="relative overflow-hidden py-20 sm:py-28">
      <AtmosphericBackground />
      <div className="relative max-w-3xl mx-auto px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <span className="neon-eyebrow text-[11px] font-bold tracking-[0.2em] uppercase">
            Trusted by Traders
          </span>
          <h2 className="mt-3 text-3xl sm:text-4xl font-bold text-[var(--foreground)]">
            What <span className="neon-headline">traders</span> are saying
          </h2>
          <p className="mt-4 text-[var(--muted-foreground)]">
            See what crypto, stock, forex, futures, options, and metals traders find inside Tradia.
          </p>
        </motion.div>

        {/* Carousel */}
        <div
          className="relative flex items-center gap-2 sm:gap-4"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
        >
          <CarouselButton dir="prev" onClick={() => go(active - 1)} />

          <div className="relative flex-1 min-h-[260px] sm:min-h-[230px] flex items-center">
            <AnimatePresence mode="wait" custom={dir}>
              <motion.div
                key={active}
                custom={dir}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.4, ease: 'easeOut' }}
                className="w-full rounded-2xl border border-[var(--border)] bg-[var(--card)] p-7 sm:p-9 text-center"
              >
                <Quote size={26} className="mx-auto text-pink-400/60 mb-4" />
                <p className="text-base sm:text-lg text-[var(--foreground)] leading-relaxed">
                  &ldquo;{t.quote}&rdquo;
                </p>
                <div className="flex items-center justify-center gap-3 mt-6">
                  <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${color} flex items-center justify-center shrink-0`}>
                    <span className="text-white text-sm font-bold">{t.initials}</span>
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-semibold text-[var(--foreground)]">{t.author}</p>
                    <p className="text-xs text-[var(--muted-foreground)]">{t.role}</p>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          <CarouselButton dir="next" onClick={() => go(active + 1)} />
        </div>

        {/* Dots */}
        <div className="flex items-center justify-center gap-2 mt-7">
          {REVIEWS.map((_, i) => (
            <button
              key={i}
              onClick={() => setActive([i, i > active ? 1 : -1])}
              aria-label={`Go to review ${i + 1}`}
              className={`h-2 rounded-full transition-all ${
                i === active ? 'w-6 bg-pink-400' : 'w-2 bg-[var(--muted-foreground)]/40 hover:bg-[var(--muted-foreground)]/70'
              }`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function CarouselButton({ dir, onClick }: { dir: 'prev' | 'next'; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-label={dir === 'prev' ? 'Previous review' : 'Next review'}
      className="shrink-0 w-10 h-10 rounded-full border border-[var(--border)] bg-[var(--card)] flex items-center justify-center text-[var(--muted-foreground)] hover:text-pink-300 hover:border-pink-500/40 transition-colors"
    >
      {dir === 'prev' ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
    </button>
  );
}
