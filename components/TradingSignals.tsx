'use client';

import { useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { useUser } from '@clerk/nextjs';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { useSubscription } from '@/hooks/useSubscription';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { Radio, Clock, Target, ShieldAlert, Filter, Plus, Lock, X, Award, Flame, AlertTriangle, ArrowUpRight, ArrowDownRight, Minus, Trash2, XCircle, Ban, Eye, EyeOff, History } from 'lucide-react';

type Direction = 'long' | 'short';
type OrderType = 'market' | 'stop' | 'limit';
type RiskLevel = 'high' | 'medium' | 'low';
type Status = 'pending' | 'active' | 'won' | 'lost' | 'cancelled' | 'expired';
type Market = 'crypto' | 'forex' | 'stocks' | 'commodities';

// Display label combining direction + order type
function orderLabel(direction: Direction, orderType: OrderType | undefined): string {
  const verb = direction === 'long' ? 'BUY' : 'SELL';
  if (!orderType || orderType === 'market') return `${verb} (MARKET)`;
  if (orderType === 'stop') return `${verb} STOP`;
  return `${verb} LIMIT`;
}

type Signal = {
  _id: Id<'signals'>;
  posterId: string;
  posterName: string;
  posterTier: string;
  symbol: string;
  market: Market;
  direction: Direction;
  orderType?: OrderType;
  entryLow: number;
  entryHigh: number;
  stopLoss: number;
  takeProfits: number[];
  rrRatio: number;
  riskLevel: RiskLevel;
  rationale: string;
  status: Status;
  tpHit?: number;
  postedAt: string;
  expiresAt?: string;
  closedAt?: string;
  actualR?: number;
  pipSize?: number;
  lotSize?: number;
};

// Core+ during BETA — every registered user is auto-elevated to Core, so they can post.
const PRO_PLUS = new Set(['core', 'pro', 'elite']);

// ─── Pip / point conversion per market & symbol ───────────────────────
// Defaults follow MT4/MT5 broker convention. Gold default: 1 pip = $0.01
// (so a $10 move = 1000 pips). Posters can override per signal if their
// broker uses a different convention.
function defaultPipSize(market: Market, symbol: string): number {
  const sym = symbol.toUpperCase();
  if (sym.startsWith('XAU') || sym === 'GOLD') return 0.01;     // MT4 standard
  if (sym.startsWith('XAG') || sym === 'SILVER') return 0.001;
  if (market === 'forex') return sym.includes('JPY') ? 0.01 : 0.0001;
  if (market === 'commodities') return 0.01;
  if (market === 'stocks') return 0.01;
  return 1;  // crypto: per-dollar
}

function defaultLotSize(market: Market, symbol: string): number {
  const sym = symbol.toUpperCase();
  if (sym.startsWith('XAU') || sym === 'GOLD') return 100;       // 100 oz / standard lot
  if (sym.startsWith('XAG') || sym === 'SILVER') return 5000;    // 5000 oz / standard lot
  if (market === 'forex') return 100_000;                        // 1 standard lot
  return 1;
}

function fmtPips(market: Market, symbol: string, from: number, to: number, override?: number): string {
  const size = override ?? defaultPipSize(market, symbol);
  const diff = (to - from) / size;
  const abs = Math.round(Math.abs(diff));
  const sign = diff >= 0 ? '+' : '−';
  if (market === 'crypto') return `${sign}$${abs.toLocaleString()}`;
  if (market === 'stocks') return `${sign}${abs}¢`;
  return `${sign}${abs.toLocaleString()}pips`;
}

// Worst-case entry for the direction. For LONG, you assume the highest fill
// in the entry zone (smallest gain to TP, largest distance to SL). For SHORT,
// the lowest. This matches the convention your example uses (entryHigh = 4700
// → TP1 at 4710 = "+100 pips" rather than midpoint).
function refEntry(direction: Direction, entryLow: number, entryHigh: number): number {
  return direction === 'long' ? entryHigh : entryLow;
}

function fmtPriceUnit(market: Market, pip: number): string {
  if (market === 'crypto') return `$${pip}`;
  if (market === 'stocks') return `${(pip * 100).toFixed(0)}¢`;
  return `$${pip}`;
}

export default function TradingSignals() {
  const { user } = useUser();
  const { planId } = useSubscription();
  const canPost = PRO_PLUS.has(planId);

  const [marketFilter, setMarketFilter] = useState<Market | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<Status | 'all'>('active');
  const [showPostModal, setShowPostModal] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showPips, setShowPips] = useLocalStorage<boolean>('crypto-journal-signals-show-pips', true);
  const [historyPoster, setHistoryPoster] = useState<{ id: string; name: string } | null>(null);

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
              Telegram-style trade ideas from analysts and Pro+ subscribers — entry zone, single SL, and laddered take-profits.
              Each signal carries the poster's lifetime hit-rate.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <button
              onClick={() => setShowPips(v => !v)}
              title={showPips ? 'Hide pip annotations on every signal' : 'Show pip annotations on every signal'}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] hover:bg-[var(--muted)]/50 transition-all"
            >
              {showPips ? <EyeOff size={14} /> : <Eye size={14} />}
              {showPips ? 'Hide pips' : 'Show pips'}
            </button>
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
                title="Posting signals requires a paid subscription (Core, Pro, or Elite)"
                className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-[var(--muted-foreground)] border border-[var(--border)] bg-[var(--card)] opacity-60 cursor-not-allowed"
              >
                <Lock size={14} /> Post (Core+)
              </button>
            )}
          </div>
        </div>
      </header>

      {showLeaderboard && <Leaderboard rows={leaderboard} />}

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

      {signals === undefined ? (
        <SignalsSkeleton />
      ) : list.length === 0 ? (
        <div className="text-center py-16 text-sm text-[var(--muted-foreground)]">
          No signals match your filters. {canPost && 'Be the first to post one.'}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {list.map(s => (
            <SignalCard
              key={s._id}
              signal={s}
              isOwn={s.posterId === user?.id}
              showPips={showPips}
              onUpdate={(status, tpHit) => updateStatus({ id: s._id, status, tpHit })}
              onViewHistory={(id, name) => setHistoryPoster({ id, name })}
            />
          ))}
        </div>
      )}

      <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 flex items-start gap-3">
        <ShieldAlert size={18} className="text-amber-400 mt-0.5 shrink-0" />
        <div className="text-xs text-[var(--muted-foreground)] leading-relaxed">
          <span className="font-semibold text-[var(--foreground)]">Not financial advice. </span>
          Signals are user-posted research-driven trade ideas, not recommendations from Tradia. Run every signal through
          your playbook, your risk model, and your discipline check before sizing in.
        </div>
      </div>

      {showPostModal && canPost && (
        <PostSignalModal
          posterName={user?.fullName ?? user?.username ?? user?.firstName ?? 'Anonymous'}
          showPips={showPips}
          onClose={() => setShowPostModal(false)}
          onPosted={() => { setStatusFilter('active'); setMarketFilter('all'); }}
        />
      )}

      {historyPoster && (
        <SignalHistoryModal
          posterId={historyPoster.id}
          posterName={historyPoster.name}
          showPips={showPips}
          currentUserId={user?.id}
          onUpdate={(id, status, tpHit) => updateStatus({ id, status, tpHit })}
          onViewHistory={(id, name) => setHistoryPoster({ id, name })}
          onClose={() => setHistoryPoster(null)}
        />
      )}
    </div>
  );
}

function SignalsSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {[0, 1, 2, 3].map(i => (
        <div key={i} className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 animate-pulse h-80">
          <div className="h-10 w-40 rounded bg-[var(--muted)]/40 mb-3" />
          <div className="h-3 rounded bg-[var(--muted)]/30 mb-2 w-2/3" />
          <div className="space-y-2 mt-4">
            {[0, 1, 2, 3].map(j => <div key={j} className="h-3 rounded bg-[var(--muted)]/20" />)}
          </div>
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
              <div className={`text-sm font-bold tabular-nums ${r.hitRate >= 0.6 ? 'text-emerald-400' : r.hitRate >= 0.4 ? 'text-amber-400' : 'text-amber-500'}`}>
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

// ─── Telegram-style signal card ───────────────────────────────────────
function SignalCard({ signal: s, isOwn, showPips, onUpdate, onViewHistory }: {
  signal: Signal;
  isOwn: boolean;
  showPips: boolean;
  onUpdate: (status: Status, tpHit?: number) => Promise<unknown>;
  onViewHistory: (posterId: string, posterName: string) => void;
}) {
  const isLong = s.direction === 'long';
  const DirIcon = isLong ? ArrowUpRight : ArrowDownRight;
  const dirColor = isLong ? 'text-emerald-400' : 'text-red-400';
  const action = orderLabel(s.direction, s.orderType);

  const riskBadge =
    s.riskLevel === 'high' ? { color: 'text-amber-300 bg-amber-500/15 border-amber-500/40', label: '⚠️ High Risk ⚠️' } :
    s.riskLevel === 'medium' ? { color: 'text-amber-300 bg-amber-500/15 border-amber-500/40', label: 'Medium Risk' } :
    { color: 'text-emerald-300 bg-emerald-500/15 border-emerald-500/40', label: 'Low Risk' };

  const statusColor =
    s.status === 'active' ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' :
    s.status === 'pending' ? 'text-amber-300 bg-amber-500/10 border-amber-500/30' :
    s.status === 'won' ? 'text-emerald-300 bg-emerald-500/15 border-emerald-500/40' :
    s.status === 'lost' ? 'text-red-300 bg-red-500/15 border-red-500/40' :
    'text-[var(--muted-foreground)] bg-[var(--muted)]/30 border-[var(--border)]';

  const posterStats = useQuery(api.signals.posterStats, { posterId: s.posterId });

  const entryLabel = s.entryLow === s.entryHigh ? fmt(s.entryLow) : `${fmt(s.entryLow)}–${fmt(s.entryHigh)}`;
  const entryRef = refEntry(s.direction, s.entryLow, s.entryHigh);

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] overflow-hidden flex flex-col hover:border-pink-500/30 transition-colors">
      {/* Header: date + risk badge */}
      <div className="px-5 py-3 border-b border-[var(--border)] bg-black/20 flex items-center justify-between gap-3">
        <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted-foreground)]">
          {new Date(s.postedAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
        </span>
        <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border inline-flex items-center gap-1 ${riskBadge.color}`}>
          {s.riskLevel === 'high' && <AlertTriangle size={10} />}
          {riskBadge.label}
        </span>
      </div>

      {/* Symbol + action */}
      <div className="px-5 pt-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <DirIcon size={22} className={dirColor} />
          <div>
            <div className="flex items-baseline gap-2">
              <h3 className="text-2xl font-bold text-[var(--foreground)] tabular-nums tracking-tight">{s.symbol}</h3>
              <span className={`text-base font-bold tracking-widest ${dirColor}`}>{action}</span>
            </div>
            <div className="text-[10px] uppercase tracking-widest text-[var(--muted-foreground)] mt-0.5">{s.market}</div>
          </div>
        </div>
        <span className={`text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border ${statusColor}`}>
          {s.status}{s.tpHit ? ` · TP${s.tpHit}` : ''}
        </span>
      </div>

      {/* Poster + winrate badge */}
      <div className="px-5 pt-2 flex items-center gap-2 flex-wrap">
        <button
          type="button"
          onClick={() => onViewHistory(s.posterId, s.posterName)}
          title={`View ${s.posterName}'s signal history`}
          className="flex items-center gap-1.5 text-[11px] text-[var(--muted-foreground)] hover:text-pink-300 transition-colors group"
        >
          <Radio size={11} className="text-pink-400" />
          <span className="font-semibold text-[var(--foreground)] group-hover:text-pink-300 group-hover:underline">{s.posterName}</span>
          <History size={11} className="opacity-60 group-hover:opacity-100" />
        </button>
        <PosterWinRateBadge stats={posterStats} />
      </div>

      {/* Levels */}
      <div className="px-5 py-4 space-y-1.5 font-mono text-sm">
        <div className="flex items-center gap-3">
          <span className="text-[var(--muted-foreground)] w-14 shrink-0">ENTRY:</span>
          <span className="text-[var(--foreground)] font-bold tabular-nums">{entryLabel}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[var(--muted-foreground)] w-14 shrink-0">SL:</span>
          <span className="text-red-300 font-bold tabular-nums">{fmt(s.stopLoss)}</span>
          {showPips && (
            <span className="text-[10px] text-red-400/70 tabular-nums">{fmtPips(s.market, s.symbol, entryRef, s.stopLoss, s.pipSize)}</span>
          )}
        </div>

        <div className="pt-1.5 mt-1.5 border-t border-[var(--border)] space-y-1">
          {s.takeProfits.map((tp, i) => {
            const hit = s.tpHit && i + 1 <= s.tpHit;
            return (
              <div key={i} className={`flex items-center gap-3 ${hit ? 'text-emerald-300' : ''}`}>
                <span className={`w-14 shrink-0 ${hit ? 'text-emerald-400 font-bold' : 'text-[var(--muted-foreground)]'}`}>
                  TP{i + 1}:
                </span>
                <span className={`font-bold tabular-nums ${hit ? 'text-emerald-300' : 'text-emerald-300/90'}`}>
                  {fmt(tp)}
                </span>
                {showPips && (
                  <span className="text-[10px] text-emerald-400/60 tabular-nums">
                    {fmtPips(s.market, s.symbol, entryRef, tp, s.pipSize)}
                  </span>
                )}
                {hit && (
                  <span className="ml-auto inline-flex items-center justify-center w-7 h-7 rounded-full bg-emerald-500/15 ring-2 ring-emerald-400/60 animate-[pulse_2.5s_ease-in-out_infinite]" title={`TP${i + 1} hit`}>
                    <Target size={18} className="text-emerald-400" strokeWidth={2.5} />
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Pip / lot reference */}
        {showPips && (
          <div className="pt-2 mt-2 border-t border-[var(--border)] flex items-center gap-3 text-[10px] text-[var(--muted-foreground)] tabular-nums">
            <span>1 pip = {fmtPriceUnit(s.market, s.pipSize ?? defaultPipSize(s.market, s.symbol))}</span>
            {(s.lotSize !== undefined) && <span>· {s.lotSize.toLocaleString()} units / lot</span>}
            {(s.pipSize !== undefined && s.pipSize !== defaultPipSize(s.market, s.symbol)) && (
              <span className="text-pink-400">· custom</span>
            )}
          </div>
        )}
      </div>

      {/* Rationale */}
      {s.rationale && (
        <div className="px-5 pb-3 text-xs text-[var(--muted-foreground)] leading-relaxed border-t border-[var(--border)] pt-3">
          {s.rationale}
        </div>
      )}

      {/* Footer */}
      <div className="px-5 py-3 border-t border-[var(--border)] flex items-center justify-between text-[10px] mt-auto bg-black/10">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 text-[var(--muted-foreground)]">
            <Target size={10} className="text-pink-400" />
            <span className="tabular-nums">R:R {s.rrRatio.toFixed(1)}</span>
            {s.actualR !== undefined && (
              <span className={`tabular-nums ml-1 ${s.actualR > 0 ? 'text-emerald-400' : s.actualR < 0 ? 'text-red-400' : 'text-[var(--muted-foreground)]'}`}>
                ({s.actualR >= 0 ? '+' : ''}{s.actualR.toFixed(1)}R)
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 text-[var(--muted-foreground)]">
            <Clock size={10} />
            <span>{timeAgo(s.postedAt)}</span>
          </div>
        </div>

        {isOwn && (s.status === 'pending' || s.status === 'active') && (
          <OwnerActions takeProfits={s.takeProfits} onUpdate={onUpdate} status={s.status} />
        )}
      </div>
    </div>
  );
}

type PosterStats = { posterId: string; total: number; won: number; hitRate: number } | undefined;

function PosterWinRateBadge({ stats }: { stats: PosterStats }) {
  // Loading state — query in flight
  if (stats === undefined) {
    return (
      <span className="text-xs px-2.5 py-1 rounded-full bg-[var(--muted)]/30 border border-[var(--border)] text-[var(--muted-foreground)] animate-pulse">
        Loading…
      </span>
    );
  }

  // New poster — no closed signals yet
  if (stats.total === 0) {
    return (
      <span className="text-xs font-bold px-2.5 py-1 rounded-full border bg-pink-500/10 text-pink-300 border-pink-500/30 inline-flex items-center gap-1">
        ✨ New analyst
      </span>
    );
  }

  // Tier the badge color by hit rate — emerald (great), pink (good), amber (mediocre)
  const pct = Math.round(stats.hitRate * 100);
  const tone =
    stats.hitRate >= 0.6 ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40' :
    stats.hitRate >= 0.4 ? 'bg-pink-500/10 text-pink-300 border-pink-500/30' :
                            'bg-amber-500/10 text-amber-300 border-amber-500/30';

  return (
    <span className={`px-3 py-1 rounded-full border tabular-nums inline-flex items-baseline gap-1.5 ${tone}`}>
      <span className="text-base leading-none">🎯</span>
      <span className="text-lg font-extrabold leading-none">{pct}%</span>
      <span className="text-[10px] font-bold uppercase tracking-wider leading-none">win rate</span>
      <span className="text-[10px] opacity-60 font-normal leading-none">· {stats.won}/{stats.total}</span>
    </span>
  );
}

function OwnerActions({ takeProfits, onUpdate, status }: { takeProfits: number[]; onUpdate: (status: Status, tpHit?: number) => Promise<unknown>; status: Status }) {
  const [tpPickerOpen, setTpPickerOpen] = useState(false);

  return (
    <div className="flex items-center gap-1 relative">
      {status === 'pending' && (
        <button onClick={() => onUpdate('active')} title="Mark active" className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 transition-colors">
          Activate
        </button>
      )}

      {takeProfits.length > 1 ? (
        <>
          <button onClick={() => setTpPickerOpen(v => !v)} title="Mark TP hit" className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 transition-colors inline-flex items-center gap-1">
            <Target size={10} strokeWidth={2.5} /> TP hit
          </button>
          {tpPickerOpen && (
            <div className="absolute bottom-full right-0 mb-1 rounded-lg border border-[var(--border)] bg-[var(--card)] shadow-lg p-1 flex flex-col z-10">
              {takeProfits.map((_, i) => (
                <button
                  key={i}
                  onClick={() => { onUpdate('won', i + 1); setTpPickerOpen(false); }}
                  className="px-3 py-1 text-[10px] text-emerald-300 hover:bg-emerald-500/15 rounded transition-colors text-left"
                >
                  TP{i + 1} hit
                </button>
              ))}
            </div>
          )}
        </>
      ) : (
        <button onClick={() => onUpdate('won', 1)} title="TP hit" className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 transition-colors inline-flex items-center gap-1">
          <Target size={10} strokeWidth={2.5} /> TP hit
        </button>
      )}

      <button onClick={() => onUpdate('lost')} title="SL hit" className="px-2 py-0.5 rounded text-[10px] bg-red-500/20 text-red-300 hover:bg-red-500/30 transition-colors inline-flex items-center gap-1">
        <XCircle size={10} /> SL
      </button>
      <button onClick={() => onUpdate('cancelled')} title="Cancel signal" className="px-2 py-0.5 rounded text-[10px] bg-[var(--muted)]/40 text-[var(--muted-foreground)] hover:bg-[var(--muted)]/60 transition-colors inline-flex items-center gap-1">
        <Ban size={10} />
      </button>
    </div>
  );
}

// ─── Post modal ───────────────────────────────────────────────────────
function PostSignalModal({ posterName, showPips, onClose, onPosted }: { posterName: string; showPips: boolean; onClose: () => void; onPosted?: () => void }) {
  const post = useMutation(api.signals.post);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [symbol, setSymbol] = useState('');
  const [market, setMarket] = useState<Market>('commodities');
  const [direction, setDirection] = useState<Direction>('long');
  const [orderType, setOrderType] = useState<OrderType>('market');
  const [entryLow, setEntryLow] = useState('');
  const [entryHigh, setEntryHigh] = useState('');
  const [stopLoss, setStopLoss] = useState('');
  const [tpInputs, setTpInputs] = useState<string[]>(['']);
  const [riskLevel, setRiskLevel] = useState<RiskLevel>('high');
  const [rationale, setRationale] = useState('');
  const [showAdjust, setShowAdjust] = useState(false);
  const [pipSize, setPipSize] = useState('');
  const [lotSize, setLotSize] = useState('');

  const computedDefaultPip = defaultPipSize(market, symbol || 'X');
  const computedDefaultLot = defaultLotSize(market, symbol || 'X');
  const effectivePip = pipSize.trim() ? parseFloat(pipSize) : computedDefaultPip;
  const effectiveLot = lotSize.trim() ? parseFloat(lotSize) : computedDefaultLot;

  const entryLowNum = parseFloat(entryLow);
  const entryHighNum = parseFloat(entryHigh || entryLow);
  const slNum = parseFloat(stopLoss);
  const tpNums = tpInputs.map(t => parseFloat(t)).filter(n => Number.isFinite(n) && n > 0);

  const allBaseValid = [entryLowNum, entryHighNum, slNum].every(n => Number.isFinite(n) && n > 0);
  const entryRef = allBaseValid ? refEntry(direction, entryLowNum, entryHighNum) : 0;
  const previewRR = allBaseValid && tpNums[0]
    ? Math.abs(tpNums[0] - entryRef) / Math.max(0.0000001, Math.abs(entryRef - slNum))
    : 0;

  function addTp() {
    setTpInputs([...tpInputs, '']);
  }
  function removeTp(i: number) {
    if (tpInputs.length === 1) return;
    setTpInputs(tpInputs.filter((_, idx) => idx !== i));
  }
  function setTp(i: number, v: string) {
    const next = [...tpInputs];
    next[i] = v;
    setTpInputs(next);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!symbol.trim()) { setError('Symbol is required.'); return; }
    if (!allBaseValid) { setError('Entry, stop, and at least one TP must be positive numbers.'); return; }
    if (entryLowNum > entryHighNum) { setError('Entry low must be ≤ entry high.'); return; }
    if (tpNums.length === 0) { setError('At least one take-profit is required.'); return; }
    if (rationale.trim().length < 10) { setError('Rationale must be at least 10 characters.'); return; }

    const customPip = pipSize.trim() ? parseFloat(pipSize) : NaN;
    const customLot = lotSize.trim() ? parseFloat(lotSize) : NaN;
    if (pipSize.trim() && (!Number.isFinite(customPip) || customPip <= 0)) { setError('Pip size must be a positive number.'); return; }
    if (lotSize.trim() && (!Number.isFinite(customLot) || customLot <= 0)) { setError('Lot size must be a positive number.'); return; }

    setSubmitting(true);
    try {
      await post({
        posterName,
        symbol: symbol.trim(),
        market,
        direction,
        orderType,
        entryLow: entryLowNum,
        entryHigh: entryHighNum,
        stopLoss: slNum,
        takeProfits: tpNums,
        riskLevel,
        rationale: rationale.trim(),
        pipSize: Number.isFinite(customPip) ? customPip : undefined,
        lotSize: Number.isFinite(customLot) ? customLot : undefined,
      });
      onPosted?.();
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
              <input value={symbol} onChange={e => setSymbol(e.target.value.toUpperCase())} placeholder="XAUUSD" maxLength={20} />
            </Field>
            <Field label="Market">
              <select value={market} onChange={e => setMarket(e.target.value as Market)}>
                <option value="commodities">Commodities</option>
                <option value="forex">Forex</option>
                <option value="crypto">Crypto</option>
                <option value="stocks">Stocks</option>
              </select>
            </Field>
          </div>

          <Field label="Order">
            <div className="grid grid-cols-3 gap-1.5 p-1 rounded-2xl border border-[var(--border)] bg-black/20">
              {([
                { dir: 'long',  type: 'market', label: 'BUY (Market)',  cls: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' },
                { dir: 'long',  type: 'stop',   label: 'BUY STOP',      cls: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' },
                { dir: 'long',  type: 'limit',  label: 'BUY LIMIT',     cls: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' },
                { dir: 'short', type: 'market', label: 'SELL (Market)', cls: 'bg-red-500/20 text-red-300 border-red-500/40' },
                { dir: 'short', type: 'stop',   label: 'SELL STOP',     cls: 'bg-red-500/20 text-red-300 border-red-500/40' },
                { dir: 'short', type: 'limit',  label: 'SELL LIMIT',    cls: 'bg-red-500/20 text-red-300 border-red-500/40' },
              ] as { dir: Direction; type: OrderType; label: string; cls: string }[]).map(o => {
                const active = direction === o.dir && orderType === o.type;
                return (
                  <button key={o.label} type="button"
                    onClick={() => { setDirection(o.dir); setOrderType(o.type); }}
                    className={`px-2 py-2 rounded-xl text-[11px] font-bold tracking-wide transition-all border ${active ? o.cls : 'border-transparent text-[var(--muted-foreground)] hover:text-[var(--foreground)]'}`}>
                    {o.label}
                  </button>
                );
              })}
            </div>
          </Field>

          <div className="grid grid-cols-1 gap-3">
            <Field label="Risk Level">
              <div className="inline-flex items-center gap-1 p-1 rounded-full border border-[var(--border)] bg-black/20 w-full">
                {(['low', 'medium', 'high'] as RiskLevel[]).map(r => (
                  <button key={r} type="button" onClick={() => setRiskLevel(r)}
                    className={`flex-1 px-2 py-1.5 rounded-full text-xs font-semibold capitalize transition-all ${
                      riskLevel === r
                        ? r === 'high' ? 'bg-amber-600/25 text-amber-200 border border-amber-500/50'
                          : r === 'medium' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                          : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : 'text-[var(--muted-foreground)]'
                    }`}>
                    {r}
                  </button>
                ))}
              </div>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Entry Low">
              <input type="number" step="any" value={entryLow} onChange={e => setEntryLow(e.target.value)} placeholder="4685" />
            </Field>
            <Field label="Entry High (optional)">
              <input type="number" step="any" value={entryHigh} onChange={e => setEntryHigh(e.target.value)} placeholder="4700 (leave blank for single price)" />
            </Field>
          </div>

          <Field label="Stop Loss">
            <input type="number" step="any" value={stopLoss} onChange={e => setStopLoss(e.target.value)} placeholder="4675" />
          </Field>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted-foreground)]">
                Take Profits ({tpInputs.length}) <span className="opacity-60 normal-case font-normal tracking-normal">· no limit</span>
              </div>
              <button type="button" onClick={addTp}
                className="inline-flex items-center gap-1 text-[10px] text-pink-400 hover:text-pink-300 transition-colors">
                <Plus size={10} /> Add TP
              </button>
            </div>
            <div className="space-y-1.5">
              {tpInputs.map((v, i) => {
                const tpNum = parseFloat(v);
                const showTpPips = showPips && Number.isFinite(tpNum) && tpNum > 0 && allBaseValid;
                return (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-[var(--muted-foreground)] w-10 shrink-0 tabular-nums">TP{i + 1}</span>
                    <input
                      type="number"
                      step="any"
                      value={v}
                      onChange={e => setTp(i, e.target.value)}
                      placeholder={`Target ${i + 1}`}
                      className="flex-1"
                    />
                    {showTpPips && (
                      <span className="text-[10px] text-emerald-400/80 tabular-nums w-20 text-right">
                        {fmtPips(market, symbol || 'X', entryRef, tpNum, effectivePip)}
                      </span>
                    )}
                    <button type="button" onClick={() => removeTp(i)} disabled={tpInputs.length === 1}
                      className="p-1 rounded text-[var(--muted-foreground)] hover:text-amber-400 transition-colors disabled:opacity-30">
                      {tpInputs.length === 1 ? <Minus size={12} /> : <Trash2 size={12} />}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {previewRR > 0 && (
            <div className="text-xs text-[var(--muted-foreground)] tabular-nums">
              R:R (vs TP1): <span className={`font-bold ${previewRR >= 2 ? 'text-emerald-400' : previewRR >= 1 ? 'text-amber-400' : 'text-amber-500'}`}>{previewRR.toFixed(2)}</span>
            </div>
          )}

          {/* Adjust pip & lot */}
          <div className="rounded-xl border border-[var(--border)] bg-black/10">
            <button
              type="button"
              onClick={() => setShowAdjust(v => !v)}
              className="w-full px-3 py-2 flex items-center justify-between text-xs font-semibold text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
            >
              <span>Adjust pip / lot size{(pipSize.trim() || lotSize.trim()) ? ' · custom' : ' · using defaults'}</span>
              <span className="text-[10px]">{showAdjust ? '▾' : '▸'}</span>
            </button>
            {showAdjust && (
              <div className="px-3 pb-3 space-y-3 border-t border-[var(--border)]">
                <div className="text-[10px] text-[var(--muted-foreground)] leading-relaxed pt-2">
                  Defaults match MT4/MT5 broker convention. For {symbol || 'this symbol'} ({market}):
                  <span className="text-pink-400 ml-1">1 pip = {fmtPriceUnit(market, computedDefaultPip)}</span>
                  <span className="ml-1">·</span>
                  <span className="text-pink-400 ml-1">{computedDefaultLot.toLocaleString()} units / lot</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Pip size (override)">
                    <input
                      type="number"
                      step="any"
                      value={pipSize}
                      onChange={e => setPipSize(e.target.value)}
                      placeholder={String(computedDefaultPip)}
                    />
                  </Field>
                  <Field label="Lot size (units)">
                    <input
                      type="number"
                      step="any"
                      value={lotSize}
                      onChange={e => setLotSize(e.target.value)}
                      placeholder={String(computedDefaultLot)}
                    />
                  </Field>
                </div>
                {showPips && effectivePip > 0 && allBaseValid && tpNums[0] && (
                  <div className="text-[10px] text-emerald-400/80 tabular-nums">
                    Preview with current settings: TP1 = {fmtPips(market, symbol || 'X', entryRef, tpNums[0], effectivePip)}
                    {effectiveLot > 0 && (
                      <span className="ml-2 text-[var(--muted-foreground)]">
                        · ${(effectivePip * effectiveLot).toLocaleString(undefined, { maximumFractionDigits: 2 })} per pip
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          <Field label="Rationale / Comments (≥10 chars)">
            <textarea value={rationale} onChange={e => setRationale(e.target.value)} rows={4} placeholder="Why this trade? Levels, catalysts, invalidation, anything you want followers to know..." maxLength={1000} />
            <div className="text-[10px] text-[var(--muted-foreground)] text-right mt-1">{rationale.length}/1000</div>
          </Field>

          {error && <div className="text-xs text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded px-3 py-2">{error}</div>}

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
  if (n >= 1000) return n.toLocaleString('en-US', { maximumFractionDigits: 2 });
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

// ─── Signal history modal — all signals posted by a given user ───────
function SignalHistoryModal({
  posterId,
  posterName,
  showPips,
  currentUserId,
  onUpdate,
  onViewHistory,
  onClose,
}: {
  posterId: string;
  posterName: string;
  showPips: boolean;
  currentUserId?: string;
  onUpdate: (id: Id<'signals'>, status: Status, tpHit?: number) => Promise<unknown>;
  onViewHistory: (posterId: string, posterName: string) => void;
  onClose: () => void;
}) {
  const history = useQuery(api.signals.byPoster, { posterId }) as Signal[] | undefined;
  const stats = useQuery(api.signals.posterStats, { posterId });

  const [statusFilter, setStatusFilter] = useState<Status | 'all'>('all');
  const list = (history ?? []).filter(s => statusFilter === 'all' ? true : s.status === statusFilter);

  const wonCount = (history ?? []).filter(s => s.status === 'won').length;
  const lostCount = (history ?? []).filter(s => s.status === 'lost').length;
  const activeCount = (history ?? []).filter(s => s.status === 'active' || s.status === 'pending').length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div
        onClick={e => e.stopPropagation()}
        className="relative w-full max-w-4xl rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-2xl max-h-[90vh] flex flex-col"
      >
        <div className="flex items-center justify-between p-5 border-b border-[var(--border)]">
          <div className="flex items-center gap-3 flex-wrap">
            <History size={18} className="text-pink-400" />
            <div>
              <h2 className="text-lg font-bold text-[var(--foreground)]">{posterName}'s signal history</h2>
              <div className="flex items-center gap-3 text-[11px] text-[var(--muted-foreground)] mt-0.5 tabular-nums">
                <span>{history?.length ?? 0} total</span>
                <span className="text-emerald-400">{wonCount} won</span>
                <span className="text-red-400">{lostCount} lost</span>
                <span className="text-amber-400">{activeCount} open</span>
                {stats && stats.total > 0 && (
                  <span className="text-pink-300 font-semibold">· {Math.round(stats.hitRate * 100)}% hit-rate</span>
                )}
              </div>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-1 rounded hover:bg-[var(--muted)]/50 transition-colors">
            <X size={18} className="text-[var(--muted-foreground)]" />
          </button>
        </div>

        <div className="px-5 py-3 border-b border-[var(--border)] flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted-foreground)]">Filter</span>
          <div className="inline-flex items-center gap-1 p-1 rounded-full border border-[var(--border)] bg-black/20">
            {(['all', 'active', 'pending', 'won', 'lost', 'cancelled', 'expired'] as const).map(s => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1 rounded-full text-[11px] font-semibold capitalize transition-all ${
                  statusFilter === s
                    ? 'bg-gradient-to-r from-pink-400 to-fuchsia-400 text-slate-900'
                    : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {history === undefined ? (
            <div className="text-center text-sm text-[var(--muted-foreground)] py-10">Loading history…</div>
          ) : list.length === 0 ? (
            <div className="text-center text-sm text-[var(--muted-foreground)] py-10">
              No signals match this filter.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {list.map(s => (
                <SignalCard
                  key={s._id}
                  signal={s}
                  isOwn={s.posterId === currentUserId}
                  showPips={showPips}
                  onUpdate={(status, tpHit) => onUpdate(s._id, status, tpHit)}
                  onViewHistory={onViewHistory}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
