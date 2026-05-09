'use client';

import { useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { useUser } from '@clerk/nextjs';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { useSubscription } from '@/hooks/useSubscription';
import { Radio, Clock, Target, ShieldAlert, Filter, Plus, Lock, X, Award, Flame, AlertTriangle, ArrowUpRight, ArrowDownRight, Minus, Trash2, CheckCircle2, XCircle, Ban } from 'lucide-react';

type Direction = 'long' | 'short';
type RiskLevel = 'high' | 'medium' | 'low';
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
};

const PRO_PLUS = new Set(['pro', 'elite', 'legend']);

// ─── Pip / point conversion per market & symbol ───────────────────────
// Symbol-based detection takes priority so gold/silver work even if the
// poster mis-selects the market. Gold convention: 1.0 move = 10 pips
// (1 pip = $0.10), matching common signal-provider format.
function pipSize(market: Market, symbol: string): number {
  const sym = symbol.toUpperCase();
  if (sym.startsWith('XAU') || sym === 'GOLD') return 0.1;
  if (sym.startsWith('XAG') || sym === 'SILVER') return 0.001;
  if (market === 'forex') return sym.includes('JPY') ? 0.01 : 0.0001;
  if (market === 'commodities') return 0.01;
  if (market === 'stocks') return 0.01;
  return 1;  // crypto: per-dollar
}

// Worst-case entry for the direction. For LONG, you assume the highest fill
// in the entry zone (smallest gain to TP, largest distance to SL). For SHORT,
// the lowest. This matches the convention your example uses (entryHigh = 4700
// → TP1 at 4710 = "+100 pips" rather than midpoint).
function refEntry(direction: Direction, entryLow: number, entryHigh: number): number {
  return direction === 'long' ? entryHigh : entryLow;
}

function fmtPips(market: Market, symbol: string, from: number, to: number): string {
  const size = pipSize(market, symbol);
  const diff = (to - from) / size;
  const abs = Math.round(Math.abs(diff));
  const sign = diff >= 0 ? '+' : '−';
  if (market === 'crypto') return `${sign}$${abs.toLocaleString()}`;
  if (market === 'stocks') return `${sign}${abs}¢`;
  return `${sign}${abs}pips`;
}

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
              onUpdate={(status, tpHit) => updateStatus({ id: s._id, status, tpHit })}
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
          onClose={() => setShowPostModal(false)}
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

