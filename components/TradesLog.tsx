'use client';

import { useState, useMemo, useEffect } from 'react';
import { Trade, Strategy, EmotionState, MarketType } from '@/lib/types';
import { MARKET_TYPE_LIST, marketMeta } from '@/lib/market-types';
import { formatPercent, getDisciplineScore } from '@/lib/utils';
import { useCurrency } from '@/hooks/useCurrency';
import {
  Plus, PencilSimple as Edit2, Trash as Trash2, CaretLeft as ChevronLeft, CaretRight as ChevronRight, MagnifyingGlass as Search,
  Calendar, TrendUp as TrendingUp, TrendDown as TrendingDown, Clock,
  Eye, EyeSlash as EyeOff, Sparkle as Sparkles, Shield, Target, ChartBar as BarChart3, UploadSimple as Upload, Globe, Lock,
} from '@phosphor-icons/react';
import { SquaresFour as LayoutGrid, ListBullets as List } from '@phosphor-icons/react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, startOfWeek, endOfWeek, parseISO, isSameMonth, isSameDay, addMonths, subMonths } from 'date-fns';
import Modal from './ui/Modal';
import TradeForm from './TradeForm';
import TradeImport from './TradeImport';
import PostTradeReview, { PostTradeSnapshot } from './PostTradeReview';
import TradeDetailView from './TradeDetailView';
import MarketTypeBadge from './MarketTypeBadge';
import { useToast } from './ui/Toast';
import UsageBar from './UsageBar';
import { useUsage } from '@/hooks/useUsage';

interface TradesLogProps {
  trades: Trade[];
  strategies: Strategy[];
  onAdd: (trade: Omit<Trade, 'id' | 'createdAt' | 'verdict'>) => Promise<unknown>;
  onUpdate: (id: string, updates: Partial<Trade>) => Promise<unknown>;
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
  const [marketFilter, setMarketFilter] = useState<MarketType | 'all'>('all');

  // External add modal trigger
  useEffect(() => {
    if (showAddModal) setIsAddOpen(true);
  }, [showAddModal]);

  useEffect(() => {
    if (!isAddOpen && onCloseAddModal) onCloseAddModal();
  }, [isAddOpen, onCloseAddModal]);

  /* ── Asset-class filter applied across the whole tab ── */
  const tradesScoped = useMemo(() => {
    if (marketFilter === 'all') return trades;
    return trades.filter(t => (t.marketType ?? 'crypto') === marketFilter);
  }, [trades, marketFilter]);

