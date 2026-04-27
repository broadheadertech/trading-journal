'use client';

import { useState } from 'react';
import { TrendingUp, Crosshair, Sparkles, Sunrise, Waves, Layers, Clock, LineChart } from 'lucide-react';

type StrategyId =
  | 'inner-circle'
  | 'fibonacci'
  | 'opening-range'
  | 'liquidity-sweeps'
  | 'supply-demand'
  | 'sessions'
  | 'support-resistance';

interface StrategyDef {
  id: StrategyId;
  title: string;
  tag: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  summary: string;
  keyConcepts: string[];
  rules: string[];
}

const STRATEGIES: StrategyDef[] = [
  {
    id: 'inner-circle',
    title: 'Inner Circle Concepts',
    tag: 'Smart Money',
    icon: Crosshair,
    summary: 'ICT methodology — order blocks, fair value gaps, and liquidity engineering used by institutional traders.',
    keyConcepts: [
      'Order Blocks (OB) — last bullish/bearish candle before a strong directional move',
      'Fair Value Gaps (FVG) — three-candle imbalances that often get filled',
      'Breaker Blocks — failed order blocks that flip role',
      'Liquidity Pools — equal highs/lows where stops cluster',
      'Premium vs. Discount zones via dealing range',
    ],
    rules: [
      'Identify the daily/4H bias using market structure first',
      'Mark order blocks and FVGs on your trading timeframe',
      'Wait for liquidity sweep before entering',
      'Stop loss above/below the order block, not at the wick',
      'Target the next opposing liquidity pool',
    ],
  },
  {
    id: 'fibonacci',
    title: 'Fibonacci Mastery',
    tag: 'Retracement',
    icon: Sparkles,
    summary: 'Master golden ratios for entry, exit, and confluence with market structure.',
    keyConcepts: [
      'Key retracement levels: 38.2%, 50%, 61.8%, 78.6%',
      'Golden Pocket (61.8% – 65%) as premium reversal zone',
      'Extension levels: 1.272, 1.618, 2.618 for targets',
      'Confluence with order blocks and structure',
      'Multi-timeframe fib alignment',
    ],
    rules: [
      'Draw fib from swing low to swing high (or reverse) on the active leg',
      'Look for entries inside the Golden Pocket only',
      'Combine with horizontal S/R for high-probability confluence',
      'Stop below 78.6% — invalidation if it breaks',
      'TP at 1.272 → 1.618 extensions',
    ],
  },
  {
    id: 'opening-range',
    title: 'Opening Range Breakouts',
    tag: 'Day Trading',
    icon: Sunrise,
    summary: 'Trade the first range of the session for high-probability directional moves.',
    keyConcepts: [
      'The Opening Range = first 15/30/60 minutes of a session',
      'Range high and low as breakout / breakdown triggers',
      'Volume confirmation required for valid breakouts',
      'Failed breakouts often reverse hard',
      'Best on liquid instruments with strong session volatility',
    ],
    rules: [
      'Mark the high and low of the first 30 minutes',
      'Wait for a clean break + close beyond the range',
      'Volume should expand on the breakout candle',
      'Stop loss at the opposite end of the range',
      'Target = 1× to 2× the range height',
    ],
  },
  {
    id: 'liquidity-sweeps',
    title: 'Liquidity Sweeps',
    tag: 'Smart Money',
    icon: Waves,
    summary: 'Identify stop-hunts and liquidity grabs that precede true reversals.',
    keyConcepts: [
      'Equal highs/lows = liquidity magnets for institutions',
      'Sweep + reclaim pattern signals reversal',
      'Asian range often gets swept during London open',
      'Wick-only sweeps are more reliable than full breaks',
      'Volume spike on the sweep adds confirmation',
    ],
    rules: [
      'Mark obvious equal highs/lows ahead of session opens',
      'Wait for the sweep — price wicks beyond the level then closes back',
      'Confirm with displacement candle in the opposite direction',
      'Enter on retest of the sweep level',
      'Stop above/below the sweep wick',
    ],
  },
  {
    id: 'supply-demand',
    title: 'Supply and Demand',
    tag: 'Zones',
    icon: Layers,
    summary: 'Map institutional supply and demand zones for precise reversal entries.',
    keyConcepts: [
      'Demand zone = base before a strong rally',
      'Supply zone = base before a strong drop',
      'Fresh zones (untested) are highest probability',
      'Drop-Base-Rally / Rally-Base-Drop patterns',
      'Zone strength = move away from base × time',
    ],
    rules: [
      'Identify the base candle(s) before a strong impulsive move',
      'Mark the high and low of the base as the zone',
      'Only trade fresh zones in alignment with HTF bias',
      'Enter on first touch with confirmation candle',
      'Stop beyond the far edge of the zone',
    ],
  },
  {
    id: 'sessions',
    title: 'Sessions',
    tag: 'Timing',
    icon: Clock,
    summary: 'Trade Asia, London, and New York sessions — when, why, and how each one moves.',
    keyConcepts: [
      'Asia (typically ranging) — accumulation phase',
      'London (often manipulation) — sweeps Asian range',
      'New York (distribution) — true daily move continuation',
      'London/NY overlap = highest volume window',
      'Session highs/lows act as future liquidity',
    ],
    rules: [
      'Mark each session range as it develops',
      'Avoid trading during low-volume Asia ranges unless fading',
      'London open: watch for Asia sweep before the real move',
      'NY open: trade the breakout/continuation off London setup',
      'Close intraday positions before low-liquidity rollover',
    ],
  },
  {
    id: 'support-resistance',
    title: 'Support and Resistance Mastery',
    tag: 'Levels',
    icon: LineChart,
    summary: 'Build confluence from horizontal levels, trendlines, and round numbers.',
    keyConcepts: [
      'Horizontal levels at clear swing highs/lows',
      'Role-reversal: broken resistance becomes support and vice versa',
      'Round numbers (00, 50) act as psychological levels',
      'Multi-timeframe S/R alignment = stronger confluence',
      'Number of touches × reaction strength = level quality',
    ],
    rules: [
      'Draw levels at obvious swing highs/lows on HTF first',
      'Wait for confirmation: rejection wick, engulfing, or break-and-retest',
      'Trade only at confluent levels (HTF + LTF + round number)',
      'Stop beyond the level with buffer for noise',
      'Take partials at the next opposing level',
    ],
  },
];

