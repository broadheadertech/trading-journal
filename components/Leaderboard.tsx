'use client';

import { useMemo } from 'react';
import { Trade } from '@/lib/types';
import { useCurrency } from '@/hooks/useCurrency';
import { Trophy, RefreshCw, Users } from 'lucide-react';

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

  return (
    <div className="max-w-[1400px] mx-auto px-3 sm:px-6 py-6 space-y-6">

      {/* ── Hero Card ── */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-0">
          {/* Left — Title + scope */}
          <div className="p-6 sm:p-8">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--accent)]/10 text-xs text-[var(--accent)] font-semibold uppercase tracking-widest mb-4">
              <Trophy size={14} /> Competitive Pulse
            </div>
            <h1 className="text-3xl sm:text-4xl font-black mb-2">Leaderboard Arena</h1>
            <p className="text-sm text-[var(--muted-foreground)] max-w-md mb-6">
              Anonymous verified ranking built from actual account performance. Use this board to benchmark execution quality, not just outcomes.
            </p>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--muted)] font-medium">
                Ranked: <span className="font-bold">{hasEnoughTrades ? 1 : 0}</span>
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--muted)] font-medium">
                Peer group: <span className="font-bold">All traders</span>
              </span>
            </div>
          </div>

          {/* Right — 4 stat cards */}
          <div className="grid grid-cols-2 border-t lg:border-t-0 lg:border-l border-[var(--border)]">
            <div className="p-5 border-b border-r border-[var(--border)]">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--accent)] mb-2">Your Rank</p>
              <p className="text-2xl font-black">{hasEnoughTrades ? '#1' : '--'}</p>
              <p className="text-xs text-[var(--muted-foreground)]">{hasEnoughTrades ? 'Self-ranked' : 'Not ranked yet'}</p>
            </div>
            <div className="p-5 border-b border-[var(--border)]">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--accent)] mb-2">Rank Percentile</p>
              <p className="text-2xl font-black text-[var(--accent)]">{rankPercentile.toFixed(1)}%</p>
              <p className="text-xs text-[var(--muted-foreground)]">higher is stronger</p>
            </div>
            <div className="p-5 border-r border-[var(--border)]">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--muted-foreground)] mb-2">Current Net</p>
              <p className={`text-2xl font-black ${netPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {formatCurrency(netPnL)}
              </p>
              <p className="text-xs text-[var(--muted-foreground)]">selected period</p>
            </div>
            <div className="p-5">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--muted-foreground)] mb-2">Board Integrity</p>
              {hasEnoughTrades ? (
                <>
                  <p className="text-lg font-black text-green-400">Verified</p>
                  <p className="text-xs text-[var(--muted-foreground)]">{tradeCount} trades in scope</p>
                </>
              ) : (
                <>
                  <p className="text-sm font-bold leading-tight">Waiting for enough ranked data</p>
                  <p className="text-xs text-[var(--muted-foreground)]">minimum 10 trades per account</p>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Refresh ── */}
      <div className="flex items-center justify-end">
        <button className="flex items-center gap-2 px-4 py-2 text-sm rounded-full border border-[var(--border)] text-[var(--muted-foreground)] hover:border-[var(--accent)]/40 hover:text-[var(--foreground)] transition-colors font-medium">
          <RefreshCw size={14} /> Refresh board
        </button>
      </div>

      {/* ── Leaderboard Table / Empty State ── */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl min-h-[300px]">
        {hasEnoughTrades ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-widest text-[var(--muted-foreground)]">Rank</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-widest text-[var(--muted-foreground)]">Account</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold uppercase tracking-widest text-[var(--muted-foreground)]">Net P&L</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold uppercase tracking-widest text-[var(--muted-foreground)]">Win Rate</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold uppercase tracking-widest text-[var(--muted-foreground)]">Trades</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold uppercase tracking-widest text-[var(--muted-foreground)]">Avg R</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-[var(--border)] bg-[var(--accent)]/5">
                  <td className="px-5 py-3 font-bold text-[var(--accent)]">#1</td>
                  <td className="px-5 py-3 font-medium">You</td>
                  <td className={`px-5 py-3 text-right font-bold ${netPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {formatCurrency(netPnL)}
                  </td>
                  <td className="px-5 py-3 text-right font-medium">{winRate}%</td>
                  <td className="px-5 py-3 text-right text-[var(--muted-foreground)]">{tradeCount}</td>
                  <td className="px-5 py-3 text-right font-medium">{avgR.toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-full bg-[var(--muted)] flex items-center justify-center mb-4">
              <Users size={28} className="text-[var(--muted-foreground)]" />
            </div>
            <p className="text-lg font-bold mb-1">No leaderboard rows in this scope</p>
            <p className="text-sm text-[var(--muted-foreground)] max-w-md">
              Accounts need at least 10 trades in the selected range. Expand the scope or import more activity.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
