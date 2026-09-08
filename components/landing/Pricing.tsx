'use client';

import Link from 'next/link';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Check, ArrowRight, Zap, Users, Star, Target, QrCode } from 'lucide-react';
import AtmosphericBackground from './AtmosphericBackground';

type Plan = {
  _id: string;
  planId: string;
  name: string;
  tagline?: string;
  goal?: string;
  priceMonthly: number;
  priceYearly: number;
  features: string[];
  isActive: boolean;
  isHighlighted?: boolean;
  sortOrder: number;
};

const ICON_BY_PLAN: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  core: Zap,
  pro: Star,
  elite: Users,
};

const ACCENT_BY_PLAN: Record<string, string> = {
  core: 'from-pink-400 to-fuchsia-400',
  pro: 'from-orange-400 to-amber-400',
  elite: 'from-fuchsia-400 to-pink-500',
};

export default function Pricing() {
  const [interval, setInterval] = useState<'month' | 'year'>('month');
  const plans = useQuery(api.subscriptions.getActivePlans) as Plan[] | undefined;

  const sortedPlans = (plans ?? []).slice().sort((a, b) => a.sortOrder - b.sortOrder);

type Cycle = 'monthly' | 'annual';

const CORE_FEATURES = [
  'Unlimited trade journaling',
  'Basic performance analytics (win rate, avg win, equity curve)',
  'Trading journal + notes system',
  'Basic playbook rules',
  'Manual trade entry',
  'Behavioral insights (win rate, streaks, R:R data)',
  'Session-in-trading tools (best sessions, session tracker)',
  'Economic calendar access',
];

const PRO_FEATURES = [
  'Everything in Core',
  'Advanced analytics (AI scoring)',
  'AI trade insights / mistake detection',
  'Playbook automation & rule tracking',
  'Trade tagging & strategy breakdown',
  'Equity curve + drawdown analytics',
  'Sessions & setup heatmap',
  'Auto-sync (multi-broker / equipment brokers)',
  'Performance reports & export',
  'Priority support',
];

const ELITE_FEATURES = [
  'Everything in Pro',
  'Team / student management system',
  'Shared workspace (shared, community integrations)',
  'Cohort analytics (track students or members)',
  'Mentor review & marking mode',
  'Leaderboards & performance rankings',
  'Audit logs (track member activity)',
  'Aggregated reports (group performance)',
  'Rules system (build your academy / trade rules)',
  'Early access to new features',
  '1:1 support',
];

function Check({ stroke }: { stroke: string }) {
  return (
    <section id="pricing" className="relative overflow-hidden py-20 sm:py-24">
      <AtmosphericBackground />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.5 }}
          className="text-center mb-10"
        >
          <span className="neon-eyebrow text-[11px] font-bold tracking-[0.2em] uppercase">
            Pricing
          </span>
          <h2 className="mt-3 text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight">
            Plans for{' '}
            <span className="neon-headline">solo traders and teams</span>
          </h2>
          <p className="mt-4 text-[var(--muted-foreground)] max-w-xl mx-auto">
            15-day free trial on every plan. No credit card to start.
          </p>

          <div className="inline-flex items-center gap-1 mt-7 p-1 rounded-full border border-[var(--border)] bg-[var(--card)]">
            <button
              onClick={() => setInterval('month')}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
                interval === 'month'
                  ? 'bg-gradient-to-r from-orange-400 to-amber-400 text-slate-900 shadow-[0_0_20px_-4px_rgba(251,146,60,0.6)]'
                  : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setInterval('year')}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5 ${
                interval === 'year'
                  ? 'bg-gradient-to-r from-orange-400 to-amber-400 text-slate-900 shadow-[0_0_20px_-4px_rgba(251,146,60,0.6)]'
                  : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
              }`}
            >
              Annual
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                interval === 'year' ? 'bg-slate-900/20 text-slate-900' : 'bg-pink-500/15 text-pink-400'
              }`}>
                Save 17%
              </span>
            </button>
          </div>
        </motion.div>

        {plans === undefined ? (
          <PricingSkeleton />
        ) : sortedPlans.length === 0 ? (
          <div className="text-center text-sm text-[var(--muted-foreground)] py-12">
            No active plans configured. Run <code className="text-pink-400">seedPlans</code> from the Convex dashboard to populate them.
          </div>
        ) : (
          <div className={`grid grid-cols-1 ${sortedPlans.length === 2 ? 'md:grid-cols-2 max-w-4xl' : 'md:grid-cols-3 max-w-6xl'} gap-5 mx-auto`}>
            {sortedPlans.map((p, i) => <TierCard key={p._id} plan={p} interval={interval} idx={i} />)}
          </div>
        )}

        <div className="mt-8 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-[var(--muted-foreground)]">
          <span className="flex items-center gap-1.5"><Check size={12} className="text-pink-400" /> No credit card required</span>
          <span className="opacity-30">·</span>
          <span className="flex items-center gap-1.5"><Check size={12} className="text-pink-400" /> Cancel anytime</span>
          <span className="opacity-30">·</span>
          <span className="flex items-center gap-1.5"><Check size={12} className="text-pink-400" /> Full access during trial</span>
        </div>

        {/* Manual QR payment — GCash / Maya / bank QRPH / crypto. Users complete it
            after signing in (upload proof + reference ID), so route them to sign-up. */}
        <div className="mt-4 flex items-center justify-center">
          <Link
            href="/sign-up"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium text-[var(--foreground)] border border-[var(--border)] bg-[var(--card)] hover:bg-[var(--muted)]/50 transition-colors"
          >
            <QrCode size={14} className="text-pink-400" />
            Prefer GCash / crypto? Pay via QR
          </Link>
        </div>
      </div>
    </section>
  );
}

