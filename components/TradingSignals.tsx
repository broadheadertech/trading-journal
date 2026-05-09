'use client';

import { useState } from 'react';
import { Radio, TrendingUp, TrendingDown, Clock, Target, ShieldAlert, Star, Filter } from 'lucide-react';

type Direction = 'long' | 'short';
type Strength = 'high' | 'medium' | 'low';
type Status = 'active' | 'closed' | 'pending';

interface Signal {
  id: string;
  symbol: string;
  market: 'crypto' | 'forex' | 'stocks' | 'commodities';
  direction: Direction;
  entry: number;
  stopLoss: number;
  takeProfit: number;
  strength: Strength;
  status: Status;
  source: string;
  postedAt: string;     // ISO
  expiresAt?: string;   // ISO
  rationale: string;
  rrRatio: number;
}

// Placeholder signals — replace with Convex query (`useQuery(api.signals.list)`)
// once the signals table + ingestion is set up.
const SAMPLE_SIGNALS: Signal[] = [
  {
    id: 'sig-1',
    symbol: 'BTCUSDT',
    market: 'crypto',
    direction: 'long',
    entry: 67_240,
    stopLoss: 65_800,
    takeProfit: 71_100,
    strength: 'high',
    status: 'active',
    source: 'Tradia AI',
    postedAt: new Date(Date.now() - 1000 * 60 * 18).toISOString(),
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 12).toISOString(),
    rationale: 'Reclaim of 67k weekly resistance with rising open interest. Bullish until 65.8k loses.',
    rrRatio: 2.7,
  },
  {
    id: 'sig-2',
    symbol: 'EURUSD',
    market: 'forex',
    direction: 'short',
    entry: 1.0875,
    stopLoss: 1.0915,
    takeProfit: 1.0790,
    strength: 'medium',
    status: 'active',
    source: 'London Session Desk',
    postedAt: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
    rationale: 'Hawkish Fed minutes; EUR weakness into US session. Reject 1.0875 daily structure.',
    rrRatio: 2.1,
  },
  {
    id: 'sig-3',
    symbol: 'XAUUSD',
    market: 'commodities',
    direction: 'long',
    entry: 2_345,
    stopLoss: 2_318,
    takeProfit: 2_402,
    strength: 'high',
    status: 'pending',
    source: 'Macro Desk',
    postedAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
    rationale: 'CPI miss + DXY rejection. Awaiting 2,345 retest before activation.',
    rrRatio: 2.1,
  },
  {
    id: 'sig-4',
    symbol: 'NVDA',
    market: 'stocks',
    direction: 'long',
    entry: 902,
    stopLoss: 878,
    takeProfit: 970,
    strength: 'medium',
    status: 'closed',
    source: 'Tech Sector Scanner',
    postedAt: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(),
    rationale: 'Earnings momentum; closed at TP after 4h.',
    rrRatio: 2.8,
  },
  {
    id: 'sig-5',
    symbol: 'ETHUSDT',
    market: 'crypto',
    direction: 'short',
    entry: 3_180,
    stopLoss: 3_245,
    takeProfit: 3_010,
    strength: 'low',
    status: 'active',
    source: 'Tradia AI',
    postedAt: new Date(Date.now() - 1000 * 60 * 240).toISOString(),
    rationale: 'Lower-high formation on 4h with declining volume. Confirmation pending.',
    rrRatio: 2.6,
  },
];

type Filter = 'all' | 'crypto' | 'forex' | 'stocks' | 'commodities';

