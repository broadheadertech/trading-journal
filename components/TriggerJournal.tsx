'use client';

import { useState, useMemo } from 'react';
import { TriggerEntry, EmotionState, TriggerSource } from '@/lib/types';
import { EMOTION_OPTIONS } from '@/lib/utils';
import { TRIGGER_SOURCE_OPTIONS, analyzeTriggerPatterns } from '@/lib/discipline-engine';
import { Plus, Trash as Trash2, Lightning as Zap, TrendUp as TrendingUp, TrendDown as TrendingDown, Warning as AlertTriangle } from '@phosphor-icons/react';
import { SpeechButton } from '@/components/SpeechButton';
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* ── Header ── */}
      <div className="card">
        <span className="accent" style={{ width: 56, background: 'var(--amber)' }} />
        <div className="cardhead" style={{ flexWrap: 'wrap', gap: 16 }}>
          <div>
            <p className="lbl b10" style={{ color: 'var(--amber)', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <Zap size={12} /> BEHAVIOR LOG
            </p>
            <h3>Trigger Journal</h3>
            <p className="sub">Track what makes you emotional and how it affects your trades.</p>
          </div>
          <button
            onClick={() => setIsFormOpen(true)}
            className="btn-a"
            style={{ marginLeft: 'auto', height: 34, padding: '0 16px', fontSize: 12.5 }}
          >
            <Plus size={14} /> Log Trigger
          </button>
        </div>

        {/* Pattern Insights */}
        {insights.length > 0 && (
          <div className="warn" style={{ flexDirection: 'column', gap: 8 }}>
            <b style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <AlertTriangle size={14} /> Trigger Patterns Detected
            </b>
            {insights.map((msg, i) => (
              <p key={i} style={{ margin: 0, fontSize: 12, lineHeight: '19px', color: 'var(--text-2)' }}>{msg}</p>
            ))}
          </div>
        )}
      </div>

      {/* ── Trigger Frequency Chart ── */}
      {chartData.length > 0 && (
        <div className="card">
          <span className="accent" style={{ width: 56, background: 'var(--amber)' }} />
          <div className="cardhead">
            <div>
              <h4>Trigger Sources</h4>
              <p className="sub sm">Occurrences vs. how often each led to a trade.</p>
            </div>
          </div>
          <div style={{ height: 220, marginTop: 20 }}>
            <ResponsiveContainer>
              <BarChart data={chartData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#182432" />
                <XAxis type="number" tick={{ fontSize: 9, fill: '#7f8ea3' }} tickLine={false} axisLine={false} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 9, fill: '#7f8ea3' }} tickLine={false} axisLine={false} width={100} />
                <Tooltip
                  cursor={{ fill: '#0e1725' }}
                  contentStyle={{ background: '#0c1119', border: '1px solid #182432', borderRadius: '2px', fontSize: '11px', color: '#edf2f7' }}
                  formatter={(value, name) => [typeof value === 'number' ? value : 0, name === 'count' ? 'Occurrences' : 'Led to Trade']}
                />
                <Bar dataKey="count" name="Occurrences" fill="#d99405" radius={[0, 2, 2, 0]} />
                <Bar dataKey="traded" name="Led to Trade" radius={[0, 2, 2, 0]}>
                  {chartData.map((entry, i) => (
                    <Cell key={i} fill={entry.winRate >= 50 ? '#24c88a' : entry.traded > 0 ? '#ff4d5e' : '#4a5867'} />
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
          <div className="field">
            <label>TRIGGER SOURCE</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(120px,1fr))', gap: 8 }}>
              {TRIGGER_SOURCE_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setSource(opt.value as TriggerSource)}
                  className={source === opt.value ? 'chip on' : 'chip'}
                  style={{ height: 34, justifyContent: 'center', fontSize: 11 }}
                >
                  {opt.emoji} {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="field">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <label>WHAT HAPPENED?</label>
              <SpeechButton value={description} onChange={setDescription} />
            </div>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={2}
              placeholder="Describe what triggered your emotional response..."
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="field">
              <label>EMOTIONAL IMPACT</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 6 }}>
                {EMOTION_OPTIONS.slice(0, 6).map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setEmotionalImpact(opt.value as EmotionState)}
                    className={emotionalImpact === opt.value ? 'chip on' : 'chip'}
                    style={{ height: 28, padding: '0 8px', justifyContent: 'center', fontSize: 10 }}
                  >
                    {opt.emoji} {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="field" style={{ margin: 0 }}>
                <label>INTENSITY BEFORE — {intensityBefore}/10</label>
                <input
                  type="range" min="1" max="10" value={intensityBefore}
                  onChange={e => setIntensityBefore(parseInt(e.target.value))}
                  className="w-full" style={{ accentColor: 'var(--amber)' }}
                />
              </div>
              <div className="field" style={{ margin: 0 }}>
                <label>INTENSITY AFTER — {intensityAfter}/10</label>
                <input
                  type="range" min="1" max="10" value={intensityAfter}
                  onChange={e => setIntensityAfter(parseInt(e.target.value))}
                  className="w-full" style={{ accentColor: 'var(--red)' }}
                />
              </div>
            </div>
          </div>

          <label className="inset" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', fontSize: 12.5, color: 'var(--text-2)', cursor: 'pointer' }}>
            <input
              type="checkbox" checked={didTrade}
              onChange={e => setDidTrade(e.target.checked)}
              style={{ width: 15, height: 15, accentColor: 'var(--amber)' }}
            />
            I traded after this trigger
          </label>

          <div className="flex justify-end gap-3 pt-4" style={{ borderTop: '1px solid var(--line)' }}>
            <button onClick={resetForm} className="btn-g">Cancel</button>
            <button
              onClick={handleSubmit}
              disabled={!description}
              className="btn-a"
              style={{ opacity: !description ? 0.5 : 1 }}
            >
              Log Trigger
            </button>
          </div>
        </div>
      </Modal>

      {/* ── Trigger Entries ── */}
      <div className="card">
        <span className="accent" style={{ width: 56, background: 'var(--amber)' }} />
        <div className="cardhead">
          <div>
            <h4>Logged Triggers</h4>
            <p className="sub sm">Most recent emotional triggers and their aftermath.</p>
          </div>
          {triggers.length > 0 && (
            <span className="chip" style={{ marginLeft: 'auto', height: 24, fontSize: 10.5 }}>
              {triggers.length} logged
            </span>
          )}
        </div>

        {triggers.length === 0 ? (
          <div className="blank" style={{ marginTop: 20, padding: '38px 28px', textAlign: 'center' }}>
            <span className="corner" style={{ left: -1, top: -1, borderRight: 0, borderBottom: 0 }} />
            <span className="corner" style={{ right: -1, bottom: -1, borderLeft: 0, borderTop: 0 }} />
            <div className="badge" style={{ margin: '0 auto 24px', border: '1px solid rgba(217,148,5,.4)', background: 'var(--panel-2)' }}>
              <Zap size={20} style={{ color: 'var(--amber)' }} />
            </div>
            <h4>No triggers logged yet</h4>
            <p>Start tracking what makes you emotional to surface repeatable patterns.</p>
            <button onClick={() => setIsFormOpen(true)} className="btn-a" style={{ marginTop: 24 }}>
              <Plus size={14} /> Log your first trigger
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 20 }}>
            {triggers.slice(0, 20).map(trigger => {
              const sourceOpt = TRIGGER_SOURCE_OPTIONS.find(o => o.value === trigger.source);
              const emotionOpt = EMOTION_OPTIONS.find(o => o.value === trigger.emotionalImpact);
              const intensityChange = trigger.intensityAfter - trigger.intensityBefore;
              return (
                <div key={trigger.id} className="inset" style={{ padding: '14px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                        <span style={{ fontWeight: 700, fontSize: 12.5, color: 'var(--text)' }}>
                          {sourceOpt?.emoji} {sourceOpt?.label}
                        </span>
                        <span style={{ fontFamily: 'var(--mono)', fontSize: 10.5, color: 'var(--muted-2)' }}>
                          {format(new Date(trigger.timestamp), 'MMM dd, HH:mm')}
                        </span>
                        {trigger.didTrade && (
                          <span
                            className="chip"
                            style={{
                              height: 20, padding: '0 9px', fontSize: 9.5, fontWeight: 700,
                              color: trigger.outcome === 'win' ? 'var(--green)' : trigger.outcome === 'loss' ? 'var(--red)' : 'var(--muted)',
                            }}
                          >
                            Traded{trigger.outcome ? ` → ${trigger.outcome}` : ''}
                          </span>
                        )}
                      </div>
                      <p style={{ margin: '8px 0 0', fontSize: 12.5, lineHeight: '19px', color: 'var(--text-2)' }}>{trigger.description}</p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 8, fontSize: 10.5, color: 'var(--muted-2)' }}>
                        <span>{emotionOpt?.emoji} {trigger.emotionalImpact}</span>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontFamily: 'var(--mono)' }}>
                          {intensityChange > 0 ? (
                            <><TrendingUp size={10} style={{ color: 'var(--red)' }} /> <span style={{ color: 'var(--red)' }}>+{intensityChange}</span></>
                          ) : intensityChange < 0 ? (
                            <><TrendingDown size={10} style={{ color: 'var(--green)' }} /> <span style={{ color: 'var(--green)' }}>{intensityChange}</span></>
                          ) : (
                            <>no change</>
                          )}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => setDeleteConfirm(trigger.id)}
                      style={{ flex: 'none', padding: 6, color: 'var(--muted-3)' }}
                      aria-label="Delete trigger"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Modal isOpen={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} title="Delete Trigger" size="sm">
        <p style={{ margin: 0, fontSize: 12.5, color: 'var(--muted)' }}>Delete this trigger entry?</p>
        <div className="flex justify-end gap-3 pt-4" style={{ marginTop: 18, borderTop: '1px solid var(--line)' }}>
          <button onClick={() => setDeleteConfirm(null)} className="btn-g">Cancel</button>
          <button
            onClick={() => { if (deleteConfirm) { onDelete(deleteConfirm); setDeleteConfirm(null); showToast('Trigger deleted'); }}}
            className="btn-g"
            style={{ borderColor: 'var(--red)', color: 'var(--red)' }}
          >
            Delete
          </button>
        </div>
      </Modal>
    </div>
  );
}
