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
      case 'LOW EFFORT': return 'text-[var(--green)]';
      case 'MEDIUM EFFORT': return 'text-[var(--amber)]';
      case 'HIGH EFFORT': return 'text-[var(--red)]';
    }
  }

  function priorityColor(p: Priority) {
    switch (p) {
      case 'P1 PRIORITY': return 'text-[var(--red)]';
      case 'P2 PRIORITY': return 'text-[var(--amber)]';
      case 'P3 PRIORITY': return 'text-[var(--teal)]';
    }
  }

  /* ── Health bar color ──────────────────────────────────────────── */
  function healthColor(score: number) {
    if (score >= 70) return '#24c88a';
    if (score >= 40) return '#d99405';
    return '#ff4d5e';
  }

  const hc = healthColor(metrics.healthScore);

  /* ── Empty state ───────────────────────────────────────────────── */
  if (assessed.length === 0) {
    return (
      <div className="pwrap anim-fade-up">
        <div className="phead" style={{ marginBottom: 26 }}>
          <p className="eyebrow" style={{ color: 'var(--amber)', fontWeight: 700, letterSpacing: '.04em', fontSize: 10, textTransform: 'uppercase' }}>
            <Shield size={12} /> Verdict Engine
          </p>
          <h2>Performance Verdicts</h2>
          <p className="sub">An honest read on execution quality — leaks, strengths, and the next change worth making.</p>
        </div>
        <div className="blank" style={{ padding: '48px 28px', textAlign: 'center' }}>
          <span className="corner" style={{ left: -1, top: -1, borderRight: 0, borderBottom: 0 }} />
          <span className="corner" style={{ right: -1, bottom: -1, borderLeft: 0, borderTop: 0 }} />
          <div
            className="badge"
            style={{ margin: '0 auto 24px', border: '1px solid rgba(217,148,5,.4)', background: 'var(--panel-2)' }}
          >
            <Shield size={22} style={{ color: 'var(--amber)' }} />
          </div>
          <h4>No verdicts yet</h4>
          <p>Close trades to see performance verdicts — an honest analysis of execution quality.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="pwrap anim-fade-up">
      {/* ── Header ── */}
      <div className="phead" style={{ marginBottom: 26 }}>
        <p className="eyebrow" style={{ color: 'var(--amber)', fontWeight: 700, letterSpacing: '.04em', fontSize: 10, textTransform: 'uppercase' }}>
          <Shield size={12} /> Verdict Engine
        </p>
        <h2>Performance Verdicts</h2>
        <p className="sub">
          Analyzing {assessed.length} trade{assessed.length !== 1 ? 's' : ''} in the selected period.
          Use the top-bar time range filter to adjust the scope.
        </p>
      </div>

      {/* ── Section jump tabs ── */}
      <div className="tabs line" style={{ marginBottom: 24 }}>
        {SUB_TABS.map(tab => (
          <button key={tab} onClick={() => scrollToSection(tab)}>{tab}</button>
        ))}
      </div>

      {/* ── At A Glance ── */}
      <div className="card">
        <span className="accent" style={{ width: 56, background: 'var(--amber)' }} />
        <div className="cardhead">
          <div>
            <h3>At A Glance</h3>
            <p className="sub">Realized result versus the conservative recovery model</p>
          </div>
          <Crosshair size={16} style={{ marginLeft: 'auto', color: 'var(--amber)' }} />
        </div>
        <div className="nba">
          <div className="inset">
            <span className="accent" style={{ background: 'var(--amber)' }} />
            <p className="lbl">CURRENT NET</p>
            <em style={{ color: metrics.currentNet >= 0 ? 'var(--green)' : 'var(--red)' }}>{formatCurrency(metrics.currentNet)}</em>
            <small>Realized result for selected range</small>
          </div>
          <div className="inset">
            <span className="accent" style={{ background: 'var(--green)' }} />
            <p className="lbl">CONSERVATIVE RECOVERABLE</p>
            <em style={{ color: 'var(--green)' }}>{formatCurrency(metrics.conservativeRecoverable)}</em>
            <small>Overlap-adjusted leak recovery estimate</small>
          </div>
          <div className="inset">
            <span className="accent" style={{ background: 'var(--teal)' }} />
            <p className="lbl">PROJECTED NET AFTER FIXES</p>
            <em style={{ color: metrics.projectedNet >= 0 ? 'var(--green)' : 'var(--red)' }}>{formatCurrency(metrics.projectedNet)}</em>
            <small>Current net plus recoverable estimate</small>
          </div>
        </div>
      </div>

      {/* ── Health Score Section ── */}
      <div className="card" style={{ marginTop: 24 }}>
        <span className="accent" style={{ width: 56, background: hc }} />
        <div className="cardhead">
          <div>
            <h3>Execution Health</h3>
            <p className="sub">Blend of discipline, win consistency, and leak control</p>
          </div>
          <span className="chip" style={{ marginLeft: 'auto', color: hc, borderColor: 'var(--line)' }}>
            <Shield size={12} />
            {metrics.healthScore >= 70 ? 'Strong' : metrics.healthScore >= 40 ? 'Average' : 'Needs Work'}
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 24, alignItems: 'center', marginTop: 22 }}>
          {/* Areas to improve */}
          <div className="inset" style={{ position: 'relative', padding: '15px 16px' }}>
            <span className="accent" style={{ position: 'absolute', left: 0, top: -1, width: 36, height: 3, background: 'var(--red)' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
              <TrendingDown size={13} style={{ color: 'var(--red)' }} />
              <p className="lbl" style={{ color: 'var(--red)' }}>AREAS TO IMPROVE</p>
            </div>
            <p className="bignum" style={{ fontSize: 34, lineHeight: '42px', marginTop: 8 }}>{diagnostics.length}</p>
            <p style={{ margin: '6px 0 0', fontSize: 11.5, color: 'var(--muted-2)' }}>
              <span style={{ color: 'var(--red)', fontFamily: 'var(--mono)' }}>{formatCurrency(-metrics.grossLeakImpact)}</span> total impact
            </p>
          </div>

          {/* SVG Gauge */}
          <div style={{ position: 'relative', width: 200, height: 200, margin: '0 auto' }}>
            <svg viewBox="0 0 260 260" width="200" height="200" style={{ transform: 'rotate(-135deg)' }}>
              {/* Background arc */}
              <circle
                cx="130" cy="130" r={gaugeRadius}
                fill="none"
                stroke="#141e2a"
                strokeWidth={gaugeStroke}
                strokeDasharray={`${gaugeArcLength} ${gaugeCircumference}`}
              />
              {/* Filled arc */}
              <circle
                cx="130" cy="130" r={gaugeRadius}
                fill="none"
                stroke={hc}
                strokeWidth={gaugeStroke}
                strokeDasharray={`${healthFill} ${gaugeCircumference}`}
                className="transition-all duration-700"
              />
            </svg>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontFamily: 'var(--mono)', fontWeight: 500, fontSize: 42, lineHeight: '48px', color: 'var(--text)' }}>{metrics.healthScore}</span>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--muted-2)' }}>%</span>
              <span className="lbl" style={{ marginTop: 8 }}>HEALTH SCORE</span>
            </div>
          </div>

          {/* Trades analyzed */}
          <div className="inset" style={{ position: 'relative', padding: '15px 16px' }}>
            <span className="accent" style={{ position: 'absolute', left: 0, top: -1, width: 36, height: 3, background: 'var(--teal)' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
              <TrendingUp size={13} style={{ color: 'var(--teal)' }} />
              <p className="lbl" style={{ color: 'var(--teal)' }}>TRADES ANALYZED</p>
            </div>
            <p className="bignum" style={{ fontSize: 34, lineHeight: '42px', marginTop: 8 }}>{assessed.length}</p>
            <p style={{ margin: '6px 0 0', fontSize: 11.5, color: 'var(--muted-2)' }}>
              Coverage <span style={{ color: 'var(--teal)', fontFamily: 'var(--mono)' }}>{metrics.coverage}%</span>
            </p>
          </div>
        </div>

        {/* Room to grow / Strengths bar */}
        <div style={{ marginTop: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span className="lbl" style={{ color: 'var(--red)' }}>ROOM TO GROW ({metrics.roomToGrow}%)</span>
            <span className="lbl" style={{ color: 'var(--green)' }}>STRENGTHS VALUE ({metrics.strengthsValue}%)</span>
          </div>
          <div style={{ display: 'flex', height: 3, background: 'var(--rail)' }}>
            <div style={{ height: 3, background: 'var(--red)', width: `${Math.max(metrics.roomToGrow, 2)}%` }} />
            <div style={{ height: 3, flex: 1 }} />
            <div style={{ height: 3, background: 'var(--green)', width: `${Math.max(metrics.strengthsValue, 2)}%` }} />
          </div>
        </div>
      </div>

      {/* ══════════════ SUMMARY ══════════════ */}
      <div ref={summaryRef} className="scroll-mt-4" style={{ marginTop: 24 }}>
          {/* The Big Picture */}
          <div className="card">
            <span className="accent" style={{ width: 56, background: 'var(--teal)' }} />
            <div className="cardhead">
              <div>
                <h3>The Big Picture</h3>
                <p className="sub">Where the range landed, and where it could land after fixes</p>
              </div>
              <Target size={16} style={{ marginLeft: 'auto', color: 'var(--teal)' }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 12, alignItems: 'stretch', marginTop: 22 }}>
              {/* Current Net P&L */}
              <div className="inset" style={{ position: 'relative', padding: '15px 16px' }}>
                <span className="accent" style={{ position: 'absolute', left: 0, top: -1, width: 36, height: 3, background: 'var(--red)' }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                  <TrendingDown size={13} style={{ color: 'var(--muted-3)' }} />
                  <p className="lbl" style={{ color: 'var(--red)' }}>CURRENT NET P&amp;L</p>
                </div>
                <p style={{ margin: '10px 0 0', fontFamily: 'var(--mono)', fontWeight: 500, fontSize: 24, lineHeight: '30px', color: metrics.currentNet >= 0 ? 'var(--green)' : 'var(--red)' }}>
                  {formatCurrency(metrics.currentNet)}
                </p>
              </div>

              {/* Projected Net After Fixes (center, bigger card) */}
              <div className="inset" style={{ position: 'relative', padding: '15px 16px' }}>
                <span className="accent" style={{ position: 'absolute', left: 0, top: -1, width: 36, height: 3, background: 'var(--amber)' }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                  <Target size={13} style={{ color: 'var(--muted-3)' }} />
                  <p className="lbl" style={{ color: 'var(--amber)' }}>PROJECTED NET AFTER FIXES</p>
                </div>
                <p style={{ margin: '10px 0 0', fontFamily: 'var(--mono)', fontWeight: 500, fontSize: 28, lineHeight: '34px', color: metrics.projectedNet >= 0 ? 'var(--green)' : 'var(--red)' }}>
                  {formatCurrency(metrics.projectedNet)}
                </p>
                <p style={{ margin: '8px 0 0', fontSize: 11, lineHeight: '17px', color: 'var(--muted-2)' }}>
                  Current net plus conservative recoverable leak estimate
                </p>
                <p style={{ margin: '6px 0 0', fontFamily: 'var(--mono)', fontSize: 10.5, color: 'var(--muted-2)' }}>
                  {formatCurrency(metrics.currentNet)} + {formatCurrency(metrics.conservativeRecoverable)} = {formatCurrency(metrics.projectedNet)}
                </p>
                <p style={{ margin: '6px 0 0', fontSize: 10.5, lineHeight: '16px', color: 'var(--muted-2)' }}>
                  Conservative recoverable is overlap-adjusted for confidence and signal overlap (diagnostics gross potential drag: {formatCurrency(-metrics.grossLeakImpact)}).
                </p>
              </div>

              {/* Conservative Recoverable */}
              <div className="inset" style={{ position: 'relative', padding: '15px 16px' }}>
                <span className="accent" style={{ position: 'absolute', left: 0, top: -1, width: 36, height: 3, background: 'var(--green)' }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                  <TrendingUp size={13} style={{ color: 'var(--muted-3)' }} />
                  <p className="lbl" style={{ color: 'var(--green)' }}>CONSERVATIVE RECOVERABLE</p>
                </div>
                <p style={{ margin: '10px 0 0', fontFamily: 'var(--mono)', fontWeight: 500, fontSize: 24, lineHeight: '30px', color: 'var(--green)' }}>
                  {formatCurrency(metrics.conservativeRecoverable)}
                </p>
              </div>
            </div>

            <p className="footnote" style={{ marginTop: 22, paddingTop: 16, borderTop: '1px solid var(--line)' }}>
              Diagnostics totals are model signal totals and can overlap. Projection always uses the conservative recoverable value shown above.
            </p>
          </div>

          {/* How to read this */}
          <div className="disclaim" style={{ marginTop: 20 }}>
            <span>
              <b>How to read this: </b>
              Current Net P&amp;L is your realized result for this range. Leak Impact is a conservative recoverable estimate from detected behavior patterns. Projected Net After Fixes equals current net plus this estimate.
            </span>
          </div>

          {/* Top Leak / Top Strength / First Action */}
          <div className="split-3" style={{ marginTop: 20 }}>
            <div className="card" style={{ padding: '19px 22px 20px' }}>
              <span className="accent" style={{ width: 44, background: 'var(--amber)' }} />
              <p className="lbl" style={{ color: 'var(--amber)' }}>TOP LEAK</p>
              <p style={{ margin: '9px 0 0', fontWeight: 700, fontSize: 13, color: 'var(--text)' }}>{topLeak?.name ?? 'No leaks detected'}</p>
              <p style={{ margin: '6px 0 0', fontSize: 11.5, lineHeight: '17px', color: 'var(--muted-2)' }}>
                {topLeak ? `Impact: ${formatCurrency(topLeak.impact)}` : 'Clean execution this period.'}
              </p>
            </div>
            <div className="card" style={{ padding: '19px 22px 20px' }}>
              <span className="accent" style={{ width: 44, background: 'var(--green)' }} />
              <p className="lbl" style={{ color: 'var(--green)' }}>TOP STRENGTH</p>
              <p style={{ margin: '9px 0 0', fontWeight: 700, fontSize: 13, color: 'var(--text)' }}>{topStrength?.name ?? 'No major strength detected'}</p>
              <p style={{ margin: '6px 0 0', fontSize: 11.5, lineHeight: '17px', color: 'var(--muted-2)' }}>
                {topStrength?.description ?? 'Run a longer period to reveal robust edges.'}
              </p>
            </div>
            <div className="card" style={{ padding: '19px 22px 20px' }}>
              <span className="accent" style={{ width: 44, background: 'var(--red)' }} />
              <p className="lbl" style={{ color: 'var(--red)' }}>FIRST ACTION NOW</p>
              <p style={{ margin: '9px 0 0', fontWeight: 700, fontSize: 13, color: 'var(--text)' }}>{firstAction?.name ?? 'No action needed'}</p>
              <p style={{ margin: '6px 0 0', fontSize: 11.5, lineHeight: '17px', color: 'var(--muted-2)' }}>
                {firstAction ? <><ArrowRight size={10} style={{ display: 'inline', marginRight: 4 }} />{firstAction.nextStep}</> : 'Keep executing your plan.'}
              </p>
            </div>
          </div>
      </div>

      {/* ══════════════ DIAGNOSTICS ══════════════ */}
      <div ref={diagnosticsRef} className="scroll-mt-4" style={{ marginTop: 32 }}>
          <p className="lbl b10" style={{ marginBottom: 14 }}>
            DIAGNOSTICS <span style={{ color: 'var(--amber)' }}>· {diagnostics.length}</span>
          </p>

          <div className="split-2u">
            {/* Left: Signals list */}
            <div className="card">
              <span className="accent" style={{ width: 56, background: 'var(--red)' }} />
              <div className="cardhead">
                <div>
                  <h3>{diagnostics.length} Detected Opportunities &amp; Leaks</h3>
                  <p className="sub">Gross diagnostics — signals can overlap</p>
                </div>
                <span style={{ marginLeft: 'auto', fontFamily: 'var(--mono)', fontSize: 14, color: 'var(--red)' }}>
                  {formatCurrency(-metrics.grossLeakImpact)}
                </span>
              </div>
              <p style={{ margin: '16px 0 0', fontSize: 11.5, lineHeight: '18px', color: 'var(--muted-2)' }}>
                Gross absolute signal impact: <span style={{ fontFamily: 'var(--mono)', color: 'var(--red)' }}>{formatCurrency(metrics.grossLeakImpact)}</span>.
                {' '}Overlap-adjusted: <span style={{ fontFamily: 'var(--mono)', color: 'var(--amber)' }}>{formatCurrency(metrics.grossLeakImpact * 0.48)}</span>.
                {' '}Uniqueness-adjusted: <span style={{ fontFamily: 'var(--mono)', color: 'var(--teal)' }}>{formatCurrency(metrics.grossLeakImpact * 0.26)}</span>.
              </p>
              <p style={{ margin: '6px 0 0', fontSize: 11.5, lineHeight: '18px', color: 'var(--muted-2)' }}>
                Directional net signal: <span style={{ fontFamily: 'var(--mono)', color: 'var(--red)' }}>{formatCurrency(-metrics.grossLeakImpact)}</span>.
                {' '}Conservative recoverable used in projection above: <span style={{ fontFamily: 'var(--mono)', color: 'var(--green)' }}>{formatCurrency(metrics.conservativeRecoverable)}</span>.
              </p>

              {diagnostics.length === 0 ? (
                <div className="empty-line">
                  No diagnostic signals detected in this period. Try expanding the time window.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 20 }}>
                  {diagnostics.map((d, i) => (
                    <button
                      key={d.id}
                      onClick={() => setSelectedDiagnostic(i)}
                      className="inset"
                      style={{
                        position: 'relative',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        width: '100%',
                        textAlign: 'left',
                        padding: '12px 16px',
                        borderColor: selectedDiagnostic === i ? 'var(--amber)' : 'var(--line)',
                      }}
                    >
                      {selectedDiagnostic === i && (
                        <span className="accent" style={{ position: 'absolute', left: 0, top: -1, width: 30, height: 3, background: 'var(--amber)' }} />
                      )}
                      <span style={{ flex: 'none', width: 22, fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--muted-2)' }}>
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      <AlertTriangle size={14} style={{ flex: 'none', color: 'var(--amber)' }} />
                      <span style={{ flex: 1, minWidth: 0, fontWeight: 700, fontSize: 12.5, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {d.name}
                      </span>
                      <span className={`chip ${effortColor(d.effort)}`} style={{ flex: 'none', height: 20, padding: '0 9px', fontSize: 9, fontWeight: 700 }}>
                        {d.effort}
                      </span>
                      {/* Impact bar */}
                      <div style={{ flex: 'none', width: 72, height: 3, background: 'var(--rail)' }}>
                        <i
                          style={{
                            display: 'block', height: 3, background: 'var(--red)',
                            width: `${Math.min(100, (Math.abs(d.impact) / metrics.grossLeakImpact) * 100)}%`,
                          }}
                        />
                      </div>
                      <span style={{ flex: 'none', width: 84, textAlign: 'right', fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--red)' }}>
                        {formatCurrency(d.impact)}
                      </span>
                      {selectedDiagnostic === i
                        ? <ChevronDown size={14} style={{ flex: 'none', color: 'var(--amber)' }} />
                        : <ChevronRight size={14} style={{ flex: 'none', color: 'var(--muted-3)' }} />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Right: Impact details */}
            <div className="card">
              <span className="accent" style={{ width: 56, background: 'var(--teal)' }} />
              {diagnostics.length > 0 && diagnostics[selectedDiagnostic] ? (() => {
                const d = diagnostics[selectedDiagnostic];
                return (
                  <>
                    <div className="cardhead">
                      <div>
                        <h3>Impact details</h3>
                        <p className="sub">{d.name}</p>
                      </div>
                      <span className={`chip ${priorityColor(d.priority)}`} style={{ marginLeft: 'auto', height: 20, padding: '0 9px', fontSize: 9, fontWeight: 700 }}>
                        {d.priority}
                      </span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 20 }}>
                      <div className="inset" style={{ padding: '13px 16px' }}>
                        <p className="lbl">ESTIMATED IMPACT</p>
                        <p style={{ margin: '8px 0 0', fontFamily: 'var(--mono)', fontWeight: 500, fontSize: 18, color: 'var(--red)' }}>{formatCurrency(d.impact)}</p>
                      </div>
                      <div className="inset" style={{ padding: '13px 16px' }}>
                        <p className="lbl">CONFIDENCE</p>
                        <p style={{ margin: '8px 0 0', fontFamily: 'var(--mono)', fontWeight: 500, fontSize: 18, color: 'var(--text)' }}>{d.confidence}</p>
                      </div>
                    </div>

                    {/* Trade-backed proof */}
                    <div style={{ marginTop: 22 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 10 }}>
                        <Eye size={13} style={{ color: 'var(--amber)' }} />
                        <p className="lbl">TRADE-BACKED PROOF</p>
                      </div>
                      <div className="inset" style={{ padding: '14px 16px', fontSize: 12, lineHeight: '19px', color: 'var(--text-2)', whiteSpace: 'pre-line' }}>
                        {d.proof}
                      </div>
                      <p style={{ margin: '10px 0 0', fontSize: 11.5, color: 'var(--muted-2)' }}>
                        Next step: {d.nextStep}
                      </p>
                    </div>

                    {/* Evidence library */}
                    <div style={{ marginTop: 22 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 10 }}>
                        <Crosshair size={13} style={{ color: 'var(--amber)' }} />
                        <p className="lbl">EVIDENCE LIBRARY</p>
                      </div>
                      <p style={{ margin: '0 0 10px', fontSize: 11.5, color: 'var(--muted-2)' }}>
                        {d.trades.length} trade{d.trades.length !== 1 ? 's' : ''} matched &middot; {d.coverage} clusters &middot; Net {formatCurrency(d.trades.reduce((s, t) => s + (t.actualPnL ?? 0), 0))}
                      </p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 260, overflowY: 'auto' }}>
                        {d.trades.slice(0, 5).map(t => (
                          <div key={t.id} className="inset" style={{ padding: '10px 14px' }}>
                            <p style={{ margin: 0, fontWeight: 700, fontSize: 12.5, color: 'var(--text)' }}>
                              {t.coin}{' '}
                              <span style={{ fontWeight: 700, fontSize: 10, letterSpacing: '.04em', color: (t.direction ?? 'long') === 'long' ? 'var(--green)' : 'var(--red)' }}>
                                {(t.direction ?? 'long').toUpperCase()}
                              </span>
                            </p>
                            <p style={{ margin: '4px 0 0', fontSize: 10.5, color: 'var(--muted-2)' }}>
                              {t.exitDate ? format(parseISO(t.exitDate), 'M/d/yyyy, h:mm:ss a') : '—'} &middot;{' '}
                              <span style={{ fontFamily: 'var(--mono)', color: (t.actualPnL ?? 0) >= 0 ? 'var(--green)' : 'var(--red)' }}>{formatCurrency(t.actualPnL ?? 0)}</span>
                            </p>
                          </div>
                        ))}
                      </div>
                      <p style={{ margin: '12px 0 0', display: 'flex', alignItems: 'center', gap: 6, fontSize: 10.5, color: 'var(--muted-2)' }}>
                        <Sparkles size={10} style={{ color: 'var(--amber)' }} />
                        Evidence derives from trades inside the currently selected date range.
                      </p>
                    </div>
                  </>
                );
              })() : (
                <div className="empty-line">No signals to inspect.</div>
              )}
            </div>
          </div>
      </div>

      {/* ══════════════ ACTION PLAN ══════════════ */}
      <div ref={actionPlanRef} className="scroll-mt-4" style={{ marginTop: 32 }}>
          {/* Edge Analysis */}
          <p className="lbl b10" style={{ marginBottom: 14 }}>
            EDGE ANALYSIS <span style={{ color: 'var(--green)' }}>· {strengths.length}</span>
          </p>

          <div className="card">
            <span className="accent" style={{ width: 56, background: 'var(--green)' }} />
            <div className="cardhead">
              <div>
                <h3>Top Strengths</h3>
                <p className="sub">These are your superpowers. The patterns that consistently make you money.</p>
              </div>
              <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                <p className="lbl" style={{ color: 'var(--green)' }}>TOTAL EDGE VALUE</p>
                <p style={{ margin: '6px 0 0', fontFamily: 'var(--mono)', fontWeight: 500, fontSize: 18, color: 'var(--text)' }}>{formatCurrency(totalEdgeValue)}</p>
              </div>
            </div>

            {strengths.length === 0 ? (
              <div className="empty-line">
                No strengths detected in this period. Double down on your winning patterns during your best windows for maximum edge.
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 12, marginTop: 22 }}>
                {strengths.map((s, i) => (
                  <div key={i} className="inset" style={{ position: 'relative', padding: '15px 16px' }}>
                    <span className="accent" style={{ position: 'absolute', left: 0, top: -1, width: 36, height: 3, background: 'var(--green)' }} />
                    <p className="lbl" style={{ color: 'var(--green)' }}>{s.name.toUpperCase()}</p>
                    <p style={{ margin: '8px 0 0', fontSize: 11.5, lineHeight: '17px', color: 'var(--muted-2)' }}>{s.description}</p>
                    <p style={{ margin: '10px 0 0', fontFamily: 'var(--mono)', fontWeight: 500, fontSize: 18, color: 'var(--green)' }}>{formatCurrency(s.value)}</p>
                    <p style={{ margin: '4px 0 0', fontSize: 10.5, color: 'var(--muted-2)' }}>{s.trades.length} trades</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Execution Plan */}
          <p className="lbl b10" style={{ margin: '32px 0 14px' }}>
            ACTION PLAN <span style={{ color: 'var(--amber)' }}>· {actionItems.length}</span>
          </p>

          <div className="card">
            <span className="accent" style={{ width: 56, background: 'var(--amber)' }} />
            <div className="cardhead">
              <div>
                <h3>Execution Plan</h3>
                <p className="sub">
                  Prioritized actions for this exact period. Execute step 1 first, then validate result stability before moving to step 2.
                </p>
              </div>
              <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                <p className="lbl" style={{ color: 'var(--green)' }}>ESTIMATED RECOVERABLE</p>
                <span className="chip" style={{ marginTop: 8, height: 26, color: 'var(--green)' }}>
                  <Target size={12} />
                  <span style={{ fontFamily: 'var(--mono)' }}>{formatCurrency(totalRecoverable)}</span>
                  <span style={{ color: 'var(--muted-2)' }}>64d range</span>
                </span>
              </div>
            </div>

            {actionItems.length === 0 ? (
              <div className="empty-line">No action items — execution looks clean.</div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 12, marginTop: 22 }}>
                {actionItems.map((a, i) => (
                  <div key={a.id} className="inset" style={{ position: 'relative', padding: '15px 16px' }}>
                    <span className="accent" style={{ position: 'absolute', left: 0, top: -1, width: 36, height: 3, background: i === 0 ? 'var(--amber)' : 'var(--line-2)' }} />
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span
                        style={{
                          width: 24, height: 24, flex: 'none',
                          border: `1px solid ${i === 0 ? 'var(--amber)' : 'var(--line-2)'}`,
                          borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontFamily: 'var(--display)', fontWeight: 700, fontSize: 11,
                          color: i === 0 ? 'var(--amber)' : 'var(--muted-2)',
                        }}
                      >
                        {String(a.id).padStart(2, '0')}
                      </span>
                      <span style={{ marginLeft: 'auto', color: i === 0 ? 'var(--amber)' : 'var(--muted-3)' }}>
                        {i === 0 && <Target size={14} />}
                        {i === 1 && <Shield size={14} />}
                        {i >= 2 && <TrendingUp size={14} />}
                      </span>
                    </div>
                    <p style={{ margin: '12px 0 0', fontWeight: 700, fontSize: 13, color: 'var(--text)' }}>{a.name}</p>
                    <p style={{ margin: '6px 0 0', fontSize: 11.5, lineHeight: '17px', color: 'var(--muted-2)' }}>{a.description}</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--line)', fontSize: 10.5, color: 'var(--muted-2)' }}>
                      <ArrowRight size={11} style={{ flex: 'none' }} />
                      <span>Run for 5-7 sessions, then reassess</span>
                      <span style={{ marginLeft: 'auto', fontFamily: 'var(--mono)', color: 'var(--green)' }}>
                        {formatCurrency(a.recoverable)} {a.timeframe}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
      </div>

      {/* ══════════════ COACH NOTES ══════════════ */}
      <div ref={coachNotesRef} className="scroll-mt-4" style={{ marginTop: 32 }}>
        <p className="lbl b10" style={{ marginBottom: 14 }}>COACH NOTES</p>
        <div className="card" style={{ padding: '34px 28px 30px', textAlign: 'center' }}>
          <span className="accent" style={{ width: 56, background: 'var(--teal)' }} />
          <div
            style={{
              width: 52, height: 52, borderRadius: 3, margin: '0 auto 22px',
              border: '1px solid rgba(47,211,196,.4)', background: 'var(--panel-2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <Sparkles size={22} style={{ color: 'var(--teal)' }} />
          </div>
          <h3 style={{ fontSize: 22, lineHeight: '24px' }}>You&apos;re Doing Better Than You Think</h3>

          {diagnostics.length > 0 ? (
            <div style={{ maxWidth: 640, margin: '18px auto 0', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {diagnostics.slice(0, 2).map(d => (
                <p key={d.id} style={{ margin: 0, fontSize: 12.5, lineHeight: '20px', color: 'var(--muted)' }}>
                  Apply a concrete guardrail for &apos;{d.name}&apos; and track adherence for 14 days.
                </p>
              ))}
              <p style={{ margin: '8px 0 0', fontSize: 12.5, lineHeight: '20px', color: 'var(--muted)' }}>
                The current leak set represents{' '}
                <span style={{ fontFamily: 'var(--mono)', color: 'var(--amber)' }}>
                  {metrics.grossLeakImpact > 0 && metrics.totalLoss > 0
                    ? `${Math.round((metrics.grossLeakImpact / metrics.totalLoss) * 100)}%`
                    : '0%'}
                </span>{' '}
                of total detected impact in this range.
              </p>
            </div>
          ) : (
            <p style={{ maxWidth: 640, margin: '18px auto 0', fontSize: 12.5, lineHeight: '20px', color: 'var(--muted)' }}>
              Your execution is clean this period. Keep focusing on process over outcome and the results will compound.
            </p>
          )}

          {strengths.length > 0 && (
            <div style={{ maxWidth: 640, margin: '22px auto 0', paddingTop: 18, borderTop: '1px solid var(--line)' }}>
              <p style={{ margin: 0, fontSize: 12.5, lineHeight: '20px', color: 'var(--muted)' }}>
                Your edge in <span style={{ color: 'var(--amber)', fontWeight: 700 }}>{strengths[0].name}</span> is real
                — {strengths[0].description}. Lean into this strength.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── Range Summary Footer ── */}
      <div className="note" style={{ height: 'auto', minHeight: 44, padding: '12px 18px', lineHeight: '18px', flexWrap: 'wrap', gap: 12 }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontWeight: 700, color: 'var(--text)' }}>
          <Sparkles size={12} style={{ color: 'var(--amber)' }} />
          Range Summary
        </span>
        <span>
          Leak diagnostics: <span style={{ color: 'var(--red)', fontFamily: 'var(--mono)' }}>{formatCurrency(-metrics.grossLeakImpact)}</span> &bull;
          Overlap-adjusted: <span style={{ color: 'var(--amber)', fontFamily: 'var(--mono)' }}>{formatCurrency(metrics.grossLeakImpact * 0.48)}</span> &bull;
          Conservative recoverable: <span style={{ color: 'var(--green)', fontFamily: 'var(--mono)' }}>{formatCurrency(metrics.conservativeRecoverable)}</span> &bull;
          Detected strengths: <span style={{ color: 'var(--green)', fontFamily: 'var(--mono)' }}>{formatCurrency(totalEdgeValue)}</span>
        </span>
        <span style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <Shield size={12} style={{ color: hc }} />
          <span style={{ color: 'var(--text)' }}>Health score: <span style={{ fontFamily: 'var(--mono)', color: hc }}>{metrics.healthScore}%</span></span>
        </span>
      </div>

    </div>
  );
}
