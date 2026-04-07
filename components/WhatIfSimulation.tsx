'use client';

import { useState, useMemo, useCallback } from 'react';
import { Trade } from '@/lib/types';
import { useCurrency } from '@/hooks/useCurrency';
import {
  FlaskConical, Search, RotateCcw, Play, CheckCircle2, Plus,
  TrendingUp, TrendingDown, Minus, Sparkles, ChevronUp, ChevronDown, Zap,
} from 'lucide-react';
import { format, subDays } from 'date-fns';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';

interface Props {
  trades: Trade[];
}

/* ── Leak detection engine ──────────────────────────────── */

interface Leak {
  id: string;
  name: string;
  description: string;
  impact: number;       // dollar drag (negative = cost)
  impactPercent: number;
  effort: 'LOW' | 'MEDIUM' | 'HIGH';
  confidence: 'LOW' | 'MEDIUM' | 'HIGH';
  tradeIds: string[];
}

function detectLeaks(trades: Trade[]): Leak[] {
  const closed = trades.filter(t => !t.isOpen && t.actualPnL !== null);
  if (closed.length < 3) return [];

  const leaks: Leak[] = [];
  const totalPnL = closed.reduce((s, t) => s + (t.actualPnL ?? 0), 0);

  // 1. Loss containment failure — trades where loss > 2x average loss
  const losses = closed.filter(t => (t.actualPnL ?? 0) < 0);
  if (losses.length > 0) {
    const avgLoss = losses.reduce((s, t) => s + Math.abs(t.actualPnL ?? 0), 0) / losses.length;
    const bigLosses = losses.filter(t => Math.abs(t.actualPnL ?? 0) > avgLoss * 2);
    if (bigLosses.length > 0) {
      const drag = bigLosses.reduce((s, t) => s + (t.actualPnL ?? 0), 0);
      leaks.push({
        id: 'loss_containment_failure',
        name: 'Loss containment failure',
        description: `Post-trigger loss containment is not enforced. (${bigLosses.length} outsized losses detected)`,
        impact: drag,
        impactPercent: totalPnL !== 0 ? Math.abs(drag / Math.abs(totalPnL)) * 100 : 0,
        effort: 'MEDIUM',
        confidence: 'HIGH',
        tradeIds: bigLosses.map(t => t.id),
      });
    }
  }

  // 2. Edge fragility map — coins with negative expectancy
  const coinMap = new Map<string, Trade[]>();
  closed.forEach(t => { if (!coinMap.has(t.coin)) coinMap.set(t.coin, []); coinMap.get(t.coin)!.push(t); });
  const weakCoins = [...coinMap.entries()].filter(([, ts]) => {
    const net = ts.reduce((s, t) => s + (t.actualPnL ?? 0), 0);
    return ts.length >= 3 && net < 0;
  });
  if (weakCoins.length > 0) {
    const drag = weakCoins.reduce((s, [, ts]) => s + ts.reduce((ss, t) => ss + (t.actualPnL ?? 0), 0), 0);
    leaks.push({
      id: 'edge_fragility_map',
      name: 'Edge fragility map',
      description: `Edge collapses under minor context shifts. (${weakCoins.map(([c]) => c).join(', ')} negative expectancy)`,
      impact: drag,
      impactPercent: totalPnL !== 0 ? Math.abs(drag / Math.abs(totalPnL)) * 100 : 0,
      effort: 'MEDIUM',
      confidence: 'HIGH',
      tradeIds: weakCoins.flatMap(([, ts]) => ts.map(t => t.id)),
    });
  }

  // 3. Restriction bypass contradiction — rule breaks leading to losses
  const ruleBreakLosses = closed.filter(t =>
    (t.actualPnL ?? 0) < 0 && t.ruleChecklist.some(r => r.compliance === 'no')
  );
  if (ruleBreakLosses.length > 0) {
    const drag = ruleBreakLosses.reduce((s, t) => s + (t.actualPnL ?? 0), 0);
    leaks.push({
      id: 'restriction_bypass_contradiction',
      name: 'Restriction bypass contradiction',
      description: `Constraints are repeatedly bypassed during stress. (${ruleBreakLosses.length} rule-break losses)`,
      impact: drag,
      impactPercent: totalPnL !== 0 ? Math.abs(drag / Math.abs(totalPnL)) * 100 : 0,
      effort: 'MEDIUM',
      confidence: 'HIGH',
      tradeIds: ruleBreakLosses.map(t => t.id),
    });
  }

  // 4. Rule fatigue decay — high compliance early, low compliance later
  const sorted = [...closed].sort((a, b) => new Date(a.entryDate).getTime() - new Date(b.entryDate).getTime());
  const half = Math.floor(sorted.length / 2);
  if (half >= 3) {
    const firstHalf = sorted.slice(0, half);
    const secondHalf = sorted.slice(half);
    const compFirst = firstHalf.filter(t => t.ruleChecklist.length > 0 && !t.ruleChecklist.some(r => r.compliance === 'no')).length / Math.max(1, firstHalf.filter(t => t.ruleChecklist.length > 0).length);
    const compSecond = secondHalf.filter(t => t.ruleChecklist.length > 0 && !t.ruleChecklist.some(r => r.compliance === 'no')).length / Math.max(1, secondHalf.filter(t => t.ruleChecklist.length > 0).length);
    if (compFirst - compSecond > 0.15) {
      const lateBreaks = secondHalf.filter(t => (t.actualPnL ?? 0) < 0 && t.ruleChecklist.some(r => r.compliance === 'no'));
      const drag = lateBreaks.reduce((s, t) => s + (t.actualPnL ?? 0), 0);
      if (lateBreaks.length > 0) {
        leaks.push({
          id: 'rule_fatigue_decay',
          name: 'Rule fatigue decay',
          description: `Compliance quality decays under sustained rule load. (${(compFirst * 100).toFixed(0)}% -> ${(compSecond * 100).toFixed(0)}%)`,
          impact: drag,
          impactPercent: totalPnL !== 0 ? Math.abs(drag / Math.abs(totalPnL)) * 100 : 0,
          effort: 'MEDIUM',
          confidence: 'HIGH',
          tradeIds: lateBreaks.map(t => t.id),
        });
      }
    }
  }

  // 5. Few large losses dominate — top 3 losses = >60% of total losses
  if (losses.length >= 3) {
    const sortedLosses = [...losses].sort((a, b) => (a.actualPnL ?? 0) - (b.actualPnL ?? 0));
    const top3 = sortedLosses.slice(0, 3);
    const top3Sum = Math.abs(top3.reduce((s, t) => s + (t.actualPnL ?? 0), 0));
    const totalLoss = Math.abs(losses.reduce((s, t) => s + (t.actualPnL ?? 0), 0));
    const pct = totalLoss > 0 ? (top3Sum / totalLoss) * 100 : 0;
    if (pct > 60) {
      const drag = top3.reduce((s, t) => s + (t.actualPnL ?? 0), 0);
      leaks.push({
        id: 'few_large_losses',
        name: 'Few large losses dominate',
        description: `Top losses are ${pct.toFixed(0)}% of total losses`,
        impact: drag,
        impactPercent: totalPnL !== 0 ? Math.abs(drag / Math.abs(totalPnL)) * 100 : 0,
        effort: 'HIGH',
        confidence: 'HIGH',
        tradeIds: top3.map(t => t.id),
      });
    }
  }

  // 6. Emotional trading drag — FOMO/revenge trades with negative PnL
  const emotionalLosses = closed.filter(t =>
    (t.actualPnL ?? 0) < 0 && ['FOMO', 'Revenge Trading', 'Greedy'].includes(t.emotion)
  );
  if (emotionalLosses.length > 0) {
    const drag = emotionalLosses.reduce((s, t) => s + (t.actualPnL ?? 0), 0);
    leaks.push({
      id: 'emotional_trading_drag',
      name: 'Emotional trading drag',
      description: `FOMO/Revenge/Greed entries with negative outcome. (${emotionalLosses.length} trades)`,
      impact: drag,
      impactPercent: totalPnL !== 0 ? Math.abs(drag / Math.abs(totalPnL)) * 100 : 0,
      effort: 'LOW',
      confidence: 'MEDIUM',
      tradeIds: emotionalLosses.map(t => t.id),
    });
  }

  // 7. Overtrading drain — days with >3 trades that net negative
  const dayMap = new Map<string, Trade[]>();
  closed.forEach(t => {
    const d = t.exitDate ? t.exitDate.slice(0, 10) : t.entryDate.slice(0, 10);
    if (!dayMap.has(d)) dayMap.set(d, []);
    dayMap.get(d)!.push(t);
  });
  const overtradeDays = [...dayMap.entries()].filter(([, ts]) => ts.length > 3 && ts.reduce((s, t) => s + (t.actualPnL ?? 0), 0) < 0);
  if (overtradeDays.length > 0) {
    const drag = overtradeDays.reduce((s, [, ts]) => s + ts.reduce((ss, t) => ss + (t.actualPnL ?? 0), 0), 0);
    leaks.push({
      id: 'overtrading_drain',
      name: 'Overtrading drain',
      description: `High-frequency days with net negative outcome. (${overtradeDays.length} days)`,
      impact: drag,
      impactPercent: totalPnL !== 0 ? Math.abs(drag / Math.abs(totalPnL)) * 100 : 0,
      effort: 'LOW',
      confidence: 'MEDIUM',
      tradeIds: overtradeDays.flatMap(([, ts]) => ts.map(t => t.id)),
    });
  }

  return leaks.sort((a, b) => a.impact - b.impact); // most negative first
}

