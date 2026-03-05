'use client';

import { useState, useMemo } from 'react';
import { EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MemberStat {
  userId: string;
  displayName: string;
  role: string;
  totalTrades: number;
  totalPnL: number;
  winRate: number;
  compliance: number;
}

interface TeamLeaderboardProps {
  memberStats: MemberStat[];
}

type RankBy = 'pnl' | 'compliance' | 'winRate' | 'trades';

const podiumColors = [
  'from-amber-500/30 to-amber-700/10 border-amber-500/40', // 1st — gold
  'from-slate-300/20 to-slate-500/10 border-slate-400/30',  // 2nd — silver
  'from-orange-600/20 to-orange-800/10 border-orange-600/30', // 3rd — bronze
];

export default function TeamLeaderboard({ memberStats }: TeamLeaderboardProps) {
  const [rankBy, setRankBy] = useState<RankBy>('pnl');
  const [anonymize, setAnonymize] = useState(false);

  const ranked = useMemo(() => {
    const members = memberStats.filter(m => m.role === 'member' || m.role === 'coach' || m.role === 'admin' || m.role === 'owner');
    return [...members].sort((a, b) => {
      switch (rankBy) {
        case 'pnl': return b.totalPnL - a.totalPnL;
        case 'compliance': return b.compliance - a.compliance;
        case 'winRate': return b.winRate - a.winRate;
        case 'trades': return b.totalTrades - a.totalTrades;
        default: return 0;
      }
    });
  }, [memberStats, rankBy]);

  const rankOptions: { id: RankBy; label: string }[] = [
    { id: 'pnl', label: 'P&L' },
    { id: 'compliance', label: 'Compliance' },
    { id: 'winRate', label: 'Win Rate' },
    { id: 'trades', label: 'Trades' },
  ];

  const getDisplayName = (name: string, index: number) => {
    if (!anonymize) return name;
    return `Trader ${index + 1}`;
  };

  const getStatValue = (stat: MemberStat) => {
    switch (rankBy) {
      case 'pnl':
        return (
          <span className={stat.totalPnL >= 0 ? 'text-green-400' : 'text-red-400'}>
            {stat.totalPnL >= 0 ? '+' : '-'}${Math.abs(stat.totalPnL).toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </span>
        );
      case 'compliance':
        return <span>{Math.round(stat.compliance)}%</span>;
      case 'winRate':
        return <span>{Math.round(stat.winRate)}%</span>;
      case 'trades':
        return <span>{stat.totalTrades}</span>;
    }
  };

  // Podium: top 3
  const podium = ranked.slice(0, 3);
  // Arrange for display: 2nd, 1st, 3rd
  const podiumDisplay = podium.length >= 3
    ? [podium[1], podium[0], podium[2]]
    : podium;
  const podiumHeights = podium.length >= 3
    ? ['h-28', 'h-36', 'h-20']
    : podium.length === 2
      ? ['h-28', 'h-36']
      : ['h-36'];
  const podiumLabels = podium.length >= 3
    ? ['2nd', '1st', '3rd']
    : podium.length === 2
      ? ['2nd', '1st']
      : ['1st'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Leaderboard</h2>
          <p className="text-sm text-[var(--muted-foreground)]">{ranked.length} traders ranked</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Rank by toggle */}
          <div className="flex items-center border border-[var(--border)] rounded-lg overflow-hidden">
            {rankOptions.map(opt => (
              <button
                key={opt.id}
                onClick={() => setRankBy(opt.id)}
                className={cn(
                  'px-3 py-1.5 text-xs font-semibold transition-colors',
                  rankBy === opt.id
                    ? 'bg-[var(--accent)] text-white'
                    : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
          {/* Anonymize toggle */}
          <button
            onClick={() => setAnonymize(!anonymize)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors',
              anonymize
                ? 'border-[var(--accent)]/40 text-[var(--accent)] bg-[var(--accent)]/10'
                : 'border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
            )}
          >
            <EyeOff size={14} />
            Anonymize
          </button>
        </div>
      </div>

      {/* Podium */}
      {podium.length > 0 && (
        <div className="flex items-end justify-center gap-4 pt-8 pb-4">
          {podiumDisplay.map((member, i) => (
            <div key={member.userId} className="flex flex-col items-center">
              {/* Avatar */}
              <div className="w-14 h-14 rounded-full bg-[var(--accent)]/20 flex items-center justify-center text-lg font-bold text-[var(--accent)] mb-2 border-2 border-[var(--accent)]/30">
                {anonymize ? '?' : member.displayName[0]?.toUpperCase() ?? '?'}
              </div>
              <p className="text-sm font-semibold mb-0.5">{getDisplayName(member.displayName, ranked.indexOf(member))}</p>
              <p className="text-xs font-medium mb-3">{getStatValue(member)}</p>
              {/* Podium bar */}
              <div className={cn(
                'w-28 rounded-t-xl border-t border-l border-r bg-gradient-to-b flex items-start justify-center pt-3',
                podiumColors[podium.indexOf(member)] ?? podiumColors[2],
                podiumHeights[i]
              )}>
                <span className="text-lg font-bold text-[var(--foreground)]/70">
                  {podiumLabels[i]}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Full ranking table (4th place and beyond) */}
      {ranked.length > 3 && (
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl overflow-hidden">
          <div className="grid grid-cols-[auto_1fr_1fr_1fr_1fr_1fr] gap-2 px-5 py-3 border-b border-[var(--border)] text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
            <span className="w-8 text-center">#</span>
            <span>Name</span>
            <span className="text-center">P&L</span>
            <span className="text-center">Win Rate</span>
            <span className="text-center">Compliance</span>
            <span className="text-center">Trades</span>
          </div>
          {ranked.slice(3).map((member, i) => (
            <div
              key={member.userId}
              className="grid grid-cols-[auto_1fr_1fr_1fr_1fr_1fr] gap-2 px-5 py-3 items-center border-b border-[var(--border)]/50 hover:bg-[var(--muted)]/30"
            >
              <span className="w-8 text-center text-sm font-semibold text-[var(--muted-foreground)]">{i + 4}</span>
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-[var(--accent)]/20 flex items-center justify-center text-[11px] font-bold text-[var(--accent)]">
                  {anonymize ? '?' : member.displayName[0]?.toUpperCase() ?? '?'}
                </div>
                <span className="text-sm font-medium">{getDisplayName(member.displayName, i + 3)}</span>
              </div>
              <span className={cn('text-sm text-center font-medium', member.totalPnL >= 0 ? 'text-green-400' : 'text-red-400')}>
                {member.totalPnL >= 0 ? '+' : '-'}${Math.abs(member.totalPnL).toFixed(0)}
              </span>
              <span className="text-sm text-center">{Math.round(member.winRate)}%</span>
              <span className="text-sm text-center">{Math.round(member.compliance)}%</span>
              <span className="text-sm text-center">{member.totalTrades}</span>
            </div>
          ))}
        </div>
      )}

      {ranked.length === 0 && (
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-12 text-center">
          <p className="text-sm text-[var(--muted-foreground)]">No traders to rank yet. Add members to get started.</p>
        </div>
      )}
    </div>
  );
}
