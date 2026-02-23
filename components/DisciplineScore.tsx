'use client';

import { useMemo } from 'react';
import { Trade, CircuitBreakerEvent } from '@/lib/types';
import {
  calculateDisciplineState,
  DISCIPLINE_BADGES,
  getGradeColor,
  getGradeLabel,
} from '@/lib/discipline-engine';
import { Flame, Trophy, Star, Shield, Lock } from 'lucide-react';

interface Props {
  trades: Trade[];
  breakerEvents: CircuitBreakerEvent[];
}

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
    <div className="space-y-4 sm:space-y-5">
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold flex items-center gap-2">
            <Trophy size={20} className="text-yellow-400" /> Discipline Score
          </h3>
          <p className="text-xs text-[var(--muted-foreground)]">Track your emotional discipline and earn badges</p>
        </div>
        <div className="text-right">
          <div className="text-xs text-[var(--muted-foreground)]">Total Points</div>
          <div className="text-xl font-bold text-[var(--accent)]">{state.totalPoints.toLocaleString()}</div>
        </div>
      </div>

      {/* Score Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3">
        {/* Overall Grade */}
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-3 sm:p-4 text-center">
          <div className="text-[10px] sm:text-xs text-[var(--muted-foreground)] mb-1">7-Day Grade</div>
          {overallGrade ? (
            <>
              <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl border-2 text-2xl font-black ${getGradeColor(overallGrade)}`}>
                {overallGrade}
              </div>
              <div className="text-[10px] text-[var(--muted-foreground)] mt-1">{getGradeLabel(overallGrade)}</div>
            </>
          ) : (
            <div className="text-sm text-[var(--muted-foreground)]">No data</div>
          )}
        </div>

        {/* Today */}
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-3 sm:p-4 text-center">
          <div className="text-[10px] sm:text-xs text-[var(--muted-foreground)] mb-1">Today</div>
          {todayScore ? (
            <>
              <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl border-2 text-2xl font-black ${getGradeColor(todayScore.grade)}`}>
                {todayScore.grade}
              </div>
              <div className="text-[10px] text-[var(--muted-foreground)] mt-1">
                {todayScore.points > 0 ? '+' : ''}{todayScore.points} pts
              </div>
            </>
          ) : (
            <div className="text-sm text-[var(--muted-foreground)]">No trades</div>
          )}
        </div>

        {/* Streak */}
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-3 sm:p-4 text-center">
          <div className="flex items-center justify-center gap-1 text-[10px] sm:text-xs text-[var(--muted-foreground)] mb-1">
            <Flame size={12} /> Discipline Streak
          </div>
          <div className="text-xl sm:text-2xl font-bold text-orange-400">
            {state.currentStreak}
          </div>
          <div className="text-[10px] text-[var(--muted-foreground)]">
            days{state.currentStreak >= 3 ? ' 🔥' : ''}
          </div>
        </div>

        {/* Best Streak */}
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-3 sm:p-4 text-center">
          <div className="text-[10px] sm:text-xs text-[var(--muted-foreground)] mb-1">Best Streak</div>
          <div className="text-xl sm:text-2xl font-bold text-[var(--purple)]">
            {state.longestStreak}
          </div>
          <div className="text-[10px] text-[var(--muted-foreground)]">days</div>
        </div>
      </div>

      {/* Recent Daily Grades */}
      {recentScores.length > 0 && (
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 sm:p-5">
          <h4 className="text-sm font-semibold mb-3">Recent Discipline Grades</h4>
          <div className="flex flex-wrap gap-2">
            {recentScores.map(score => (
              <div key={score.date} className="text-center">
                <div className={`w-10 h-10 rounded-lg border flex items-center justify-center text-sm font-bold ${getGradeColor(score.grade)}`}>
                  {score.grade}
                </div>
                <div className="text-[9px] text-[var(--muted-foreground)] mt-1">
                  {score.date.slice(5)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Badges */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 sm:p-5">
        <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <Star size={16} className="text-yellow-400" /> Badges
          <span className="text-xs text-[var(--muted-foreground)] font-normal">
            {state.earnedBadgeIds.length}/{DISCIPLINE_BADGES.length} earned
          </span>
        </h4>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 sm:gap-3">
          {DISCIPLINE_BADGES.map(badge => {
            const earned = state.earnedBadgeIds.includes(badge.id);
            return (
              <div
                key={badge.id}
                className={`relative p-3 rounded-xl border text-center transition-all ${
                  earned
                    ? 'border-yellow-500/30 bg-yellow-500/5'
                    : 'border-[var(--border)] opacity-50 grayscale'
                }`}
              >
                {!earned && (
                  <Lock size={10} className="absolute top-2 right-2 text-[var(--muted-foreground)]" />
                )}
                <div className="text-2xl mb-1">{badge.emoji}</div>
                <div className="text-xs font-medium leading-tight">{badge.name}</div>
                <div className="text-[9px] text-[var(--muted-foreground)] mt-0.5 leading-tight">{badge.requirement}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Points Breakdown */}
      {todayScore && (
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 sm:p-5">
          <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Shield size={16} className="text-blue-400" /> Today&apos;s Breakdown
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            <div>
              <div className="text-[10px] text-[var(--muted-foreground)]">Rules Followed</div>
              <div className="font-semibold">
                {todayScore.rulesFollowed}/{todayScore.rulesTotal}
                <span className="text-xs text-[var(--green)] ml-1">+{todayScore.rulesFollowed * 10}</span>
              </div>
            </div>
            <div>
              <div className="text-[10px] text-[var(--muted-foreground)]">Calm Trades</div>
              <div className="font-semibold">
                {todayScore.calmTrades}/{todayScore.totalTrades}
                <span className="text-xs text-[var(--green)] ml-1">+{todayScore.calmTrades * 5}</span>
              </div>
            </div>
            <div>
              <div className="text-[10px] text-[var(--muted-foreground)]">Breakers Respected</div>
              <div className="font-semibold">
                {todayScore.breakersRespected}/{todayScore.breakersTriggered}
                <span className="text-xs text-[var(--green)] ml-1">+{todayScore.breakersRespected * 15}</span>
              </div>
            </div>
            <div>
              <div className="text-[10px] text-[var(--muted-foreground)]">Overrides</div>
              <div className="font-semibold">
                {todayScore.breakersOverridden}
                {todayScore.breakersOverridden > 0 && (
                  <span className="text-xs text-[var(--red)] ml-1">-{todayScore.breakersOverridden * 20}</span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
