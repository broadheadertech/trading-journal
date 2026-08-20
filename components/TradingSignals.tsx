'use client';

import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { useUser } from '@clerk/nextjs';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { useSubscription } from '@/hooks/useSubscription';
import SignalSocialBar from '@/components/SignalSocialBar';
import TopAnalysts from '@/components/TopAnalysts';
import SignalRationale from '@/components/SignalRationale';
import SignalProviders from '@/components/SignalProviders';
import { Radio, Clock, Target, ShieldWarning as ShieldAlert, Funnel as Filter, Plus, Lock, X, Medal as Award, Fire as Flame, Warning as AlertTriangle, ArrowUpRight, ArrowDownRight, Minus, Trash as Trash2, XCircle, Prohibit as Ban, Eye, EyeSlash as EyeOff, ClockCounterClockwise as History, Pencil, CaretDown as ChevronDown } from '@phosphor-icons/react';

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
  showPips?: boolean;  // poster preference — undefined = legacy default (show)
};

// Core+ during BETA — every registered user is auto-elevated to Core, so they can post.
const PRO_PLUS = new Set(['core', 'pro', 'elite']);

// ─── Pip / point conversion per market & symbol ───────────────────────
// Defaults are tuned so the universal rule holds for every market:
//   0.01 lot × 10 pips = $1   ⟺   pip_size × contract_size = $10
// This is a simplified P&L model — JPY pairs use 0.0001 here (not the broker
// display convention 0.01) because the alternative requires quote-currency
// conversion. Posters can override pip_size per-signal in "Adjust pip / lot size".
function defaultPipSize(market: Market, symbol: string): number {
  const sym = symbol.toUpperCase();
  if (sym.startsWith('XAU') || sym === 'GOLD') return 0.10;     // × 100 oz = $10
  if (sym.startsWith('XAG') || sym === 'SILVER') return 0.002;  // × 5000 oz = $10
  if (market === 'forex') return 0.0001;                          // × 100k = $10 (JPY & non-JPY)
  if (market === 'commodities') return 0.01;                      // × 1000 = $10
  if (market === 'stocks') return 0.01;                           // × 1000 shares = $10
  return 1;                                                       // crypto: $1 per pip with 10-coin lot
}

function defaultLotSize(market: Market, symbol: string): number {
  const sym = symbol.toUpperCase();
  if (sym.startsWith('XAU') || sym === 'GOLD') return 100;        // 100 oz / standard lot
  if (sym.startsWith('XAG') || sym === 'SILVER') return 5000;     // 5000 oz / standard lot
  if (market === 'forex') return 100_000;                          // 1 standard FX lot
  if (market === 'commodities') return 1000;
  if (market === 'stocks') return 1000;                            // 1 lot = 1000 shares
  return 10;                                                       // crypto: 1 lot = 10 units
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

// Anchor for pip and R:R calculations. Always entryLow — the bottom of the
// entry zone — so TP/SL distances are measured from the same canonical price
// regardless of direction. For a limit buy or stop sell this is also the
// actual fill price, so the displayed pips match the trader's realized P/L.
function refEntry(_direction: Direction, entryLow: number, _entryHigh: number): number {
  return entryLow;
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
  const [statusFilter, setStatusFilter] = useState<Status | 'all'>('all');
  const [showPostModal, setShowPostModal] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [historyPoster, setHistoryPoster] = useState<{ id: string; name: string } | null>(null);
  const [editingSignal, setEditingSignal] = useState<Signal | null>(null);

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
    <div>
      <div className="phead pwrap">
        <p className="eyebrow">
          <span style={{ width: 7, height: 7, borderRadius: 1, background: 'var(--pink)', flex: 'none' }} />
          {activeCount} active · {pendingCount} pending · community + AI signals
        </p>
        <h2>Trading signals</h2>
        <p className="sub" style={{ fontSize: 16, maxWidth: 660 }}>
          The traders posting signals on Atlas. Browse each provider's track record — hit-rate, win/loss, and average R —
          and tap a name to open their full profile.
        </p>

        <div className="actions">
          <button className="btn-g" onClick={() => setShowLeaderboard(v => !v)}>
            <Award size={14} />
            {showLeaderboard ? 'Hide' : 'Show'} Leaderboard
          </button>
          {canPost ? (
            <button className="btn-a" onClick={() => setShowPostModal(true)}>
              <Plus size={14} /> Post a Signal
            </button>
          ) : (
            <button
              className="btn-d"
              disabled
              title="Posting signals requires a paid subscription (Core, Pro, or Elite)"
            >
              <Lock size={14} style={{ marginRight: 9 }} /> Post (Core+)
            </button>
          )}
        </div>
      </div>

      {showLeaderboard && (
        <div style={{ marginBottom: 38 }}>
          <Leaderboard rows={leaderboard} />
        </div>
      )}

      <div className="split-2u">
        <div>
          <p style={{ margin: '0 0 22px', fontWeight: 700, fontSize: 10, color: 'var(--muted-2)', letterSpacing: '.04em' }}>
            SIGNAL PROVIDERS
          </p>
          <div style={{ borderTop: '1px solid var(--line-2)', paddingTop: 28 }}>
            <SignalProviders />
          </div>
        </div>

        <div>
          <p style={{ margin: 0, fontWeight: 700, fontSize: 10, letterSpacing: '.04em', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Award size={12} style={{ color: 'var(--amber)' }} /> TOP ANALYSTS
          </p>
          <p style={{ margin: '10px 0 22px', fontSize: 11.5, color: 'var(--muted-2)' }}>
            50%+ win-rate across their trades and signals.
          </p>
          <div style={{ borderTop: '1px solid var(--line-2)', paddingTop: 28 }}>
            <TopAnalysts limit={10} />
          </div>
        </div>
      </div>

      <div className="disclaim" style={{ maxWidth: 720 }}>
        <ShieldAlert size={18} style={{ color: 'var(--amber)', flex: 'none', marginTop: 2 }} />
        <p style={{ margin: 0 }}>
          <b>Not financial advice.</b>{' '}
          Signals are user-posted research-driven trade ideas, not recommendations from Atlas. Run every signal through
          your playbook, your risk model, and your discipline check before sizing in.
        </p>
      </div>

      {showPostModal && canPost && (
        <PostSignalModal
          posterName={user?.fullName ?? user?.username ?? user?.firstName ?? 'Anonymous'}
          onClose={() => setShowPostModal(false)}
          onPosted={() => { setStatusFilter('active'); setMarketFilter('all'); }}
        />
      )}

      {editingSignal && (
        <PostSignalModal
          posterName={user?.fullName ?? user?.username ?? user?.firstName ?? 'Anonymous'}
          editSignal={editingSignal}
          onClose={() => setEditingSignal(null)}
        />
      )}

      {historyPoster && (
        <SignalHistoryModal
          posterId={historyPoster.id}
          posterName={historyPoster.name}
          currentUserId={user?.id}
          onUpdate={(id, status, tpHit) => updateStatus({ id, status, tpHit })}
          onViewHistory={(id, name) => setHistoryPoster({ id, name })}
          onEdit={(sig) => setEditingSignal(sig)}
          onClose={() => setHistoryPoster(null)}
        />
      )}
    </div>
  );
}

function SignalsSkeleton() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(320px,1fr))', gap: 20 }}>
      {[0, 1, 2, 3].map(i => (
        <div key={i} className="card animate-pulse" style={{ height: 320 }}>
          <span className="accent" style={{ width: 60, background: 'var(--line-2)' }} />
          <div style={{ height: 34, width: 160, borderRadius: 2, background: 'var(--grid)', marginBottom: 14 }} />
          <div style={{ height: 10, width: '66%', borderRadius: 2, background: 'var(--hair)', marginBottom: 18 }} />
          {[0, 1, 2, 3].map(j => (
            <div key={j} style={{ height: 10, borderRadius: 2, background: 'var(--hair)', marginTop: 10 }} />
          ))}
        </div>
      ))}
    </div>
  );
}

