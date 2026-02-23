'use client';

import { useState } from 'react';
import { PreTradeChecklist as ChecklistType, MarketTrend, RiskLevel, Strategy } from '@/lib/types';
import { format } from 'date-fns';
import { Plus, Trash2, TrendingUp, TrendingDown, Minus, Sparkles } from 'lucide-react';
import { useToast } from './ui/Toast';
import Modal from './ui/Modal';

interface Props {
  checklists: ChecklistType[];
  strategies: Strategy[];
  onAdd: (checklist: Omit<ChecklistType, 'id' | 'createdAt'>) => void;
  onDelete: (id: string) => void;
}

export default function PreTradeChecklist({ checklists, strategies, onAdd, onDelete }: Props) {
  const { showToast } = useToast();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [marketTrend, setMarketTrend] = useState<MarketTrend>('sideways');
  const [volumeAnalysis, setVolumeAnalysis] = useState('');
  const [supportLevels, setSupportLevels] = useState('');
  const [resistanceLevels, setResistanceLevels] = useState('');
  const [newsEvents, setNewsEvents] = useState('');
  const [riskLevel, setRiskLevel] = useState<RiskLevel>('medium');
  const [notes, setNotes] = useState('');
  const [aiResult, setAiResult] = useState<string | null>(null);

  const handleSubmit = () => {
    const checklist: Omit<ChecklistType, 'id' | 'createdAt'> = {
      marketTrend,
      volumeAnalysis,
      supportLevels,
      resistanceLevels,
      newsEvents,
      riskLevel,
      notes,
      aiRecommendation: aiResult || undefined,
    };
    onAdd(checklist);
    resetForm();
    setIsFormOpen(false);
    showToast('Market context saved');
  };

  const resetForm = () => {
    setMarketTrend('sideways');
    setVolumeAnalysis('');
    setSupportLevels('');
    setResistanceLevels('');
    setNewsEvents('');
    setRiskLevel('medium');
    setNotes('');
    setAiResult(null);
  };

  const handleAiAnalysis = () => {
    const analysis = generateSessionAnalysis(marketTrend, riskLevel, volumeAnalysis, newsEvents, strategies);
    setAiResult(analysis);
    showToast('Analysis generated', 'info');
  };

  const trendIcons = {
    bullish: <TrendingUp size={16} className="text-[var(--green)]" />,
    bearish: <TrendingDown size={16} className="text-[var(--red)]" />,
    sideways: <Minus size={16} className="text-[var(--yellow)]" />,
  };

  const riskColors = {
    low: 'text-[var(--green)] bg-green-500/10 border-green-500/30',
    medium: 'text-[var(--yellow)] bg-yellow-500/10 border-yellow-500/30',
    high: 'text-[var(--red)] bg-red-500/10 border-red-500/30',
    extreme: 'text-red-300 bg-red-500/20 border-red-500/40',
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Market Context</h2>
          <p className="text-sm text-[var(--muted-foreground)]">Log the market conditions during your trading session</p>
        </div>
        <button onClick={() => setIsFormOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white rounded-lg text-sm font-medium transition-colors">
          <Plus size={16} /> New Entry
        </button>
      </div>

      {/* Form */}
      {isFormOpen && (
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 sm:p-6 space-y-4 sm:space-y-5 animate-in">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
            <div>
              <label className="block text-sm font-medium mb-2">Market Trend</label>
              <div className="flex gap-2">
                {(['bullish', 'bearish', 'sideways'] as const).map(trend => (
                  <button
                    key={trend}
                    onClick={() => setMarketTrend(trend)}
                    className={`flex-1 flex items-center justify-center gap-1.5 sm:gap-2 py-2 sm:py-2.5 text-xs sm:text-sm rounded-lg border transition-colors capitalize ${marketTrend === trend ? (trend === 'bullish' ? 'border-[var(--green)] bg-green-500/10 text-[var(--green)]' : trend === 'bearish' ? 'border-[var(--red)] bg-red-500/10 text-[var(--red)]' : 'border-[var(--yellow)] bg-yellow-500/10 text-[var(--yellow)]') : 'border-[var(--border)] text-[var(--muted-foreground)]'}`}
                  >
                    {trendIcons[trend]} {trend}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Session Risk Environment</label>
              <div className="grid grid-cols-4 gap-1.5 sm:flex sm:gap-2">
                {(['low', 'medium', 'high', 'extreme'] as const).map(level => (
                  <button
                    key={level}
                    onClick={() => setRiskLevel(level)}
                    className={`py-2 sm:py-2.5 text-xs sm:text-sm rounded-lg border transition-colors capitalize sm:flex-1 ${riskLevel === level ? riskColors[level] : 'border-[var(--border)] text-[var(--muted-foreground)]'}`}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Volume Observations</label>
            <textarea value={volumeAnalysis} onChange={e => setVolumeAnalysis(e.target.value)} rows={2} placeholder="What was volume doing during this session?" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Key Support Levels</label>
              <input value={supportLevels} onChange={e => setSupportLevels(e.target.value)} placeholder="e.g., 42000, 40500" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Key Resistance Levels</label>
              <input value={resistanceLevels} onChange={e => setResistanceLevels(e.target.value)} placeholder="e.g., 45000, 48000" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">News / Events During Session</label>
            <textarea value={newsEvents} onChange={e => setNewsEvents(e.target.value)} rows={2} placeholder="Any macro events, announcements, or catalysts that affected the session?" />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Session Notes</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Overall observations about how the market behaved..." />
          </div>

          {/* Session Analysis */}
          <div className="border border-[var(--border)] rounded-xl p-4 bg-[var(--muted)]/50">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Sparkles size={16} className="text-[var(--purple)]" />
                <span className="text-sm font-medium">Session Analysis</span>
              </div>
              <button
                onClick={handleAiAnalysis}
                className="px-3 py-1.5 text-xs bg-[var(--purple)]/20 text-[var(--purple)] border border-[var(--purple)]/30 rounded-lg hover:bg-[var(--purple)]/30 transition-colors"
              >
                Analyze
              </button>
            </div>
            {aiResult && (
              <div className="text-sm text-[var(--foreground)] whitespace-pre-line animate-in">{aiResult}</div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-[var(--border)]">
            <button onClick={() => { resetForm(); setIsFormOpen(false); }} className="px-4 py-2 text-sm rounded-lg hover:bg-[var(--muted)]">Cancel</button>
            <button onClick={handleSubmit} className="px-4 py-2 text-sm bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white rounded-lg font-medium">Save Entry</button>
          </div>
        </div>
      )}

      {/* Saved Entries */}
      {checklists.length === 0 && !isFormOpen ? (
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-12 text-center">
          <div className="w-16 h-16 rounded-full bg-[var(--muted)] flex items-center justify-center mx-auto text-[var(--muted-foreground)] mb-4">
            <MapIcon />
          </div>
          <p className="text-[var(--muted-foreground)] mb-3">No market context logged yet</p>
          <button onClick={() => setIsFormOpen(true)} className="text-[var(--accent)] hover:underline text-sm">Log your first market context</button>
        </div>
      ) : (
        <div className="space-y-3">
          {checklists.map(cl => (
            <div key={cl.id} className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-3.5 sm:p-5 hover:border-[var(--accent)]/30 transition-colors">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center flex-wrap gap-2 sm:gap-3">
                  <span className="text-xs text-[var(--muted-foreground)]">{format(new Date(cl.createdAt), 'MMM dd, yyyy HH:mm')}</span>
                  <span className="flex items-center gap-1 text-xs">{trendIcons[cl.marketTrend]} {cl.marketTrend}</span>
                  <span className={`px-2 py-0.5 text-xs rounded-full border ${riskColors[cl.riskLevel]}`}>{cl.riskLevel} risk</span>
                </div>
                <button onClick={() => setDeleteConfirm(cl.id)} className="p-1.5 hover:bg-red-500/10 rounded-lg text-[var(--red)] shrink-0"><Trash2 size={14} /></button>
              </div>
              {cl.volumeAnalysis && <p className="text-xs text-[var(--muted-foreground)] mb-1"><span className="text-[var(--foreground)] font-medium">Volume:</span> {cl.volumeAnalysis}</p>}
              {cl.supportLevels && <p className="text-xs text-[var(--muted-foreground)]"><span className="text-[var(--green)]">S:</span> {cl.supportLevels}</p>}
              {cl.resistanceLevels && <p className="text-xs text-[var(--muted-foreground)]"><span className="text-[var(--red)]">R:</span> {cl.resistanceLevels}</p>}
              {cl.newsEvents && <p className="text-xs text-[var(--muted-foreground)] mt-1"><span className="text-[var(--foreground)] font-medium">Events:</span> {cl.newsEvents}</p>}
              {cl.notes && <p className="text-xs text-[var(--muted-foreground)] mt-1 italic">{cl.notes}</p>}
              {cl.aiRecommendation && (
                <div className="mt-3 p-3 bg-[var(--muted)]/50 rounded-lg text-xs text-[var(--foreground)]">
                  <div className="flex items-center gap-1 mb-1 text-[var(--purple)]"><Sparkles size={12} /> Session Analysis</div>
                  {cl.aiRecommendation}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} title="Delete Entry" size="sm">
        <p className="text-sm text-[var(--muted-foreground)] mb-4">Delete this market context entry?</p>
        <div className="flex justify-end gap-3">
          <button onClick={() => setDeleteConfirm(null)} className="px-4 py-2 text-sm rounded-lg hover:bg-[var(--muted)]">Cancel</button>
          <button onClick={() => deleteConfirm && (onDelete(deleteConfirm), setDeleteConfirm(null), showToast('Entry deleted'))} className="px-4 py-2 text-sm bg-[var(--red)] hover:bg-red-600 text-white rounded-lg">Delete</button>
        </div>
      </Modal>
    </div>
  );
}

function generateSessionAnalysis(trend: MarketTrend, risk: RiskLevel, volume: string, news: string, strategies: Strategy[]): string {
  const trendSentiment = trend === 'bullish' ? 'bullish' : trend === 'bearish' ? 'bearish' : 'ranging/sideways';
  const riskNote = risk === 'extreme' ? 'Extreme risk conditions — losses during this session may be partly attributable to the environment.' : risk === 'high' ? 'High-risk environment — expect wider spreads and faster moves.' : risk === 'low' ? 'Low-risk environment — conditions were relatively stable.' : 'Moderate risk conditions.';
  const strategyNote = strategies.length > 0 ? `\n\nYou have ${strategies.length} strategy${strategies.length > 1 ? 'ies' : ''} defined. Review whether your trades aligned with your playbook given these conditions.` : '';

  return `Market was ${trendSentiment} during this session.${volume ? `\n\nVolume: ${volume}` : ''}${news ? `\n\nKey events: ${news}` : ''}\n\n${riskNote}${strategyNote}`;
}

function MapIcon() {
  return (
    <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
      <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21" /><line x1="9" y1="3" x2="9" y2="18" /><line x1="15" y1="6" x2="15" y2="21" />
    </svg>
  );
}
