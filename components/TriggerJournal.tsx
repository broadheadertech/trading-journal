'use client';

import { useState, useMemo } from 'react';
import { TriggerEntry, EmotionState, TriggerSource } from '@/lib/types';
import { EMOTION_OPTIONS } from '@/lib/utils';
import { TRIGGER_SOURCE_OPTIONS, analyzeTriggerPatterns } from '@/lib/discipline-engine';
import { Plus, Trash2, Zap, TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import Modal from './ui/Modal';
import { useToast } from './ui/Toast';

interface Props {
  triggers: TriggerEntry[];
  onAdd: (trigger: Omit<TriggerEntry, 'id' | 'createdAt'>) => void;
  onDelete: (id: string) => void;
}

export default function TriggerJournal({ triggers, onAdd, onDelete }: Props) {
  const { showToast } = useToast();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Form state
  const [source, setSource] = useState<TriggerSource>('crypto-twitter');
  const [description, setDescription] = useState('');
  const [emotionalImpact, setEmotionalImpact] = useState<EmotionState>('Neutral');
  const [intensityBefore, setIntensityBefore] = useState(3);
  const [intensityAfter, setIntensityAfter] = useState(5);
  const [didTrade, setDidTrade] = useState(false);

  // Pattern analysis
  const patterns = useMemo(() => analyzeTriggerPatterns(triggers), [triggers]);

  // Chart data
  const chartData = useMemo(() => {
    return patterns.slice(0, 8).map(p => {
      const opt = TRIGGER_SOURCE_OPTIONS.find(o => o.value === p.source);
      return {
        name: opt?.label ?? p.source,
        count: p.count,
        traded: p.tradedCount,
        winRate: p.winRate,
      };
    });
  }, [patterns]);

  // Top pattern insights
  const insights = useMemo(() => {
    const msgs: string[] = [];
    for (const p of patterns) {
      const label = TRIGGER_SOURCE_OPTIONS.find(o => o.value === p.source)?.label ?? p.source;
      if (p.tradedCount >= 3 && p.winRate < 40) {
        msgs.push(`You tend to lose money when trading after ${label} triggers (${p.winRate}% win rate).`);
      }
      if (p.count >= 5 && p.avgIntensityChange > 2) {
        msgs.push(`${label} significantly increases your emotional intensity (+${p.avgIntensityChange}).`);
      }
    }
    return msgs.slice(0, 3);
  }, [patterns]);

  const handleSubmit = () => {
    if (!description) return;
    onAdd({
      timestamp: new Date().toISOString(),
      source,
      description,
      emotionalImpact,
      intensityBefore,
      intensityAfter,
      didTrade,
      outcome: null,
    });
    showToast('Trigger logged');
    resetForm();
  };

  const resetForm = () => {
    setSource('crypto-twitter');
    setDescription('');
    setEmotionalImpact('Neutral');
    setIntensityBefore(3);
    setIntensityAfter(5);
    setDidTrade(false);
    setIsFormOpen(false);
  };

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold flex items-center gap-2">
            <Zap size={20} className="text-yellow-400" /> Trigger Journal
          </h3>
          <p className="text-xs text-[var(--muted-foreground)]">Track what makes you emotional and how it affects your trades</p>
        </div>
        <button
          onClick={() => setIsFormOpen(true)}
          className="flex items-center gap-2 px-3 py-1.5 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white rounded-lg text-sm font-medium transition-colors"
        >
          <Plus size={14} /> Log Trigger
        </button>
      </div>

      {/* Pattern Insights */}
      {insights.length > 0 && (
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-yellow-400">
            <AlertTriangle size={16} /> Trigger Patterns Detected
          </div>
          {insights.map((msg, i) => (
            <p key={i} className="text-sm text-[var(--foreground)]">{msg}</p>
          ))}
        </div>
      )}

      {/* Trigger Frequency Chart */}
      {chartData.length > 0 && (
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 sm:p-5">
          <h4 className="text-sm font-semibold mb-3">Trigger Sources</h4>
          <div className="h-[180px] sm:h-[220px]">
            <ResponsiveContainer>
              <BarChart data={chartData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={100} />
                <Tooltip
                  contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '12px' }}
                  formatter={(value: number | undefined, name: string | undefined) => [value ?? 0, name === 'count' ? 'Occurrences' : 'Led to Trade']}
                />
                <Bar dataKey="count" name="Occurrences" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                <Bar dataKey="traded" name="Led to Trade" radius={[0, 4, 4, 0]}>
                  {chartData.map((entry, i) => (
                    <Cell key={i} fill={entry.winRate >= 50 ? '#22c55e' : entry.traded > 0 ? '#ef4444' : '#6b7280'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Log Trigger Modal */}
      <Modal isOpen={isFormOpen} onClose={resetForm} title="Log Trigger" size="lg">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Trigger Source</label>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {TRIGGER_SOURCE_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setSource(opt.value as TriggerSource)}
                  className={`py-2 px-2 text-xs rounded-lg border transition-colors ${
                    source === opt.value
                      ? 'border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]'
                      : 'border-[var(--border)] text-[var(--muted-foreground)] hover:border-[var(--accent)]/50'
                  }`}
                >
                  {opt.emoji} {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">What happened?</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={2}
              placeholder="Describe what triggered your emotional response..."
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Emotional Impact</label>
              <div className="grid grid-cols-3 gap-1.5">
                {EMOTION_OPTIONS.slice(0, 6).map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setEmotionalImpact(opt.value as EmotionState)}
                    className={`py-1.5 text-[10px] rounded-lg border transition-colors ${
                      emotionalImpact === opt.value
                        ? 'border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]'
                        : 'border-[var(--border)] text-[var(--muted-foreground)]'
                    }`}
                  >
                    {opt.emoji} {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium mb-1">Intensity Before: {intensityBefore}/10</label>
                <input type="range" min="1" max="10" value={intensityBefore} onChange={e => setIntensityBefore(parseInt(e.target.value))} className="w-full accent-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Intensity After: {intensityAfter}/10</label>
                <input type="range" min="1" max="10" value={intensityAfter} onChange={e => setIntensityAfter(parseInt(e.target.value))} className="w-full accent-red-500" />
              </div>
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={didTrade} onChange={e => setDidTrade(e.target.checked)} className="w-4 h-4 rounded accent-[var(--accent)]" />
            I traded after this trigger
          </label>

          <div className="flex justify-end gap-3 pt-1">
            <button onClick={resetForm} className="px-4 py-2 text-sm rounded-lg hover:bg-[var(--muted)]">Cancel</button>
            <button
              onClick={handleSubmit}
              disabled={!description}
              className="px-4 py-2 text-sm bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white rounded-lg font-medium disabled:opacity-50"
            >
              Log Trigger
            </button>
          </div>
        </div>
      </Modal>

      {/* Trigger Entries */}
      <div className="space-y-2">
        {triggers.slice(0, 20).map(trigger => {
          const sourceOpt = TRIGGER_SOURCE_OPTIONS.find(o => o.value === trigger.source);
          const emotionOpt = EMOTION_OPTIONS.find(o => o.value === trigger.emotionalImpact);
          const intensityChange = trigger.intensityAfter - trigger.intensityBefore;
          return (
            <div key={trigger.id} className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-3.5 hover:border-[var(--accent)]/30 transition-colors">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center flex-wrap gap-2 mb-1">
                    <span className="text-xs font-medium">{sourceOpt?.emoji} {sourceOpt?.label}</span>
                    <span className="text-[10px] text-[var(--muted-foreground)]">
                      {format(new Date(trigger.timestamp), 'MMM dd, HH:mm')}
                    </span>
                    {trigger.didTrade && (
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                        trigger.outcome === 'win' ? 'bg-green-500/10 text-green-400' :
                        trigger.outcome === 'loss' ? 'bg-red-500/10 text-red-400' :
                        'bg-gray-500/10 text-gray-400'
                      }`}>
                        Traded{trigger.outcome ? ` → ${trigger.outcome}` : ''}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-[var(--foreground)] mb-1">{trigger.description}</p>
                  <div className="flex items-center gap-3 text-[10px] text-[var(--muted-foreground)]">
                    <span>{emotionOpt?.emoji} {trigger.emotionalImpact}</span>
                    <span className="flex items-center gap-1">
                      {intensityChange > 0 ? (
                        <><TrendingUp size={10} className="text-red-400" /> +{intensityChange}</>
                      ) : intensityChange < 0 ? (
                        <><TrendingDown size={10} className="text-green-400" /> {intensityChange}</>
                      ) : (
                        <>→ no change</>
                      )}
                    </span>
                  </div>
                </div>
                <button onClick={() => setDeleteConfirm(trigger.id)} className="p-1.5 hover:bg-red-500/10 rounded-lg text-[var(--muted-foreground)] shrink-0">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          );
        })}
        {triggers.length === 0 && (
          <div className="text-center py-8 text-sm text-[var(--muted-foreground)]">
            No triggers logged yet. Start tracking what makes you emotional!
          </div>
        )}
      </div>

      <Modal isOpen={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} title="Delete Trigger" size="sm">
        <p className="text-sm text-[var(--muted-foreground)] mb-4">Delete this trigger entry?</p>
        <div className="flex justify-end gap-3">
          <button onClick={() => setDeleteConfirm(null)} className="px-4 py-2 text-sm rounded-lg hover:bg-[var(--muted)]">Cancel</button>
          <button onClick={() => { if (deleteConfirm) { onDelete(deleteConfirm); setDeleteConfirm(null); showToast('Trigger deleted'); }}} className="px-4 py-2 text-sm bg-[var(--red)] hover:bg-red-600 text-white rounded-lg">Delete</button>
        </div>
      </Modal>
    </div>
  );
}
