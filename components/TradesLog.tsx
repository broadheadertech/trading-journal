'use client';

import { useState, useMemo, useEffect } from 'react';
import { Trade, Strategy, EmotionState } from '@/lib/types';
import { formatPercent, isLuckyWin } from '@/lib/utils';
import { useCurrency } from '@/hooks/useCurrency';
import { Plus, Edit2, Trash2, Filter, ArrowUpDown, ChevronDown, ChevronLeft, ChevronRight, Search, LayoutGrid, List, ImageIcon } from 'lucide-react';
import { format } from 'date-fns';
import Modal from './ui/Modal';
import TradeForm from './TradeForm';
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
  showAddModal?: boolean;
  onCloseAddModal?: () => void;
  onRuleBreak?: (ruleName: string, explanation: string) => void;
  initialCapital?: number;
}

type SortKey = 'entryDate' | 'coin' | 'actualPnLPercent' | 'capital' | 'strategy';
type TradesSubTab = 'log' | 'lessons';

const SUB_TABS: { id: TradesSubTab; label: string }[] = [
  { id: 'log', label: 'Trade Log' },
  { id: 'lessons', label: 'Lessons' },
];

export default function TradesLog({
  trades, strategies, onAdd, onUpdate, onDelete, showAddModal, onCloseAddModal, onRuleBreak, initialCapital = 0,
}: TradesLogProps) {
  const { showToast } = useToast();
  const { formatCurrency, formatPrice } = useCurrency();
  const usage = useUsage();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editTrade, setEditTrade] = useState<Trade | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [filterCoin, setFilterCoin] = useState('');
  const [filterStrategy, setFilterStrategy] = useState('');
  const [filterResult, setFilterResult] = useState<'all' | 'win' | 'loss' | 'open'>('all');
  const [sortKey, setSortKey] = useState<SortKey>('entryDate');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [patternStrip, setPatternStrip] = useState(false);
  const [postTradeSnapshot, setPostTradeSnapshot] = useState<PostTradeSnapshot | null>(null);
  const [viewTrade, setViewTrade] = useState<Trade | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [subTab, setSubTab] = useState<TradesSubTab>('log');
  const PAGE_SIZE = 10;

  const isModalOpen = isAddOpen || !!showAddModal;

  const handleCloseModal = () => {
    setIsAddOpen(false);
    onCloseAddModal?.();
  };

  const currentBalance = useMemo(() => {
    const totalPnL = trades
      .filter(t => !t.isOpen && t.actualPnL !== null)
      .reduce((sum, t) => sum + (t.actualPnL ?? 0), 0);
    return initialCapital + totalPnL;
  }, [trades, initialCapital]);

  // All trades with broken rules or lesson notes, sorted by rule break count desc
  const lessonTrades = useMemo(() => {
    return [...trades]
      .filter(t => !t.isOpen && (
        t.ruleChecklist.some(r => r.compliance === 'no') ||
        t.lessonNotes.trim() ||
        t.lossHypothesis?.trim()
      ))
      .sort((a, b) => {
        const aBroken = a.ruleChecklist.filter(r => r.compliance === 'no').length;
        const bBroken = b.ruleChecklist.filter(r => r.compliance === 'no').length;
        if (bBroken !== aBroken) return bBroken - aBroken;
        return new Date(b.exitDate || b.entryDate).getTime() - new Date(a.exitDate || a.entryDate).getTime();
      });
  }, [trades]);

  const filtered = useMemo(() => {
    let result = [...trades];
    if (filterCoin) result = result.filter(t => t.coin.toLowerCase().includes(filterCoin.toLowerCase()));
    if (filterStrategy) result = result.filter(t => t.strategy === filterStrategy);
    if (filterResult === 'win') result = result.filter(t => !t.isOpen && (t.actualPnLPercent ?? 0) > 0);
    if (filterResult === 'loss') result = result.filter(t => !t.isOpen && (t.actualPnLPercent ?? 0) <= 0);
    if (filterResult === 'open') result = result.filter(t => t.isOpen);
    // C-32: Search across all text fields
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(t =>
        t.coin.toLowerCase().includes(q) ||
        t.strategy.toLowerCase().includes(q) ||
        t.setupNotes.toLowerCase().includes(q) ||
        t.executionNotes.toLowerCase().includes(q) ||
        t.lessonNotes.toLowerCase().includes(q) ||
        t.notes.toLowerCase().includes(q) ||
        t.oneThingNote.toLowerCase().includes(q) ||
        t.tags.join(' ').toLowerCase().includes(q)
      );
    }

    result.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case 'entryDate': cmp = new Date(a.entryDate).getTime() - new Date(b.entryDate).getTime(); break;
        case 'coin': cmp = a.coin.localeCompare(b.coin); break;
        case 'actualPnLPercent': cmp = (a.actualPnLPercent ?? 0) - (b.actualPnLPercent ?? 0); break;
        case 'capital': cmp = a.capital - b.capital; break;
        case 'strategy': cmp = (a.strategy || '').localeCompare(b.strategy || ''); break;
      }
      return sortDir === 'desc' ? -cmp : cmp;
    });
    return result;
  }, [trades, filterCoin, filterStrategy, filterResult, sortKey, sortDir, searchQuery]);

  // Running balance map: tradeId → cumulative balance after that closed trade
  const balanceMap = useMemo(() => {
    const map = new Map<string, number>();
    const sorted = [...trades]
      .filter(t => !t.isOpen && t.actualPnL !== null && t.exitDate)
      .sort((a, b) => new Date(a.exitDate!).getTime() - new Date(b.exitDate!).getTime());
    let balance = initialCapital;
    for (const t of sorted) {
      balance += t.actualPnL ?? 0;
      map.set(t.id, balance);
    }
    return map;
  }, [trades, initialCapital]);

  // Reset to page 1 whenever filters/search/sort change
  useEffect(() => { setCurrentPage(1); }, [searchQuery, filterCoin, filterStrategy, filterResult, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginatedTrades = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const handleAdd = (trade: Omit<Trade, 'id' | 'createdAt' | 'actualPnL' | 'actualPnLPercent' | 'verdict'>) => {
    onAdd(trade);
    handleCloseModal();
    // Show post-trade analysis for closed trades
    if (!trade.isOpen && trade.exitPrice) {
      setPostTradeSnapshot({
        coin: trade.coin,
        strategy: trade.strategy,
        entryPrice: trade.entryPrice,
        exitPrice: trade.exitPrice,
        capital: trade.capital,
        confidence: trade.confidence,
        stopLoss: trade.stopLoss ?? null,
        ruleChecklist: trade.ruleChecklist,
      });
    } else {
      showToast('Trade logged successfully');
    }
  };

  const handleEdit = (trade: Omit<Trade, 'id' | 'createdAt' | 'actualPnL' | 'actualPnLPercent' | 'verdict'>) => {
    if (editTrade) {
      onUpdate(editTrade.id, trade);
      setEditTrade(null);
      showToast('Trade updated');
    }
  };

  const handleDelete = (id: string) => {
    onDelete(id);
    setDeleteConfirm(null);
    showToast('Trade deleted');
  };

  const uniqueCoins = [...new Set(trades.map(t => t.coin))];
  const uniqueStrategies = [...new Set(trades.map(t => t.strategy).filter(Boolean))];

  const SortHeader = ({ label, sortId }: { label: string; sortId: SortKey }) => (
    <th
      onClick={() => handleSort(sortId)}
      className="py-3 px-3 font-medium cursor-pointer hover:text-[var(--foreground)] transition-colors select-none"
    >
      <div className="flex items-center gap-1">
        {label}
        <ArrowUpDown size={12} className={sortKey === sortId ? 'text-[var(--accent)]' : 'opacity-30'} />
      </div>
    </th>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold">Trades Log</h2>
          <p className="text-sm text-[var(--muted-foreground)]">{trades.length} total · {filtered.length} shown</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPatternStrip(p => !p)}
            title={patternStrip ? 'Table view' : 'Pattern strip view'}
            className={`p-2 rounded-lg border transition-colors ${patternStrip ? 'border-[var(--accent)] text-[var(--accent)]' : 'border-[var(--border)] text-[var(--muted-foreground)] hover:border-[var(--accent)]/50'}`}
          >
            {patternStrip ? <List size={16} /> : <LayoutGrid size={16} />}
          </button>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-3 py-2 text-sm rounded-lg border transition-colors ${showFilters ? 'border-[var(--accent)] text-[var(--accent)]' : 'border-[var(--border)] text-[var(--muted-foreground)] hover:border-[var(--accent)]/50'}`}
          >
            <Filter size={16} /> Filters <ChevronDown size={14} className={`transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </button>
          <button
            onClick={() => { setIsAddOpen(true); }}
            disabled={usage.trades.isAtLimit}
            title={usage.trades.isAtLimit ? 'Trade limit reached — upgrade to add more' : undefined}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus size={16} /> Add Trade
          </button>
        </div>
      </div>

      {/* Usage indicator for limited tiers */}
      {!usage.trades.isUnlimited && (
        <div className="max-w-xs">
          <UsageBar label="Trades" current={usage.trades.current} max={usage.trades.max} isUnlimited={false} />
          {usage.trades.isAtLimit && (
            <p className="text-xs text-[var(--red)] mt-1">Trade limit reached &mdash; upgrade to add more</p>
          )}
        </div>
      )}

      {/* Sub-tabs */}
      <div className="flex gap-1.5 flex-wrap">
        {SUB_TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setSubTab(tab.id)}
            className={`px-3.5 py-1.5 text-sm font-medium rounded-lg transition-colors ${
              subTab === tab.id
                ? 'bg-[var(--accent)] text-white'
                : 'text-[var(--muted-foreground)] hover:bg-[var(--muted)]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {subTab === 'log' && (<>
      {/* C-32: Search bar */}
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] pointer-events-none z-10" />
        <input
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Search trades by coin, strategy, notes, tags..."
          className="text-sm"
          style={{ paddingLeft: '2.25rem' }}
        />
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 sm:p-4 bg-[var(--card)] border border-[var(--border)] rounded-xl animate-in">
          <div>
            <label className="text-xs text-[var(--muted-foreground)] mb-1 block">Symbol</label>
            <select value={filterCoin} onChange={e => setFilterCoin(e.target.value)}>
              <option value="">All Symbols</option>
              {uniqueCoins.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-[var(--muted-foreground)] mb-1 block">Strategy</label>
            <select value={filterStrategy} onChange={e => setFilterStrategy(e.target.value)}>
              <option value="">All Strategies</option>
              {uniqueStrategies.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-[var(--muted-foreground)] mb-1 block">Result</label>
            <select value={filterResult} onChange={e => setFilterResult(e.target.value as typeof filterResult)}>
              <option value="all">All</option>
              <option value="win">Wins</option>
              <option value="loss">Losses</option>
              <option value="open">Open</option>
            </select>
          </div>
        </div>
      )}

      {/* Trades */}
      {trades.length === 0 ? (
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-[var(--muted)] flex items-center justify-center mx-auto">
            <Plus size={24} className="text-[var(--muted-foreground)]" />
          </div>
          <h3 className="text-base font-semibold text-[var(--foreground)]">No trades yet</h3>
          <p className="text-sm text-[var(--muted-foreground)] max-w-xs mx-auto">
            Start logging trades to track your performance, build discipline, and unlock analytics.
          </p>
          <button
            onClick={() => { setIsAddOpen(true); }}
            disabled={usage.trades.isAtLimit}
            className="px-5 py-2 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
          >
            Log Your First Trade
          </button>
        </div>
      ) : patternStrip ? (
        /* C-30: Pattern Strip View */
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4">
          <p className="text-xs text-[var(--muted-foreground)] mb-3">Last {Math.min(filtered.length, 20)} trades — dot color = outcome, bottom bar = rule compliance</p>
          <div className="flex flex-wrap gap-1.5">
            {filtered.slice(0, 20).map(trade => {
              const isWin = !trade.isOpen && (trade.actualPnL ?? 0) > 0;
              const isLoss = !trade.isOpen && (trade.actualPnL ?? 0) < 0;
              const broke = trade.ruleChecklist.some(r => r.compliance === 'no');
              const lucky = isLuckyWin(trade);
              return (
                <div
                  key={trade.id}
                  title={`${trade.coin} · ${trade.exitDate ? format(new Date(trade.exitDate), 'MMM d') : 'Open'} · ${trade.actualPnLPercent !== null ? formatPercent(trade.actualPnLPercent) : '—'}${lucky ? ' · Lucky Win' : ''}`}
                  className="flex flex-col items-center gap-0.5 cursor-pointer"
                  onClick={() => setViewTrade(trade)}
                >
                  <div className={`w-4 h-4 rounded-sm ${trade.isOpen ? 'bg-[var(--muted)]' : isWin ? 'bg-[var(--green)]' : 'bg-[var(--red)]'} ${lucky ? 'ring-1 ring-amber-400' : ''}`} />
                  <div className={`w-4 h-1 rounded-sm ${broke ? 'bg-red-400/60' : trade.ruleChecklist.length > 0 ? 'bg-green-400/40' : 'bg-[var(--muted)]'}`} />
                </div>
              );
            })}
          </div>
          <div className="flex items-center gap-4 mt-2 text-[10px] text-[var(--muted-foreground)]">
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-[var(--green)] inline-block" /> Win</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-[var(--red)] inline-block" /> Loss</span>
            <span className="flex items-center gap-1"><span className="w-3 h-1 rounded-sm bg-red-400/60 inline-block" /> Rule break</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm ring-1 ring-amber-400 bg-[var(--green)] inline-block" /> Lucky Win</span>
          </div>
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block bg-[var(--card)] border border-[var(--border)] rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[var(--muted-foreground)] border-b border-[var(--border)] text-xs uppercase tracking-wide">
                    <SortHeader label="Date" sortId="entryDate" />
                    <SortHeader label="Symbol" sortId="coin" />
                    <th className="py-3 px-3 font-medium">Entry</th>
                    <th className="py-3 px-3 font-medium">Exit</th>
                    <SortHeader label="P&L %" sortId="actualPnLPercent" />
                    <th className="py-3 px-3 font-medium">P&L $</th>
                    {initialCapital > 0 && <th className="py-3 px-3 font-medium">Balance</th>}
                    <SortHeader label="Strategy" sortId="strategy" />
                    <th className="py-3 px-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {paginatedTrades.map(trade => {
                    const lucky = isLuckyWin(trade);
                    return (
                      <tr key={trade.id} className="hover:bg-[var(--card-hover)] transition-colors cursor-pointer" onClick={() => setViewTrade(trade)}>
                        <td className="py-3 px-3">{format(new Date(trade.entryDate), 'MMM dd, yy')}</td>
                        <td className="py-3 px-3 font-medium">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span>{trade.coin}</span>
                            {trade.marketType && trade.marketType !== 'crypto' && (
                              <span className="text-[10px] px-1 py-0.5 rounded bg-[var(--muted)] text-[var(--muted-foreground)] border border-[var(--border)]">
                                {trade.marketType === 'stocks' ? '📈' : '💱'}
                              </span>
                            )}
                            {trade.screenshots?.length > 0 && (
                              <span title={`${trade.screenshots.length} chart${trade.screenshots.length > 1 ? 's' : ''}`} className="shrink-0">
                                <ImageIcon size={11} className="text-[var(--muted-foreground)]" />
                              </span>
                            )}
                            {lucky && <span className="text-[10px] bg-amber-500/15 text-amber-400 border border-amber-500/30 rounded px-1">🍀 Lucky Win</span>}
                          </div>
                        </td>
                        <td className="py-3 px-3 text-[var(--muted-foreground)]">{formatPrice(trade.entryPrice)}</td>
                        <td className="py-3 px-3 text-[var(--muted-foreground)]">
                          {trade.isOpen ? <span className="text-[var(--yellow)]">Open</span> : trade.exitPrice ? formatPrice(trade.exitPrice) : '—'}
                        </td>
                        <td className={`py-3 px-3 font-medium ${trade.isOpen ? '' : (trade.actualPnLPercent ?? 0) >= 0 ? 'text-[var(--green)]' : 'text-[var(--red)]'}`}>
                          {trade.isOpen ? '—' : formatPercent(trade.actualPnLPercent ?? 0)}
                        </td>
                        <td className={`py-3 px-3 font-medium ${trade.isOpen ? '' : (trade.actualPnL ?? 0) >= 0 ? 'text-[var(--green)]' : 'text-[var(--red)]'}`}>
                          {trade.isOpen ? '—' : formatCurrency(trade.actualPnL ?? 0)}
                        </td>
                        {initialCapital > 0 && (
                          <td className={`py-3 px-3 font-medium tabular-nums ${
                            trade.isOpen || !balanceMap.has(trade.id) ? 'text-[var(--muted-foreground)]' :
                            (balanceMap.get(trade.id)! >= initialCapital) ? 'text-[var(--green)]' : 'text-[var(--red)]'
                          }`}>
                            {trade.isOpen || !balanceMap.has(trade.id) ? '—' : formatCurrency(balanceMap.get(trade.id)!)}
                          </td>
                        )}
                        <td className="py-3 px-3 text-[var(--muted-foreground)]">{trade.strategy || '—'}</td>
                        <td className="py-3 px-3" onClick={e => e.stopPropagation()}>
                          <div className="flex justify-end gap-1">
                            <button onClick={() => setEditTrade(trade)} className="p-1.5 hover:bg-[var(--muted)] rounded-lg text-[var(--muted-foreground)]">
                              <Edit2 size={14} />
                            </button>
                            <button onClick={() => setDeleteConfirm(trade.id)} className="p-1.5 hover:bg-red-500/10 rounded-lg text-[var(--red)]">
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden space-y-3">
            {paginatedTrades.map(trade => {
              const lucky = isLuckyWin(trade);
              return (
                <div key={trade.id} className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-3.5 hover:border-[var(--accent)]/30 transition-colors cursor-pointer" onClick={() => setViewTrade(trade)}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold">{trade.coin}</span>
                      {trade.marketType && trade.marketType !== 'crypto' && (
                        <span className="text-[10px]">{trade.marketType === 'stocks' ? '📈' : '💱'}</span>
                      )}
                      {lucky && <span className="text-[10px] bg-amber-500/15 text-amber-400 border border-amber-500/30 rounded px-1">🍀 Lucky Win</span>}
                    </div>
                    <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                      <button onClick={() => setEditTrade(trade)} className="p-1.5 hover:bg-[var(--muted)] rounded-lg text-[var(--muted-foreground)]">
                        <Edit2 size={14} />
                      </button>
                      <button onClick={() => setDeleteConfirm(trade.id)} className="p-1.5 hover:bg-red-500/10 rounded-lg text-[var(--red)]">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-[var(--muted-foreground)]">{format(new Date(trade.entryDate), 'MMM dd, yyyy')}</span>
                    {trade.isOpen ? (
                      <span className="text-sm font-medium text-[var(--yellow)]">Open</span>
                    ) : (
                      <span className={`text-sm font-bold ${(trade.actualPnLPercent ?? 0) >= 0 ? 'text-[var(--green)]' : 'text-[var(--red)]'}`}>
                        {formatPercent(trade.actualPnLPercent ?? 0)} ({formatCurrency(trade.actualPnL ?? 0)})
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-[var(--muted-foreground)]">
                    <span>Entry: {formatPrice(trade.entryPrice)}</span>
                    <span>Exit: {trade.isOpen ? '—' : trade.exitPrice ? formatPrice(trade.exitPrice) : '—'}</span>
                    {trade.strategy && <span className="ml-auto truncate max-w-[120px]">{trade.strategy}</span>}
                  </div>
                  {initialCapital > 0 && !trade.isOpen && balanceMap.has(trade.id) && (
                    <div className="mt-1.5 pt-1.5 border-t border-[var(--border)] flex items-center justify-between text-xs">
                      <span className="text-[var(--muted-foreground)]">Balance after</span>
                      <span className={`font-medium tabular-nums ${balanceMap.get(trade.id)! >= initialCapital ? 'text-[var(--green)]' : 'text-[var(--red)]'}`}>
                        {formatCurrency(balanceMap.get(trade.id)!)}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-1">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border border-(--border) text-(--muted-foreground) hover:bg-(--muted) disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft size={14} /> Previous
              </button>
              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`w-7 h-7 text-xs rounded-md transition-colors ${
                      page === currentPage
                        ? 'bg-(--accent) text-white'
                        : 'text-(--muted-foreground) hover:bg-(--muted)'
                    }`}
                  >
                    {page}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border border-(--border) text-(--muted-foreground) hover:bg-(--muted) disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Next <ChevronRight size={14} />
              </button>
            </div>
          )}
        </>
      )}

      </>)}

      {/* Lessons sub-tab */}
      {subTab === 'lessons' && (
        lessonTrades.length === 0 ? (
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-12 text-center">
            <p className="text-[var(--muted-foreground)]">No lessons yet. Broken rules and lesson notes from your trades will appear here.</p>
          </div>
        ) : (<>
          {/* Desktop table */}
          <div className="hidden md:block bg-[var(--card)] border border-[var(--border)] rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[var(--muted-foreground)] border-b border-[var(--border)] text-xs uppercase tracking-wide">
                    <th className="py-3 px-3 font-medium">Date</th>
                    <th className="py-3 px-3 font-medium">Symbol</th>
                    <th className="py-3 px-3 font-medium">Strategy</th>
                    <th className="py-3 px-3 font-medium">P&L %</th>
                    <th className="py-3 px-3 font-medium">Broken Rules</th>
                    <th className="py-3 px-3 font-medium">Lesson / Hypothesis</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {lessonTrades.map(trade => {
                    const brokenRules = trade.ruleChecklist.filter(r => r.compliance === 'no').map(r => r.rule);
                    const lesson = trade.lessonNotes || trade.lossHypothesis || trade.notes;
                    return (
                      <tr key={trade.id} className="hover:bg-[var(--card-hover)] transition-colors cursor-pointer" onClick={() => setViewTrade(trade)}>
                        <td className="py-3 px-3 whitespace-nowrap">{format(new Date(trade.exitDate || trade.entryDate), 'MMM dd, yy')}</td>
                        <td className="py-3 px-3 font-medium">{trade.coin}</td>
                        <td className="py-3 px-3 text-[var(--muted-foreground)]">{trade.strategy || '—'}</td>
                        <td className={`py-3 px-3 font-medium ${(trade.actualPnLPercent ?? 0) >= 0 ? 'text-[var(--green)]' : 'text-[var(--red)]'}`}>
                          {trade.actualPnLPercent !== null ? formatPercent(trade.actualPnLPercent) : '—'}
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex flex-wrap gap-1">
                            {brokenRules.length > 0 ? brokenRules.map((r, i) => (
                              <span key={i} className="text-[10px] px-1.5 py-0.5 bg-red-500/10 text-red-400 border border-red-500/20 rounded">
                                {r}
                              </span>
                            )) : <span className="text-[var(--muted-foreground)] text-xs">—</span>}
                          </div>
                        </td>
                        <td className="py-3 px-3 text-xs text-[var(--muted-foreground)] max-w-[300px]">
                          {lesson ? <span className="line-clamp-2">{lesson}</span> : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {lessonTrades.map(trade => {
              const brokenRules = trade.ruleChecklist.filter(r => r.compliance === 'no').map(r => r.rule);
              const lesson = trade.lessonNotes || trade.lossHypothesis || trade.notes;
              return (
                <div key={trade.id} className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-3.5 cursor-pointer hover:border-[var(--accent)]/30 transition-colors" onClick={() => setViewTrade(trade)}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm">{trade.coin}</span>
                      {trade.strategy && <span className="text-[10px] px-1.5 py-0.5 bg-[var(--muted)] text-[var(--muted-foreground)] rounded">{trade.strategy}</span>}
                    </div>
                    <span className={`text-sm font-bold ${(trade.actualPnLPercent ?? 0) >= 0 ? 'text-[var(--green)]' : 'text-[var(--red)]'}`}>
                      {trade.actualPnLPercent !== null ? formatPercent(trade.actualPnLPercent) : '—'}
                    </span>
                  </div>
                  <p className="text-[10px] text-[var(--muted-foreground)] mb-1.5">{format(new Date(trade.exitDate || trade.entryDate), 'MMM dd, yyyy')}</p>
                  {brokenRules.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-1.5">
                      {brokenRules.map((r, i) => (
                        <span key={i} className="text-[10px] px-1.5 py-0.5 bg-red-500/10 text-red-400 border border-red-500/20 rounded">{r}</span>
                      ))}
                    </div>
                  )}
                  {lesson && (
                    <p className="text-xs text-[var(--muted-foreground)] line-clamp-2">{lesson}</p>
                  )}
                </div>
              );
            })}
          </div>
        </>)
      )}

      {/* Add Modal */}
      <Modal isOpen={isModalOpen && !editTrade} onClose={handleCloseModal} title="Log New Trade" size="xl">
        <TradeForm
          strategies={strategies}
          trades={trades}
          onSubmit={handleAdd}
          onCancel={handleCloseModal}
          onRuleBreak={onRuleBreak}
          availableBalance={currentBalance}
        />
      </Modal>

      {/* Trade Detail View */}
      <Modal
        isOpen={!!viewTrade && !editTrade}
        onClose={() => setViewTrade(null)}
        title={viewTrade ? `${viewTrade.coin} · ${viewTrade.strategy || 'Trade'}` : 'Trade'}
        size="xl"
      >
        {viewTrade && (
          <TradeDetailView
            trade={viewTrade}
            onEdit={() => {
              setEditTrade(viewTrade);
              setViewTrade(null);
            }}
          />
        )}
      </Modal>

      {/* Edit Modal - Direct to form (no checkpoint for edits) */}
      <Modal isOpen={!!editTrade} onClose={() => setEditTrade(null)} title="Edit Trade" size="xl">
        <TradeForm
          strategies={strategies}
          trades={trades}
          editTrade={editTrade}
          onSubmit={handleEdit}
          onCancel={() => setEditTrade(null)}
          onRuleBreak={onRuleBreak}
          availableBalance={currentBalance}
        />
      </Modal>

      {/* Delete Confirmation */}
      <Modal isOpen={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} title="Delete Trade" size="sm">
        <p className="text-sm text-[var(--muted-foreground)] mb-4">Are you sure you want to delete this trade? This cannot be undone.</p>
        <div className="flex justify-end gap-3">
          <button onClick={() => setDeleteConfirm(null)} className="px-4 py-2 text-sm rounded-lg hover:bg-[var(--muted)]">Cancel</button>
          <button onClick={() => deleteConfirm && handleDelete(deleteConfirm)} className="px-4 py-2 text-sm bg-[var(--red)] hover:bg-red-600 text-white rounded-lg">Delete</button>
        </div>
      </Modal>

      {/* Post-Trade Review */}
      <Modal
        isOpen={!!postTradeSnapshot}
        onClose={() => setPostTradeSnapshot(null)}
        title="Trade Analysis"
        size="lg"
      >
        {postTradeSnapshot && (
          <PostTradeReview
            snapshot={postTradeSnapshot}
            allTrades={trades}
            onSave={(exitEmotion: EmotionState) => {
              // Save exit emotion on the most recently added trade
              const newest = trades.reduce<Trade | null>(
                (latest, t) => (!latest || t.createdAt > latest.createdAt) ? t : latest,
                null
              );
              if (newest) onUpdate(newest.id, { exitEmotion });
              setPostTradeSnapshot(null);
              showToast('Reflection saved');
            }}
            onSkip={() => {
              setPostTradeSnapshot(null);
              showToast('Trade logged successfully');
            }}
          />
        )}
      </Modal>
    </div>
  );
}