// ─── Telegram-style signal card ───────────────────────────────────────
function SignalCard({ signal: s, isOwn, onUpdate }: { signal: Signal; isOwn: boolean; onUpdate: (status: Status, tpHit?: number) => Promise<unknown> }) {
  const isLong = s.direction === 'long';
  const DirIcon = isLong ? ArrowUpRight : ArrowDownRight;
  const dirColor = isLong ? 'text-emerald-400' : 'text-red-400';
  const action = isLong ? 'BUY' : 'SELL';

  const riskBadge =
    s.riskLevel === 'high' ? { color: 'text-red-300 bg-red-500/15 border-red-500/40', label: '⚠️ High Risk ⚠️' } :
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
              <span className={`text-base font-bold tracking-widest ${dirColor}`}>{action}S</span>
            </div>
            <div className="text-[10px] uppercase tracking-widest text-[var(--muted-foreground)] mt-0.5">{s.market}</div>
          </div>
        </div>
        <span className={`text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border ${statusColor}`}>
          {s.status}{s.tpHit ? ` · TP${s.tpHit}` : ''}
        </span>
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
          <span className="text-[10px] text-red-400/70 tabular-nums">{fmtPips(s.market, s.symbol, entryRef, s.stopLoss)}</span>
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
                <span className="text-[10px] text-emerald-400/60 tabular-nums">
                  🎯 {fmtPips(s.market, s.symbol, entryRef, tp)}
                </span>
                {hit && <CheckCircle2 size={11} className="text-emerald-400 ml-auto" />}
              </div>
            );
          })}
        </div>
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
          <div className="flex items-center gap-1.5 text-[var(--muted-foreground)]">
            <Radio size={10} />
            <span className="font-medium text-[var(--foreground)]">{s.posterName}</span>
            {posterStats && posterStats.total > 0 && (
              <span className={`ml-1 ${posterStats.hitRate >= 0.6 ? 'text-emerald-400' : posterStats.hitRate >= 0.4 ? 'text-amber-400' : 'text-red-400'}`}>
                · {(posterStats.hitRate * 100).toFixed(0)}% on {posterStats.total}
              </span>
            )}
          </div>
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
            <CheckCircle2 size={10} /> TP hit
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
          <CheckCircle2 size={10} /> TP hit
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
function PostSignalModal({ posterName, onClose }: { posterName: string; onClose: () => void }) {
  const post = useMutation(api.signals.post);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [symbol, setSymbol] = useState('');
  const [market, setMarket] = useState<Market>('commodities');
  const [direction, setDirection] = useState<Direction>('long');
  const [entryLow, setEntryLow] = useState('');
  const [entryHigh, setEntryHigh] = useState('');
  const [stopLoss, setStopLoss] = useState('');
  const [tpInputs, setTpInputs] = useState<string[]>(['']);
  const [riskLevel, setRiskLevel] = useState<RiskLevel>('high');
  const [rationale, setRationale] = useState('');

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
    if (tpInputs.length >= 10) return;
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

    setSubmitting(true);
    try {
      await post({
        posterName,
        symbol: symbol.trim(),
        market,
        direction,
        entryLow: entryLowNum,
        entryHigh: entryHighNum,
        stopLoss: slNum,
        takeProfits: tpNums,
        riskLevel,
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

          <div className="grid grid-cols-2 gap-3">
            <Field label="Direction">
              <div className="inline-flex items-center gap-1 p-1 rounded-full border border-[var(--border)] bg-black/20 w-full">
                <button type="button" onClick={() => setDirection('long')}
                  className={`flex-1 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${direction === 'long' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'text-[var(--muted-foreground)]'}`}>
                  BUY (Long)
                </button>
                <button type="button" onClick={() => setDirection('short')}
                  className={`flex-1 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${direction === 'short' ? 'bg-red-500/20 text-red-300 border border-red-500/40' : 'text-[var(--muted-foreground)]'}`}>
                  SELL (Short)
                </button>
              </div>
            </Field>
            <Field label="Risk Level">
              <div className="inline-flex items-center gap-1 p-1 rounded-full border border-[var(--border)] bg-black/20 w-full">
                {(['low', 'medium', 'high'] as RiskLevel[]).map(r => (
                  <button key={r} type="button" onClick={() => setRiskLevel(r)}
                    className={`flex-1 px-2 py-1.5 rounded-full text-xs font-semibold capitalize transition-all ${
                      riskLevel === r
                        ? r === 'high' ? 'bg-red-500/20 text-red-300 border border-red-500/40'
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
                Take Profits ({tpInputs.length}/10)
              </div>
              <button type="button" onClick={addTp} disabled={tpInputs.length >= 10}
                className="inline-flex items-center gap-1 text-[10px] text-pink-400 hover:text-pink-300 transition-colors disabled:opacity-40">
                <Plus size={10} /> Add TP
              </button>
            </div>
            <div className="space-y-1.5">
              {tpInputs.map((v, i) => {
                const tpNum = parseFloat(v);
                const showPips = Number.isFinite(tpNum) && tpNum > 0 && allBaseValid;
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
                    {showPips && (
                      <span className="text-[10px] text-emerald-400/80 tabular-nums w-20 text-right">
                        {fmtPips(market, symbol || 'X', entryRef, tpNum)}
                      </span>
                    )}
                    <button type="button" onClick={() => removeTp(i)} disabled={tpInputs.length === 1}
                      className="p-1 rounded text-[var(--muted-foreground)] hover:text-red-400 transition-colors disabled:opacity-30">
                      {tpInputs.length === 1 ? <Minus size={12} /> : <Trash2 size={12} />}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {previewRR > 0 && (
            <div className="text-xs text-[var(--muted-foreground)] tabular-nums">
              R:R (vs TP1): <span className={`font-bold ${previewRR >= 2 ? 'text-emerald-400' : previewRR >= 1 ? 'text-amber-400' : 'text-red-400'}`}>{previewRR.toFixed(2)}</span>
            </div>
          )}

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
