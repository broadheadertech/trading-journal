'use client';

import { useMemo } from 'react';
import { Trade, CircuitBreakerEvent } from '@/lib/types';
import {
  calculateDisciplineState,
  DISCIPLINE_BADGES,
  getGradeLabel,
} from '@/lib/discipline-engine';
import { Fire, Trophy, Star, Shield, Lock } from '@phosphor-icons/react';

interface Props {
  trades: Trade[];
  breakerEvents: CircuitBreakerEvent[];
}

// Presentational only — maps a grade to an ATLAS token colour.
const GRADE_TONE: Record<string, string> = {
  A: 'var(--green)',
  B: 'var(--teal)',
  C: 'var(--amber)',
  D: 'var(--pink)',
  F: 'var(--red)',
};

export default function DisciplineScore({ trades, breakerEvents }: Props) {
  const state = useMemo(
    () => calculateDisciplineState(trades, breakerEvents),
    [trades, breakerEvents]
  );

  const todayScore = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return state.dailyScores.find(s => s.date === today);
  }, [state.dailyScores]);

  const recentScores = useMemo(
    () => state.dailyScores.slice(-14).reverse(),
    [state.dailyScores]
  );

  const overallGrade = useMemo(() => {
    if (state.dailyScores.length === 0) return null;
    const last7 = state.dailyScores.slice(-7);
    const gradeValues = { A: 4, B: 3, C: 2, D: 1, F: 0 };
    const avg = last7.reduce((sum, s) => sum + gradeValues[s.grade], 0) / last7.length;
    if (avg >= 3.5) return 'A';
    if (avg >= 2.5) return 'B';
    if (avg >= 1.5) return 'C';
    if (avg >= 0.5) return 'D';
    return 'F';
  }, [state.dailyScores]) as 'A' | 'B' | 'C' | 'D' | 'F' | null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* ── Header ── */}
      <div className="card">
        <span className="accent" style={{ width: 56, background: 'var(--amber)' }} />
        <div className="cardhead">
          <div>
            <h3>Discipline Score</h3>
            <p className="sub">Track your emotional discipline and earn badges.</p>
          </div>
          <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
            <p className="lbl">TOTAL POINTS</p>
            <div style={{ fontFamily: 'var(--mono)', fontWeight: 500, fontSize: 22, lineHeight: '28px', color: 'var(--amber)', marginTop: 4 }}>
              {state.totalPoints.toLocaleString()}
            </div>
          </div>
        </div>

        {/* Score Overview */}
        <div className="stats" style={{ marginTop: 22 }}>
          {/* Overall Grade */}
          <div className="stat" style={{ height: 'auto', minHeight: 104 }}>
            <span className="accent" style={{ background: overallGrade ? GRADE_TONE[overallGrade] : 'var(--muted-4)' }} />
            <b style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              7-DAY GRADE
              <span style={{ marginLeft: 'auto', color: 'var(--muted-3)' }}><Trophy size={13} /></span>
            </b>
            {overallGrade ? (
              <>
                <em style={{ color: GRADE_TONE[overallGrade], fontFamily: 'var(--display)', fontWeight: 700 }}>{overallGrade}</em>
                <small style={{ display: 'block', fontSize: 10.5, color: 'var(--muted-2)', marginTop: 4 }}>{getGradeLabel(overallGrade)}</small>
              </>
            ) : (
              <em style={{ color: 'var(--muted)', fontFamily: 'var(--display)', fontWeight: 700, fontSize: 18 }}>--</em>
            )}
          </div>

          {/* Today */}
          <div className="stat" style={{ height: 'auto', minHeight: 104 }}>
            <span className="accent" style={{ background: todayScore ? GRADE_TONE[todayScore.grade] : 'var(--muted-4)' }} />
            <b style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              TODAY
              <span style={{ marginLeft: 'auto', color: 'var(--muted-3)' }}><Shield size={13} /></span>
            </b>
            {todayScore ? (
              <>
                <em style={{ color: GRADE_TONE[todayScore.grade], fontFamily: 'var(--display)', fontWeight: 700 }}>{todayScore.grade}</em>
                <small style={{ display: 'block', fontSize: 10.5, color: 'var(--muted-2)', marginTop: 4 }}>
                  {todayScore.points > 0 ? '+' : ''}{todayScore.points} pts
                </small>
              </>
            ) : (
              <>
                <em style={{ color: 'var(--muted)', fontFamily: 'var(--display)', fontWeight: 700, fontSize: 18 }}>--</em>
                <small style={{ display: 'block', fontSize: 10.5, color: 'var(--muted-2)', marginTop: 4 }}>No trades</small>
              </>
            )}
          </div>

          {/* Streak */}
          <div className="stat" style={{ height: 'auto', minHeight: 104 }}>
            <span className="accent" style={{ background: 'var(--amber)' }} />
            <b style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              DISCIPLINE STREAK
              <span style={{ marginLeft: 'auto', color: 'var(--muted-3)' }}><Fire size={13} /></span>
            </b>
            <em style={{ color: state.currentStreak > 0 ? 'var(--amber)' : 'var(--text)' }}>{state.currentStreak}</em>
            <small style={{ display: 'block', fontSize: 10.5, color: 'var(--muted-2)', marginTop: 4 }}>
              days{state.currentStreak >= 3 ? ' · on fire' : ''}
            </small>
          </div>

          {/* Best Streak */}
          <div className="stat" style={{ height: 'auto', minHeight: 104 }}>
            <span className="accent" style={{ background: 'var(--teal)' }} />
            <b style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              BEST STREAK
              <span style={{ marginLeft: 'auto', color: 'var(--muted-3)' }}><Star size={13} /></span>
            </b>
            <em style={{ color: 'var(--teal)' }}>{state.longestStreak}</em>
            <small style={{ display: 'block', fontSize: 10.5, color: 'var(--muted-2)', marginTop: 4 }}>days</small>
          </div>
        </div>
      </div>

      {/* ── Recent Daily Grades ── */}
      {recentScores.length > 0 && (
        <div className="card">
          <span className="accent" style={{ width: 56, background: 'var(--teal)' }} />
          <div className="cardhead">
            <div>
              <h4>Recent Discipline Grades</h4>
              <p className="sub sm">Last {recentScores.length} scored sessions</p>
            </div>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 20 }}>
            {recentScores.map(score => (
              <div key={score.date} style={{ textAlign: 'center' }}>
                <div
                  className="inset"
                  style={{
                    width: 42, height: 42, padding: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: 'var(--display)', fontWeight: 700, fontSize: 15,
                    color: GRADE_TONE[score.grade],
                    borderColor: GRADE_TONE[score.grade],
                  }}
                >
                  {score.grade}
                </div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 9.5, color: 'var(--muted-2)', marginTop: 6 }}>
                  {score.date.slice(5)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Badges ── */}
      <div className="card">
        <span className="accent" style={{ width: 56, background: 'var(--amber)' }} />
        <div className="cardhead">
          <div>
            <h4>Badges</h4>
            <p className="sub sm">Milestones unlocked by consistent process.</p>
          </div>
          <span className="chip" style={{ marginLeft: 'auto', height: 24, fontSize: 10.5 }}>
            {state.earnedBadgeIds.length}/{DISCIPLINE_BADGES.length} earned
          </span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 10, marginTop: 20 }}>
          {DISCIPLINE_BADGES.map(badge => {
            const earned = state.earnedBadgeIds.includes(badge.id);
            return (
              <div
                key={badge.id}
                className="inset"
                style={{
                  position: 'relative',
                  padding: '15px 14px',
                  textAlign: 'center',
                  borderColor: earned ? 'rgba(217,148,5,.4)' : 'var(--line)',
                  opacity: earned ? 1 : 0.5,
                }}
              >
                {earned && <span className="accent" style={{ position: 'absolute', left: 0, top: -1, width: 30, height: 3, background: 'var(--amber)' }} />}
                {!earned && (
                  <Lock size={10} style={{ position: 'absolute', top: 8, right: 8, color: 'var(--muted-3)' }} />
                )}
                <div style={{ fontSize: 22, lineHeight: '26px', filter: earned ? 'none' : 'grayscale(1)' }}>{badge.emoji}</div>
                <div style={{ fontWeight: 700, fontSize: 12, lineHeight: '16px', color: 'var(--text)', marginTop: 6 }}>{badge.name}</div>
                <div style={{ fontSize: 10, lineHeight: '14px', color: 'var(--muted-2)', marginTop: 4 }}>{badge.requirement}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Points Breakdown ── */}
      {todayScore && (
        <div className="card">
          <span className="accent" style={{ width: 56, background: 'var(--green)' }} />
          <div className="cardhead">
            <div>
              <h4>Today&apos;s Breakdown</h4>
              <p className="sub sm">How today&apos;s points were earned.</p>
            </div>
            <Shield size={16} style={{ marginLeft: 'auto', color: 'var(--green)' }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 10, marginTop: 20 }}>
            <div className="inset" style={{ padding: '13px 16px' }}>
              <p className="lbl">RULES FOLLOWED</p>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 8 }}>
                <span style={{ fontFamily: 'var(--mono)', fontWeight: 500, fontSize: 16, color: 'var(--text)' }}>
                  {todayScore.rulesFollowed}/{todayScore.rulesTotal}
                </span>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--green)' }}>+{todayScore.rulesFollowed * 10}</span>
              </div>
            </div>
            <div className="inset" style={{ padding: '13px 16px' }}>
              <p className="lbl">CALM TRADES</p>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 8 }}>
                <span style={{ fontFamily: 'var(--mono)', fontWeight: 500, fontSize: 16, color: 'var(--text)' }}>
                  {todayScore.calmTrades}/{todayScore.totalTrades}
                </span>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--green)' }}>+{todayScore.calmTrades * 5}</span>
              </div>
            </div>
            <div className="inset" style={{ padding: '13px 16px' }}>
              <p className="lbl">BREAKERS RESPECTED</p>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 8 }}>
                <span style={{ fontFamily: 'var(--mono)', fontWeight: 500, fontSize: 16, color: 'var(--text)' }}>
                  {todayScore.breakersRespected}/{todayScore.breakersTriggered}
                </span>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--green)' }}>+{todayScore.breakersRespected * 15}</span>
              </div>
            </div>
            <div className="inset" style={{ padding: '13px 16px' }}>
              <p className="lbl">OVERRIDES</p>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 8 }}>
                <span style={{ fontFamily: 'var(--mono)', fontWeight: 500, fontSize: 16, color: 'var(--text)' }}>
                  {todayScore.breakersOverridden}
                </span>
                {todayScore.breakersOverridden > 0 && (
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--red)' }}>-{todayScore.breakersOverridden * 20}</span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
