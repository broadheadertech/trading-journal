'use client';

import { useState, useMemo, useEffect } from 'react';
import { Trade, Strategy, EmotionState } from '@/lib/types';
import { formatPercent, getDisciplineScore } from '@/lib/utils';
import { useCurrency } from '@/hooks/useCurrency';
import {
  Plus, Edit2, Trash2, ChevronLeft, ChevronRight, Search,
  LayoutGrid, List, Calendar, TrendingUp, TrendingDown, Clock,
  Eye, EyeOff, Sparkles, Shield, Target, BarChart3, Upload,
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, startOfWeek, endOfWeek, parseISO, isSameMonth, isSameDay, addMonths, subMonths } from 'date-fns';
import Modal from './ui/Modal';
import TradeForm from './TradeForm';
import TradeImport from './TradeImport';
import PostTradeReview, { PostTradeSnapshot } from './PostTradeReview';
import TradeDetailView from './TradeDetailView';
import { useToast } from './ui/Toast';
import UsageBar from './UsageBar';
import { useUsage } from '@/hooks/useUsage';

interface TradesLogProps {
  trades: Trade[];
  strategies: Strategy[];
  onAdd: (trade: Omit<Trade, 'id' | 'createdAt' | 'actualPnL' | 'actualPnLPercent' | 'verdict'>) => void;
  onUpdate: (id: string, updates: Partial<Trade>) => void;
  onDelete: (id: string) => void;
  onBulkImport?: (trades: any[]) => Promise<number>;
  showAddModal?: boolean;
  onCloseAddModal?: () => void;
  onRuleBreak?: (ruleName: string, explanation: string) => void;
  initialCapital?: number;
}

type JournalView = 'day-cards' | 'timeline';

