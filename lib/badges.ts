// Static badge catalog — computed at read time from existing data.
// No schema needed; badges are derived from trades + reflections.

import type { Trade, DailyReflection } from './types';

export type BadgeTier = 'bronze' | 'silver' | 'gold' | 'platinum';
export type BadgeCategory = 'volume' | 'discipline' | 'reflection';

export interface BadgeDef {
  id: string;
  name: string;
  description: string;
  category: BadgeCategory;
  tier: BadgeTier;
  icon: string; // emoji for now — can swap to lucide later
  /** Returns 0..1 progress; 1 means earned */
  progress: (data: BadgeData) => number;
}

export interface BadgeData {
  trades: Trade[];
  reflections: DailyReflection[];
}

export interface EarnedBadge extends BadgeDef {
  progress: (data: BadgeData) => number;
  progressValue: number; // 0..1
  earned: boolean;
  current: number;       // raw current count
  target: number;        // raw target count
}

const TIER_COLORS: Record<BadgeTier, string> = {
  bronze:   'from-amber-700 to-amber-900',
  silver:   'from-slate-300 to-slate-500',
  gold:     'from-yellow-400 to-amber-600',
  platinum: 'from-cyan-300 via-violet-400 to-fuchsia-400',
};

export function tierGradient(tier: BadgeTier) {
  return TIER_COLORS[tier];
}

// ─── Helpers ────────────────────────────────────────────────────────
function closedTrades(trades: Trade[]) {
  return trades.filter(t => !t.isOpen && t.actualPnL !== null);
}

function ruleCompliantPct(trade: Trade): number {
  if (!trade.ruleChecklist || trade.ruleChecklist.length === 0) return 0;
  let score = 0;
  for (const r of trade.ruleChecklist) {
    if (r.compliance === 'yes') score += 1;
    else if (r.compliance === 'partial') score += 0.5;
  }
  return score / trade.ruleChecklist.length;
}

function consecutiveDaysWithReflections(reflections: DailyReflection[]): number {
  if (reflections.length === 0) return 0;
  const dates = new Set(reflections.map(r => r.date));
  let max = 0;
  let cur = 0;
  const today = new Date();
  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    if (dates.has(key)) {
      cur++;
      max = Math.max(max, cur);
    } else {
      cur = 0;
    }
  }
  return max;
}

function consecutiveDaysWithCompliance(trades: Trade[]): number {
  // Group trades by day, count days where avg compliance >= 0.9
  const byDay = new Map<string, Trade[]>();
  for (const t of closedTrades(trades)) {
    const day = t.entryDate?.slice(0, 10);
    if (!day) continue;
    if (!byDay.has(day)) byDay.set(day, []);
    byDay.get(day)!.push(t);
  }
  const compliantDays = new Set<string>();
  for (const [day, ts] of byDay) {
    const avg = ts.reduce((s, t) => s + ruleCompliantPct(t), 0) / ts.length;
    if (avg >= 0.9) compliantDays.add(day);
  }
  let max = 0, cur = 0;
  const today = new Date();
  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    if (compliantDays.has(key)) {
      cur++;
      max = Math.max(max, cur);
    } else {
      cur = 0;
    }
  }
  return max;
}

// ─── Badge catalog ──────────────────────────────────────────────────
function progressFn(current: number, target: number): number {
  if (target <= 0) return 1;
  return Math.min(1, current / target);
}