export default function Strategies() {
  const [active, setActive] = useState<StrategyId>('inner-circle');
  const current = STRATEGIES.find(s => s.id === active)!;

  return (
    <div className="relative space-y-6">
      <div className="hero-glow" />

      <header className="space-y-3 anim-fade-up">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass text-xs font-medium text-[var(--muted-foreground)]">
          <TrendingUp size={12} /> Curated playbooks
        </div>
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-[var(--foreground)]">
          Trading <span className="gradient-text">strategies</span>
        </h1>
        <p className="text-base text-[var(--muted-foreground)] max-w-xl">
          Explore vetted, battle-tested strategies built by senior traders.
        </p>
      </header>

      {/* Sub-tab strip — same pattern as JournalTab */}
      <div className="glass rounded-2xl p-1.5 inline-flex gap-1 overflow-x-auto max-w-full">
        {STRATEGIES.map(s => {
          const Icon = s.icon;
          const isActive = active === s.id;
          return (
            <button
              key={s.id}
              onClick={() => setActive(s.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-gradient-to-br from-teal-500 to-teal-700 text-white shadow-lg shadow-teal-500/30'
                  : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)]/40'
              }`}
            >
              <Icon size={16} />
              {s.title}
            </button>
          );
        })}
      </div>

      {/* Active strategy content */}
      <StrategyContent key={current.id} strategy={current} />
    </div>
  );
}

function StrategyContent({ strategy }: { strategy: StrategyDef }) {
  const Icon = strategy.icon;
  return (
    <div className="space-y-6 anim-fade-up">
      {/* Hero card */}
      <div className="glass rounded-3xl p-6 sm:p-8 relative overflow-hidden">
        <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full bg-gradient-to-br from-teal-500/20 to-emerald-500/10 blur-3xl pointer-events-none" />
        <div className="flex items-start gap-4 relative">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-teal-500/30 to-emerald-500/10 flex items-center justify-center shrink-0">
            <Icon size={26} className="text-teal-400" />
          </div>
          <div className="flex-1 min-w-0 space-y-2">
            <span className="text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-400 font-medium">{strategy.tag}</span>
            <h2 className="text-3xl font-bold tracking-tight text-[var(--foreground)]">{strategy.title}</h2>
            <p className="text-[var(--muted-foreground)]">{strategy.summary}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Key concepts */}
        <div className="glass rounded-3xl p-6">
          <h3 className="font-bold text-[var(--foreground)] flex items-center gap-2 mb-4">
            <Sparkles size={16} className="text-teal-400" /> Key concepts
          </h3>
          <ul className="space-y-2.5">
            {strategy.keyConcepts.map((c, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-[var(--foreground)]">
                <span className="mt-1 w-1.5 h-1.5 rounded-full bg-teal-400 shrink-0" />
                <span>{c}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Rules */}
        <div className="glass rounded-3xl p-6">
          <h3 className="font-bold text-[var(--foreground)] flex items-center gap-2 mb-4">
            <Crosshair size={16} className="text-teal-400" /> Trading rules
          </h3>
          <ol className="space-y-2.5">
            {strategy.rules.map((r, i) => (
              <li key={i} className="flex items-start gap-2.5 text-sm text-[var(--foreground)]">
                <span className="shrink-0 w-5 h-5 rounded-full bg-teal-500/15 text-teal-400 text-[11px] font-bold flex items-center justify-center mt-0.5">{i + 1}</span>
                <span>{r}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>

      <p className="text-xs text-[var(--muted-foreground)] text-center">
        Full video lessons and worked examples coming with the Courses module.
      </p>
    </div>
  );
}