/* ── Simulation compute ──────────────────────────────────── */

function computeMetrics(trades: Trade[]) {
  const closed = trades.filter(t => !t.isOpen && t.actualPnL !== null);
  if (closed.length === 0) return { totalPnL: 0, winRate: 0, profitFactor: 0, maxDrawdown: 0, expectancy: 0, avgWin: 0, avgLoss: 0, closedCount: 0 };

  const wins = closed.filter(t => t.actualPnL! > 0);
  const losses = closed.filter(t => t.actualPnL! < 0);
  const totalPnL = closed.reduce((s, t) => s + t.actualPnL!, 0);
  const winRate = (wins.length / closed.length) * 100;
  const avgWin = wins.length > 0 ? wins.reduce((s, t) => s + t.actualPnL!, 0) / wins.length : 0;
  const avgLoss = losses.length > 0 ? Math.abs(losses.reduce((s, t) => s + t.actualPnL!, 0) / losses.length) : 0;
  const grossProfit = wins.reduce((s, t) => s + t.actualPnL!, 0);
  const grossLoss = Math.abs(losses.reduce((s, t) => s + t.actualPnL!, 0));
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0;

  let peak = 0, maxDd = 0, equity = 0;
  const sorted = [...closed].sort((a, b) => new Date(a.exitDate ?? a.entryDate).getTime() - new Date(b.exitDate ?? b.entryDate).getTime());
  for (const t of sorted) { equity += t.actualPnL!; if (equity > peak) peak = equity; const dd = peak - equity; if (dd > maxDd) maxDd = dd; }

  return { totalPnL, winRate, profitFactor, maxDrawdown: maxDd, expectancy: totalPnL / closed.length, avgWin, avgLoss, closedCount: closed.length };
}

