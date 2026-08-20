'use client';

import { useState, useMemo, useRef } from 'react';
import { Strategy, StrategyType, Trade } from '@/lib/types';
import { STRATEGY_TYPES, getDisciplineScore } from '@/lib/utils';
import { useCurrency } from '@/hooks/useCurrency';
import {
  Plus, PencilSimple, Trash, X, CaretDown, CaretUp, Warning,
  Shield, Sparkle, Lightning, BookOpen, Target, Clock, ChartBar,
  CheckCircle, ArrowRight, ArrowLeft, MagnifyingGlass,
  CaretRight, Stack, FileText, Check,
} from '@phosphor-icons/react';
import {
  Circle, ToggleLeft, ToggleRight,
} from '@phosphor-icons/react';
import Modal from './ui/Modal';
import { useToast } from './ui/Toast';
import {
  LineChart, Line, AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip,
} from 'recharts';
import UsageBar from './UsageBar';
import { useUsage } from '@/hooks/useUsage';
import { format, parseISO, startOfWeek } from 'date-fns';

/* ── Sub-section nav ─────────────────────────────────────────────── */
type SubSection = 'Active Rule Sets' | 'Playbook Library' | 'Rules Library' | 'Weekly Focus' | 'Impact';
const SUB_SECTIONS: { key: SubSection; label: string; desc: string }[] = [
  { key: 'Active Rule Sets', label: 'Active Rule Sets', desc: 'Live setup' },
  { key: 'Playbook Library', label: 'Playbook Library', desc: 'Strategy presets' },
  { key: 'Rules Library', label: 'Rules Library', desc: 'Rules engine' },
  { key: 'Weekly Focus', label: 'Weekly Focus', desc: 'Execution cadence' },
  { key: 'Impact', label: 'Impact', desc: 'PnL + compliance' },
];

/* ── Rule category types ─────────────────────────────────────────── */
type RuleCategory = 'All' | 'Risk' | 'Time' | 'Behavior';
const RULE_CATEGORIES: RuleCategory[] = ['All', 'Risk', 'Time', 'Behavior'];

/* ── Rule Composer types ──────────────────────────────────────────── */
type RuleComposerCategory = 'Behavior' | 'Discipline' | 'Performance';
type RuleComposerStep = 1 | 2 | 3;
const RULE_TYPES: Record<RuleComposerCategory, string[]> = {
  Behavior: ['No Revenge Trading', 'No FOMO Entries', 'No Trading While Tilted', 'Wait for Confirmation', 'No Impulsive Exits', 'Follow the Plan'],
  Discipline: ['Max Daily Loss Limit', 'Max Position Size', 'Max Trades Per Day', 'Stop Loss Required', 'Risk-Reward Minimum', 'No Late Night Trading'],
  Performance: ['Minimum Win Rate', 'Target R-Multiple', 'Weekly PnL Goal', 'Drawdown Recovery', 'Streak Protection', 'Edge Validation'],
};

/* ── Activation priority ──────────────────────────────────────────── */
type ActivationPriority = 'High' | 'Medium' | 'Low';

interface PlaybookProps {
  strategies: Strategy[];
  trades: Trade[];
  onAdd: (strategy: Omit<Strategy, 'id' | 'createdAt'>) => void;
  onUpdate: (id: string, updates: Partial<Strategy>) => void;
  onDelete: (id: string) => void;
}

const emptyStrategy: {
  name: string;
  type: StrategyType;
  rules: string[];
  entryChecklist: string[];
  exitChecklist: string[];
  riskParams: { maxPositionSize?: number; maxLossPercent?: number; riskRewardRatio?: number; maxDailyLoss?: number };
} = {
  name: '',
  type: 'swing',
  rules: [''],
  entryChecklist: [''],
  exitChecklist: [''],
  riskParams: {},
};