  /* ── Closed trades (time filtering handled by universal top-bar filter) ── */
  const filtered = useMemo(() => {
    return tradesScoped.filter(t => !t.isOpen && t.actualPnL !== null);
  }, [tradesScoped]);

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
      const dayTrades = tradesScoped.filter(t => {
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
  // Convex errors arrive with a noisy prefix like
  // "[CONVEX M(trades:add)] [Request ID: …] Server Error\nUncaught Error: …".
  // Show only the human-readable trailing line in the toast.
  const cleanConvexError = (err: unknown): string => {
    const raw = err instanceof Error ? err.message : String(err);
    const lines = raw.split('\n').map(l => l.trim()).filter(Boolean);
    const last = lines[lines.length - 1] ?? raw;
    return last.replace(/^Uncaught\s+Error:\s*/i, '').replace(/^\[CONVEX[^\]]*\]\s*/i, '').trim() || 'Something went wrong.';
  };

  const handleAdd = async (trade: Omit<Trade, 'id' | 'createdAt' | 'verdict'>) => {
    try {
      await onAdd(trade);
      setIsAddOpen(false);
      showToast('Trade added', 'success');
    } catch (err) {
      showToast(cleanConvexError(err), 'error');
    }
  };
  const handleEdit = async (trade: Omit<Trade, 'id' | 'createdAt' | 'verdict'>) => {
    if (!editTrade) return;
    try {
      await onUpdate(editTrade.id, trade);
      setEditTrade(null);
      showToast('Trade updated', 'success');
    } catch (err) {
      showToast(cleanConvexError(err), 'error');
    }
  };
  const handleDeleteConfirm = (id: string) => { onDelete(id); setDeleteConfirm(null); showToast('Trade deleted'); };

  return (
    <div>

      {/* ── Hero Section ── */}
      <div className="card pwrap" style={{ padding: '39px 28px 34px' }}>
        <span className="accent" style={{ width: 56, background: 'var(--amber)' }} />
        <p style={{ margin: 0, fontWeight: 500, fontSize: '9.5px', color: 'var(--green)', letterSpacing: '.04em' }}>INTERACTIVE TRADE JOURNAL</p>
        <h3 style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: 28, lineHeight: '32px', margin: '20px 0 0' }}>
          Journal Every Trade With Click-to-Review Flow
        </h3>
        <p style={{ margin: '22px 0 0', fontSize: '13.5px', lineHeight: '21px', color: 'var(--muted)', maxWidth: 640 }}>
          This is your interactive journal. Filter by behavior pattern, click any trade row, and open full root-cause review with notes, setup tags, emotions, and evidence.
        </p>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginTop: 28 }}>
          {['1. Use filters to isolate one pattern', '2. Click a trade to open review details', '3. Log lesson and move to next trade'].map((step, i) => (
            <span key={i} className="chip" style={{ height: 32 }}>{step}</span>
          ))}
        </div>
        {!usage.trades.isUnlimited && (
          <div style={{ maxWidth: 292, marginTop: 32 }}>
            <UsageBar label="Trades" current={usage.trades.current} max={usage.trades.max} isUnlimited={false} />
          </div>
        )}
        <button onClick={() => setIsAddOpen(true)} disabled={usage.trades.isAtLimit}
          className="btn-a"
          style={{ position: 'absolute', right: 28, top: 30, height: 47, padding: '0 22px', opacity: usage.trades.isAtLimit ? 0.5 : 1 }}>
          <Plus size={14} /> Add New Trade
        </button>
      </div>

      {/* ── Top 4 Stat Cards ── */}
      <div className="stats" style={{ marginTop: 35 }}>
        <div className="stat" style={{ height: 'auto', minHeight: 115 }}>
          <span className="accent" style={{ background: 'var(--green)' }} />
          <b>FILTERED NET P&amp;L</b>
          <em style={{ color: metrics.netPnL >= 0 ? 'var(--green)' : 'var(--red)' }}>{formatCurrency(metrics.netPnL)}</em>
          <small style={{ display: 'block', fontSize: '10.5px', color: 'var(--muted-2)', marginTop: 8 }}>
            {metrics.total} trades · {metrics.winRate}% win rate · Avg {formatCurrency(metrics.avgPnL)}
          </small>
        </div>
        <div className="stat" style={{ height: 'auto', minHeight: 115 }}>
          <span className="accent" style={{ background: 'var(--teal)' }} />
          <b>REVIEW COVERAGE (FILTERED)</b>
          <em style={{ color: 'var(--green)' }}>{metrics.reviewCoverage}%</em>
          <small style={{ display: 'block', fontSize: '10.5px', color: 'var(--muted-2)', marginTop: 8 }}>
            {metrics.reviewed}/{metrics.total} reviewed · Queue pressure {100 - metrics.reviewCoverage}%
          </small>
        </div>
        <div className="stat" style={{ height: 'auto', minHeight: 115 }}>
          <span className="accent" style={{ background: 'var(--amber)' }} />
          <b>EXECUTION QUEUE (FILTERED)</b>
          <em style={{ color: 'var(--amber)' }}>{metrics.total - metrics.reviewed}</em>
          <small style={{ display: 'block', fontSize: '10.5px', color: 'var(--muted-2)', marginTop: 8 }}>
            Period pending {metrics.total - metrics.reviewed} · Weekly progress {metrics.reviewCoverage}%
          </small>
        </div>
        <div className="stat" style={{ height: 'auto', minHeight: 115 }}>
          <span className="accent" style={{ background: 'var(--pink)' }} />
          <b>PROCESS HEALTH</b>
          <em>{metrics.processHealth}</em>
          <small style={{ display: 'block', fontSize: '10.5px', color: 'var(--muted-2)', marginTop: 8 }}>
            Plan adherence · Documentation {metrics.reviewCoverage}%
          </small>
        </div>
      </div>

      {/* ── Secondary Stats Row ── */}
      <div className="jstats">
        <div className="jstat">
          <b>PERIOD P&amp;L</b>
          <em style={{ color: metrics.netPnL >= 0 ? 'var(--green)' : 'var(--red)' }}>{formatCurrency(metrics.netPnL)}</em>
        </div>
        <div className="jstat">
          <b>WIN RATE</b>
          <em>{metrics.winRate}%</em>
        </div>
        <div className="jstat">
          <b>BEST TRADE</b>
          <em style={metrics.bestTrade ? undefined : { fontFamily: 'var(--display)', color: 'var(--muted)' }}>{metrics.bestTrade?.coin ?? '--'}</em>
          {metrics.bestTrade && <small style={{ color: 'var(--green)' }}>{formatCurrency(metrics.bestTrade.actualPnL ?? 0)}</small>}
        </div>
        <div className="jstat">
          <b>WORST TRADE</b>
          <em style={metrics.worstTrade ? undefined : { fontFamily: 'var(--display)', color: 'var(--muted)' }}>{metrics.worstTrade?.coin ?? '--'}</em>
          {metrics.worstTrade && <small style={{ color: 'var(--red)' }}>{formatCurrency(metrics.worstTrade.actualPnL ?? 0)}</small>}
        </div>
        <div className="jstat">
          <b>AVG R</b>
          <em>{metrics.avgR.toFixed(2)}</em>
          <small>Avg win / avg loss</small>
        </div>
        <div className="jstat">
          <b>FEES + FUNDING</b>
          <em>{formatCurrency(filtered.reduce((s, t) => s + (t.fees ?? 0) + (t.funding ?? 0), 0))}</em>
        </div>
        <div className="jstat">
          <b>LOTS/QTY/SIZE</b>
          <em>{filtered.reduce((s, t) => s + t.capital, 0).toFixed(2)}</em>
          <small>{metrics.total} trade{metrics.total !== 1 ? 's' : ''}</small>
        </div>
      </div>

      {/* ── Monthly Calendar ── */}
      <div className="card" style={{ marginTop: 22, padding: '25px 28px 34px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, flexWrap: 'wrap' }}>
          <Calendar size={16} style={{ marginTop: 4, color: 'var(--amber)', flex: 'none' }} />
          <div>
            <h3>Monthly Calendar</h3>
            <p className="sub">Independent from timeframe. Jump quickly between months.</p>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
            <button onClick={() => setCalendarMonth(prev => subMonths(prev, 1))} className="chip" style={{ height: 36, width: 36, padding: 0, justifyContent: 'center' }} aria-label="Previous month">
              <ChevronLeft size={14} />
            </button>
            <select value={calendarMonth.getMonth()} onChange={e => setCalendarMonth(new Date(calendarMonth.getFullYear(), parseInt(e.target.value), 1))}
              className="chip" style={{ height: 36, width: 110, appearance: 'none', color: '#c0ccda' }}>
              {Array.from({ length: 12 }, (_, i) => <option key={i} value={i}>{format(new Date(2024, i), 'MMMM')}</option>)}
            </select>
            <select value={calendarMonth.getFullYear()} onChange={e => setCalendarMonth(new Date(parseInt(e.target.value), calendarMonth.getMonth(), 1))}
              className="chip" style={{ height: 36, width: 88, appearance: 'none', color: '#c0ccda' }}>
              {Array.from({ length: 5 }, (_, i) => { const y = new Date().getFullYear() - 2 + i; return <option key={y} value={y}>{y}</option>; })}
            </select>
            <button onClick={() => setCalendarMonth(prev => addMonths(prev, 1))} className="chip" style={{ height: 36, width: 36, padding: 0, justifyContent: 'center' }} aria-label="Next month">
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
        <span style={{
          display: 'inline-flex', alignItems: 'center', height: 28, padding: '0 14px', borderRadius: 2, background: '#2a1f0a',
          fontWeight: 700, fontSize: '11.5px', color: 'var(--amber)', marginTop: 28,
        }}>{format(calendarMonth, 'MMMM yyyy')}</span>

        <div className="jcal">
          {['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'].map(d => (
            <div key={d} className="dow">{d}</div>
          ))}
          {calendarDays.map(({ day, dateStr, trades: dayTrades, pnl, inMonth }) => {
            const isToday = isSameDay(day, new Date());
            return (
              <div key={dateStr} className={`day${inMonth ? '' : ' out'}${isToday ? ' today' : ''}`} style={{ height: 'auto', minHeight: 57 }}>
                <b>{format(day, 'd')}</b>
                {inMonth ? (
                  <>
                    <em style={{ color: pnl > 0 ? 'var(--green)' : pnl < 0 ? 'var(--red)' : 'var(--muted-2)' }}>{formatCurrency(pnl)}</em>
                    <small>{dayTrades.length} trade{dayTrades.length !== 1 ? 's' : ''}</small>
                  </>
                ) : (
                  <em>--</em>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Trade Journal + Sidebar ── */}
      <div className="split-2u" style={{ marginTop: 32 }}>

        {/* Main: Trade Journal */}
        <div className="card" style={{ padding: '36px 28px 30px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
            <div>
              <h3 style={{ fontSize: 19 }}>Trade Journal</h3>
              <p className="sub">Click any trade card to open full review, violations context, and evidence.</p>
            </div>
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 16 }}>
              <span style={{ fontSize: '11.5px', color: 'var(--muted)' }}>
                {dayGroups.length} day groups · {filtered.length}/{filtered.length} rows loaded
              </span>
              {onBulkImport && (
                <button onClick={() => setShowImport(true)} className="btn-g" style={{ height: 32, padding: '0 14px', fontSize: 12 }}>
                  <Upload size={12} /> Import
                </button>
              )}
            </div>
          </div>

          {/* Asset class filter */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 44 }}>
            <button onClick={() => setMarketFilter('all')} className={`chip${marketFilter === 'all' ? ' on' : ''}`} style={{ height: 32 }}>All Assets</button>
            {MARKET_TYPE_LIST.map(mt => {
              const m = marketMeta(mt);
              const active = marketFilter === mt;
              return (
                <button key={mt} onClick={() => setMarketFilter(mt)} className={`chip${active ? ' on' : ''}`} style={{ height: 32 }}>
                  <span>{m.icon}</span> {m.label}
                </button>
              );
            })}
          </div>

          {/* View toggle */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 12 }}>
            <button onClick={() => setJournalView('day-cards')} className="chip"
              style={journalView === 'day-cards'
                ? { height: 32, borderColor: 'var(--amber)', color: 'var(--text)', fontWeight: 700 }
                : { height: 32 }}>
              <LayoutGrid size={13} /> Day Cards
            </button>
            <button onClick={() => setJournalView('timeline')} className="chip"
              style={journalView === 'timeline'
                ? { height: 32, borderColor: 'var(--amber)', color: 'var(--text)', fontWeight: 700 }
                : { height: 32 }}>
              <List size={13} /> Timeline
            </button>
          </div>

          {/* Day groups */}
          {dayGroups.length === 0 ? (
            <p className="empty-line" style={{ marginTop: 40 }}>No closed trades in this period. Add your first trade to get started.</p>
          ) : (
            <div>
              {dayGroups.map(group => {
                const hidden = hiddenDays.has(group.date);
                const winRate = group.trades.length > 0 ? Math.round((group.wins / group.trades.length) * 100) : 0;
                return (
                  <div key={group.date} className="daygroup">
                    {/* Day header */}
                    <div className="dh">
                      <b>{group.date}</b>
                      <span>{group.trades.length} trades</span>
                      <em>
                        Win rate {winRate}% · Wins {group.wins} · Losses {group.losses} · Size {group.totalSize.toFixed(2)}
                        <b style={{ marginLeft: 16, color: group.pnl >= 0 ? 'var(--green)' : 'var(--red)', fontFamily: 'var(--mono)' }}>{formatCurrency(group.pnl)}</b>
                      </em>
                      <button onClick={() => setHiddenDays(prev => { const n = new Set(prev); hidden ? n.delete(group.date) : n.add(group.date); return n; })}
                        style={{ fontSize: '11px', color: 'var(--muted-2)' }}>
                        {hidden ? 'Show' : 'Hide'}
                      </button>
                    </div>

                    {/* Trade cards */}
                    {!hidden && (
                      <div style={{
                        display: 'grid', gap: 12, marginTop: 12,
                        gridTemplateColumns: journalView === 'day-cards' ? 'repeat(auto-fill,minmax(210px,1fr))' : '1fr',
                      }}>
                        {group.trades.map(trade => (
                          <div key={trade.id} onClick={() => setDetailTrade(trade)}
                            style={{
                              border: '1px solid var(--line)', borderLeftWidth: 3,
                              borderLeftColor: (trade.actualPnL ?? 0) >= 0 ? 'var(--green)' : 'var(--red)',
                              borderRadius: 2, background: 'var(--panel-2)', padding: '14px 16px', cursor: 'pointer',
                            }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                              <b style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: 15 }}>
                                {trade.coin.length > 6 ? trade.coin.slice(0, 6) + '...' : trade.coin}
                              </b>
                              <MarketTypeBadge type={trade.marketType} />
                              {trade.direction && (
                                <span className="chip" style={{
                                  height: 18, padding: '0 10px', fontWeight: 700, fontSize: '9px',
                                  color: trade.direction === 'long' ? 'var(--green)' : 'var(--red)',
                                  borderColor: 'currentColor', background: 'none',
                                }}>{trade.direction === 'long' ? 'LONG' : 'SHORT'}</span>
                              )}
                              <span style={{
                                marginLeft: 'auto', fontFamily: 'var(--mono)', fontSize: 14,
                                color: (trade.actualPnL ?? 0) >= 0 ? 'var(--green)' : 'var(--red)',
                              }}>{formatCurrency(trade.actualPnL ?? 0)}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8, fontSize: '10.5px', color: 'var(--muted-2)' }}>
                              <span>{format(new Date(trade.createdAt), 'dd/MM')}</span>
                              <span>{trade.capital.toFixed(2)} size</span>
                              {trade.actualPnLPercent !== null && (
                                <span style={{ color: trade.actualPnLPercent >= 0 ? 'var(--green)' : 'var(--red)' }}>{formatPercent(trade.actualPnLPercent)}</span>
                              )}
                            </div>
                            <p style={{ margin: '8px 0 0', fontSize: '11.5px', color: 'var(--muted)' }}>{trade.strategy || 'No strategy'}</p>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                              {trade.tags.slice(0, 3).map(tag => (
                                <span key={tag} className="chip" style={{ height: 20, padding: '0 10px', fontSize: '9.5px' }}>{tag}</span>
                              ))}
                              {trade.tags.length > 3 && <span style={{ fontSize: '9.5px', color: 'var(--muted-2)' }}>+{trade.tags.length - 3}</span>}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 12, flexWrap: 'wrap' }}>
                              {trade.verdict ? (
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '10px', fontWeight: 700, color: 'var(--green)' }}><Eye size={10} /> REVIEWED</span>
                              ) : (
                                <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--amber)' }}>PENDING REVIEW</span>
                              )}
                              <span style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 12 }}>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const next = trade.visibility === 'public' ? 'private' : 'public';
                                    onUpdate(trade.id, { visibility: next })
                                      .then(() => showToast(next === 'public' ? 'Trade is now public — visible on your profile' : 'Trade hidden from your profile', 'success'))
                                      .catch((err: unknown) => showToast(err instanceof Error ? err.message : 'Failed to update visibility', 'error'));
                                  }}
                                  title={trade.visibility === 'public' ? 'Make this trade private' : 'Share this trade on your public profile'}
                                  style={{
                                    display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '10px', fontWeight: 700,
                                    color: trade.visibility === 'public' ? 'var(--green)' : 'var(--muted-2)',
                                  }}
                                >
                                  {trade.visibility === 'public' ? <><Globe size={10} /> PUBLIC</> : <><Lock size={10} /> PRIVATE</>}
                                </button>
                                <button onClick={(e) => { e.stopPropagation(); setDetailTrade(trade); }}
                                  style={{ fontSize: '11px', fontWeight: 700, color: 'var(--amber)', borderBottom: '1px solid var(--amber)', lineHeight: '14px' }}>
                                  Open review
                                </button>
                              </span>
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

        {/* ── Right Sidebar ── */}
        <div>
          {/* Review Queue Focus */}
          <div className="card" style={{ padding: '24px 18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Eye size={14} style={{ color: 'var(--green)', flex: 'none' }} />
              <h4>Review Queue Focus</h4>
            </div>
            <div className="qrow">Pending in view<em style={{ color: 'var(--amber)' }}>{metrics.total - metrics.reviewed}</em></div>
            <div className="qrow">Unknown side<em style={{ color: 'var(--amber)' }}>{filtered.filter(t => !t.direction).length}</em></div>
            <div className="qrow">High-fee trades<em style={{ color: 'var(--amber)' }}>0</em></div>
            <p className="lbl b95" style={{ marginTop: 26 }}>TOP PENDING SYMBOLS</p>
            <p style={{ margin: '9px 0 0', fontSize: 12, color: 'var(--muted)' }}>
              {filtered.filter(t => !t.verdict).length === 0
                ? 'No pending clusters in current filters.'
                : `${[...new Set(filtered.filter(t => !t.verdict).map(t => t.coin))].slice(0, 3).join(', ')} pending`}
            </p>
          </div>

          {/* Process Diagnostics */}
          <div className="card" style={{ marginTop: 25, padding: '22px 18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Sparkles size={14} style={{ color: 'var(--amber)', flex: 'none' }} />
              <h4>Process Diagnostics</h4>
            </div>
            <div className="qrow">Current streak<em>0 days</em></div>
            <div className="qrow">Average review rating<em style={{ color: 'var(--muted)' }}>--/5</em></div>
            <div className="qrow">Cost drag (fees+funding)<em>{formatCurrency(filtered.reduce((s, t) => s + (t.fees ?? 0) + (t.funding ?? 0), 0))}</em></div>
            <p className="lbl b95" style={{ marginTop: 24 }}>SETUP QUALITY</p>
            <p style={{ margin: '9px 0 0', fontSize: '11.5px', color: 'var(--muted)' }}>
              {metrics.total < 5 ? 'Not enough setup sample yet. Add more reviewed trades to rank setup quality.' : `${metrics.processHealth}% process health across ${metrics.total} trades.`}
            </p>
          </div>

          {/* Patterns Discovered */}
          <div className="card" style={{ marginTop: 22, padding: '22px 18px' }}>
            <span className="accent" style={{ width: 44, background: 'var(--amber)' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Sparkles size={14} style={{ color: 'var(--amber)', flex: 'none' }} />
              <h4>Patterns Discovered</h4>
            </div>
            <p style={{ margin: '12px 0 0', fontSize: 12, color: 'var(--muted-2)' }}>Insights based on your trades in the selected period</p>
            {patterns.length === 0 ? (
              <p style={{ margin: '8px 0 0', fontSize: 12, color: 'var(--muted)' }}>Not enough data to detect patterns yet.</p>
            ) : (
              <div>
                {patterns.map((p, i) => {
                  const tone = p.color === 'green' ? 'var(--green)' : p.color === 'red' ? 'var(--red)' : 'var(--teal)';
                  return (
                    <div key={i} className="inset" style={{ marginTop: 12, borderLeft: `3px solid ${tone}`, padding: '12px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                        <b style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: '12.5px', color: tone }}>{p.name}</b>
                        <span style={{
                          marginLeft: 'auto', fontFamily: 'var(--mono)', fontSize: '10.5px',
                          color: p.winRate >= 50 ? 'var(--green)' : 'var(--red)',
                        }}>{p.winRate}% Win</span>
                      </div>
                      <p style={{ margin: '8px 0 0', fontSize: '11.5px', color: 'var(--muted)' }}>Net {formatCurrency(p.net)} across {p.count} trades.</p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 10 }}>
                        <span style={{ flex: 1, height: 2, background: 'var(--rail)', display: 'block' }}>
                          <i style={{ display: 'block', width: `${p.share}%`, height: 2, background: tone }} />
                        </span>
                        <span style={{ fontSize: '10px', color: 'var(--muted-2)' }}>Share {p.share}%</span>
                      </div>
                    </div>
                  );
                })}
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
        <p style={{ margin: '0 0 20px', fontSize: '12.5px', color: 'var(--muted)' }}>Are you sure? This cannot be undone.</p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
          <button onClick={() => setDeleteConfirm(null)} className="btn-g" style={{ height: 36 }}>Cancel</button>
          <button onClick={() => deleteConfirm && handleDeleteConfirm(deleteConfirm)} className="btn-a"
            style={{ height: 36, background: 'var(--red)', color: '#fff' }}>Delete</button>
        </div>
      </Modal>
    </div>
  );
}