function Leaderboard({ rows }: { rows: { posterId: string; posterName: string; tier: string; total: number; won: number; lost: number; activeOrPending: number; hitRate: number; avgR: number }[] }) {
  if (rows.length === 0) {
    return (
      <div className="card">
        <span className="accent" style={{ width: 56, background: 'var(--amber)' }} />
        <h3>Analyst Leaderboard</h3>
        <p className="empty-line">No closed signals yet — leaderboard fills as outcomes get marked.</p>
      </div>
    );
  }
  return (
    <div className="card">
      <span className="accent" style={{ width: 56, background: 'var(--amber)' }} />
      <div className="cardhead">
        <div>
          <h3>Analyst Leaderboard</h3>
          <p className="sub">Hit-rate and average R across closed signals.</p>
        </div>
      </div>
      <div style={{ marginTop: 18 }}>
        {rows.slice(0, 10).map((r, i) => (
          <div key={r.posterId} className="qrow">
            <span style={{ width: 22, fontFamily: 'var(--mono)', color: i === 0 ? 'var(--amber)' : 'var(--muted-2)', flex: 'none' }}>
              {i + 1}
            </span>
            <span style={{ fontWeight: 700, color: 'var(--text)', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.posterName}</span>
            <span style={{ marginLeft: 10, height: 20, padding: '0 8px', borderRadius: 2, display: 'inline-flex', alignItems: 'center', fontWeight: 700, fontSize: 9, letterSpacing: '.03em', textTransform: 'uppercase', border: '1px solid var(--line-2)', color: 'var(--muted-2)' }}>
              {r.tier}
            </span>
            {r.activeOrPending > 0 && (
              <span style={{ marginLeft: 10, display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 10.5, color: 'var(--green)' }}>
                <Flame size={9} />{r.activeOrPending} live
              </span>
            )}
            <span style={{ marginLeft: 14, fontSize: 11, color: 'var(--muted-2)', fontFamily: 'var(--mono)' }}>
              {r.won}W / {r.lost}L · {r.total} closed
            </span>
            <em style={{ color: r.hitRate >= 0.6 ? 'var(--green)' : r.hitRate >= 0.4 ? 'var(--amber)' : 'var(--red)' }}>
              {(r.hitRate * 100).toFixed(0)}%
            </em>
            <em style={{ marginLeft: 16, minWidth: 76, textAlign: 'right', color: r.avgR >= 0 ? 'var(--green)' : 'var(--red)' }}>
              {r.avgR >= 0 ? '+' : ''}{r.avgR.toFixed(2)}R avg
            </em>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Telegram-style signal card ───────────────────────────────────────
function SignalCard({ signal: s, isOwn, onUpdate, onViewHistory, onEdit }: {
  signal: Signal;
  isOwn: boolean;
  onUpdate: (status: Status, tpHit?: number) => Promise<unknown>;
  onViewHistory: (posterId: string, posterName: string) => void;
  onEdit: (signal: Signal) => void;
}) {
  // Pip annotations are visible by the poster's choice. Old signals (undefined)
  // default to showing — only an explicit `false` hides them.
  const showPips = s.showPips !== false;
  const isLong = s.direction === 'long';
  const DirIcon = isLong ? ArrowUpRight : ArrowDownRight;
  const dirColor = isLong ? 'var(--green)' : 'var(--red)';
  const action = orderLabel(s.direction, s.orderType);

  const riskBadge =
    s.riskLevel === 'high' ? { color: 'var(--amber)', label: 'High Risk' } :
    s.riskLevel === 'medium' ? { color: 'var(--amber)', label: 'Medium Risk' } :
    { color: 'var(--green)', label: 'Low Risk' };

  const statusColor =
    s.status === 'active' ? 'var(--green)' :
    s.status === 'pending' ? 'var(--amber)' :
    s.status === 'won' ? 'var(--green)' :
    s.status === 'lost' ? 'var(--red)' :
    'var(--muted-2)';

  const posterStats = useQuery(api.signals.posterStats, { posterId: s.posterId });

  const entryLabel = s.entryLow === s.entryHigh ? fmt(s.entryLow) : `${fmt(s.entryLow)}–${fmt(s.entryHigh)}`;
  const entryRef = refEntry(s.direction, s.entryLow, s.entryHigh);

  return (
    <div className="card" style={{ padding: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <span className="accent" style={{ width: 60, background: dirColor }} />

      {/* Header: date + risk chip */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', padding: '18px 24px 0' }}>
        <span style={{ fontWeight: 700, fontSize: 9.5, letterSpacing: '.04em', color: 'var(--muted-2)', textTransform: 'uppercase' }}>
          {new Date(s.postedAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
        </span>
        <span className="chip" style={{ height: 22, padding: '0 10px', gap: 6, fontSize: 10, fontWeight: 700, letterSpacing: '.03em', color: riskBadge.color, borderColor: riskBadge.color }}>
          {s.riskLevel === 'high' && <AlertTriangle size={10} />}
          {riskBadge.label}
        </span>
      </div>

      {/* Symbol + action */}
      <div className="cardhead" style={{ gap: 12, padding: '16px 24px 0' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, minWidth: 0 }}>
          <DirIcon size={20} style={{ color: dirColor, flex: 'none', marginTop: 3 }} />
          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
              <h3 style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: 24, lineHeight: '26px', margin: 0, color: 'var(--text)' }}>
                {s.symbol}
              </h3>
              <span style={{ fontFamily: 'var(--mono)', fontWeight: 500, fontSize: 13, letterSpacing: '.04em', color: dirColor }}>
                {action}
              </span>
            </div>
            <p className="lbl" style={{ marginTop: 8, textTransform: 'uppercase' }}>{s.market}</p>
          </div>
        </div>
        <span
          className="pill"
          style={{ marginLeft: 'auto', flex: 'none', background: 'var(--panel-2)', border: `1px solid ${statusColor}`, color: statusColor, textTransform: 'uppercase', letterSpacing: '.04em', fontWeight: 700 }}
        >
          {s.status}
        </span>
      </div>

      {/* Poster + winrate badge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', padding: '14px 24px 0' }}>
        <a
          href={`/u/${s.posterId}`}
          title={`Open ${s.posterName}'s profile`}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 12, color: 'var(--text-2)' }}
        >
          <Radio size={11} style={{ color: 'var(--amber)' }} />
          <span style={{ fontWeight: 700, color: 'var(--text)' }}>{s.posterName}</span>
        </a>
        <button
          type="button"
          onClick={() => onViewHistory(s.posterId, s.posterName)}
          title={`View ${s.posterName}'s signal history inline`}
          className="chip"
          style={{ height: 24, padding: '0 10px', gap: 6, fontSize: 11 }}
        >
          <History size={10} /> History
        </button>
        <PosterWinRateBadge stats={posterStats} />
      </div>

      {/* Levels */}
      <div style={{ padding: '14px 24px 4px' }}>
        <div className="mrow">
          <span className="ic"><Target size={13} /></span>
          <span className="lb">ENTRY</span>
          <span className="val">{entryLabel}</span>
        </div>
        <div className="mrow">
          <span className="ic"><ShieldAlert size={13} /></span>
          <span className="lb">STOP LOSS</span>
          <span style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 10 }}>
            {showPips && (
              <span style={{ fontFamily: 'var(--mono)', fontSize: 10.5, color: 'var(--muted-2)' }}>
                {fmtPips(s.market, s.symbol, entryRef, s.stopLoss, s.pipSize)}
              </span>
            )}
            <span className="val" style={{ color: 'var(--red)' }}>{fmt(s.stopLoss)}</span>
          </span>
        </div>

        {s.takeProfits.map((tp, i) => {
          // Only the specific TP the poster marked as the closing fill gets the
          // emerald "hit" treatment. Earlier TPs stay neutral — the bullseye now
          // means "this is where the position closed", not "the market passed here".
          const hit = s.tpHit === i + 1;
          // Per-TP R:R — risk anchored at entryLow → SL, reward at this TP. Shown
          // as "1:N.N" so posters and followers can see how R:R climbs with each TP.
          const tpRisk = Math.abs(s.entryLow - s.stopLoss);
          const tpReward = Math.abs(tp - s.entryLow);
          const tpRR = tpRisk > 0 ? tpReward / tpRisk : 0;
          return (
            <div key={i} className="mrow" style={hit ? { background: 'rgba(36,200,138,.07)' } : undefined}>
              <span className="ic" style={hit ? { color: 'var(--green)' } : undefined}>
                <Target size={13} weight={hit ? 'bold' : undefined} />
              </span>
              <span className="lb" style={hit ? { color: 'var(--green)', fontWeight: 700 } : undefined}>
                {hit ? `WON · TARGET ${i + 1}` : `TARGET ${i + 1}`}
              </span>
              <span style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 10 }}>
                {showPips && (
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 10.5, color: 'var(--muted-2)' }}>
                    {fmtPips(s.market, s.symbol, entryRef, tp, s.pipSize)}
                  </span>
                )}
                <span
                  style={{
                    height: 18, padding: '0 8px', borderRadius: 2, display: 'inline-flex', alignItems: 'center',
                    fontFamily: 'var(--mono)', fontSize: 10,
                    background: hit ? 'var(--green)' : 'var(--panel-2)',
                    border: `1px solid ${hit ? 'var(--green)' : 'var(--line)'}`,
                    color: hit ? 'var(--ink)' : 'var(--muted)',
                  }}
                >
                  1:{tpRR.toFixed(1)}
                </span>
                <span className="val" style={{ color: 'var(--green)' }}>{fmt(tp)}</span>
              </span>
            </div>
          );
        })}
      </div>

      {/* Rationale */}
      {s.rationale && (
        <div style={{ padding: '14px 24px 0', fontSize: 12.5, lineHeight: '20px', color: 'var(--muted)' }}>
          <SignalRationale text={s.rationale} symbol={s.symbol} />
        </div>
      )}

      {/* Footer */}
      <div
        style={{
          marginTop: 'auto', display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap',
          padding: '14px 24px', borderTop: '1px solid var(--line)', background: 'var(--panel-2)',
        }}
      >
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 11.5, color: 'var(--muted-2)' }}>
          <Target size={11} style={{ color: 'var(--amber)' }} />
          <span style={{ fontFamily: 'var(--mono)' }}>R:R {s.rrRatio.toFixed(1)}</span>
          {s.actualR !== undefined && (
            <span
              style={{
                fontFamily: 'var(--mono)',
                color: s.actualR > 0 ? 'var(--green)' : s.actualR < 0 ? 'var(--red)' : 'var(--muted-2)',
              }}
            >
              ({s.actualR >= 0 ? '+' : ''}{s.actualR.toFixed(1)}R)
            </span>
          )}
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 11.5, color: 'var(--muted-2)' }}>
          <Clock size={11} />
          {timeAgo(s.postedAt)}
        </span>

        {isOwn && (s.status === 'pending' || s.status === 'active') && (
          <OwnerActions takeProfits={s.takeProfits} onUpdate={onUpdate} status={s.status} onEdit={() => onEdit(s)} />
        )}
      </div>

      <SignalSocialBar signalId={s._id} />
    </div>
  );
}