export default function Playbook({ strategies, trades, onAdd, onUpdate, onDelete }: PlaybookProps) {
  const { formatCurrency } = useCurrency();
  const { showToast } = useToast();
  const usage = useUsage();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyStrategy);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [ruleFilter, setRuleFilter] = useState<RuleCategory>('All');

  // ── Rule Composer modal state ──
  const [ruleComposerOpen, setRuleComposerOpen] = useState(false);
  const [rcStep, setRcStep] = useState<RuleComposerStep>(1);
  const [rcCategory, setRcCategory] = useState<RuleComposerCategory>('Behavior');
  const [rcRuleType, setRcRuleType] = useState('');
  const [rcCustomRule, setRcCustomRule] = useState('');
  const [rcDescription, setRcDescription] = useState('');

  // ── Rule Set Template Composer modal state ──
  const [ruleSetComposerOpen, setRuleSetComposerOpen] = useState(false);
  const [rsStep, setRsStep] = useState<1 | 2>(1);
  const [rsName, setRsName] = useState('');
  const [rsDescription, setRsDescription] = useState('');
  const [rsSelectedRules, setRsSelectedRules] = useState<string[]>([]);
  const [rsSearch, setRsSearch] = useState('');

  // ── Strategy Template Composer modal state ──
  const [stratComposerOpen, setStratComposerOpen] = useState(false);
  const [scStep, setScStep] = useState<1 | 2>(1);
  const [scName, setScName] = useState('');
  const [scDescription, setScDescription] = useState('');
  const [scType, setScType] = useState<StrategyType>('swing');
  const [scSteps, setScSteps] = useState<string[]>([]);
  const [scStepInput, setScStepInput] = useState('');

  // ── Activation Mixer modal state ──
  const [activationMixerOpen, setActivationMixerOpen] = useState(false);
  const [amSearch, setAmSearch] = useState('');
  const [amSelected, setAmSelected] = useState<string[]>([]);
  const [amPriority, setAmPriority] = useState<ActivationPriority>('Medium');
  const [amItemPriorities, setAmItemPriorities] = useState<Record<string, 'P1' | 'P2' | 'P3'>>({});

  // ── Active Ruleset Details modal state ──
  const [detailsStrategyId, setDetailsStrategyId] = useState<string | null>(null);

  // ── Activation tracking — which strategies are "live" vs just saved ──
  const [activatedIds, setActivatedIds] = useState<Set<string>>(() => new Set(strategies.map(s => s.id)));

  // Section refs for scroll
  const activeRuleSetsRef = useRef<HTMLDivElement>(null);
  const playbookLibraryRef = useRef<HTMLDivElement>(null);
  const rulesLibraryRef = useRef<HTMLDivElement>(null);
  const weeklyFocusRef = useRef<HTMLDivElement>(null);
  const impactRef = useRef<HTMLDivElement>(null);

  const sectionRefs: Record<SubSection, React.RefObject<HTMLDivElement | null>> = {
    'Active Rule Sets': activeRuleSetsRef,
    'Playbook Library': playbookLibraryRef,
    'Rules Library': rulesLibraryRef,
    'Weekly Focus': weeklyFocusRef,
    'Impact': impactRef,
  };

  function scrollToSection(s: SubSection) {
    sectionRefs[s].current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  /* ── Closed trades (time filtering handled by universal top-bar filter) ── */
  const filtered = useMemo(() => {
    return trades.filter(t => !t.isOpen && t.actualPnL !== null);
  }, [trades]);

  /* ── Metrics ───────────────────────────────────────────────────── */
  const metrics = useMemo(() => {
    const total = filtered.length;
    const netPnL = filtered.reduce((s, t) => s + (t.actualPnL ?? 0), 0);
    const disciplineScore = getDisciplineScore(filtered);
    const compliance = total > 0 ? Math.round(disciplineScore * 100) : 100;
    const violations = filtered.filter(t =>
      t.ruleChecklist.some(r => r.compliance === 'no'),
    ).length;

    // Recoverable: poorly executed losses
    const poorLosses = filtered
      .filter(t => t.verdict === 'Poorly Executed' && (t.actualPnL ?? 0) < 0);
    const recoverable = poorLosses.reduce((s, t) => s + Math.abs(t.actualPnL ?? 0), 0) * 0.24;

    // Per-strategy stats
    const stratStats = strategies.map(s => {
      const sTrades = filtered.filter(t => t.strategy === s.name);
      const wins = sTrades.filter(t => (t.actualPnL ?? 0) > 0);
      const comp = getDisciplineScore(sTrades);
      return {
        ...s,
        trades: sTrades,
        winRate: sTrades.length > 0 ? Math.round((wins.length / sTrades.length) * 100) : 0,
        compliance: Math.round(comp * 100),
        pnl: sTrades.reduce((sum, t) => sum + (t.actualPnL ?? 0), 0),
      };
    });

    // All unique rules across all strategies (deduplicated by rule text)
    const ruleMap = new Map<string, { rule: string; strategies: string[] }>();
    strategies.forEach(s => {
      s.rules.forEach(r => {
        if (!r.trim()) return;
        if (!ruleMap.has(r)) ruleMap.set(r, { rule: r, strategies: [] });
        if (!ruleMap.get(r)!.strategies.includes(s.name)) ruleMap.get(r)!.strategies.push(s.name);
      });
    });

    // Rule compliance tracking (aggregated across all strategies that share the rule)
    const ruleHealth = [...ruleMap.values()].map(r => {
      const matching = filtered.filter(t =>
        r.strategies.includes(t.strategy) &&
        t.ruleChecklist.some(rc => rc.rule === r.rule),
      );
      const compliant = matching.filter(t =>
        t.ruleChecklist.find(rc => rc.rule === r.rule)?.compliance !== 'no',
      );
      return {
        rule: r.rule,
        strategy: r.strategies.join(', '),
        total: matching.length,
        compliant: compliant.length,
        compliance: matching.length > 0 ? Math.round((compliant.length / matching.length) * 100) : 100,
        lastHit: matching.length > 0
          ? format(new Date(matching[matching.length - 1].exitDate ?? matching[matching.length - 1].createdAt), 'MMM d')
          : 'Never',
      };
    });

    // Weekly compliance trend
    const weeklyCompliance = (() => {
      const weeks = new Map<string, { comp: number; total: number }>();
      filtered.forEach(t => {
        const d = t.exitDate ? parseISO(t.exitDate) : new Date(t.createdAt);
        const w = format(startOfWeek(d, { weekStartsOn: 1 }), 'MMM d');
        if (!weeks.has(w)) weeks.set(w, { comp: 0, total: 0 });
        const entry = weeks.get(w)!;
        entry.total++;
        const score = t.ruleChecklist.length > 0
          ? t.ruleChecklist.filter(r => r.compliance !== 'no').length / t.ruleChecklist.length
          : 1;
        entry.comp += score;
      });
      return [...weeks.entries()].map(([week, d]) => ({
        week,
        compliance: d.total > 0 ? Math.round((d.comp / d.total) * 100) : 100,
      }));
    })();

    // Best week
    const weekPnl = new Map<string, number>();
    filtered.forEach(t => {
      const d = t.exitDate ? parseISO(t.exitDate) : new Date(t.createdAt);
      const w = format(startOfWeek(d, { weekStartsOn: 1 }), 'dd/MM/yyyy');
      weekPnl.set(w, (weekPnl.get(w) ?? 0) + (t.actualPnL ?? 0));
    });
    const bestWeek = [...weekPnl.entries()].sort((a, b) => b[1] - a[1])[0];

    // Equity data for Impact chart
    const sorted = [...filtered].sort(
      (a, b) => new Date(a.exitDate ?? a.createdAt).getTime() - new Date(b.exitDate ?? b.createdAt).getTime(),
    );
    let cum = 0;
    const equityData = sorted.map(t => {
      cum += t.actualPnL ?? 0;
      return {
        date: format(new Date(t.exitDate ?? t.createdAt), 'MMM d'),
        actual: cum,
      };
    });

    // Hour window analysis
    const hourMap = new Map<number, { pnl: number; count: number }>();
    filtered.forEach(t => {
      const h = new Date(t.createdAt).getHours();
      if (!hourMap.has(h)) hourMap.set(h, { pnl: 0, count: 0 });
      const e = hourMap.get(h)!;
      e.pnl += t.actualPnL ?? 0;
      e.count++;
    });
    const riskWindows = [...hourMap.entries()]
      .filter(([, d]) => d.pnl < 0)
      .sort((a, b) => a[1].pnl - b[1].pnl)
      .slice(0, 3)
      .map(([h, d]) => ({ hour: `${String(h).padStart(2, '0')}:00`, pnl: d.pnl }));
    const edgeWindows = [...hourMap.entries()]
      .filter(([, d]) => d.pnl > 0)
      .sort((a, b) => b[1].pnl - a[1].pnl)
      .slice(0, 3)
      .map(([h, d]) => ({ hour: `${String(h).padStart(2, '0')}:00`, pnl: d.pnl }));

    // Symbol focus
    const coinMap = new Map<string, { pnl: number; count: number; wins: number }>();
    filtered.forEach(t => {
      if (!coinMap.has(t.coin)) coinMap.set(t.coin, { pnl: 0, count: 0, wins: 0 });
      const e = coinMap.get(t.coin)!;
      e.pnl += t.actualPnL ?? 0;
      e.count++;
      if ((t.actualPnL ?? 0) > 0) e.wins++;
    });
    const symbolFocus = [...coinMap.entries()]
      .filter(([, d]) => d.count >= 3 && d.wins / d.count >= 0.6)
      .sort((a, b) => b[1].pnl - a[1].pnl)
      .slice(0, 3)
      .map(([coin, d]) => ({ coin, ...d, winRate: Math.round((d.wins / d.count) * 100) }));

    return {
      total,
      netPnL,
      compliance,
      violations,
      recoverable,
      stratStats,
      ruleHealth,
      weeklyCompliance,
      bestWeek,
      equityData,
      riskWindows,
      edgeWindows,
      symbolFocus,
    };
  }, [filtered, strategies]);

  /* ── Strategy CRUD ─────────────────────────────────────────────── */
  const openAdd = () => { setForm(emptyStrategy); setEditingId(null); setIsModalOpen(true); };
  const openEdit = (strategy: Strategy) => {
    setForm({
      name: strategy.name, type: strategy.type,
      rules: strategy.rules.length > 0 ? strategy.rules : [''],
      entryChecklist: strategy.entryChecklist.length > 0 ? strategy.entryChecklist : [''],
      exitChecklist: strategy.exitChecklist.length > 0 ? strategy.exitChecklist : [''],
      riskParams: strategy.riskParams,
    });
    setEditingId(strategy.id);
    setIsModalOpen(true);
  };
  const handleSave = () => {
    if (!form.name.trim()) return;
    const clean = { ...form, rules: form.rules.filter(r => r.trim()), entryChecklist: form.entryChecklist.filter(r => r.trim()), exitChecklist: form.exitChecklist.filter(r => r.trim()) };
    if (editingId) { onUpdate(editingId, clean); showToast('Strategy updated'); }
    else { onAdd(clean); showToast('Strategy created'); }
    setIsModalOpen(false);
  };
  const handleDeleteConfirm = (id: string) => { onDelete(id); setDeleteConfirm(null); showToast('Strategy deleted'); };
  const addListItem = (field: 'rules' | 'entryChecklist' | 'exitChecklist') => setForm(prev => ({ ...prev, [field]: [...prev[field], ''] }));
  const updateListItem = (field: 'rules' | 'entryChecklist' | 'exitChecklist', index: number, value: string) => setForm(prev => ({ ...prev, [field]: prev[field].map((item, i) => (i === index ? value : item)) }));
  const removeListItem = (field: 'rules' | 'entryChecklist' | 'exitChecklist', index: number) => setForm(prev => ({ ...prev, [field]: prev[field].filter((_, i) => i !== index) }));

  // ── All rules from all strategies (for pickers) ──
  const allRuleStrings = useMemo(() => {
    const set = new Set<string>();
    strategies.forEach(s => s.rules.forEach(r => { if (r.trim()) set.add(r); }));
    return [...set];
  }, [strategies]);

  // ── Rule Composer handlers ──
  const openRuleComposer = () => { setRcStep(1); setRcCategory('Behavior'); setRcRuleType(''); setRcCustomRule(''); setRcDescription(''); setRuleComposerOpen(true); };
  const saveRule = () => {
    const ruleName = rcCustomRule.trim() || rcRuleType;
    if (!ruleName) return;
    // Add to first strategy or create a new one
    if (strategies.length > 0) {
      const s = strategies[0];
      onUpdate(s.id, { rules: [...s.rules, ruleName] });
      showToast(`Rule "${ruleName}" added to ${s.name}`);
    } else {
      onAdd({ name: 'My Rules', type: 'other', rules: [ruleName], entryChecklist: [], exitChecklist: [], riskParams: {} });
      showToast(`Rule "${ruleName}" created with new rule set`);
    }
    setRuleComposerOpen(false);
  };

  // ── Rule Set Composer handlers ──
  const openRuleSetComposer = () => { setRsStep(1); setRsName(''); setRsDescription(''); setRsSelectedRules([]); setRsSearch(''); setRuleSetComposerOpen(true); };
  const saveRuleSet = () => {
    if (!rsName.trim() || rsSelectedRules.length === 0) return;
    onAdd({ name: rsName.trim(), type: 'other', rules: rsSelectedRules, entryChecklist: [], exitChecklist: [], riskParams: {} });
    showToast(`Rule set "${rsName}" created with ${rsSelectedRules.length} rules`);
    setRuleSetComposerOpen(false);
  };

  // ── Strategy Composer handlers ──
  const openStratComposer = () => { setScStep(1); setScName(''); setScDescription(''); setScType('swing'); setScSteps([]); setScStepInput(''); setStratComposerOpen(true); };
  const saveStratComposer = () => {
    if (!scName.trim()) return;
    onAdd({ name: scName.trim(), type: scType, rules: [], entryChecklist: scSteps, exitChecklist: [], riskParams: {} });
    showToast(`Strategy "${scName}" created`);
    setStratComposerOpen(false);
  };
  const addScStep = () => {
    if (!scStepInput.trim()) return;
    setScSteps(prev => [...prev, scStepInput.trim()]);
    setScStepInput('');
  };

  // ── Activation Mixer handlers ──
  const openActivationMixer = () => { setAmSearch(''); setAmSelected([]); setAmPriority('Medium'); setAmItemPriorities({}); setActivationMixerOpen(true); };
  const handleActivate = () => {
    if (amSelected.length === 0) return;
    setActivatedIds(prev => { const next = new Set(prev); amSelected.forEach(id => next.add(id)); return next; });
    showToast(`${amSelected.length} rule set(s) activated with ${amPriority} priority`);
    setActivationMixerOpen(false);
  };
  const applyGlobalPriority = () => {
    const p = amPriority === 'High' ? 'P1' : amPriority === 'Low' ? 'P3' : 'P2';
    const updated: Record<string, 'P1' | 'P2' | 'P3'> = {};
    amSelected.forEach(id => { updated[id] = p; });
    setAmItemPriorities(prev => ({ ...prev, ...updated }));
  };
  const getStrategyDescription = (s: Strategy) =>
    s.type === 'scalping' ? 'High-frequency risk containment' :
    s.type === 'swing' ? 'Patience and selectivity protocol' :
    s.type === 'breakout' ? 'Momentum capture discipline' :
    s.type === 'trend-following' ? 'Trend continuation mode' :
    'Drawdown control mode';

  const ListEditor = ({ label, field }: { label: string; field: 'rules' | 'entryChecklist' | 'exitChecklist' }) => (
    <div className="field">
      <label>{label.toUpperCase()}</label>
      <div className="space-y-2">
        {form[field].map((item, i) => (
          <div key={i} className="flex gap-2">
            <input value={item} onChange={e => updateListItem(field, i, e.target.value)} placeholder={`${label} item ${i + 1}`} className="box flex-1" />
            {form[field].length > 1 && (
              <button onClick={() => removeListItem(field, i)} className="btn-g" style={{ height: 42, padding: '0 14px', color: 'var(--red)', borderColor: 'rgba(255,77,94,.4)' }}><X size={16} /></button>
            )}
          </div>
        ))}
        <button onClick={() => addListItem(field)} className="viewall" style={{ marginLeft: 0, fontSize: 12 }}><Plus size={14} /> Add item</button>
      </div>
    </div>
  );

  /* ── Filtered rules by category ────────────────────────────────── */
  const filteredRules = useMemo(() => {
    return metrics.ruleHealth.filter(r => {
      if (ruleFilter === 'All') return true;
      const lower = r.rule.toLowerCase();
      if (ruleFilter === 'Risk') return lower.includes('risk') || lower.includes('loss') || lower.includes('position') || lower.includes('stop');
      if (ruleFilter === 'Time') return lower.includes('time') || lower.includes('session') || lower.includes('hour') || lower.includes('day');
      if (ruleFilter === 'Behavior') return lower.includes('emotion') || lower.includes('fomo') || lower.includes('revenge') || lower.includes('tilt') || lower.includes('patience');
      return true;
    });
  }, [metrics.ruleHealth, ruleFilter]);

  /* ── Behavior target compliance ────────────────────────────────── */
  const behaviorTargets = useMemo(() => {
    const riskRules = metrics.ruleHealth.filter(r => r.rule.toLowerCase().match(/risk|loss|position|stop/));
    const timeRules = metrics.ruleHealth.filter(r => r.rule.toLowerCase().match(/time|session|hour|day/));
    const behaviorRules = metrics.ruleHealth.filter(r => r.rule.toLowerCase().match(/emotion|fomo|revenge|tilt|patience/));
    const avgComp = (rules: typeof riskRules) => rules.length > 0 ? Math.round(rules.reduce((s, r) => s + r.compliance, 0) / rules.length) : null;
    return {
      risk: avgComp(riskRules),
      time: avgComp(timeRules),
      behavior: avgComp(behaviorRules),
      overall: metrics.compliance,
    };
  }, [metrics]);

  // Execution checklist items
  const executionChecklist = useMemo(() => [
    { label: 'Activate guardrails', detail: `${strategies.length} rules active`, status: strategies.length > 0 ? 'on-track' : 'pending' },
    { label: 'Run highest-impact fix', detail: metrics.recoverable > 0 ? `${formatCurrency(metrics.recoverable)} recoverable` : 'No prioritized fixes in this range', status: metrics.recoverable > 0 ? 'pending' : 'on-track' },
    { label: 'Complete weekly queue', detail: `${metrics.weeklyCompliance.length}/${metrics.weeklyCompliance.length} complete`, status: 'on-track' },
    { label: 'Keep compliance >= 80%', detail: `${metrics.compliance}% in selected period`, status: metrics.compliance >= 80 ? 'on-track' : 'pending' },
  ], [strategies, metrics, formatCurrency]);

  return (
    <div className="relative anim-fade-up">
      {/* ── Header ── */}
      <div className="phead pwrap">
        <p className="eyebrow">
          <Shield size={13} style={{ color: 'var(--amber)' }} /> Playbook Operating System
        </p>
        <h2>Run your process like a system, not a mood.</h2>
        <p className="sub">
          Use this page in order: execute top fixes, enforce guardrails, and track compliance drift. Every panel is synced to the selected account and period.
        </p>
        <div className="actions" style={{ position: 'static', marginTop: 22, flexWrap: 'wrap', gap: 12 }}>
          <button onClick={openRuleComposer} className="btn-a">
            <Plus size={14} /> Create Rule
          </button>
          <button onClick={openRuleSetComposer} disabled={usage.strategies.isAtLimit}
            className="btn-g" style={usage.strategies.isAtLimit ? { opacity: .5 } : undefined}>
            <Stack size={14} /> Create Ruleset
          </button>
          <button onClick={openStratComposer} disabled={usage.strategies.isAtLimit}
            className="btn-g" style={usage.strategies.isAtLimit ? { opacity: .5 } : undefined}>
            <FileText size={14} /> Create Strategy
          </button>
          <button onClick={openActivationMixer} className="btn-g" style={{ borderColor: 'rgba(36,200,138,.4)', color: 'var(--green)' }}>
            <Lightning size={14} /> Activate Set
          </button>
        </div>
      </div>

      {/* Usage indicator */}
      {!usage.strategies.isUnlimited && (
        <div className="card" style={{ maxWidth: 340, marginBottom: 24 }}>
          <UsageBar label="Strategies" current={usage.strategies.current} max={usage.strategies.max} isUnlimited={false} />
        </div>
      )}

      {/* ── 4 Stat Cards ── */}
      <div className="stats" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', marginTop: 0 }}>
        <div className="stat" style={{ height: 'auto', minHeight: 104 }}>
          <span className="accent" style={{ background: 'var(--amber)' }} />
          <b>RULES ACTIVE</b>
          <em style={{ color: 'var(--text)' }}>{strategies.reduce((s, st) => s + st.rules.length, 0)}</em>
          <small style={{ display: 'block', fontSize: 10.5, color: 'var(--muted-2)', marginTop: 6 }}>engine armed</small>
        </div>
        <div className="stat" style={{ height: 'auto', minHeight: 104 }}>
          <span className="accent" style={{ background: 'var(--amber)' }} />
          <b>COMPLIANCE</b>
          <em style={{ color: metrics.compliance >= 80 ? 'var(--green)' : metrics.compliance >= 60 ? 'var(--amber)' : 'var(--red)' }}>{metrics.compliance}%</em>
          <small style={{ display: 'block', fontSize: 10.5, color: 'var(--muted-2)', marginTop: 6 }}>{metrics.violations} violations</small>
        </div>
        <div className="stat" style={{ height: 'auto', minHeight: 104 }}>
          <span className="accent" style={{ background: 'var(--green)' }} />
          <b>PERIOD NET P&amp;L</b>
          <em style={{ color: metrics.netPnL >= 0 ? 'var(--green)' : 'var(--red)' }}>{formatCurrency(metrics.netPnL)}</em>
          <small style={{ display: 'block', fontSize: 10.5, color: 'var(--muted-2)', marginTop: 6 }}>{metrics.total} trades</small>
        </div>
        <div className="stat" style={{ height: 'auto', minHeight: 104 }}>
          <span className="accent" style={{ background: 'var(--amber)' }} />
          <b>RECOVERABLE IN RANGE</b>
          <em style={{ color: 'var(--green)' }}>{formatCurrency(metrics.recoverable)}</em>
          <small style={{ display: 'block', fontSize: 10.5, color: 'var(--muted-2)', marginTop: 6 }}>selected period</small>
        </div>
      </div>

      {/* ── How to Run + Advices ── */}
      <div className="split" style={{ marginTop: 24 }}>
        <div className="card">
          <span className="accent" style={{ width: 56, background: 'var(--amber)' }} />
          <div className="cardhead">
            <div>
              <h3>How to Run This Page</h3>
              <p className="sub">Follow the sequence in order</p>
            </div>
            <Lightning size={16} style={{ marginLeft: 'auto', color: 'var(--amber)' }} />
          </div>
          <div className="klist num">
            {['Create your core trading rules.', 'Combine those rules into a reusable rule-set template.', 'Activate your rule set and run it live.'].map((step, i) => (
              <div key={i}><b>{i + 1}</b><span>{step}</span></div>
            ))}
          </div>
        </div>
        <div className="card">
          <span className="accent" style={{ width: 56, background: 'var(--amber)' }} />
          <div className="cardhead">
            <div>
              <h3>Advices</h3>
              <p className="sub">Operating guidance for this cycle</p>
            </div>
            <Sparkle size={16} style={{ marginLeft: 'auto', color: 'var(--amber)' }} />
          </div>
          <div className="klist num">
            {['Execute active rule set for 5-7 sessions before changing plan.', 'Keep compliance above 80% so rule impact compounds.', 'Review results and adjust rules and rule sets.'].map((tip, i) => (
              <div key={i}><b>{i + 1}</b><span>{tip}</span></div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Sub-section Navigation ── */}
      <div className="tabs" style={{ marginTop: 28, marginBottom: 24, overflowX: 'auto' }}>
        {SUB_SECTIONS.map(s => (
          <button key={s.key} onClick={() => scrollToSection(s.key)} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, whiteSpace: 'nowrap' }}>
            {s.key === 'Active Rule Sets' && <Sparkle size={13} style={{ color: 'var(--amber)' }} />}
            {s.key === 'Playbook Library' && <BookOpen size={13} style={{ color: 'var(--muted-3)' }} />}
            {s.key === 'Rules Library' && <Circle size={13} style={{ color: 'var(--muted-3)' }} />}
            {s.key === 'Weekly Focus' && <Target size={13} style={{ color: 'var(--muted-3)' }} />}
            {s.key === 'Impact' && <ChartBar size={13} style={{ color: 'var(--muted-3)' }} />}
            <span style={{ fontWeight: 700 }}>{s.label}</span>
            <span className="hidden sm:inline" style={{ color: 'var(--muted-2)', fontSize: 11 }}>&middot; {s.desc}</span>
          </button>
        ))}
      </div>

      {/* â•â•â•â•â•â•â•â•â•â• MAIN CONTENT + SIDEBAR â•â•â•â•â•â•â•â•â•â• */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 items-start">

        {/* ── Main content (3 cols) ── */}
        <div className="xl:col-span-3 space-y-6">

          {/* â•â•â•â•â•â•â•â•â•â• ACTIVE RULE SETS â•â•â•â•â•â•â•â•â•â• */}
          <div ref={activeRuleSetsRef} className="scroll-mt-4">
            <div className="card">
              <span className="accent" style={{ width: 56, background: 'var(--green)' }} />
              <div className="cardhead">
                <div>
                  <h3>Active Rule Sets</h3>
                  <p className="sub">Track active rule sets with live condition telemetry. Manual strategies are shown with ordered steps.</p>
                </div>
                <span className="chip" style={{ marginLeft: 'auto', flex: 'none' }}>
                  <i style={{ background: 'var(--green)' }} /> {strategies.filter(s => activatedIds.has(s.id)).length} live
                </span>
              </div>

              {strategies.filter(s => activatedIds.has(s.id)).length === 0 ? (
                <div className="blank" style={{ marginTop: 22, padding: '44px 28px', textAlign: 'center' }}>
                  <span className="corner" style={{ left: -1, top: -1, borderRight: 0, borderBottom: 0 }} />
                  <span className="corner" style={{ right: -1, bottom: -1, borderLeft: 0, borderTop: 0 }} />
                  <div className="badge" style={{ margin: '0 auto 24px', border: '1px solid rgba(36,200,138,.4)', background: 'var(--panel-2)' }}>
                    <Lightning size={22} style={{ color: 'var(--green)' }} />
                  </div>
                  <h4>No active rule sets</h4>
                  <p>Activate one from the Playbook Library to start live tracking.</p>
                  <button onClick={openActivationMixer} className="btn-a" style={{ marginTop: 24 }}>Activate a rule set</button>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: 12, marginTop: 22 }}>
                  {strategies.filter(s => activatedIds.has(s.id)).map(strategy => {
                    const ss = metrics.stratStats.find(s => s.id === strategy.id);
                    const sTrades = ss?.trades ?? [];
                    const totalRules = strategy.rules.length;
                    // Per-rule compliance for this strategy
                    const ruleBreakdown = strategy.rules.filter(r => r.trim()).map(rule => {
                      const matching = sTrades.filter(t => t.ruleChecklist.some(rc => rc.rule === rule));
                      const met = matching.filter(t => t.ruleChecklist.find(rc => rc.rule === rule)?.compliance !== 'no').length;
                      return { rule, total: matching.length, met, compliance: matching.length > 0 ? Math.round((met / matching.length) * 100) : 100 };
                    });
                    const metRules = ruleBreakdown.filter(r => r.compliance >= 80).length;
                    const compliancePct = ss?.compliance ?? 100;
                    const violationCount = sTrades.filter(t => t.ruleChecklist.some(r => r.compliance === 'no')).length;
                    const progressLabel = compliancePct >= 80 ? 'STRONG' : compliancePct >= 50 ? 'BUILDING' : 'WEAK';
                    const progressColor = compliancePct >= 80 ? 'var(--green)' : compliancePct >= 50 ? 'var(--amber)' : 'var(--red)';
                    const level = totalRules >= 5 ? 'ADVANCED' : totalRules >= 3 ? 'STARTER' : 'BASIC';
                    const levelColor = level === 'ADVANCED' ? 'var(--amber)' : level === 'STARTER' ? 'var(--text-2)' : 'var(--muted)';
                    // Leak / capture calculation
                    const poorLosses = sTrades.filter(t => t.verdict === 'Poorly Executed' && (t.actualPnL ?? 0) < 0);
                    const estLeak = poorLosses.reduce((s, t) => s + Math.abs(t.actualPnL ?? 0), 0);
                    const recoverable = estLeak * 0.24;
                    const capturedPnL = sTrades.filter(t => (t.actualPnL ?? 0) > 0).reduce((s, t) => s + (t.actualPnL ?? 0), 0);
                    const missedPnL = sTrades.filter(t => (t.actualPnL ?? 0) < 0).reduce((s, t) => s + Math.abs(t.actualPnL ?? 0), 0);
                    const capturePct = (capturedPnL + missedPnL) > 0 ? Math.round((capturedPnL / (capturedPnL + missedPnL)) * 100) : 0;
                    const impactingCount = poorLosses.length;

                    return (
                      <div key={strategy.id} className="inset" style={{ position: 'relative', padding: '15px 16px', display: 'flex', flexDirection: 'column' }}>
                        <span className="accent" style={{ position: 'absolute', left: 0, top: -1, width: 36, height: 3, background: progressColor }} />

                        {/* Header: icon + level badge */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <Shield size={16} style={{ color: 'var(--amber)' }} />
                          <span className="lbl" style={{ color: 'var(--green)' }}>LIVE TRACKING</span>
                          <span className="chip" style={{ marginLeft: 'auto', height: 20, padding: '0 9px', fontSize: 9, fontWeight: 700, color: levelColor }}>{level}</span>
                        </div>

                        {/* Name + description + details */}
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginTop: 12 }}>
                          <div style={{ minWidth: 0 }}>
                            <h4>{strategy.name}</h4>
                            <p className="sub" style={{ margin: '7px 0 0' }}>
                              {strategy.type === 'scalping' ? 'High-frequency risk containment' :
                               strategy.type === 'swing' ? 'Patience and selectivity protocol' :
                               strategy.type === 'breakout' ? 'Momentum capture discipline' :
                               strategy.type === 'trend-following' ? 'Trend continuation mode' :
                               'Drawdown control mode'}
                            </p>
                          </div>
                          <button onClick={() => setDetailsStrategyId(strategy.id)} className="viewall" style={{ flex: 'none' }}>
                            Details <ArrowRight size={12} />
                          </button>
                        </div>

                        {/* Activated / Used / Priority */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginTop: 16 }}>
                          <div className="inset" style={{ padding: '9px 12px' }}>
                            <p className="lbl">ACTIVATED</p>
                            <p style={{ margin: '6px 0 0', fontFamily: 'var(--mono)', fontSize: 11.5, color: 'var(--text)' }}>{format(new Date(strategy.createdAt), 'MM/dd/yyyy')}</p>
                          </div>
                          <div className="inset" style={{ padding: '9px 12px' }}>
                            <p className="lbl">USED</p>
                            <p style={{ margin: '6px 0 0', fontFamily: 'var(--mono)', fontSize: 11.5, color: 'var(--text)' }}>{sTrades.length}x</p>
                          </div>
                          <div className="inset" style={{ padding: '9px 12px' }}>
                            <p className="lbl">PRIORITY</p>
                            <p style={{ margin: '6px 0 0', fontFamily: 'var(--mono)', fontSize: 11.5, color: 'var(--text)' }}>P2</p>
                          </div>
                        </div>

                        {/* Leak, Recovery and Capture */}
                        <div style={{ marginTop: 16 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <span className="lbl" style={{ color: 'var(--amber)' }}>LEAK, RECOVERY AND CAPTURE</span>
                            <span style={{ marginLeft: 'auto', fontSize: 10.5, color: 'var(--muted-2)' }}>{impactingCount}/{sTrades.length} impacting</span>
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 8, marginTop: 10 }}>
                            <div className="inset" style={{ padding: '9px 12px' }}>
                              <p className="lbl">EST LEAK</p>
                              <p style={{ margin: '6px 0 0', fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--red)' }}>{formatCurrency(-estLeak)}</p>
                            </div>
                            <div className="inset" style={{ padding: '9px 12px' }}>
                              <p className="lbl">RECOVERABLE</p>
                              <p style={{ margin: '6px 0 0', fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--green)' }}>{formatCurrency(recoverable)}</p>
                            </div>
                          </div>
                          <div className="note" style={{ height: 'auto', minHeight: 34, marginTop: 8, padding: '8px 14px', fontSize: 11, color: 'var(--green)' }}>
                            Recovery range: {formatCurrency(0)} to {formatCurrency(recoverable)}
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 8, marginTop: 8 }}>
                            <div className="inset" style={{ padding: '9px 12px' }}>
                              <p className="lbl">CAPTURED</p>
                              <p style={{ margin: '6px 0 0', fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--green)' }}>{formatCurrency(capturedPnL)}</p>
                            </div>
                            <div className="inset" style={{ padding: '9px 12px' }}>
                              <p className="lbl">MISSED</p>
                              <p style={{ margin: '6px 0 0', fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--red)' }}>{formatCurrency(-missedPnL)}</p>
                            </div>
                          </div>
                          <p style={{ margin: '10px 0 0', fontSize: 10.5, color: 'var(--muted-2)' }}>
                            Opportunity capture: {capturePct}% captured &middot; {100 - capturePct}% missed
                          </p>
                        </div>

                        {/* Observed ledger */}
                        <p className="footnote" style={{ textAlign: 'left', marginTop: 14, fontSize: 10.5 }}>
                          Observed ledger: {sTrades.length} events &middot; PnL: {formatCurrency(ss?.pnl ?? 0)} &middot; Risk {formatCurrency(estLeak)} &middot; Confidence {compliancePct}%
                        </p>

                        {/* ── LIVE PROGRESS ── */}
                        <div style={{ marginTop: 16 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <span className="lbl b10">LIVE PROGRESS</span>
                            <span style={{ marginLeft: 'auto', fontWeight: 700, fontSize: 9.5, letterSpacing: '.04em', color: progressColor }}>{progressLabel}</span>
                          </div>
                          <div style={{ height: 2, marginTop: 10, background: 'var(--rail)', position: 'relative' }}>
                            <div className="transition-all duration-500" style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${compliancePct}%`, background: progressColor }} />
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 8, marginTop: 12 }}>
                            <div className="inset" style={{ padding: '9px 12px' }}>
                              <p className="lbl">RULES</p>
                              <p style={{ margin: '6px 0 0', fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--text)' }}>{totalRules}/{totalRules}</p>
                            </div>
                            <div className="inset" style={{ padding: '9px 12px' }}>
                              <p className="lbl">MET</p>
                              <p style={{ margin: '6px 0 0', fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--text)' }}>{metRules}/{totalRules}</p>
                            </div>
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginTop: 8 }}>
                            <div className="inset" style={{ padding: '9px 12px' }}>
                              <p className="lbl">COMPLIANCE</p>
                              <p style={{ margin: '6px 0 0', fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--text)' }}>{compliancePct}%</p>
                            </div>
                            <div className="inset" style={{ padding: '9px 12px' }}>
                              <p className="lbl">VIOLATIONS</p>
                              <p style={{ margin: '6px 0 0', fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--text)' }}>{violationCount}</p>
                            </div>
                            <div className="inset" style={{ padding: '9px 12px' }}>
                              <p className="lbl">CHANGED</p>
                              <p style={{ margin: '6px 0 0', fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--text)' }}>0</p>
                            </div>
                          </div>
                        </div>

                        {/* ── Per-rule breakdown ── */}
                        {ruleBreakdown.length > 0 && (
                          <div style={{ marginTop: 14 }}>
                            {ruleBreakdown.map((rb, i) => {
                              const status = rb.compliance >= 80 ? 'ON TRACK' : rb.compliance >= 50 ? 'BUILDING' : 'AT RISK';
                              const statusColor = status === 'ON TRACK' ? 'var(--green)' : status === 'BUILDING' ? 'var(--amber)' : 'var(--red)';
                              return (
                                <div key={i} className="mrow">
                                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginRight: 8 }}>
                                    <span style={{ color: 'var(--muted-2)' }}>{strategy.type}:</span> {rb.rule.length > 25 ? rb.rule.slice(0, 25) + '...' : rb.rule}
                                  </span>
                                  <span className="val" style={{ fontFamily: 'var(--body)', fontWeight: 700, fontSize: 9.5, letterSpacing: '.04em', color: statusColor, flex: 'none' }}>{status}</span>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* Actions */}
                        <div style={{ display: 'flex', gap: 10, marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--line)' }}>
                          <button onClick={() => openEdit(strategy)} className="btn-g" style={{ height: 32, padding: '0 14px', fontSize: 12 }}><PencilSimple size={12} /> Edit</button>
                          <button onClick={() => { setActivatedIds(prev => { const next = new Set(prev); next.delete(strategy.id); return next; }); showToast(`"${strategy.name}" deactivated`); }}
                            className="btn-g" style={{ height: 32, padding: '0 14px', fontSize: 12, borderColor: 'rgba(255,77,94,.4)', color: 'var(--red)' }}><X size={12} /> Deactivate</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* â•â•â•â•â•â•â•â•â•â• PLAYBOOK LIBRARY â•â•â•â•â•â•â•â•â•â• */}
          <div ref={playbookLibraryRef} className="scroll-mt-4">
            <div className="card">
              <span className="accent" style={{ width: 56, background: 'var(--amber)' }} />
              <div className="cardhead">
                <div>
                  <h3>Playbook Library</h3>
                  <p className="sub">One library for all your templates, including starter sets.</p>
                </div>
                <BookOpen size={16} style={{ marginLeft: 'auto', color: 'var(--amber)' }} />
              </div>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', marginTop: 18 }}>
                <span className="chip">{strategies.length} templates available</span>
                <button onClick={openRuleSetComposer} disabled={usage.strategies.isAtLimit}
                  className="btn-a" style={usage.strategies.isAtLimit ? { height: 32, padding: '0 16px', fontSize: 12, opacity: .5 } : { height: 32, padding: '0 16px', fontSize: 12 }}>
                  <Plus size={14} /> Create Rule Set
                </button>
                <button onClick={openStratComposer} disabled={usage.strategies.isAtLimit}
                  className="btn-g" style={usage.strategies.isAtLimit ? { height: 32, padding: '0 16px', fontSize: 12, opacity: .5 } : { height: 32, padding: '0 16px', fontSize: 12 }}>
                  <Plus size={14} /> Create Strategy
                </button>
              </div>

              {strategies.length === 0 ? (
                <div className="empty-line">No templates yet. Create your first strategy template.</div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 12, marginTop: 20 }}>
                  {strategies.map(strategy => {
                    const level = strategy.rules.length >= 5 ? 'ADVANCED' : strategy.rules.length >= 3 ? 'INTERMEDIATE' : 'BEGINNER';
                    const levelColor = level === 'ADVANCED' ? 'var(--amber)' : level === 'INTERMEDIATE' ? 'var(--amber)' : 'var(--green)';
                    const isActive = activatedIds.has(strategy.id);
                    return (
                      <div key={strategy.id} className="inset" style={{ position: 'relative', padding: '15px 16px' }}>
                        <span className="accent" style={{ position: 'absolute', left: 0, top: -1, width: 36, height: 3, background: levelColor }} />
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <Lightning size={14} style={{ color: 'var(--muted-3)' }} />
                          <span className="chip" style={{ marginLeft: 'auto', height: 20, padding: '0 9px', fontSize: 9, fontWeight: 700, color: levelColor }}>{level}</span>
                          {isActive
                            ? <span className="chip" style={{ height: 20, padding: '0 9px', fontSize: 9, fontWeight: 700, color: 'var(--green)' }}>ACTIVE</span>
                            : <span className="chip" style={{ height: 20, padding: '0 9px', fontSize: 9, fontWeight: 700, color: 'var(--muted-2)' }}>SAVED</span>}
                        </div>
                        <h4 style={{ marginTop: 12 }}>{strategy.name}</h4>
                        <p className="sub" style={{ margin: '8px 0 0' }}>
                          {strategy.type === 'scalping' ? 'Strict limits for high-frequency trading with anti-tilt pacing.' :
                           strategy.type === 'swing' ? 'Patience-first setup to reduce impulse entries and early exits.' :
                           strategy.type === 'breakout' ? 'Momentum capture with strict entry criteria.' :
                           `${strategy.type} strategy with ${strategy.rules.length} rules.`}
                        </p>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 12 }}>
                          {[strategy.type, ...strategy.rules.slice(0, 2)].map((tag, i) => (
                            <span key={i} className="chip" style={{ height: 20, padding: '0 9px', fontSize: 9.5, color: 'var(--muted-2)' }}>
                              #{tag.split(' ')[0]}
                            </span>
                          ))}
                        </div>
                        <p className="lbl" style={{ marginTop: 12 }}>{strategy.rules.length} RULES</p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 16 }}>
                          {isActive ? (
                            <button onClick={() => { setActivatedIds(prev => { const next = new Set(prev); next.delete(strategy.id); return next; }); showToast(`"${strategy.name}" deactivated`); }}
                              className="btn-g" style={{ width: '100%', height: 34, fontSize: 12, borderColor: 'rgba(255,77,94,.4)', color: 'var(--red)' }}>
                              Deactivate <X size={14} />
                            </button>
                          ) : (
                            <button onClick={() => { setAmSelected([strategy.id]); setActivationMixerOpen(true); }}
                              className="btn-a" style={{ width: '100%', height: 34, fontSize: 12 }}>
                              Activate Rule Set <ArrowRight size={14} />
                            </button>
                          )}
                          <button onClick={() => openEdit(strategy)} className="btn-g" style={{ width: '100%', height: 34, fontSize: 12 }}>
                            <PencilSimple size={12} /> Open &amp; Adjust
                          </button>
                          <button onClick={() => setDeleteConfirm(strategy.id)} className="btn-g" style={{ width: '100%', height: 30, fontSize: 11.5, border: 0, color: 'var(--red)' }}>
                            <Trash size={12} /> Delete
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* â•â•â•â•â•â•â•â•â•â• RULES LIBRARY â•â•â•â•â•â•â•â•â•â• */}
          <div ref={rulesLibraryRef} className="scroll-mt-4">
            <div className="card">
              <span className="accent" style={{ width: 56, background: 'var(--amber)' }} />
              <div className="cardhead">
                <div>
                  <h3>Rules Library</h3>
                  <p className="sub">Create, tune, and manage guardrails for this account.</p>
                </div>
                <Target size={16} style={{ marginLeft: 'auto', color: 'var(--amber)' }} />
              </div>

              {/* Category filter */}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 18, marginBottom: 4 }}>
                {RULE_CATEGORIES.map(c => (
                  <button key={c} onClick={() => setRuleFilter(c)} className={`chip${ruleFilter === c ? ' on' : ''}`}>{c}</button>
                ))}
              </div>

              {filteredRules.length === 0 ? (
                <div className="empty-line">No rules found. Add rules to your strategies first.</div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 12, marginTop: 20 }}>
                  {filteredRules.map((r, i) => {
                    const impactColor = r.compliance >= 90 ? 'var(--green)' : r.compliance >= 70 ? 'var(--amber)' : 'var(--red)';
                    return (
                      <div key={i} className="inset" style={{ position: 'relative', padding: '15px 16px' }}>
                        <span className="accent" style={{ position: 'absolute', left: 0, top: -1, width: 36, height: 3, background: impactColor }} />
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <p style={{ margin: 0, fontWeight: 700, fontSize: 12.5, color: 'var(--text)' }}>P2 &middot; {r.rule}</p>
                          <ToggleRight size={18} style={{ marginLeft: 'auto', flex: 'none', color: 'var(--green)' }} />
                        </div>
                        <p className="sub" style={{ margin: '8px 0 0' }}>{r.strategy}</p>
                        <div className="mrow" style={{ marginTop: 8 }}>
                          <span className="lb" style={{ marginLeft: 0 }}>Last Triggered</span>
                          <span className="val">{r.lastHit}</span>
                        </div>
                        <div style={{ height: 2, marginTop: 12, background: 'var(--rail)', position: 'relative' }}>
                          <div className="transition-all duration-500" style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${r.compliance}%`, background: impactColor }} />
                        </div>
                        <p style={{ margin: '10px 0 0', fontSize: 10.5, color: 'var(--muted-2)' }}>{r.compliance}% compliance &middot; {r.total - r.compliant} violations</p>
                        <span className="chip" style={{ marginTop: 10, height: 20, padding: '0 9px', fontSize: 9, fontWeight: 700, color: impactColor }}>
                          {r.compliance >= 90 ? 'HIGH IMPACT' : r.compliance >= 70 ? 'MEDIUM IMPACT' : 'LOW IMPACT'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Behavior Targets */}
            <div className="card" style={{ marginTop: 24 }}>
              <span className="accent" style={{ width: 56, background: 'var(--amber)' }} />
              <div className="cardhead">
                <div>
                  <h3>Behavior Targets</h3>
                  <p className="sub">Tracking your key discipline metrics</p>
                </div>
                <Clock size={16} style={{ marginLeft: 'auto', color: 'var(--amber)' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 12, marginTop: 22 }}>
                {[
                  { label: 'Risk Rules', value: behaviorTargets.risk, icon: Shield },
                  { label: 'Time Rules', value: behaviorTargets.time, icon: Clock },
                  { label: 'Behavior Rules', value: behaviorTargets.behavior, icon: Target },
                  { label: 'Overall', value: behaviorTargets.overall, icon: CheckCircle },
                ].map(item => (
                  <div key={item.label} className="inset" style={{ position: 'relative', padding: '15px 16px' }}>
                    <span className="accent" style={{ position: 'absolute', left: 0, top: -1, width: 36, height: 3, background: (item.value ?? 0) >= 80 ? 'var(--green)' : 'var(--amber)' }} />
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <item.icon size={14} style={{ color: 'var(--amber)' }} />
                      <span style={{ marginLeft: 'auto', fontSize: 10, color: item.value !== null && item.value > (behaviorTargets.overall ?? 0) ? 'var(--green)' : 'var(--muted-2)' }}>
                        {item.value !== null && item.value > (behaviorTargets.overall ?? 0) ? '↗ vs previous period' : '— vs previous period'}
                      </span>
                    </div>
                    <p className="lbl" style={{ marginTop: 12 }}>{item.label.toUpperCase()}</p>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 8 }}>
                      <span style={{ fontFamily: 'var(--mono)', fontWeight: 500, fontSize: 18, color: item.value !== null ? 'var(--text)' : 'var(--muted-2)' }}>
                        {item.value !== null ? `${item.value}%` : '—'}
                      </span>
                      <span style={{ fontSize: 10.5, color: 'var(--muted-2)' }}>/ &ge; 80%</span>
                    </div>
                    <div style={{ height: 2, marginTop: 14, background: 'var(--rail)', position: 'relative' }}>
                      <div className="transition-all duration-500" style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${item.value ?? 0}%`, background: (item.value ?? 0) >= 80 ? 'var(--green)' : 'var(--muted-3)' }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* â•â•â•â•â•â•â•â•â•â• WEEKLY FOCUS (placeholder) â•â•â•â•â•â•â•â•â•â• */}
          <div ref={weeklyFocusRef} className="scroll-mt-4">
            <div className="card">
              <span className="accent" style={{ width: 56, background: 'var(--amber)' }} />
              <div className="cardhead">
                <div>
                  <h3>Weekly Focus</h3>
                  <p className="sub">Execution cadence for this week</p>
                </div>
                <Target size={16} style={{ marginLeft: 'auto', color: 'var(--amber)' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 12, marginTop: 22 }}>
                <div className="inset" style={{ position: 'relative', padding: '15px 16px' }}>
                  <span className="accent" style={{ position: 'absolute', left: 0, top: -1, width: 36, height: 3, background: 'var(--red)' }} />
                  <p className="lbl">TOP RULE TO WATCH</p>
                  <p style={{ margin: '10px 0 0', fontSize: 11.5, lineHeight: '17px', color: 'var(--muted-2)' }}>
                    {metrics.ruleHealth.length > 0
                      ? `Focus on "${metrics.ruleHealth.sort((a, b) => a.compliance - b.compliance)[0].rule}" — lowest compliance at ${metrics.ruleHealth.sort((a, b) => a.compliance - b.compliance)[0].compliance}%`
                      : 'No rules tracked yet.'}
                  </p>
                </div>
                <div className="inset" style={{ position: 'relative', padding: '15px 16px' }}>
                  <span className="accent" style={{ position: 'absolute', left: 0, top: -1, width: 36, height: 3, background: 'var(--amber)' }} />
                  <p className="lbl">SESSION TARGET</p>
                  <p style={{ margin: '10px 0 0', fontSize: 11.5, lineHeight: '17px', color: 'var(--muted-2)' }}>
                    Run 5-7 sessions with current rule set before making adjustments. Track compliance daily.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* â•â•â•â•â•â•â•â•â•â• IMPACT & COMPLIANCE â•â•â•â•â•â•â•â•â•â• */}
          <div ref={impactRef} className="scroll-mt-4">
            <div className="card">
              <span className="accent" style={{ width: 56, background: 'var(--green)' }} />
              <div className="cardhead">
                <div>
                  <h3>Impact &amp; Compliance</h3>
                  <p className="sub">Measuring the ROI of your discipline</p>
                </div>
                {metrics.equityData.length > 0 && (
                  <span className="chip" style={{ marginLeft: 'auto', flex: 'none' }}>
                    {metrics.equityData[0]?.date} &rarr; {metrics.equityData[metrics.equityData.length - 1]?.date}
                  </span>
                )}
              </div>

              {/* 4 impact stat cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 12, marginTop: 22 }}>
                <div className="inset" style={{ position: 'relative', padding: '15px 16px' }}>
                  <span className="accent" style={{ position: 'absolute', left: 0, top: -1, width: 36, height: 3, background: 'var(--red)' }} />
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <p className="lbl">MONEY LEFT ON TABLE</p>
                    <ChartBar size={12} style={{ marginLeft: 'auto', color: 'var(--red)' }} />
                  </div>
                  <p style={{ margin: '8px 0 0', fontFamily: 'var(--mono)', fontWeight: 500, fontSize: 18, color: 'var(--text)' }}>{formatCurrency(-metrics.recoverable)}</p>
                  <p style={{ margin: '6px 0 0', fontSize: 10.5, color: 'var(--red)' }}>Missed opportunity</p>
                </div>
                <div className="inset" style={{ position: 'relative', padding: '15px 16px' }}>
                  <span className="accent" style={{ position: 'absolute', left: 0, top: -1, width: 36, height: 3, background: 'var(--green)' }} />
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <p className="lbl">PROJECTED GAIN</p>
                    <ChartBar size={12} style={{ marginLeft: 'auto', color: 'var(--green)' }} />
                  </div>
                  <p style={{ margin: '8px 0 0', fontFamily: 'var(--mono)', fontWeight: 500, fontSize: 18, color: 'var(--green)' }}>{formatCurrency(metrics.recoverable)}</p>
                  <p style={{ margin: '6px 0 0', fontSize: 10.5, color: 'var(--green)' }}>If rules followed</p>
                </div>
                <div className="inset" style={{ position: 'relative', padding: '15px 16px' }}>
                  <span className="accent" style={{ position: 'absolute', left: 0, top: -1, width: 36, height: 3, background: 'var(--amber)' }} />
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <p className="lbl">AVG COMPLIANCE</p>
                    <ChartBar size={12} style={{ marginLeft: 'auto', color: 'var(--amber)' }} />
                  </div>
                  <p style={{ margin: '8px 0 0', fontFamily: 'var(--mono)', fontWeight: 500, fontSize: 18, color: 'var(--text)' }}>{metrics.compliance}%</p>
                </div>
                <div className="inset" style={{ position: 'relative', padding: '15px 16px' }}>
                  <span className="accent" style={{ position: 'absolute', left: 0, top: -1, width: 36, height: 3, background: 'var(--amber)' }} />
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <p className="lbl">BEST WEEK</p>
                    <CheckCircle size={12} style={{ marginLeft: 'auto', color: 'var(--green)' }} />
                  </div>
                  <p style={{ margin: '8px 0 0', fontFamily: 'var(--mono)', fontWeight: 500, fontSize: 18, color: 'var(--text)' }}>{metrics.bestWeek ? metrics.bestWeek[0] : '—'}</p>
                </div>
              </div>

              {/* Charts */}
              <div className="split" style={{ marginTop: 24, gap: 20 }}>
                {/* Estimated vs Actual PnL */}
                <div className="inset" style={{ padding: '15px 16px' }}>
                  <p className="lbl b10">ESTIMATED VS ACTUAL PNL</p>
                  {metrics.equityData.length > 1 ? (
                    <div style={{ height: 180, marginTop: 14 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={metrics.equityData}>
                          <defs>
                            <linearGradient id="pnlGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#24c88a" stopOpacity={0.3} />
                              <stop offset="95%" stopColor="#24c88a" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#7f8ea3' }} axisLine={false} tickLine={false} />
                          <YAxis tick={{ fontSize: 10, fill: '#7f8ea3' }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}`} />
                          <Tooltip contentStyle={{ background: '#0c1119', border: '1px solid #182432', borderRadius: '2px', fontSize: '12px', color: '#edf2f7' }} />
                          <Area type="monotone" dataKey="actual" stroke="#24c88a" fill="url(#pnlGrad)" strokeWidth={2} dot={{ r: 2, fill: '#24c88a' }} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="plot" style={{ marginTop: 14 }}><span className="empty">Not enough data</span></div>
                  )}
                </div>

                {/* Compliance Trend */}
                <div className="inset" style={{ padding: '15px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <p className="lbl b10">COMPLIANCE TREND</p>
                    <span className="chip" style={{ marginLeft: 'auto', height: 20, padding: '0 9px', fontSize: 9, fontWeight: 700, color: 'var(--green)' }}>
                      <i style={{ background: 'var(--green)' }} /> LIVE
                    </span>
                  </div>
                  {metrics.weeklyCompliance.length > 1 ? (
                    <div style={{ height: 180, marginTop: 14 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={metrics.weeklyCompliance}>
                          <XAxis dataKey="week" tick={{ fontSize: 10, fill: '#7f8ea3' }} axisLine={false} tickLine={false} />
                          <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#7f8ea3' }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} />
                          <Tooltip contentStyle={{ background: '#0c1119', border: '1px solid #182432', borderRadius: '2px', fontSize: '12px', color: '#edf2f7' }} />
                          <Line type="monotone" dataKey="compliance" stroke="#24c88a" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 2, fill: '#24c88a' }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="plot" style={{ marginTop: 14 }}><span className="empty">Not enough data</span></div>
                  )}
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* ── Right Sidebar ── */}
        <div className="space-y-4">

          {/* Execution Checklist */}
          <div className="card" style={{ padding: '19px 22px 20px' }}>
            <span className="accent" style={{ width: 44, background: 'var(--amber)' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
              <CheckCircle size={14} style={{ color: 'var(--amber)' }} />
              <h4>Execution Checklist</h4>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 16 }}>
              {executionChecklist.map((item, i) => (
                <div key={i} className="inset" style={{ position: 'relative', padding: '11px 14px' }}>
                  <span className="accent" style={{ position: 'absolute', left: 0, top: -1, width: 30, height: 3, background: item.status === 'on-track' ? 'var(--green)' : 'var(--amber)' }} />
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ margin: 0, fontWeight: 700, fontSize: 12, color: 'var(--text)' }}>{item.label}</p>
                      <p style={{ margin: '5px 0 0', fontSize: 10.5, color: 'var(--muted-2)' }}>{item.detail}</p>
                    </div>
                    <span style={{ marginLeft: 'auto', flex: 'none', fontWeight: 700, fontSize: 9, letterSpacing: '.04em', color: item.status === 'on-track' ? 'var(--green)' : 'var(--amber)' }}>
                      {item.status === 'on-track' ? 'ON TRACK' : 'PENDING'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Active Rule Health */}
          <div className="card" style={{ padding: '19px 22px 20px' }}>
            <span className="accent" style={{ width: 44, background: 'var(--amber)' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
              <Shield size={14} style={{ color: 'var(--amber)' }} />
              <h4>Active Rule Health</h4>
            </div>
            <p className="lbl" style={{ marginTop: 10 }}>SORTED BY HIGHEST IMPACT FIRST</p>
            <div style={{ marginTop: 8 }}>
              {metrics.ruleHealth
                .sort((a, b) => b.total - a.total)
                .slice(0, 5)
                .map((r, i) => (
                <div key={i} className="mrow">
                  <span className="ic" style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: 10, color: r.compliance >= 90 ? 'var(--green)' : r.compliance >= 70 ? 'var(--amber)' : 'var(--red)' }}>#{i + 1}</span>
                  <div style={{ minWidth: 0, marginLeft: 12 }}>
                    <div style={{ fontWeight: 700, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.rule.length > 20 ? r.rule.slice(0, 20) + '...' : r.rule}</div>
                    <div style={{ fontSize: 10, color: 'var(--muted-2)', marginTop: 3 }}>{r.strategy} &middot; Last hit: {r.lastHit}</div>
                  </div>
                  <span className="val">{r.compliance}%</span>
                </div>
              ))}
              {metrics.ruleHealth.length === 0 && (
                <p style={{ margin: '10px 0 0', fontSize: 11.5, color: 'var(--muted)' }}>No rules tracked yet.</p>
              )}
            </div>
          </div>

          {/* Hour Window Radar */}
          <div className="card" style={{ padding: '19px 22px 20px' }}>
            <span className="accent" style={{ width: 44, background: 'var(--amber)' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
              <Warning size={14} style={{ color: 'var(--amber)' }} />
              <h4>Hour Window Radar</h4>
            </div>
            {metrics.riskWindows.length > 0 && (
              <div style={{ marginTop: 14 }}>
                <p className="lbl" style={{ color: 'var(--red)' }}>RISK WINDOWS</p>
                {metrics.riskWindows.map((w, i) => (
                  <div key={i} className="mrow">
                    <span className="lb" style={{ marginLeft: 0 }}>{w.hour}</span>
                    <span className="val" style={{ color: 'var(--red)' }}>{formatCurrency(w.pnl)}</span>
                  </div>
                ))}
              </div>
            )}
            {metrics.edgeWindows.length > 0 && (
              <div style={{ marginTop: 14 }}>
                <p className="lbl" style={{ color: 'var(--green)' }}>EDGE WINDOWS</p>
                {metrics.edgeWindows.map((w, i) => (
                  <div key={i} className="mrow">
                    <span className="lb" style={{ marginLeft: 0 }}>{w.hour}</span>
                    <span className="val" style={{ color: 'var(--green)' }}>{formatCurrency(w.pnl)}</span>
                  </div>
                ))}
              </div>
            )}
            {metrics.riskWindows.length === 0 && metrics.edgeWindows.length === 0 && (
              <p style={{ margin: '12px 0 0', fontSize: 11.5, color: 'var(--muted)' }}>Not enough data yet.</p>
            )}
          </div>

          {/* Symbol Focus */}
          <div className="card" style={{ padding: '19px 22px 20px' }}>
            <span className="accent" style={{ width: 44, background: 'var(--amber)' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
              <Sparkle size={14} style={{ color: 'var(--amber)' }} />
              <h4>Symbol Focus</h4>
            </div>
            {metrics.symbolFocus.length > 0 ? (
              <div style={{ marginTop: 10 }}>
                {metrics.symbolFocus.map((s, i) => (
                  <div key={i} className="mrow">
                    <div>
                      <div style={{ fontWeight: 700, color: 'var(--text)' }}>{s.coin}</div>
                      <div style={{ fontSize: 10, color: 'var(--muted-2)', marginTop: 3 }}>{s.winRate}% WR &middot; {s.count} trades</div>
                    </div>
                    <span className="val" style={{ color: 'var(--green)' }}>{formatCurrency(s.pnl)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ margin: '12px 0 0', fontSize: 11.5, color: 'var(--muted)' }}>No high-confidence symbols detected in this period yet.</p>
            )}
          </div>

        </div>
      </div>

      {/* ── Strategy Form Modal ── */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingId ? 'Edit Strategy' : 'Create Rule Set Template'} size="lg">
        <div className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="field">
              <label>TEMPLATE NAME</label>
              <input value={form.name} onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))} placeholder="Example: Drawdown Recovery Protocol" className="box w-full" />
            </div>
            <div className="field">
              <label>TYPE</label>
              <select value={form.type} onChange={e => setForm(prev => ({ ...prev, type: e.target.value as StrategyType }))} className="box w-full">
                {STRATEGY_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
          </div>
          <ListEditor label="Rules" field="rules" />
          <ListEditor label="Entry Criteria" field="entryChecklist" />
          <ListEditor label="Exit Criteria" field="exitChecklist" />
          <div>
            <p className="lbl b10" style={{ marginBottom: 12 }}>RISK PARAMETERS</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="field">
                <label>MAX POSITION SIZE ($)</label>
                <input type="number" className="box w-full" value={form.riskParams.maxPositionSize ?? ''} onChange={e => setForm(prev => ({ ...prev, riskParams: { ...prev.riskParams, maxPositionSize: e.target.value ? Number(e.target.value) : undefined } }))} />
              </div>
              <div className="field">
                <label>MAX LOSS (%)</label>
                <input type="number" className="box w-full" value={form.riskParams.maxLossPercent ?? ''} onChange={e => setForm(prev => ({ ...prev, riskParams: { ...prev.riskParams, maxLossPercent: e.target.value ? Number(e.target.value) : undefined } }))} />
              </div>
              <div className="field">
                <label>RISK:REWARD RATIO</label>
                <input type="number" step="0.1" className="box w-full" value={form.riskParams.riskRewardRatio ?? ''} onChange={e => setForm(prev => ({ ...prev, riskParams: { ...prev.riskParams, riskRewardRatio: e.target.value ? Number(e.target.value) : undefined } }))} />
              </div>
              <div className="field">
                <label>MAX DAILY LOSS ($)</label>
                <input type="number" className="box w-full" value={form.riskParams.maxDailyLoss ?? ''} onChange={e => setForm(prev => ({ ...prev, riskParams: { ...prev.riskParams, maxDailyLoss: e.target.value ? Number(e.target.value) : undefined } }))} />
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4" style={{ borderTop: '1px solid var(--line)' }}>
            <button onClick={() => setIsModalOpen(false)} className="btn-g">Cancel</button>
            <button onClick={handleSave} disabled={!form.name.trim()} className="btn-a" style={!form.name.trim() ? { opacity: .5 } : undefined}>
              {editingId ? 'Update' : 'Create'} Strategy
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation */}
      <Modal isOpen={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} title="Delete Strategy" size="sm">
        <div className="note" style={{ height: 'auto', minHeight: 44, padding: '12px 18px', marginTop: 0, marginBottom: 20 }}>
          Are you sure you want to delete this strategy? This cannot be undone.
        </div>
        <div className="flex justify-end gap-3">
          <button onClick={() => setDeleteConfirm(null)} className="btn-g">Cancel</button>
          <button onClick={() => deleteConfirm && handleDeleteConfirm(deleteConfirm)} className="btn-a" style={{ background: 'var(--red)', color: '#fff' }}>Delete</button>
        </div>
      </Modal>

      {/* â•â•â•â•â•â•â•â•â•â• RULE COMPOSER (3-step wizard) â•â•â•â•â•â•â•â•â•â• */}
      <Modal isOpen={ruleComposerOpen} onClose={() => setRuleComposerOpen(false)} title="Rule Composer" size="lg">
        <div>
          {/* Step indicator */}
          <div className="flex items-center gap-2 mb-6 flex-wrap">
            {[1, 2, 3].map(s => (
              <div key={s} className="flex items-center gap-2">
                <span style={{
                  width: 24, height: 24, borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: 'var(--display)', fontWeight: 700, fontSize: 12,
                  border: `1px solid ${rcStep === s ? 'var(--amber)' : rcStep > s ? 'var(--green)' : 'var(--line-2)'}`,
                  background: rcStep === s ? 'var(--amber)' : 'transparent',
                  color: rcStep === s ? 'var(--ink)' : rcStep > s ? 'var(--green)' : 'var(--muted-2)',
                }}>{rcStep > s ? <Check size={13} /> : s}</span>
                <span style={{ fontWeight: 700, fontSize: 11.5, color: rcStep === s ? 'var(--text)' : 'var(--muted-2)' }}>
                  {s === 1 ? 'Category & Type' : s === 2 ? 'Details' : 'Review'}
                </span>
                {s < 3 && <CaretRight size={13} style={{ color: 'var(--muted-3)' }} />}
              </div>
            ))}
          </div>

          {/* Step 1: Category & Rule Type */}
          {rcStep === 1 && (
            <div className="space-y-5">
              <div>
                <p className="lbl b10" style={{ marginBottom: 12 }}>SELECT CATEGORY</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 10 }}>
                  {(['Behavior', 'Discipline', 'Performance'] as RuleComposerCategory[]).map(cat => (
                    <button key={cat} onClick={() => { setRcCategory(cat); setRcRuleType(''); }}
                      className="inset" style={{ textAlign: 'left', padding: '13px 16px', borderColor: rcCategory === cat ? 'var(--amber)' : 'var(--line)' }}>
                      {cat === 'Behavior' ? <Target size={15} style={{ color: 'var(--amber)' }} /> :
                       cat === 'Discipline' ? <Shield size={15} style={{ color: 'var(--amber)' }} /> :
                       <ChartBar size={15} style={{ color: 'var(--green)' }} />}
                      <p style={{ margin: '10px 0 0', fontWeight: 700, fontSize: 12.5, color: 'var(--text)' }}>{cat}</p>
                      <p style={{ margin: '5px 0 0', fontSize: 10.5, color: 'var(--muted-2)' }}>
                        {cat === 'Behavior' ? 'Emotional & impulse controls' : cat === 'Discipline' ? 'Risk & session limits' : 'Target & outcome rules'}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="lbl b10" style={{ marginBottom: 12 }}>SELECT RULE TYPE</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 8 }}>
                  {RULE_TYPES[rcCategory].map(rt => (
                    <button key={rt} onClick={() => setRcRuleType(rt)}
                      className="inset" style={{ display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left', padding: '11px 14px', borderColor: rcRuleType === rt ? 'var(--amber)' : 'var(--line)' }}>
                      <span style={{ width: 14, height: 14, flex: 'none', borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${rcRuleType === rt ? 'var(--amber)' : 'var(--muted-3)'}` }}>
                        {rcRuleType === rt && <span style={{ width: 6, height: 6, background: 'var(--amber)' }} />}
                      </span>
                      <span style={{ fontSize: 12, color: 'var(--text)' }}>{rt}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Details */}
          {rcStep === 2 && (
            <div className="space-y-4">
              <div className="inset" style={{ padding: '13px 16px' }}>
                <p className="lbl">SELECTED</p>
                <p style={{ margin: '8px 0 0', fontWeight: 700, fontSize: 12.5, color: 'var(--text)' }}>{rcCategory} &middot; {rcRuleType || 'Custom'}</p>
              </div>
              <div className="field">
                <label>CUSTOM RULE NAME (OPTIONAL)</label>
                <input value={rcCustomRule} onChange={e => setRcCustomRule(e.target.value)} placeholder={rcRuleType || 'Enter custom rule name'} className="box w-full" />
                <p className="footnote" style={{ textAlign: 'left', marginTop: 8 }}>Leave blank to use the selected rule type as name</p>
              </div>
              <div className="field">
                <label>DESCRIPTION / NOTES</label>
                <textarea value={rcDescription} onChange={e => setRcDescription(e.target.value)} placeholder="Describe when this rule applies and why it matters..." rows={3} className="box w-full" style={{ height: 'auto', padding: '11px 14px' }} />
              </div>
            </div>
          )}

          {/* Step 3: Review */}
          {rcStep === 3 && (
            <div className="space-y-4">
              <div className="inset" style={{ padding: '15px 18px' }}>
                <p className="lbl b10" style={{ color: 'var(--amber)' }}>REVIEW YOUR RULE</p>
                <div style={{ marginTop: 8 }}>
                  <div className="mrow">
                    <span className="lb" style={{ marginLeft: 0 }}>Category</span>
                    <span className="val">{rcCategory}</span>
                  </div>
                  <div className="mrow">
                    <span className="lb" style={{ marginLeft: 0 }}>Rule Type</span>
                    <span className="val">{rcRuleType}</span>
                  </div>
                  <div className="mrow">
                    <span className="lb" style={{ marginLeft: 0 }}>Name</span>
                    <span className="val">{rcCustomRule || rcRuleType}</span>
                  </div>
                  {rcDescription && (
                    <div style={{ marginTop: 14 }}>
                      <p className="lbl">DESCRIPTION</p>
                      <p style={{ margin: '9px 0 0', fontSize: 11.5, lineHeight: '17px', color: 'var(--muted-2)' }}>{rcDescription}</p>
                    </div>
                  )}
                </div>
              </div>
              <div className="inset" style={{ position: 'relative', padding: '13px 16px' }}>
                <span className="accent" style={{ position: 'absolute', left: 0, top: -1, width: 30, height: 3, background: 'var(--green)' }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <CheckCircle size={14} style={{ color: 'var(--green)' }} />
                  <p style={{ margin: 0, fontWeight: 700, fontSize: 12.5, color: 'var(--green)' }}>Ready to Create</p>
                </div>
                <p style={{ margin: '8px 0 0', fontSize: 11.5, color: 'var(--muted-2)' }}>
                  This rule will be added to {strategies.length > 0 ? `"${strategies[0].name}"` : 'a new rule set'}.
                </p>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex justify-between mt-6 pt-4" style={{ borderTop: '1px solid var(--line)' }}>
            <button onClick={() => rcStep > 1 ? setRcStep((rcStep - 1) as RuleComposerStep) : setRuleComposerOpen(false)} className="btn-g">
              <ArrowLeft size={14} /> {rcStep === 1 ? 'Cancel' : 'Back'}
            </button>
            {rcStep < 3 ? (
              <button onClick={() => setRcStep((rcStep + 1) as RuleComposerStep)}
                disabled={rcStep === 1 && !rcRuleType}
                className="btn-a" style={rcStep === 1 && !rcRuleType ? { opacity: .5 } : undefined}>
                Continue <CaretRight size={14} />
              </button>
            ) : (
              <button onClick={saveRule} className="btn-a" style={{ background: 'var(--green)' }}>
                <Plus size={14} /> Create Rule
              </button>
            )}
          </div>
        </div>
      </Modal>

      {/* â•â•â•â•â•â•â•â•â•â• RULE SET TEMPLATE COMPOSER â•â•â•â•â•â•â•â•â•â• */}
      <Modal isOpen={ruleSetComposerOpen} onClose={() => setRuleSetComposerOpen(false)} title="Template Composer — Rule Set" size="xl">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main area (2/3) */}
          <div className="lg:col-span-2 space-y-5">
            {/* Step indicator */}
            <div className="tabs" style={{ marginBottom: 0 }}>
              {[1, 2].map(s => (
                <button key={s} onClick={() => s === 1 && setRsStep(1)} className={rsStep === s ? 'on' : undefined}>
                  {s === 1 ? 'Step 1: Template Identity' : 'Step 2: Select Rules'}
                </button>
              ))}
            </div>

            {rsStep === 1 && (
              <div className="space-y-4">
                <div className="field">
                  <label>TEMPLATE NAME</label>
                  <input value={rsName} onChange={e => setRsName(e.target.value)} placeholder="e.g. Drawdown Recovery Protocol" className="box w-full" />
                </div>
                <div className="field">
                  <label>DESCRIPTION</label>
                  <textarea value={rsDescription} onChange={e => setRsDescription(e.target.value)} placeholder="Describe what this rule set is designed to do..." rows={4} className="box w-full" style={{ height: 'auto', padding: '11px 14px' }} />
                </div>
                <button onClick={() => setRsStep(2)} disabled={!rsName.trim()} className="btn-a" style={!rsName.trim() ? { opacity: .5 } : undefined}>
                  Next: Select Rules <CaretRight size={14} />
                </button>
              </div>
            )}

            {rsStep === 2 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <MagnifyingGlass size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted-3)' }} />
                    <input value={rsSearch} onChange={e => setRsSearch(e.target.value)} placeholder="Search rules..." className="box w-full" style={{ paddingLeft: 34 }} />
                  </div>
                  <button onClick={() => setRsSelectedRules(allRuleStrings)} className="btn-g" style={{ height: 42, fontSize: 12 }}>Select All</button>
                  <button onClick={() => setRsSelectedRules([])} className="btn-g" style={{ height: 42, fontSize: 12 }}>Clear</button>
                </div>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {allRuleStrings
                    .filter(r => !rsSearch || r.toLowerCase().includes(rsSearch.toLowerCase()))
                    .map(rule => {
                      const selected = rsSelectedRules.includes(rule);
                      return (
                        <button key={rule} onClick={() => setRsSelectedRules(prev => selected ? prev.filter(r => r !== rule) : [...prev, rule])}
                          className="inset" style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left', padding: '11px 14px', borderColor: selected ? 'var(--amber)' : 'var(--line)' }}>
                          <span style={{ width: 16, height: 16, flex: 'none', borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${selected ? 'var(--amber)' : 'var(--muted-3)'}`, background: selected ? 'var(--amber)' : 'transparent' }}>
                            {selected && <Check size={11} style={{ color: 'var(--ink)' }} />}
                          </span>
                          <span style={{ minWidth: 0, fontSize: 12, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{rule}</span>
                          {selected && <span style={{ marginLeft: 'auto', flex: 'none', fontWeight: 700, fontSize: 9, letterSpacing: '.04em', color: 'var(--amber)' }}>SELECTED</span>}
                        </button>
                      );
                    })}
                  {allRuleStrings.length === 0 && (
                    <div className="empty-line">No rules found. Create rules first using the Rule Composer.</div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Right sidebar */}
          <div className="space-y-4">
            <div className="inset" style={{ padding: '15px 16px' }}>
              <p className="lbl b10">SELECTED RULES</p>
              {rsSelectedRules.length === 0 ? (
                <p style={{ margin: '12px 0 0', fontSize: 11.5, color: 'var(--muted)' }}>No rules selected yet.</p>
              ) : (
                <div style={{ marginTop: 8 }}>
                  {rsSelectedRules.map((r, i) => (
                    <div key={i} className="mrow">
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginRight: 8 }}>{r}</span>
                      <button onClick={() => setRsSelectedRules(prev => prev.filter(x => x !== r))} style={{ marginLeft: 'auto', flex: 'none', color: 'var(--muted-3)' }}><X size={12} /></button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="inset" style={{ padding: '15px 16px' }}>
              <p className="lbl b10">QUALITY CHECKLIST</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 9, marginTop: 12 }}>
                {[
                  { label: 'Template named', ok: !!rsName.trim() },
                  { label: 'At least 1 rule', ok: rsSelectedRules.length >= 1 },
                  { label: '3+ rules (recommended)', ok: rsSelectedRules.length >= 3 },
                ].map((c, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 9, fontSize: 11.5 }}>
                    {c.ok ? <Check size={12} style={{ color: 'var(--green)', flex: 'none' }} /> : <Circle size={12} style={{ color: 'var(--muted-3)', flex: 'none' }} />}
                    <span style={{ color: c.ok ? 'var(--green)' : 'var(--muted-2)' }}>{c.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-between mt-6 pt-4" style={{ borderTop: '1px solid var(--line)' }}>
          <button onClick={() => rsStep === 1 ? setRuleSetComposerOpen(false) : setRsStep(1)} className="btn-g">
            <ArrowLeft size={14} /> {rsStep === 1 ? 'Cancel' : 'Back'}
          </button>
          {rsStep === 1 ? (
            <button onClick={() => setRsStep(2)} disabled={!rsName.trim()} className="btn-a" style={!rsName.trim() ? { opacity: .5 } : undefined}>
              Next <CaretRight size={14} />
            </button>
          ) : (
            <button onClick={saveRuleSet} disabled={!rsName.trim() || rsSelectedRules.length === 0}
              className="btn-a" style={(!rsName.trim() || rsSelectedRules.length === 0) ? { background: 'var(--green)', opacity: .5 } : { background: 'var(--green)' }}>
              <Plus size={14} /> Create Rule Set
            </button>
          )}
        </div>
      </Modal>

      {/* â•â•â•â•â•â•â•â•â•â• STRATEGY TEMPLATE COMPOSER â•â•â•â•â•â•â•â•â•â• */}
      <Modal isOpen={stratComposerOpen} onClose={() => setStratComposerOpen(false)} title="" size="xl">
        <div>
          {/* Header badge */}
          <p className="eyebrow" style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '0 0 14px', fontSize: 12, color: '#c3cdda' }}>
            <Sparkle size={13} style={{ color: 'var(--amber)' }} /> Template Composer
          </p>
          <h3 style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: 24, lineHeight: '28px', margin: 0, color: 'var(--text)' }}>Create Strategy Template</h3>
          <p className="sub" style={{ margin: '10px 0 24px' }}>Design manual execution sequences with ordered text steps.</p>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* Left: form (3/5) */}
            <div className="lg:col-span-3 space-y-6">
              {/* Step 1: Template Identity */}
              <div className="card" style={{ padding: '19px 22px 20px' }}>
                <span className="accent" style={{ width: 44, background: 'var(--green)' }} />
                <p className="lbl b10" style={{ color: 'var(--green)', marginBottom: 16 }}>STEP 1 &middot; TEMPLATE IDENTITY</p>
                <div className="space-y-4">
                  <div className="field">
                    <label>TEMPLATE NAME</label>
                    <input value={scName} onChange={e => setScName(e.target.value)} placeholder="e.g. Breakout Momentum Play" className="box w-full" />
                  </div>
                  <div className="field">
                    <label>DESCRIPTION (OPTIONAL)</label>
                    <textarea value={scDescription} onChange={e => setScDescription(e.target.value)} placeholder="Describe your strategy approach..." rows={3} className="box w-full" style={{ height: 'auto', padding: '11px 14px' }} />
                  </div>
                </div>
              </div>

              {/* Step 2: Build Strategy Steps */}
              <div className="card" style={{ padding: '19px 22px 20px' }}>
                <span className="accent" style={{ width: 44, background: 'var(--amber)' }} />
                <p className="lbl b10" style={{ color: 'var(--amber)', marginBottom: 16 }}>STEP 2 &middot; BUILD STRATEGY STEPS</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                  <p className="lbl">ORDERED EXECUTION LIST</p>
                  <span className="chip" style={{ marginLeft: 'auto', height: 20, padding: '0 9px', fontSize: 9, fontWeight: 700, color: 'var(--amber)' }}>{scSteps.length} STEP{scSteps.length !== 1 ? 'S' : ''}</span>
                </div>

                {/* Input + Add button */}
                <div className="flex gap-2 mb-4">
                  <input value={scStepInput} onChange={e => setScStepInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addScStep(); } }}
                    placeholder="Example: Wait for A+ setup confirmation before opening" className="box flex-1" />
                  <button onClick={addScStep} disabled={!scStepInput.trim()}
                    className="btn-g" style={!scStepInput.trim() ? { height: 42, flex: 'none', opacity: .5 } : { height: 42, flex: 'none' }}>
                    <Plus size={14} /> Add
                  </button>
                </div>

                {/* Added steps as cards */}
                {scSteps.length > 0 && (
                  <div className="space-y-2">
                    {scSteps.map((step, i) => (
                      <div key={i} className="inset" style={{ padding: '11px 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                          <ChartBar size={12} style={{ color: 'var(--muted-3)', transform: 'rotate(90deg)', cursor: 'grab' }} />
                          <p className="lbl">STEP {i + 1}</p>
                          <button onClick={() => setScSteps(prev => prev.filter((_, idx) => idx !== i))}
                            style={{ marginLeft: 'auto', flex: 'none', fontWeight: 700, fontSize: 9.5, letterSpacing: '.04em', color: 'var(--red)' }}>
                            REMOVE
                          </button>
                        </div>
                        <textarea value={step} onChange={e => setScSteps(prev => prev.map((s, idx) => idx === i ? e.target.value : s))}
                          rows={2} className="box w-full" style={{ height: 'auto', padding: '10px 12px', marginTop: 10, fontSize: 12 }} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Right sidebar (2/5) */}
            <div className="lg:col-span-2 space-y-4">
              {/* Strategy Sequence Preview */}
              <div className="card" style={{ padding: '19px 22px 20px' }}>
                <span className="accent" style={{ width: 44, background: 'var(--amber)' }} />
                <p className="lbl b10">STRATEGY SEQUENCE PREVIEW</p>
                {scSteps.length === 0 ? (
                  <p style={{ margin: '12px 0 0', fontSize: 11.5, color: 'var(--muted)' }}>No steps added yet. Type a step and click Add.</p>
                ) : (
                  <div className="klist num">
                    {scSteps.map((step, i) => (
                      <div key={i}><b>{i + 1}</b><span>{step}</span></div>
                    ))}
                  </div>
                )}
              </div>

              {/* Quality Checklist */}
              <div className="card" style={{ padding: '19px 22px 20px' }}>
                <span className="accent" style={{ width: 44, background: 'var(--amber)' }} />
                <p className="lbl b10">QUALITY CHECKLIST</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 12 }}>
                  {[
                    { label: '1. Name by scenario, not by indicator.', ok: !!scName.trim() },
                    { label: '2. Keep each step action-oriented and unambiguous.', ok: scSteps.length > 0 },
                    { label: '3. Keep step order realistic for live execution.', ok: scSteps.length >= 2 },
                  ].map((c, i) => (
                    <p key={i} style={{ margin: 0, fontSize: 11.5, lineHeight: '17px', color: c.ok ? 'var(--text)' : 'var(--muted-2)' }}>{c.label}</p>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 mt-6 pt-4" style={{ borderTop: '1px solid var(--line)' }}>
            <button onClick={() => setStratComposerOpen(false)} className="btn-g">Cancel</button>
            <button onClick={saveStratComposer} disabled={!scName.trim() || scSteps.length === 0}
              className="btn-a" style={(!scName.trim() || scSteps.length === 0) ? { opacity: .5 } : undefined}>
              Create Strategy
            </button>
          </div>
        </div>
      </Modal>

      {/* â•â•â•â•â•â•â•â•â•â• ACTIVATION MIXER â•â•â•â•â•â•â•â•â•â• */}
      <Modal isOpen={activationMixerOpen} onClose={() => setActivationMixerOpen(false)} title="" size="xl">
        <div>
          {/* Header badge */}
          <p className="eyebrow" style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '0 0 14px', fontSize: 12, color: '#c3cdda' }}>
            <Lightning size={13} style={{ color: 'var(--amber)' }} /> Activation Mixer
          </p>
          <h3 style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: 24, lineHeight: '28px', margin: 0, color: 'var(--text)' }}>Add Templates</h3>
          <p className="sub" style={{ margin: '10px 0 24px' }}>Select one or more templates, then set priorities per item or in bulk.</p>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: template list (2/3) */}
            <div className="lg:col-span-2 space-y-4">
              {/* Search + bulk actions */}
              <div className="card" style={{ padding: '19px 22px 20px' }}>
                <div className="flex items-center justify-end gap-2 mb-3">
                  <button onClick={() => { const visible = strategies.filter(s => !amSearch || s.name.toLowerCase().includes(amSearch.toLowerCase())); setAmSelected(visible.map(s => s.id)); }}
                    className="btn-g" style={{ height: 32, padding: '0 14px', fontSize: 12 }}>Select Visible</button>
                  <button onClick={() => setAmSelected([])} className="btn-g" style={{ height: 32, padding: '0 14px', fontSize: 12 }}>Clear</button>
                </div>
                <div className="relative">
                  <MagnifyingGlass size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted-3)' }} />
                  <input value={amSearch} onChange={e => setAmSearch(e.target.value)} placeholder="Search templates by name or description..." className="box w-full" style={{ paddingLeft: 34 }} />
                </div>
              </div>

              {/* Template cards */}
              <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                {strategies
                  .filter(s => !amSearch || s.name.toLowerCase().includes(amSearch.toLowerCase()))
                  .map(strategy => {
                    const selected = amSelected.includes(strategy.id);
                    const itemPriority = amItemPriorities[strategy.id] ?? 'P2';
                    return (
                      <div key={strategy.id} className="inset" style={{ padding: '13px 16px', borderColor: selected ? 'var(--amber)' : 'var(--line)' }}>
                        <div className="flex items-start gap-3">
                          {/* Checkbox */}
                          <button onClick={() => setAmSelected(prev => selected ? prev.filter(id => id !== strategy.id) : [...prev, strategy.id])}
                            style={{ marginTop: 3, width: 16, height: 16, flex: 'none', borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${selected ? 'var(--amber)' : 'var(--muted-3)'}`, background: selected ? 'var(--amber)' : 'transparent' }}>
                            {selected && <Check size={11} style={{ color: 'var(--ink)' }} />}
                          </button>
                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p style={{ margin: 0, fontWeight: 700, fontSize: 12.5, color: 'var(--text)' }}>{strategy.name}</p>
                              <span className="chip" style={{ height: 20, padding: '0 9px', fontSize: 9, fontWeight: 700, color: 'var(--amber)' }}>RULESET</span>
                              {selected && <span className="chip" style={{ height: 20, padding: '0 9px', fontSize: 9, fontWeight: 700, color: 'var(--green)' }}>ACTIVE</span>}
                              {!selected && <span className="chip" style={{ height: 20, padding: '0 9px', fontSize: 9, fontWeight: 700, color: 'var(--muted-2)' }}>SAVED</span>}
                            </div>
                            <p className="sub" style={{ margin: '8px 0 0' }}>{getStrategyDescription(strategy)}</p>
                            {/* Per-item priority */}
                            <div className="flex gap-1.5" style={{ marginTop: 10 }}>
                              {(['P1', 'P2', 'P3'] as const).map(p => (
                                <button key={p}
                                  onClick={() => setAmItemPriorities(prev => ({ ...prev, [strategy.id]: p }))}
                                  className={`chip${itemPriority === p ? ' on' : ''}`}
                                  style={{ height: 22, padding: '0 11px', fontSize: 10, fontWeight: 700 }}>{p}</button>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                {strategies.length === 0 && (
                  <div className="empty-line">No templates available. Create a rule set or strategy first.</div>
                )}
              </div>
            </div>

            {/* Right sidebar (1/3) */}
            <div className="space-y-4">
              {/* Selection count */}
              <div className="card" style={{ padding: '19px 22px 20px' }}>
                <span className="accent" style={{ width: 44, background: 'var(--amber)' }} />
                <p className="lbl b10">SELECTION</p>
                <p style={{ margin: '10px 0 0', fontFamily: 'var(--mono)', fontWeight: 500, fontSize: 26, lineHeight: '34px', color: 'var(--text)' }}>{amSelected.length}</p>
                <p style={{ margin: '4px 0 0', fontSize: 11, color: 'var(--muted-2)' }}>templates selected</p>
              </div>

              {/* Global Priority */}
              <div className="card" style={{ padding: '19px 22px 20px' }}>
                <span className="accent" style={{ width: 44, background: 'var(--amber)' }} />
                <p className="lbl b10">GLOBAL PRIORITY</p>
                <div className="flex gap-1.5" style={{ marginTop: 12, marginBottom: 14 }}>
                  {(['High', 'Medium', 'Low'] as ActivationPriority[]).map(p => (
                    <button key={p} onClick={() => setAmPriority(p)}
                      className="chip" style={{
                        flex: 1, justifyContent: 'center', height: 30, padding: '0 8px', fontSize: 10.5, fontWeight: 700,
                        borderColor: amPriority === p ? (p === 'High' ? 'var(--red)' : p === 'Medium' ? 'var(--amber)' : 'var(--muted)') : 'var(--line)',
                        color: amPriority === p ? (p === 'High' ? 'var(--red)' : p === 'Medium' ? 'var(--amber)' : 'var(--muted)') : 'var(--muted-2)',
                      }}>{p} priority</button>
                  ))}
                </div>
                <button onClick={applyGlobalPriority} className="viewall" style={{ marginLeft: 0, fontSize: 12 }}>
                  <CaretDown size={12} /> Apply Global Priority To Selected
                </button>
              </div>

              {/* Selected Items */}
              <div className="card" style={{ padding: '19px 22px 20px' }}>
                <span className="accent" style={{ width: 44, background: 'var(--green)' }} />
                <p className="lbl b10">SELECTED ITEMS</p>
                {amSelected.length === 0 ? (
                  <p style={{ margin: '12px 0 0', fontSize: 11.5, color: 'var(--muted)' }}>No templates selected.</p>
                ) : (
                  <div style={{ marginTop: 8 }}>
                    {amSelected.map(id => {
                      const s = strategies.find(st => st.id === id);
                      if (!s) return null;
                      const p = amItemPriorities[id] ?? 'P2';
                      return (
                        <div key={id} className="mrow">
                          <div style={{ minWidth: 0, marginRight: 8 }}>
                            <div style={{ fontWeight: 700, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</div>
                            <div style={{ fontSize: 10, color: 'var(--muted-2)', marginTop: 3 }}>{getStrategyDescription(s)}</div>
                          </div>
                          <span className="val" style={{ color: 'var(--amber)' }}>{p}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-between mt-6 pt-4" style={{ borderTop: '1px solid var(--line)' }}>
            <button onClick={() => setActivationMixerOpen(false)} className="btn-g">Cancel</button>
            <button onClick={handleActivate} disabled={amSelected.length === 0}
              className="btn-a" style={amSelected.length === 0 ? { background: 'var(--green)', opacity: .5 } : { background: 'var(--green)' }}>
              <Lightning size={14} /> Activate {amSelected.length > 0 ? `(${amSelected.length})` : ''}
            </button>
          </div>
        </div>
      </Modal>

      {/* â•â•â•â•â•â•â•â•â•â• ACTIVE RULESET DETAILS MODAL â•â•â•â•â•â•â•â•â•â• */}
      <Modal isOpen={!!detailsStrategyId} onClose={() => setDetailsStrategyId(null)} title="" size="xl">
        {(() => {
          const strategy = strategies.find(s => s.id === detailsStrategyId);
          if (!strategy) return null;
          const ss = metrics.stratStats.find(s => s.id === strategy.id);
          const sTrades = ss?.trades ?? [];
          const totalRules = strategy.rules.length;
          const ruleBreakdown = strategy.rules.filter(r => r.trim()).map(rule => {
            const matching = sTrades.filter(t => t.ruleChecklist.some(rc => rc.rule === rule));
            const met = matching.filter(t => t.ruleChecklist.find(rc => rc.rule === rule)?.compliance !== 'no').length;
            const violations = matching.length - met;
            const lastHit = matching.length > 0
              ? format(new Date(matching[matching.length - 1].exitDate ?? matching[matching.length - 1].createdAt), 'MM/dd/yyyy')
              : 'Never';
            return { rule, total: matching.length, met, violations, compliance: matching.length > 0 ? Math.round((met / matching.length) * 100) : 100, lastHit };
          });
          const metRules = ruleBreakdown.filter(r => r.compliance >= 80).length;
          const compliancePct = ss?.compliance ?? 100;
          const violationCount = sTrades.filter(t => t.ruleChecklist.some(r => r.compliance === 'no')).length;
          const healthPct = totalRules > 0 ? Math.round((metRules / totalRules) * 100) : 100;
          // Evidence: trades that violated rules in this strategy
          const evidenceTrades = sTrades.filter(t => t.ruleChecklist.some(rc => rc.compliance === 'no'));

          return (
            <div>
              {/* Header badge */}
              <p className="eyebrow" style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '0 0 14px', fontSize: 12, color: '#c3cdda' }}>
                <Stack size={13} style={{ color: 'var(--amber)' }} /> Active Ruleset
              </p>
              <h3 style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: 24, lineHeight: '28px', margin: 0, color: 'var(--text)' }}>{strategy.name}</h3>
              <p className="sub" style={{ margin: '10px 0 0' }}>{getStrategyDescription(strategy)}</p>

              {/* Progress bar */}
              <div style={{ height: 2, margin: '20px 0 24px', background: 'var(--rail)', position: 'relative' }}>
                <div className="transition-all duration-500" style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${compliancePct}%`, background: compliancePct >= 80 ? 'var(--green)' : compliancePct >= 50 ? 'var(--amber)' : 'var(--red)' }} />
              </div>

              {/* 4 Stat Cards */}
              <div className="stats" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', marginTop: 0, marginBottom: 24 }}>
                <div className="stat" style={{ height: 'auto', minHeight: 96 }}>
                  <span className="accent" style={{ background: 'var(--amber)' }} />
                  <b>COMPLIANCE</b>
                  <em style={{ color: 'var(--text)' }}>{compliancePct}%</em>
                </div>
                <div className="stat" style={{ height: 'auto', minHeight: 96 }}>
                  <span className="accent" style={{ background: 'var(--amber)' }} />
                  <b>RULES MET</b>
                  <em style={{ color: 'var(--text)' }}>{metRules}/{totalRules}</em>
                </div>
                <div className="stat" style={{ height: 'auto', minHeight: 96 }}>
                  <span className="accent" style={{ background: 'var(--red)' }} />
                  <b>VIOLATIONS</b>
                  <em style={{ color: 'var(--text)' }}>{violationCount}</em>
                </div>
                <div className="stat" style={{ height: 'auto', minHeight: 96 }}>
                  <span className="accent" style={{ background: 'var(--green)' }} />
                  <b>HEALTH</b>
                  <em style={{ color: 'var(--text)' }}>{healthPct}%</em>
                </div>
              </div>

              {/* Ruleset Priority */}
              <div className="card" style={{ padding: '19px 22px 20px', marginBottom: 24 }}>
                <span className="accent" style={{ width: 44, background: 'var(--green)' }} />
                <p className="lbl b10" style={{ color: 'var(--green)' }}>RULESET PRIORITY</p>
                <div className="flex gap-2" style={{ marginTop: 12, flexWrap: 'wrap' }}>
                  {(['High', 'Medium', 'Low'] as const).map(p => (
                    <button key={p} className={`chip${p === 'Medium' ? ' on' : ''}`}>{p} priority</button>
                  ))}
                </div>
              </div>

              {/* Tracking Start */}
              <div className="card" style={{ padding: '19px 22px 20px', marginBottom: 24 }}>
                <span className="accent" style={{ width: 44, background: 'var(--amber)' }} />
                <p className="lbl b10">TRACKING START</p>
                <div className="flex items-center gap-3" style={{ marginTop: 12, flexWrap: 'wrap' }}>
                  <input type="datetime-local" defaultValue={format(new Date(strategy.createdAt), "yyyy-MM-dd'T'HH:mm")} className="box" />
                  <button className="btn-a">Save Start</button>
                </div>
                <p className="footnote" style={{ textAlign: 'left', marginTop: 12 }}>Evidence and compliance are tracked from this timestamp forward.</p>
              </div>

              {/* Per Rule Performance + Evidence Library */}
              <div className="split" style={{ marginBottom: 24, gap: 20 }}>
                {/* Per Rule Performance */}
                <div className="card" style={{ padding: '19px 22px 20px' }}>
                  <span className="accent" style={{ width: 44, background: 'var(--green)' }} />
                  <p className="lbl b10" style={{ color: 'var(--green)' }}>PER RULE PERFORMANCE</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 16 }}>
                    {ruleBreakdown.map((rb, i) => {
                      const status = rb.compliance >= 80 ? 'ON TRACK' : rb.compliance >= 50 ? 'BUILDING' : 'AT RISK';
                      const statusColor = status === 'ON TRACK' ? 'var(--green)' : status === 'BUILDING' ? 'var(--amber)' : 'var(--red)';
                      return (
                        <div key={i} className="inset" style={{ position: 'relative', padding: '13px 16px' }}>
                          <span className="accent" style={{ position: 'absolute', left: 0, top: -1, width: 30, height: 3, background: statusColor }} />
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <p style={{ margin: 0, fontWeight: 700, fontSize: 12.5, color: 'var(--text)' }}>{rb.rule.length > 35 ? rb.rule.slice(0, 35) + '...' : rb.rule}</p>
                            <span style={{ marginLeft: 'auto', flex: 'none', fontWeight: 700, fontSize: 9, letterSpacing: '.04em', color: statusColor }}>{status}</span>
                          </div>
                          <p style={{ margin: '8px 0 0', fontSize: 10.5, color: 'var(--muted-2)' }}>
                            {rb.compliance}% compliance &middot; {rb.violations} violations &middot; Last: {rb.lastHit}
                          </p>
                          <div className="flex gap-1.5" style={{ marginTop: 10, flexWrap: 'wrap' }}>
                            <span className="chip" style={{ height: 20, padding: '0 9px', fontSize: 9.5, color: 'var(--muted-2)' }}>Evidence: {rb.total - rb.met}</span>
                            {(['P1', 'P2', 'P3'] as const).map(p => (
                              <span key={p} className={`chip${p === 'P2' ? ' on' : ''}`} style={{ height: 20, padding: '0 9px', fontSize: 9.5, fontWeight: 700 }}>{p}</span>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                    {ruleBreakdown.length === 0 && (
                      <p style={{ margin: 0, fontSize: 11.5, color: 'var(--muted)' }}>No rules defined in this strategy.</p>
                    )}
                  </div>
                </div>

                {/* Evidence Library */}
                <div className="card" style={{ padding: '19px 22px 20px' }}>
                  <span className="accent" style={{ width: 44, background: 'var(--red)' }} />
                  <p className="lbl b10">EVIDENCE LIBRARY</p>
                  {evidenceTrades.length === 0 ? (
                    <p style={{ margin: '14px 0 0', fontSize: 11.5, color: 'var(--muted)' }}>No violations recorded. Clean compliance!</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 16 }}>
                      {evidenceTrades.slice(0, 5).map(trade => {
                        const brokenRules = trade.ruleChecklist.filter(rc => rc.compliance === 'no').map(rc => rc.rule);
                        return (
                          <div key={trade.id} className="inset" style={{ padding: '13px 16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <p style={{ margin: 0, fontWeight: 700, fontSize: 12.5, color: 'var(--text)' }}>{brokenRules[0] || 'Rule violation'}</p>
                              <span style={{ marginLeft: 'auto', flex: 'none', fontSize: 10, color: 'var(--muted-2)' }}>{format(new Date(trade.exitDate ?? trade.createdAt), 'MM/dd/yyyy')}</span>
                            </div>
                            <p style={{ margin: '8px 0 0', fontSize: 11, color: 'var(--muted-2)' }}>
                              {trade.coin} &middot; {trade.actualPnL !== null ? formatCurrency(trade.actualPnL) : 'Open'} &middot; {trade.strategy}
                            </p>
                            <div className="flex gap-1.5" style={{ marginTop: 10, flexWrap: 'wrap' }}>
                              {brokenRules.map((r, j) => (
                                <span key={j} className="chip" style={{ height: 20, padding: '0 9px', fontSize: 9.5, color: 'var(--red)', borderColor: 'rgba(255,77,94,.3)' }}>{r.length > 20 ? r.slice(0, 20) + '...' : r}</span>
                              ))}
                            </div>
                            <p style={{ margin: '8px 0 0', fontSize: 10, color: 'var(--muted-3)' }}>Trade: {trade.id}</p>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="flex justify-end gap-3 pt-4" style={{ borderTop: '1px solid var(--line)' }}>
                <button onClick={() => { setDetailsStrategyId(null); scrollToSection('Rules Library'); }} className="btn-a">
                  Open Rules Library
                </button>
                <button onClick={() => setDetailsStrategyId(null)} className="btn-g">Close</button>
              </div>
            </div>
          );
        })()}
      </Modal>
    </div>
  );
}
