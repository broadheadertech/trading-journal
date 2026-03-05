'use client';

import { useState, useMemo, useRef } from 'react';
import { Strategy, StrategyType, Trade } from '@/lib/types';
import { STRATEGY_TYPES, getDisciplineScore } from '@/lib/utils';
import { useCurrency } from '@/hooks/useCurrency';
import {
  Plus, Edit2, Trash2, X, ChevronDown, ChevronUp, AlertTriangle,
  Shield, Sparkles, Zap, BookOpen, Target, Clock, BarChart3,
  CheckCircle2, Circle, ArrowRight, ArrowLeft, Search, ToggleLeft, ToggleRight,
  ChevronRight, Layers, FileText, Check,
} from 'lucide-react';
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
    <div>
      <label className="block text-sm font-medium text-[var(--foreground)] mb-2">{label}</label>
      <div className="space-y-2">
        {form[field].map((item, i) => (
          <div key={i} className="flex gap-2">
            <input value={item} onChange={e => updateListItem(field, i, e.target.value)} placeholder={`${label} item ${i + 1}`} className="flex-1" />
            {form[field].length > 1 && (
              <button onClick={() => removeListItem(field, i)} className="p-2 text-[var(--red)] hover:bg-red-500/10 rounded-lg"><X size={16} /></button>
            )}
          </div>
        ))}
        <button onClick={() => addListItem(field)} className="text-sm text-[var(--accent)] hover:underline flex items-center gap-1"><Plus size={14} /> Add item</button>
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
    <div className="space-y-6">

      {/* ── Hero Section ── */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-6">
        <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/10 text-[10px] font-semibold uppercase tracking-widest text-green-400 mb-4">
              <Shield size={12} /> Playbook Operating System
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold mb-3">Run your process like a system, not a mood.</h1>
            <p className="text-[var(--muted-foreground)] text-sm max-w-2xl">
              Use this page in order: execute top fixes, enforce guardrails, and track compliance drift. Every panel is synced to the selected account and period.
            </p>
          </div>
          <div className="flex gap-2 shrink-0 flex-wrap">
            <button onClick={openRuleComposer}
              className="flex items-center gap-2 px-4 py-2.5 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white rounded-lg text-sm font-medium transition-colors">
              <Plus size={14} /> Create Rule
            </button>
            <button onClick={openRuleSetComposer}
              disabled={usage.strategies.isAtLimit}
              className="flex items-center gap-2 px-4 py-2.5 bg-[var(--muted)] hover:bg-[var(--muted)]/80 border border-[var(--border)] rounded-lg text-sm font-medium transition-colors disabled:opacity-50">
              <Layers size={14} /> Create Ruleset
            </button>
            <button onClick={openStratComposer}
              disabled={usage.strategies.isAtLimit}
              className="flex items-center gap-2 px-4 py-2.5 bg-[var(--muted)] hover:bg-[var(--muted)]/80 border border-[var(--border)] rounded-lg text-sm font-medium transition-colors disabled:opacity-50">
              <FileText size={14} /> Create Strategy
            </button>
            <button onClick={openActivationMixer}
              className="flex items-center gap-2 px-4 py-2.5 bg-green-500/10 hover:bg-green-500/20 border border-green-500/30 text-green-400 rounded-lg text-sm font-medium transition-colors">
              <Zap size={14} /> Activate Set
            </button>
          </div>
        </div>

        {/* Usage indicator */}
        {!usage.strategies.isUnlimited && (
          <div className="max-w-xs mb-4">
            <UsageBar label="Strategies" current={usage.strategies.current} max={usage.strategies.max} isUnlimited={false} />
          </div>
        )}
      </div>

      {/* ── 4 Stat Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--muted-foreground)] mb-1">Rules Active</p>
          <div className="flex items-baseline gap-2">
            <p className="text-2xl sm:text-3xl font-bold">{strategies.reduce((s, st) => s + st.rules.length, 0)}</p>
            <p className="text-xs text-[var(--muted-foreground)]">engine armed</p>
          </div>
        </div>
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--muted-foreground)] mb-1">Compliance</p>
          <div className="flex items-baseline gap-2">
            <p className={`text-2xl sm:text-3xl font-bold ${metrics.compliance >= 80 ? 'text-green-400' : metrics.compliance >= 60 ? 'text-yellow-400' : 'text-red-400'}`}>{metrics.compliance}%</p>
            <p className="text-xs text-[var(--muted-foreground)]">{metrics.violations} violations</p>
          </div>
        </div>
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--muted-foreground)] mb-1">Period Net P&L</p>
          <div className="flex items-baseline gap-2">
            <p className={`text-2xl sm:text-3xl font-bold ${metrics.netPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>{formatCurrency(metrics.netPnL)}</p>
            <p className="text-xs text-[var(--muted-foreground)]">{metrics.total} trades</p>
          </div>
        </div>
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--muted-foreground)] mb-1">Recoverable in Range</p>
          <div className="flex items-baseline gap-2">
            <p className="text-2xl sm:text-3xl font-bold text-green-400">{formatCurrency(metrics.recoverable)}</p>
            <p className="text-xs text-[var(--muted-foreground)]">selected period</p>
          </div>
        </div>
      </div>

      {/* ── How to Run + Advices ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-[var(--card)] border border-[var(--accent)]/30 rounded-xl p-5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--accent)]/10 text-[10px] font-semibold uppercase tracking-widest text-[var(--accent)] mb-4">
            <Zap size={12} /> How to Run This Page
          </div>
          <div className="space-y-2">
            {['Create your core trading rules.', 'Combine those rules into a reusable rule-set template.', 'Activate your rule set and run it live.'].map((step, i) => (
              <div key={i} className="bg-[var(--muted)] rounded-lg px-4 py-3 text-sm">
                {i + 1}. {step}
              </div>
            ))}
          </div>
        </div>
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--accent)]/10 text-[10px] font-semibold uppercase tracking-widest text-[var(--accent)] mb-4">
            <Sparkles size={12} /> Advices
          </div>
          <div className="space-y-2">
            {['Execute active rule set for 5-7 sessions before changing plan.', 'Keep compliance above 80% so rule impact compounds.', 'Review results and adjust rules and rule sets.'].map((tip, i) => (
              <div key={i} className="bg-[var(--muted)] rounded-lg px-4 py-3 text-sm">
                {i + 1}. {tip}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Sub-section Navigation ── */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {SUB_SECTIONS.map(s => (
          <button key={s.key} onClick={() => scrollToSection(s.key)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--card)] border border-[var(--border)] hover:border-[var(--accent)]/30 transition-colors whitespace-nowrap text-sm">
            {s.key === 'Active Rule Sets' && <Sparkles size={14} className="text-[var(--accent)]" />}
            {s.key === 'Playbook Library' && <BookOpen size={14} className="text-[var(--muted-foreground)]" />}
            {s.key === 'Rules Library' && <Circle size={14} className="text-[var(--muted-foreground)]" />}
            {s.key === 'Weekly Focus' && <Target size={14} className="text-[var(--muted-foreground)]" />}
            {s.key === 'Impact' && <BarChart3 size={14} className="text-[var(--muted-foreground)]" />}
            <span className="font-medium">{s.label}</span>
            <span className="text-[var(--muted-foreground)] text-xs hidden sm:inline">&middot; {s.desc}</span>
          </button>
        ))}
      </div>

      {/* ══════════ MAIN CONTENT + SIDEBAR ══════════ */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-4">

        {/* ── Main content (3 cols) ── */}
        <div className="xl:col-span-3 space-y-6">

          {/* ══════════ ACTIVE RULE SETS ══════════ */}
          <div ref={activeRuleSetsRef} className="scroll-mt-4">
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
                  <h2 className="text-xl font-bold">Active Rule Sets</h2>
                </div>
                <p className="text-xs text-[var(--muted-foreground)]">
                  Track active rule sets with live condition telemetry. Manual strategies are shown with ordered steps.
                </p>
              </div>

              {strategies.filter(s => activatedIds.has(s.id)).length === 0 ? (
                <div className="py-12 text-center">
                  <p className="text-[var(--muted-foreground)] text-sm mb-3">No active rule sets. Activate one from the Playbook Library.</p>
                  <button onClick={openActivationMixer} className="text-[var(--accent)] hover:underline text-sm">Activate a rule set</button>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
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
                    const progressColor = compliancePct >= 80 ? 'bg-green-400' : compliancePct >= 50 ? 'bg-cyan-400' : 'bg-red-400';
                    const progressTextColor = compliancePct >= 80 ? 'text-green-400' : compliancePct >= 50 ? 'text-cyan-400' : 'text-red-400';
                    const progressBadgeBg = compliancePct >= 80 ? 'bg-green-500/20' : compliancePct >= 50 ? 'bg-cyan-500/20' : 'bg-red-500/20';
                    const level = totalRules >= 5 ? 'ADVANCED' : totalRules >= 3 ? 'STARTER' : 'BASIC';
                    const levelColor = level === 'ADVANCED' ? 'bg-blue-500/20 text-cyan-400' : level === 'STARTER' ? 'bg-cyan-500/20 text-cyan-400' : 'bg-yellow-500/20 text-yellow-400';
                    // Leak / capture calculation
                    const poorLosses = sTrades.filter(t => t.verdict === 'Poorly Executed' && (t.actualPnL ?? 0) < 0);
                    const estLeak = poorLosses.reduce((s, t) => s + Math.abs(t.actualPnL ?? 0), 0);
                    const recoverable = estLeak * 0.24;
                    const capturedPnL = sTrades.filter(t => (t.actualPnL ?? 0) > 0).reduce((s, t) => s + (t.actualPnL ?? 0), 0);
                    const missedPnL = sTrades.filter(t => (t.actualPnL ?? 0) < 0).reduce((s, t) => s + Math.abs(t.actualPnL ?? 0), 0);
                    const capturePct = (capturedPnL + missedPnL) > 0 ? Math.round((capturedPnL / (capturedPnL + missedPnL)) * 100) : 0;
                    const impactingCount = poorLosses.length;

                    return (
                      <div key={strategy.id} className="bg-[var(--muted)] border border-[var(--border)] rounded-xl p-5 flex flex-col">
                        {/* Header: icon + STARTER badge */}
                        <div className="flex items-center justify-between mb-3">
                          <div className="p-2.5 rounded-xl bg-[var(--card)]"><Shield size={18} className="text-[var(--accent)]" /></div>
                          <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold ${levelColor}`}>{level}</span>
                        </div>

                        {/* LIVE TRACKING + Details */}
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] font-semibold uppercase tracking-widest text-green-400">Live Tracking</span>
                          <button onClick={() => setDetailsStrategyId(strategy.id)}
                            className="flex items-center gap-1 px-3 py-1 rounded-lg bg-[var(--card)] border border-[var(--border)] text-xs text-[var(--accent)] hover:border-[var(--accent)]/30">
                            Details <ArrowRight size={12} />
                          </button>
                        </div>

                        {/* Name + description */}
                        <h3 className="text-lg font-bold mb-0.5">{strategy.name}</h3>
                        <p className="text-xs text-[var(--muted-foreground)] mb-4">
                          {strategy.type === 'scalping' ? 'High-frequency risk containment' :
                           strategy.type === 'swing' ? 'Patience and selectivity protocol' :
                           strategy.type === 'breakout' ? 'Momentum capture discipline' :
                           strategy.type === 'trend-following' ? 'Trend continuation mode' :
                           'Drawdown control mode'}
                        </p>

                        {/* Activated / Used / Priority */}
                        <div className="flex bg-[var(--card)] rounded-lg overflow-hidden mb-4">
                          <div className="flex-1 px-3 py-2 border-r border-[var(--border)]">
                            <p className="text-[10px] text-[var(--muted-foreground)]">Activated</p>
                            <p className="text-xs font-bold">{format(new Date(strategy.createdAt), 'MM/dd/yyyy')}</p>
                          </div>
                          <div className="flex-1 px-3 py-2 border-r border-[var(--border)]">
                            <p className="text-[10px] text-[var(--muted-foreground)]">Used</p>
                            <p className="text-xs font-bold">{sTrades.length}x</p>
                          </div>
                          <div className="flex-1 px-3 py-2">
                            <p className="text-[10px] text-[var(--muted-foreground)]">Priority</p>
                            <p className="text-xs font-bold">P2</p>
                          </div>
                        </div>

                        {/* Leak, Recovery and Capture */}
                        <div className="bg-[var(--card)] rounded-lg p-3 mb-3">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-[10px] font-semibold uppercase tracking-widest text-yellow-400">Leak, Recovery and Capture</p>
                            <p className="text-xs text-[var(--muted-foreground)]">{impactingCount}/{sTrades.length} impacting</p>
                          </div>
                          <div className="grid grid-cols-2 gap-2 mb-2">
                            <div className="bg-[var(--muted)] rounded px-3 py-2">
                              <p className="text-[10px] text-[var(--muted-foreground)]">Est Leak</p>
                              <p className="text-sm font-bold text-red-400">-{formatCurrency(estLeak)}</p>
                            </div>
                            <div className="bg-[var(--muted)] rounded px-3 py-2">
                              <p className="text-[10px] text-[var(--muted-foreground)]">Recoverable</p>
                              <p className="text-sm font-bold text-green-400">+{formatCurrency(recoverable)}</p>
                            </div>
                          </div>
                          <div className="bg-green-500/10 rounded px-3 py-1.5 text-xs text-green-400 mb-2">
                            Recovery range: +{formatCurrency(0)} to +{formatCurrency(recoverable)}
                          </div>
                          <div className="grid grid-cols-2 gap-2 mb-2">
                            <div className="bg-green-500/10 rounded px-3 py-2">
                              <p className="text-[10px] text-[var(--muted-foreground)]">Captured</p>
                              <p className="text-sm font-bold text-green-400">+{formatCurrency(capturedPnL)}</p>
                            </div>
                            <div className="bg-red-500/10 rounded px-3 py-2">
                              <p className="text-[10px] text-[var(--muted-foreground)]">Missed</p>
                              <p className="text-sm font-bold text-red-400">-{formatCurrency(missedPnL)}</p>
                            </div>
                          </div>
                          <p className="text-[10px] text-[var(--muted-foreground)]">
                            Opportunity capture: {capturePct}% captured &middot; {100 - capturePct}% missed
                          </p>
                        </div>

                        {/* Observed ledger */}
                        <div className="bg-[var(--card)] rounded-lg px-3 py-2 text-[10px] text-[var(--muted-foreground)] mb-4">
                          Observed ledger: {sTrades.length} events &middot; PnL: {formatCurrency(ss?.pnl ?? 0)} &middot; Risk {formatCurrency(estLeak)} &middot; Confidence {compliancePct}%
                        </div>

                        {/* ── LIVE PROGRESS ── */}
                        <div className="bg-[var(--card)] rounded-lg p-3 mb-3">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-sm font-bold">Live Progress</p>
                            <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold ${progressBadgeBg} ${progressTextColor}`}>{progressLabel}</span>
                          </div>
                          {/* Progress bar */}
                          <div className="h-2 rounded-full bg-[var(--muted)] overflow-hidden mb-3">
                            <div className={`h-full rounded-full ${progressColor} transition-all`} style={{ width: `${compliancePct}%` }} />
                          </div>
                          {/* Stats grid */}
                          <div className="grid grid-cols-3 gap-2 mb-2">
                            <div className="bg-[var(--muted)] rounded px-2.5 py-2">
                              <p className="text-[10px] text-[var(--muted-foreground)]">Rules</p>
                              <p className="text-xs font-bold">{totalRules}/{totalRules}</p>
                            </div>
                            <div className="bg-[var(--muted)] rounded px-2.5 py-2">
                              <p className="text-[10px] text-[var(--muted-foreground)]">Met</p>
                              <p className="text-xs font-bold">{metRules}/{totalRules}</p>
                            </div>
                            <div className="bg-[var(--muted)] rounded px-2.5 py-2 col-span-1" />
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                            <div className="bg-[var(--muted)] rounded px-2.5 py-2">
                              <p className="text-[10px] text-[var(--muted-foreground)]">Compliance</p>
                              <p className="text-xs font-bold">{compliancePct}%</p>
                            </div>
                            <div className="bg-[var(--muted)] rounded px-2.5 py-2">
                              <p className="text-[10px] text-[var(--muted-foreground)]">Violations</p>
                              <p className="text-xs font-bold">{violationCount}</p>
                            </div>
                            <div className="bg-[var(--muted)] rounded px-2.5 py-2">
                              <p className="text-[10px] text-[var(--muted-foreground)]">Changed</p>
                              <p className="text-xs font-bold">0</p>
                            </div>
                          </div>
                        </div>

                        {/* ── Per-rule breakdown ── */}
                        {ruleBreakdown.length > 0 && (
                          <div className="space-y-1.5">
                            {ruleBreakdown.map((rb, i) => {
                              const status = rb.compliance >= 80 ? 'ON TRACK' : rb.compliance >= 50 ? 'BUILDING' : 'AT RISK';
                              const statusColor = status === 'ON TRACK' ? 'bg-green-500/20 text-green-400' : status === 'BUILDING' ? 'bg-cyan-500/20 text-cyan-400' : 'bg-red-500/20 text-red-400';
                              return (
                                <div key={i} className="flex items-center justify-between bg-[var(--card)] rounded-lg px-3 py-2">
                                  <p className="text-xs truncate mr-2">
                                    <span className="text-[var(--muted-foreground)]">{strategy.type}:</span> {rb.rule.length > 25 ? rb.rule.slice(0, 25) + '...' : rb.rule}
                                  </p>
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold shrink-0 ${statusColor}`}>{status}</span>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* Actions */}
                        <div className="flex gap-1.5 mt-3 pt-3 border-t border-[var(--border)]">
                          <button onClick={() => openEdit(strategy)} className="flex items-center gap-1 px-3 py-1.5 text-xs hover:bg-[var(--card)] rounded-lg text-[var(--muted-foreground)]"><Edit2 size={12} /> Edit</button>
                          <button onClick={() => { setActivatedIds(prev => { const next = new Set(prev); next.delete(strategy.id); return next; }); showToast(`"${strategy.name}" deactivated`); }}
                            className="flex items-center gap-1 px-3 py-1.5 text-xs hover:bg-red-500/10 rounded-lg text-red-400"><X size={12} /> Deactivate</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* ══════════ PLAYBOOK LIBRARY ══════════ */}
          <div ref={playbookLibraryRef} className="scroll-mt-4">
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-[var(--muted)]"><BookOpen size={20} /></div>
                  <div>
                    <h2 className="text-xl font-bold">Playbook Library</h2>
                    <p className="text-xs text-[var(--muted-foreground)]">One library for all your templates, including starter sets.</p>
                  </div>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <span className="px-3 py-1.5 rounded-lg bg-[var(--muted)] text-xs">{strategies.length} templates available</span>
                  <button onClick={openRuleSetComposer} disabled={usage.strategies.isAtLimit}
                    className="flex items-center gap-1.5 px-4 py-1.5 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50">
                    <Plus size={14} /> Create Rule Set
                  </button>
                  <button onClick={openStratComposer} disabled={usage.strategies.isAtLimit}
                    className="flex items-center gap-1.5 px-4 py-1.5 bg-[var(--muted)] hover:bg-[var(--muted)]/80 border border-[var(--border)] rounded-lg text-sm font-medium transition-colors disabled:opacity-50">
                    <Plus size={14} /> Create Strategy
                  </button>
                </div>
              </div>

              {strategies.length === 0 ? (
                <div className="py-12 text-center text-[var(--muted-foreground)] text-sm">
                  No templates yet. Create your first strategy template.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {strategies.map(strategy => {
                    const level = strategy.rules.length >= 5 ? 'ADVANCED' : strategy.rules.length >= 3 ? 'INTERMEDIATE' : 'BEGINNER';
                    const levelColor = level === 'ADVANCED' ? 'bg-blue-500/20 text-cyan-400' : level === 'INTERMEDIATE' ? 'bg-blue-500/20 text-blue-400' : 'bg-green-500/20 text-green-400';
                    const isActive = activatedIds.has(strategy.id);
                    return (
                      <div key={strategy.id} className="bg-[var(--muted)] rounded-xl p-5">
                        <div className="flex items-center justify-between mb-3">
                          <div className="p-2 rounded-lg bg-[var(--card)]">
                            <Zap size={16} className="text-[var(--muted-foreground)]" />
                          </div>
                          <div className="flex gap-1.5">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${levelColor}`}>{level}</span>
                            {isActive
                              ? <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-green-500/20 text-green-400">ACTIVE</span>
                              : <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[var(--card)] text-[var(--muted-foreground)]">SAVED</span>}
                          </div>
                        </div>
                        <h3 className="text-base font-bold mb-1">{strategy.name}</h3>
                        <p className="text-xs text-[var(--muted-foreground)] mb-3">
                          {strategy.type === 'scalping' ? 'Strict limits for high-frequency trading with anti-tilt pacing.' :
                           strategy.type === 'swing' ? 'Patience-first setup to reduce impulse entries and early exits.' :
                           strategy.type === 'breakout' ? 'Momentum capture with strict entry criteria.' :
                           `${strategy.type} strategy with ${strategy.rules.length} rules.`}
                        </p>
                        <div className="flex flex-wrap gap-1.5 mb-3">
                          {[strategy.type, ...strategy.rules.slice(0, 2)].map((tag, i) => (
                            <span key={i} className="px-2 py-0.5 rounded-full bg-[var(--card)] text-[10px] text-[var(--muted-foreground)] border border-[var(--border)]">
                              #{tag.split(' ')[0]}
                            </span>
                          ))}
                        </div>
                        <p className="text-xs text-[var(--muted-foreground)] mb-4">{strategy.rules.length} Rules</p>
                        <div className="space-y-2">
                          {isActive ? (
                            <button onClick={() => { setActivatedIds(prev => { const next = new Set(prev); next.delete(strategy.id); return next; }); showToast(`"${strategy.name}" deactivated`); }}
                              className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 rounded-lg text-sm font-medium transition-colors">
                              Deactivate <X size={14} />
                            </button>
                          ) : (
                            <button onClick={() => { setAmSelected([strategy.id]); setActivationMixerOpen(true); }}
                              className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white rounded-lg text-sm font-medium transition-colors">
                              Activate Rule Set <ArrowRight size={14} />
                            </button>
                          )}
                          <button onClick={() => openEdit(strategy)} className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-[var(--card)] hover:bg-[var(--muted)] border border-[var(--border)] rounded-lg text-sm transition-colors">
                            <Edit2 size={12} /> Open & Adjust
                          </button>
                          <button onClick={() => setDeleteConfirm(strategy.id)} className="flex items-center gap-1.5 px-3 py-1.5 text-red-400 hover:bg-red-500/10 rounded-lg text-xs transition-colors">
                            <Trash2 size={12} /> Delete
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* ══════════ RULES LIBRARY ══════════ */}
          <div ref={rulesLibraryRef} className="scroll-mt-4">
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-[var(--muted)]"><Target size={20} /></div>
                  <div>
                    <h2 className="text-xl font-bold">Rules Library</h2>
                    <p className="text-xs text-[var(--muted-foreground)]">Create, tune, and manage guardrails for this account.</p>
                  </div>
                </div>
              </div>

              {/* Category filter */}
              <div className="flex gap-2 mb-5">
                {RULE_CATEGORIES.map(c => (
                  <button key={c} onClick={() => setRuleFilter(c)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      ruleFilter === c
                        ? 'bg-[var(--accent)] text-white'
                        : 'bg-[var(--muted)] text-[var(--muted-foreground)] hover:bg-[var(--muted)]/80'
                    }`}>{c}</button>
                ))}
              </div>

              {filteredRules.length === 0 ? (
                <div className="py-8 text-center text-[var(--muted-foreground)] text-sm">
                  No rules found. Add rules to your strategies first.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {filteredRules.map((r, i) => (
                    <div key={i} className="bg-[var(--muted)] border border-[var(--border)] rounded-xl p-4">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-bold">P2 &middot; {r.rule}</p>
                        <div className="p-1 rounded-full bg-green-500/20"><ToggleRight size={20} className="text-green-400" /></div>
                      </div>
                      <p className="text-xs text-[var(--muted-foreground)] mb-2">{r.strategy}</p>
                      <div className="flex items-center justify-between text-xs text-[var(--muted-foreground)] mb-2">
                        <span>Last Triggered</span>
                        <span className="font-medium text-[var(--foreground)]">{r.lastHit}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-[var(--card)] overflow-hidden mb-2">
                        <div className="h-full bg-green-400 rounded-full transition-all" style={{ width: `${r.compliance}%` }} />
                      </div>
                      <p className="text-[10px] text-[var(--muted-foreground)]">{r.compliance}% compliance &middot; {r.total - r.compliant} violations</p>
                      <div className="mt-2">
                        <span className={`text-[10px] px-2 py-0.5 rounded border font-semibold ${
                          r.compliance >= 90 ? 'bg-green-500/20 text-green-400 border-green-500/30'
                            : r.compliance >= 70 ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
                            : 'bg-red-500/20 text-red-400 border-red-500/30'
                        }`}>
                          {r.compliance >= 90 ? 'HIGH IMPACT' : r.compliance >= 70 ? 'MEDIUM IMPACT' : 'LOW IMPACT'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Behavior Targets */}
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5 mt-4">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-[var(--muted)]"><Target size={18} /></div>
                  <div>
                    <h3 className="text-lg font-bold">Behavior Targets</h3>
                    <p className="text-xs text-[var(--muted-foreground)]">Tracking your key discipline metrics</p>
                  </div>
                </div>
                <Clock size={18} className="text-[var(--muted-foreground)]" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Risk Rules', value: behaviorTargets.risk, icon: Shield },
                  { label: 'Time Rules', value: behaviorTargets.time, icon: Clock },
                  { label: 'Behavior Rules', value: behaviorTargets.behavior, icon: Target },
                  { label: 'Overall', value: behaviorTargets.overall, icon: CheckCircle2 },
                ].map(item => (
                  <div key={item.label} className="bg-[var(--muted)] rounded-xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="p-1.5 rounded-lg bg-[var(--card)]"><item.icon size={16} className="text-[var(--accent)]" /></div>
                      <span className="text-[10px] text-[var(--muted-foreground)]">
                        {item.value !== null && item.value > (behaviorTargets.overall ?? 0) ? <span className="text-green-400">&nearr; vs previous period</span> : <span>&mdash; vs previous period</span>}
                      </span>
                    </div>
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--muted-foreground)] mb-1">{item.label}</p>
                    <div className="flex items-baseline gap-2">
                      <p className="text-2xl font-bold">{item.value !== null ? `${item.value}%` : <span className="text-[var(--muted-foreground)]">&mdash;</span>}</p>
                      <p className="text-xs text-[var(--muted-foreground)]">/ &ge; 80%</p>
                    </div>
                    <div className="h-1.5 rounded-full bg-[var(--card)] overflow-hidden mt-2">
                      <div className={`h-full rounded-full transition-all ${(item.value ?? 0) >= 80 ? 'bg-green-400' : 'bg-[var(--muted-foreground)]'}`} style={{ width: `${item.value ?? 0}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ══════════ WEEKLY FOCUS (placeholder) ══════════ */}
          <div ref={weeklyFocusRef} className="scroll-mt-4">
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2.5 rounded-xl bg-[var(--muted)]"><Target size={20} /></div>
                <div>
                  <h2 className="text-xl font-bold">Weekly Focus</h2>
                  <p className="text-xs text-[var(--muted-foreground)]">Execution cadence for this week</p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="bg-[var(--muted)] rounded-xl p-4">
                  <p className="text-sm font-bold mb-1">Top Rule to Watch</p>
                  <p className="text-xs text-[var(--muted-foreground)]">
                    {metrics.ruleHealth.length > 0
                      ? `Focus on "${metrics.ruleHealth.sort((a, b) => a.compliance - b.compliance)[0].rule}" — lowest compliance at ${metrics.ruleHealth.sort((a, b) => a.compliance - b.compliance)[0].compliance}%`
                      : 'No rules tracked yet.'}
                  </p>
                </div>
                <div className="bg-[var(--muted)] rounded-xl p-4">
                  <p className="text-sm font-bold mb-1">Session Target</p>
                  <p className="text-xs text-[var(--muted-foreground)]">
                    Run 5-7 sessions with current rule set before making adjustments. Track compliance daily.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* ══════════ IMPACT & COMPLIANCE ══════════ */}
          <div ref={impactRef} className="scroll-mt-4 space-y-4">
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-[var(--muted)]"><BarChart3 size={20} /></div>
                  <div>
                    <h2 className="text-xl font-bold">Impact & Compliance</h2>
                    <p className="text-xs text-[var(--muted-foreground)]">Measuring the ROI of your discipline</p>
                  </div>
                </div>
                {metrics.equityData.length > 0 && (
                  <span className="px-3 py-1 rounded-full bg-[var(--accent)]/10 text-[var(--accent)] text-xs font-medium">
                    {metrics.equityData[0]?.date} &rarr; {metrics.equityData[metrics.equityData.length - 1]?.date}
                  </span>
                )}
              </div>

              {/* 4 impact stat cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
                <div className="bg-[var(--muted)] rounded-xl p-3">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--muted-foreground)]">Money Left on Table</p>
                    <div className="p-1 rounded bg-red-500/10"><BarChart3 size={12} className="text-red-400" /></div>
                  </div>
                  <p className="text-xl font-bold">{formatCurrency(-metrics.recoverable)}</p>
                  <p className="text-[10px] text-red-400">Missed opportunity</p>
                </div>
                <div className="bg-[var(--muted)] rounded-xl p-3">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--muted-foreground)]">Projected Gain</p>
                    <div className="p-1 rounded bg-green-500/10"><BarChart3 size={12} className="text-green-400" /></div>
                  </div>
                  <p className="text-xl font-bold text-green-400">+{formatCurrency(metrics.recoverable)}</p>
                  <p className="text-[10px] text-green-400">If rules followed</p>
                </div>
                <div className="bg-[var(--muted)] rounded-xl p-3">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--muted-foreground)]">Avg Compliance</p>
                    <div className="p-1 rounded bg-[var(--accent)]/10"><BarChart3 size={12} className="text-[var(--accent)]" /></div>
                  </div>
                  <p className="text-xl font-bold">{metrics.compliance}%</p>
                </div>
                <div className="bg-[var(--muted)] rounded-xl p-3">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--muted-foreground)]">Best Week</p>
                    <div className="p-1 rounded bg-green-500/10"><CheckCircle2 size={12} className="text-green-400" /></div>
                  </div>
                  <p className="text-xl font-bold">{metrics.bestWeek ? metrics.bestWeek[0] : '—'}</p>
                </div>
              </div>

              {/* Charts */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Estimated vs Actual PnL */}
                <div className="bg-[var(--muted)] rounded-xl p-4">
                  <h4 className="text-sm font-bold mb-3">Estimated vs Actual PnL</h4>
                  {metrics.equityData.length > 1 ? (
                    <ResponsiveContainer width="100%" height={160}>
                      <AreaChart data={metrics.equityData}>
                        <defs>
                          <linearGradient id="pnlGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#4ade80" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#4ade80" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}`} />
                        <Tooltip contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} />
                        <Area type="monotone" dataKey="actual" stroke="#4ade80" fill="url(#pnlGrad)" strokeWidth={2} dot={{ r: 3, fill: '#4ade80' }} />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-40 flex items-center justify-center text-xs text-[var(--muted-foreground)]">Not enough data</div>
                  )}
                </div>

                {/* Compliance Trend */}
                <div className="bg-[var(--muted)] rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-bold">Compliance Trend</h4>
                    <span className="flex items-center gap-1 text-[10px] text-green-400"><span className="w-1.5 h-1.5 rounded-full bg-green-400" /> Live</span>
                  </div>
                  {metrics.weeklyCompliance.length > 1 ? (
                    <ResponsiveContainer width="100%" height={160}>
                      <LineChart data={metrics.weeklyCompliance}>
                        <XAxis dataKey="week" tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
                        <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} />
                        <Tooltip contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} />
                        <Line type="monotone" dataKey="compliance" stroke="#facc15" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 3, fill: '#facc15' }} />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-40 flex items-center justify-center text-xs text-[var(--muted-foreground)]">Not enough data</div>
                  )}
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* ── Right Sidebar ── */}
        <div className="space-y-4">

          {/* Execution Checklist */}
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4">
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle2 size={16} className="text-[var(--accent)]" />
              <h3 className="text-sm font-bold">Execution Checklist</h3>
            </div>
            <div className="space-y-3">
              {executionChecklist.map((item, i) => (
                <div key={i} className={`flex items-center justify-between py-2 px-3 rounded-lg ${
                  item.status === 'on-track' ? 'bg-green-500/5 border-l-2 border-green-400' : 'bg-yellow-500/5 border-l-2 border-yellow-400'
                }`}>
                  <div>
                    <p className="text-sm font-medium">{item.label}</p>
                    <p className="text-[10px] text-[var(--muted-foreground)]">{item.detail}</p>
                  </div>
                  <span className={`text-[10px] font-bold ${item.status === 'on-track' ? 'text-green-400' : 'text-yellow-400'}`}>
                    {item.status === 'on-track' ? 'ON TRACK' : 'PENDING'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Active Rule Health */}
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Shield size={16} className="text-[var(--accent)]" />
              <h3 className="text-sm font-bold">Active Rule Health</h3>
            </div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--muted-foreground)] mb-3">Sorted by Highest Impact First</p>
            <div className="space-y-3">
              {metrics.ruleHealth
                .sort((a, b) => b.total - a.total)
                .slice(0, 5)
                .map((r, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                      r.compliance >= 90 ? 'bg-green-500/20 text-green-400'
                        : r.compliance >= 70 ? 'bg-yellow-500/20 text-yellow-400'
                        : 'bg-red-500/20 text-red-400'
                    }`}>#{i + 1}</span>
                    <div className="min-w-0">
                      <p className="text-xs font-medium truncate">{r.rule.length > 20 ? r.rule.slice(0, 20) + '...' : r.rule}</p>
                      <p className="text-[10px] text-[var(--muted-foreground)]">{r.strategy} &middot; Last hit: {r.lastHit}</p>
                    </div>
                  </div>
                  <span className="text-xs font-bold ml-2 tabular-nums">{r.compliance}%</span>
                </div>
              ))}
              {metrics.ruleHealth.length === 0 && (
                <p className="text-xs text-[var(--muted-foreground)]">No rules tracked yet.</p>
              )}
            </div>
          </div>

          {/* Hour Window Radar */}
          <div className="bg-[var(--card)] border border-yellow-500/20 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle size={16} className="text-yellow-400" />
              <h3 className="text-sm font-bold">Hour Window Radar</h3>
            </div>
            {metrics.riskWindows.length > 0 && (
              <div className="mb-3">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-red-400 mb-1">Risk Windows</p>
                {metrics.riskWindows.map((w, i) => (
                  <div key={i} className="flex justify-between text-xs py-0.5">
                    <span>{w.hour}</span>
                    <span className="text-red-400 font-medium tabular-nums">{formatCurrency(w.pnl)}</span>
                  </div>
                ))}
              </div>
            )}
            {metrics.edgeWindows.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-green-400 mb-1">Edge Windows</p>
                {metrics.edgeWindows.map((w, i) => (
                  <div key={i} className="flex justify-between text-xs py-0.5">
                    <span>{w.hour}</span>
                    <span className="text-green-400 font-medium tabular-nums">{formatCurrency(w.pnl)}</span>
                  </div>
                ))}
              </div>
            )}
            {metrics.riskWindows.length === 0 && metrics.edgeWindows.length === 0 && (
              <p className="text-xs text-[var(--muted-foreground)]">Not enough data yet.</p>
            )}
          </div>

          {/* Symbol Focus */}
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles size={16} className="text-[var(--accent)]" />
              <h3 className="text-sm font-bold">Symbol Focus</h3>
            </div>
            {metrics.symbolFocus.length > 0 ? (
              <div className="space-y-2">
                {metrics.symbolFocus.map((s, i) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <div>
                      <p className="font-medium">{s.coin}</p>
                      <p className="text-[10px] text-[var(--muted-foreground)]">{s.winRate}% WR &middot; {s.count} trades</p>
                    </div>
                    <span className="text-green-400 font-medium tabular-nums">{formatCurrency(s.pnl)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-[var(--muted-foreground)]">No high-confidence symbols detected in this period yet.</p>
            )}
          </div>

        </div>
      </div>

      {/* ── Strategy Form Modal ── */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingId ? 'Edit Strategy' : 'Create Rule Set Template'} size="lg">
        <div className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-widest text-[var(--muted-foreground)] mb-1">Template Name</label>
              <input value={form.name} onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))} placeholder="Example: Drawdown Recovery Protocol" />
            </div>
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-widest text-[var(--muted-foreground)] mb-1">Type</label>
              <select value={form.type} onChange={e => setForm(prev => ({ ...prev, type: e.target.value as StrategyType }))}>
                {STRATEGY_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
          </div>
          <ListEditor label="Rules" field="rules" />
          <ListEditor label="Entry Criteria" field="entryChecklist" />
          <ListEditor label="Exit Criteria" field="exitChecklist" />
          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-widest text-[var(--muted-foreground)] mb-2">Risk Parameters</label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-[var(--muted-foreground)]">Max Position Size ($)</label>
                <input type="number" value={form.riskParams.maxPositionSize ?? ''} onChange={e => setForm(prev => ({ ...prev, riskParams: { ...prev.riskParams, maxPositionSize: e.target.value ? Number(e.target.value) : undefined } }))} />
              </div>
              <div>
                <label className="text-xs text-[var(--muted-foreground)]">Max Loss (%)</label>
                <input type="number" value={form.riskParams.maxLossPercent ?? ''} onChange={e => setForm(prev => ({ ...prev, riskParams: { ...prev.riskParams, maxLossPercent: e.target.value ? Number(e.target.value) : undefined } }))} />
              </div>
              <div>
                <label className="text-xs text-[var(--muted-foreground)]">Risk:Reward Ratio</label>
                <input type="number" step="0.1" value={form.riskParams.riskRewardRatio ?? ''} onChange={e => setForm(prev => ({ ...prev, riskParams: { ...prev.riskParams, riskRewardRatio: e.target.value ? Number(e.target.value) : undefined } }))} />
              </div>
              <div>
                <label className="text-xs text-[var(--muted-foreground)]">Max Daily Loss ($)</label>
                <input type="number" value={form.riskParams.maxDailyLoss ?? ''} onChange={e => setForm(prev => ({ ...prev, riskParams: { ...prev.riskParams, maxDailyLoss: e.target.value ? Number(e.target.value) : undefined } }))} />
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-3 border-t border-[var(--border)]">
            <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm rounded-lg hover:bg-[var(--muted)] transition-colors">Cancel</button>
            <button onClick={handleSave} disabled={!form.name.trim()} className="px-4 py-2 text-sm bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white rounded-lg transition-colors disabled:opacity-50">
              {editingId ? 'Update' : 'Create'} Strategy
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation */}
      <Modal isOpen={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} title="Delete Strategy" size="sm">
        <p className="text-sm text-[var(--muted-foreground)] mb-4">Are you sure you want to delete this strategy? This cannot be undone.</p>
        <div className="flex justify-end gap-3">
          <button onClick={() => setDeleteConfirm(null)} className="px-4 py-2 text-sm rounded-lg hover:bg-[var(--muted)]">Cancel</button>
          <button onClick={() => deleteConfirm && handleDeleteConfirm(deleteConfirm)} className="px-4 py-2 text-sm bg-[var(--red)] hover:bg-red-600 text-white rounded-lg">Delete</button>
        </div>
      </Modal>

      {/* ══════════ RULE COMPOSER (3-step wizard) ══════════ */}
      <Modal isOpen={ruleComposerOpen} onClose={() => setRuleComposerOpen(false)} title="Rule Composer" size="lg">
        <div>
          {/* Step indicator */}
          <div className="flex items-center gap-2 mb-6">
            {[1, 2, 3].map(s => (
              <div key={s} className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                  rcStep === s ? 'bg-[var(--accent)] text-white' : rcStep > s ? 'bg-green-500/20 text-green-400' : 'bg-[var(--muted)] text-[var(--muted-foreground)]'
                }`}>{rcStep > s ? <Check size={14} /> : s}</div>
                <span className={`text-xs font-medium ${rcStep === s ? 'text-[var(--foreground)]' : 'text-[var(--muted-foreground)]'}`}>
                  {s === 1 ? 'Category & Type' : s === 2 ? 'Details' : 'Review'}
                </span>
                {s < 3 && <ChevronRight size={14} className="text-[var(--muted-foreground)]" />}
              </div>
            ))}
          </div>

          {/* Step 1: Category & Rule Type */}
          {rcStep === 1 && (
            <div className="space-y-5">
              <div>
                <p className="text-sm font-bold mb-3">Select Category</p>
                <div className="grid grid-cols-3 gap-3">
                  {(['Behavior', 'Discipline', 'Performance'] as RuleComposerCategory[]).map(cat => (
                    <button key={cat} onClick={() => { setRcCategory(cat); setRcRuleType(''); }}
                      className={`p-4 rounded-xl border text-left transition-all ${
                        rcCategory === cat ? 'border-[var(--accent)] bg-[var(--accent)]/10' : 'border-[var(--border)] bg-[var(--muted)] hover:border-[var(--accent)]/30'
                      }`}>
                      <div className="p-2 rounded-lg bg-[var(--card)] w-fit mb-2">
                        {cat === 'Behavior' ? <Target size={16} className="text-blue-400" /> :
                         cat === 'Discipline' ? <Shield size={16} className="text-yellow-400" /> :
                         <BarChart3 size={16} className="text-green-400" />}
                      </div>
                      <p className="text-sm font-bold">{cat}</p>
                      <p className="text-[10px] text-[var(--muted-foreground)] mt-0.5">
                        {cat === 'Behavior' ? 'Emotional & impulse controls' : cat === 'Discipline' ? 'Risk & session limits' : 'Target & outcome rules'}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-sm font-bold mb-3">Select Rule Type</p>
                <div className="grid grid-cols-2 gap-2">
                  {RULE_TYPES[rcCategory].map(rt => (
                    <button key={rt} onClick={() => setRcRuleType(rt)}
                      className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                        rcRuleType === rt ? 'border-[var(--accent)] bg-[var(--accent)]/10' : 'border-[var(--border)] bg-[var(--muted)] hover:border-[var(--accent)]/30'
                      }`}>
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                        rcRuleType === rt ? 'border-[var(--accent)]' : 'border-[var(--muted-foreground)]'
                      }`}>
                        {rcRuleType === rt && <div className="w-2 h-2 rounded-full bg-[var(--accent)]" />}
                      </div>
                      <span className="text-sm">{rt}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Details */}
          {rcStep === 2 && (
            <div className="space-y-4">
              <div className="bg-[var(--muted)] rounded-xl p-4 mb-2">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--muted-foreground)] mb-1">Selected</p>
                <p className="text-sm font-bold">{rcCategory} &middot; {rcRuleType || 'Custom'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Custom Rule Name (optional)</label>
                <input value={rcCustomRule} onChange={e => setRcCustomRule(e.target.value)} placeholder={rcRuleType || 'Enter custom rule name'} className="w-full" />
                <p className="text-[10px] text-[var(--muted-foreground)] mt-1">Leave blank to use the selected rule type as name</p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Description / Notes</label>
                <textarea value={rcDescription} onChange={e => setRcDescription(e.target.value)} placeholder="Describe when this rule applies and why it matters..." rows={3} className="w-full" />
              </div>
            </div>
          )}

          {/* Step 3: Review */}
          {rcStep === 3 && (
            <div className="space-y-4">
              <div className="bg-[var(--muted)] rounded-xl p-5">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--accent)] mb-3">Review Your Rule</p>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-[var(--muted-foreground)]">Category</span>
                    <span className="font-medium">{rcCategory}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[var(--muted-foreground)]">Rule Type</span>
                    <span className="font-medium">{rcRuleType}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[var(--muted-foreground)]">Name</span>
                    <span className="font-medium">{rcCustomRule || rcRuleType}</span>
                  </div>
                  {rcDescription && (
                    <div>
                      <p className="text-[var(--muted-foreground)] text-sm mb-1">Description</p>
                      <p className="text-sm bg-[var(--card)] rounded-lg p-3">{rcDescription}</p>
                    </div>
                  )}
                </div>
              </div>
              <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle2 size={14} className="text-green-400" />
                  <p className="text-sm font-bold text-green-400">Ready to Create</p>
                </div>
                <p className="text-xs text-[var(--muted-foreground)]">
                  This rule will be added to {strategies.length > 0 ? `"${strategies[0].name}"` : 'a new rule set'}.
                </p>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex justify-between mt-6 pt-4 border-t border-[var(--border)]">
            <button onClick={() => rcStep > 1 ? setRcStep((rcStep - 1) as RuleComposerStep) : setRuleComposerOpen(false)}
              className="flex items-center gap-1.5 px-4 py-2 text-sm rounded-lg hover:bg-[var(--muted)] transition-colors">
              <ArrowLeft size={14} /> {rcStep === 1 ? 'Cancel' : 'Back'}
            </button>
            {rcStep < 3 ? (
              <button onClick={() => setRcStep((rcStep + 1) as RuleComposerStep)}
                disabled={rcStep === 1 && !rcRuleType}
                className="flex items-center gap-1.5 px-5 py-2 text-sm bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white rounded-lg transition-colors disabled:opacity-50">
                Continue <ChevronRight size={14} />
              </button>
            ) : (
              <button onClick={saveRule}
                className="flex items-center gap-1.5 px-5 py-2 text-sm bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors">
                <Plus size={14} /> Create Rule
              </button>
            )}
          </div>
        </div>
      </Modal>

      {/* ══════════ RULE SET TEMPLATE COMPOSER ══════════ */}
      <Modal isOpen={ruleSetComposerOpen} onClose={() => setRuleSetComposerOpen(false)} title="Template Composer — Rule Set" size="xl">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main area (2/3) */}
          <div className="lg:col-span-2 space-y-5">
            {/* Step indicator */}
            <div className="flex gap-2">
              {[1, 2].map(s => (
                <button key={s} onClick={() => s === 1 && setRsStep(1)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    rsStep === s ? 'bg-[var(--accent)] text-white' : 'bg-[var(--muted)] text-[var(--muted-foreground)]'
                  }`}>
                  {s === 1 ? 'Step 1: Template Identity' : 'Step 2: Select Rules'}
                </button>
              ))}
            </div>

            {rsStep === 1 && (
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-widest text-[var(--muted-foreground)] mb-1">Template Name</label>
                  <input value={rsName} onChange={e => setRsName(e.target.value)} placeholder="e.g. Drawdown Recovery Protocol" className="w-full" />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-widest text-[var(--muted-foreground)] mb-1">Description</label>
                  <textarea value={rsDescription} onChange={e => setRsDescription(e.target.value)} placeholder="Describe what this rule set is designed to do..." rows={4} className="w-full" />
                </div>
                <button onClick={() => setRsStep(2)} disabled={!rsName.trim()}
                  className="flex items-center gap-1.5 px-5 py-2 text-sm bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white rounded-lg transition-colors disabled:opacity-50">
                  Next: Select Rules <ChevronRight size={14} />
                </button>
              </div>
            )}

            {rsStep === 2 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]" />
                    <input value={rsSearch} onChange={e => setRsSearch(e.target.value)} placeholder="Search rules..." className="w-full pl-9" />
                  </div>
                  <button onClick={() => setRsSelectedRules(allRuleStrings)} className="px-3 py-2 text-xs bg-[var(--muted)] hover:bg-[var(--muted)]/80 rounded-lg">Select All</button>
                  <button onClick={() => setRsSelectedRules([])} className="px-3 py-2 text-xs bg-[var(--muted)] hover:bg-[var(--muted)]/80 rounded-lg">Clear</button>
                </div>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {allRuleStrings
                    .filter(r => !rsSearch || r.toLowerCase().includes(rsSearch.toLowerCase()))
                    .map(rule => {
                      const selected = rsSelectedRules.includes(rule);
                      return (
                        <button key={rule} onClick={() => setRsSelectedRules(prev => selected ? prev.filter(r => r !== rule) : [...prev, rule])}
                          className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                            selected ? 'border-[var(--accent)] bg-[var(--accent)]/10' : 'border-[var(--border)] bg-[var(--muted)] hover:border-[var(--accent)]/30'
                          }`}>
                          <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 ${
                            selected ? 'border-[var(--accent)] bg-[var(--accent)]' : 'border-[var(--muted-foreground)]'
                          }`}>
                            {selected && <Check size={12} className="text-white" />}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{rule}</p>
                          </div>
                          {selected && <span className="ml-auto text-[10px] font-semibold text-[var(--accent)] shrink-0">SELECTED</span>}
                        </button>
                      );
                    })}
                  {allRuleStrings.length === 0 && (
                    <div className="py-8 text-center text-[var(--muted-foreground)] text-sm">
                      No rules found. Create rules first using the Rule Composer.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Right sidebar */}
          <div className="space-y-4">
            <div className="bg-[var(--muted)] rounded-xl p-4">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--muted-foreground)] mb-3">Selected Rules</p>
              {rsSelectedRules.length === 0 ? (
                <p className="text-xs text-[var(--muted-foreground)]">No rules selected yet.</p>
              ) : (
                <div className="space-y-1.5">
                  {rsSelectedRules.map((r, i) => (
                    <div key={i} className="flex items-center justify-between bg-[var(--card)] rounded-lg px-3 py-2">
                      <p className="text-xs truncate mr-2">{r}</p>
                      <button onClick={() => setRsSelectedRules(prev => prev.filter(x => x !== r))} className="shrink-0 text-[var(--muted-foreground)] hover:text-red-400"><X size={12} /></button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="bg-[var(--muted)] rounded-xl p-4">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--muted-foreground)] mb-3">Quality Checklist</p>
              <div className="space-y-2">
                {[
                  { label: 'Template named', ok: !!rsName.trim() },
                  { label: 'At least 1 rule', ok: rsSelectedRules.length >= 1 },
                  { label: '3+ rules (recommended)', ok: rsSelectedRules.length >= 3 },
                ].map((c, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    <div className={`w-4 h-4 rounded-full flex items-center justify-center ${c.ok ? 'bg-green-500/20' : 'bg-[var(--card)]'}`}>
                      {c.ok ? <Check size={10} className="text-green-400" /> : <Circle size={10} className="text-[var(--muted-foreground)]" />}
                    </div>
                    <span className={c.ok ? 'text-green-400' : 'text-[var(--muted-foreground)]'}>{c.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-between mt-6 pt-4 border-t border-[var(--border)]">
          <button onClick={() => rsStep === 1 ? setRuleSetComposerOpen(false) : setRsStep(1)}
            className="flex items-center gap-1.5 px-4 py-2 text-sm rounded-lg hover:bg-[var(--muted)]">
            <ArrowLeft size={14} /> {rsStep === 1 ? 'Cancel' : 'Back'}
          </button>
          {rsStep === 1 ? (
            <button onClick={() => setRsStep(2)} disabled={!rsName.trim()}
              className="flex items-center gap-1.5 px-5 py-2 text-sm bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white rounded-lg disabled:opacity-50">
              Next <ChevronRight size={14} />
            </button>
          ) : (
            <button onClick={saveRuleSet} disabled={!rsName.trim() || rsSelectedRules.length === 0}
              className="flex items-center gap-1.5 px-5 py-2 text-sm bg-green-500 hover:bg-green-600 text-white rounded-lg disabled:opacity-50">
              <Plus size={14} /> Create Rule Set
            </button>
          )}
        </div>
      </Modal>

      {/* ══════════ STRATEGY TEMPLATE COMPOSER ══════════ */}
      <Modal isOpen={stratComposerOpen} onClose={() => setStratComposerOpen(false)} title="" size="xl">
        <div>
          {/* Header badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--accent)]/20 text-[10px] font-semibold uppercase tracking-widest text-[var(--accent)] mb-3">
            <Sparkles size={12} /> Template Composer
          </div>
          <h2 className="text-2xl font-bold mb-1">Create Strategy Template</h2>
          <p className="text-sm text-[var(--muted-foreground)] mb-6">Design manual execution sequences with ordered text steps.</p>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* Left: form (3/5) */}
            <div className="lg:col-span-3 space-y-6">
              {/* Step 1: Template Identity */}
              <div className="bg-[var(--card)] border border-[var(--accent)]/20 rounded-xl p-5">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-green-400 mb-4">Step 1 &middot; Template Identity</p>
                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-semibold uppercase tracking-widest text-[var(--muted-foreground)] mb-1">Template Name</label>
                    <input value={scName} onChange={e => setScName(e.target.value)} placeholder="e.g. Breakout Momentum Play" className="w-full" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold uppercase tracking-widest text-[var(--muted-foreground)] mb-1">Description (optional)</label>
                    <textarea value={scDescription} onChange={e => setScDescription(e.target.value)} placeholder="Describe your strategy approach..." rows={3} className="w-full" />
                  </div>
                </div>
              </div>

              {/* Step 2: Build Strategy Steps */}
              <div className="bg-[var(--card)] border border-[var(--accent)]/20 rounded-xl p-5">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-cyan-400 mb-4">Step 2 &middot; Build Strategy Steps</p>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--muted-foreground)]">Ordered Execution List</p>
                  <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-[var(--accent)]/20 text-[var(--accent)]">{scSteps.length} Step{scSteps.length !== 1 ? 's' : ''}</span>
                </div>

                {/* Input + Add button */}
                <div className="flex gap-2 mb-4">
                  <input value={scStepInput} onChange={e => setScStepInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addScStep(); } }}
                    placeholder="Example: Wait for A+ setup confirmation before opening" className="flex-1" />
                  <button onClick={addScStep} disabled={!scStepInput.trim()}
                    className="flex items-center gap-1.5 px-4 py-2 bg-[var(--muted)] hover:bg-[var(--muted)]/80 border border-[var(--border)] rounded-lg text-sm font-medium transition-colors disabled:opacity-50 shrink-0">
                    <Plus size={14} /> Add
                  </button>
                </div>

                {/* Added steps as cards */}
                {scSteps.length > 0 && (
                  <div className="space-y-2">
                    {scSteps.map((step, i) => (
                      <div key={i} className="bg-[var(--muted)] border border-[var(--border)] rounded-xl p-3">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <div className="flex items-center gap-2">
                            <div className="p-1 rounded bg-[var(--card)] cursor-grab">
                              <BarChart3 size={12} className="text-[var(--muted-foreground)] rotate-90" />
                            </div>
                            <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--muted-foreground)]">Step {i + 1}</p>
                          </div>
                          <button onClick={() => setScSteps(prev => prev.filter((_, idx) => idx !== i))}
                            className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors">
                            Remove
                          </button>
                        </div>
                        <textarea value={step} onChange={e => setScSteps(prev => prev.map((s, idx) => idx === i ? e.target.value : s))}
                          rows={2} className="w-full text-sm mt-1" />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Right sidebar (2/5) */}
            <div className="lg:col-span-2 space-y-4">
              {/* Strategy Sequence Preview */}
              <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--muted-foreground)] mb-3">Strategy Sequence Preview</p>
                {scSteps.length === 0 ? (
                  <p className="text-xs text-[var(--muted-foreground)]">No steps added yet. Type a step and click Add.</p>
                ) : (
                  <div className="space-y-2">
                    {scSteps.map((step, i) => (
                      <div key={i} className="bg-[var(--accent)]/10 border border-[var(--accent)]/20 rounded-lg p-3">
                        <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--accent)] mb-0.5">Step {i + 1}</p>
                        <p className="text-sm">{step}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Quality Checklist */}
              <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--muted-foreground)] mb-3">Quality Checklist</p>
                <div className="space-y-2.5">
                  {[
                    { label: '1. Name by scenario, not by indicator.', ok: !!scName.trim() },
                    { label: '2. Keep each step action-oriented and unambiguous.', ok: scSteps.length > 0 },
                    { label: '3. Keep step order realistic for live execution.', ok: scSteps.length >= 2 },
                  ].map((c, i) => (
                    <p key={i} className={`text-xs ${c.ok ? 'text-[var(--foreground)]' : 'text-[var(--muted-foreground)]'}`}>{c.label}</p>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-[var(--border)]">
            <button onClick={() => setStratComposerOpen(false)}
              className="px-5 py-2.5 text-sm border border-[var(--border)] rounded-lg hover:bg-[var(--muted)]">Cancel</button>
            <button onClick={saveStratComposer} disabled={!scName.trim() || scSteps.length === 0}
              className="px-5 py-2.5 text-sm bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors disabled:opacity-50">
              Create Strategy
            </button>
          </div>
        </div>
      </Modal>

      {/* ══════════ ACTIVATION MIXER ══════════ */}
      <Modal isOpen={activationMixerOpen} onClose={() => setActivationMixerOpen(false)} title="" size="xl">
        <div>
          {/* Header badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--accent)]/20 text-[10px] font-semibold uppercase tracking-widest text-[var(--accent)] mb-3">
            <Zap size={12} /> Activation Mixer
          </div>
          <h2 className="text-2xl font-bold mb-1">Add Templates</h2>
          <p className="text-sm text-[var(--muted-foreground)] mb-6">Select one or more templates, then set priorities per item or in bulk.</p>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: template list (2/3) */}
            <div className="lg:col-span-2 space-y-4">
              {/* Search + bulk actions */}
              <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4">
                <div className="flex items-center justify-end gap-2 mb-3">
                  <button onClick={() => { const visible = strategies.filter(s => !amSearch || s.name.toLowerCase().includes(amSearch.toLowerCase())); setAmSelected(visible.map(s => s.id)); }}
                    className="px-3 py-1.5 text-xs bg-[var(--muted)] hover:bg-[var(--muted)]/80 rounded-lg">Select Visible</button>
                  <button onClick={() => setAmSelected([])} className="px-3 py-1.5 text-xs bg-[var(--muted)] hover:bg-[var(--muted)]/80 rounded-lg">Clear</button>
                </div>
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]" />
                  <input value={amSearch} onChange={e => setAmSearch(e.target.value)} placeholder="Search templates by name or description..." className="w-full pl-9" />
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
                      <div key={strategy.id}
                        className={`rounded-xl border p-4 transition-all ${
                          selected ? 'border-[var(--accent)] bg-[var(--accent)]/5' : 'border-[var(--border)] bg-[var(--card)] hover:border-[var(--accent)]/30'
                        }`}>
                        <div className="flex items-start gap-3">
                          {/* Checkbox */}
                          <button onClick={() => setAmSelected(prev => selected ? prev.filter(id => id !== strategy.id) : [...prev, strategy.id])}
                            className={`mt-1 w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 ${
                              selected ? 'border-[var(--accent)] bg-[var(--accent)]' : 'border-[var(--muted-foreground)]'
                            }`}>
                            {selected && <Check size={12} className="text-white" />}
                          </button>
                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <p className="text-sm font-bold">{strategy.name}</p>
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-cyan-400">RULESET</span>
                              {selected && <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-green-500/20 text-green-400">ACTIVE</span>}
                              {!selected && <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[var(--muted)] text-[var(--muted-foreground)]">SAVED</span>}
                            </div>
                            <p className="text-xs text-[var(--muted-foreground)] mb-2">{getStrategyDescription(strategy)}</p>
                            {/* Per-item priority */}
                            <div className="flex gap-1.5">
                              {(['P1', 'P2', 'P3'] as const).map(p => (
                                <button key={p}
                                  onClick={() => setAmItemPriorities(prev => ({ ...prev, [strategy.id]: p }))}
                                  className={`px-2.5 py-1 rounded-full text-[10px] font-bold border transition-colors ${
                                    itemPriority === p
                                      ? 'border-[var(--accent)] bg-[var(--accent)] text-white'
                                      : 'border-[var(--border)] bg-[var(--muted)] text-[var(--muted-foreground)] hover:border-[var(--accent)]/30'
                                  }`}>{p}</button>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                {strategies.length === 0 && (
                  <div className="py-12 text-center text-[var(--muted-foreground)] text-sm">
                    No templates available. Create a rule set or strategy first.
                  </div>
                )}
              </div>
            </div>

            {/* Right sidebar (1/3) */}
            <div className="space-y-4">
              {/* Selection count */}
              <div className="bg-[var(--accent)]/10 border border-[var(--accent)]/20 rounded-xl p-4">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--muted-foreground)] mb-1">Selection</p>
                <p className="text-3xl font-bold mb-0.5">{amSelected.length}</p>
                <p className="text-xs text-[var(--muted-foreground)]">templates selected</p>
              </div>

              {/* Global Priority */}
              <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--muted-foreground)] mb-3">Global Priority</p>
                <div className="flex gap-1.5 mb-3">
                  {(['High', 'Medium', 'Low'] as ActivationPriority[]).map(p => (
                    <button key={p} onClick={() => setAmPriority(p)}
                      className={`flex-1 py-2 rounded-lg text-xs font-medium border transition-all ${
                        amPriority === p
                          ? p === 'High' ? 'border-red-400 bg-red-500/10 text-red-400'
                            : p === 'Medium' ? 'border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]'
                            : 'border-blue-400 bg-blue-500/10 text-blue-400'
                          : 'border-[var(--border)] bg-[var(--muted)] text-[var(--muted-foreground)]'
                      }`}>{p} priority</button>
                  ))}
                </div>
                <button onClick={applyGlobalPriority}
                  className="flex items-center gap-1.5 text-xs text-[var(--accent)] hover:underline">
                  <ChevronDown size={12} /> Apply Global Priority To Selected
                </button>
              </div>

              {/* Selected Items */}
              <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--muted-foreground)] mb-3">Selected Items</p>
                {amSelected.length === 0 ? (
                  <p className="text-xs text-[var(--muted-foreground)]">No templates selected.</p>
                ) : (
                  <div className="space-y-2">
                    {amSelected.map(id => {
                      const s = strategies.find(st => st.id === id);
                      if (!s) return null;
                      const p = amItemPriorities[id] ?? 'P2';
                      return (
                        <div key={id} className="flex items-center justify-between bg-[var(--muted)] rounded-lg px-3 py-2.5">
                          <div className="min-w-0 mr-2">
                            <p className="text-xs font-bold truncate">{s.name}</p>
                            <p className="text-[10px] text-[var(--muted-foreground)]">{getStrategyDescription(s)}</p>
                          </div>
                          <span className="text-xs font-bold text-[var(--accent)] shrink-0">{p}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-between mt-6 pt-4 border-t border-[var(--border)]">
            <button onClick={() => setActivationMixerOpen(false)}
              className="px-4 py-2 text-sm rounded-lg hover:bg-[var(--muted)]">Cancel</button>
            <button onClick={handleActivate} disabled={amSelected.length === 0}
              className="flex items-center gap-1.5 px-5 py-2.5 text-sm bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors disabled:opacity-50">
              <Zap size={14} /> Activate {amSelected.length > 0 ? `(${amSelected.length})` : ''}
            </button>
          </div>
        </div>
      </Modal>

      {/* ══════════ ACTIVE RULESET DETAILS MODAL ══════════ */}
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
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--accent)]/20 text-[10px] font-semibold uppercase tracking-widest text-[var(--accent)] mb-3">
                <Layers size={12} /> Active Ruleset
              </div>
              <h2 className="text-2xl font-bold mb-0.5">{strategy.name}</h2>
              <p className="text-sm text-[var(--muted-foreground)] mb-6">{getStrategyDescription(strategy)}</p>

              {/* Progress bar */}
              <div className="h-2 rounded-full bg-[var(--muted)] overflow-hidden mb-6">
                <div className={`h-full rounded-full transition-all ${compliancePct >= 80 ? 'bg-green-400' : compliancePct >= 50 ? 'bg-cyan-400' : 'bg-red-400'}`} style={{ width: `${compliancePct}%` }} />
              </div>

              {/* 4 Stat Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
                <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--muted-foreground)] mb-2">Compliance</p>
                  <p className="text-3xl font-bold">{compliancePct}%</p>
                </div>
                <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--muted-foreground)] mb-2">Rules Met</p>
                  <p className="text-3xl font-bold">{metRules}/{totalRules}</p>
                </div>
                <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--muted-foreground)] mb-2">Violations</p>
                  <p className="text-3xl font-bold">{violationCount}</p>
                </div>
                <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--muted-foreground)] mb-2">Health</p>
                  <p className="text-3xl font-bold">{healthPct}%</p>
                </div>
              </div>

              {/* Ruleset Priority */}
              <div className="bg-[var(--accent)]/5 border border-[var(--accent)]/20 rounded-xl p-4 mb-6">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-green-400 mb-3">Ruleset Priority</p>
                <div className="flex gap-2">
                  {(['High', 'Medium', 'Low'] as const).map(p => (
                    <button key={p}
                      className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
                        p === 'Medium'
                          ? 'border-[var(--accent)] bg-[var(--accent)] text-white'
                          : 'border-[var(--border)] bg-[var(--muted)] text-[var(--muted-foreground)]'
                      }`}>{p} priority</button>
                  ))}
                </div>
              </div>

              {/* Tracking Start */}
              <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 mb-6">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--muted-foreground)] mb-3">Tracking Start</p>
                <div className="flex items-center gap-3">
                  <input type="datetime-local" defaultValue={format(new Date(strategy.createdAt), "yyyy-MM-dd'T'HH:mm")}
                    className="bg-[var(--muted)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm" />
                  <button className="px-4 py-2 text-sm bg-[var(--accent)] text-white rounded-lg hover:bg-[var(--accent-hover)]">Save Start</button>
                </div>
                <p className="text-[10px] text-[var(--muted-foreground)] mt-2">Evidence and compliance are tracked from this timestamp forward.</p>
              </div>

              {/* Per Rule Performance + Evidence Library */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
                {/* Per Rule Performance */}
                <div className="bg-[var(--card)] border border-[var(--accent)]/20 rounded-xl p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-green-400 mb-4">Per Rule Performance</p>
                  <div className="space-y-3">
                    {ruleBreakdown.map((rb, i) => {
                      const status = rb.compliance >= 80 ? 'ON TRACK' : rb.compliance >= 50 ? 'BUILDING' : 'AT RISK';
                      const statusColor = status === 'ON TRACK' ? 'bg-green-500/20 text-green-400' : status === 'BUILDING' ? 'bg-cyan-500/20 text-cyan-400' : 'bg-red-500/20 text-red-400';
                      return (
                        <div key={i} className="bg-[var(--muted)] rounded-xl p-3">
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-sm font-bold">{rb.rule.length > 35 ? rb.rule.slice(0, 35) + '...' : rb.rule}</p>
                            <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold ${statusColor}`}>{status}</span>
                          </div>
                          <p className="text-[10px] text-[var(--muted-foreground)] mb-2">
                            {rb.compliance}% compliance &middot; {rb.violations} violations &middot; Last: {rb.lastHit}
                          </p>
                          <div className="flex gap-1.5">
                            <span className="px-2 py-0.5 rounded-full text-[10px] bg-[var(--card)] border border-[var(--border)] text-[var(--muted-foreground)]">Evidence: {rb.total - rb.met}</span>
                            {(['P1', 'P2', 'P3'] as const).map(p => (
                              <span key={p} className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                p === 'P2' ? 'border-[var(--accent)] bg-[var(--accent)] text-white' : 'border-[var(--border)] bg-[var(--card)] text-[var(--muted-foreground)]'
                              }`}>{p}</span>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                    {ruleBreakdown.length === 0 && (
                      <p className="text-xs text-[var(--muted-foreground)]">No rules defined in this strategy.</p>
                    )}
                  </div>
                </div>

                {/* Evidence Library */}
                <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--muted-foreground)] mb-4">Evidence Library</p>
                  {evidenceTrades.length === 0 ? (
                    <p className="text-xs text-[var(--muted-foreground)]">No violations recorded. Clean compliance!</p>
                  ) : (
                    <div className="space-y-3">
                      {evidenceTrades.slice(0, 5).map(trade => {
                        const brokenRules = trade.ruleChecklist.filter(rc => rc.compliance === 'no').map(rc => rc.rule);
                        return (
                          <div key={trade.id} className="bg-[var(--muted)] rounded-xl p-3">
                            <div className="flex items-center justify-between mb-1">
                              <p className="text-sm font-bold">{brokenRules[0] || 'Rule violation'}</p>
                              <span className="text-[10px] text-[var(--muted-foreground)]">{format(new Date(trade.exitDate ?? trade.createdAt), 'MM/dd/yyyy')}</span>
                            </div>
                            <p className="text-xs text-[var(--muted-foreground)] mb-2">
                              {trade.coin} &middot; {trade.actualPnL !== null ? formatCurrency(trade.actualPnL) : 'Open'} &middot; {trade.strategy}
                            </p>
                            <div className="flex gap-1.5">
                              {brokenRules.map((r, j) => (
                                <span key={j} className="px-2 py-0.5 rounded-full text-[10px] bg-red-500/10 text-red-400 border border-red-500/20">{r.length > 20 ? r.slice(0, 20) + '...' : r}</span>
                              ))}
                            </div>
                            <p className="text-[10px] text-[var(--muted-foreground)] mt-1">Trade: {trade.id}</p>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border)]">
                <button onClick={() => { setDetailsStrategyId(null); scrollToSection('Rules Library'); }}
                  className="flex items-center gap-1.5 px-5 py-2.5 text-sm bg-[var(--accent)] text-white rounded-lg hover:bg-[var(--accent-hover)]">
                  Open Rules Library
                </button>
                <button onClick={() => setDetailsStrategyId(null)}
                  className="px-5 py-2.5 text-sm border border-[var(--border)] rounded-lg hover:bg-[var(--muted)]">Close</button>
              </div>
            </div>
          );
        })()}
      </Modal>
    </div>
  );
}
