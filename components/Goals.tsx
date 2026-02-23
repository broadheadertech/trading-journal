'use client';

import { useState, useMemo } from 'react';
import { MonthlyGoal, Trade } from '@/lib/types';
import { format, getDaysInMonth, getDate, parseISO } from 'date-fns';
import { Target, Flag, Edit2, CheckCircle, XCircle } from 'lucide-react';
import Modal from './ui/Modal';
import { useToast } from './ui/Toast';

interface Props {
  goals: MonthlyGoal[];
  trades: Trade[];
  onAdd: (goal: Omit<MonthlyGoal, 'id' | 'createdAt'>) => void;
  onUpdate: (id: string, updates: Partial<MonthlyGoal>) => void;
}

export default function Goals({ goals, trades, onAdd, onUpdate }: Props) {
  const { showToast } = useToast();
  const [isFormOpen, setIsFormOpen] = useState(false);

  // Form state
  const [formPnL, setFormPnL] = useState('');
  const [formWinRate, setFormWinRate] = useState('');
  const [formMaxLoss, setFormMaxLoss] = useState('');
  const [formTradeCount, setFormTradeCount] = useState('');

  const currentMonth = format(new Date(), 'yyyy-MM');
  const currentMonthLabel = format(new Date(), 'MMMM yyyy');
  const currentGoal = goals.find(g => g.month === currentMonth) ?? null;

  const daysInMonth = getDaysInMonth(new Date());
  const dayOfMonth = getDate(new Date());
  const daysLeft = daysInMonth - dayOfMonth;
  const monthProgress = Math.round((dayOfMonth / daysInMonth) * 100);

  // Current month stats from trades
  const currentStats = useMemo(() => {
    const closed = trades.filter(
      t => !t.isOpen && t.exitDate?.startsWith(currentMonth) && t.actualPnL !== null
    );
    const pnl = closed.reduce((s, t) => s + (t.actualPnL ?? 0), 0);
    const wins = closed.filter(t => (t.actualPnLPercent ?? 0) > 0).length;
    const winRate = closed.length > 0 ? Math.round((wins / closed.length) * 100) : 0;
    return { pnl, winRate, tradeCount: closed.length };
  }, [trades, currentMonth]);

  // Past months (up to 6)
  const history = useMemo(() => {
    const closed = trades.filter(t => !t.isOpen && t.exitDate);
    const monthSet = new Set<string>([
      ...closed.map(t => t.exitDate!.slice(0, 7)),
      ...goals.map(g => g.month),
    ]);
    monthSet.delete(currentMonth);
    return [...monthSet]
      .sort()
      .reverse()
      .slice(0, 6)
      .map(month => {
        const mt = closed.filter(t => t.exitDate!.startsWith(month));
        const pnl = mt.reduce((s, t) => s + (t.actualPnL ?? 0), 0);
        const wins = mt.filter(t => (t.actualPnLPercent ?? 0) > 0).length;
        const winRate = mt.length > 0 ? Math.round((wins / mt.length) * 100) : 0;
        const goal = goals.find(g => g.month === month) ?? null;
        const label = format(parseISO(month + '-15'), 'MMMM yyyy');
        return { month, label, pnl, winRate, tradeCount: mt.length, goal };
      });
  }, [trades, goals, currentMonth]);

  const openForm = () => {
    if (currentGoal) {
      setFormPnL(currentGoal.pnlTarget?.toString() ?? '');
      setFormWinRate(currentGoal.winRateTarget?.toString() ?? '');
      setFormMaxLoss(currentGoal.maxMonthlyLoss?.toString() ?? '');
      setFormTradeCount(currentGoal.tradeCountTarget?.toString() ?? '');
    } else {
      setFormPnL('');
      setFormWinRate('');
      setFormMaxLoss('');
      setFormTradeCount('');
    }
    setIsFormOpen(true);
  };

  const handleSave = () => {
    const data = {
      month: currentMonth,
      pnlTarget: formPnL ? parseFloat(formPnL) : null,
      winRateTarget: formWinRate ? parseFloat(formWinRate) : null,
      maxMonthlyLoss: formMaxLoss ? parseFloat(formMaxLoss) : null,
      tradeCountTarget: formTradeCount ? parseInt(formTradeCount) : null,
    };
    if (currentGoal) {
      onUpdate(currentGoal.id, data);
      showToast('Goals updated');
    } else {
      onAdd(data);
      showToast('Goals set!');
    }
    setIsFormOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Target size={22} className="text-[var(--accent)]" />
            Goals & Progress
          </h2>
          <p className="text-sm text-[var(--muted-foreground)]">Set monthly targets and track your performance</p>
        </div>
        <button
          onClick={openForm}
          className="flex items-center gap-2 px-4 py-2 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white rounded-lg text-sm font-medium transition-colors"
        >
          {currentGoal ? <Edit2 size={14} /> : <Flag size={14} />}
          {currentGoal ? 'Edit Goals' : 'Set Goals'}
        </button>
      </div>

      {/* Current Month Card */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5">
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-semibold text-base">{currentMonthLabel}</h3>
          {currentStats.tradeCount > 0 && (
            <span className="text-xs text-[var(--muted-foreground)] bg-[var(--muted)] px-2.5 py-1 rounded-full">
              {currentStats.tradeCount} trade{currentStats.tradeCount !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        <p className="text-xs text-[var(--muted-foreground)] mb-4">
          {daysLeft} day{daysLeft !== 1 ? 's' : ''} remaining · {monthProgress}% through the month
        </p>

        {!currentGoal ? (
          <div className="text-center py-8">
            <div className="w-12 h-12 rounded-full bg-[var(--accent)]/10 flex items-center justify-center mx-auto mb-3">
              <Flag size={22} className="text-[var(--accent)]" />
            </div>
            <p className="text-sm text-[var(--muted-foreground)] mb-3">
              No goals set for {currentMonthLabel}
            </p>
            <button
              onClick={openForm}
              className="text-sm text-[var(--accent)] hover:underline font-medium"
            >
              Set your goals →
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* P&L Target */}
            {currentGoal.pnlTarget !== null && (() => {
              const pct = (currentStats.pnl / currentGoal.pnlTarget!) * 100;
              const status =
                currentStats.pnl >= currentGoal.pnlTarget! ? 'achieved' :
                pct >= 60 ? 'on-track' :
                currentStats.pnl >= 0 ? 'behind' : 'at-risk';
              return (
                <GoalCard
                  label="P&L Target"
                  current={`${currentStats.pnl >= 0 ? '+' : ''}$${Math.abs(Math.round(currentStats.pnl)).toLocaleString()}`}
                  target={`$${currentGoal.pnlTarget!.toLocaleString()}`}
                  progress={pct}
                  status={status}
                />
              );
            })()}

            {/* Win Rate */}
            {currentGoal.winRateTarget !== null && (() => {
              const pct = (currentStats.winRate / currentGoal.winRateTarget!) * 100;
              const status =
                currentStats.tradeCount < 3 ? 'pending' :
                currentStats.winRate >= currentGoal.winRateTarget! ? 'achieved' :
                currentStats.winRate >= currentGoal.winRateTarget! - 10 ? 'on-track' : 'behind';
              return (
                <GoalCard
                  label="Win Rate"
                  current={`${currentStats.winRate}%`}
                  target={`${currentGoal.winRateTarget}%`}
                  progress={pct}
                  status={status}
                  note={currentStats.tradeCount < 3 ? 'Need 3+ trades to track' : undefined}
                />
              );
            })()}

            {/* Max Monthly Loss */}
            {currentGoal.maxMonthlyLoss !== null && (() => {
              const lossAmt = Math.max(0, -currentStats.pnl);
              const pct = (lossAmt / currentGoal.maxMonthlyLoss!) * 100;
              const status =
                currentStats.pnl >= 0 ? 'on-track' :
                pct >= 100 ? 'at-risk' :
                pct >= 75 ? 'behind' : 'on-track';
              const statusLabel =
                currentStats.pnl >= 0 ? 'Safe' :
                pct >= 100 ? 'Breached!' :
                pct >= 75 ? 'At Risk' : 'Safe';
              return (
                <GoalCard
                  label="Loss Limit"
                  current={lossAmt > 0 ? `$${Math.round(lossAmt).toLocaleString()} used` : 'No loss yet'}
                  target={`$${currentGoal.maxMonthlyLoss!.toLocaleString()} limit`}
                  progress={pct}
                  status={status}
                  statusLabel={statusLabel}
                />
              );
            })()}

            {/* Trade Count */}
            {currentGoal.tradeCountTarget !== null && (() => {
              const pct = (currentStats.tradeCount / currentGoal.tradeCountTarget!) * 100;
              const status =
                currentStats.tradeCount >= currentGoal.tradeCountTarget! ? 'achieved' :
                pct >= 60 ? 'on-track' : 'behind';
              return (
                <GoalCard
                  label="Trade Count"
                  current={`${currentStats.tradeCount} trades`}
                  target={`${currentGoal.tradeCountTarget} target`}
                  progress={pct}
                  status={status}
                />
              );
            })()}
          </div>
        )}
      </div>

      {/* Past Months */}
      {history.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-[var(--muted-foreground)] uppercase tracking-wide">
            Past Months
          </h3>
          {history.map(m => (
            <div key={m.month} className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium text-sm">{m.label}</h4>
                <span className="text-xs text-[var(--muted-foreground)]">
                  {m.tradeCount} trade{m.tradeCount !== 1 ? 's' : ''}
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <HistoryStat
                  label="P&L"
                  value={`${m.pnl >= 0 ? '+' : ''}$${Math.abs(Math.round(m.pnl)).toLocaleString()}`}
                  positive={m.pnl >= 0}
                  hit={m.goal?.pnlTarget != null ? m.pnl >= m.goal.pnlTarget : null}
                />
                <HistoryStat
                  label="Win Rate"
                  value={`${m.winRate}%`}
                  positive={m.winRate >= 50}
                  hit={m.goal?.winRateTarget != null && m.tradeCount >= 3 ? m.winRate >= m.goal.winRateTarget : null}
                />
                <HistoryStat
                  label="Trades"
                  value={`${m.tradeCount}`}
                  positive={true}
                  hit={m.goal?.tradeCountTarget != null ? m.tradeCount >= m.goal.tradeCountTarget : null}
                />
                <HistoryStat
                  label="Loss Limit"
                  value={m.pnl >= 0 ? 'Profitable' : m.goal?.maxMonthlyLoss != null ? (Math.abs(m.pnl) <= m.goal.maxMonthlyLoss ? 'Within limit' : 'Exceeded') : 'N/A'}
                  positive={m.pnl >= 0 || (m.goal?.maxMonthlyLoss != null && Math.abs(m.pnl) <= m.goal.maxMonthlyLoss)}
                  hit={m.goal?.maxMonthlyLoss != null ? m.pnl >= -m.goal.maxMonthlyLoss : null}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Set / Edit Goals Modal */}
      <Modal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={`${currentGoal ? 'Edit' : 'Set'} Goals for ${currentMonthLabel}`}
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Monthly P&L Target ($)</label>
            <input
              type="number"
              value={formPnL}
              onChange={e => setFormPnL(e.target.value)}
              placeholder="e.g. 2000"
            />
            <p className="text-xs text-[var(--muted-foreground)] mt-1">How much profit do you want to make this month?</p>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Win Rate Target (%)</label>
            <input
              type="number"
              min="1"
              max="100"
              value={formWinRate}
              onChange={e => setFormWinRate(e.target.value)}
              placeholder="e.g. 60"
            />
            <p className="text-xs text-[var(--muted-foreground)] mt-1">What % of your trades do you want to win?</p>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Max Monthly Loss ($)</label>
            <input
              type="number"
              value={formMaxLoss}
              onChange={e => setFormMaxLoss(e.target.value)}
              placeholder="e.g. 500"
            />
            <p className="text-xs text-[var(--muted-foreground)] mt-1">Stop trading if you lose more than this amount this month.</p>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Trade Count Target</label>
            <input
              type="number"
              value={formTradeCount}
              onChange={e => setFormTradeCount(e.target.value)}
              placeholder="e.g. 15"
            />
            <p className="text-xs text-[var(--muted-foreground)] mt-1">How many quality trades do you plan to take?</p>
          </div>
          <p className="text-xs text-[var(--muted-foreground)]">You can set any combination — leave fields blank to skip that metric.</p>
          <div className="flex justify-end gap-3 pt-2 border-t border-[var(--border)]">
            <button
              onClick={() => setIsFormOpen(false)}
              className="px-4 py-2 text-sm rounded-lg hover:bg-[var(--muted)]"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 text-sm bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white rounded-lg font-medium"
            >
              {currentGoal ? 'Update Goals' : 'Save Goals'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

type GoalStatus = 'achieved' | 'on-track' | 'behind' | 'at-risk' | 'pending';

const STATUS_CONFIG: Record<GoalStatus, { label: string; color: string; bar: string }> = {
  achieved:  { label: 'Achieved!',  color: 'text-[var(--green)]',              bar: 'bg-[var(--green)]' },
  'on-track':{ label: 'On Track',   color: 'text-[var(--green)]',              bar: 'bg-[var(--green)]' },
  behind:    { label: 'Behind',     color: 'text-amber-400',                    bar: 'bg-amber-400' },
  'at-risk': { label: 'At Risk',    color: 'text-[var(--red)]',                 bar: 'bg-[var(--red)]' },
  pending:   { label: 'Pending',    color: 'text-[var(--muted-foreground)]',    bar: 'bg-[var(--muted-foreground)]' },
};

function GoalCard({
  label, current, target, progress, status, statusLabel, note,
}: {
  label: string;
  current: string;
  target: string;
  progress: number;
  status: GoalStatus;
  statusLabel?: string;
  note?: string;
}) {
  const cfg = STATUS_CONFIG[status];
  const clamped = Math.min(100, Math.max(0, progress));

  return (
    <div className="bg-[var(--muted)]/50 rounded-xl p-3.5 space-y-2.5">
      <div className="flex items-center justify-between">
        <span className="text-xs text-[var(--muted-foreground)] font-medium">{label}</span>
        <span className={`text-[10px] font-bold uppercase tracking-wide ${cfg.color}`}>
          {statusLabel ?? cfg.label}
        </span>
      </div>
      <div className="flex items-baseline gap-1.5">
        <span className="text-sm font-bold">{current}</span>
        <span className="text-[10px] text-[var(--muted-foreground)]">/ {target}</span>
      </div>
      <div className="h-1.5 bg-[var(--border)] rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${cfg.bar}`}
          style={{ width: `${clamped}%` }}
        />
      </div>
      {note && <p className="text-[10px] text-[var(--muted-foreground)]">{note}</p>}
    </div>
  );
}

function HistoryStat({
  label, value, positive, hit,
}: {
  label: string;
  value: string;
  positive: boolean;
  hit: boolean | null;
}) {
  return (
    <div className="text-center">
      <div className="text-[10px] text-[var(--muted-foreground)] mb-0.5">{label}</div>
      <div className={`text-xs font-semibold ${positive ? 'text-[var(--green)]' : 'text-[var(--red)]'}`}>
        {value}
      </div>
      {hit !== null && (
        <div className="mt-0.5 flex justify-center">
          {hit
            ? <CheckCircle size={11} className="text-[var(--green)]" />
            : <XCircle size={11} className="text-[var(--red)]" />
          }
        </div>
      )}
    </div>
  );
}
