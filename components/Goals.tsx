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
    <div className="relative anim-fade-up">
      {/* Header */}
      <div className="phead pwrap">
        <p className="eyebrow">
          <Target size={13} style={{ color: 'var(--amber)' }} /> {currentMonthLabel}
        </p>
        <h2>Goals &amp; Progress</h2>
        <p className="sub">Set monthly targets and track your performance against live journal data.</p>
        <div className="actions">
          <button onClick={openForm} className="btn-a">
            {currentGoal ? <Edit2 size={14} /> : <Flag size={14} />}
            {currentGoal ? 'Edit Goals' : 'Set Goals'}
          </button>
        </div>
      </div>

      {/* Current Month Card */}
      <div className="card">
        <span className="accent" style={{ width: 56, background: 'var(--amber)' }} />
        <div className="cardhead">
          <div>
            <h3>{currentMonthLabel}</h3>
            <p className="sub">
              {daysLeft} day{daysLeft !== 1 ? 's' : ''} remaining · {monthProgress}% through the month
            </p>
          </div>
          {currentStats.tradeCount > 0 && (
            <span className="chip" style={{ marginLeft: 'auto' }}>
              {currentStats.tradeCount} trade{currentStats.tradeCount !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {!currentGoal ? (
          <div className="blank" style={{ marginTop: 22, padding: '44px 28px', textAlign: 'center' }}>
            <span className="corner" style={{ left: -1, top: -1, borderRight: 0, borderBottom: 0 }} />
            <span className="corner" style={{ right: -1, bottom: -1, borderLeft: 0, borderTop: 0 }} />
            <div
              className="badge"
              style={{
                margin: '0 auto 24px',
                border: '1px solid rgba(217,148,5,.4)',
                background: 'var(--panel-2)',
              }}
            >
              <Flag size={22} style={{ color: 'var(--amber)' }} />
            </div>
            <h4>No goals set for {currentMonthLabel}</h4>
            <p>Define P&amp;L, win rate, loss limit and trade count targets to start tracking.</p>
            <button onClick={openForm} className="btn-a" style={{ marginTop: 24 }}>
              Set your goals
            </button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 12, marginTop: 22 }}>
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
        <div style={{ marginTop: 32 }}>
          <p className="lbl b10" style={{ marginBottom: 14 }}>
            PAST MONTHS <span style={{ color: 'var(--amber)' }}>· {history.length}</span>
          </p>
          {history.map(m => (
            <div key={m.month} className="card" style={{ marginBottom: 12 }}>
              <div className="cardhead">
                <div><h4>{m.label}</h4></div>
                <span className="chip" style={{ marginLeft: 'auto' }}>
                  {m.tradeCount} trade{m.tradeCount !== 1 ? 's' : ''}
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 12, marginTop: 16 }}>
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
          <div className="field">
            <label>MONTHLY P&amp;L TARGET ($)</label>
            <input
              type="number"
              className="box w-full"
              value={formPnL}
              onChange={e => setFormPnL(e.target.value)}
              placeholder="e.g. 2000"
            />
            <p className="footnote" style={{ textAlign: 'left', marginTop: 8 }}>How much profit do you want to make this month?</p>
          </div>
          <div className="field">
            <label>WIN RATE TARGET (%)</label>
            <input
              type="number"
              min="1"
              max="100"
              className="box w-full"
              value={formWinRate}
              onChange={e => setFormWinRate(e.target.value)}
              placeholder="e.g. 60"
            />
            <p className="footnote" style={{ textAlign: 'left', marginTop: 8 }}>What % of your trades do you want to win?</p>
          </div>
          <div className="field">
            <label>MAX MONTHLY LOSS ($)</label>
            <input
              type="number"
              className="box w-full"
              value={formMaxLoss}
              onChange={e => setFormMaxLoss(e.target.value)}
              placeholder="e.g. 500"
            />
            <p className="footnote" style={{ textAlign: 'left', marginTop: 8 }}>Stop trading if you lose more than this amount this month.</p>
          </div>
          <div className="field">
            <label>TRADE COUNT TARGET</label>
            <input
              type="number"
              className="box w-full"
              value={formTradeCount}
              onChange={e => setFormTradeCount(e.target.value)}
              placeholder="e.g. 15"
            />
            <p className="footnote" style={{ textAlign: 'left', marginTop: 8 }}>How many quality trades do you plan to take?</p>
          </div>
          <div className="note" style={{ height: 'auto', minHeight: 44, padding: '12px 18px' }}>You can set any combination — leave fields blank to skip that metric.</div>
          <div className="flex justify-end gap-3 pt-4" style={{ borderTop: '1px solid var(--line)' }}>
            <button onClick={() => setIsFormOpen(false)} className="btn-g">
              Cancel
            </button>
            <button onClick={handleSave} className="btn-a">
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
  achieved:  { label: 'Achieved!',  color: 'var(--green)',   bar: 'var(--green)' },
  'on-track':{ label: 'On Track',   color: 'var(--green)',   bar: 'var(--green)' },
  behind:    { label: 'Behind',     color: 'var(--amber)',   bar: 'var(--amber)' },
  'at-risk': { label: 'At Risk',    color: 'var(--red)',     bar: 'var(--red)' },
  pending:   { label: 'Pending',    color: 'var(--muted-2)', bar: 'var(--muted-3)' },
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
    <div className="inset" style={{ position: 'relative', padding: '15px 16px' }}>
      <span
        className="accent"
        style={{ position: 'absolute', left: 0, top: -1, width: 36, height: 3, background: cfg.bar }}
      />
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <p className="lbl">{label.toUpperCase()}</p>
        <span
          style={{
            marginLeft: 'auto',
            fontWeight: 700,
            fontSize: 9.5,
            letterSpacing: '.04em',
            textTransform: 'uppercase',
            color: cfg.color,
          }}
        >
          {statusLabel ?? cfg.label}
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 8 }}>
        <span style={{ fontFamily: 'var(--mono)', fontWeight: 500, fontSize: 18, color: 'var(--text)' }}>{current}</span>
        <span style={{ fontSize: 10.5, color: 'var(--muted-2)' }}>/ {target}</span>
      </div>
      <div style={{ height: 2, marginTop: 14, background: 'var(--rail)', position: 'relative' }}>
        <div
          className="transition-all duration-500"
          style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${clamped}%`, background: cfg.bar }}
        />
      </div>
      {note && <p style={{ margin: '10px 0 0', fontSize: 10.5, color: 'var(--muted-2)' }}>{note}</p>}
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
    <div className="inset" style={{ padding: '13px 16px' }}>
      <p className="lbl">{label.toUpperCase()}</p>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginTop: 8,
          fontFamily: 'var(--mono)',
          fontWeight: 500,
          fontSize: 15,
          color: positive ? 'var(--green)' : 'var(--red)',
        }}
      >
        {value}
        {hit !== null && (
          hit
            ? <CheckCircle size={12} style={{ color: 'var(--green)', flex: 'none' }} />
            : <XCircle size={12} style={{ color: 'var(--red)', flex: 'none' }} />
        )}
      </div>
    </div>
  );
}
