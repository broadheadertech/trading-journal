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

// ATLAS podium palette — 1st gold, 2nd silver, 3rd bronze
const podiumColors = [
  'var(--amber)',
  '#9fb0c2',
  '#b3763a',
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
          <span style={{ fontFamily: 'var(--mono)', color: stat.totalPnL >= 0 ? 'var(--green)' : 'var(--red)' }}>
            {stat.totalPnL >= 0 ? '+' : '-'}${Math.abs(stat.totalPnL).toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </span>
        );
      case 'compliance':
        return <span style={{ fontFamily: 'var(--mono)' }}>{Math.round(stat.compliance)}%</span>;
      case 'winRate':
        return <span style={{ fontFamily: 'var(--mono)' }}>{Math.round(stat.winRate)}%</span>;
      case 'trades':
        return <span style={{ fontFamily: 'var(--mono)' }}>{stat.totalTrades}</span>;
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
    <div>
      {/* Header */}
      <div className="phead pwrap" style={{ marginBottom: 24 }}>
        <p className="eyebrow" style={{ margin: '0 0 12px' }}>Standings</p>
        <h2 style={{ fontSize: 34, lineHeight: '38px' }}>Leaderboard</h2>
        <p className="sub" style={{ marginTop: 14, fontSize: 14.5 }}>{ranked.length} traders ranked</p>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3 flex-wrap" style={{ marginBottom: 24 }}>
        {/* Rank by toggle */}
        <div className="flex items-center gap-2 flex-wrap">
          {rankOptions.map(opt => (
            <button
              key={opt.id}
              onClick={() => setRankBy(opt.id)}
              className={cn('chip', rankBy === opt.id && 'on')}
            >
              {opt.label}
            </button>
          ))}
        </div>
        {/* Anonymize toggle */}
        <button
          onClick={() => setAnonymize(!anonymize)}
          className={cn('chip', anonymize && 'on')}
          style={{ marginLeft: 'auto' }}
        >
          <EyeOff size={13} />
          Anonymize
        </button>
      </div>

      {/* Podium */}
      {podium.length > 0 && (
        <div className="card" style={{ padding: '28px 28px 0' }}>
          <span className="accent" style={{ width: 56, background: 'var(--amber)' }} />
          <h3>Top Performers</h3>
          <p className="sub">Ranked by {rankOptions.find(o => o.id === rankBy)?.label}</p>
          <div className="flex items-end justify-center gap-4" style={{ marginTop: 28 }}>
            {podiumDisplay.map((member, i) => {
              const color = podiumColors[podium.indexOf(member)] ?? podiumColors[2];
              return (
                <div key={member.userId} className="flex flex-col items-center">
                  {/* Avatar */}
                  <div
                    className="flex items-center justify-center"
                    style={{
                      width: 52, height: 52, borderRadius: 2, marginBottom: 10,
                      background: 'var(--panel-2)', border: `1px solid ${color}`,
                      fontFamily: 'var(--display)', fontWeight: 700, fontSize: 20, color,
                    }}
                  >
                    {anonymize ? '?' : member.displayName[0]?.toUpperCase() ?? '?'}
                  </div>
                  <p className="truncate" style={{ margin: 0, fontSize: 12.5, fontWeight: 700, maxWidth: 120 }}>
                    {getDisplayName(member.displayName, ranked.indexOf(member))}
                  </p>
                  <p style={{ margin: '5px 0 12px', fontSize: 12 }}>{getStatValue(member)}</p>
                  {/* Podium bar */}
                  <div
                    className={cn('flex items-start justify-center', podiumHeights[i])}
                    style={{
                      width: 112, paddingTop: 12,
                      background: 'var(--panel-2)',
                      borderTop: `3px solid ${color}`,
                      borderLeft: '1px solid var(--line)',
                      borderRight: '1px solid var(--line)',
                    }}
                  >
                    <span style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: 16, color }}>
                      {podiumLabels[i]}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Full ranking table (4th place and beyond) */}
      {ranked.length > 3 && (
        <div className="card" style={{ padding: 0, overflow: 'hidden', marginTop: 24 }}>
          <div
            className="grid grid-cols-[auto_1fr_1fr_1fr_1fr_1fr] gap-2 px-5 py-3"
            style={{ borderBottom: '1px solid var(--line)', fontSize: 9.5, fontWeight: 700, letterSpacing: '.04em', textTransform: 'uppercase', color: 'var(--muted-2)' }}
          >
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
              className="grid grid-cols-[auto_1fr_1fr_1fr_1fr_1fr] gap-2 px-5 py-3.5 items-center"
              style={{ borderBottom: '1px solid var(--hair)' }}
            >
              <span className="w-8 text-center" style={{ fontFamily: 'var(--mono)', fontSize: 12.5, color: 'var(--muted-2)' }}>{i + 4}</span>
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className="flex items-center justify-center shrink-0"
                  style={{
                    width: 28, height: 28, borderRadius: 2, background: 'var(--panel-2)',
                    border: '1px solid var(--line)', fontFamily: 'var(--display)',
                    fontWeight: 700, fontSize: 12, color: 'var(--amber)',
                  }}
                >
                  {anonymize ? '?' : member.displayName[0]?.toUpperCase() ?? '?'}
                </div>
                <span className="truncate" style={{ fontSize: 13, fontWeight: 700 }}>{getDisplayName(member.displayName, i + 3)}</span>
              </div>
              <span
                className="text-center"
                style={{ fontFamily: 'var(--mono)', fontSize: 12.5, color: member.totalPnL >= 0 ? 'var(--green)' : 'var(--red)' }}
              >
                {member.totalPnL >= 0 ? '+' : '-'}${Math.abs(member.totalPnL).toFixed(0)}
              </span>
              <span className="text-center" style={{ fontFamily: 'var(--mono)', fontSize: 12.5 }}>{Math.round(member.winRate)}%</span>
              <span className="text-center" style={{ fontFamily: 'var(--mono)', fontSize: 12.5 }}>{Math.round(member.compliance)}%</span>
              <span className="text-center" style={{ fontFamily: 'var(--mono)', fontSize: 12.5 }}>{member.totalTrades}</span>
            </div>
          ))}
        </div>
      )}

      {ranked.length === 0 && (
        <div className="blank" style={{ padding: '48px 32px' }}>
          <span className="corner" style={{ left: 0, top: 0, borderRight: 0, borderBottom: 0 }} />
          <span className="corner" style={{ right: 0, top: 0, borderLeft: 0, borderBottom: 0 }} />
          <span className="corner" style={{ left: 0, bottom: 0, borderRight: 0, borderTop: 0 }} />
          <span className="corner" style={{ right: 0, bottom: 0, borderLeft: 0, borderTop: 0 }} />
          <h4>Nothing to rank yet</h4>
          <p>Add members to get started.</p>
        </div>
      )}
    </div>
  );
}
