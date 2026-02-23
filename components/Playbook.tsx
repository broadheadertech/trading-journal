'use client';

import { useState, useMemo } from 'react';
import { Strategy, StrategyType, Trade } from '@/lib/types';
import { STRATEGY_TYPES } from '@/lib/utils';
import { Plus, Edit2, Trash2, X, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react';
import Modal from './ui/Modal';
import { useToast } from './ui/Toast';
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';

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
  const { showToast } = useToast();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyStrategy);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const openAdd = () => {
    setForm(emptyStrategy);
    setEditingId(null);
    setIsModalOpen(true);
  };

  const openEdit = (strategy: Strategy) => {
    setForm({
      name: strategy.name,
      type: strategy.type,
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
    const clean = {
      ...form,
      rules: form.rules.filter(r => r.trim()),
      entryChecklist: form.entryChecklist.filter(r => r.trim()),
      exitChecklist: form.exitChecklist.filter(r => r.trim()),
    };
    if (editingId) {
      onUpdate(editingId, clean);
      showToast('Strategy updated');
    } else {
      onAdd(clean);
      showToast('Strategy created');
    }
    setIsModalOpen(false);
  };

  const handleDeleteConfirm = (id: string) => {
    onDelete(id);
    setDeleteConfirm(null);
    showToast('Strategy deleted');
  };

  const addListItem = (field: 'rules' | 'entryChecklist' | 'exitChecklist') => {
    setForm(prev => ({ ...prev, [field]: [...prev[field], ''] }));
  };

  const updateListItem = (field: 'rules' | 'entryChecklist' | 'exitChecklist', index: number, value: string) => {
    setForm(prev => ({
      ...prev,
      [field]: prev[field].map((item, i) => (i === index ? value : item)),
    }));
  };

  const removeListItem = (field: 'rules' | 'entryChecklist' | 'exitChecklist', index: number) => {
    setForm(prev => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index),
    }));
  };

  const ListEditor = ({ label, field }: { label: string; field: 'rules' | 'entryChecklist' | 'exitChecklist' }) => (
    <div>
      <label className="block text-sm font-medium text-[var(--foreground)] mb-2">{label}</label>
      <div className="space-y-2">
        {form[field].map((item, i) => (
          <div key={i} className="flex gap-2">
            <input
              value={item}
              onChange={e => updateListItem(field, i, e.target.value)}
              placeholder={`${label} item ${i + 1}`}
              className="flex-1"
            />
            {form[field].length > 1 && (
              <button onClick={() => removeListItem(field, i)} className="p-2 text-[var(--red)] hover:bg-red-500/10 rounded-lg">
                <X size={16} />
              </button>
            )}
          </div>
        ))}
        <button onClick={() => addListItem(field)} className="text-sm text-[var(--accent)] hover:underline flex items-center gap-1">
          <Plus size={14} /> Add item
        </button>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Trading Playbook</h2>
          <p className="text-sm text-[var(--muted-foreground)]">Define your strategies, rules, and criteria</p>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white rounded-lg text-sm font-medium transition-colors">
          <Plus size={16} /> Add Strategy
        </button>
      </div>

      {strategies.length === 0 ? (
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-12 text-center">
          <BookIcon />
          <p className="text-[var(--muted-foreground)] mt-4 mb-3">No strategies yet</p>
          <button onClick={openAdd} className="text-[var(--accent)] hover:underline text-sm">Create your first strategy</button>
        </div>
      ) : (
        <div className="grid gap-4">
          {strategies.map(strategy => (
            <div key={strategy.id} className="bg-[var(--card)] border border-[var(--border)] rounded-xl overflow-hidden hover:border-[var(--accent)]/30 transition-colors">
              <div
                className="p-3.5 sm:p-5 flex items-center justify-between cursor-pointer"
                onClick={() => setExpandedId(expandedId === strategy.id ? null : strategy.id)}
              >
                <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-[var(--accent)]/15 flex items-center justify-center text-[var(--accent)] shrink-0">
                    {strategy.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-semibold text-sm sm:text-base truncate">{strategy.name}</h3>
                    <div className="flex items-center gap-2 text-xs text-[var(--muted-foreground)]">
                      <span className="px-2 py-0.5 rounded-full bg-[var(--muted)] border border-[var(--border)]">{strategy.type}</span>
                      <span>{strategy.rules.length} rules</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                  <button onClick={(e) => { e.stopPropagation(); openEdit(strategy); }} className="p-1.5 sm:p-2 hover:bg-[var(--muted)] rounded-lg text-[var(--muted-foreground)]">
                    <Edit2 size={16} />
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); setDeleteConfirm(strategy.id); }} className="p-1.5 sm:p-2 hover:bg-red-500/10 rounded-lg text-[var(--red)]">
                    <Trash2 size={16} />
                  </button>
                  {expandedId === strategy.id ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </div>
              </div>
              {expandedId === strategy.id && (
                <div className="px-5 pb-5 pt-0 border-t border-[var(--border)] space-y-4 animate-in">
                  {/* ── Performance Stats ── */}
                  <div>
                    <h4 className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wide mb-3 pt-4">Performance</h4>
                    <StrategyStats strategy={strategy} trades={trades} />
                  </div>

                  {/* ── Strategy Rules ── */}
                  {(strategy.rules.length > 0 || strategy.entryChecklist.length > 0 || strategy.exitChecklist.length > 0 || Object.values(strategy.riskParams).some(v => v !== undefined)) && (
                    <div className="border-t border-[var(--border)] pt-4 space-y-4">
                      <h4 className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wide">Rules & Criteria</h4>
                      {strategy.rules.length > 0 && (
                        <div>
                          <h5 className="text-sm font-medium text-[var(--muted-foreground)] mb-2">Rules</h5>
                          <ul className="space-y-1">
                            {strategy.rules.map((rule, i) => (
                              <li key={i} className="text-sm flex items-start gap-2">
                                <span className="text-[var(--accent)] mt-0.5">&#x2022;</span> {rule}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {strategy.entryChecklist.length > 0 && (
                        <div>
                          <h5 className="text-sm font-medium text-[var(--muted-foreground)] mb-2">Entry Criteria</h5>
                          <ul className="space-y-1">
                            {strategy.entryChecklist.map((item, i) => (
                              <li key={i} className="text-sm flex items-start gap-2">
                                <span className="text-[var(--green)] mt-0.5">&#x2713;</span> {item}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {strategy.exitChecklist.length > 0 && (
                        <div>
                          <h5 className="text-sm font-medium text-[var(--muted-foreground)] mb-2">Exit Criteria</h5>
                          <ul className="space-y-1">
                            {strategy.exitChecklist.map((item, i) => (
                              <li key={i} className="text-sm flex items-start gap-2">
                                <span className="text-[var(--red)] mt-0.5">&#x2717;</span> {item}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {Object.values(strategy.riskParams).some(v => v !== undefined) && (
                        <div>
                          <h5 className="text-sm font-medium text-[var(--muted-foreground)] mb-2">Risk Parameters</h5>
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            {strategy.riskParams.maxPositionSize && <div>Max Position: ${strategy.riskParams.maxPositionSize}</div>}
                            {strategy.riskParams.maxLossPercent && <div>Max Loss: {strategy.riskParams.maxLossPercent}%</div>}
                            {strategy.riskParams.riskRewardRatio && <div>R:R Ratio: {strategy.riskParams.riskRewardRatio}</div>}
                            {strategy.riskParams.maxDailyLoss && <div>Max Daily Loss: ${strategy.riskParams.maxDailyLoss}</div>}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Strategy Form Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingId ? 'Edit Strategy' : 'New Strategy'} size="lg">
        <div className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Strategy Name</label>
              <input value={form.name} onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))} placeholder="e.g., Breakout Scalp" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Type</label>
              <select value={form.type} onChange={e => setForm(prev => ({ ...prev, type: e.target.value as StrategyType }))}>
                {STRATEGY_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
          </div>
          <ListEditor label="Rules" field="rules" />
          <ListEditor label="Entry Criteria" field="entryChecklist" />
          <ListEditor label="Exit Criteria" field="exitChecklist" />
          <div>
            <label className="block text-sm font-medium text-[var(--foreground)] mb-2">Risk Parameters</label>
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
    </div>
  );
}

// ── Per-strategy analytics panel ──────────────────────────────────────────────

function StrategyStats({ strategy, trades }: { strategy: Strategy; trades: Trade[] }) {
  const stratTrades = useMemo(
    () =>
      trades
        .filter(t => !t.isOpen && t.strategy === strategy.name && t.actualPnL !== null && t.exitDate)
        .sort((a, b) => new Date(a.exitDate!).getTime() - new Date(b.exitDate!).getTime()),
    [trades, strategy.name]
  );

  const stats = useMemo(() => {
    if (stratTrades.length === 0) return null;

    const wins = stratTrades.filter(t => (t.actualPnLPercent ?? 0) > 0).length;
    const winRate = Math.round((wins / stratTrades.length) * 100);
    const totalPnL = stratTrades.reduce((s, t) => s + (t.actualPnL ?? 0), 0);
    const avgReturn = stratTrades.reduce((s, t) => s + (t.actualPnLPercent ?? 0), 0) / stratTrades.length;

    const sorted = [...stratTrades].sort((a, b) => (b.actualPnLPercent ?? 0) - (a.actualPnLPercent ?? 0));
    const best = sorted[0];
    const worst = sorted[sorted.length - 1];

    // Cumulative equity curve
    let cumulative = 0;
    const equityCurve = stratTrades.map(t => {
      cumulative += t.actualPnL ?? 0;
      return { date: t.exitDate!.slice(0, 10), value: Math.round(cumulative) };
    });

    // Day-of-week win rate
    const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dayStats = DAY_NAMES.map((name, i) => {
      const dayTrades = stratTrades.filter(t => new Date(t.exitDate!).getDay() === i);
      const dayWins = dayTrades.filter(t => (t.actualPnLPercent ?? 0) > 0).length;
      return {
        name,
        count: dayTrades.length,
        winRate: dayTrades.length > 0 ? Math.round((dayWins / dayTrades.length) * 100) : -1,
      };
    }).filter(d => d.count > 0);

    // Edge degradation (3 terciles)
    let degradation: { r1: number; r2: number; r3: number } | null = null;
    if (stratTrades.length >= 9) {
      const n = Math.floor(stratTrades.length / 3);
      const wr = (pool: typeof stratTrades) => {
        const w = pool.filter(t => (t.actualPnLPercent ?? 0) > 0).length;
        return Math.round((w / pool.length) * 100);
      };
      const r1 = wr(stratTrades.slice(0, n));
      const r2 = wr(stratTrades.slice(n, 2 * n));
      const r3 = wr(stratTrades.slice(2 * n));
      if (r1 > r2 && r2 > r3 && r1 - r3 >= 10) {
        degradation = { r1, r2, r3 };
      }
    }

    return { wins, winRate, totalPnL, avgReturn, best, worst, equityCurve, dayStats, degradation };
  }, [stratTrades]);

  if (stratTrades.length === 0) {
    return (
      <p className="text-xs text-[var(--muted-foreground)] py-1">
        No completed trades tagged with this strategy yet.
      </p>
    );
  }

  if (!stats) return null;

  return (
    <div className="space-y-4">
      {/* Edge degradation warning */}
      {stats.degradation && (
        <div className="flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-400">
          <AlertTriangle size={14} className="mt-0.5 shrink-0" />
          <span>
            <strong>Edge drift detected</strong> — win rate declining across recent trades:{' '}
            {stats.degradation.r1}% → {stats.degradation.r2}% → {stats.degradation.r3}%.
            Consider reviewing or retiring this strategy.
          </span>
        </div>
      )}

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <div className="bg-[var(--muted)]/60 rounded-xl p-2.5 text-center">
          <div className="text-xl font-bold">{stratTrades.length}</div>
          <div className="text-[10px] text-[var(--muted-foreground)] mt-0.5">Trades</div>
        </div>
        <div className="bg-[var(--muted)]/60 rounded-xl p-2.5 text-center">
          <div className={`text-xl font-bold ${stats.winRate >= 50 ? 'text-[var(--green)]' : 'text-[var(--red)]'}`}>
            {stats.winRate}%
          </div>
          <div className="text-[10px] text-[var(--muted-foreground)] mt-0.5">Win Rate</div>
        </div>
        <div className="bg-[var(--muted)]/60 rounded-xl p-2.5 text-center">
          <div className={`text-xl font-bold ${stats.avgReturn >= 0 ? 'text-[var(--green)]' : 'text-[var(--red)]'}`}>
            {stats.avgReturn >= 0 ? '+' : ''}{stats.avgReturn.toFixed(1)}%
          </div>
          <div className="text-[10px] text-[var(--muted-foreground)] mt-0.5">Avg Return</div>
        </div>
        <div className="bg-[var(--muted)]/60 rounded-xl p-2.5 text-center">
          <div className={`text-xl font-bold ${stats.totalPnL >= 0 ? 'text-[var(--green)]' : 'text-[var(--red)]'}`}>
            {stats.totalPnL >= 0 ? '+' : ''}${Math.abs(Math.round(stats.totalPnL)).toLocaleString()}
          </div>
          <div className="text-[10px] text-[var(--muted-foreground)] mt-0.5">Total P&L</div>
        </div>
      </div>

      {/* Equity curve */}
      {stats.equityCurve.length > 1 && (
        <div>
          <h5 className="text-[10px] font-medium text-[var(--muted-foreground)] uppercase tracking-wide mb-2">Equity Curve</h5>
          <div className="h-[70px]">
            <ResponsiveContainer>
              <LineChart data={stats.equityCurve}>
                <XAxis dataKey="date" hide />
                <YAxis hide />
                <Tooltip
                  contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '11px' }}
                  formatter={(value: number | undefined) => [`$${(value ?? 0).toLocaleString()}`, 'Cumulative P&L']}
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke={stats.totalPnL >= 0 ? '#2dd4bf' : '#fb923c'}
                  dot={false}
                  strokeWidth={1.5}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Best / Worst trades */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-3">
          <div className="text-[10px] text-green-400 font-medium uppercase tracking-wide mb-1">Best Trade</div>
          <div className="text-sm font-bold text-[var(--green)]">
            +{(stats.best.actualPnLPercent ?? 0).toFixed(1)}%
          </div>
          <div className="text-[10px] text-[var(--muted-foreground)] mt-0.5">
            {stats.best.coin} · {stats.best.exitDate?.slice(0, 10)}
          </div>
        </div>
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3">
          <div className="text-[10px] text-red-400 font-medium uppercase tracking-wide mb-1">Worst Trade</div>
          <div className="text-sm font-bold text-[var(--red)]">
            {(stats.worst.actualPnLPercent ?? 0).toFixed(1)}%
          </div>
          <div className="text-[10px] text-[var(--muted-foreground)] mt-0.5">
            {stats.worst.coin} · {stats.worst.exitDate?.slice(0, 10)}
          </div>
        </div>
      </div>

      {/* Day-of-week win rate */}
      {stats.dayStats.length > 0 && (
        <div>
          <h5 className="text-[10px] font-medium text-[var(--muted-foreground)] uppercase tracking-wide mb-2">Win Rate by Day</h5>
          <div className="flex gap-1.5">
            {stats.dayStats.map(d => (
              <div key={d.name} className="flex-1 text-center">
                <div
                  className="rounded-lg py-2 mb-1 text-xs font-semibold"
                  style={{
                    backgroundColor:
                      d.winRate >= 60 ? 'rgba(45,212,191,0.25)' :
                      d.winRate >= 40 ? 'rgba(250,204,21,0.25)' :
                      'rgba(251,146,60,0.25)',
                    color:
                      d.winRate >= 60 ? '#2dd4bf' :
                      d.winRate >= 40 ? '#fbbf24' :
                      '#fb923c',
                  }}
                >
                  {d.winRate}%
                </div>
                <div className="text-[9px] text-[var(--muted-foreground)]">{d.name}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function BookIcon() {
  return (
    <div className="w-16 h-16 rounded-full bg-[var(--muted)] flex items-center justify-center mx-auto text-[var(--muted-foreground)]">
      <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
      </svg>
    </div>
  );
}
