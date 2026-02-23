'use client';

import { useState, useMemo } from 'react';
import { Trade, JournalEntry, EmotionState, CircuitBreakerEvent, TriggerEntry, DailyReflection as DailyReflectionType, WeeklyReview } from '@/lib/types';
import { EMOTION_OPTIONS, findRelevantReflection, getReflectionEvolution } from '@/lib/utils';
import { Plus, Trash2, Edit2, Brain, Flame } from 'lucide-react';
import { format } from 'date-fns';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import Modal from './ui/Modal';
import { useToast } from './ui/Toast';
import EmotionAnalytics from './EmotionAnalytics';
import DisciplineScore from './DisciplineScore';
import TriggerJournal from './TriggerJournal';
import DailyReflection from './DailyReflection';

interface Props {
  trades: Trade[];
  entries: JournalEntry[];
  onAddEntry: (entry: Omit<JournalEntry, 'id' | 'createdAt'>) => void;
  onUpdateEntry: (id: string, updates: Partial<JournalEntry>) => void;
  onDeleteEntry: (id: string) => void;
  breakerEvents?: CircuitBreakerEvent[];
  triggers?: TriggerEntry[];
  onAddTrigger?: (trigger: Omit<TriggerEntry, 'id' | 'createdAt'>) => void;
  onDeleteTrigger?: (id: string) => void;
  reflections?: DailyReflectionType[];
  onAddReflection?: (r: Omit<DailyReflectionType, 'id' | 'createdAt'>) => void;
  reviews?: WeeklyReview[];
  onAddReview?: (r: Omit<WeeklyReview, 'id' | 'createdAt'>) => void;
}

