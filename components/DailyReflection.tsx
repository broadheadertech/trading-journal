'use client';

import { useState, useMemo } from 'react';
import { DailyReflection as DailyReflectionType, WeeklyReview, DisciplineGrade, Trade } from '@/lib/types';
import { getGradeColor } from '@/lib/discipline-engine';
import { getWeeklyDataQuestions } from '@/lib/utils';
import { Sun, Moon, CalendarDays, CheckCircle, XCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { SpeechButton } from '@/components/SpeechButton';
import { format, startOfWeek } from 'date-fns';
import { useToast } from './ui/Toast';
import Modal from './ui/Modal';

interface Props {
  reflections: DailyReflectionType[];
  reviews: WeeklyReview[];
  trades: Trade[];
  onAddReflection: (r: Omit<DailyReflectionType, 'id' | 'createdAt'>) => void;
  onAddReview: (r: Omit<WeeklyReview, 'id' | 'createdAt'>) => void;
}

export default function DailyReflection({ reflections, reviews, trades, onAddReflection, onAddReview }: Props) {
  const { showToast } = useToast();
  const [activeForm, setActiveForm] = useState<'none' | 'daily' | 'weekly'>('none');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Daily form state
  const [tradedMyPlan, setTradedMyPlan] = useState<boolean | null>(null);
  const [explanation, setExplanation] = useState('');
  const [emotionalMistakes, setEmotionalMistakes] = useState('');
  const [biggestLesson, setBiggestLesson] = useState('');
  const [tomorrowGoal, setTomorrowGoal] = useState('');
  const [overallRating, setOverallRating] = useState(5);

  // Weekly form state
  const [weeklyMistakes, setWeeklyMistakes] = useState('');
  const [weeklyPatterns, setWeeklyPatterns] = useState('');
  const [weeklyPlan, setWeeklyPlan] = useState('');
  const [weeklyGrade, setWeeklyGrade] = useState<DisciplineGrade>('C');

  const today = new Date().toISOString().slice(0, 10);
  const todayReflection = reflections.find(r => r.date === today);

  const recentReflections = useMemo(
    () => [...reflections].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 14),
    [reflections]
  );

  // Data-driven weekly review (C-41)
  const weeklyData = useMemo(() => {
    const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');
    return getWeeklyDataQuestions(trades, weekStart);
  }, [trades]);

  const handleDailySubmit = () => {
    if (tradedMyPlan === null) return;
    onAddReflection({
      date: today,
      tradedMyPlan,
      explanation,
      emotionalMistakes,
      biggestLesson,
      tomorrowGoal,
      overallRating,
    });
    showToast('Daily reflection saved');
    resetDaily();
  };

  const handleWeeklySubmit = () => {
    if (!weeklyMistakes) return;
    const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');
    onAddReview({
      weekStart,
      emotionalMistakes: weeklyMistakes,
      patternsNoticed: weeklyPatterns,
      improvementPlan: weeklyPlan,
      disciplineGrade: weeklyGrade,
    });
    showToast('Weekly review saved');
    resetWeekly();
  };

  const resetDaily = () => {
    setTradedMyPlan(null);
    setExplanation('');
    setEmotionalMistakes('');
    setBiggestLesson('');
    setTomorrowGoal('');
    setOverallRating(5);
    setActiveForm('none');
  };

  const resetWeekly = () => {
    setWeeklyMistakes('');
    setWeeklyPatterns('');
    setWeeklyPlan('');
    setWeeklyGrade('C');
    setActiveForm('none');
  };

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold flex items-center gap-2">
            <CalendarDays size={20} className="text-blue-400" /> Reflections
          </h3>
          <p className="text-xs text-[var(--muted-foreground)]">End-of-day reflections and weekly reviews</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setActiveForm(activeForm === 'daily' ? 'none' : 'daily')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded-lg text-sm font-medium transition-colors"
          >
            <Sun size={14} /> Daily
          </button>
          <button
            onClick={() => setActiveForm(activeForm === 'weekly' ? 'none' : 'weekly')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-cyan-400 rounded-lg text-sm font-medium transition-colors"
          >
            <Moon size={14} /> Weekly
          </button>
        </div>
      </div>

      {/* Today's Status */}
      {todayReflection && activeForm !== 'daily' && (
        <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/20 rounded-xl text-sm">
          <CheckCircle size={16} className="text-[var(--green)]" />
          <span className="text-[var(--green)] font-medium">Today&apos;s reflection completed</span>
          <span className="text-[var(--muted-foreground)]">— Rating: {todayReflection.overallRating}/10</span>
        </div>
      )}

      {/* Daily Reflection Modal */}
      <Modal isOpen={activeForm === 'daily'} onClose={resetDaily} title="End-of-Day Reflection" size="lg">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Did you trade your plan today?</label>
            <div className="flex gap-3">
              <button
                onClick={() => setTradedMyPlan(true)}
                className={`flex-1 py-3 text-sm rounded-xl border-2 transition-all flex items-center justify-center gap-2 ${
                  tradedMyPlan === true
                    ? 'border-green-500 bg-green-500/10 text-green-400 font-medium'
                    : 'border-[var(--border)] text-[var(--muted-foreground)] hover:border-green-500/50'
                }`}
              >
                <CheckCircle size={18} /> Yes, I followed my plan
              </button>
              <button
                onClick={() => setTradedMyPlan(false)}
                className={`flex-1 py-3 text-sm rounded-xl border-2 transition-all flex items-center justify-center gap-2 ${
                  tradedMyPlan === false
                    ? 'border-red-500 bg-red-500/10 text-red-400 font-medium'
                    : 'border-[var(--border)] text-[var(--muted-foreground)] hover:border-red-500/50'
                }`}
              >
                <XCircle size={18} /> No, I deviated
              </button>
            </div>
          </div>

          {tradedMyPlan !== null && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium">
                  {tradedMyPlan ? 'What went well?' : 'What happened?'}
                </label>
                <SpeechButton value={explanation} onChange={setExplanation} />
              </div>
              <textarea
                value={explanation}
                onChange={e => setExplanation(e.target.value)}
                rows={2}
                placeholder={tradedMyPlan ? 'Describe what you did right today...' : 'Explain what caused you to deviate from your plan...'}
              />
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-medium">What emotional mistakes did you make?</label>
              <SpeechButton value={emotionalMistakes} onChange={setEmotionalMistakes} />
            </div>
            <textarea
              value={emotionalMistakes}
              onChange={e => setEmotionalMistakes(e.target.value)}
              rows={2}
              placeholder="Be honest about emotional decisions..."
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium">Biggest Lesson</label>
                <SpeechButton value={biggestLesson} onChange={setBiggestLesson} />
              </div>
              <textarea
                value={biggestLesson}
                onChange={e => setBiggestLesson(e.target.value)}
                rows={2}
                placeholder="What's the #1 thing you learned?"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium">Tomorrow&apos;s Goal</label>
                <SpeechButton value={tomorrowGoal} onChange={setTomorrowGoal} />
              </div>
              <textarea
                value={tomorrowGoal}
                onChange={e => setTomorrowGoal(e.target.value)}
                rows={2}
                placeholder="One thing to focus on tomorrow..."
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Overall Day Rating: {overallRating}/10</label>
            <input
              type="range" min="1" max="10"
              value={overallRating}
              onChange={e => setOverallRating(parseInt(e.target.value))}
              className="w-full accent-blue-500"
            />
            <div className="flex justify-between text-xs text-[var(--muted-foreground)]">
              <span>Terrible</span>
              <span>Average</span>
              <span>Perfect</span>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-1">
            <button onClick={resetDaily} className="px-4 py-2 text-sm rounded-lg hover:bg-[var(--muted)]">Cancel</button>
            <button
              onClick={handleDailySubmit}
              disabled={tradedMyPlan === null}
              className="px-4 py-2 text-sm bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium disabled:opacity-50"
            >
              Save Reflection
            </button>
          </div>
        </div>
      </Modal>

      {/* Weekly Review Modal */}
      <Modal isOpen={activeForm === 'weekly'} onClose={resetWeekly} title="Weekly Review" size="md">
        <div className="space-y-4">

          {/* Data Summary Panel (C-41) */}
          {weeklyData.summary.total > 0 && (
            <div className="bg-[var(--background)] border border-[var(--border)] rounded-xl p-3.5 space-y-1.5">
              <p className="text-[10px] font-medium text-[var(--muted-foreground)] uppercase tracking-wide mb-2">This week&apos;s data</p>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                <span>
                  <span className="font-semibold text-[var(--foreground)]">{weeklyData.summary.total}</span>
                  <span className="text-[var(--muted-foreground)]"> trades · </span>
                  <span className="text-[var(--gain)] font-semibold">{weeklyData.summary.wins}W</span>
                  <span className="text-[var(--muted-foreground)]"> · </span>
                  <span className="text-[var(--loss)] font-semibold">{weeklyData.summary.losses}L</span>
                </span>
                {weeklyData.summary.total > 0 && (
                  <span className="text-[var(--muted-foreground)]">
                    {Math.round((weeklyData.summary.wins / weeklyData.summary.total) * 100)}% win rate
                  </span>
                )}
              </div>
              {weeklyData.summary.topBrokenRule && (
                <p className="text-xs text-amber-400">
                  Most broken rule: <span className="font-medium">&ldquo;{weeklyData.summary.topBrokenRule}&rdquo;</span>
                </p>
              )}
              {weeklyData.summary.topEmotion && (
                <p className="text-xs text-[var(--muted-foreground)]">
                  Top emotion: <span className="text-[var(--foreground)] font-medium">{weeklyData.summary.topEmotion}</span>
                  {weeklyData.summary.avgConfidenceOnLoss !== null && (
                    <span> · avg confidence on losses: <span className="font-medium">{weeklyData.summary.avgConfidenceOnLoss.toFixed(1)}</span></span>
                  )}
                </p>
              )}
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-medium">What emotional mistakes did you make this week?</label>
              <SpeechButton value={weeklyMistakes} onChange={setWeeklyMistakes} />
            </div>
            <textarea
              value={weeklyMistakes}
              onChange={e => setWeeklyMistakes(e.target.value)}
              rows={3}
              placeholder={
                weeklyData.questions.find(q => q.field === 'emotionalMistakes')?.prompt ??
                'Review your week: what emotional patterns hurt your trading?'
              }
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-medium">Patterns you noticed</label>
              <SpeechButton value={weeklyPatterns} onChange={setWeeklyPatterns} />
            </div>
            <textarea
              value={weeklyPatterns}
              onChange={e => setWeeklyPatterns(e.target.value)}
              rows={2}
              placeholder={
                weeklyData.questions.find(q => q.field === 'patternsNoticed')?.prompt ??
                'Any recurring triggers, emotions, or behaviors?'
              }
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-medium">Improvement plan for next week</label>
              <SpeechButton value={weeklyPlan} onChange={setWeeklyPlan} />
            </div>
            <textarea
              value={weeklyPlan}
              onChange={e => setWeeklyPlan(e.target.value)}
              rows={2}
              placeholder="What will you do differently?"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Self-Grade for the Week</label>
            <div className="flex gap-2">
              {(['A', 'B', 'C', 'D', 'F'] as DisciplineGrade[]).map(g => (
                <button
                  key={g}
                  onClick={() => setWeeklyGrade(g)}
                  className={`w-12 h-12 rounded-xl border-2 text-lg font-bold transition-all ${
                    weeklyGrade === g ? getGradeColor(g) : 'border-[var(--border)] text-[var(--muted-foreground)] hover:border-[var(--accent)]/50'
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-1">
            <button onClick={resetWeekly} className="px-4 py-2 text-sm rounded-lg hover:bg-[var(--muted)]">Cancel</button>
            <button
              onClick={handleWeeklySubmit}
              disabled={!weeklyMistakes}
              className="px-4 py-2 text-sm bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium disabled:opacity-50"
            >
              Save Review
            </button>
          </div>
        </div>
      </Modal>

      {/* Recent Reflections */}
      <div className="space-y-2">
        {recentReflections.map(r => (
          <div
            key={r.id}
            className="bg-[var(--card)] border border-[var(--border)] rounded-xl overflow-hidden hover:border-[var(--accent)]/30 transition-colors"
          >
            <button
              onClick={() => setExpandedId(expandedId === r.id ? null : r.id)}
              className="w-full flex items-center justify-between p-3.5 text-left"
            >
              <div className="flex items-center gap-3">
                <span className="text-xs text-[var(--muted-foreground)]">
                  {format(new Date(r.date), 'MMM dd')}
                </span>
                {r.tradedMyPlan ? (
                  <span className="flex items-center gap-1 text-xs text-green-400">
                    <CheckCircle size={12} /> Followed Plan
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-xs text-red-400">
                    <XCircle size={12} /> Deviated
                  </span>
                )}
                <span className="text-xs text-[var(--muted-foreground)]">
                  Rating: {r.overallRating}/10
                </span>
              </div>
              {expandedId === r.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
            {expandedId === r.id && (
              <div className="px-3.5 pb-3.5 space-y-2 text-sm animate-in">
                {r.explanation && (
                  <div>
                    <span className="text-xs font-medium text-[var(--muted-foreground)]">
                      {r.tradedMyPlan ? 'What went well:' : 'What happened:'}
                    </span>
                    <p className="text-sm">{r.explanation}</p>
                  </div>
                )}
                {r.emotionalMistakes && (
                  <div>
                    <span className="text-xs font-medium text-red-400">Emotional mistakes:</span>
                    <p className="text-sm">{r.emotionalMistakes}</p>
                  </div>
                )}
                {r.biggestLesson && (
                  <div>
                    <span className="text-xs font-medium text-cyan-400">Lesson:</span>
                    <p className="text-sm">{r.biggestLesson}</p>
                  </div>
                )}
                {r.tomorrowGoal && (
                  <div>
                    <span className="text-xs font-medium text-blue-400">Goal:</span>
                    <p className="text-sm">{r.tomorrowGoal}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Weekly Reviews */}
      {reviews.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-semibold flex items-center gap-2">
            <Moon size={14} className="text-cyan-400" /> Weekly Reviews
          </h4>
          {reviews.slice(0, 5).map(review => (
            <div key={review.id} className="bg-[var(--card)] border border-blue-500/20 rounded-xl p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-[var(--muted-foreground)]">Week of {format(new Date(review.weekStart), 'MMM dd')}</span>
                <span className={`text-sm font-bold px-2 py-0.5 rounded-lg border ${getGradeColor(review.disciplineGrade)}`}>
                  {review.disciplineGrade}
                </span>
              </div>
              {review.emotionalMistakes && (
                <p className="text-sm"><span className="text-red-400 text-xs font-medium">Mistakes:</span> {review.emotionalMistakes}</p>
              )}
              {review.patternsNoticed && (
                <p className="text-sm"><span className="text-yellow-400 text-xs font-medium">Patterns:</span> {review.patternsNoticed}</p>
              )}
              {review.improvementPlan && (
                <p className="text-sm"><span className="text-green-400 text-xs font-medium">Plan:</span> {review.improvementPlan}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