function Features({ items, stroke }: { items: string[]; stroke: string }) {
  return (
    <ul>
      {items.map((item) => (
        <li key={item}><Check stroke={stroke} /><span>{item}</span></li>
      ))}
    </ul>
  );
}

export default function Pricing() {
  const [cycle, setCycle] = useState<Cycle>('monthly');
  const annual = cycle === 'annual';
  const price = (m: string, a: string) => (annual ? a : m);
  const billed = annual ? 'Billed annually' : 'Billed monthly';

  return (
    <div className="sec09">
      <div className="wrap">
        <div className="pricehead">
          <div>
            <p className="eyebrow">PRICING</p>
            <h2 className="h2" style={{ marginTop: '11px' }}>Plans for solo traders and teams</h2>
            <p className="lede-lg" style={{ marginTop: '23px' }}>30-day free trial on every plan. No credit card to start.</p>
          </div>
          <div className="right" style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '40px' }}>
            <div className="toggle">
              <button className={annual ? undefined : 'on'} data-cycle="monthly" onClick={() => setCycle('monthly')}>Monthly</button>
              <button className={annual ? 'on' : undefined} data-cycle="annual" onClick={() => setCycle('annual')}>Annual</button>
              <span className="save">SAVE 20%</span>
            </div>
          </div>
        </div>

        <div className="plans">
          <div className="plan">
            <h3>Atlas Core</h3>
            <p className="who">For beginners to intermediate traders</p>
            <div className="price"><b data-m="$29" data-a="$23">{price('$29', '$23')}</b><span>/month</span></div>
            <p className="billed" data-m="Billed monthly" data-a="Billed annually">{billed}</p>
            <Features items={CORE_FEATURES} stroke="#24c88a" />
            <div className="foot">
              <div className="best"><em>BEST</em><p>Best for traders who want to build a track record</p></div>
              <Link className="buy" href="/pricing">Start 30-Day Free Trial</Link>
              <p className="nocard">No credit card required</p>
            </div>
          </div>

          <div className="plan pro">
            <span className="badge">MOST POPULAR</span>
            <h3>Atlas Pro</h3>
            <p className="who">For serious traders scaling up performance</p>
            <div className="price"><b data-m="$39" data-a="$31">{price('$39', '$31')}</b><span>/month</span></div>
            <p className="billed" data-m="Billed monthly" data-a="Billed annually">{billed}</p>
            <Features items={PRO_FEATURES} stroke="#d99405" />
            <div className="foot">
              <div className="best"><em>BEST</em><p>Best for traders who want data-driven performance</p></div>
              <Link className="buy" href="/pricing">Start 30-Day Free Trial</Link>
              <p className="nocard">No credit card required</p>
            </div>
          </div>

          <div className="plan">
            <h3>Atlas Elite</h3>
            <p className="who">For mentors, funded traders and trading communities</p>
            <div className="price"><b data-m="$59" data-a="$47">{price('$59', '$47')}</b><span>/month</span></div>
            <p className="billed" data-m="Billed monthly" data-a="Billed annually">{billed}</p>
            <Features items={ELITE_FEATURES} stroke="#24c88a" />
            <div className="foot">
              <div className="best"><em>BEST</em><p>Best for communities that need visibility across every account</p></div>
              <Link className="buy" href="/pricing">Start 30-Day Free Trial</Link>
              <p className="nocard">No credit card required</p>
            </div>
          </div>
        </div>

        <div className="pricenotes">
          <div><i></i>No credit card required</div>
          <div><i></i>Cancel anytime</div>
          <div><i></i>Full access during trial</div>
        </div>
      </div>
    </div>
  );
}
