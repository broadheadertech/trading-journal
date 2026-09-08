'use client';

import { useState, useMemo } from 'react';
import { DailyReflection as DailyReflectionType, WeeklyReview, DisciplineGrade, Trade } from '@/lib/types';
import { getWeeklyDataQuestions } from '@/lib/utils';
import { Sun, Moon, CalendarDots, CheckCircle, XCircle, CaretDown, CaretUp } from '@phosphor-icons/react';
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

// Presentational only — maps a grade to an ATLAS token colour.
const GRADE_TONE: Record<string, string> = {
  A: 'var(--green)',
  B: 'var(--green)',
  C: 'var(--amber)',
  D: 'var(--red)',
  F: 'var(--red)',
};

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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* ── Header ── */}
      <div className="card">
        <span className="accent" style={{ width: 56, background: 'var(--amber)' }} />
        <div className="cardhead" style={{ flexWrap: 'wrap', gap: 16 }}>
          <div>
            <p className="lbl b10" style={{ color: 'var(--amber)', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <CalendarDots size={12} /> REFLECTION LOG
            </p>
            <h3>Reflections</h3>
            <p className="sub">End-of-day reflections and weekly reviews.</p>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button
              onClick={() => setActiveForm(activeForm === 'daily' ? 'none' : 'daily')}
              className="btn-g"
              style={{ height: 34, padding: '0 16px', fontSize: 12.5 }}
            >
              <Sun size={14} /> Daily
            </button>
            <button
              onClick={() => setActiveForm(activeForm === 'weekly' ? 'none' : 'weekly')}
              className="btn-g"
              style={{ height: 34, padding: '0 16px', fontSize: 12.5 }}
            >
              <Moon size={14} /> Weekly
            </button>
          </div>
        </div>

        {/* Today's Status */}
        {todayReflection && activeForm !== 'daily' && (
          <div className="note" style={{ height: 'auto', minHeight: 44, padding: '12px 18px', gap: 10, color: 'var(--text-2)' }}>
            <CheckCircle size={14} style={{ color: 'var(--green)', flex: 'none' }} />
            <span style={{ color: 'var(--green)', fontWeight: 700 }}>Today&apos;s reflection completed</span>
            <span style={{ color: 'var(--muted-2)', marginLeft: 8, fontFamily: 'var(--mono)' }}>Rating {todayReflection.overallRating}/10</span>
          </div>
        )}
      </div>

      {/* Daily Reflection Modal */}
      <Modal isOpen={activeForm === 'daily'} onClose={resetDaily} title="End-of-Day Reflection" size="lg">
        <div className="space-y-4">
          <div className="field">
            <label>DID YOU TRADE YOUR PLAN TODAY?</label>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => setTradedMyPlan(true)}
                className="chip"
                style={{
                  flex: 1, height: 44, justifyContent: 'center', gap: 8,
                  borderColor: tradedMyPlan === true ? 'var(--green)' : 'var(--line)',
                  color: tradedMyPlan === true ? 'var(--green)' : 'var(--muted)',
                  fontWeight: tradedMyPlan === true ? 700 : 400,
                }}
              >
                <CheckCircle size={15} /> Yes, I followed my plan
              </button>
              <button
                onClick={() => setTradedMyPlan(false)}
                className="chip"
                style={{
                  flex: 1, height: 44, justifyContent: 'center', gap: 8,
                  borderColor: tradedMyPlan === false ? 'var(--red)' : 'var(--line)',
                  color: tradedMyPlan === false ? 'var(--red)' : 'var(--muted)',
                  fontWeight: tradedMyPlan === false ? 700 : 400,
                }}
              >
                <XCircle size={15} /> No, I deviated
              </button>
            </div>
          </div>

          {tradedMyPlan !== null && (
            <div className="field">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <label>{tradedMyPlan ? 'WHAT WENT WELL?' : 'WHAT HAPPENED?'}</label>
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

          <div className="field">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <label>WHAT EMOTIONAL MISTAKES DID YOU MAKE?</label>
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
            <div className="field">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <label>BIGGEST LESSON</label>
                <SpeechButton value={biggestLesson} onChange={setBiggestLesson} />
              </div>
              <textarea
                value={biggestLesson}
                onChange={e => setBiggestLesson(e.target.value)}
                rows={2}
                placeholder="What's the #1 thing you learned?"
              />
            </div>
            <div className="field">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <label>TOMORROW&apos;S GOAL</label>
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

          <div className="field">
            <label>OVERALL DAY RATING — {overallRating}/10</label>
            <input
              type="range" min="1" max="10"
              value={overallRating}
              onChange={e => setOverallRating(parseInt(e.target.value))}
              className="w-full"
              style={{ accentColor: 'var(--amber)' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10.5, color: 'var(--muted-2)', marginTop: 6 }}>
              <span>Terrible</span>
              <span>Average</span>
              <span>Perfect</span>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4" style={{ borderTop: '1px solid var(--line)' }}>
            <button onClick={resetDaily} className="btn-g">Cancel</button>
            <button
              onClick={handleDailySubmit}
              disabled={tradedMyPlan === null}
              className="btn-a"
              style={{ opacity: tradedMyPlan === null ? 0.5 : 1 }}
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
            <div className="inset" style={{ padding: '14px 16px' }}>
              <p className="lbl">THIS WEEK&apos;S DATA</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '4px 14px', marginTop: 10, fontSize: 12.5 }}>
                <span style={{ fontFamily: 'var(--mono)', color: 'var(--text)' }}>{weeklyData.summary.total}</span>
                <span style={{ color: 'var(--muted-2)' }}>trades</span>
                <span style={{ fontFamily: 'var(--mono)', color: 'var(--green)' }}>{weeklyData.summary.wins}W</span>
                <span style={{ fontFamily: 'var(--mono)', color: 'var(--red)' }}>{weeklyData.summary.losses}L</span>
                <span style={{ fontFamily: 'var(--mono)', color: 'var(--muted-2)' }}>
                  {Math.round((weeklyData.summary.wins / weeklyData.summary.total) * 100)}% win rate
                </span>
              </div>
              {weeklyData.summary.topBrokenRule && (
                <p style={{ margin: '10px 0 0', fontSize: 11.5, color: 'var(--amber)' }}>
                  Most broken rule: <span style={{ fontWeight: 700 }}>&ldquo;{weeklyData.summary.topBrokenRule}&rdquo;</span>
                </p>
              )}
              {weeklyData.summary.topEmotion && (
                <p style={{ margin: '6px 0 0', fontSize: 11.5, color: 'var(--muted-2)' }}>
                  Top emotion: <span style={{ color: 'var(--text)', fontWeight: 700 }}>{weeklyData.summary.topEmotion}</span>
                  {weeklyData.summary.avgConfidenceOnLoss !== null && (
                    <span> &bull; avg confidence on losses: <span style={{ fontFamily: 'var(--mono)', color: 'var(--text)' }}>{weeklyData.summary.avgConfidenceOnLoss.toFixed(1)}</span></span>
                  )}
                </p>
              )}
            </div>
          )}

          <div className="field">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <label>WHAT EMOTIONAL MISTAKES DID YOU MAKE THIS WEEK?</label>
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

          <div className="field">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <label>PATTERNS YOU NOTICED</label>
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

          <div className="field">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <label>IMPROVEMENT PLAN FOR NEXT WEEK</label>
              <SpeechButton value={weeklyPlan} onChange={setWeeklyPlan} />
            </div>
            <textarea
              value={weeklyPlan}
              onChange={e => setWeeklyPlan(e.target.value)}
              rows={2}
              placeholder="What will you do differently?"
            />
          </div>

          <div className="field">
            <label>SELF-GRADE FOR THE WEEK</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {(['A', 'B', 'C', 'D', 'F'] as DisciplineGrade[]).map(g => (
                <button
                  key={g}
                  onClick={() => setWeeklyGrade(g)}
                  className="inset"
                  style={{
                    width: 46, height: 46, padding: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: 'var(--display)', fontWeight: 700, fontSize: 16,
                    color: weeklyGrade === g ? GRADE_TONE[g] : 'var(--muted)',
                    borderColor: weeklyGrade === g ? GRADE_TONE[g] : 'var(--line)',
                  }}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4" style={{ borderTop: '1px solid var(--line)' }}>
            <button onClick={resetWeekly} className="btn-g">Cancel</button>
            <button
              onClick={handleWeeklySubmit}
              disabled={!weeklyMistakes}
              className="btn-a"
              style={{ opacity: !weeklyMistakes ? 0.5 : 1 }}
            >
              Save Review
            </button>
          </div>
        </div>
      </Modal>

      {/* ── Recent Reflections ── */}
      <div className="card">
        <span className="accent" style={{ width: 56, background: 'var(--amber)' }} />
        <div className="cardhead">
          <div>
            <h4>Recent Reflections</h4>
            <p className="sub sm">Click any entry to expand the full write-up.</p>
          </div>
          {recentReflections.length > 0 && (
            <span className="chip" style={{ marginLeft: 'auto', height: 24, fontSize: 10.5 }}>
              {recentReflections.length} entr{recentReflections.length !== 1 ? 'ies' : 'y'}
            </span>
          )}
        </div>

        {recentReflections.length === 0 ? (
          <div className="blank" style={{ marginTop: 20, padding: '38px 28px', textAlign: 'center' }}>
            <span className="corner" style={{ left: -1, top: -1, borderRight: 0, borderBottom: 0 }} />
            <span className="corner" style={{ right: -1, bottom: -1, borderLeft: 0, borderTop: 0 }} />
            <div className="badge" style={{ margin: '0 auto 24px', border: '1px solid rgba(217,148,5,.4)', background: 'var(--panel-2)' }}>
              <CalendarDots size={20} style={{ color: 'var(--amber)' }} />
            </div>
            <h4>No reflections logged yet</h4>
            <p>Close out a session with a daily reflection to start building the record.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 20 }}>
            {recentReflections.map(r => (
              <div key={r.id} className="inset" style={{ padding: 0, overflow: 'hidden' }}>
                <button
                  onClick={() => setExpandedId(expandedId === r.id ? null : r.id)}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 14, padding: '13px 16px', textAlign: 'left' }}
                >
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 11.5, color: 'var(--muted)', width: 56, flex: 'none' }}>
                    {format(new Date(r.date), 'MMM dd')}
                  </span>
                  {r.tradedMyPlan ? (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: 'var(--green)' }}>
                      <CheckCircle size={12} /> Followed Plan
                    </span>
                  ) : (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: 'var(--red)' }}>
                      <XCircle size={12} /> Deviated
                    </span>
                  )}
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 11.5, color: 'var(--muted-2)' }}>
                    {r.overallRating}/10
                  </span>
                  <span style={{ marginLeft: 'auto', color: 'var(--muted-3)', display: 'inline-flex' }}>
                    {expandedId === r.id ? <CaretUp size={14} /> : <CaretDown size={14} />}
                  </span>
                </button>
                {expandedId === r.id && (
                  <div style={{ padding: '0 16px 15px', display: 'flex', flexDirection: 'column', gap: 12, borderTop: '1px solid var(--hair)', paddingTop: 14 }}>
                    {r.explanation && (
                      <div>
                        <p className="lbl">{r.tradedMyPlan ? 'WHAT WENT WELL' : 'WHAT HAPPENED'}</p>
                        <p style={{ margin: '6px 0 0', fontSize: 12.5, lineHeight: '19px', color: 'var(--text-2)' }}>{r.explanation}</p>
                      </div>
                    )}
                    {r.emotionalMistakes && (
                      <div>
                        <p className="lbl" style={{ color: 'var(--red)' }}>EMOTIONAL MISTAKES</p>
                        <p style={{ margin: '6px 0 0', fontSize: 12.5, lineHeight: '19px', color: 'var(--text-2)' }}>{r.emotionalMistakes}</p>
                      </div>
                    )}
                    {r.biggestLesson && (
                      <div>
                        <p className="lbl" style={{ color: 'var(--amber)' }}>LESSON</p>
                        <p style={{ margin: '6px 0 0', fontSize: 12.5, lineHeight: '19px', color: 'var(--text-2)' }}>{r.biggestLesson}</p>
                      </div>
                    )}
                    {r.tomorrowGoal && (
                      <div>
                        <p className="lbl" style={{ color: 'var(--amber)' }}>GOAL</p>
                        <p style={{ margin: '6px 0 0', fontSize: 12.5, lineHeight: '19px', color: 'var(--text-2)' }}>{r.tomorrowGoal}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Weekly Reviews ── */}
      {reviews.length > 0 && (
        <div className="card">
          <span className="accent" style={{ width: 56, background: 'var(--amber)' }} />
          <div className="cardhead">
            <div>
              <h4>Weekly Reviews</h4>
              <p className="sub sm">Self-graded week-over-week process notes.</p>
            </div>
            <Moon size={16} style={{ marginLeft: 'auto', color: 'var(--amber)' }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 20 }}>
            {reviews.slice(0, 5).map(review => (
              <div key={review.id} className="inset" style={{ padding: '14px 16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 11.5, color: 'var(--muted)' }}>
                    Week of {format(new Date(review.weekStart), 'MMM dd')}
                  </span>
                  <span
                    className="chip"
                    style={{
                      marginLeft: 'auto', height: 24, fontFamily: 'var(--display)', fontWeight: 700, fontSize: 12,
                      color: GRADE_TONE[review.disciplineGrade],
                      borderColor: GRADE_TONE[review.disciplineGrade],
                    }}
                  >
                    {review.disciplineGrade}
                  </span>
                </div>
                {review.emotionalMistakes && (
                  <div style={{ marginTop: 12 }}>
                    <p className="lbl" style={{ color: 'var(--red)' }}>MISTAKES</p>
                    <p style={{ margin: '6px 0 0', fontSize: 12.5, lineHeight: '19px', color: 'var(--text-2)' }}>{review.emotionalMistakes}</p>
                  </div>
                )}
                {review.patternsNoticed && (
                  <div style={{ marginTop: 10 }}>
                    <p className="lbl" style={{ color: 'var(--amber)' }}>PATTERNS</p>
                    <p style={{ margin: '6px 0 0', fontSize: 12.5, lineHeight: '19px', color: 'var(--text-2)' }}>{review.patternsNoticed}</p>
                  </div>
                )}
                {review.improvementPlan && (
                  <div style={{ marginTop: 10 }}>
                    <p className="lbl" style={{ color: 'var(--green)' }}>PLAN</p>
                    <p style={{ margin: '6px 0 0', fontSize: 12.5, lineHeight: '19px', color: 'var(--text-2)' }}>{review.improvementPlan}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
