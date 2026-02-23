'use client';

import { useMemo } from 'react';
import { Trade, CircuitBreakerEvent } from '@/lib/types';
import { EMOTION_OPTIONS } from '@/lib/utils';
import { format, subDays, startOfDay, startOfWeek } from 'date-fns';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import { Shield, AlertTriangle, Clock, Zap, Brain } from 'lucide-react';

interface Props {
  trades: Trade[];
  breakerEvents: CircuitBreakerEvent[];
}

export default function EmotionAnalytics({ trades, breakerEvents }: Props) {
  const closedTrades = trades.filter(t => !t.isOpen && t.actualPnLPercent !== null);

  // Emotion vs Outcome detailed
  const emotionOutcomeData = useMemo(() => {
    const map = new Map<string, { wins: number; losses: number; avgPnl: number; totalPnl: number; count: number }>();
    closedTrades.forEach(t => {
      const cur = map.get(t.emotion) || { wins: 0, losses: 0, avgPnl: 0, totalPnl: 0, count: 0 };
      cur.count++;
      cur.totalPnl += t.actualPnLPercent ?? 0;
      if ((t.actualPnLPercent ?? 0) > 0) cur.wins++;
      else cur.losses++;
      cur.avgPnl = cur.totalPnl / cur.count;
      map.set(t.emotion, cur);
    });
    return Array.from(map.entries())
      .map(([emotion, data]) => ({
        emotion,
        emoji: EMOTION_OPTIONS.find(e => e.value === emotion)?.emoji || '',
        winRate: Math.round((data.wins / data.count) * 100),
        avgPnl: Math.round(data.avgPnl * 100) / 100,
        trades: data.count,
      }))
      .sort((a, b) => b.trades - a.trades);
  }, [closedTrades]);

  // 30-day emotional calendar heatmap
  const calendarData = useMemo(() => {
    const days: { date: string; dateLabel: string; emotion: string; emoji: string; trades: number; pnl: number }[] = [];
    const today = startOfDay(new Date());

    for (let i = 29; i >= 0; i--) {
      const day = subDays(today, i);
      const dayStr = format(day, 'yyyy-MM-dd');
      const dayTrades = closedTrades.filter(t => {
        const tradeDate = format(new Date(t.exitDate!), 'yyyy-MM-dd');
        return tradeDate === dayStr;
      });

      if (dayTrades.length > 0) {
        // Dominant emotion = most frequent
        const emotionCounts = new Map<string, number>();
        dayTrades.forEach(t => emotionCounts.set(t.emotion, (emotionCounts.get(t.emotion) || 0) + 1));
        const dominant = [...emotionCounts.entries()].sort((a, b) => b[1] - a[1])[0][0];
        const pnl = dayTrades.reduce((s, t) => s + (t.actualPnLPercent ?? 0), 0);

        days.push({
          date: dayStr,
          dateLabel: format(day, 'MMM dd'),
          emotion: dominant,
          emoji: EMOTION_OPTIONS.find(e => e.value === dominant)?.emoji || '',
          trades: dayTrades.length,
          pnl: Math.round(pnl * 100) / 100,
        });
      } else {
        days.push({
          date: dayStr,
          dateLabel: format(day, 'MMM dd'),
          emotion: '',
          emoji: '',
          trades: 0,
          pnl: 0,
        });
      }
    }
    return days;
  }, [closedTrades]);

  // Trigger analysis
  const triggerAnalysis = useMemo(() => {
    const insights: { pattern: string; detail: string; severity: 'danger' | 'warning' | 'info' }[] = [];
    const sorted = [...closedTrades].sort((a, b) => new Date(a.exitDate!).getTime() - new Date(b.exitDate!).getTime());

    // After consecutive losses → what happens?
    let consecutiveLosses = 0;
    let tradesAfterLossStreak = 0;
    let winsAfterLossStreak = 0;
    sorted.forEach((t, i) => {
      if ((t.actualPnLPercent ?? 0) <= 0) {
        consecutiveLosses++;
      } else {
        if (consecutiveLosses >= 2 && i > 0) {
          tradesAfterLossStreak++;
          if ((t.actualPnLPercent ?? 0) > 0) winsAfterLossStreak++;
        }
        consecutiveLosses = 0;
      }
    });
    if (tradesAfterLossStreak >= 2) {
      const winRate = Math.round((winsAfterLossStreak / tradesAfterLossStreak) * 100);
      insights.push({
        pattern: 'After 2+ Losses',
        detail: `Your win rate drops to ${winRate}% on trades after a losing streak (${tradesAfterLossStreak} occurrences).`,
        severity: winRate < 40 ? 'danger' : 'warning',
      });
    }

    // Time-of-day analysis
    const hourBuckets = new Map<string, { wins: number; total: number }>();
    closedTrades.forEach(t => {
      const hour = new Date(t.entryDate).getHours();
      const bucket = hour < 6 ? 'Late Night (12-6AM)' : hour < 12 ? 'Morning (6AM-12PM)' : hour < 18 ? 'Afternoon (12-6PM)' : hour < 22 ? 'Evening (6-10PM)' : 'Late Night (10PM-12AM)';
      const cur = hourBuckets.get(bucket) || { wins: 0, total: 0 };
      cur.total++;
      if ((t.actualPnLPercent ?? 0) > 0) cur.wins++;
      hourBuckets.set(bucket, cur);
    });
    hourBuckets.forEach((data, bucket) => {
      if (data.total >= 3) {
        const winRate = Math.round((data.wins / data.total) * 100);
        if (winRate < 35 && (bucket.includes('Late Night') || bucket.includes('Evening'))) {
          insights.push({
            pattern: `${bucket} Trading`,
            detail: `Only ${winRate}% win rate during ${bucket.toLowerCase()} (${data.total} trades). Consider avoiding these hours.`,
            severity: 'danger',
          });
        }
      }
    });

    // High intensity trades
    const highIntensityTrades = closedTrades.filter(t => t.confidence >= 8);
    if (highIntensityTrades.length >= 3) {
      const wins = highIntensityTrades.filter(t => (t.actualPnLPercent ?? 0) > 0).length;
      const winRate = Math.round((wins / highIntensityTrades.length) * 100);
      insights.push({
        pattern: 'High Confidence Trades',
        detail: `Trades with confidence 8+ have a ${winRate}% win rate (${highIntensityTrades.length} trades).`,
        severity: winRate >= 55 ? 'info' : 'warning',
      });
    }

    return insights;
  }, [closedTrades]);

  // Red flag metrics
  const redFlags = useMemo(() => {
    const now = Date.now();
    const last7d = breakerEvents.filter(e => now - new Date(e.triggeredAt).getTime() < 7 * 24 * 60 * 60 * 1000);
    const last30d = breakerEvents.filter(e => now - new Date(e.triggeredAt).getTime() < 30 * 24 * 60 * 60 * 1000);
    const overrides = last30d.filter(e => e.overridden);

    // Emotional volatility: how often emotion changes between consecutive trades
    const sorted = [...closedTrades].sort((a, b) => new Date(a.exitDate!).getTime() - new Date(b.exitDate!).getTime());
    let emotionChanges = 0;
    sorted.forEach((t, i) => {
      if (i > 0 && t.emotion !== sorted[i - 1].emotion) emotionChanges++;
    });
    const volatilityScore = sorted.length > 1 ? Math.round((emotionChanges / (sorted.length - 1)) * 100) : 0;

    return {
      breakersLast7d: last7d.length,
      breakersLast30d: last30d.length,
      overrideCount: overrides.length,
      overrideRate: last30d.length > 0 ? Math.round((overrides.length / last30d.length) * 100) : 0,
      emotionalVolatility: volatilityScore,
    };
  }, [breakerEvents, closedTrades]);

  // Emotion P&L chart data
  const emotionPnlChart = useMemo(() => {
    return emotionOutcomeData.map(d => ({
      name: d.emotion.length > 10 ? d.emotion.slice(0, 10) + '..' : d.emotion,
      avgPnl: d.avgPnl,
      trades: d.trades,
    }));
  }, [emotionOutcomeData]);

  // ── Cognitive Bias Detector (#30) ──
  const cognitiveBiases = useMemo(() => {
    const sorted = [...closedTrades].sort(
      (a, b) => new Date(a.exitDate!).getTime() - new Date(b.exitDate!).getTime()
    );
    const biases: { name: string; finding: string; severity: 'danger' | 'warning' | 'info' }[] = [];

    // Overconfidence: position size spikes after win streaks
    const capTrades = sorted.filter(t => t.capital > 0);
    if (capTrades.length >= 6) {
      const baseline = capTrades.reduce((s, t) => s + t.capital, 0) / capTrades.length;
      const afterWinStreak: number[] = [];
      let streak = 0;
      sorted.forEach((t, i) => {
        if (i > 0 && streak >= 2 && t.capital > 0) afterWinStreak.push(t.capital);
        streak = (t.actualPnLPercent ?? 0) > 0 ? streak + 1 : 0;
      });
      if (afterWinStreak.length >= 2 && baseline > 0) {
        const afterAvg = afterWinStreak.reduce((s, v) => s + v, 0) / afterWinStreak.length;
        const pct = Math.round(((afterAvg - baseline) / baseline) * 100);
        if (pct >= 15) {
          biases.push({
            name: 'Overconfidence Bias',
            finding: `Position size is ${pct}% larger than average after win streaks — you may be over-sizing when feeling confident.`,
            severity: pct > 35 ? 'danger' : 'warning',
          });
        } else if (pct <= -15) {
          biases.push({
            name: 'Risk Aversion After Wins',
            finding: `Position size is ${Math.abs(pct)}% smaller after win streaks — possibly fear of giving back profits.`,
            severity: 'info',
          });
        }
      }
    }

    // Premature exit: winning trades capture far less than target
    const winWithTarget = closedTrades.filter(
      t => t.targetPnL !== null && t.targetPnL > 0 && (t.actualPnLPercent ?? 0) > 0
    );
    if (winWithTarget.length >= 3) {
      const rates = winWithTarget.map(t => Math.min((t.actualPnLPercent ?? 0) / t.targetPnL!, 2));
      const avg = Math.round((rates.reduce((s, v) => s + v, 0) / rates.length) * 100);
      if (avg < 80) {
        biases.push({
          name: 'Premature Exit',
          finding: `On winning trades you capture ~${avg}% of your planned target — you may be cutting winners short before they reach full potential.`,
          severity: avg < 55 ? 'danger' : 'warning',
        });
      }
    }

    // Recency bias: trade more in weeks after good weeks
    const weekMap = new Map<string, { pnl: number; count: number }>();
    closedTrades.forEach(t => {
      const wk = format(startOfWeek(new Date(t.exitDate!), { weekStartsOn: 1 }), 'yyyy-MM-dd');
      const cur = weekMap.get(wk) ?? { pnl: 0, count: 0 };
      cur.pnl += t.actualPnL ?? 0;
      cur.count++;
      weekMap.set(wk, cur);
    });
    const weeks = [...weekMap.entries()].sort((a, b) => a[0].localeCompare(b[0]));
    if (weeks.length >= 4) {
      const afterGood: number[] = [], afterBad: number[] = [];
      weeks.forEach((w, i) => {
        if (i === 0) return;
        (weeks[i - 1][1].pnl > 0 ? afterGood : afterBad).push(w[1].count);
      });
      if (afterGood.length >= 2 && afterBad.length >= 2) {
        const avgGood = afterGood.reduce((s, v) => s + v, 0) / afterGood.length;
        const avgBad = afterBad.reduce((s, v) => s + v, 0) / afterBad.length;
        const diff = Math.round(((avgGood - avgBad) / Math.max(avgBad, 1)) * 100);
        if (diff >= 25) {
          biases.push({
            name: 'Recency Bias',
            finding: `You trade ${diff}% more often after profitable weeks than losing weeks — recent wins may be making you over-estimate your edge.`,
            severity: diff > 60 ? 'danger' : 'warning',
          });
        }
      }
    }

    return biases;
  }, [closedTrades]);

  // ── Confidence Calibration ──
  const confidenceCalibration = useMemo(() => {
    const buckets = new Map<number, { wins: number; total: number }>();
    closedTrades.forEach(t => {
      const lvl = t.confidence;
      const cur = buckets.get(lvl) ?? { wins: 0, total: 0 };
      cur.total++;
      if ((t.actualPnLPercent ?? 0) > 0) cur.wins++;
      buckets.set(lvl, cur);
    });
    const data = [...buckets.entries()]
      .filter(([, d]) => d.total >= 2)
      .sort((a, b) => a[0] - b[0])
      .map(([level, d]) => ({
        level,
        winRate: Math.round((d.wins / d.total) * 100),
        trades: d.total,
      }));
    const highConf = data.filter(d => d.level >= 7);
    const lowConf = data.filter(d => d.level <= 4);
    const highWr = highConf.length > 0
      ? Math.round(highConf.reduce((s, d) => s + d.winRate, 0) / highConf.length) : null;
    const lowWr = lowConf.length > 0
      ? Math.round(lowConf.reduce((s, d) => s + d.winRate, 0) / lowConf.length) : null;
    const bestLevel = data.length > 0 ? [...data].sort((a, b) => b.winRate - a.winRate)[0] : null;
    return { data, highWr, lowWr, bestLevel };
  }, [closedTrades]);

  if (closedTrades.length < 3) {
    return null;
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h3 className="text-lg font-bold flex items-center gap-2">
          <Shield size={20} className="text-[var(--purple)]" />
          Emotion-Based Analytics
        </h3>
        <p className="text-sm text-[var(--muted-foreground)]">Deep insights into how emotions affect your trading</p>
      </div>

      {/* Red Flag Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-3 sm:p-4">
          <div className="flex items-center gap-1.5 text-[10px] sm:text-xs text-[var(--muted-foreground)] mb-1">
            <AlertTriangle size={12} /> Breakers (7d)
          </div>
          <div className={`text-base sm:text-lg font-bold ${redFlags.breakersLast7d > 3 ? 'text-[var(--red)]' : redFlags.breakersLast7d > 0 ? 'text-[var(--yellow)]' : 'text-[var(--green)]'}`}>
            {redFlags.breakersLast7d}
          </div>
        </div>
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-3 sm:p-4">
          <div className="flex items-center gap-1.5 text-[10px] sm:text-xs text-[var(--muted-foreground)] mb-1">
            <Shield size={12} /> Overrides (30d)
          </div>
          <div className={`text-base sm:text-lg font-bold ${redFlags.overrideRate > 50 ? 'text-[var(--red)]' : 'text-[var(--foreground)]'}`}>
            {redFlags.overrideCount}/{redFlags.breakersLast30d}
          </div>
        </div>
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-3 sm:p-4">
          <div className="flex items-center gap-1.5 text-[10px] sm:text-xs text-[var(--muted-foreground)] mb-1">
            <Zap size={12} /> Emotion Volatility
          </div>
          <div className={`text-base sm:text-lg font-bold ${redFlags.emotionalVolatility > 70 ? 'text-[var(--red)]' : redFlags.emotionalVolatility > 40 ? 'text-[var(--yellow)]' : 'text-[var(--green)]'}`}>
            {redFlags.emotionalVolatility}%
          </div>
        </div>
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-3 sm:p-4">
          <div className="flex items-center gap-1.5 text-[10px] sm:text-xs text-[var(--muted-foreground)] mb-1">
            <Clock size={12} /> Breakers (30d)
          </div>
          <div className="text-base sm:text-lg font-bold">{redFlags.breakersLast30d}</div>
        </div>
      </div>

      {/* Emotion vs Avg P&L Chart */}
      {emotionPnlChart.length > 0 && (
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 sm:p-5">
          <h4 className="font-semibold mb-3 sm:mb-4">Average P&L% by Emotion</h4>
          <div className="h-[200px] sm:h-[250px]">
            <ResponsiveContainer>
              <BarChart data={emotionPnlChart}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} width={45} />
                <Tooltip
                  contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '12px' }}
                  formatter={(value: number | undefined) => [`${value ?? 0}%`, 'Avg P&L']}
                />
                <Bar dataKey="avgPnl" name="Avg P&L %" radius={[4, 4, 0, 0]}>
                  {emotionPnlChart.map((entry, index) => (
                    <Cell key={index} fill={entry.avgPnl >= 0 ? '#22c55e' : '#ef4444'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* 30-Day Emotional Calendar */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 sm:p-5">
        <h4 className="font-semibold mb-3">30-Day Emotional Calendar</h4>
        <div className="grid grid-cols-6 sm:grid-cols-10 gap-1.5 sm:gap-2">
          {calendarData.map(day => (
            <div
              key={day.date}
              className={`aspect-square rounded-lg flex flex-col items-center justify-center text-[10px] sm:text-xs border ${
                day.trades > 0
                  ? day.pnl >= 0
                    ? 'border-green-500/30 bg-green-500/10'
                    : 'border-red-500/30 bg-red-500/10'
                  : 'border-[var(--border)] bg-[var(--muted)]/30'
              }`}
              title={day.trades > 0 ? `${day.dateLabel}: ${day.emotion} (${day.trades} trades, ${day.pnl > 0 ? '+' : ''}${day.pnl}%)` : day.dateLabel}
            >
              {day.trades > 0 ? (
                <>
                  <span className="text-sm sm:text-base">{day.emoji}</span>
                  <span className="text-[8px] sm:text-[10px] text-[var(--muted-foreground)]">{format(new Date(day.date), 'dd')}</span>
                </>
              ) : (
                <span className="text-[var(--muted-foreground)]">{format(new Date(day.date), 'dd')}</span>
              )}
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-3 mt-3 text-[10px] sm:text-xs text-[var(--muted-foreground)]">
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-500/20 border border-green-500/30" /> Profitable day</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-500/20 border border-red-500/30" /> Losing day</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-[var(--muted)]/30 border border-[var(--border)]" /> No trades</span>
        </div>
      </div>

      {/* Emotion Breakdown Table */}
      {emotionOutcomeData.length > 0 && (
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 sm:p-5">
          <h4 className="font-semibold mb-3">Emotion Breakdown</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-xs sm:text-sm">
              <thead>
                <tr className="text-left text-[var(--muted-foreground)] border-b border-[var(--border)]">
                  <th className="pb-2 font-medium">Emotion</th>
                  <th className="pb-2 font-medium text-center">Trades</th>
                  <th className="pb-2 font-medium text-center">Win Rate</th>
                  <th className="pb-2 font-medium text-right">Avg P&L</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {emotionOutcomeData.map(d => (
                  <tr key={d.emotion} className="hover:bg-[var(--card-hover)]">
                    <td className="py-2.5">
                      <span className="flex items-center gap-2">
                        <span>{d.emoji}</span>
                        <span>{d.emotion}</span>
                      </span>
                    </td>
                    <td className="py-2.5 text-center">{d.trades}</td>
                    <td className="py-2.5 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-xs ${
                        d.winRate >= 55 ? 'bg-green-500/15 text-[var(--green)]' :
                        d.winRate < 40 ? 'bg-red-500/15 text-[var(--red)]' :
                        'bg-yellow-500/15 text-[var(--yellow)]'
                      }`}>
                        {d.winRate}%
                      </span>
                    </td>
                    <td className={`py-2.5 text-right font-medium ${d.avgPnl >= 0 ? 'text-[var(--green)]' : 'text-[var(--red)]'}`}>
                      {d.avgPnl > 0 ? '+' : ''}{d.avgPnl}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Confidence Calibration ── */}
      {confidenceCalibration.data.length >= 3 && (
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 sm:p-5">
          <h4 className="font-semibold mb-0.5">Confidence Calibration</h4>
          <p className="text-[10px] text-[var(--muted-foreground)] mb-3">
            Win rate at each confidence level you logged
            {confidenceCalibration.bestLevel && (
              <> — best results at confidence <strong>{confidenceCalibration.bestLevel.level}</strong> ({confidenceCalibration.bestLevel.winRate}% win rate)</>
            )}
          </p>
          <div className="h-[160px]">
            <ResponsiveContainer>
              <BarChart data={confidenceCalibration.data} barSize={22}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="level" tick={{ fontSize: 10 }} label={{ value: 'Confidence', position: 'insideBottom', offset: -2, fontSize: 10 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} width={32} tickFormatter={v => `${v}%`} />
                <Tooltip
                  contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '12px' }}
                  formatter={(v: number | undefined) => [`${v ?? 0}%`, 'Win Rate']}
                />
                <Bar dataKey="winRate" name="Win Rate" radius={[4, 4, 0, 0]}>
                  {confidenceCalibration.data.map((d, i) => (
                    <Cell key={i} fill={d.winRate >= 50 ? '#22c55e' : '#ef4444'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          {confidenceCalibration.highWr !== null && confidenceCalibration.lowWr !== null && (
            <p className="text-xs text-[var(--muted-foreground)] mt-2">
              High confidence (7+):{' '}
              <span className={confidenceCalibration.highWr >= 50 ? 'text-[var(--green)]' : 'text-[var(--red)]'}>
                {confidenceCalibration.highWr}% win rate
              </span>
              {' · '}
              Low confidence (≤4):{' '}
              <span className={confidenceCalibration.lowWr >= 50 ? 'text-[var(--green)]' : 'text-[var(--red)]'}>
                {confidenceCalibration.lowWr}% win rate
              </span>
              {confidenceCalibration.highWr > confidenceCalibration.lowWr
                ? ' — your confidence is well-calibrated.'
                : ' — you perform better at lower confidence, watch for overconfidence.'}
            </p>
          )}
        </div>
      )}

      {/* Trigger Analysis */}
      {triggerAnalysis.length > 0 && (
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 sm:p-5 space-y-3">
          <h4 className="font-semibold">Trigger Analysis</h4>
          {triggerAnalysis.map((t, i) => (
            <div
              key={i}
              className={`p-3 rounded-xl border text-sm ${
                t.severity === 'danger' ? 'bg-red-500/10 border-red-500/20' :
                t.severity === 'warning' ? 'bg-yellow-500/10 border-yellow-500/20' :
                'bg-blue-500/10 border-blue-500/20'
              }`}
            >
              <div className={`font-medium mb-1 ${
                t.severity === 'danger' ? 'text-[var(--red)]' :
                t.severity === 'warning' ? 'text-[var(--yellow)]' :
                'text-blue-400'
              }`}>
                {t.pattern}
              </div>
              <p className="text-[var(--foreground)]">{t.detail}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── Cognitive Bias Detector ── */}
      {cognitiveBiases.length > 0 && (
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 sm:p-5 space-y-3">
          <div>
            <h4 className="font-semibold flex items-center gap-2">
              <Brain size={16} className="text-amber-400" />
              Cognitive Bias Detector
            </h4>
            <p className="text-[10px] text-[var(--muted-foreground)] mt-0.5">Patterns detected from your trade history</p>
          </div>
          {cognitiveBiases.map((b, i) => (
            <div
              key={i}
              className={`p-3 rounded-xl border text-sm ${
                b.severity === 'danger' ? 'bg-red-500/10 border-red-500/20' :
                b.severity === 'warning' ? 'bg-amber-500/10 border-amber-500/20' :
                'bg-blue-500/10 border-blue-500/20'
              }`}
            >
              <div className={`font-medium mb-1 text-xs uppercase tracking-wide ${
                b.severity === 'danger' ? 'text-red-400' :
                b.severity === 'warning' ? 'text-amber-400' :
                'text-blue-400'
              }`}>
                {b.name}
              </div>
              <p className="text-[var(--foreground)]">{b.finding}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
