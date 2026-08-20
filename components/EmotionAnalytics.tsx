'use client';

import { useMemo } from 'react';
import { Trade, CircuitBreakerEvent } from '@/lib/types';
import { EMOTION_OPTIONS } from '@/lib/utils';
import { format, subDays, startOfDay, startOfWeek } from 'date-fns';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import { Shield, Warning, Clock, Lightning, Brain } from '@phosphor-icons/react';

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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* ── Header + Red Flag Metrics ── */}
      <div className="card">
        <span className="accent" style={{ width: 56, background: 'var(--pink)' }} />
        <div className="cardhead">
          <div>
            <p className="lbl b10" style={{ color: 'var(--pink)', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <Shield size={12} /> EMOTION ANALYTICS
            </p>
            <h3>Emotion-Based Analytics</h3>
            <p className="sub">Deep insights into how emotions affect your trading.</p>
          </div>
        </div>

        <div className="stats" style={{ marginTop: 22 }}>
          <div className="stat" style={{ height: 'auto', minHeight: 96 }}>
            <span className="accent" style={{ background: redFlags.breakersLast7d > 3 ? 'var(--red)' : redFlags.breakersLast7d > 0 ? 'var(--amber)' : 'var(--green)' }} />
            <b style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              BREAKERS (7D)
              <span style={{ marginLeft: 'auto', color: 'var(--muted-3)' }}><Warning size={13} /></span>
            </b>
            <em style={{ color: redFlags.breakersLast7d > 3 ? 'var(--red)' : redFlags.breakersLast7d > 0 ? 'var(--amber)' : 'var(--green)' }}>
              {redFlags.breakersLast7d}
            </em>
          </div>
          <div className="stat" style={{ height: 'auto', minHeight: 96 }}>
            <span className="accent" style={{ background: redFlags.overrideRate > 50 ? 'var(--red)' : 'var(--teal)' }} />
            <b style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              OVERRIDES (30D)
              <span style={{ marginLeft: 'auto', color: 'var(--muted-3)' }}><Shield size={13} /></span>
            </b>
            <em style={{ color: redFlags.overrideRate > 50 ? 'var(--red)' : 'var(--text)' }}>
              {redFlags.overrideCount}/{redFlags.breakersLast30d}
            </em>
          </div>
          <div className="stat" style={{ height: 'auto', minHeight: 96 }}>
            <span className="accent" style={{ background: redFlags.emotionalVolatility > 70 ? 'var(--red)' : redFlags.emotionalVolatility > 40 ? 'var(--amber)' : 'var(--green)' }} />
            <b style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              EMOTION VOLATILITY
              <span style={{ marginLeft: 'auto', color: 'var(--muted-3)' }}><Lightning size={13} /></span>
            </b>
            <em style={{ color: redFlags.emotionalVolatility > 70 ? 'var(--red)' : redFlags.emotionalVolatility > 40 ? 'var(--amber)' : 'var(--green)' }}>
              {redFlags.emotionalVolatility}%
            </em>
          </div>
          <div className="stat" style={{ height: 'auto', minHeight: 96 }}>
            <span className="accent" style={{ background: 'var(--amber)' }} />
            <b style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              BREAKERS (30D)
              <span style={{ marginLeft: 'auto', color: 'var(--muted-3)' }}><Clock size={13} /></span>
            </b>
            <em>{redFlags.breakersLast30d}</em>
          </div>
        </div>
      </div>

      {/* ── Emotion vs Avg P&L Chart ── */}
      {emotionPnlChart.length > 0 && (
        <div className="card">
          <span className="accent" style={{ width: 56, background: 'var(--teal)' }} />
          <div className="cardhead">
            <div>
              <h4>Average P&amp;L% by Emotion</h4>
              <p className="sub sm">Which emotional states actually pay.</p>
            </div>
          </div>
          <div style={{ height: 240, marginTop: 20 }}>
            <ResponsiveContainer>
              <BarChart data={emotionPnlChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="#182432" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#7f8ea3' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 9, fill: '#7f8ea3' }} tickLine={false} axisLine={false} width={45} />
                <Tooltip
                  cursor={{ fill: '#0e1725' }}
                  contentStyle={{ background: '#0c1119', border: '1px solid #182432', borderRadius: '2px', fontSize: '11px', color: '#edf2f7' }}
                  formatter={(value) => [`${typeof value === 'number' ? value : 0}%`, 'Avg P&L']}
                />
                <Bar dataKey="avgPnl" name="Avg P&L %" radius={[2, 2, 0, 0]}>
                  {emotionPnlChart.map((entry, index) => (
                    <Cell key={index} fill={entry.avgPnl >= 0 ? '#24c88a' : '#ff4d5e'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ── 30-Day Emotional Calendar ── */}
      <div className="card">
        <span className="accent" style={{ width: 56, background: 'var(--amber)' }} />
        <div className="cardhead">
          <div>
            <h4>30-Day Emotional Calendar</h4>
            <p className="sub sm">Dominant emotion and result per trading day.</p>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(44px,1fr))', gap: 6, marginTop: 20 }}>
          {calendarData.map(day => (
            <div
              key={day.date}
              style={{
                aspectRatio: '1 / 1',
                minHeight: 44,
                borderRadius: 2,
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                border: '1px solid',
                borderColor: day.trades > 0 ? (day.pnl >= 0 ? 'rgba(36,200,138,.4)' : 'rgba(255,77,94,.4)') : 'var(--line)',
                background: day.trades > 0 ? (day.pnl >= 0 ? 'rgba(36,200,138,.08)' : 'rgba(255,77,94,.08)') : 'var(--panel-2)',
              }}
              title={day.trades > 0 ? `${day.dateLabel}: ${day.emotion} (${day.trades} trades, ${day.pnl > 0 ? '+' : ''}${day.pnl}%)` : day.dateLabel}
            >
              {day.trades > 0 && <span style={{ fontSize: 14, lineHeight: '17px' }}>{day.emoji}</span>}
              <span style={{ fontFamily: 'var(--mono)', fontSize: 9.5, color: 'var(--muted-2)', marginTop: day.trades > 0 ? 2 : 0 }}>
                {format(new Date(day.date), 'dd')}
              </span>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginTop: 16, fontSize: 10.5, color: 'var(--muted-2)' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
            <span style={{ width: 9, height: 9, borderRadius: 1, background: 'rgba(36,200,138,.2)', border: '1px solid rgba(36,200,138,.4)' }} /> Profitable day
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
            <span style={{ width: 9, height: 9, borderRadius: 1, background: 'rgba(255,77,94,.2)', border: '1px solid rgba(255,77,94,.4)' }} /> Losing day
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
            <span style={{ width: 9, height: 9, borderRadius: 1, background: 'var(--panel-2)', border: '1px solid var(--line)' }} /> No trades
          </span>
        </div>
      </div>

      {/* ── Emotion Breakdown ── */}
      {emotionOutcomeData.length > 0 && (
        <div className="card">
          <span className="accent" style={{ width: 56, background: 'var(--green)' }} />
          <div className="cardhead">
            <div>
              <h4>Emotion Breakdown</h4>
              <p className="sub sm">Sample size, win rate, and average result per emotion.</p>
            </div>
          </div>
          <div style={{ marginTop: 18 }}>
            {emotionOutcomeData.map(d => (
              <div key={d.emotion} className="mrow">
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 9, color: 'var(--text)' }}>
                  <span>{d.emoji}</span>
                  <span>{d.emotion}</span>
                </span>
                <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 16 }}>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 11.5, color: 'var(--muted-2)' }}>{d.trades} trades</span>
                  <span
                    className="chip"
                    style={{
                      height: 20, padding: '0 9px', fontSize: 9.5, fontWeight: 700,
                      color: d.winRate >= 55 ? 'var(--green)' : d.winRate < 40 ? 'var(--red)' : 'var(--amber)',
                    }}
                  >
                    {d.winRate}%
                  </span>
                  <span className="val" style={{ marginLeft: 0, width: 72, textAlign: 'right', color: d.avgPnl >= 0 ? 'var(--green)' : 'var(--red)' }}>
                    {d.avgPnl > 0 ? '+' : ''}{d.avgPnl}%
                  </span>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Confidence Calibration ── */}
      {confidenceCalibration.data.length >= 3 && (
        <div className="card">
          <span className="accent" style={{ width: 56, background: 'var(--teal)' }} />
          <div className="cardhead">
            <div>
              <h4>Confidence Calibration</h4>
              <p className="sub sm">
                Win rate at each confidence level you logged
                {confidenceCalibration.bestLevel && (
                  <> — best results at confidence <strong style={{ color: 'var(--text)' }}>{confidenceCalibration.bestLevel.level}</strong> ({confidenceCalibration.bestLevel.winRate}% win rate)</>
                )}
              </p>
            </div>
          </div>
          <div style={{ height: 180, marginTop: 20 }}>
            <ResponsiveContainer>
              <BarChart data={confidenceCalibration.data} barSize={22}>
                <CartesianGrid strokeDasharray="3 3" stroke="#182432" vertical={false} />
                <XAxis dataKey="level" tick={{ fontSize: 9, fill: '#7f8ea3' }} tickLine={false} axisLine={false} label={{ value: 'Confidence', position: 'insideBottom', offset: -2, fontSize: 9, fill: '#5c6b7e' }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 9, fill: '#7f8ea3' }} tickLine={false} axisLine={false} width={32} tickFormatter={v => `${v}%`} />
                <Tooltip
                  cursor={{ fill: '#0e1725' }}
                  contentStyle={{ background: '#0c1119', border: '1px solid #182432', borderRadius: '2px', fontSize: '11px', color: '#edf2f7' }}
                  formatter={(v) => [`${typeof v === 'number' ? v : 0}%`, 'Win Rate']}
                />
                <Bar dataKey="winRate" name="Win Rate" radius={[2, 2, 0, 0]}>
                  {confidenceCalibration.data.map((d, i) => (
                    <Cell key={i} fill={d.winRate >= 50 ? '#24c88a' : '#ff4d5e'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          {confidenceCalibration.highWr !== null && confidenceCalibration.lowWr !== null && (
            <div className="note" style={{ height: 'auto', minHeight: 44, padding: '12px 18px', lineHeight: '19px' }}>
              <span>
                High confidence (7+):{' '}
                <span style={{ fontFamily: 'var(--mono)', color: confidenceCalibration.highWr >= 50 ? 'var(--green)' : 'var(--red)' }}>
                  {confidenceCalibration.highWr}%
                </span>
                {' • '}
                Low confidence (≤4):{' '}
                <span style={{ fontFamily: 'var(--mono)', color: confidenceCalibration.lowWr >= 50 ? 'var(--green)' : 'var(--red)' }}>
                  {confidenceCalibration.lowWr}%
                </span>
                {confidenceCalibration.highWr > confidenceCalibration.lowWr
                  ? ' — your confidence is well-calibrated.'
                  : ' — you perform better at lower confidence, watch for overconfidence.'}
              </span>
            </div>
          )}
        </div>
      )}

      {/* ── Trigger Analysis ── */}
      {triggerAnalysis.length > 0 && (
        <div className="card">
          <span className="accent" style={{ width: 56, background: 'var(--red)' }} />
          <div className="cardhead">
            <div>
              <h4>Trigger Analysis</h4>
              <p className="sub sm">Behavioural conditions that shift your win rate.</p>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 20 }}>
            {triggerAnalysis.map((t, i) => {
              const tone = t.severity === 'danger' ? 'var(--red)' : t.severity === 'warning' ? 'var(--amber)' : 'var(--teal)';
              return (
                <div key={i} className="inset" style={{ position: 'relative', padding: '14px 16px' }}>
                  <span className="accent" style={{ position: 'absolute', left: 0, top: -1, width: 30, height: 3, background: tone }} />
                  <p className="lbl" style={{ color: tone }}>{t.pattern.toUpperCase()}</p>
                  <p style={{ margin: '8px 0 0', fontSize: 12.5, lineHeight: '19px', color: 'var(--text-2)' }}>{t.detail}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Cognitive Bias Detector ── */}
      {cognitiveBiases.length > 0 && (
        <div className="card">
          <span className="accent" style={{ width: 56, background: 'var(--amber)' }} />
          <div className="cardhead">
            <div>
              <h4>Cognitive Bias Detector</h4>
              <p className="sub sm">Patterns detected from your trade history.</p>
            </div>
            <Brain size={16} style={{ marginLeft: 'auto', color: 'var(--amber)' }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 20 }}>
            {cognitiveBiases.map((b, i) => {
              const tone = b.severity === 'danger' ? 'var(--red)' : b.severity === 'warning' ? 'var(--amber)' : 'var(--teal)';
              return (
                <div key={i} className="inset" style={{ position: 'relative', padding: '14px 16px' }}>
                  <span className="accent" style={{ position: 'absolute', left: 0, top: -1, width: 30, height: 3, background: tone }} />
                  <p className="lbl" style={{ color: tone }}>{b.name.toUpperCase()}</p>
                  <p style={{ margin: '8px 0 0', fontSize: 12.5, lineHeight: '19px', color: 'var(--text-2)' }}>{b.finding}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