export default function TradingSignals() {
  const [filter, setFilter] = useState<Filter>('all');
  const [statusFilter, setStatusFilter] = useState<Status | 'all'>('active');

  const filtered = SAMPLE_SIGNALS.filter(s =>
    (filter === 'all' || s.market === filter) &&
    (statusFilter === 'all' || s.status === statusFilter)
  );

  const activeCount = SAMPLE_SIGNALS.filter(s => s.status === 'active').length;
  const pendingCount = SAMPLE_SIGNALS.filter(s => s.status === 'pending').length;

  return (
    <div className="relative space-y-6 anim-fade-up">
      <div className="hero-glow" />

      {/* Header */}
      <header className="space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass text-xs font-medium text-[var(--muted-foreground)]">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full rounded-full bg-pink-400 opacity-75 animate-ping" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-pink-500" />
          </span>
          {activeCount} active · {pendingCount} pending · curated by analysts + AI
        </div>
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-[var(--foreground)]">
          Trading <span className="gradient-text">signals</span>
        </h1>
        <p className="text-base text-[var(--muted-foreground)] max-w-2xl">
          High-conviction trade ideas with entry, stop, and target. Each signal carries its own R:R, source, and rationale —
          use them as a starting point, never a substitute for your own playbook.
        </p>
      </header>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-[var(--muted-foreground)]">
          <Filter size={11} /> Market
        </div>
        <div className="inline-flex items-center gap-1 p-1 rounded-full border border-[var(--border)] bg-[var(--card)]">
          {(['all', 'crypto', 'forex', 'stocks', 'commodities'] as Filter[]).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1 rounded-full text-[11px] font-semibold capitalize transition-all ${
                filter === f
                  ? 'bg-gradient-to-r from-pink-400 to-fuchsia-400 text-slate-900'
                  : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-[var(--muted-foreground)] ml-2">
          Status
        </div>
        <div className="inline-flex items-center gap-1 p-1 rounded-full border border-[var(--border)] bg-[var(--card)]">
          {(['all', 'active', 'pending', 'closed'] as (Status | 'all')[]).map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1 rounded-full text-[11px] font-semibold capitalize transition-all ${
                statusFilter === s
                  ? 'bg-gradient-to-r from-orange-400 to-amber-400 text-slate-900'
                  : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Signal cards */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-sm text-[var(--muted-foreground)]">
          No signals match your filters.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(s => <SignalCard key={s.id} signal={s} />)}
        </div>
      )}

      {/* Note */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 flex items-start gap-3">
        <ShieldAlert size={18} className="text-amber-400 mt-0.5 shrink-0" />
        <div className="text-xs text-[var(--muted-foreground)] leading-relaxed">
          <span className="font-semibold text-[var(--foreground)]">Not financial advice. </span>
          Signals are research-driven trade ideas, not recommendations. Run every signal through your playbook, your
          risk model, and your discipline check before sizing in. Sample data shown — wire to a live feed in
          <code className="mx-1 px-1.5 py-0.5 rounded bg-black/30 text-pink-400">convex/signals.ts</code> when ready.
        </div>
      </div>
    </div>
  );
}

function SignalCard({ signal: s }: { signal: Signal }) {
  const isLong = s.direction === 'long';
  const DirIcon = isLong ? TrendingUp : TrendingDown;
  const dirColor = isLong ? 'text-emerald-400' : 'text-red-400';
  const dirBg = isLong ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-red-500/10 border-red-500/30';

  const strengthColor =
    s.strength === 'high' ? 'text-pink-300 border-pink-500/40 bg-pink-500/10' :
    s.strength === 'medium' ? 'text-amber-300 border-amber-500/40 bg-amber-500/10' :
    'text-[var(--muted-foreground)] border-[var(--border)] bg-[var(--muted)]/30';

  const statusColor =
    s.status === 'active' ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' :
    s.status === 'pending' ? 'text-amber-300 bg-amber-500/10 border-amber-500/30' :
    'text-[var(--muted-foreground)] bg-[var(--muted)]/30 border-[var(--border)]';

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 hover:border-pink-500/30 transition-colors flex flex-col gap-4">
      {/* Top row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl border ${dirBg} flex items-center justify-center`}>
            <DirIcon size={18} className={dirColor} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-[var(--foreground)] tabular-nums">{s.symbol}</h3>
              <span className="text-[9px] font-bold uppercase tracking-widest text-[var(--muted-foreground)]">{s.market}</span>
            </div>
            <div className={`text-[11px] font-bold uppercase tracking-widest ${dirColor}`}>
              {s.direction}
            </div>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className={`text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border ${statusColor}`}>
            {s.status}
          </span>
          <span className={`text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border inline-flex items-center gap-1 ${strengthColor}`}>
            <Star size={9} />
            {s.strength}
          </span>
        </div>
      </div>

      {/* Levels grid */}
      <div className="grid grid-cols-3 gap-2">
        <Level label="Entry"  value={fmt(s.entry)}      tone="default" />
        <Level label="Stop"   value={fmt(s.stopLoss)}   tone="loss" />
        <Level label="Target" value={fmt(s.takeProfit)} tone="gain" />
      </div>

      {/* R:R + rationale */}
      <div className="flex items-center justify-between text-[11px]">
        <div className="flex items-center gap-1.5">
          <Target size={11} className="text-pink-400" />
          <span className="text-[var(--muted-foreground)]">R:R</span>
          <span className="font-bold text-[var(--foreground)] tabular-nums">{s.rrRatio.toFixed(1)}</span>
        </div>
        <div className="flex items-center gap-1.5 text-[var(--muted-foreground)]">
          <Clock size={11} />
          <span>{timeAgo(s.postedAt)}</span>
        </div>
      </div>

      <p className="text-xs text-[var(--muted-foreground)] leading-relaxed">{s.rationale}</p>

      {/* Source footer */}
      <div className="flex items-center justify-between pt-3 border-t border-[var(--border)] text-[10px]">
        <div className="flex items-center gap-1.5 text-[var(--muted-foreground)]">
          <Radio size={10} />
          {s.source}
        </div>
        <button className="px-3 py-1 rounded-md bg-gradient-to-r from-orange-400 to-amber-400 text-slate-900 font-semibold text-[10px] hover:from-orange-300 hover:to-amber-300 transition-all">
          Log to journal
        </button>
      </div>
    </div>
  );
}

function Level({ label, value, tone }: { label: string; value: string; tone: 'default' | 'gain' | 'loss' }) {
  const color =
    tone === 'gain' ? 'text-emerald-300' :
    tone === 'loss' ? 'text-red-300' :
    'text-[var(--foreground)]';
  return (
    <div className="rounded-md border border-[var(--border)] bg-black/20 p-2">
      <div className="text-[8px] font-bold uppercase tracking-widest text-[var(--muted-foreground)]">{label}</div>
      <div className={`text-sm font-bold tabular-nums ${color}`}>{value}</div>
    </div>
  );
}

function fmt(n: number) {
  if (n >= 1000) return n.toLocaleString('en-US', { maximumFractionDigits: 0 });
  if (n < 10)   return n.toFixed(4);
  return n.toFixed(2);
}

function timeAgo(iso: string) {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.round(s / 60)}m ago`;
  if (s < 86400) return `${Math.round(s / 3600)}h ago`;
  return `${Math.round(s / 86400)}d ago`;
}