// Compact custom dropdown — a button + popover, NOT a native <select>, so the
// global `select { width: 100% }` form rule can't stretch it.
function FilterDropdown<T extends string>({
  value, onChange, options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  const current = options.find(o => o.value === value);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="chip"
        style={{ width: 168, justifyContent: 'space-between', color: 'var(--text)' }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{current?.label ?? 'Select'}</span>
        <ChevronDown size={13} style={{ color: 'var(--muted-2)', flex: 'none', transform: open ? 'rotate(180deg)' : undefined }} />
      </button>
      {open && (
        <div
          style={{
            position: 'absolute', zIndex: 30, marginTop: 4, width: 168,
            border: '1px solid var(--line-2)', borderRadius: 2, background: 'var(--panel)', padding: 4,
          }}
        >
          {options.map(o => (
            <button
              key={o.value}
              type="button"
              onClick={() => { onChange(o.value); setOpen(false); }}
              style={{
                display: 'block', width: '100%', textAlign: 'left', padding: '7px 12px', borderRadius: 2, fontSize: 12.5,
                ...(o.value === value
                  ? { background: 'var(--amber)', color: 'var(--ink)', fontWeight: 700 }
                  : { color: 'var(--text-2)' }),
              }}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

type PosterStats = { posterId: string; total: number; won: number; hitRate: number } | undefined;

function PosterWinRateBadge({ stats }: { stats: PosterStats }) {
  // Loading state — query in flight
  if (stats === undefined) {
    return (
      <span className="chip animate-pulse" style={{ height: 24, padding: '0 10px', fontSize: 11, color: 'var(--muted-2)' }}>
        Loading…
      </span>
    );
  }

  // New poster — no closed signals yet
  if (stats.total === 0) {
    return (
      <span className="chip" style={{ height: 24, padding: '0 10px', fontSize: 11, fontWeight: 700, color: 'var(--teal)', borderColor: 'var(--teal)' }}>
        New analyst
      </span>
    );
  }

  // Tier the badge color by hit rate — green (great), teal (good), amber (mediocre)
  const pct = Math.round(stats.hitRate * 100);
  const tone =
    stats.hitRate >= 0.6 ? 'var(--green)' :
    stats.hitRate >= 0.4 ? 'var(--teal)' :
                            'var(--amber)';

  return (
    <span className="chip" style={{ height: 24, padding: '0 10px', gap: 7, borderColor: tone }}>
      <Target size={11} style={{ color: tone }} />
      <span style={{ fontFamily: 'var(--mono)', fontWeight: 500, fontSize: 12.5, color: tone }}>{pct}%</span>
      <span style={{ fontWeight: 700, fontSize: 9, letterSpacing: '.04em', color: 'var(--muted-2)' }}>WIN RATE</span>
      <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--muted-2)' }}>· {stats.won}/{stats.total}</span>
    </span>
  );
}

function OwnerActions({ takeProfits, onUpdate, status, onEdit }: { takeProfits: number[]; onUpdate: (status: Status, tpHit?: number) => Promise<unknown>; status: Status; onEdit: () => void }) {
  const [tpPickerOpen, setTpPickerOpen] = useState(false);

  const act: React.CSSProperties = { height: 24, padding: '0 10px', gap: 6, fontSize: 11 };

  return (
    <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', position: 'relative' }}>
      <button onClick={onEdit} title="Edit signal" className="chip" style={{ ...act, color: 'var(--amber)', borderColor: 'var(--amber)' }}>
        <Pencil size={10} /> Edit
      </button>
      {status === 'pending' && (
        <button onClick={() => onUpdate('active')} title="Mark active" className="chip" style={{ ...act, color: 'var(--teal)', borderColor: 'var(--teal)' }}>
          Activate
        </button>
      )}

      {takeProfits.length > 1 ? (
        <>
          <button onClick={() => setTpPickerOpen(v => !v)} title="Mark target hit" className="chip" style={{ ...act, color: 'var(--green)', borderColor: 'var(--green)' }}>
            <Target size={10} weight="bold" /> Target hit
          </button>
          {tpPickerOpen && (
            <div
              style={{
                position: 'absolute', bottom: '100%', right: 0, marginBottom: 6, zIndex: 10,
                border: '1px solid var(--line-2)', borderRadius: 2, background: 'var(--panel)',
                padding: 4, display: 'flex', flexDirection: 'column',
              }}
            >
              {takeProfits.map((_, i) => (
                <button
                  key={i}
                  onClick={() => { onUpdate('won', i + 1); setTpPickerOpen(false); }}
                  style={{ padding: '6px 14px', borderRadius: 2, fontSize: 11.5, color: 'var(--green)', textAlign: 'left', whiteSpace: 'nowrap' }}
                >
                  Target {i + 1} hit
                </button>
              ))}
            </div>
          )}
        </>
      ) : (
        <button onClick={() => onUpdate('won', 1)} title="Target hit" className="chip" style={{ ...act, color: 'var(--green)', borderColor: 'var(--green)' }}>
          <Target size={10} weight="bold" /> Target hit
        </button>
      )}

      <button onClick={() => onUpdate('lost')} title="SL hit" className="chip" style={{ ...act, color: 'var(--red)', borderColor: 'var(--red)' }}>
        <XCircle size={10} /> SL
      </button>
      <button onClick={() => onUpdate('cancelled')} title="Cancel signal" className="chip" style={{ ...act, color: 'var(--muted-2)' }}>
        <Ban size={10} />
      </button>
    </div>
  );
}

// ─── Post / Edit modal ────────────────────────────────────────────────
// When `editSignal` is provided, the modal becomes an edit form for that
// signal — prefilled values, "Save changes" button, and uses the `edit`
// mutation instead of `post`. Otherwise it behaves like a normal post form.
function PostSignalModal({
  posterName,
  editSignal,
  onClose,
  onPosted,
}: {
  posterName: string;
  editSignal?: Signal | null;
  onClose: () => void;
  onPosted?: () => void;
}) {
  const post = useMutation(api.signals.post);
  const edit = useMutation(api.signals.edit);
  const isEdit = !!editSignal;
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [symbol, setSymbol] = useState(editSignal?.symbol ?? '');
  const [market, setMarket] = useState<Market>(editSignal?.market ?? 'commodities');
  const [direction, setDirection] = useState<Direction>(editSignal?.direction ?? 'long');
  const [orderType, setOrderType] = useState<OrderType>(editSignal?.orderType ?? 'market');
  const [entryLow, setEntryLow] = useState(editSignal ? String(editSignal.entryLow) : '');
  const [entryHigh, setEntryHigh] = useState(
    editSignal && editSignal.entryHigh !== editSignal.entryLow ? String(editSignal.entryHigh) : ''
  );
  const [stopLoss, setStopLoss] = useState(editSignal ? String(editSignal.stopLoss) : '');
  const [tpInputs, setTpInputs] = useState<string[]>(
    editSignal && editSignal.takeProfits.length > 0
      ? editSignal.takeProfits.map(tp => String(tp))
      : ['']
  );
  const [riskLevel, setRiskLevel] = useState<RiskLevel>(editSignal?.riskLevel ?? 'high');
  const [rationale, setRationale] = useState(editSignal?.rationale ?? '');
  const [showAdjust, setShowAdjust] = useState(false);
  const [pipSize, setPipSize] = useState(editSignal?.pipSize !== undefined ? String(editSignal.pipSize) : '');
  const [lotSize, setLotSize] = useState(editSignal?.lotSize !== undefined ? String(editSignal.lotSize) : '');
  // Poster choice — should the signal display pip annotations on its card?
  // Default to true for new signals and any legacy signal where the field is undefined.
  const [showPips, setShowPips] = useState<boolean>(editSignal?.showPips !== false);

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
    if (!allBaseValid) { setError('Entry, stop, and at least one target must be positive numbers.'); return; }
    if (entryLowNum > entryHighNum) { setError('Entry low must be ≤ entry high.'); return; }
    if (tpNums.length === 0) { setError('At least one take-profit is required.'); return; }
    // Rationale is optional — posters can add or refine it later via the edit modal.

    const customPip = pipSize.trim() ? parseFloat(pipSize) : NaN;
    const customLot = lotSize.trim() ? parseFloat(lotSize) : NaN;
    if (pipSize.trim() && (!Number.isFinite(customPip) || customPip <= 0)) { setError('Pip size must be a positive number.'); return; }
    if (lotSize.trim() && (!Number.isFinite(customLot) || customLot <= 0)) { setError('Lot size must be a positive number.'); return; }

    setSubmitting(true);
    try {
      if (isEdit && editSignal) {
        await edit({
          id: editSignal._id,
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
          showPips,
        });
      } else {
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
          showPips,
        });
      }
      onPosted?.();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : isEdit ? 'Failed to save changes.' : 'Failed to post signal.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: 'rgba(0,0,0,.72)', backdropFilter: 'blur(4px)' }}>
      <form
        onSubmit={submit}
        className="modal"
        style={{ width: '100%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto', padding: 0, textAlign: 'left' }}
      >
        <span className="accent" />
        <div
          style={{
            position: 'sticky', top: 0, zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            gap: 12, padding: '20px 24px', borderBottom: '1px solid var(--line)', background: '#080d14',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {isEdit ? <Pencil size={15} style={{ color: 'var(--amber)' }} /> : <Radio size={15} style={{ color: 'var(--amber)' }} />}
            <h3 style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: 17, lineHeight: '18px', margin: 0, color: 'var(--text)' }}>
              {isEdit ? 'Edit signal' : 'Post a trading signal'}
            </h3>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" style={{ display: 'inline-flex', color: 'var(--muted-2)' }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: '22px 24px 28px', display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <Field label="Symbol">
              <input value={symbol} onChange={e => setSymbol(e.target.value.toUpperCase())} placeholder="XAUUSD" maxLength={20} style={CONTROL} />
            </Field>
            <Field label="Market">
              <select value={market} onChange={e => setMarket(e.target.value as Market)} style={CONTROL}>
                <option value="commodities">Commodities</option>
                <option value="forex">Forex</option>
                <option value="crypto">Crypto</option>
                <option value="stocks">Stocks</option>
              </select>
            </Field>
          </div>

          <Field label="Order">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 7 }}>
              {([
                { dir: 'long',  type: 'market', label: 'BUY (Market)',  tone: 'var(--green)' },
                { dir: 'long',  type: 'stop',   label: 'BUY STOP',      tone: 'var(--green)' },
                { dir: 'long',  type: 'limit',  label: 'BUY LIMIT',     tone: 'var(--green)' },
                { dir: 'short', type: 'market', label: 'SELL (Market)', tone: 'var(--red)' },
                { dir: 'short', type: 'stop',   label: 'SELL STOP',     tone: 'var(--red)' },
                { dir: 'short', type: 'limit',  label: 'SELL LIMIT',    tone: 'var(--red)' },
              ] as { dir: Direction; type: OrderType; label: string; tone: string }[]).map(o => {
                const active = direction === o.dir && orderType === o.type;
                return (
                  <button key={o.label} type="button"
                    onClick={() => { setDirection(o.dir); setOrderType(o.type); }}
                    style={{
                      height: 34, borderRadius: 2, fontWeight: 700, fontSize: 11, letterSpacing: '.03em',
                      border: `1px solid ${active ? o.tone : 'var(--line)'}`,
                      background: 'var(--panel-2)',
                      color: active ? o.tone : 'var(--muted-2)',
                    }}>
                    {o.label}
                  </button>
                );
              })}
            </div>
          </Field>

          <Field label="Risk Level">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 7 }}>
              {(['low', 'medium', 'high'] as RiskLevel[]).map(r => {
                const active = riskLevel === r;
                const tone = r === 'low' ? 'var(--green)' : 'var(--amber)';
                return (
                  <button key={r} type="button" onClick={() => setRiskLevel(r)}
                    style={{
                      height: 34, borderRadius: 2, fontWeight: 700, fontSize: 11.5, textTransform: 'capitalize',
                      border: `1px solid ${active ? tone : 'var(--line)'}`,
                      background: 'var(--panel-2)',
                      color: active ? tone : 'var(--muted-2)',
                    }}>
                    {r}
                  </button>
                );
              })}
            </div>
          </Field>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <Field label="Entry Low">
              <input type="number" step="any" value={entryLow} onChange={e => setEntryLow(e.target.value)} placeholder="4685" style={CONTROL} />
            </Field>
            <Field label="Entry High (optional)">
              <input type="number" step="any" value={entryHigh} onChange={e => setEntryHigh(e.target.value)} placeholder="4700 (leave blank for single price)" style={CONTROL} />
            </Field>
          </div>

          <Field label="Stop Loss">
            <input type="number" step="any" value={stopLoss} onChange={e => setStopLoss(e.target.value)} placeholder="4675" style={CONTROL} />
          </Field>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 9 }}>
              <p className="lbl" style={{ textTransform: 'uppercase' }}>
                Take Profits ({tpInputs.length}) <span style={{ color: 'var(--muted-3)', fontWeight: 400 }}>· no limit</span>
              </p>
              <button type="button" onClick={addTp}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontWeight: 700, fontSize: 11.5, color: 'var(--amber)' }}>
                <Plus size={11} /> Add TP
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {tpInputs.map((v, i) => {
                const tpNum = parseFloat(v);
                const tpValid = Number.isFinite(tpNum) && tpNum > 0 && allBaseValid;
                const showTpPips = showPips && tpValid;
                // Live per-TP R:R preview — uses entryLow as the anchor to match the card.
                const tpRisk = tpValid ? Math.abs(entryLowNum - slNum) : 0;
                const tpReward = tpValid ? Math.abs(tpNum - entryLowNum) : 0;
                const tpRR = tpValid && tpRisk > 0 ? tpReward / tpRisk : 0;
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                    <span style={{ width: 58, flex: 'none', fontWeight: 700, fontSize: 9.5, letterSpacing: '.04em', textTransform: 'uppercase', color: 'var(--muted-2)' }}>
                      Target {i + 1}
                    </span>
                    <input
                      type="number"
                      step="any"
                      value={v}
                      onChange={e => setTp(i, e.target.value)}
                      placeholder={`Target ${i + 1}`}
                      style={{ ...CONTROL, flex: 1, width: 'auto', minWidth: 0 }}
                    />
                    {showTpPips && (
                      <span style={{ width: 78, flex: 'none', textAlign: 'right', fontFamily: 'var(--mono)', fontSize: 10.5, color: 'var(--muted-2)' }}>
                        {fmtPips(market, symbol || 'X', entryRef, tpNum, effectivePip)}
                      </span>
                    )}
                    {tpValid && (
                      <span
                        style={{
                          width: 52, height: 20, flex: 'none', borderRadius: 2,
                          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                          fontFamily: 'var(--mono)', fontSize: 10,
                          border: '1px solid var(--line)', background: 'var(--panel-2)', color: 'var(--muted)',
                        }}
                      >
                        1:{tpRR.toFixed(1)}
                      </span>
                    )}
                    <button type="button" onClick={() => removeTp(i)} disabled={tpInputs.length === 1}
                      aria-label={`Remove target ${i + 1}`}
                      style={{ flex: 'none', display: 'inline-flex', padding: 4, color: 'var(--muted-2)', opacity: tpInputs.length === 1 ? 0.3 : 1 }}>
                      {tpInputs.length === 1 ? <Minus size={12} /> : <Trash2 size={12} />}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {previewRR > 0 && (
            <p style={{ margin: 0, fontSize: 12, color: 'var(--muted-2)' }}>
              R:R (vs Target 1){' '}
              <span
                style={{
                  fontFamily: 'var(--mono)', fontWeight: 500, fontSize: 12.5,
                  color: previewRR >= 2 ? 'var(--green)' : previewRR >= 1 ? 'var(--teal)' : 'var(--amber)',
                }}
              >
                {previewRR.toFixed(2)}
              </span>
            </p>
          )}

          {/* Adjust pip & lot */}
          <div style={{ border: '1px solid var(--line)', borderRadius: 2, background: 'var(--panel-2)' }}>
            <button
              type="button"
              onClick={() => setShowAdjust(v => !v)}
              style={{
                width: '100%', height: 40, padding: '0 16px', display: 'flex', alignItems: 'center',
                justifyContent: 'space-between', gap: 12, fontWeight: 700, fontSize: 11.5, color: 'var(--text-2)',
              }}
            >
              <span>Adjust pip / lot size{(pipSize.trim() || lotSize.trim()) ? ' · custom' : ' · using defaults'}</span>
              <ChevronDown size={13} style={{ color: 'var(--muted-2)', flex: 'none', transform: showAdjust ? 'rotate(180deg)' : undefined }} />
            </button>
            {showAdjust && (
              <div style={{ padding: '14px 16px 16px', borderTop: '1px solid var(--line)', display: 'flex', flexDirection: 'column', gap: 14 }}>
                <p style={{ margin: 0, fontSize: 11, lineHeight: '18px', color: 'var(--muted-2)' }}>
                  Defaults match MT4/MT5 broker convention. For {symbol || 'this symbol'} ({market}):
                  <span style={{ color: 'var(--amber)', marginLeft: 5, fontFamily: 'var(--mono)' }}>1 pip = {fmtPriceUnit(market, computedDefaultPip)}</span>
                  <span style={{ marginLeft: 5 }}>·</span>
                  <span style={{ color: 'var(--amber)', marginLeft: 5, fontFamily: 'var(--mono)' }}>{computedDefaultLot.toLocaleString()} units / lot</span>
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <Field label="Pip size (override)">
                    <input
                      type="number"
                      step="any"
                      value={pipSize}
                      onChange={e => setPipSize(e.target.value)}
                      placeholder={String(computedDefaultPip)}
                      style={CONTROL}
                    />
                  </Field>
                  <Field label="Lot size (units)">
                    <input
                      type="number"
                      step="any"
                      value={lotSize}
                      onChange={e => setLotSize(e.target.value)}
                      placeholder={String(computedDefaultLot)}
                      style={CONTROL}
                    />
                  </Field>
                </div>
                {showPips && effectivePip > 0 && allBaseValid && tpNums[0] && (
                  <p style={{ margin: 0, fontFamily: 'var(--mono)', fontSize: 10.5, color: 'var(--green)' }}>
                    Preview with current settings: Target 1 = {fmtPips(market, symbol || 'X', entryRef, tpNums[0], effectivePip)}
                    {effectiveLot > 0 && (
                      <span style={{ marginLeft: 8, color: 'var(--muted-2)' }}>
                        · ${(effectivePip * effectiveLot).toLocaleString(undefined, { maximumFractionDigits: 2 })} per pip
                      </span>
                    )}
                  </p>
                )}
              </div>
            )}
          </div>

          <Field label="Rationale / Comments (optional)">
            <textarea value={rationale} onChange={e => setRationale(e.target.value)} rows={4} placeholder="Optional — why this trade, catalysts, invalidation, updates. You can add or edit this any time after posting." maxLength={1000} style={TEXTAREA} />
            <p style={{ margin: '6px 0 0', textAlign: 'right', fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--muted-2)' }}>{rationale.length}/1000</p>
          </Field>

          {/* Poster choice — show pip annotations on the card? */}
          <button
            type="button"
            onClick={() => setShowPips(v => !v)}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
              padding: '14px 16px', border: '1px solid var(--line)', borderRadius: 2,
              background: 'var(--panel-2)', textAlign: 'left',
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {showPips
                ? <Eye size={16} style={{ color: 'var(--amber)', flex: 'none' }} />
                : <EyeOff size={16} style={{ color: 'var(--muted-2)', flex: 'none' }} />}
              <span>
                <span style={{ display: 'block', fontWeight: 700, fontSize: 12.5, color: 'var(--text)' }}>
                  {showPips ? 'Show pips on this signal' : 'Hide pips on this signal'}
                </span>
                <span style={{ display: 'block', marginTop: 5, fontSize: 11.5, lineHeight: '17px', color: 'var(--muted-2)' }}>
                  {showPips
                    ? 'Followers see pip distances next to SL and every TP.'
                    : 'Followers see prices only — no pip annotations.'}
                </span>
              </span>
            </span>
            <span
              style={{
                position: 'relative', flex: 'none', display: 'inline-block', width: 38, height: 20, borderRadius: 2,
                border: `1px solid ${showPips ? 'var(--amber)' : 'var(--line-2)'}`,
                background: showPips ? 'var(--amber)' : 'var(--panel)',
              }}
            >
              <span
                style={{
                  position: 'absolute', top: 2, left: showPips ? 20 : 2, width: 14, height: 14, borderRadius: 1,
                  background: showPips ? 'var(--ink)' : 'var(--muted-2)',
                }}
              />
            </span>
          </button>

          {error && (
            <div className="warn" style={{ marginTop: 0 }}>
              <b style={{ flex: 'none' }}>!</b>
              <p style={{ margin: 0 }}>{error}</p>
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 12, paddingTop: 4 }}>
            <button type="button" onClick={onClose} className="btn-g">
              Cancel
            </button>
            <button type="submit" disabled={submitting} className="btn-a" style={submitting ? { opacity: 0.5 } : undefined}>
              {submitting ? (isEdit ? 'Saving…' : 'Posting…') : (isEdit ? 'Save changes' : 'Post Signal')}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

// ATLAS form control chrome — panel-2 surface, hairline border, 2px radius.
const CONTROL: React.CSSProperties = {
  width: '100%',
  height: 42,
  border: '1px solid var(--line)',
  borderRadius: 2,
  background: 'var(--panel-2)',
  padding: '0 16px',
  fontSize: 13,
  color: 'var(--text)',
  fontFamily: 'var(--body)',
};

const TEXTAREA: React.CSSProperties = { ...CONTROL, height: 'auto', padding: '12px 16px', lineHeight: '20px', resize: 'vertical' };

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'block' }}>
      <span className="lbl" style={{ display: 'block', marginBottom: 9, textTransform: 'uppercase' }}>{label}</span>
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
  currentUserId,
  onUpdate,
  onViewHistory,
  onEdit,
  onClose,
}: {
  posterId: string;
  posterName: string;
  currentUserId?: string;
  onUpdate: (id: Id<'signals'>, status: Status, tpHit?: number) => Promise<unknown>;
  onViewHistory: (posterId: string, posterName: string) => void;
  onEdit: (signal: Signal) => void;
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
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: 'rgba(0,0,0,.72)', backdropFilter: 'blur(4px)' }}
    >
      <div
        onClick={e => e.stopPropagation()}
        className="modal"
        style={{ width: '100%', maxWidth: 1000, maxHeight: '90vh', display: 'flex', flexDirection: 'column', padding: 0, textAlign: 'left' }}
      >
        <span className="accent" />
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, padding: '20px 24px', borderBottom: '1px solid var(--line)' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
            <History size={17} style={{ color: 'var(--amber)', flex: 'none', marginTop: 2 }} />
            <div>
              <h3 style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: 17, lineHeight: '18px', margin: 0, color: 'var(--text)' }}>
                {posterName}'s signal history
              </h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', marginTop: 9, fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--muted-2)' }}>
                <span>{history?.length ?? 0} total</span>
                <span style={{ color: 'var(--green)' }}>{wonCount} won</span>
                <span style={{ color: 'var(--red)' }}>{lostCount} lost</span>
                <span style={{ color: 'var(--amber)' }}>{activeCount} open</span>
                {stats && stats.total > 0 && (
                  <span style={{ color: 'var(--teal)' }}>· {Math.round(stats.hitRate * 100)}% hit-rate</span>
                )}
              </div>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" style={{ display: 'inline-flex', flex: 'none', color: 'var(--muted-2)' }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8, padding: '14px 24px', borderBottom: '1px solid var(--line)' }}>
          <span style={{ marginRight: 6, fontWeight: 700, fontSize: 9.5, letterSpacing: '.04em', textTransform: 'uppercase', color: 'var(--muted-2)' }}>Filter</span>
          {(['all', 'active', 'pending', 'won', 'lost', 'cancelled', 'expired'] as const).map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={statusFilter === s ? 'chip on' : 'chip'}
              style={{ height: 26, padding: '0 12px', fontSize: 11, textTransform: 'capitalize' }}
            >
              {s}
            </button>
          ))}
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
          {history === undefined ? (
            <p className="empty-line">Loading history…</p>
          ) : list.length === 0 ? (
            <p className="empty-line">No signals match this filter.</p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(320px,1fr))', gap: 20 }}>
              {list.map(s => (
                <SignalCard
                  key={s._id}
                  signal={s}
                  isOwn={s.posterId === currentUserId}
                  onUpdate={(status, tpHit) => onUpdate(s._id, status, tpHit)}
                  onViewHistory={onViewHistory}
                  onEdit={onEdit}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