export const BADGES: BadgeDef[] = [
  // ── VOLUME ────────────────────────────────────────────────────────
  {
    id: 'first-trade',
    name: 'First Step',
    description: 'Log your very first trade.',
    category: 'volume',
    tier: 'bronze',
    icon: '🎯',
    progress: (d) => progressFn(d.trades.length, 1),
  },
  {
    id: 'ten-trades',
    name: 'Getting Started',
    description: 'Log 10 trades.',
    category: 'volume',
    tier: 'bronze',
    icon: '📝',
    progress: (d) => progressFn(d.trades.length, 10),
  },
  {
    id: 'hundred-trades',
    name: 'Centurion',
    description: 'Log 100 trades.',
    category: 'volume',
    tier: 'silver',
    icon: '💯',
    progress: (d) => progressFn(d.trades.length, 100),
  },
  {
    id: 'five-hundred-trades',
    name: 'Veteran',
    description: 'Log 500 trades.',
    category: 'volume',
    tier: 'gold',
    icon: '⚔️',
    progress: (d) => progressFn(d.trades.length, 500),
  },
  {
    id: 'thousand-trades',
    name: 'Legend',
    description: 'Log 1,000 trades.',
    category: 'volume',
    tier: 'platinum',
    icon: '👑',
    progress: (d) => progressFn(d.trades.length, 1000),
  },

  // ── DISCIPLINE ────────────────────────────────────────────────────
  {
    id: 'first-clean-trade',
    name: 'By the Book',
    description: 'Complete one trade with 100% rule compliance.',
    category: 'discipline',
    tier: 'bronze',
    icon: '✅',
    progress: (d) => {
      const clean = closedTrades(d.trades).filter(t => ruleCompliantPct(t) === 1).length;
      return progressFn(clean, 1);
    },
  },
  {
    id: 'discipline-streak-7',
    name: 'Iron Discipline',
    description: '7 consecutive days with 90%+ rule compliance.',
    category: 'discipline',
    tier: 'silver',
    icon: '🛡️',
    progress: (d) => progressFn(consecutiveDaysWithCompliance(d.trades), 7),
  },
  {
    id: 'discipline-streak-30',
    name: 'Unbreakable',
    description: '30 consecutive days with 90%+ rule compliance.',
    category: 'discipline',
    tier: 'gold',
    icon: '💎',
    progress: (d) => progressFn(consecutiveDaysWithCompliance(d.trades), 30),
  },
  {
    id: 'fifty-clean-trades',
    name: 'Process Master',
    description: '50 trades with 100% rule compliance.',
    category: 'discipline',
    tier: 'gold',
    icon: '🏆',
    progress: (d) => {
      const clean = closedTrades(d.trades).filter(t => ruleCompliantPct(t) === 1).length;
      return progressFn(clean, 50);
    },
  },

  // ── REFLECTION ────────────────────────────────────────────────────
  {
    id: 'first-reflection',
    name: 'Mirror Mirror',
    description: 'Write your first daily reflection.',
    category: 'reflection',
    tier: 'bronze',
    icon: '🪞',
    progress: (d) => progressFn(d.reflections.length, 1),
  },
  {
    id: 'reflection-streak-7',
    name: 'Self-Aware',
    description: '7 consecutive days with reflections.',
    category: 'reflection',
    tier: 'silver',
    icon: '🧘',
    progress: (d) => progressFn(consecutiveDaysWithReflections(d.reflections), 7),
  },
  {
    id: 'reflection-streak-30',
    name: 'Inner Compass',
    description: '30 consecutive days with reflections.',
    category: 'reflection',
    tier: 'platinum',
    icon: '🌟',
    progress: (d) => progressFn(consecutiveDaysWithReflections(d.reflections), 30),
  },
];

// Compute the raw current/target so the UI can show "8 / 10" style progress
function rawCounts(badge: BadgeDef, data: BadgeData): { current: number; target: number } {
  switch (badge.id) {
    case 'first-trade':         return { current: data.trades.length, target: 1 };
    case 'ten-trades':          return { current: data.trades.length, target: 10 };
    case 'hundred-trades':      return { current: data.trades.length, target: 100 };
    case 'five-hundred-trades': return { current: data.trades.length, target: 500 };
    case 'thousand-trades':     return { current: data.trades.length, target: 1000 };
    case 'first-clean-trade':
    case 'fifty-clean-trades': {
      const clean = closedTrades(data.trades).filter(t => ruleCompliantPct(t) === 1).length;
      return { current: clean, target: badge.id === 'first-clean-trade' ? 1 : 50 };
    }
    case 'discipline-streak-7':  return { current: consecutiveDaysWithCompliance(data.trades), target: 7 };
    case 'discipline-streak-30': return { current: consecutiveDaysWithCompliance(data.trades), target: 30 };
    case 'first-reflection':     return { current: data.reflections.length, target: 1 };
    case 'reflection-streak-7':  return { current: consecutiveDaysWithReflections(data.reflections), target: 7 };
    case 'reflection-streak-30': return { current: consecutiveDaysWithReflections(data.reflections), target: 30 };
    default: return { current: 0, target: 1 };
  }
}

export function computeBadges(data: BadgeData): EarnedBadge[] {
  return BADGES.map(b => {
    const p = b.progress(data);
    const { current, target } = rawCounts(b, data);
    return {
      ...b,
      progressValue: p,
      earned: p >= 1,
      current: Math.min(current, target),
      target,
    };
  });
}

export function getEarnedCount(data: BadgeData): { earned: number; total: number } {
  const all = computeBadges(data);
  return { earned: all.filter(b => b.earned).length, total: all.length };
}