export default function PsychologyJournal({
  trades, entries, onAddEntry, onUpdateEntry, onDeleteEntry, breakerEvents = [],
  triggers = [], onAddTrigger, onDeleteTrigger,
  reflections = [], onAddReflection,
  reviews = [], onAddReview,
}: Props) {
  const { showToast } = useToast();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [emotion, setEmotion] = useState<EmotionState>('Neutral');
  const [energyLevel, setEnergyLevel] = useState(5);
  const [notes, setNotes] = useState('');
  const [lessonLearned, setLessonLearned] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [subTab, setSubTab] = useState<'overview' | 'journal' | 'triggers' | 'reflections' | 'analytics'>('overview');

  const closedTrades = trades.filter(t => !t.isOpen && t.actualPnLPercent !== null);

  // Emotion vs Outcome correlation
  const emotionOutcome = useMemo(() => {
    const map = new Map<string, { wins: number; losses: number; total: number }>();
    closedTrades.forEach(t => {
      const cur = map.get(t.emotion) || { wins: 0, losses: 0, total: 0 };
      cur.total++;
      if ((t.actualPnLPercent ?? 0) > 0) cur.wins++;
      else cur.losses++;
      map.set(t.emotion, cur);
    });
    return Array.from(map.entries()).map(([emotion, data]) => ({
      emotion,
      winRate: Math.round((data.wins / data.total) * 100),
      trades: data.total,
    }));
  }, [closedTrades]);

  // Streak tracking
  const streaks = useMemo(() => {
    const sorted = [...closedTrades].sort((a, b) => new Date(a.exitDate!).getTime() - new Date(b.exitDate!).getTime());
    let currentStreak = 0;
    let currentType: 'win' | 'loss' | null = null;
    let longestWin = 0;
    let longestLoss = 0;
    let currentWin = 0;
    let currentLoss = 0;

    sorted.forEach(t => {
      const isWin = (t.actualPnLPercent ?? 0) > 0;
      if (isWin) {
        currentWin++;
        currentLoss = 0;
        if (currentWin > longestWin) longestWin = currentWin;
      } else {
        currentLoss++;
        currentWin = 0;
        if (currentLoss > longestLoss) longestLoss = currentLoss;
      }
    });

    // Current streak
    const recent = sorted.length > 0 ? sorted[sorted.length - 1] : null;
    if (recent) {
      const recentIsWin = (recent.actualPnLPercent ?? 0) > 0;
      currentType = recentIsWin ? 'win' : 'loss';
      currentStreak = recentIsWin ? currentWin : currentLoss;
    }

    return { currentStreak, currentType, longestWin, longestLoss };
  }, [closedTrades]);

  // ── Last Trade Debrief (#33) ──
  const debrief = useMemo(() => {
    const sorted = [...closedTrades].sort((a, b) =>
      new Date(b.exitDate!).getTime() - new Date(a.exitDate!).getTime()
    );
    const last = sorted[0];
    if (!last) return null;

    const questionMap: Record<string, string[]> = {
      'FOMO': [
        'Did you have a clear entry reason before you placed this trade?',
        'Was this trade in your plan, or did you react to price movement?',
        'How will you wait for a confirmed signal next time?',
      ],
      'Revenge Trading': [
        'What triggered this trade — a loss you wanted to recover?',
        'Did you adjust your position size after a prior loss?',
        'What rule could have stopped you from taking this trade?',
      ],
      'Greedy': [
        'Did you move your target after the trade was in profit?',
        'Were you already up and looking for more on this position?',
        'How do you plan to honor your original target next time?',
      ],
      'Fearful': [
        'Did fear cause you to exit before your stop or target?',
        'Was your position size contributing to your anxiety?',
        'How would smaller size affect your ability to hold the plan?',
      ],
      'Anxious': [
        'What was the source of anxiety — the trade or external factors?',
        'Did anxiety lead you to check the chart more than usual?',
        'How can you reduce distractions during future sessions?',
      ],
      'Confident': [
        'Did confidence lead you to skip any part of your usual checklist?',
        'Were your entry rules met, or did you rely on gut feeling?',
        'How can you stay disciplined even when feeling strong?',
      ],
      'Excited': [
        'Did excitement cause you to size up or enter too early?',
        'Were your rules followed, or did you chase the move?',
        'How can you stay calm when a setup looks especially promising?',
      ],
      'Neutral': [
        'Were you fully focused during this trade, or on autopilot?',
        'Did you follow your entry and exit rules exactly?',
        'What is one thing you would improve about your process?',
      ],
    };

    return {
      trade: last,
      isWin: (last.actualPnLPercent ?? 0) > 0,
      questions: questionMap[last.emotion] ?? [
        'Did you follow your trading plan exactly?',
        'What would you do differently next time?',
        'Was your position size appropriate for your risk level?',
      ],
    };
  }, [closedTrades]);

  // Pattern: revenge trading after losses
  const patterns = useMemo(() => {
    const sorted = [...closedTrades].sort((a, b) => new Date(a.exitDate!).getTime() - new Date(b.exitDate!).getTime());
    let consecutiveLosses = 0;
    let revengeAfterLoss = 0;

    sorted.forEach((t, i) => {
      if ((t.actualPnLPercent ?? 0) <= 0) {
        consecutiveLosses++;
      } else {
        consecutiveLosses = 0;
      }
      if (consecutiveLosses >= 2 && i + 1 < sorted.length && sorted[i + 1].emotion === 'Revenge Trading') {
        revengeAfterLoss++;
      }
    });

    const insights: string[] = [];
    if (revengeAfterLoss > 0) {
      insights.push(`You tend to revenge trade after ${revengeAfterLoss > 1 ? '2+ consecutive' : 'consecutive'} losses (${revengeAfterLoss} times detected).`);
    }

    const fomoTrades = closedTrades.filter(t => t.emotion === 'FOMO');
    const fomoLosses = fomoTrades.filter(t => (t.actualPnLPercent ?? 0) <= 0);
    if (fomoTrades.length >= 3) {
      insights.push(`FOMO trades have a ${Math.round((fomoLosses.length / fomoTrades.length) * 100)}% loss rate (${fomoTrades.length} trades).`);
    }

    const confidentTrades = closedTrades.filter(t => t.emotion === 'Confident');
    const confidentWins = confidentTrades.filter(t => (t.actualPnLPercent ?? 0) > 0);
    if (confidentTrades.length >= 3) {
      insights.push(`When confident, you win ${Math.round((confidentWins.length / confidentTrades.length) * 100)}% of the time.`);
    }

    return insights;
  }, [closedTrades]);

  // Emotion over time from entries
  const emotionTimeline = useMemo(() => {
    const emotionMap: Record<string, number> = {
      Confident: 5, Neutral: 3, Fearful: 2, FOMO: 1, Greedy: 1, 'Revenge Trading': 0,
    };
    return [...entries]
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map(e => ({
        date: format(new Date(e.date), 'MMM dd'),
        mood: emotionMap[e.emotion] ?? 3,
        energy: e.energyLevel,
      }));
  }, [entries]);

  const coachingMemory = useMemo(
    () => findRelevantReflection(trades, entries, reflections ?? []),
    [trades, entries, reflections]
  );
  const reflectionEvolution = useMemo(
    () => getReflectionEvolution(trades, reflections ?? []),
    [trades, reflections]
  );

  const handleSubmit = () => {
    const entry = { date: new Date().toISOString(), emotion, energyLevel, notes, lessonLearned };
    if (editId) {
      onUpdateEntry(editId, entry);
      showToast('Entry updated');
    } else {
      onAddEntry(entry);
      showToast('Journal entry saved');
    }
    resetForm();
  };

  const resetForm = () => {
    setEmotion('Neutral');
    setEnergyLevel(5);
    setNotes('');
    setLessonLearned('');
    setIsFormOpen(false);
    setEditId(null);
  };

  const openEdit = (entry: JournalEntry) => {
    setEditId(entry.id);
    setEmotion(entry.emotion);
    setEnergyLevel(entry.energyLevel);
    setNotes(entry.notes);
    setLessonLearned(entry.lessonLearned);
    setIsFormOpen(true);
  };

  const SUB_TABS = [
    { id: 'overview', label: 'Overview' },
    { id: 'journal', label: 'Journal' },
    { id: 'triggers', label: 'Triggers' },
    { id: 'reflections', label: 'Reflections' },
    { id: 'analytics', label: 'Analytics' },
  ] as const;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold">Psychology Journal</h2>
        <p className="text-sm text-[var(--muted-foreground)]">Track your emotional state and trading patterns</p>
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-1.5 flex-wrap">
        {SUB_TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setSubTab(tab.id)}
            className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${
              subTab === tab.id
                ? 'border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]'
                : 'border-[var(--border)] text-[var(--muted-foreground)] hover:border-[var(--accent)]/40'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Overview ── */}
      {subTab === 'overview' && (
        <div className="space-y-4 sm:space-y-5">
          {/* Streak Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3">
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-3 sm:p-4">
              <div className="flex items-center gap-1.5 text-[10px] sm:text-xs text-[var(--muted-foreground)] mb-1">
                <Flame size={14} /> Current Streak
              </div>
              <div className={`text-base sm:text-lg font-bold ${streaks.currentType === 'win' ? 'text-[var(--green)]' : streaks.currentType === 'loss' ? 'text-[var(--red)]' : ''}`}>
                {streaks.currentType ? `${streaks.currentStreak} ${streaks.currentType === 'win' ? 'W' : 'L'}` : '—'}
              </div>
            </div>
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-3 sm:p-4">
              <div className="text-[10px] sm:text-xs text-[var(--muted-foreground)] mb-1">Longest Win</div>
              <div className="text-base sm:text-lg font-bold text-[var(--green)]">{streaks.longestWin || '—'}</div>
            </div>
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-3 sm:p-4">
              <div className="text-[10px] sm:text-xs text-[var(--muted-foreground)] mb-1">Longest Loss</div>
              <div className="text-base sm:text-lg font-bold text-[var(--red)]">{streaks.longestLoss || '—'}</div>
            </div>
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-3 sm:p-4">
              <div className="text-[10px] sm:text-xs text-[var(--muted-foreground)] mb-1">Journal Entries</div>
              <div className="text-base sm:text-lg font-bold">{entries.length}</div>
            </div>
          </div>

          {/* Coaching Memory — Q-17 */}
          {coachingMemory && (
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 sm:p-5">
              <div className="flex items-center gap-2 mb-2">
                <Brain size={14} className="text-purple-400 shrink-0" />
                <span className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wide">Coaching Memory</span>
                <span className="text-[10px] text-[var(--muted-foreground)] ml-auto">{coachingMemory.date} · {coachingMemory.source}</span>
              </div>
              <p className="text-sm text-[var(--foreground)] italic">&ldquo;{coachingMemory.text}&rdquo;</p>
              <p className="text-[10px] text-[var(--muted-foreground)] mt-2">Your own words, surfaced now because the situation matches.</p>
            </div>
          )}

          {/* Last Trade Debrief */}
          {debrief && (
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 sm:p-5">
              <div className="flex items-center flex-wrap gap-2 mb-1">
                <Brain size={15} className="text-[var(--purple)]" />
                <h3 className="font-semibold text-sm">Last Trade Debrief</h3>
                <span className="ml-auto text-xs text-[var(--muted-foreground)] flex items-center gap-1.5">
                  <span>{debrief.trade.coin}</span>
                  <span>·</span>
                  <span>{EMOTION_OPTIONS.find(e => e.value === debrief.trade.emotion)?.emoji} {debrief.trade.emotion}</span>
                  <span>·</span>
                  <span className={debrief.isWin ? 'text-[var(--green)]' : 'text-[var(--red)]'}>
                    {debrief.isWin ? '+' : ''}{debrief.trade.actualPnLPercent?.toFixed(2)}%
                  </span>
                </span>
              </div>
              <p className="text-[10px] text-[var(--muted-foreground)] mb-3">Reflect on your most recent closed trade</p>
              <ol className="space-y-2">
                {debrief.questions.map((q, i) => (
                  <li key={i} className="flex gap-2.5 text-sm">
                    <span className="text-[var(--accent)] font-bold shrink-0">{i + 1}.</span>
                    <span>{q}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {/* Pattern Insights */}
          {patterns.length > 0 && (
            <div className="bg-[var(--purple)]/10 border border-[var(--purple)]/20 rounded-xl p-4 space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-[var(--purple)]"><Brain size={16} /> Pattern Insights</div>
              {patterns.map((p, i) => (
                <p key={i} className="text-sm text-[var(--foreground)]">{p}</p>
              ))}
            </div>
          )}

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
            {emotionOutcome.length > 0 && (
              <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 sm:p-5">
                <h3 className="font-semibold mb-3 sm:mb-4">Emotion vs Win Rate</h3>
                <div className="h-[180px] sm:h-[220px]">
                  <ResponsiveContainer>
                    <BarChart data={emotionOutcome}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="emotion" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 11 }} domain={[0, 100]} />
                      <Tooltip contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '12px' }} />
                      <Bar dataKey="winRate" name="Win Rate %" radius={[4, 4, 0, 0]}>
                        {emotionOutcome.map((entry, i) => (
                          <Cell key={i} fill={entry.winRate >= 50 ? '#22c55e' : '#ef4444'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
            {emotionTimeline.length > 0 && (
              <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 sm:p-5">
                <h3 className="font-semibold mb-3 sm:mb-4">Mood & Energy Over Time</h3>
                <div className="h-[180px] sm:h-[220px]">
                  <ResponsiveContainer>
                    <LineChart data={emotionTimeline}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} domain={[0, 10]} />
                      <Tooltip contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '12px' }} />
                      <Line type="monotone" dataKey="mood" stroke="#8b5cf6" strokeWidth={2} name="Mood" />
                      <Line type="monotone" dataKey="energy" stroke="#3b82f6" strokeWidth={2} name="Energy" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>

          {/* Discipline Score */}
          <DisciplineScore trades={trades} breakerEvents={breakerEvents} />
        </div>
      )}

      {/* ── Journal ── */}
      {subTab === 'journal' && (
        <div className="space-y-3">
          <div className="flex justify-end">
            <button
              onClick={() => setIsFormOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white rounded-lg text-sm font-medium transition-colors"
            >
              <Plus size={16} /> Add Entry
            </button>
          </div>
          {entries.length === 0 ? (
            <div className="text-center py-10 text-sm text-[var(--muted-foreground)]">No journal entries yet. Add your first entry!</div>
          ) : (
            entries.map(entry => (
              <div key={entry.id} className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-3.5 sm:p-4 hover:border-[var(--accent)]/30 transition-colors">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center flex-wrap gap-2 sm:gap-3">
                    <span className="text-xs text-[var(--muted-foreground)]">{format(new Date(entry.date), 'MMM dd, yyyy')}</span>
                    <span className="text-xs">{EMOTION_OPTIONS.find(e => e.value === entry.emotion)?.emoji} {entry.emotion}</span>
                    <span className="text-xs text-[var(--muted-foreground)]">Energy: {entry.energyLevel}/10</span>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => openEdit(entry)} className="p-1.5 hover:bg-[var(--muted)] rounded-lg text-[var(--muted-foreground)]"><Edit2 size={14} /></button>
                    <button onClick={() => setDeleteConfirm(entry.id)} className="p-1.5 hover:bg-red-500/10 rounded-lg text-[var(--red)]"><Trash2 size={14} /></button>
                  </div>
                </div>
                {entry.notes && <p className="text-sm text-[var(--foreground)] mb-2">{entry.notes}</p>}
                {entry.lessonLearned && <p className="text-xs text-[var(--purple)] italic">Lesson: {entry.lessonLearned}</p>}
              </div>
            ))
          )}
        </div>
      )}

      {/* ── Triggers ── */}
      {subTab === 'triggers' && onAddTrigger && onDeleteTrigger && (
        <TriggerJournal triggers={triggers} onAdd={onAddTrigger} onDelete={onDeleteTrigger} />
      )}
      {subTab === 'triggers' && (!onAddTrigger || !onDeleteTrigger) && (
        <p className="text-sm text-[var(--muted-foreground)] text-center py-8">Trigger journal not available.</p>
      )}

      {/* ── Reflections ── */}
      {subTab === 'reflections' && (
        <>
          {reflectionEvolution && (
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 sm:p-5 mb-4">
              <div className="flex items-center gap-2 mb-3">
                <Brain size={14} className="text-purple-400 shrink-0" />
                <span className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wide">Your Growth</span>
                <span className="text-[10px] text-[var(--muted-foreground)] ml-auto">{reflectionEvolution.daysBetween} days apart</span>
              </div>
              <div className="space-y-3">
                <div>
                  <p className="text-[10px] text-[var(--muted-foreground)] mb-1">{reflectionEvolution.earlier.date} · {reflectionEvolution.earlier.source}</p>
                  <p className="text-sm text-[var(--muted-foreground)] italic line-clamp-2">&ldquo;{reflectionEvolution.earlier.text}&rdquo;</p>
                </div>
                <div className="text-[10px] text-[var(--accent)] text-center">↓ {reflectionEvolution.daysBetween} days later</div>
                <div>
                  <p className="text-[10px] text-[var(--muted-foreground)] mb-1">{reflectionEvolution.later.date} · {reflectionEvolution.later.source}</p>
                  <p className="text-sm text-[var(--foreground)] italic line-clamp-2">&ldquo;{reflectionEvolution.later.text}&rdquo;</p>
                </div>
              </div>
            </div>
          )}
        </>
      )}
      {subTab === 'reflections' && onAddReflection && onAddReview && (
        <DailyReflection reflections={reflections ?? []} reviews={reviews ?? []} trades={trades} onAddReflection={onAddReflection} onAddReview={onAddReview} />
      )}
      {subTab === 'reflections' && (!onAddReflection || !onAddReview) && (
        <p className="text-sm text-[var(--muted-foreground)] text-center py-8">Reflections not available.</p>
      )}

      {/* ── Analytics ── */}
      {subTab === 'analytics' && (
        <EmotionAnalytics trades={trades} breakerEvents={breakerEvents} />
      )}

      {/* Modals — always rendered so they work regardless of active tab */}
      <Modal isOpen={isFormOpen} onClose={resetForm} title={editId ? 'Edit Journal Entry' : 'New Journal Entry'} size="md">
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">How are you feeling?</label>
              <div className="grid grid-cols-3 gap-2">
                {EMOTION_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setEmotion(opt.value as EmotionState)}
                    className={`py-2 text-xs rounded-lg border transition-colors ${emotion === opt.value ? 'border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]' : 'border-[var(--border)] text-[var(--muted-foreground)]'}`}
                  >
                    {opt.emoji} {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Energy Level: {energyLevel}/10</label>
              <input type="range" min="1" max="10" value={energyLevel} onChange={e => setEnergyLevel(parseInt(e.target.value))} className="w-full accent-[var(--accent)]" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Daily Notes</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} placeholder="How was your trading day? What happened?" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Lesson Learned</label>
            <textarea value={lessonLearned} onChange={e => setLessonLearned(e.target.value)} rows={2} placeholder="What did you learn today?" />
          </div>
          <div className="flex justify-end gap-3 pt-1">
            <button onClick={resetForm} className="px-4 py-2 text-sm rounded-lg hover:bg-[var(--muted)]">Cancel</button>
            <button onClick={handleSubmit} className="px-4 py-2 text-sm bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white rounded-lg font-medium">{editId ? 'Update' : 'Save'} Entry</button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} title="Delete Entry" size="sm">
        <p className="text-sm text-[var(--muted-foreground)] mb-4">Delete this journal entry?</p>
        <div className="flex justify-end gap-3">
          <button onClick={() => setDeleteConfirm(null)} className="px-4 py-2 text-sm rounded-lg hover:bg-[var(--muted)]">Cancel</button>
          <button onClick={() => { if (deleteConfirm) { onDeleteEntry(deleteConfirm); setDeleteConfirm(null); showToast('Entry deleted'); }}} className="px-4 py-2 text-sm bg-[var(--red)] hover:bg-red-600 text-white rounded-lg">Delete</button>
        </div>
      </Modal>
    </div>
  );
}
