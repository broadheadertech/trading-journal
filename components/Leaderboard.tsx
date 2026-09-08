'use client';

import { useMemo } from 'react';
import { Trade } from '@/lib/types';
import { useCurrency } from '@/hooks/useCurrency';
import { Trophy, ArrowsClockwise, Users } from '@phosphor-icons/react';

interface LeaderboardProps {
  trades: Trade[];
}

export default function Leaderboard({ trades }: LeaderboardProps) {
  const { formatCurrency } = useCurrency();

  // Closed trades (time filtering handled by universal top-bar filter)
  const scopedTrades = useMemo(() => {
    return trades.filter(t => !t.isOpen && t.actualPnL !== null);
  }, [trades]);

  const netPnL = scopedTrades.reduce((s, t) => s + (t.actualPnL ?? 0), 0);
  const tradeCount = scopedTrades.length;
  const hasEnoughTrades = tradeCount >= 10;

  // Rank metrics (single-user, self-ranking context)
  const winRate = tradeCount > 0
    ? Math.round((scopedTrades.filter(t => (t.actualPnL ?? 0) > 0).length / tradeCount) * 100)
    : 0;
  const avgR = useMemo(() => {
    const wins = scopedTrades.filter(t => (t.actualPnL ?? 0) > 0);
    const losses = scopedTrades.filter(t => (t.actualPnL ?? 0) < 0);
    const avgWin = wins.length > 0 ? wins.reduce((s, t) => s + (t.actualPnL ?? 0), 0) / wins.length : 0;
    const avgLoss = losses.length > 0 ? losses.reduce((s, t) => s + Math.abs(t.actualPnL ?? 0), 0) / losses.length : 0;
    return avgLoss > 0 ? avgWin / avgLoss : 0;
  }, [scopedTrades]);

  // Rank percentile placeholder (single-user app)
  const rankPercentile = hasEnoughTrades ? Math.min(99, Math.round(winRate * avgR / 2)) : 0;

  const ROW_COLS = '56px minmax(0,1fr) 130px 100px 90px 90px';

  return (
    <div style={{ position: 'relative' }}>

      {/* ── Page head ── */}
      <div className="phead pwrap">
        <p className="eyebrow"><Trophy size={13} /> Competitive pulse</p>
        <h2>Leaderboard arena</h2>
        <p className="sub">
          Anonymous verified ranking built from actual account performance. Use this board to benchmark execution quality, not just outcomes.
        </p>
        <div className="actions">
          <button className="btn-g" type="button">
            <ArrowsClockwise size={14} /> Refresh board
          </button>
        </div>
      </div>

      {/* ── Scope chips ── */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 4 }}>
        <span className="chip">
          Ranked <em style={{ fontStyle: 'normal', fontWeight: 700, color: 'var(--text)' }}>{hasEnoughTrades ? 1 : 0}</em>
        </span>
        <span className="chip">
          Peer group <em style={{ fontStyle: 'normal', fontWeight: 700, color: 'var(--text)' }}>All traders</em>
        </span>
      </div>

      {/* ── Stat strip ── */}
      <div className="stats">
        <div className="stat" style={{ height: 'auto', minHeight: 104 }}>
          <span className="accent" style={{ background: 'var(--amber)' }} />
          <b>YOUR RANK</b>
          <em>{hasEnoughTrades ? '#1' : '--'}</em>
          <small style={{ display: 'block', fontSize: 10, color: 'var(--muted-2)', marginTop: 4 }}>
            {hasEnoughTrades ? 'Self-ranked' : 'Not ranked yet'}
          </small>
        </div>
        <div className="stat" style={{ height: 'auto', minHeight: 104 }}>
          <span className="accent" style={{ background: 'var(--amber)' }} />
          <b>RANK PERCENTILE</b>
          <em style={{ color: 'var(--amber)' }}>{rankPercentile.toFixed(1)}%</em>
          <small style={{ display: 'block', fontSize: 10, color: 'var(--muted-2)', marginTop: 4 }}>higher is stronger</small>
        </div>
        <div className="stat" style={{ height: 'auto', minHeight: 104 }}>
          <span className="accent" style={{ background: netPnL >= 0 ? 'var(--green)' : 'var(--red)' }} />
          <b>CURRENT NET</b>
          <em style={{ color: netPnL >= 0 ? 'var(--green)' : 'var(--red)' }}>{formatCurrency(netPnL)}</em>
          <small style={{ display: 'block', fontSize: 10, color: 'var(--muted-2)', marginTop: 4 }}>selected period</small>
        </div>
        <div className="stat" style={{ height: 'auto', minHeight: 104 }}>
          <span className="accent" style={{ background: 'var(--amber)' }} />
          <b>BOARD INTEGRITY</b>
          {hasEnoughTrades ? (
            <>
              <em style={{ color: 'var(--green)' }}>Verified</em>
              <small style={{ display: 'block', fontSize: 10, color: 'var(--muted-2)', marginTop: 4 }}>{tradeCount} trades in scope</small>
            </>
          ) : (
            <>
              <em style={{ fontSize: 14, lineHeight: '18px', fontFamily: 'var(--body)', fontWeight: 700, marginTop: 10 }}>
                Waiting for enough ranked data
              </em>
              <small style={{ display: 'block', fontSize: 10, color: 'var(--muted-2)', marginTop: 4 }}>minimum 10 trades per account</small>
            </>
          )}
        </div>
      </div>

      {/* ── Board rows / empty state ── */}
      <div className="card" style={{ marginTop: 32 }}>
        <span className="accent" style={{ width: 56, background: 'var(--amber)' }} />
        <div className="cardhead">
          <div>
            <h3>Ranked accounts</h3>
            <p className="sub">Verified rows for the selected period</p>
          </div>
        </div>

        {hasEnoughTrades ? (
          <div style={{ marginTop: 24, overflowX: 'auto' }}>
            <div style={{ minWidth: 660 }}>
              <div
                className="lbl"
                style={{ display: 'grid', gridTemplateColumns: ROW_COLS, gap: 12, padding: '0 16px 10px', borderBottom: '1px solid var(--line-2)' }}
              >
                <span>RANK</span>
                <span>ACCOUNT</span>
                <span style={{ textAlign: 'right' }}>NET P&L</span>
                <span style={{ textAlign: 'right' }}>WIN RATE</span>
                <span style={{ textAlign: 'right' }}>TRADES</span>
                <span style={{ textAlign: 'right' }}>AVG R</span>
              </div>

              <div
                className="qrow"
                style={{ display: 'grid', gridTemplateColumns: ROW_COLS, gap: 12, alignItems: 'center', borderLeft: '3px solid var(--amber)' }}
              >
                <span style={{ fontFamily: 'var(--display)', fontWeight: 700, color: 'var(--amber)' }}>#1</span>
                <span style={{ color: 'var(--text)', fontWeight: 700 }}>You</span>
                <em style={{ marginLeft: 0, textAlign: 'right', color: netPnL >= 0 ? 'var(--green)' : 'var(--red)' }}>
                  {formatCurrency(netPnL)}
                </em>
                <em style={{ marginLeft: 0, textAlign: 'right' }}>{winRate}%</em>
                <em style={{ marginLeft: 0, textAlign: 'right', color: 'var(--muted-2)' }}>{tradeCount}</em>
                <em style={{ marginLeft: 0, textAlign: 'right' }}>{avgR.toFixed(2)}</em>
              </div>
            </div>
          </div>
        ) : (
          <div className="blank" style={{ minHeight: 260, marginTop: 24 }}>
            <span className="corner" style={{ left: 0, top: 0, borderRight: 0, borderBottom: 0 }} />
            <span className="corner" style={{ right: 0, top: 0, borderLeft: 0, borderBottom: 0 }} />
            <span className="corner" style={{ left: 0, bottom: 0, borderRight: 0, borderTop: 0 }} />
            <span className="corner" style={{ right: 0, bottom: 0, borderLeft: 0, borderTop: 0 }} />
            <span className="badge" style={{ border: '1px solid rgba(217,148,5,.5)' }}>
              <Users size={24} color="#d99405" />
            </span>
            <h4>No leaderboard rows in this scope</h4>
            <p style={{ maxWidth: 420 }}>
              Accounts need at least 10 trades in the selected range. Expand the scope or import more activity.
            </p>
          </div>
        )}
      </div>

      <p className="footnote">
        Ranking is computed from your closed trades in the active period. Board integrity requires a minimum of 10 trades per account.
      </p>
    </div>
  );
}
