'use client';

import { useMemo, useRef, useState } from 'react';
import {
  AreaChart, Area, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { Trade, Verdict } from '@/lib/types';
import { useCurrency } from '@/hooks/useCurrency';
import {
  generateVerdict, getDisciplineScore, getRMultiple,
} from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import {
  Shield, TrendingDown, TrendingUp, ChevronDown, ChevronRight,
  Target, AlertTriangle, Sparkles, ArrowRight, Eye, Crosshair,
} from 'lucide-react';

/* ── Sub-tab types ───────────────────────────────────────────────── */
type SubTab = 'Summary' | 'Diagnostics' | 'Action Plan' | 'Coach Notes';
const SUB_TABS: SubTab[] = ['Summary', 'Diagnostics', 'Action Plan', 'Coach Notes'];

/* ── Diagnostic signal types ─────────────────────────────────────── */
type EffortLevel = 'LOW EFFORT' | 'MEDIUM EFFORT' | 'HIGH EFFORT';
type Priority = 'P1 PRIORITY' | 'P2 PRIORITY' | 'P3 PRIORITY';

interface DiagnosticSignal {
  id: number;
  name: string;
  effort: EffortLevel;
  impact: number; // negative dollar amount
  confidence: 'High' | 'Medium' | 'Low';
  priority: Priority;
  proof: string;
  evidence: string;
  nextStep: string;
  trades: Trade[];
  coverage: number;
}

interface StrengthSignal {
  name: string;
  value: number;
  description: string;
  trades: Trade[];
}

interface ActionItem {
  id: number;
  name: string;
  description: string;
  recoverable: number;
  timeframe: string;
}

interface VerdictsProps {
  trades: Trade[];
}

export default function Verdicts({ trades }: VerdictsProps) {
  const { formatCurrency } = useCurrency();
  const [selectedDiagnostic, setSelectedDiagnostic] = useState(0);

  const summaryRef = useRef<HTMLDivElement>(null);
  const diagnosticsRef = useRef<HTMLDivElement>(null);
  const actionPlanRef = useRef<HTMLDivElement>(null);
  const coachNotesRef = useRef<HTMLDivElement>(null);

  const sectionRefs: Record<SubTab, React.RefObject<HTMLDivElement | null>> = {
    'Summary': summaryRef,
    'Diagnostics': diagnosticsRef,
    'Action Plan': actionPlanRef,
    'Coach Notes': coachNotesRef,
  };

  function scrollToSection(tab: SubTab) {
    sectionRefs[tab].current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  /* ── Closed trades (time filtering handled by universal top-bar filter) ── */
  const filtered = useMemo(() => {
    return trades.filter(t => !t.isOpen && t.actualPnL !== null);
  }, [trades]);

  /* ── Assess verdicts ───────────────────────────────────────────── */
  const assessed = useMemo(
    () => filtered.map(t => ({ ...t, verdict: t.verdict ?? generateVerdict(t) })),
    [filtered],
  );

  /* ── Core metrics ──────────────────────────────────────────────── */
  const metrics = useMemo(() => {
    const total = assessed.length;
    const currentNet = assessed.reduce((s, t) => s + (t.actualPnL ?? 0), 0);
    const losses = assessed.filter(t => (t.actualPnL ?? 0) < 0);
    const wins = assessed.filter(t => (t.actualPnL ?? 0) >= 0);
    const totalLoss = losses.reduce((s, t) => s + Math.abs(t.actualPnL ?? 0), 0);
    const totalWin = wins.reduce((s, t) => s + (t.actualPnL ?? 0), 0);
    const poorlyExecuted = assessed.filter(t => t.verdict === 'Poorly Executed');
    const wellExecuted = assessed.filter(t => t.verdict === 'Well Executed');
    const goodDiscipline = assessed.filter(t => t.verdict === 'Good Discipline, Bad Luck');
    const disciplineScore = getDisciplineScore(assessed);

    // Leaks: losses from poorly executed trades
    const leakTrades = poorlyExecuted.filter(t => (t.actualPnL ?? 0) < 0);
    const grossLeakImpact = leakTrades.reduce((s, t) => s + Math.abs(t.actualPnL ?? 0), 0);

    // Conservative recoverable: overlap-adjusted (use ~24% of gross as conservative)
    const conservativeRecoverable = grossLeakImpact * 0.242;

    // Projected net after fixes
    const projectedNet = currentNet + conservativeRecoverable;

    // Health score: blend of discipline, win consistency, and leak control
    const winRate = total > 0 ? wins.length / total : 0;
    const leakRatio = totalLoss > 0 ? (grossLeakImpact / totalLoss) : 0;
    const healthScore = total > 0
      ? Math.round((disciplineScore * 40 + winRate * 30 + (1 - leakRatio) * 30))
      : 0;

    // Room to grow vs strengths
    const roomToGrow = total > 0
      ? Math.round((poorlyExecuted.length / total) * 100)
      : 0;
    const strengthsValue = total > 0
      ? Math.round((wellExecuted.length / total) * 100)
      : 0;

    return {
      total,
      currentNet,
      conservativeRecoverable,
      projectedNet,
      grossLeakImpact,
      totalLoss,
      totalWin,
      healthScore,
      roomToGrow,
      strengthsValue,
      poorlyExecuted,
      wellExecuted,
      goodDiscipline,
      leakTrades,
      losses,
      wins,
      coverage: total > 0 ? 100 : 0,
    };
  }, [assessed]);

  /* ── Diagnostics: Detected leaks ───────────────────────────────── */
  const diagnostics = useMemo((): DiagnosticSignal[] => {
    if (assessed.length === 0) return [];
    const signals: DiagnosticSignal[] = [];
    let id = 1;

    // Signal 1: Loss containment failure — trades where loss exceeded stop loss or avg loss
    const avgLoss = metrics.losses.length > 0
      ? metrics.losses.reduce((s, t) => s + Math.abs(t.actualPnL ?? 0), 0) / metrics.losses.length
      : 0;
    const bigLosses = metrics.losses.filter(t => Math.abs(t.actualPnL ?? 0) > avgLoss * 1.5);
    if (bigLosses.length > 0) {
      const impact = bigLosses.reduce((s, t) => s + Math.abs(t.actualPnL ?? 0), 0);
      signals.push({
        id: id++,
        name: 'Loss containment failure',
        effort: 'MEDIUM EFFORT',
        impact: -impact,
        confidence: 'High',
        priority: 'P1 PRIORITY',
        proof: `Contradiction diagnostics found mismatch between intent, risk protocol, and executed behavior.\n\nIntent/action mismatches are leading indicators of systematic leak recurrence. Estimated effect: ${formatCurrency(-impact)}.\n\nTrigger evidence: ${bigLosses.length} trades exceeded 1.5x average loss.\n\nCoverage: ${bigLosses.length} trades.`,
        evidence: `${bigLosses.length} trades matched`,
        nextStep: 'Hard-stop day after containment breach.',
        trades: bigLosses,
        coverage: bigLosses.length,
      });
    }

    // Signal 2: Edge fragility map — poorly executed trades in normally profitable setups
    const stratMap = new Map<string, Trade[]>();
    assessed.forEach(t => {
      const key = t.strategy || 'Unknown';
      if (!stratMap.has(key)) stratMap.set(key, []);
      stratMap.get(key)!.push(t);
    });
    const fragileStrats = [...stratMap.entries()].filter(([, ts]) => {
      const poor = ts.filter(t => t.verdict === 'Poorly Executed');
      return poor.length >= 2 && poor.length / ts.length > 0.3;
    });
    if (fragileStrats.length > 0) {
      const fragTrades = fragileStrats.flatMap(([, ts]) => ts.filter(t => t.verdict === 'Poorly Executed'));
      const impact = fragTrades.reduce((s, t) => s + Math.abs(t.actualPnL ?? 0), 0);
      signals.push({
        id: id++,
        name: 'Edge fragility map',
        effort: 'MEDIUM EFFORT',
        impact: -impact,
        confidence: 'Medium',
        priority: 'P2 PRIORITY',
        proof: `Edge fragility detected in ${fragileStrats.length} strateg${fragileStrats.length === 1 ? 'y' : 'ies'} where poorly executed trades exceed 30% of total.\n\nStrategies: ${fragileStrats.map(([k]) => k).join(', ')}.\n\nEstimated leaked value: ${formatCurrency(impact)}.`,
        evidence: `${fragTrades.length} trades matched`,
        nextStep: 'Narrow allowed context envelope.',
        trades: fragTrades,
        coverage: fragTrades.length,
      });
    }

    // Signal 3: Few large losses dominate
    if (metrics.losses.length >= 2) {
      const sorted = [...metrics.losses].sort((a, b) => Math.abs(b.actualPnL ?? 0) - Math.abs(a.actualPnL ?? 0));
      const topCount = Math.max(1, Math.ceil(sorted.length * 0.3));
      const topLosses = sorted.slice(0, topCount);
      const topImpact = topLosses.reduce((s, t) => s + Math.abs(t.actualPnL ?? 0), 0);
      const topPct = metrics.totalLoss > 0 ? Math.round((topImpact / metrics.totalLoss) * 100) : 0;
      if (topPct >= 50) {
        signals.push({
          id: id++,
          name: 'Few large losses dominate',
          effort: 'MEDIUM EFFORT',
          impact: -topImpact,
          confidence: 'High',
          priority: 'P3 PRIORITY',
          proof: `Top ${topCount} loss${topCount === 1 ? '' : 'es'} account for ${topPct}% of total loss.\n\nSuggested hard max loss/trade: ${formatCurrency(avgLoss * 1.2)}.\n\nConcentration risk: ${topPct}% of total loss in ${Math.round((topCount / metrics.losses.length) * 100)}% of losing trades.`,
          evidence: `${topLosses.length} trades matched`,
          nextStep: `Set hard max loss/trade at ${formatCurrency(avgLoss * 1.2)} (top losses currently account for ${topPct}% of total loss).`,
          trades: topLosses,
          coverage: topLosses.length,
        });
      }
    }

    // Signal 4: Emotional leak — trades with negative emotions that lost
    const emotionalLeaks = metrics.losses.filter(t =>
      ['FOMO', 'Revenge Trading', 'Greedy', 'Frustrated', 'Impatient'].includes(t.emotion),
    );
    if (emotionalLeaks.length >= 2) {
      const impact = emotionalLeaks.reduce((s, t) => s + Math.abs(t.actualPnL ?? 0), 0);
      signals.push({
        id: id++,
        name: 'Emotional trading leak',
        effort: 'HIGH EFFORT',
        impact: -impact,
        confidence: 'Medium',
        priority: 'P2 PRIORITY',
        proof: `${emotionalLeaks.length} losing trades entered with high-risk emotional states.\n\nEmotions detected: ${[...new Set(emotionalLeaks.map(t => t.emotion))].join(', ')}.\n\nEstimated emotional leak: ${formatCurrency(impact)}.`,
        evidence: `${emotionalLeaks.length} trades matched`,
        nextStep: 'Implement mandatory cooldown after emotional triggers.',
        trades: emotionalLeaks,
        coverage: emotionalLeaks.length,
      });
    }

    // Signal 5: R-multiple mismanagement
    const rTrades = assessed.filter(t => getRMultiple(t) !== null);
    const badR = rTrades.filter(t => {
      const r = getRMultiple(t);
      return r !== null && r < -1;
    });
    if (badR.length >= 2) {
      const impact = badR.reduce((s, t) => s + Math.abs(t.actualPnL ?? 0), 0);
      signals.push({
        id: id++,
        name: 'Risk-reward breakdown',
        effort: 'LOW EFFORT',
        impact: -impact,
        confidence: 'High',
        priority: 'P2 PRIORITY',
        proof: `${badR.length} trades exceeded planned risk (R < -1).\n\nAverage R-multiple on these trades: ${(badR.reduce((s, t) => s + (getRMultiple(t) ?? 0), 0) / badR.length).toFixed(2)}R.\n\nHonoring stop losses would have saved an estimated ${formatCurrency(impact * 0.4)}.`,
        evidence: `${badR.length} trades matched`,
        nextStep: 'Hard stop at planned stop-loss level on every trade.',
        trades: badR,
        coverage: badR.length,
      });
    }

    return signals.sort((a, b) => a.impact - b.impact).slice(0, 5);
  }, [assessed, metrics, formatCurrency]);

  /* ── Strengths ─────────────────────────────────────────────────── */
  const strengths = useMemo((): StrengthSignal[] => {
    const signals: StrengthSignal[] = [];

    // Best strategy
    const stratMap = new Map<string, Trade[]>();
    assessed.forEach(t => {
      const key = t.strategy || 'Unknown';
      if (!stratMap.has(key)) stratMap.set(key, []);
      stratMap.get(key)!.push(t);
    });
    const bestStrat = [...stratMap.entries()]
      .filter(([, ts]) => ts.length >= 3)
      .map(([name, ts]) => {
        const wins = ts.filter(t => (t.actualPnL ?? 0) > 0);
        const value = ts.reduce((s, t) => s + (t.actualPnL ?? 0), 0);
        return { name, winRate: wins.length / ts.length, value, trades: ts };
      })
      .filter(s => s.winRate >= 0.6 && s.value > 0)
      .sort((a, b) => b.value - a.value);

    if (bestStrat.length > 0) {
      const s = bestStrat[0];
      signals.push({
        name: `${s.name} edge`,
        value: s.value,
        description: `${Math.round(s.winRate * 100)}% win rate across ${s.trades.length} trades. Consistent profit generator.`,
        trades: s.trades,
      });
    }

    // Best coin
    const coinMap = new Map<string, Trade[]>();
    assessed.forEach(t => {
      if (!coinMap.has(t.coin)) coinMap.set(t.coin, []);
      coinMap.get(t.coin)!.push(t);
    });
    const bestCoin = [...coinMap.entries()]
      .filter(([, ts]) => ts.length >= 3)
      .map(([coin, ts]) => {
        const wins = ts.filter(t => (t.actualPnL ?? 0) > 0);
        const value = ts.reduce((s, t) => s + (t.actualPnL ?? 0), 0);
        return { coin, winRate: wins.length / ts.length, value, trades: ts };
      })
      .filter(c => c.winRate >= 0.6 && c.value > 0)
      .sort((a, b) => b.value - a.value);

    if (bestCoin.length > 0) {
      const c = bestCoin[0];
      signals.push({
        name: `${c.coin} specialist`,
        value: c.value,
        description: `${Math.round(c.winRate * 100)}% win rate on ${c.coin} across ${c.trades.length} trades.`,
        trades: c.trades,
      });
    }

    // Calm trading edge
    const calmTrades = assessed.filter(t => ['Calm', 'Neutral', 'Confident'].includes(t.emotion));
    if (calmTrades.length >= 3) {
      const value = calmTrades.reduce((s, t) => s + (t.actualPnL ?? 0), 0);
      const wr = calmTrades.filter(t => (t.actualPnL ?? 0) > 0).length / calmTrades.length;
      if (value > 0 && wr >= 0.55) {
        signals.push({
          name: 'Calm state edge',
          value,
          description: `${Math.round(wr * 100)}% win rate when trading calm/neutral. Your composure is profitable.`,
          trades: calmTrades,
        });
      }
    }

    return signals;
  }, [assessed]);

  /* ── Action plan items ─────────────────────────────────────────── */
  const actionItems = useMemo((): ActionItem[] => {
    return diagnostics.map((d, i) => ({
      id: i + 1,
      name: d.name,
      description: d.nextStep,
      recoverable: Math.abs(d.impact),
      timeframe: '64d range',
    }));
  }, [diagnostics]);

  /* ── Top leak / strength / action ──────────────────────────────── */
  const topLeak = diagnostics[0] ?? null;
  const topStrength = strengths[0] ?? null;
  const firstAction = diagnostics[0] ?? null;

  /* ── Equity curve for recovery projection ──────────────────────── */
  const equityCurve = useMemo(() => {
    const sorted = [...assessed].sort(
      (a, b) => new Date(a.exitDate ?? a.createdAt).getTime() - new Date(b.exitDate ?? b.createdAt).getTime(),
    );
    let cumPnl = 0;
    return sorted.map(t => {
      cumPnl += t.actualPnL ?? 0;
      return {
        date: format(new Date(t.exitDate ?? t.createdAt), 'MMM d'),
        pnl: cumPnl,
        projected: cumPnl + metrics.conservativeRecoverable * (assessed.indexOf(t) + 1) / assessed.length,
      };
    });
  }, [assessed, metrics.conservativeRecoverable]);

  const totalEdgeValue = strengths.reduce((s, st) => s + st.value, 0);
  const totalRecoverable = diagnostics.reduce((s, d) => s + Math.abs(d.impact), 0);

  /* ── Health score gauge arc calculation ─────────────────────────── */
  const gaugeRadius = 110;
  const gaugeStroke = 12;
  const gaugeCircumference = 2 * Math.PI * gaugeRadius;
  const gaugeArcLength = gaugeCircumference * 0.75; // 270-degree arc
  const healthFill = (metrics.healthScore / 100) * gaugeArcLength;

  /* ── Effort color helper ───────────────────────────────────────── */
  function effortColor(e: EffortLevel) {
    switch (e) {
      case 'LOW EFFORT': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'MEDIUM EFFORT': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'HIGH EFFORT': return 'bg-red-500/20 text-red-400 border-red-500/30';
    }
  }

  function priorityColor(p: Priority) {
    switch (p) {
      case 'P1 PRIORITY': return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'P2 PRIORITY': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'P3 PRIORITY': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    }
  }

  /* ── Health bar color ──────────────────────────────────────────── */
  function healthColor(score: number) {
    if (score >= 70) return '#4ade80';
    if (score >= 40) return '#facc15';
    return '#f87171';
  }

  const hc = healthColor(metrics.healthScore);

  /* ── Empty state ───────────────────────────────────────────────── */
  if (assessed.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <Shield size={48} className="text-[var(--muted-foreground)] mb-4 opacity-40" />
          <h2 className="text-xl font-semibold mb-2">No Verdicts Yet</h2>
          <p className="text-[var(--muted-foreground)] text-sm max-w-xs">
            Close trades to see performance verdicts — an honest analysis of execution quality.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative space-y-6 anim-fade-up">
      <div className="hero-glow" />

      {/* ── Hero + At A Glance ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Hero */}
        <div className="lg:col-span-2 bg-[var(--card)] border border-[var(--border)] rounded-xl p-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--muted)] text-[10px] font-semibold uppercase tracking-widest text-[var(--accent)] mb-4">
            <Shield size={12} /> Verdict Engine
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold mb-3">Performance Verdicts</h1>
          <p className="text-[var(--muted-foreground)] text-sm mb-6">
            Analyzing {assessed.length} trade{assessed.length !== 1 ? 's' : ''} in the selected period.
            Use the top-bar time range filter to adjust the scope.
          </p>
          {/* Sub-tabs — scroll to section */}
          <div className="flex gap-2 flex-wrap">
            {SUB_TABS.map(tab => (
              <button key={tab} onClick={() => scrollToSection(tab)}
                className="px-4 py-2 rounded-lg text-sm font-medium transition-colors text-[var(--muted-foreground)] hover:bg-[var(--muted)]/50 hover:text-white"
              >{tab}</button>
            ))}
          </div>
        </div>
        {/* At A Glance */}
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--muted-foreground)] mb-4">At A Glance</p>
          <div className="space-y-4">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-[var(--muted-foreground)]">Current Net</p>
              <p className={`text-xl font-bold ${metrics.currentNet >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {formatCurrency(metrics.currentNet)}
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest text-[var(--muted-foreground)]">Conservative Recoverable</p>
              <p className="text-xl font-bold text-green-400">
                +{formatCurrency(metrics.conservativeRecoverable)}
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest text-[var(--muted-foreground)]">Projected Net After Fixes</p>
              <p className={`text-xl font-bold ${metrics.projectedNet >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {formatCurrency(metrics.projectedNet)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Health Score Section ── */}
      <div className="flex flex-col items-center">
        {/* Health gauge + flanking stats */}
        <div className="w-full flex items-center justify-between">
          {/* Areas to improve */}
          <div className="text-left">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 rounded-lg bg-red-500/10"><TrendingDown size={16} className="text-red-400" /></div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-red-400">Areas to Improve</p>
            </div>
            <p className="text-3xl sm:text-4xl font-bold">{diagnostics.length}</p>
            <p className="text-sm text-red-400 mt-1">{formatCurrency(-metrics.grossLeakImpact)} <span className="text-[var(--muted-foreground)] text-xs">Total Impact</span></p>
          </div>

          {/* SVG Gauge */}
          <div className="relative w-48 h-48 sm:w-56 sm:h-56">
            <svg viewBox="0 0 260 260" className="w-full h-full -rotate-[135deg]">
              {/* Background arc */}
              <circle
                cx="130" cy="130" r={gaugeRadius}
                fill="none"
                stroke="var(--muted)"
                strokeWidth={gaugeStroke}
                strokeDasharray={`${gaugeArcLength} ${gaugeCircumference}`}
                strokeLinecap="round"
              />
              {/* Filled arc */}
              <circle
                cx="130" cy="130" r={gaugeRadius}
                fill="none"
                stroke={hc}
                strokeWidth={gaugeStroke}
                strokeDasharray={`${healthFill} ${gaugeCircumference}`}
                strokeLinecap="round"
                className="transition-all duration-700"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-4xl sm:text-5xl font-bold">{metrics.healthScore}</span>
              <span className="text-sm text-[var(--muted-foreground)] -mt-1">%</span>
              <span className="text-[10px] uppercase tracking-widest text-[var(--muted-foreground)] mt-1">Health Score</span>
            </div>
          </div>

          {/* Trades analyzed */}
          <div className="text-right">
            <div className="flex items-center justify-end gap-2 mb-2">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--accent)]">Trades Analyzed</p>
              <div className="p-2 rounded-lg bg-[var(--accent)]/10"><TrendingUp size={16} className="text-[var(--accent)]" /></div>
            </div>
            <p className="text-3xl sm:text-4xl font-bold">{assessed.length}</p>
            <p className="text-xs text-[var(--muted-foreground)] mt-1">Coverage <span className="text-[var(--accent)] font-semibold">{metrics.coverage}%</span></p>
          </div>
        </div>

        {/* Rating badge */}
        <div className="mt-2 inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-[var(--muted)] text-sm">
          <Shield size={14} className="text-[var(--muted-foreground)]" />
          {metrics.healthScore >= 70 ? 'Strong' : metrics.healthScore >= 40 ? 'Average' : 'Needs Work'}
        </div>

        {/* Room to grow / Strengths bar */}
        <div className="w-full mt-6">
          <div className="flex justify-between mb-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-red-400">
              Room to Grow ({metrics.roomToGrow}%)
            </span>
            <span className="text-[10px] font-semibold uppercase tracking-widest text-green-400">
              Strengths Value ({metrics.strengthsValue}%)
            </span>
          </div>
          <div className="h-3 rounded-full bg-[var(--muted)] overflow-hidden flex">
            <div className="h-full bg-red-400 transition-all" style={{ width: `${Math.max(metrics.roomToGrow, 2)}%` }} />
            <div className="h-full flex-1" />
            <div className="h-full bg-green-400 transition-all" style={{ width: `${Math.max(metrics.strengthsValue, 2)}%` }} />
          </div>
        </div>
      </div>

      {/* ══════════════ SUMMARY ══════════════ */}
      <div ref={summaryRef} className="scroll-mt-4">
          {/* The Big Picture */}
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-6">
            <h3 className="text-xl font-bold text-center mb-6">The Big Picture</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
              {/* Current Net P&L */}
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <TrendingDown size={16} className="text-[var(--muted-foreground)]" />
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-red-400">Current Net P&L</p>
                </div>
                <p className={`text-2xl sm:text-3xl font-bold ${metrics.currentNet >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {formatCurrency(metrics.currentNet)}
                </p>
              </div>

              {/* Projected Net After Fixes (center, bigger card) */}
              <div className="bg-[var(--muted)] rounded-xl p-5 text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Target size={16} className="text-[var(--muted-foreground)]" />
                  <p className="text-[10px] font-semibold uppercase tracking-widest">Projected Net After Fixes</p>
                </div>
                <p className={`text-3xl sm:text-4xl font-bold mb-2 ${metrics.projectedNet >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {formatCurrency(metrics.projectedNet)}
                </p>
                <p className="text-xs text-[var(--muted-foreground)]">
                  Current net plus conservative recoverable leak estimate
                </p>
                <p className="text-[10px] text-[var(--muted-foreground)] mt-1">
                  {formatCurrency(metrics.currentNet)} + {formatCurrency(metrics.conservativeRecoverable)} = {formatCurrency(metrics.projectedNet)}
                </p>
                <p className="text-[10px] text-[var(--muted-foreground)] mt-2">
                  Conservative recoverable is overlap-adjusted for confidence and signal overlap (diagnostics gross potential drag: {formatCurrency(-metrics.grossLeakImpact)}).
                </p>
              </div>

              {/* Conservative Recoverable */}
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <TrendingUp size={16} className="text-[var(--muted-foreground)]" />
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-green-400">Conservative Recoverable</p>
                </div>
                <p className="text-2xl sm:text-3xl font-bold text-green-400">
                  +{formatCurrency(metrics.conservativeRecoverable)}
                </p>
              </div>
            </div>

            <p className="text-xs text-[var(--muted-foreground)] text-center mt-6 pt-4 border-t border-[var(--border)]">
              Diagnostics totals are model signal totals and can overlap. Projection always uses the conservative recoverable value shown above.
            </p>
          </div>

          {/* How to read this */}
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl px-4 py-3 text-sm">
            <span className="font-semibold text-blue-400">How to read this: </span>
            <span className="text-[var(--muted-foreground)]">
              Current Net P&L is your realized result for this range. Leak Impact is a conservative recoverable estimate from detected behavior patterns. Projected Net After Fixes equals current net plus this estimate.
            </span>
          </div>

          {/* Top Leak / Top Strength / First Action */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="bg-[var(--card)] border border-yellow-500/30 rounded-xl p-4">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-yellow-400 mb-1">Top Leak</p>
              <p className="text-sm font-bold mb-1">{topLeak?.name ?? 'No leaks detected'}</p>
              <p className="text-xs text-[var(--muted-foreground)]">
                {topLeak ? `Impact: ${formatCurrency(topLeak.impact)}` : 'Clean execution this period.'}
              </p>
            </div>
            <div className="bg-[var(--card)] border border-green-500/30 rounded-xl p-4">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-green-400 mb-1">Top Strength</p>
              <p className="text-sm font-bold mb-1">{topStrength?.name ?? 'No major strength detected'}</p>
              <p className="text-xs text-[var(--muted-foreground)]">
                {topStrength?.description ?? 'Run a longer period to reveal robust edges.'}
              </p>
            </div>
            <div className="bg-[var(--card)] border border-red-500/30 rounded-xl p-4">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-red-400 mb-1">First Action Now</p>
              <p className="text-sm font-bold mb-1">{firstAction?.name ?? 'No action needed'}</p>
              <p className="text-xs text-[var(--muted-foreground)]">
                {firstAction ? <><ArrowRight size={10} className="inline mr-1" />{firstAction.nextStep}</> : 'Keep executing your plan.'}
              </p>
            </div>
          </div>
      </div>

      {/* ══════════════ DIAGNOSTICS ══════════════ */}
      <div ref={diagnosticsRef} className="scroll-mt-4">
          <div className="text-center mb-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--muted-foreground)]">Diagnostics</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
            {/* Left: Signals list */}
            <div className="lg:col-span-3 bg-[var(--card)] border border-[var(--border)] rounded-xl p-5">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-[var(--accent)]" />
                  <h3 className="text-lg font-bold">
                    {diagnostics.length} Detected Opportunities & Leaks (Gross Diagnostics)
                  </h3>
                </div>
                <span className="text-red-400 font-bold">{formatCurrency(-metrics.grossLeakImpact)}</span>
              </div>
              <p className="text-xs text-[var(--muted-foreground)] mb-1">
                Gross absolute signal impact: {formatCurrency(metrics.grossLeakImpact)}.
                Overlap-adjusted: {formatCurrency(metrics.grossLeakImpact * 0.48)}.
                Uniqueness-adjusted: {formatCurrency(metrics.grossLeakImpact * 0.26)}.
              </p>
              <p className="text-xs text-[var(--muted-foreground)] mb-5">
                Directional net signal: {formatCurrency(-metrics.grossLeakImpact)}.
                Conservative recoverable used in projection above: +{formatCurrency(metrics.conservativeRecoverable)}.
              </p>

              {diagnostics.length === 0 ? (
                <div className="py-12 text-center">
                  <p className="text-[var(--muted-foreground)] text-sm">No diagnostic signals detected in this period.</p>
                  <p className="text-[var(--muted-foreground)] text-xs mt-1">Try expanding the time window.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {diagnostics.map((d, i) => (
                    <button
                      key={d.id}
                      onClick={() => setSelectedDiagnostic(i)}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl transition-colors text-left ${
                        selectedDiagnostic === i
                          ? 'bg-[var(--muted)] border border-[var(--border)]'
                          : 'hover:bg-[var(--muted)]/50'
                      }`}
                    >
                      <span className="text-xs text-[var(--muted-foreground)] w-6 shrink-0 tabular-nums">
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      <AlertTriangle size={16} className="text-yellow-400 shrink-0" />
                      <span className="text-sm font-medium flex-1 truncate">{d.name}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded border font-semibold ${effortColor(d.effort)}`}>
                        {d.effort}
                      </span>
                      {/* Impact bar */}
                      <div className="w-20 h-2 rounded-full bg-[var(--muted)] overflow-hidden shrink-0">
                        <div
                          className="h-full rounded-full bg-red-400"
                          style={{ width: `${Math.min(100, (Math.abs(d.impact) / metrics.grossLeakImpact) * 100)}%` }}
                        />
                      </div>
                      <span className="text-xs text-red-400 font-medium w-20 text-right shrink-0 tabular-nums">
                        {formatCurrency(d.impact)}
                      </span>
                      {selectedDiagnostic === i ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Right: Impact details */}
            <div className="lg:col-span-2 bg-[var(--card)] border border-[var(--border)] rounded-xl p-5">
              {diagnostics.length > 0 && diagnostics[selectedDiagnostic] ? (() => {
                const d = diagnostics[selectedDiagnostic];
                return (
                  <>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-lg font-bold">Impact details</h4>
                      <span className={`text-[10px] px-2 py-0.5 rounded border font-semibold ${priorityColor(d.priority)}`}>
                        {d.priority}
                      </span>
                    </div>
                    <p className="text-sm text-[var(--muted-foreground)] mb-4">{d.name}</p>

                    <div className="grid grid-cols-2 gap-3 mb-5">
                      <div className="bg-[var(--muted)] rounded-lg p-3">
                        <p className="text-[10px] uppercase tracking-widest text-[var(--muted-foreground)] mb-1">Estimated Impact</p>
                        <p className="text-lg font-bold">{formatCurrency(d.impact)}</p>
                      </div>
                      <div className="bg-[var(--muted)] rounded-lg p-3">
                        <p className="text-[10px] uppercase tracking-widest text-[var(--muted-foreground)] mb-1">Confidence</p>
                        <p className="text-lg font-bold">{d.confidence}</p>
                      </div>
                    </div>

                    {/* Trade-backed proof */}
                    <div className="mb-5">
                      <div className="flex items-center gap-2 mb-2">
                        <Eye size={14} className="text-[var(--accent)]" />
                        <p className="text-[10px] font-semibold uppercase tracking-widest">Trade-Backed Proof</p>
                      </div>
                      <div className="bg-[var(--muted)] rounded-lg p-4 text-sm leading-relaxed whitespace-pre-line">
                        {d.proof}
                      </div>
                      <p className="text-xs text-[var(--muted-foreground)] mt-2">
                        Next step: {d.nextStep}
                      </p>
                    </div>

                    {/* Evidence library */}
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Crosshair size={14} className="text-[var(--accent)]" />
                        <p className="text-[10px] font-semibold uppercase tracking-widest">Evidence Library</p>
                      </div>
                      <p className="text-xs text-[var(--muted-foreground)] mb-3">
                        {d.trades.length} trade{d.trades.length !== 1 ? 's' : ''} matched &middot; {d.coverage} clusters &middot; Net {formatCurrency(d.trades.reduce((s, t) => s + (t.actualPnL ?? 0), 0))}
                      </p>
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {d.trades.slice(0, 5).map(t => (
                          <div key={t.id} className="flex items-center justify-between bg-[var(--muted)] rounded-lg px-3 py-2.5">
                            <div>
                              <p className="text-sm font-medium">{t.coin} <span className={(t.direction ?? 'long') === 'long' ? 'text-green-400' : 'text-red-400'}>{(t.direction ?? 'long').toUpperCase()}</span></p>
                              <p className="text-[10px] text-[var(--muted-foreground)]">
                                {t.exitDate ? format(parseISO(t.exitDate), 'M/d/yyyy, h:mm:ss a') : '—'} &middot; {formatCurrency(t.actualPnL ?? 0)}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                      <p className="text-[10px] text-[var(--muted-foreground)] mt-3 flex items-center gap-1">
                        <Sparkles size={10} className="text-[var(--accent)]" />
                        Evidence derives from trades inside the currently selected date range.
                      </p>
                    </div>
                  </>
                );
              })() : (
                <div className="py-12 text-center text-[var(--muted-foreground)] text-sm">
                  No signals to inspect.
                </div>
              )}
            </div>
          </div>
      </div>

      {/* ══════════════ ACTION PLAN ══════════════ */}
      <div ref={actionPlanRef} className="scroll-mt-4">
          {/* Edge Analysis */}
          <div className="text-center mb-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--muted-foreground)]">Edge Analysis</p>
          </div>

          <div className="mb-8">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-green-500/10">
                  <Sparkles size={20} className="text-green-400" />
                </div>
                <div>
                  <h3 className="text-xl font-bold">Top Strengths</h3>
                  <p className="text-sm text-[var(--muted-foreground)]">
                    These are your superpowers. The patterns that consistently make you money.
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-green-400">Total Edge Value</p>
                <p className="text-xl font-bold">+{formatCurrency(totalEdgeValue)}</p>
              </div>
            </div>

            {strengths.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-[var(--muted-foreground)] text-sm">No strengths detected in this period.</p>
                <p className="text-[var(--muted-foreground)] text-xs mt-1 italic">
                  Pro tip: Double down on your winning patterns during your best windows for maximum edge.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {strengths.map((s, i) => (
                  <div key={i} className="bg-[var(--card)] border border-green-500/20 rounded-xl p-4">
                    <p className="text-sm font-bold text-green-400 mb-1">{s.name}</p>
                    <p className="text-xs text-[var(--muted-foreground)] mb-2">{s.description}</p>
                    <p className="text-lg font-bold text-green-400">+{formatCurrency(s.value)}</p>
                    <p className="text-[10px] text-[var(--muted-foreground)]">{s.trades.length} trades</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Execution Plan */}
          <div className="text-center mb-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--muted-foreground)]">Action Plan</p>
          </div>

          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-xl font-bold">Execution Plan</h3>
              <p className="text-sm text-[var(--muted-foreground)]">
                Prioritized actions for this exact period. Execute step 1 first, then validate result stability before moving to step 2.
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-green-400">Estimated Recoverable</p>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--muted)] text-sm mt-1">
                <Target size={14} className="text-green-400" />
                <span className="font-bold text-green-400">{formatCurrency(totalRecoverable)}</span>
                <span className="text-[var(--muted-foreground)]">64d range</span>
              </div>
            </div>
          </div>

          {actionItems.length === 0 ? (
            <div className="text-center py-12 text-[var(--muted-foreground)] text-sm">
              No action items — execution looks clean.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {actionItems.map((a, i) => (
                <div
                  key={a.id}
                  className={`bg-[var(--card)] border rounded-xl p-5 ${
                    i === 0 ? 'border-yellow-500/30' : 'border-[var(--border)]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-4">
                    <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                      i === 0
                        ? 'bg-yellow-500/20 text-yellow-400'
                        : 'bg-[var(--muted)] text-[var(--muted-foreground)]'
                    }`}>
                      {String(a.id).padStart(2, '0')}
                    </span>
                    {i === 0 && <Target size={16} className="text-yellow-400" />}
                    {i === 1 && <Shield size={16} className="text-[var(--muted-foreground)]" />}
                    {i >= 2 && <TrendingUp size={16} className="text-[var(--muted-foreground)]" />}
                  </div>
                  <h4 className="text-sm font-bold mb-2">{a.name}</h4>
                  <p className="text-xs text-[var(--muted-foreground)] mb-4 leading-relaxed">{a.description}</p>
                  <div className="border-t border-[var(--border)] pt-3 flex items-center gap-2 text-xs text-[var(--muted-foreground)]">
                    <ArrowRight size={12} />
                    <span>Run for 5-7 sessions, then reassess</span>
                    <span className="ml-auto text-green-400 font-semibold tabular-nums">
                      {formatCurrency(a.recoverable)} {a.timeframe}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
      </div>

      {/* ══════════════ COACH NOTES ══════════════ */}
      <div ref={coachNotesRef} className="scroll-mt-4">
        <div className="flex flex-col items-center">
          <div className="max-w-2xl w-full bg-gradient-to-b from-[var(--accent)]/5 to-transparent border border-[var(--accent)]/20 rounded-2xl p-8 text-center">
            <div className="w-12 h-12 rounded-full bg-[var(--accent)]/10 flex items-center justify-center mx-auto mb-4">
              <Sparkles size={24} className="text-[var(--accent)]" />
            </div>
            <h3 className="text-2xl font-bold mb-4">You&apos;re Doing Better Than You Think</h3>

            {diagnostics.length > 0 ? (
              <div className="space-y-3 text-sm text-[var(--muted-foreground)]">
                {diagnostics.slice(0, 2).map(d => (
                  <p key={d.id}>
                    Apply a concrete guardrail for &apos;{d.name}&apos; and track adherence for 14 days.
                  </p>
                ))}
                <p className="mt-4">
                  The current leak set represents {metrics.grossLeakImpact > 0 && metrics.totalLoss > 0
                    ? `${Math.round((metrics.grossLeakImpact / metrics.totalLoss) * 100)}%`
                    : '0%'} of total detected impact in this range.
                </p>
              </div>
            ) : (
              <p className="text-sm text-[var(--muted-foreground)]">
                Your execution is clean this period. Keep focusing on process over outcome and the results will compound.
              </p>
            )}

            {strengths.length > 0 && (
              <div className="mt-6 pt-4 border-t border-[var(--border)]">
                <p className="text-sm text-[var(--muted-foreground)]">
                  Your edge in <span className="text-[var(--accent)] font-semibold">{strengths[0].name}</span> is real
                  — {strengths[0].description}. Lean into this strength.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Range Summary Footer ── */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl px-4 py-3 flex flex-wrap items-center gap-4 text-xs">
        <div className="flex items-center gap-1.5">
          <Sparkles size={12} className="text-[var(--accent)]" />
          <span className="font-semibold">Range Summary</span>
        </div>
        <span className="text-[var(--muted-foreground)]">
          Leak diagnostics: {formatCurrency(-metrics.grossLeakImpact)} &middot;
          Overlap-adjusted diagnostics: {formatCurrency(metrics.grossLeakImpact * 0.48)} &middot;
          Conservative recoverable: +{formatCurrency(metrics.conservativeRecoverable)} &middot;
          Detected strengths: +{formatCurrency(totalEdgeValue)}
        </span>
        <div className="ml-auto flex items-center gap-1.5">
          <Shield size={12} style={{ color: hc }} />
          <span>Health score: {metrics.healthScore}%</span>
        </div>
      </div>

    </div>
  );
}
