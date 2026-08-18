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
      'Take profit at 1.272 → 1.618 extensions',
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
    <div>
      <div className="phead">
        <p className="eyebrow"><TrendingUp size={13} /> Curated playbooks</p>
        <h2>Trading strategies</h2>
        <p className="sub">Explore vetted, battle-tested strategies built by senior traders.</p>
      </div>

      {/* Sub-tab strip */}
      <div className="tabs line">
        {STRATEGIES.map(s => (
          <button
            key={s.id}
            onClick={() => setActive(s.id)}
            className={active === s.id ? 'on' : undefined}
            // The reference renders the active strategy tab as a solid amber
            // block (it overrides the `.tabs.line` underline-only rule inline).
            style={active === s.id ? { background: 'var(--amber)', color: 'var(--ink)', borderRadius: 2 } : undefined}
          >
            {s.title}
          </button>
        ))}
      </div>

      {/* Active strategy content */}
      <StrategyContent key={current.id} strategy={current} />
    </div>
  );
}

function StrategyContent({ strategy }: { strategy: StrategyDef }) {
  const Icon = strategy.icon;
  return (
    <div>
      {/* Strategy header */}
      <div style={{ position: 'relative', paddingTop: 23 }}>
        <span style={{ position: 'absolute', left: 0, top: 0, width: 56, height: 3, background: 'var(--amber)' }} />
        <p style={{ margin: 0, fontWeight: 500, fontSize: 10, color: 'var(--teal)', letterSpacing: '.04em', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Icon size={12} />{strategy.tag}
        </p>
        <h3 style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: 28, lineHeight: '30px', margin: '16px 0 0' }}>
          {strategy.title}
        </h3>
        <p style={{ margin: '20px 0 0', fontSize: 14.5, color: 'var(--muted)', maxWidth: 760 }}>
          {strategy.summary}
        </p>
      </div>

      <div className="split" style={{ marginTop: 70 }}>
        {/* Key concepts */}
        <div>
          <h4 style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: 16, margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
            <Sparkles size={14} style={{ color: 'var(--amber)' }} /> Key concepts
          </h4>
          <div className="klist">
            {strategy.keyConcepts.map((c, i) => (
              <div key={i}><i /><span>{c}</span></div>
            ))}
          </div>
        </div>

        {/* Rules */}
        <div>
          <h4 style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: 16, margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
            <Crosshair size={14} style={{ color: 'var(--amber)' }} /> Trading rules
          </h4>
          <div className="klist num">
            {strategy.rules.map((r, i) => (
              <div key={i}><b>{i + 1}</b><span>{r}</span></div>
            ))}
          </div>
        </div>
      </div>

      <p className="footnote">
        Full video lessons and worked examples coming with the Courses module.
      </p>
    </div>
  );
}