/* ── Effort/Confidence badges ─────────────────────────────── */

function EffortBadge({ effort }: { effort: string }) {
  const colors = effort === 'LOW' ? 'bg-green-500/20 text-green-400' : effort === 'MEDIUM' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-red-500/20 text-red-400';
  return <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${colors}`}>{effort} Effort</span>;
}

function ConfidenceBadge({ confidence }: { confidence: string }) {
  const colors = confidence === 'HIGH' ? 'bg-cyan-500/20 text-cyan-400' : confidence === 'MEDIUM' ? 'bg-blue-500/20 text-blue-400' : 'bg-gray-500/20 text-gray-400';
  return <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${colors}`}>{confidence} Confidence</span>;
}

/* ── Main Component ───────────────────────────────────────── */

export default function WhatIfSimulation({ trades }: Props) {
  const { formatCurrency } = useCurrency();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [hasRun, setHasRun] = useState(false);
  const [showMatrix, setShowMatrix] = useState(true);
  const [showNotes, setShowNotes] = useState(true);

  const leaks = useMemo(() => detectLeaks(trades), [trades]);

  const filteredLeaks = useMemo(() => {
    if (!searchQuery) return leaks;
    const q = searchQuery.toLowerCase();
    return leaks.filter(l => l.name.toLowerCase().includes(q) || l.description.toLowerCase().includes(q));
  }, [leaks, searchQuery]);

  const toggleLeak = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
    setHasRun(false);
  };

  const selectTopImpact = () => {
    const top3 = leaks.slice(0, 3).map(l => l.id);
    setSelectedIds(new Set(top3));
    setHasRun(false);
  };

  const selectedLeaks = leaks.filter(l => selectedIds.has(l.id));
  const selectedDrag = selectedLeaks.reduce((s, l) => s + l.impact, 0);

  // Projected trades = remove all trade IDs from selected leaks
  const removedTradeIds = useMemo(() => {
    const ids = new Set<string>();
    selectedLeaks.forEach(l => l.tradeIds.forEach(id => ids.add(id)));
    return ids;
  }, [selectedLeaks]);

  const projectedTrades = useMemo(() => trades.filter(t => !removedTradeIds.has(t.id)), [trades, removedTradeIds]);
  const baselineMetrics = useMemo(() => computeMetrics(trades), [trades]);
  const projectedMetrics = useMemo(() => computeMetrics(projectedTrades), [projectedTrades]);

  const simulatedDelta = projectedMetrics.totalPnL - baselineMetrics.totalPnL;
  const confidence = leaks.length > 0 ? Math.min(95, Math.round(50 + (selectedLeaks.length / leaks.length) * 45)) : 0;

  const scopeStart = useMemo(() => {
    const dates = trades.filter(t => t.entryDate).map(t => new Date(t.entryDate));
    return dates.length > 0 ? new Date(Math.min(...dates.map(d => d.getTime()))) : new Date();
  }, [trades]);

  const handleRun = () => setHasRun(true);
  const handleReset = () => { setSelectedIds(new Set()); setHasRun(false); };

  // Equity curve data
  const equityCurve = useMemo(() => {
    if (!hasRun) return [];
    const closedBase = trades.filter(t => !t.isOpen && t.actualPnL !== null)
      .sort((a, b) => new Date(a.exitDate ?? a.entryDate).getTime() - new Date(b.exitDate ?? b.entryDate).getTime());
    let actualEq = 0, projEq = 0;
    return closedBase.map((t, i) => {
      actualEq += t.actualPnL!;
      if (!removedTradeIds.has(t.id)) projEq += t.actualPnL!;
      return { idx: i, actual: actualEq, projected: projEq };
    });
  }, [trades, removedTradeIds, hasRun]);

  // Before/After matrix rows
  const matrixRows = [
    { label: 'Net P&L', before: baselineMetrics.totalPnL, after: projectedMetrics.totalPnL, fmt: formatCurrency },
    { label: 'Win Rate', before: baselineMetrics.winRate, after: projectedMetrics.winRate, fmt: (n: number) => `${n.toFixed(1)}%` },
    { label: 'Profit Factor', before: baselineMetrics.profitFactor, after: projectedMetrics.profitFactor, fmt: (n: number) => n === Infinity ? 'INF' : n.toFixed(2) },
    { label: 'Max Drawdown', before: baselineMetrics.maxDrawdown, after: projectedMetrics.maxDrawdown, fmt: formatCurrency, inverse: true },
    { label: 'Expectancy', before: baselineMetrics.expectancy, after: projectedMetrics.expectancy, fmt: formatCurrency },
    { label: 'Avg Win', before: baselineMetrics.avgWin, after: projectedMetrics.avgWin, fmt: formatCurrency },
    { label: 'Avg Loss', before: baselineMetrics.avgLoss, after: projectedMetrics.avgLoss, fmt: formatCurrency, inverse: true },
  ];

  return (
    <div className="relative max-w-[1400px] mx-auto px-3 sm:px-6 py-6 space-y-6 anim-fade-up">
      <div className="hero-glow" />

      {/* ── Hero Card ── */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-0">
          <div className="p-6 sm:p-8">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--accent)]/10 text-xs text-[var(--accent)] font-semibold uppercase tracking-widest mb-4">
              <FlaskConical size={14} /> What-If Lab
            </div>
            <h1 className="text-3xl sm:text-4xl font-black mb-2">Scenario Composer for Behavior Fixes</h1>
            <p className="text-sm text-[var(--muted-foreground)] max-w-lg mb-6">
              Build leak-removal stacks, simulate period impact, and compare baseline versus projected execution profile before changing your real playbook.
            </p>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--muted)] font-medium">
                Period: <span className="font-bold text-[var(--accent)]">{format(scopeStart, 'MM/dd/yyyy')}</span> -&gt; <span className="font-bold text-[var(--accent)]">{format(new Date(), 'MM/dd/yyyy')}</span>
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--muted)] font-medium">
                Leak pool: <span className="font-bold">{leaks.length}</span>
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--muted)] font-medium">
                Selected: <span className="font-bold">{selectedIds.size}</span>
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 border-t lg:border-t-0 lg:border-l border-[var(--border)]">
            <div className="p-5 border-b border-r border-[var(--border)]">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--accent)] mb-2">Baseline Net</p>
              <p className={`text-2xl font-black ${baselineMetrics.totalPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {formatCurrency(baselineMetrics.totalPnL)}
              </p>
            </div>
            <div className="p-5 border-b border-[var(--border)]">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-red-400 mb-2">Selected Leak Drag</p>
              <p className="text-2xl font-black text-red-400">
                {formatCurrency(selectedDrag)}
              </p>
            </div>
            <div className="p-5 border-r border-[var(--border)]">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--muted-foreground)] mb-2">Simulated Delta</p>
              <p className={`text-2xl font-black ${simulatedDelta >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {simulatedDelta >= 0 ? '+' : ''}{formatCurrency(simulatedDelta)}
              </p>
            </div>
            <div className="p-5">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--muted-foreground)] mb-2">Confidence</p>
              <p className="text-2xl font-black">{confidence}%</p>
              <p className="text-xs text-[var(--muted-foreground)]">{confidence < 60 ? 'Early confidence' : confidence < 80 ? 'Moderate confidence' : 'High confidence'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Main 2-Column Layout ── */}
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] gap-6">

        {/* ── Scenario Composer (Left) ── */}
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--muted-foreground)]">Scenario Composer</p>
              <p className="text-sm font-medium">Select leak stack to simulate</p>
            </div>
            {selectedIds.size > 0 && (
              <button onClick={handleReset} className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors">
                <RotateCcw size={12} /> Clear
              </button>
            )}
          </div>

          {/* Search */}
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]" />
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search leaks"
              className="w-full pl-9 pr-3 py-2 text-sm bg-[var(--muted)] border border-[var(--border)] rounded-lg"
            />
          </div>

          {/* Top Impact button */}
          <button
            onClick={selectTopImpact}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-full bg-[var(--muted)] border border-[var(--border)] hover:border-[var(--accent)]/40 text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors font-medium"
          >
            <Sparkles size={12} /> Top Impact {Math.min(3, leaks.length)}
          </button>

          {/* Leak cards */}
          <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
            {filteredLeaks.length === 0 ? (
              <div className="text-center py-8 text-sm text-[var(--muted-foreground)]">
                {leaks.length === 0 ? 'Not enough trades to detect behavioral leaks. Log more trades.' : 'No leaks match your search.'}
              </div>
            ) : (
              filteredLeaks.map(leak => {
                const isSelected = selectedIds.has(leak.id);
                return (
                  <button
                    key={leak.id}
                    onClick={() => toggleLeak(leak.id)}
                    className={`w-full text-left rounded-xl p-4 border transition-colors ${
                      isSelected
                        ? 'border-[var(--accent)] bg-[var(--accent)]/5'
                        : 'border-[var(--border)] hover:border-[var(--accent)]/40'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`mt-0.5 w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors ${
                        isSelected ? 'border-[var(--accent)] bg-[var(--accent)]' : 'border-[var(--border)]'
                      }`}>
                        {isSelected && <CheckCircle2 size={12} className="text-white" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <p className="font-semibold text-sm">{leak.name}</p>
                          <div className="text-right shrink-0">
                            <p className="text-sm font-bold text-red-400">{formatCurrency(leak.impact)}</p>
                            <p className="text-[10px] text-[var(--muted-foreground)]">{leak.impactPercent.toFixed(1)}%</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <EffortBadge effort={leak.effort} />
                          <ConfidenceBadge confidence={leak.confidence} />
                        </div>
                        <p className="text-xs text-[var(--muted-foreground)] line-clamp-2">{leak.description}</p>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* ── Simulation Engine (Right) ── */}
        <div className="space-y-6">
          {/* Engine header + chart */}
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--muted-foreground)]">Simulation Engine</p>
                <p className="text-sm font-medium">Baseline vs projected equity under selected changes</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleRun}
                  disabled={selectedIds.size === 0}
                  className="flex items-center gap-1.5 px-4 py-2 text-sm rounded-full bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-semibold transition-colors disabled:opacity-50"
                >
                  <Play size={14} /> Run Simulation
                </button>
                <button
                  onClick={handleReset}
                  className="flex items-center gap-1.5 px-4 py-2 text-sm rounded-full border border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
                >
                  <RotateCcw size={14} /> Reset
                </button>
              </div>
            </div>

            {/* Equity Curve Chart */}
            <div className="bg-[var(--muted)]/30 border border-[var(--border)] rounded-xl min-h-[300px] flex items-center justify-center">
              {hasRun && equityCurve.length > 0 ? (
                <div className="w-full p-4">
                  <ResponsiveContainer width="100%" height={280}>
                    <LineChart data={equityCurve} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.4} />
                      <XAxis
                        dataKey="idx"
                        tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }}
                        tickLine={false}
                        axisLine={{ stroke: 'var(--border)' }}
                        label={{ value: 'Trade #', position: 'insideBottomRight', offset: -5, fill: 'var(--muted-foreground)', fontSize: 10 }}
                      />
                      <YAxis
                        tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }}
                        tickLine={false}
                        axisLine={{ stroke: 'var(--border)' }}
                        tickFormatter={(v: number) => `$${v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v.toFixed(0)}`}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'var(--card)',
                          border: '1px solid var(--border)',
                          borderRadius: '0.75rem',
                          fontSize: 12,
                        }}
                        labelStyle={{ color: 'var(--muted-foreground)', fontWeight: 600 }}
                        formatter={((value: number, name: string) => [formatCurrency(value), name]) as any}
                        labelFormatter={((label: number) => `Trade ${label}`) as any}
                      />
                      <Legend
                        verticalAlign="bottom"
                        iconType="plainline"
                        wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="actual"
                        name="Actual"
                        stroke="#9ca3af"
                        strokeWidth={2}
                        dot={{ r: 3, fill: '#9ca3af', stroke: '#9ca3af' }}
                        activeDot={{ r: 5 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="projected"
                        name="Projected"
                        stroke="var(--accent)"
                        strokeWidth={2}
                        dot={{ r: 3, fill: 'var(--accent)', stroke: 'var(--accent)' }}
                        activeDot={{ r: 5 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                  <p className="text-center text-xs text-[var(--muted-foreground)] mt-2">
                    {removedTradeIds.size} trade{removedTradeIds.size !== 1 ? 's' : ''} removed from projection
                  </p>
                </div>
              ) : (
                <div className="text-center text-sm text-[var(--muted-foreground)] py-12">
                  {selectedIds.size === 0
                    ? 'Select leaks from the composer, then run simulation'
                    : 'Click "Run Simulation" to see projected equity'}
                </div>
              )}
            </div>
          </div>

          {/* Before / After Matrix */}
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl">
            <button onClick={() => setShowMatrix(!showMatrix)} className="w-full flex items-center justify-between p-5">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--muted-foreground)]">Before / After Matrix</p>
                <p className="text-sm font-medium">Metric-level impact after applying selected changes</p>
              </div>
              {showMatrix ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
            {showMatrix && (
              <div className="px-5 pb-5">
                {hasRun ? (
                  <div className="border border-[var(--border)] rounded-xl overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-[var(--border)] bg-[var(--muted)]/30">
                          <th className="text-left px-4 py-2.5 text-xs font-semibold uppercase tracking-widest text-[var(--muted-foreground)]">Metric</th>
                          <th className="text-right px-4 py-2.5 text-xs font-semibold uppercase tracking-widest text-[var(--muted-foreground)]">Before</th>
                          <th className="text-right px-4 py-2.5 text-xs font-semibold uppercase tracking-widest text-[var(--muted-foreground)]">After</th>
                          <th className="text-right px-4 py-2.5 text-xs font-semibold uppercase tracking-widest text-[var(--muted-foreground)]">Delta</th>
                        </tr>
                      </thead>
                      <tbody>
                        {matrixRows.map(row => {
                          const delta = row.after - row.before;
                          const improved = row.inverse ? delta < 0 : delta > 0;
                          return (
                            <tr key={row.label} className="border-b border-[var(--border)] last:border-b-0">
                              <td className="px-4 py-2.5 font-medium">{row.label}</td>
                              <td className="px-4 py-2.5 text-right text-[var(--muted-foreground)]">{row.fmt(row.before)}</td>
                              <td className="px-4 py-2.5 text-right font-medium">{row.fmt(row.after)}</td>
                              <td className={`px-4 py-2.5 text-right font-medium ${Math.abs(delta) < 0.01 ? 'text-[var(--muted-foreground)]' : improved ? 'text-green-400' : 'text-red-400'}`}>
                                {Math.abs(delta) < 0.01 ? '--' : `${delta > 0 ? '+' : ''}${row.fmt(delta)}`}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-6 text-sm text-[var(--muted-foreground)]">
                    Run simulation to populate the before/after metric matrix.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Quick Scenario Cards ── */}
      {leaks.length > 0 && (
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--muted-foreground)] mb-4">Quick Scenario Cards</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {leaks.slice(0, 3).map(leak => (
              <button
                key={leak.id}
                onClick={() => { setSelectedIds(new Set([leak.id])); setHasRun(true); }}
                className="text-left bg-[var(--muted)]/30 border border-[var(--border)] hover:border-[var(--accent)]/40 rounded-xl p-4 transition-colors group"
              >
                <div className="flex items-center justify-between mb-2">
                  <Sparkles size={16} className="text-[var(--muted-foreground)] group-hover:text-[var(--accent)] transition-colors" />
                  <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-400">One-Click</span>
                </div>
                <p className="font-semibold text-sm mb-1">{leak.name}</p>
                <p className="text-xs text-[var(--muted-foreground)] line-clamp-2 mb-2">{leak.description}</p>
                <p className="text-sm font-bold text-green-400">+{formatCurrency(Math.abs(leak.impact))}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Simulation Notes ── */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl">
        <button onClick={() => setShowNotes(!showNotes)} className="w-full flex items-center justify-between p-5">
          <div className="flex items-center gap-2">
            <Zap size={14} className="text-amber-400" />
            <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--muted-foreground)]">Simulation Notes</p>
          </div>
          {showNotes ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
        {showNotes && (
          <div className="px-5 pb-5 space-y-2">
            {selectedIds.size > 0 ? (
              <>
                <div className="flex items-start gap-2 text-xs">
                  <span className="text-cyan-400 mt-0.5 shrink-0">&#x25CB;</span>
                  <span>Selected stack estimated drag: {formatCurrency(Math.abs(selectedDrag))}. Run simulation to replay it on this period.</span>
                </div>
                {hasRun && (
                  <div className="flex items-start gap-2 text-xs">
                    <span className="text-green-400 mt-0.5 shrink-0">&#x25CB;</span>
                    <span>Pre-run conservative recovery range: {formatCurrency(Math.abs(selectedDrag) * 0.4)} to {formatCurrency(Math.abs(selectedDrag) * 0.7)}.</span>
                  </div>
                )}
              </>
            ) : (
              <p className="text-xs text-[var(--muted-foreground)]">Select leaks to see simulation notes.</p>
            )}
            <p className="text-xs text-[var(--muted-foreground)] pt-1 border-t border-[var(--border)]">
              Deterministic replay on selected period. No execution or signal generation.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