export default function TradesLog({
  trades, strategies, onAdd, onUpdate, onDelete, onBulkImport, showAddModal, onCloseAddModal, onRuleBreak, initialCapital = 0,
}: TradesLogProps) {
  const { showToast } = useToast();
  const { formatCurrency, formatPrice } = useCurrency();
  const usage = useUsage();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editTrade, setEditTrade] = useState<Trade | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [journalView, setJournalView] = useState<JournalView>('day-cards');
  const [hiddenDays, setHiddenDays] = useState<Set<string>>(new Set());
  const [showImport, setShowImport] = useState(false);
  const [detailTrade, setDetailTrade] = useState<Trade | null>(null);
  const [postReviewSnapshot, setPostReviewSnapshot] = useState<PostTradeSnapshot | null>(null);

  // External add modal trigger
  useEffect(() => {
    if (showAddModal) setIsAddOpen(true);
  }, [showAddModal]);

  useEffect(() => {
    if (!isAddOpen && onCloseAddModal) onCloseAddModal();
  }, [isAddOpen, onCloseAddModal]);

  /* ── Closed trades (time filtering handled by universal top-bar filter) ── */
  const filtered = useMemo(() => {
    return trades.filter(t => !t.isOpen && t.actualPnL !== null);
  }, [trades]);

  /* ── Metrics ──────────────────────────────────────── */
  const metrics = useMemo(() => {
    const total = filtered.length;
    const netPnL = filtered.reduce((s, t) => s + (t.actualPnL ?? 0), 0);
    const wins = filtered.filter(t => (t.actualPnL ?? 0) > 0);
    const losses = filtered.filter(t => (t.actualPnL ?? 0) < 0);
    const winRate = total > 0 ? Math.round((wins.length / total) * 100) : 0;
    const avgPnL = total > 0 ? netPnL / total : 0;
    const reviewed = filtered.filter(t => t.verdict !== null).length;
    const reviewCoverage = total > 0 ? Math.round((reviewed / total) * 100) : 100;
    const bestTrade = wins.sort((a, b) => (b.actualPnL ?? 0) - (a.actualPnL ?? 0))[0] ?? null;
    const worstTrade = losses.sort((a, b) => (a.actualPnL ?? 0) - (b.actualPnL ?? 0))[0] ?? null;
    const avgWin = wins.length > 0 ? wins.reduce((s, t) => s + (t.actualPnL ?? 0), 0) / wins.length : 0;
    const avgLoss = losses.length > 0 ? losses.reduce((s, t) => s + Math.abs(t.actualPnL ?? 0), 0) / losses.length : 0;
    const avgR = avgLoss > 0 ? (avgWin / avgLoss) : 0;
    const disciplineScore = getDisciplineScore(filtered);
    const processHealth = Math.round(disciplineScore * 100);

    return { total, netPnL, wins: wins.length, losses: losses.length, winRate, avgPnL, reviewCoverage, reviewed, bestTrade, worstTrade, avgR, processHealth };
  }, [filtered]);

  /* ── Calendar data ───────────────────────────────── */
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(calendarMonth);
    const monthEnd = endOfMonth(calendarMonth);
    const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    const days = eachDayOfInterval({ start: calStart, end: calEnd });
    return days.map(day => {
      const dateStr = format(day, 'yyyy-MM-dd');
      const dayTrades = trades.filter(t => {
        const d = t.exitDate ? format(parseISO(t.exitDate), 'yyyy-MM-dd') : format(new Date(t.createdAt), 'yyyy-MM-dd');
        return d === dateStr;
      });
      const pnl = dayTrades.reduce((s, t) => s + (t.actualPnL ?? 0), 0);
      return { day, dateStr, trades: dayTrades, pnl, inMonth: isSameMonth(day, calendarMonth) };
    });
  }, [calendarMonth, trades]);

  /* ── Day-grouped trades ──────────────────────────── */
  const dayGroups = useMemo(() => {
    const groups = new Map<string, Trade[]>();
    const sorted = [...filtered].sort((a, b) => {
      const da = a.exitDate ? new Date(a.exitDate) : new Date(a.createdAt);
      const db = b.exitDate ? new Date(b.exitDate) : new Date(b.createdAt);
      return db.getTime() - da.getTime();
    });
    sorted.forEach(t => {
      const d = t.exitDate ? format(parseISO(t.exitDate), 'yyyy-MM-dd') : format(new Date(t.createdAt), 'yyyy-MM-dd');
      if (!groups.has(d)) groups.set(d, []);
      groups.get(d)!.push(t);
    });
    return [...groups.entries()].map(([date, dayTrades]) => {
      const pnl = dayTrades.reduce((s, t) => s + (t.actualPnL ?? 0), 0);
      const wins = dayTrades.filter(t => (t.actualPnL ?? 0) > 0).length;
      const losses = dayTrades.filter(t => (t.actualPnL ?? 0) < 0).length;
      const totalSize = dayTrades.reduce((s, t) => s + t.capital, 0);
      return { date, trades: dayTrades, pnl, wins, losses, totalSize };
    });
  }, [filtered]);

  /* ── Patterns discovered ─────────────────────────── */
  const patterns = useMemo(() => {
    const result: { name: string; icon: string; net: number; count: number; winRate: number; share: number; color: string }[] = [];
    // Hour-based patterns
    const afternoonTrades = filtered.filter(t => { const h = new Date(t.createdAt).getHours(); return h >= 12 && h < 18; });
    const nightTrades = filtered.filter(t => { const h = new Date(t.createdAt).getHours(); return h >= 18 || h < 6; });
    if (afternoonTrades.length > 0) {
      const net = afternoonTrades.reduce((s, t) => s + (t.actualPnL ?? 0), 0);
      const wr = Math.round((afternoonTrades.filter(t => (t.actualPnL ?? 0) > 0).length / afternoonTrades.length) * 100);
      result.push({ name: 'Afternoon Window', icon: 'clock', net, count: afternoonTrades.length, winRate: wr, share: filtered.length > 0 ? Math.round((afternoonTrades.length / filtered.length) * 100) : 0, color: net >= 0 ? 'green' : 'red' });
    }
    if (nightTrades.length > 0) {
      const net = nightTrades.reduce((s, t) => s + (t.actualPnL ?? 0), 0);
      const wr = Math.round((nightTrades.filter(t => (t.actualPnL ?? 0) > 0).length / nightTrades.length) * 100);
      result.push({ name: 'Night Edge', icon: 'moon', net, count: nightTrades.length, winRate: wr, share: filtered.length > 0 ? Math.round((nightTrades.length / filtered.length) * 100) : 0, color: net >= 0 ? 'green' : 'cyan' });
    }
    // Coin-based patterns
    const coinMap = new Map<string, Trade[]>();
    filtered.forEach(t => { if (!coinMap.has(t.coin)) coinMap.set(t.coin, []); coinMap.get(t.coin)!.push(t); });
    const best = [...coinMap.entries()].filter(([, ts]) => ts.length >= 2).sort((a, b) => {
      const na = a[1].reduce((s, t) => s + (t.actualPnL ?? 0), 0);
      const nb = b[1].reduce((s, t) => s + (t.actualPnL ?? 0), 0);
      return nb - na;
    })[0];
    if (best) {
      const net = best[1].reduce((s, t) => s + (t.actualPnL ?? 0), 0);
      const wr = Math.round((best[1].filter(t => (t.actualPnL ?? 0) > 0).length / best[1].length) * 100);
      result.push({ name: `Strongest Symbol: ${best[0]}`, icon: 'target', net, count: best[1].length, winRate: wr, share: filtered.length > 0 ? Math.round((best[1].length / filtered.length) * 100) : 0, color: 'green' });
    }
    return result;
  }, [filtered]);

  /* ── CRUD handlers ───────────────────────────────── */
  const handleAdd = (trade: Omit<Trade, 'id' | 'createdAt' | 'actualPnL' | 'actualPnLPercent' | 'verdict'>) => {
    onAdd(trade);
    setIsAddOpen(false);
    showToast('Trade added');
  };
  const handleEdit = (trade: Omit<Trade, 'id' | 'createdAt' | 'actualPnL' | 'actualPnLPercent' | 'verdict'>) => {
    if (editTrade) { onUpdate(editTrade.id, trade); setEditTrade(null); showToast('Trade updated'); }
  };
  const handleDeleteConfirm = (id: string) => { onDelete(id); setDeleteConfirm(null); showToast('Trade deleted'); };

  return (
    <div className="space-y-6">

      {/* ── Hero Section ── */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-6">
        <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/10 text-[10px] font-semibold uppercase tracking-widest text-green-400 mb-4">
              <Calendar size={12} /> Interactive Trade Journal
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold mb-3">Journal Every Trade With Click-to-Review Flow</h1>
            <p className="text-[var(--muted-foreground)] text-sm max-w-2xl">
              This is your interactive journal. Filter by behavior pattern, click any trade row, and open full root-cause review with notes, setup tags, emotions, and evidence.
            </p>
          </div>
          <button onClick={() => setIsAddOpen(true)} disabled={usage.trades.isAtLimit}
            className="flex items-center gap-2 px-5 py-2.5 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 shrink-0">
            <Plus size={14} /> Add New Trade
          </button>
        </div>
        <div className="flex gap-2 flex-wrap">
          {['1. Use filters to isolate one pattern', '2. Click a trade to open review details', '3. Log lesson and move to next trade'].map((step, i) => (
            <span key={i} className="px-3 py-1.5 rounded-lg bg-[var(--accent)]/10 text-xs text-[var(--accent)] font-medium">{step}</span>
          ))}
        </div>
        {!usage.trades.isUnlimited && (
          <div className="max-w-xs mt-4">
            <UsageBar label="Trades" current={usage.trades.current} max={usage.trades.max} isUnlimited={false} />
          </div>
        )}
      </div>

      {/* ── Top 4 Stat Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4">
          <div className="flex items-center justify-between mb-1">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--muted-foreground)]">Filtered Net P&L</p>
            <TrendingUp size={14} className="text-[var(--muted-foreground)]" />
          </div>
          <p className={`text-2xl font-bold ${metrics.netPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>{formatCurrency(metrics.netPnL)}</p>
          <p className="text-[10px] text-[var(--muted-foreground)]">{metrics.total} trades &middot; {metrics.winRate}% win rate &middot; Avg {formatCurrency(metrics.avgPnL)}</p>
        </div>
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4">
          <div className="flex items-center justify-between mb-1">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--muted-foreground)]">Review Coverage (Filtered)</p>
            <Eye size={14} className="text-[var(--muted-foreground)]" />
          </div>
          <p className="text-2xl font-bold text-green-400">{metrics.reviewCoverage}%</p>
          <p className="text-[10px] text-[var(--muted-foreground)]">{metrics.reviewed}/{metrics.total} reviewed &middot; Queue pressure {100 - metrics.reviewCoverage}%</p>
        </div>
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4">
          <div className="flex items-center justify-between mb-1">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--muted-foreground)]">Execution Queue (Filtered)</p>
            <Clock size={14} className="text-[var(--muted-foreground)]" />
          </div>
          <p className="text-2xl font-bold text-yellow-400">{metrics.total - metrics.reviewed}</p>
          <p className="text-[10px] text-[var(--muted-foreground)]">Period pending {metrics.total - metrics.reviewed} &middot; Weekly progress {metrics.reviewCoverage}%</p>
        </div>
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4">
          <div className="flex items-center justify-between mb-1">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--muted-foreground)]">Process Health</p>
            <Shield size={14} className="text-[var(--muted-foreground)]" />
          </div>
          <p className="text-2xl font-bold">{metrics.processHealth}</p>
          <p className="text-[10px] text-[var(--muted-foreground)]">Plan adherence &middot; Documentation {metrics.reviewCoverage}%</p>
        </div>
      </div>

      {/* ── Secondary Stats Row ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-3">
          <div className="flex items-center justify-between mb-1">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--muted-foreground)]">Period P&L</p>
            <TrendingDown size={12} className="text-[var(--muted-foreground)]" />
          </div>
          <p className={`text-lg font-bold ${metrics.netPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>{formatCurrency(metrics.netPnL)}</p>
        </div>
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-3">
          <div className="flex items-center justify-between mb-1">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--muted-foreground)]">Win Rate</p>
            <span className="text-[10px] text-[var(--muted-foreground)]">%</span>
          </div>
          <p className="text-lg font-bold">{metrics.winRate}%</p>
        </div>
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-3">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--muted-foreground)] mb-1">Best Trade</p>
          <p className="text-sm font-bold">{metrics.bestTrade?.coin ?? '--'}</p>
          {metrics.bestTrade && <p className="text-[10px] text-green-400">+{formatCurrency(metrics.bestTrade.actualPnL ?? 0)}</p>}
        </div>
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-3">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--muted-foreground)] mb-1">Worst Trade</p>
          <p className="text-sm font-bold">{metrics.worstTrade?.coin ?? '--'}</p>
          {metrics.worstTrade && <p className="text-[10px] text-red-400">{formatCurrency(metrics.worstTrade.actualPnL ?? 0)}</p>}
        </div>
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-3">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--muted-foreground)] mb-1">Avg R</p>
          <p className="text-lg font-bold">{metrics.avgR.toFixed(2)} <span className="text-xs text-[var(--muted-foreground)]">R:R</span></p>
          <p className="text-[10px] text-[var(--muted-foreground)]">Avg win / avg loss</p>
        </div>
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-3">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--muted-foreground)] mb-1">Fees + Funding</p>
          <p className="text-lg font-bold">{formatCurrency(filtered.reduce((s, t) => s + (t.fees ?? 0) + (t.funding ?? 0), 0))}</p>
        </div>
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-3">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--muted-foreground)] mb-1">Lots/Qty/Size</p>
          <p className="text-lg font-bold">{filtered.reduce((s, t) => s + t.capital, 0).toFixed(2)}</p>
          <p className="text-[10px] text-[var(--muted-foreground)]">{metrics.total} trade{metrics.total !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {/* ── Monthly Calendar ── */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Calendar size={20} />
            <div>
              <h2 className="text-xl font-bold">Monthly Calendar</h2>
              <p className="text-xs text-[var(--muted-foreground)]">Independent from timeframe. Jump quickly between months.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setCalendarMonth(prev => subMonths(prev, 1))} className="p-1.5 rounded-lg hover:bg-[var(--muted)]"><ChevronLeft size={16} /></button>
            <select value={calendarMonth.getMonth()} onChange={e => setCalendarMonth(new Date(calendarMonth.getFullYear(), parseInt(e.target.value), 1))}
              className="bg-[var(--muted)] border border-[var(--border)] rounded-lg px-3 py-1.5 text-sm">
              {Array.from({ length: 12 }, (_, i) => <option key={i} value={i}>{format(new Date(2024, i), 'MMMM')}</option>)}
            </select>
            <select value={calendarMonth.getFullYear()} onChange={e => setCalendarMonth(new Date(parseInt(e.target.value), calendarMonth.getMonth(), 1))}
              className="bg-[var(--muted)] border border-[var(--border)] rounded-lg px-3 py-1.5 text-sm">
              {Array.from({ length: 5 }, (_, i) => { const y = new Date().getFullYear() - 2 + i; return <option key={y} value={y}>{y}</option>; })}
            </select>
            <button onClick={() => setCalendarMonth(prev => addMonths(prev, 1))} className="p-1.5 rounded-lg hover:bg-[var(--muted)]"><ChevronRight size={16} /></button>
          </div>
        </div>
        <div className="inline-flex px-3 py-1 rounded-full bg-[var(--accent)]/10 text-xs text-[var(--accent)] font-medium mb-4">
          {format(calendarMonth, 'MMMM yyyy')}
        </div>
        {/* Day headers */}
        <div className="grid grid-cols-7 gap-1 mb-1">
          {['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'].map(d => (
            <div key={d} className="text-center text-[10px] font-semibold uppercase tracking-widest text-[var(--muted-foreground)] py-1">{d}</div>
          ))}
        </div>
        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map(({ day, dateStr, trades: dayTrades, pnl, inMonth }) => {
            const isToday = isSameDay(day, new Date());
            return (
              <div key={dateStr}
                className={`rounded-lg p-2 min-h-[70px] border transition-colors cursor-default ${
                  !inMonth ? 'opacity-30 border-transparent' :
                  isToday ? 'border-[var(--accent)] bg-[var(--accent)]/5' :
                  dayTrades.length > 0 ? 'border-[var(--border)] bg-[var(--card)] hover:border-[var(--accent)]/30' :
                  'border-[var(--border)]'
                }`}>
                <p className={`text-sm font-bold ${isToday ? 'text-[var(--accent)]' : ''}`}>{format(day, 'd')}</p>
                {inMonth && (
                  <>
                    <p className={`text-[10px] font-bold ${pnl > 0 ? 'text-green-400' : pnl < 0 ? 'text-red-400' : 'text-[var(--muted-foreground)]'}`}>
                      {formatCurrency(pnl)}
                    </p>
                    <p className="text-[10px] text-[var(--muted-foreground)]">{dayTrades.length} trade{dayTrades.length !== 1 ? 's' : ''}</p>
                  </>
                )}
                {!inMonth && <p className="text-[10px] text-[var(--muted-foreground)]">--</p>}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Trade Journal + Sidebar ── */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-4">

        {/* Main: Trade Journal (3/4) */}
        <div className="xl:col-span-3 space-y-4">
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold">Trade Journal</h2>
                <p className="text-xs text-[var(--muted-foreground)]">Click any trade card to open full review, violations context, and evidence.</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-lg bg-[var(--muted)] text-xs">{dayGroups.length} day groups &middot; {filtered.length}/{filtered.length} rows loaded</span>
                {onBulkImport && (
                  <button onClick={() => setShowImport(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--muted)] hover:bg-[var(--muted)]/80 rounded-lg text-xs">
                    <Upload size={12} /> Import
                  </button>
                )}
              </div>
            </div>
            {/* View toggle */}
            <div className="flex gap-1 mb-4">
              <button onClick={() => setJournalView('day-cards')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  journalView === 'day-cards' ? 'bg-[var(--accent)] text-white' : 'bg-[var(--muted)] text-[var(--muted-foreground)]'
                }`}><LayoutGrid size={14} /> Day Cards</button>
              <button onClick={() => setJournalView('timeline')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  journalView === 'timeline' ? 'bg-[var(--accent)] text-white' : 'bg-[var(--muted)] text-[var(--muted-foreground)]'
                }`}><List size={14} /> Timeline</button>
            </div>

            {/* Day groups */}
            {dayGroups.length === 0 ? (
              <div className="py-12 text-center text-[var(--muted-foreground)] text-sm">
                No closed trades in this period. Add your first trade to get started.
              </div>
            ) : (
              <div className="space-y-4">
                {dayGroups.map(group => {
                  const hidden = hiddenDays.has(group.date);
                  const winRate = group.trades.length > 0 ? Math.round((group.wins / group.trades.length) * 100) : 0;
                  return (
                    <div key={group.date}>
                      {/* Day header */}
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <p className="text-sm font-bold">{group.date}</p>
                          <span className="px-2 py-0.5 rounded text-[10px] bg-[var(--muted)] text-[var(--muted-foreground)]">{group.trades.length} trades</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <p className="text-xs text-[var(--muted-foreground)]">
                            Win rate {winRate}% &middot; Wins {group.wins} &middot; Losses {group.losses} &middot; Size {group.totalSize.toFixed(2)}
                          </p>
                          <p className={`text-sm font-bold ${group.pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>{formatCurrency(group.pnl)}</p>
                          <button onClick={() => setHiddenDays(prev => { const n = new Set(prev); hidden ? n.delete(group.date) : n.add(group.date); return n; })}
                            className="text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)]">
                            {hidden ? 'Show' : 'Hide'}
                          </button>
                        </div>
                      </div>

                      {/* Trade cards */}
                      {!hidden && (
                        <div className={`grid gap-3 ${journalView === 'day-cards' ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'}`}>
                          {group.trades.map(trade => (
                            <div key={trade.id} onClick={() => setDetailTrade(trade)}
                              className="bg-[var(--muted)] border border-[var(--border)] rounded-xl p-4 cursor-pointer hover:border-[var(--accent)]/30 transition-colors">
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <p className="text-sm font-bold">{trade.coin.length > 6 ? trade.coin.slice(0, 6) + '...' : trade.coin}</p>
                                  {trade.direction && (
                                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                      trade.direction === 'long' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                                    }`}>{trade.direction === 'long' ? 'Long' : 'Short'}</span>
                                  )}
                                </div>
                                <p className={`text-sm font-bold ${(trade.actualPnL ?? 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                  {formatCurrency(trade.actualPnL ?? 0)}
                                </p>
                              </div>
                              <div className="flex items-center gap-3 text-[10px] text-[var(--muted-foreground)] mb-2">
                                <span>{format(new Date(trade.createdAt), 'dd/MM')}</span>
                                <span>{trade.capital.toFixed(2)} size</span>
                                {trade.actualPnLPercent !== null && <span className={trade.actualPnLPercent >= 0 ? 'text-green-400' : 'text-red-400'}>{formatPercent(trade.actualPnLPercent)}</span>}
                              </div>
                              <p className="text-xs text-[var(--muted-foreground)] mb-2">{trade.strategy || 'No strategy'}</p>
                              <div className="flex flex-wrap gap-1 mb-2">
                                {trade.tags.slice(0, 3).map(tag => (
                                  <span key={tag} className="px-1.5 py-0.5 rounded text-[10px] bg-[var(--card)] border border-[var(--border)] text-[var(--muted-foreground)]">{tag}</span>
                                ))}
                                {trade.tags.length > 3 && <span className="text-[10px] text-[var(--muted-foreground)]">+{trade.tags.length - 3}</span>}
                              </div>
                              <div className="flex items-center justify-between">
                                {trade.verdict ? (
                                  <span className="flex items-center gap-1 text-[10px] text-green-400"><Eye size={10} /> Reviewed</span>
                                ) : (
                                  <span className="text-[10px] text-yellow-400">Pending review</span>
                                )}
                                <button onClick={(e) => { e.stopPropagation(); setDetailTrade(trade); }}
                                  className="text-[10px] text-[var(--accent)] hover:underline">Open review</button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ── Right Sidebar (1/4) ── */}
        <div className="space-y-4">
          {/* Review Queue Focus */}
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-1 rounded bg-green-500/20"><Eye size={14} className="text-green-400" /></div>
              <h3 className="text-sm font-bold">Review Queue Focus</h3>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between bg-[var(--muted)] rounded-lg px-3 py-2">
                <p className="text-xs">Pending in view</p>
                <span className="text-xs font-bold text-red-400">{metrics.total - metrics.reviewed}</span>
              </div>
              <div className="flex items-center justify-between bg-[var(--muted)] rounded-lg px-3 py-2">
                <p className="text-xs">Unknown side</p>
                <span className="text-xs font-bold text-red-400">{filtered.filter(t => !t.direction).length}</span>
              </div>
              <div className="flex items-center justify-between bg-[var(--muted)] rounded-lg px-3 py-2">
                <p className="text-xs">High-fee trades</p>
                <span className="text-xs font-bold text-red-400">0</span>
              </div>
            </div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--muted-foreground)] mt-3 mb-1">Top Pending Symbols</p>
            <p className="text-xs text-[var(--muted-foreground)]">
              {filtered.filter(t => !t.verdict).length === 0
                ? 'No pending clusters in current filters.'
                : `${[...new Set(filtered.filter(t => !t.verdict).map(t => t.coin))].slice(0, 3).join(', ')} pending`}
            </p>
          </div>

          {/* Process Diagnostics */}
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles size={14} className="text-[var(--accent)]" />
              <h3 className="text-sm font-bold">Process Diagnostics</h3>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between bg-[var(--muted)] rounded-lg px-3 py-2">
                <p className="text-xs">Current streak</p>
                <span className="text-xs font-bold">0 days</span>
              </div>
              <div className="flex items-center justify-between bg-[var(--muted)] rounded-lg px-3 py-2">
                <p className="text-xs">Average review rating</p>
                <span className="text-xs font-bold">--/5</span>
              </div>
              <div className="flex items-center justify-between bg-[var(--muted)] rounded-lg px-3 py-2">
                <p className="text-xs">Cost drag (fees+funding)</p>
                <span className="text-xs font-bold">{formatCurrency(filtered.reduce((s, t) => s + (t.fees ?? 0) + (t.funding ?? 0), 0))}</span>
              </div>
            </div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--muted-foreground)] mt-3 mb-1">Setup Quality</p>
            <p className="text-xs text-[var(--muted-foreground)]">
              {metrics.total < 5 ? 'Not enough setup sample yet. Add more reviewed trades to rank setup quality.' : `${metrics.processHealth}% process health across ${metrics.total} trades.`}
            </p>
          </div>

          {/* Patterns Discovered */}
          <div className="bg-[var(--card)] border border-[var(--accent)]/20 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles size={14} className="text-[var(--accent)]" />
              <h3 className="text-sm font-bold">Patterns Discovered</h3>
            </div>
            <p className="text-xs text-[var(--muted-foreground)] mb-3">Insights based on your trades in the selected period</p>
            {patterns.length === 0 ? (
              <p className="text-xs text-[var(--muted-foreground)]">Not enough data to detect patterns yet.</p>
            ) : (
              <div className="space-y-3">
                {patterns.map((p, i) => (
                  <div key={i} className={`rounded-xl p-3 border-l-2 ${
                    p.color === 'green' ? 'border-green-400 bg-green-500/5' :
                    p.color === 'red' ? 'border-red-400 bg-red-500/5' :
                    'border-cyan-400 bg-cyan-500/5'
                  }`}>
                    <div className="flex items-center justify-between mb-1">
                      <p className={`text-sm font-bold ${
                        p.color === 'green' ? 'text-green-400' : p.color === 'red' ? 'text-red-400' : 'text-cyan-400'
                      }`}>{p.name}</p>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        p.winRate >= 50 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                      }`}>{p.winRate}% Win</span>
                    </div>
                    <p className="text-xs text-[var(--muted-foreground)] mb-2">Net {formatCurrency(p.net)} across {p.count} trades.</p>
                    <div className="flex items-center justify-between">
                      <div className="h-1.5 flex-1 rounded-full bg-[var(--card)] overflow-hidden mr-3">
                        <div className={`h-full rounded-full ${
                          p.color === 'green' ? 'bg-green-400' : p.color === 'red' ? 'bg-red-400' : 'bg-cyan-400'
                        }`} style={{ width: `${p.share}%` }} />
                      </div>
                      <span className="text-[10px] text-[var(--muted-foreground)]">Share {p.share}%</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Add Trade Modal ── */}
      <Modal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} title="" size="xl">
        <TradeForm strategies={strategies} trades={trades} onSubmit={handleAdd} onCancel={() => setIsAddOpen(false)} onRuleBreak={onRuleBreak} availableBalance={initialCapital} />
      </Modal>

      {/* ── Edit Trade Modal ── */}
      <Modal isOpen={!!editTrade} onClose={() => setEditTrade(null)} title="" size="xl">
        {editTrade && <TradeForm strategies={strategies} trades={trades} editTrade={editTrade} onSubmit={handleEdit} onCancel={() => setEditTrade(null)} onRuleBreak={onRuleBreak} availableBalance={initialCapital} />}
      </Modal>

      {/* ── Trade Detail Modal ── */}
      <Modal isOpen={!!detailTrade} onClose={() => setDetailTrade(null)} title={detailTrade?.coin ?? ''} size="xl">
        {detailTrade && <TradeDetailView trade={detailTrade} onEdit={() => { setEditTrade(detailTrade); setDetailTrade(null); }} />}
      </Modal>

      {/* ── Import Modal ── */}
      {onBulkImport && (
        <Modal isOpen={showImport} onClose={() => setShowImport(false)} title="Import Trades" size="lg">
          <TradeImport onImport={async (data) => { const count = await onBulkImport(data); showToast(`${count} trades imported`); setShowImport(false); }} onClose={() => setShowImport(false)} strategies={strategies.map(s => s.name)} />
        </Modal>
      )}

      {/* ── Delete Confirmation ── */}
      <Modal isOpen={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} title="Delete Trade" size="sm">
        <p className="text-sm text-[var(--muted-foreground)] mb-4">Are you sure? This cannot be undone.</p>
        <div className="flex justify-end gap-3">
          <button onClick={() => setDeleteConfirm(null)} className="px-4 py-2 text-sm rounded-lg hover:bg-[var(--muted)]">Cancel</button>
          <button onClick={() => deleteConfirm && handleDeleteConfirm(deleteConfirm)} className="px-4 py-2 text-sm bg-[var(--red)] hover:bg-red-600 text-white rounded-lg">Delete</button>
        </div>
      </Modal>
    </div>
  );
}
