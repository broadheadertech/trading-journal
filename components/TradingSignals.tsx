'use client';

import { useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { useUser } from '@clerk/nextjs';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { useSubscription } from '@/hooks/useSubscription';
import { Radio, TrendingUp, TrendingDown, Clock, Target, ShieldAlert, Star, Filter, Plus, Lock, X, Award, Flame } from 'lucide-react';

type Direction = 'long' | 'short';
type Strength = 'high' | 'medium' | 'low';
type Status = 'pending' | 'active' | 'won' | 'lost' | 'cancelled' | 'expired';
type Market = 'crypto' | 'forex' | 'stocks' | 'commodities';

type Signal = {
  _id: Id<'signals'>;
  posterId: string;
  posterName: string;
  posterTier: string;
  symbol: string;
  market: Market;
  direction: Direction;
  entry: number;
  stopLoss: number;
  takeProfit: number;
  rrRatio: number;
  strength: Strength;
  rationale: string;
  status: Status;
  postedAt: string;
  expiresAt?: string;
  closedAt?: string;
  actualR?: number;
};

const PRO_PLUS = new Set(['pro', 'elite', 'legend']);

export default function TradingSignals() {
  const { user } = useUser();
  const { planId } = useSubscription();
  const canPost = PRO_PLUS.has(planId);

  const [marketFilter, setMarketFilter] = useState<Market | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<Status | 'all'>('active');
  const [showPostModal, setShowPostModal] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);

  const signals = useQuery(api.signals.list, {
    market: marketFilter === 'all' ? undefined : marketFilter,
    status: statusFilter === 'all' ? undefined : statusFilter,
  }) as Signal[] | undefined;

  const leaderboard = useQuery(api.signals.leaderboard) ?? [];
  const updateStatus = useMutation(api.signals.updateStatus);

  const list = signals ?? [];
  const activeCount = list.filter(s => s.status === 'active').length;
  const pendingCount = list.filter(s => s.status === 'pending').length;

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
          {activeCount} active · {pendingCount} pending · community + AI signals
        </div>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="space-y-2">
            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-[var(--foreground)]">
              Trading <span className="gradient-text">signals</span>
            </h1>
            <p className="text-base text-[var(--muted-foreground)] max-w-2xl">
              High-conviction trade ideas from analysts and Pro+ subscribers. Each signal carries entry, stop, target, and
              the poster's lifetime hit-rate — use them as a starting point, never a substitute for your own playbook.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <button
              onClick={() => setShowLeaderboard(v => !v)}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] hover:bg-[var(--muted)]/50 transition-all"
            >
              <Award size={14} />
              {showLeaderboard ? 'Hide' : 'Show'} Leaderboard
            </button>
            {canPost ? (
              <button
                onClick={() => setShowPostModal(true)}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-slate-900 bg-gradient-to-r from-orange-400 to-amber-400 hover:from-orange-300 hover:to-amber-300 shadow-[0_0_20px_-4px_rgba(251,146,60,0.6)] transition-all"
              >
                <Plus size={14} /> Post a Signal
              </button>
            ) : (
              <button
                disabled
                title="Posting signals requires Pro, Elite, or Legend"
                className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-[var(--muted-foreground)] border border-[var(--border)] bg-[var(--card)] opacity-60 cursor-not-allowed"
              >
                <Lock size={14} /> Post (Pro+)
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Leaderboard */}
      {showLeaderboard && <Leaderboard rows={leaderboard} />}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-[var(--muted-foreground)]">
          <Filter size={11} /> Market
        </div>
        <div className="inline-flex items-center gap-1 p-1 rounded-full border border-[var(--border)] bg-[var(--card)]">
          {(['all', 'crypto', 'forex', 'stocks', 'commodities'] as const).map(f => (
            <button
              key={f}
              onClick={() => setMarketFilter(f)}
              className={`px-3 py-1 rounded-full text-[11px] font-semibold capitalize transition-all ${
                marketFilter === f
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
          {(['all', 'active', 'pending', 'won', 'lost'] as const).map(s => (
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

      {/* Cards */}
      {signals === undefined ? (
        <SignalsSkeleton />
      ) : list.length === 0 ? (
        <div className="text-center py-16 text-sm text-[var(--muted-foreground)]">
          No signals match your filters. {canPost && 'Be the first to post one.'}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {list.map(s => (
            <SignalCard
              key={s._id}
              signal={s}
              isOwn={s.posterId === user?.id}
              onUpdate={(status) => updateStatus({ id: s._id, status })}
            />
          ))}
        </div>
      )}

      {/* Disclaimer */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 flex items-start gap-3">
        <ShieldAlert size={18} className="text-amber-400 mt-0.5 shrink-0" />
        <div className="text-xs text-[var(--muted-foreground)] leading-relaxed">
          <span className="font-semibold text-[var(--foreground)]">Not financial advice. </span>
          Signals are user-posted research-driven trade ideas, not recommendations from Tradia. Run every signal through
          your playbook, your risk model, and your discipline check before sizing in. Posting requires a Pro+ subscription.
        </div>
      </div>

      {/* Post modal */}
      {showPostModal && canPost && (
        <PostSignalModal
          posterName={user?.fullName ?? user?.username ?? user?.firstName ?? 'Anonymous'}
          onClose={() => setShowPostModal(false)}
        />
      )}
    </div>
  );
}

function SignalsSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {[0, 1, 2, 3, 4, 5].map(i => (
        <div key={i} className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 animate-pulse h-64">
          <div className="h-10 w-32 rounded bg-[var(--muted)]/40 mb-3" />
          <div className="grid grid-cols-3 gap-2 mb-3">
            {[0, 1, 2].map(j => <div key={j} className="h-12 rounded bg-[var(--muted)]/30" />)}
          </div>
          <div className="h-3 rounded bg-[var(--muted)]/30 mb-2" />
          <div className="h-3 rounded bg-[var(--muted)]/30 w-3/4" />
        </div>
      ))}
    </div>
  );
}

function Leaderboard({ rows }: { rows: { posterId: string; posterName: string; tier: string; total: number; won: number; lost: number; activeOrPending: number; hitRate: number; avgR: number }[] }) {
  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 text-center text-sm text-[var(--muted-foreground)]">
        No closed signals yet — leaderboard fills as outcomes get marked.
      </div>
    );
  }
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] overflow-hidden">
      <div className="px-4 py-3 border-b border-[var(--border)] bg-black/20 flex items-center gap-2">
        <Award size={14} className="text-pink-400" />
        <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted-foreground)]">Analyst Leaderboard</span>
      </div>
      <div className="divide-y divide-[var(--border)]">
        {rows.slice(0, 10).map((r, i) => (
          <div key={r.posterId} className="px-4 py-3 flex items-center gap-3 hover:bg-[var(--muted)]/20 transition-colors">
            <span className={`w-6 text-center text-xs font-bold tabular-nums ${i === 0 ? 'text-amber-300' : i < 3 ? 'text-pink-300' : 'text-[var(--muted-foreground)]'}`}>
              #{i + 1}
            </span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-[var(--foreground)] truncate">{r.posterName}</span>
                <span className="text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded bg-pink-500/15 text-pink-400 border border-pink-500/30">
                  {r.tier}
                </span>
                {r.activeOrPending > 0 && (
                  <span className="text-[9px] text-emerald-400 inline-flex items-center gap-1">
                    <Flame size={9} />{r.activeOrPending} live
                  </span>
                )}
              </div>
              <div className="text-[10px] text-[var(--muted-foreground)] tabular-nums">
                {r.won}W / {r.lost}L · {r.total} closed
              </div>
            </div>
            <div className="text-right">
              <div className={`text-sm font-bold tabular-nums ${r.hitRate >= 0.6 ? 'text-emerald-400' : r.hitRate >= 0.4 ? 'text-amber-400' : 'text-red-400'}`}>
                {(r.hitRate * 100).toFixed(0)}%
              </div>
              <div className="text-[9px] text-[var(--muted-foreground)] tabular-nums">
                {r.avgR >= 0 ? '+' : ''}{r.avgR.toFixed(2)}R avg
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SignalCard({ signal: s, isOwn, onUpdate }: { signal: Signal; isOwn: boolean; onUpdate: (status: Status) => Promise<unknown> }) {
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
    s.status === 'won' ? 'text-emerald-300 bg-emerald-500/15 border-emerald-500/40' :
    s.status === 'lost' ? 'text-red-300 bg-red-500/15 border-red-500/40' :
    'text-[var(--muted-foreground)] bg-[var(--muted)]/30 border-[var(--border)]';

  const posterStats = useQuery(api.signals.posterStats, { posterId: s.posterId });

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 hover:border-pink-500/30 transition-colors flex flex-col gap-4">
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
            <Star size={9} />{s.strength}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Level label="Entry"  value={fmt(s.entry)}      tone="default" />
        <Level label="Stop"   value={fmt(s.stopLoss)}   tone="loss" />
        <Level label="Target" value={fmt(s.takeProfit)} tone="gain" />
      </div>

      <div className="flex items-center justify-between text-[11px]">
        <div className="flex items-center gap-1.5">
          <Target size={11} className="text-pink-400" />
          <span className="text-[var(--muted-foreground)]">R:R</span>
          <span className="font-bold text-[var(--foreground)] tabular-nums">{s.rrRatio.toFixed(1)}</span>
          {s.actualR !== undefined && (
            <span className={`tabular-nums ml-1 ${s.actualR > 0 ? 'text-emerald-400' : s.actualR < 0 ? 'text-red-400' : 'text-[var(--muted-foreground)]'}`}>
              ({s.actualR >= 0 ? '+' : ''}{s.actualR.toFixed(1)}R realized)
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 text-[var(--muted-foreground)]">
          <Clock size={11} />
          <span>{timeAgo(s.postedAt)}</span>
        </div>
      </div>

      <p className="text-xs text-[var(--muted-foreground)] leading-relaxed">{s.rationale}</p>

      <div className="flex items-center justify-between pt-3 border-t border-[var(--border)] text-[10px]">
        <div className="flex items-center gap-1.5 text-[var(--muted-foreground)]">
          <Radio size={10} />
          <span className="font-medium text-[var(--foreground)]">{s.posterName}</span>
          {posterStats && posterStats.total > 0 && (
            <span className={`ml-1 ${posterStats.hitRate >= 0.6 ? 'text-emerald-400' : posterStats.hitRate >= 0.4 ? 'text-amber-400' : 'text-red-400'}`}>
              · {(posterStats.hitRate * 100).toFixed(0)}% on {posterStats.total}
            </span>
          )}
        </div>
        {isOwn && (s.status === 'pending' || s.status === 'active') ? (
          <div className="flex items-center gap-1">
            {s.status === 'pending' && (
              <button onClick={() => onUpdate('active')}    className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 transition-colors">Activate</button>
            )}
            <button onClick={() => onUpdate('won')}        className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 transition-colors">TP hit</button>
            <button onClick={() => onUpdate('lost')}       className="px-2 py-0.5 rounded text-[10px] bg-red-500/20 text-red-300 hover:bg-red-500/30 transition-colors">SL hit</button>
            <button onClick={() => onUpdate('cancelled')}  className="px-2 py-0.5 rounded text-[10px] bg-[var(--muted)]/40 text-[var(--muted-foreground)] hover:bg-[var(--muted)]/60 transition-colors">Cancel</button>
          </div>
        ) : null}
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

function PostSignalModal({ posterName, onClose }: { posterName: string; onClose: () => void }) {
  const post = useMutation(api.signals.post);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [symbol, setSymbol] = useState('');
  const [market, setMarket] = useState<Market>('crypto');
  const [direction, setDirection] = useState<Direction>('long');
  const [entry, setEntry] = useState('');
  const [stopLoss, setStopLoss] = useState('');
  const [takeProfit, setTakeProfit] = useState('');
  const [strength, setStrength] = useState<Strength>('medium');
  const [rationale, setRationale] = useState('');

  const entryNum = parseFloat(entry);
  const slNum = parseFloat(stopLoss);
  const tpNum = parseFloat(takeProfit);
  const validNumbers = [entryNum, slNum, tpNum].every(n => Number.isFinite(n) && n > 0);

  const risk = validNumbers ? Math.abs(entryNum - slNum) : 0;
  const reward = validNumbers ? Math.abs(tpNum - entryNum) : 0;
  const previewRR = risk > 0 ? reward / risk : 0;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!symbol.trim()) { setError('Symbol is required.'); return; }
    if (!validNumbers) { setError('Entry, stop, and target must be positive numbers.'); return; }
    if (!rationale.trim() || rationale.trim().length < 10) { setError('Rationale must be at least 10 characters.'); return; }

    setSubmitting(true);
    try {
      await post({
        posterName,
        symbol: symbol.trim(),
        market,
        direction,
        entry: entryNum,
        stopLoss: slNum,
        takeProfit: tpNum,
        strength,
        rationale: rationale.trim(),
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to post signal.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <form onSubmit={submit} className="relative w-full max-w-lg rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 flex items-center justify-between p-5 border-b border-[var(--border)] bg-[var(--card)] z-10">
          <div className="flex items-center gap-2">
            <Radio size={16} className="text-pink-400" />
            <h2 className="text-lg font-bold text-[var(--foreground)]">Post a trading signal</h2>
          </div>
          <button type="button" onClick={onClose} className="p-1 rounded hover:bg-[var(--muted)]/50 transition-colors">
            <X size={18} className="text-[var(--muted-foreground)]" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Symbol">
              <input value={symbol} onChange={e => setSymbol(e.target.value.toUpperCase())} placeholder="BTCUSDT" maxLength={20} />
            </Field>
            <Field label="Market">
              <select value={market} onChange={e => setMarket(e.target.value as Market)}>
                <option value="crypto">Crypto</option>
                <option value="forex">Forex</option>
                <option value="stocks">Stocks</option>
                <option value="commodities">Commodities</option>
              </select>
            </Field>
          </div>

          <Field label="Direction">
            <div className="inline-flex items-center gap-1 p-1 rounded-full border border-[var(--border)] bg-black/20 w-full">
              <button type="button" onClick={() => setDirection('long')}
                className={`flex-1 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${direction === 'long' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'text-[var(--muted-foreground)]'}`}>
                Long
              </button>
              <button type="button" onClick={() => setDirection('short')}
                className={`flex-1 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${direction === 'short' ? 'bg-red-500/20 text-red-300 border border-red-500/40' : 'text-[var(--muted-foreground)]'}`}>
                Short
              </button>
            </div>
          </Field>

          <div className="grid grid-cols-3 gap-3">
            <Field label="Entry">
              <input type="number" step="any" value={entry} onChange={e => setEntry(e.target.value)} placeholder="67240" />
            </Field>
            <Field label="Stop">
              <input type="number" step="any" value={stopLoss} onChange={e => setStopLoss(e.target.value)} placeholder="65800" />
            </Field>
            <Field label="Target">
              <input type="number" step="any" value={takeProfit} onChange={e => setTakeProfit(e.target.value)} placeholder="71100" />
            </Field>
          </div>

          {validNumbers && (
            <div className="text-xs text-[var(--muted-foreground)] tabular-nums">
              Computed R:R: <span className={`font-bold ${previewRR >= 2 ? 'text-emerald-400' : previewRR >= 1 ? 'text-amber-400' : 'text-red-400'}`}>{previewRR.toFixed(2)}</span>
            </div>
          )}

          <Field label="Conviction">
            <div className="inline-flex items-center gap-1 p-1 rounded-full border border-[var(--border)] bg-black/20 w-full">
              {(['low', 'medium', 'high'] as Strength[]).map(s => (
                <button key={s} type="button" onClick={() => setStrength(s)}
                  className={`flex-1 px-3 py-1.5 rounded-full text-xs font-semibold capitalize transition-all ${strength === s ? 'bg-pink-500/20 text-pink-300 border border-pink-500/40' : 'text-[var(--muted-foreground)]'}`}>
                  {s}
                </button>
              ))}
            </div>
          </Field>

          <Field label="Rationale (≥10 chars)">
            <textarea value={rationale} onChange={e => setRationale(e.target.value)} rows={3} placeholder="Why this trade? Levels, catalysts, invalidation..." maxLength={500} />
            <div className="text-[10px] text-[var(--muted-foreground)] text-right mt-1">{rationale.length}/500</div>
          </Field>

          {error && <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/30 rounded px-3 py-2">{error}</div>}

          <div className="flex items-center justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-medium text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={submitting}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold text-slate-900 bg-gradient-to-r from-orange-400 to-amber-400 hover:from-orange-300 hover:to-amber-300 shadow-[0_0_20px_-4px_rgba(251,146,60,0.6)] transition-all disabled:opacity-50">
              {submitting ? 'Posting...' : 'Post Signal'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted-foreground)] mb-1.5">{label}</div>
      {children}
    </label>
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
