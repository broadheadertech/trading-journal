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

const ATLAS_CHIP: React.CSSProperties = {
  height: 20, padding: '0 9px', fontSize: 9, fontWeight: 700, letterSpacing: '.04em', textTransform: 'uppercase',
};

function EffortBadge({ effort }: { effort: string }) {
  const color = effort === 'LOW' ? 'var(--green)' : effort === 'MEDIUM' ? 'var(--amber)' : 'var(--red)';
  return <span className="chip" style={{ ...ATLAS_CHIP, color }}>{effort} Effort</span>;
}

function ConfidenceBadge({ confidence }: { confidence: string }) {
  const color = confidence === 'HIGH' ? 'var(--pink)' : confidence === 'MEDIUM' ? 'var(--teal)' : 'var(--muted-2)';
  return <span className="chip" style={{ ...ATLAS_CHIP, color }}>{confidence} Confidence</span>;
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
    <div className="pwrap anim-fade-up">
      {/* ── Header ── */}
      <div className="phead" style={{ marginBottom: 26 }}>
        <p className="eyebrow" style={{ color: 'var(--amber)', fontWeight: 700, letterSpacing: '.04em', fontSize: 10, textTransform: 'uppercase' }}>
          <FlaskConical size={12} /> What-If Lab
        </p>
        <h2>Scenario Composer for Behavior Fixes</h2>
        <p className="sub">
          Build leak-removal stacks, simulate period impact, and compare baseline versus projected execution profile before changing your real playbook.
        </p>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 22 }}>
        <span className="chip" style={{ height: 32 }}>
          Period: <span style={{ fontFamily: 'var(--mono)', color: 'var(--amber)' }}>{format(scopeStart, 'MM/dd/yyyy')}</span> &rarr;{' '}
          <span style={{ fontFamily: 'var(--mono)', color: 'var(--amber)' }}>{format(new Date(), 'MM/dd/yyyy')}</span>
        </span>
        <span className="chip" style={{ height: 32 }}>
          Leak pool: <span style={{ fontFamily: 'var(--mono)', color: 'var(--text)' }}>{leaks.length}</span>
        </span>
        <span className="chip" style={{ height: 32 }}>
          Selected: <span style={{ fontFamily: 'var(--mono)', color: 'var(--text)' }}>{selectedIds.size}</span>
        </span>
      </div>

      {/* ── Headline Stats ── */}
      <div className="stats" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', marginTop: 0 }}>
        <div className="stat" style={{ height: 'auto', minHeight: 104 }}>
          <span className="accent" style={{ background: 'var(--amber)' }} />
          <b>BASELINE NET</b>
          <em style={{ fontSize: 22, lineHeight: '28px', color: baselineMetrics.totalPnL >= 0 ? 'var(--green)' : 'var(--red)' }}>
            {formatCurrency(baselineMetrics.totalPnL)}
          </em>
          <small style={{ display: 'block', fontSize: 10.5, color: 'var(--muted-2)', marginTop: 6 }}>Realized result before fixes</small>
        </div>
        <div className="stat" style={{ height: 'auto', minHeight: 104 }}>
          <span className="accent" style={{ background: 'var(--red)' }} />
          <b>SELECTED LEAK DRAG</b>
          <em style={{ fontSize: 22, lineHeight: '28px', color: 'var(--red)' }}>{formatCurrency(selectedDrag)}</em>
          <small style={{ display: 'block', fontSize: 10.5, color: 'var(--muted-2)', marginTop: 6 }}>{selectedIds.size} leak{selectedIds.size !== 1 ? 's' : ''} in stack</small>
        </div>
        <div className="stat" style={{ height: 'auto', minHeight: 104 }}>
          <span className="accent" style={{ background: 'var(--teal)' }} />
          <b>SIMULATED DELTA</b>
          <em style={{ fontSize: 22, lineHeight: '28px', color: simulatedDelta >= 0 ? 'var(--green)' : 'var(--red)' }}>
            {simulatedDelta >= 0 ? '+' : ''}{formatCurrency(simulatedDelta)}
          </em>
          <small style={{ display: 'block', fontSize: 10.5, color: 'var(--muted-2)', marginTop: 6 }}>Projected minus baseline net</small>
        </div>
        <div className="stat" style={{ height: 'auto', minHeight: 104 }}>
          <span className="accent" style={{ background: 'var(--pink)' }} />
          <b>CONFIDENCE</b>
          <em style={{ fontSize: 22, lineHeight: '28px' }}>{confidence}%</em>
          <small style={{ display: 'block', fontSize: 10.5, color: 'var(--muted-2)', marginTop: 6 }}>
            {confidence < 60 ? 'Early confidence' : confidence < 80 ? 'Moderate confidence' : 'High confidence'}
          </small>
        </div>
      </div>

      {/* ── Main 2-Column Layout ── */}
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] gap-6" style={{ marginTop: 24 }}>

        {/* ── Scenario Composer (Left) ── */}
        <div className="card">
          <span className="accent" style={{ width: 56, background: 'var(--amber)' }} />
          <div className="cardhead">
            <div>
              <h3>Scenario Composer</h3>
              <p className="sub">Select leak stack to simulate</p>
            </div>
            {selectedIds.size > 0 && (
              <button onClick={handleReset} className="btn-g" style={{ marginLeft: 'auto', height: 30, padding: '0 14px', fontSize: 12 }}>
                <RotateCcw size={12} /> Clear
              </button>
            )}
          </div>

          {/* Search */}
          <div style={{ position: 'relative', marginTop: 20 }}>
            <Search size={14} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted-3)' }} />
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search leaks"
              style={{ width: '100%', height: 40, paddingLeft: 38, paddingRight: 14, background: 'var(--panel-2)', border: '1px solid var(--line)', borderRadius: 2, fontSize: 12.5, color: 'var(--text)' }}
            />
          </div>

          {/* Top Impact button */}
          <button onClick={selectTopImpact} className="chip" style={{ height: 30, marginTop: 12 }}>
            <Sparkles size={12} style={{ color: 'var(--amber)' }} /> Top Impact {Math.min(3, leaks.length)}
          </button>

          {/* Leak cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 16, maxHeight: 500, overflowY: 'auto', paddingRight: 4 }}>
            {filteredLeaks.length === 0 ? (
              <div className="empty-line">
                {leaks.length === 0 ? 'Not enough trades to detect behavioral leaks. Log more trades.' : 'No leaks match your search.'}
              </div>
            ) : (
              filteredLeaks.map(leak => {
                const isSelected = selectedIds.has(leak.id);
                return (
                  <button
                    key={leak.id}
                    onClick={() => toggleLeak(leak.id)}
                    className="inset"
                    style={{
                      position: 'relative', width: '100%', textAlign: 'left', padding: '14px 16px',
                      borderColor: isSelected ? 'var(--amber)' : 'var(--line)',
                    }}
                  >
                    {isSelected && (
                      <span className="accent" style={{ position: 'absolute', left: 0, top: -1, width: 36, height: 3, background: 'var(--amber)' }} />
                    )}
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                      <div
                        style={{
                          marginTop: 2, width: 18, height: 18, flex: 'none', borderRadius: 2,
                          border: `1px solid ${isSelected ? 'var(--amber)' : 'var(--line-2)'}`,
                          background: isSelected ? 'var(--amber)' : 'transparent',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}
                      >
                        {isSelected && <CheckCircle2 size={12} style={{ color: 'var(--ink)' }} />}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, marginBottom: 8 }}>
                          <p style={{ margin: 0, fontWeight: 700, fontSize: 12.5, color: 'var(--text)' }}>{leak.name}</p>
                          <div style={{ flex: 'none', textAlign: 'right' }}>
                            <p style={{ margin: 0, fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--red)' }}>{formatCurrency(leak.impact)}</p>
                            <p style={{ margin: '3px 0 0', fontSize: 10, color: 'var(--muted-2)' }}>{leak.impactPercent.toFixed(1)}%</p>
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                          <EffortBadge effort={leak.effort} />
                          <ConfidenceBadge confidence={leak.confidence} />
                        </div>
                        <p style={{ margin: 0, fontSize: 11, lineHeight: '17px', color: 'var(--muted-2)' }}>{leak.description}</p>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* ── Simulation Engine (Right) ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Engine header + chart */}
          <div className="card">
            <span className="accent" style={{ width: 56, background: 'var(--teal)' }} />
            <div className="cardhead" style={{ flexWrap: 'wrap', gap: 14 }}>
              <div>
                <h3>Simulation Engine</h3>
                <p className="sub">Baseline vs projected equity under selected changes</p>
              </div>
              <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
                <button
                  onClick={handleRun}
                  disabled={selectedIds.size === 0}
                  className="btn-a"
                  style={{ height: 34, padding: '0 16px', fontSize: 12.5, opacity: selectedIds.size === 0 ? 0.5 : 1 }}
                >
                  <Play size={13} /> Run Simulation
                </button>
                <button onClick={handleReset} className="btn-g" style={{ height: 34, padding: '0 16px', fontSize: 12.5 }}>
                  <RotateCcw size={13} /> Reset
                </button>
              </div>
            </div>

            {/* Equity Curve Chart */}
            {hasRun && equityCurve.length > 0 ? (
              <div style={{ marginTop: 20 }}>
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={equityCurve} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#182432" />
                    <XAxis
                      dataKey="idx"
                      tick={{ fill: '#7f8ea3', fontSize: 10 }}
                      tickLine={false}
                      axisLine={false}
                      label={{ value: 'Trade #', position: 'insideBottomRight', offset: -5, fill: '#7f8ea3', fontSize: 10 }}
                    />
                    <YAxis
                      tick={{ fill: '#7f8ea3', fontSize: 10 }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v: number) => `$${v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v.toFixed(0)}`}
                    />
                    <Tooltip
                      contentStyle={{
                        background: '#0c1119',
                        border: '1px solid #182432',
                        borderRadius: '2px',
                        fontSize: '12px',
                        color: '#edf2f7',
                      }}
                      labelStyle={{ color: '#7f8ea3', fontWeight: 700 }}
                      formatter={((value: number, name: string) => [formatCurrency(value), name]) as any}
                      labelFormatter={((label: number) => `Trade ${label}`) as any}
                    />
                    <Legend
                      verticalAlign="bottom"
                      iconType="plainline"
                      wrapperStyle={{ fontSize: 11, color: '#7f8ea3', paddingTop: 8 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="actual"
                      name="Actual"
                      stroke="#7f8ea3"
                      strokeWidth={2}
                      dot={{ r: 2, fill: '#7f8ea3', stroke: '#7f8ea3' }}
                      activeDot={{ r: 4 }}
                      isAnimationActive={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="projected"
                      name="Projected"
                      stroke="#24c88a"
                      strokeWidth={2}
                      dot={{ r: 2, fill: '#24c88a', stroke: '#24c88a' }}
                      activeDot={{ r: 4 }}
                      isAnimationActive={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
                <p className="footnote" style={{ marginTop: 12 }}>
                  {removedTradeIds.size} trade{removedTradeIds.size !== 1 ? 's' : ''} removed from projection
                </p>
              </div>
            ) : (
              <div className="plot">
                <span className="empty">
                  {selectedIds.size === 0
                    ? 'Select leaks from the composer, then run simulation'
                    : 'Click "Run Simulation" to see projected equity'}
                </span>
              </div>
            )}
          </div>

          {/* Before / After Matrix */}
          <div className="card">
            <span className="accent" style={{ width: 56, background: 'var(--pink)' }} />
            <button onClick={() => setShowMatrix(!showMatrix)} style={{ width: '100%', display: 'flex', alignItems: 'flex-start', textAlign: 'left' }}>
              <div>
                <h3>Before / After Matrix</h3>
                <p className="sub">Metric-level impact after applying selected changes</p>
              </div>
              <span style={{ marginLeft: 'auto', color: 'var(--muted-3)' }}>
                {showMatrix ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </span>
            </button>
            {showMatrix && (
              hasRun ? (
                <div style={{ marginTop: 20, border: '1px solid var(--line)', borderRadius: 2, overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
                    <thead>
                      <tr style={{ background: 'var(--panel-2)', borderBottom: '1px solid var(--line)' }}>
                        <th style={{ textAlign: 'left', padding: '10px 14px', fontWeight: 700, fontSize: 9, letterSpacing: '.04em', color: 'var(--muted-2)' }}>METRIC</th>
                        <th style={{ textAlign: 'right', padding: '10px 14px', fontWeight: 700, fontSize: 9, letterSpacing: '.04em', color: 'var(--muted-2)' }}>BEFORE</th>
                        <th style={{ textAlign: 'right', padding: '10px 14px', fontWeight: 700, fontSize: 9, letterSpacing: '.04em', color: 'var(--muted-2)' }}>AFTER</th>
                        <th style={{ textAlign: 'right', padding: '10px 14px', fontWeight: 700, fontSize: 9, letterSpacing: '.04em', color: 'var(--muted-2)' }}>DELTA</th>
                      </tr>
                    </thead>
                    <tbody>
                      {matrixRows.map(row => {
                        const delta = row.after - row.before;
                        const improved = row.inverse ? delta < 0 : delta > 0;
                        return (
                          <tr key={row.label} style={{ borderBottom: '1px solid var(--hair)' }}>
                            <td style={{ padding: '10px 14px', color: 'var(--text-2)' }}>{row.label}</td>
                            <td style={{ padding: '10px 14px', textAlign: 'right', fontFamily: 'var(--mono)', color: 'var(--muted-2)' }}>{row.fmt(row.before)}</td>
                            <td style={{ padding: '10px 14px', textAlign: 'right', fontFamily: 'var(--mono)', color: 'var(--text)' }}>{row.fmt(row.after)}</td>
                            <td
                              style={{
                                padding: '10px 14px', textAlign: 'right', fontFamily: 'var(--mono)',
                                color: Math.abs(delta) < 0.01 ? 'var(--muted-2)' : improved ? 'var(--green)' : 'var(--red)',
                              }}
                            >
                              {Math.abs(delta) < 0.01 ? '--' : `${delta > 0 ? '+' : ''}${row.fmt(delta)}`}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="empty-line">Run simulation to populate the before/after metric matrix.</div>
              )
            )}
          </div>
        </div>
      </div>

      {/* ── Quick Scenario Cards ── */}
      {leaks.length > 0 && (
        <div className="card" style={{ marginTop: 24 }}>
          <span className="accent" style={{ width: 56, background: 'var(--green)' }} />
          <div className="cardhead">
            <div>
              <h3>Quick Scenario Cards</h3>
              <p className="sub">One-click stacks for the highest-impact leaks</p>
            </div>
            <Sparkles size={16} style={{ marginLeft: 'auto', color: 'var(--green)' }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 12, marginTop: 22 }}>
            {leaks.slice(0, 3).map(leak => (
              <button
                key={leak.id}
                onClick={() => { setSelectedIds(new Set([leak.id])); setHasRun(true); }}
                className="inset"
                style={{ position: 'relative', width: '100%', textAlign: 'left', padding: '15px 16px' }}
              >
                <span className="accent" style={{ position: 'absolute', left: 0, top: -1, width: 36, height: 3, background: 'var(--green)' }} />
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: 10 }}>
                  <Sparkles size={14} style={{ color: 'var(--muted-3)' }} />
                  <span className="chip" style={{ marginLeft: 'auto', height: 20, padding: '0 9px', fontSize: 9, fontWeight: 700, letterSpacing: '.04em', color: 'var(--pink)' }}>ONE-CLICK</span>
                </div>
                <p style={{ margin: 0, fontWeight: 700, fontSize: 12.5, color: 'var(--text)' }}>{leak.name}</p>
                <p style={{ margin: '6px 0 0', fontSize: 11, lineHeight: '17px', color: 'var(--muted-2)' }}>{leak.description}</p>
                <p style={{ margin: '10px 0 0', fontFamily: 'var(--mono)', fontWeight: 500, fontSize: 16, color: 'var(--green)' }}>{formatCurrency(Math.abs(leak.impact))}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Simulation Notes ── */}
      <div className="card" style={{ marginTop: 24 }}>
        <span className="accent" style={{ width: 56, background: 'var(--amber)' }} />
        <button onClick={() => setShowNotes(!showNotes)} style={{ width: '100%', display: 'flex', alignItems: 'flex-start', textAlign: 'left' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Zap size={14} style={{ color: 'var(--amber)' }} />
            <h4>Simulation Notes</h4>
          </div>
          <span style={{ marginLeft: 'auto', color: 'var(--muted-3)' }}>
            {showNotes ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </span>
        </button>
        {showNotes && (
          <div style={{ marginTop: 16 }}>
            {selectedIds.size > 0 ? (
              <>
                <div className="mrow">
                  <span className="ic" style={{ color: 'var(--pink)' }}>&#x25CB;</span>
                  <span className="lb">Selected stack estimated drag: <span style={{ fontFamily: 'var(--mono)', color: 'var(--red)' }}>{formatCurrency(Math.abs(selectedDrag)).replace(/^\+/, '')}</span>. Run simulation to replay it on this period.</span>
                </div>
                {hasRun && (
                  <div className="mrow">
                    <span className="ic" style={{ color: 'var(--green)' }}>&#x25CB;</span>
                    <span className="lb">Pre-run conservative recovery range: <span style={{ fontFamily: 'var(--mono)', color: 'var(--green)' }}>{formatCurrency(Math.abs(selectedDrag) * 0.4).replace(/^\+/, '')}</span> to <span style={{ fontFamily: 'var(--mono)', color: 'var(--green)' }}>{formatCurrency(Math.abs(selectedDrag) * 0.7).replace(/^\+/, '')}</span>.</span>
                  </div>
                )}
              </>
            ) : (
              <p style={{ margin: 0, fontSize: 11.5, color: 'var(--muted-2)' }}>Select leaks to see simulation notes.</p>
            )}
            <p className="footnote" style={{ marginTop: 16, textAlign: 'left' }}>
              Deterministic replay on selected period. No execution or signal generation.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
