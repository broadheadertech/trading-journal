'use client';

import { useState, useMemo } from 'react';
import { Trade, EmotionState, CircuitBreakerResult, CircuitBreakerType, CircuitBreakerEvent, CooldownState } from '@/lib/types';
import { EMOTION_OPTIONS } from '@/lib/utils';
import { runAllCircuitBreakers, getEmotionWarning, generateEmotionCoachAdvice, getCooldownDuration } from '@/lib/emotional-engine';
import {
  Shield, Brain, CheckCircle, Warning,
  CaretRight, CaretLeft, Sparkle, Lock,
} from '@phosphor-icons/react';
import { Prohibit as XOctagon } from '@phosphor-icons/react';
import CooldownOverlay from './CooldownOverlay';

interface Props {
  trades: Trade[];
  activeCooldowns: CooldownState[];
  onComplete: (data: { emotion: EmotionState; intensity: number; reasoning: string }) => void;
  onCancel: () => void;
  onLogBreaker: (event: Omit<CircuitBreakerEvent, 'id' | 'triggeredAt' | 'overridden'>) => CircuitBreakerEvent;
  onOverrideBreaker: (eventId: string) => void;
  onStartCooldown: (type: CircuitBreakerType, durationMs: number, reason: string) => void;
  onClearCooldown: (type: CircuitBreakerType) => void;
}

const CHECKLIST_ITEMS = [
  'I have a clear entry and exit plan',
  'I\'ve checked support and resistance levels',
  'My position size follows my risk rules',
  'I\'m not chasing a move that already happened',
  'I can afford to lose this entire position',
  'I\'ve waited at least 5 minutes before deciding',
];

const EMOTION_RISK: Record<string, 'safe' | 'caution' | 'danger'> = {
  Calm: 'safe', Confident: 'safe', Neutral: 'safe',
  Excited: 'caution', Impatient: 'caution',
  Fearful: 'danger', FOMO: 'danger', Greedy: 'danger',
  'Revenge Trading': 'danger', Frustrated: 'danger',
  Anxious: 'danger', Overconfident: 'danger',
};

// ATLAS token per risk level — used for inline borders / accents.
const RISK_COLORS: Record<'safe' | 'caution' | 'danger', string> = {
  safe: 'var(--green)',
  caution: 'var(--amber)',
  danger: 'var(--red)',
};

export default function EmotionalCheckpoint({
  trades, activeCooldowns, onComplete, onCancel,
  onLogBreaker, onOverrideBreaker, onStartCooldown, onClearCooldown,
}: Props) {
  const [stage, setStage] = useState(0);
  const [emotion, setEmotion] = useState<EmotionState>('Neutral');
  const [intensity, setIntensity] = useState(5);
  const [checklist, setChecklist] = useState<boolean[]>(CHECKLIST_ITEMS.map(() => false));
  const [reasoning, setReasoning] = useState('');
  const [breakerResults, setBreakerResults] = useState<CircuitBreakerResult[]>([]);
  const [loggedBreakerIds, setLoggedBreakerIds] = useState<Map<CircuitBreakerType, string>>(new Map());
  const [aiAdvice, setAiAdvice] = useState('');
  const [showCooldown, setShowCooldown] = useState(false);
  const [activeCooldownType, setActiveCooldownType] = useState<CircuitBreakerType | null>(null);

  // Check if there's already an active cooldown
  const existingCooldown = activeCooldowns.length > 0 ? activeCooldowns[0] : null;

  const allChecked = checklist.every(Boolean);
  const reasoningValid = reasoning.length >= 100;

  const emotionWarning = useMemo(() => getEmotionWarning(trades, emotion), [trades, emotion]);

  const stageLabels = ['Emotional State', 'Pre-Trade Checklist', 'Self-Reflection', 'Analysis & Review'];

  const handleRunAnalysis = () => {
    const results = runAllCircuitBreakers(trades, emotion, intensity);
    setBreakerResults(results);
    const advice = generateEmotionCoachAdvice(trades, emotion, intensity, results);
    setAiAdvice(advice);

    // Log breaker events
    const newIds = new Map<CircuitBreakerType, string>();
    results.forEach(r => {
      const event = onLogBreaker({ type: r.type, severity: r.severity, message: r.message });
      newIds.set(r.type, event.id);
    });
    setLoggedBreakerIds(newIds);

    // Check if any blocks need cooldowns
    const blocks = results.filter(r => r.severity === 'block' && r.cooldownMs);
    if (blocks.length > 0) {
      const worst = blocks.reduce((a, b) => (a.cooldownMs ?? 0) > (b.cooldownMs ?? 0) ? a : b);
      onStartCooldown(worst.type, worst.cooldownMs!, worst.message);
      setActiveCooldownType(worst.type);
      setShowCooldown(true);
    }
  };

  const handleNext = () => {
    if (stage === 2) {
      // Moving to stage 3 (analysis) - run circuit breakers
      handleRunAnalysis();
    }
    setStage(prev => Math.min(prev + 1, 3));
  };

  const handleBack = () => setStage(prev => Math.max(prev - 1, 0));

  const handleProceed = () => {
    onComplete({ emotion, intensity, reasoning });
  };

  const handleProceedDespiteWarnings = () => {
    // Override all logged breakers
    loggedBreakerIds.forEach((eventId) => {
      onOverrideBreaker(eventId);
    });
    onComplete({ emotion, intensity, reasoning });
  };

  const handleCooldownExpired = () => {
    if (activeCooldownType) {
      onClearCooldown(activeCooldownType);
    }
    setShowCooldown(false);
    setActiveCooldownType(null);
  };

  const handleCooldownOverride = (acknowledgment: string) => {
    if (activeCooldownType) {
      onClearCooldown(activeCooldownType);
      // Override the logged breaker
      const eventId = loggedBreakerIds.get(activeCooldownType);
      if (eventId) onOverrideBreaker(eventId);
    }
    setShowCooldown(false);
    setActiveCooldownType(null);
  };

  const hasBlocks = breakerResults.some(r => r.severity === 'block');
  const hasWarnings = breakerResults.some(r => r.severity === 'warning');

  const canProceedStage = (s: number): boolean => {
    switch (s) {
      case 0: return true; // emotion always selected (default Neutral)
      case 1: return allChecked;
      case 2: return reasoningValid;
      case 3: return !showCooldown;
      default: return false;
    }
  };

  // If there's an existing cooldown from a previous session, show it
  if (existingCooldown && stage === 0) {
    return (
      <div style={{ display: 'grid', gap: 16 }}>
        <CooldownOverlay
          expiresAt={existingCooldown.expiresAt}
          breakerType={existingCooldown.type}
          reason={existingCooldown.reason}
          onExpired={() => onClearCooldown(existingCooldown.type)}
          onOverride={() => onClearCooldown(existingCooldown.type)}
        />
        <button onClick={onCancel} className="btn-g" style={{ width: '100%' }}>
          Cancel
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', gap: 22 }}>
      {/* Progress Steps */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {stageLabels.map((label, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
            <div
              style={{
                width: 24,
                height: 24,
                flex: 'none',
                borderRadius: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: 'var(--display)',
                fontWeight: 700,
                fontSize: 12,
                border: `1px solid ${i <= stage ? (i < stage ? 'var(--green)' : 'var(--amber)') : 'var(--line-2)'}`,
                background: i === stage ? 'var(--amber)' : 'transparent',
                color: i === stage ? 'var(--ink)' : i < stage ? 'var(--green)' : 'var(--muted-3)',
              }}
            >
              {i < stage ? <CheckCircle size={13} /> : i + 1}
            </div>
            <span
              className="lbl"
              style={{
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                color: i === stage ? 'var(--text)' : 'var(--muted-2)',
              }}
            >
              {label.toUpperCase()}
            </span>
            {i < stageLabels.length - 1 && <div style={{ flex: 1, height: 1, background: 'var(--line)' }} />}
          </div>
        ))}
      </div>

      {/* Stage 0: Emotional State */}
      {stage === 0 && (
        <div className="animate-in" style={{ display: 'grid', gap: 20 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Shield size={16} style={{ color: 'var(--amber)' }} />
              <h3 style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: 17, lineHeight: '18px', margin: 0, color: 'var(--text)' }}>
                How are you feeling right now?
              </h3>
            </div>
            <p style={{ margin: '10px 0 0', fontSize: 12.5, lineHeight: '19px', color: 'var(--muted)' }}>
              Be completely honest. This helps protect you from emotional decisions.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(96px,1fr))', gap: 8 }}>
            {EMOTION_OPTIONS.map(opt => {
              const risk = EMOTION_RISK[opt.value] || 'caution';
              const isSelected = emotion === opt.value;
              const c = RISK_COLORS[risk];
              return (
                <button
                  key={opt.value}
                  onClick={() => setEmotion(opt.value as EmotionState)}
                  style={{
                    padding: '12px 6px',
                    borderRadius: 2,
                    border: `1px solid ${isSelected ? c : 'var(--line)'}`,
                    background: isSelected ? 'var(--panel-2)' : 'transparent',
                    color: isSelected ? c : 'var(--muted)',
                    cursor: 'pointer',
                    transition: 'border-color .15s, color .15s',
                  }}
                >
                  <div style={{ fontSize: 18, lineHeight: '22px' }}>{opt.emoji}</div>
                  <div style={{ marginTop: 4, fontWeight: 700, fontSize: 9.5, letterSpacing: '.03em', textTransform: 'uppercase' }}>
                    {opt.label}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="inset" style={{ padding: '15px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <p className="lbl">INTENSITY</p>
              <span
                style={{
                  marginLeft: 'auto',
                  fontFamily: 'var(--mono)',
                  fontWeight: 500,
                  fontSize: 15,
                  color: intensity >= 7 ? 'var(--red)' : intensity >= 5 ? 'var(--amber)' : 'var(--green)',
                }}
              >
                {intensity}/10
              </span>
            </div>
            <input
              type="range"
              min="1"
              max="10"
              value={intensity}
              onChange={e => setIntensity(parseInt(e.target.value))}
              style={{ width: '100%', marginTop: 12, accentColor: 'var(--amber)' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: 10.5, color: 'var(--muted-2)' }}>
              <span>Mild</span>
              <span>Moderate</span>
              <span>Intense</span>
            </div>
          </div>

          {emotionWarning && (() => {
            const wc =
              emotionWarning.includes('drops') || emotionWarning.includes('loss') ? 'var(--red)' :
              emotionWarning.includes('well') ? 'var(--green)' : 'var(--amber)';
            return (
              <div
                className="inset"
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 12,
                  borderLeft: `3px solid ${wc}`,
                  padding: '13px 16px',
                  fontSize: 12.5,
                  lineHeight: '19px',
                  color: 'var(--text-2)',
                }}
              >
                <Brain size={14} style={{ color: wc, flex: 'none', marginTop: 2 }} />
                <span>{emotionWarning}</span>
              </div>
            );
          })()}
        </div>
      )}

      {/* Stage 1: Pre-Trade Checklist */}
      {stage === 1 && (
        <div className="animate-in" style={{ display: 'grid', gap: 20 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <CheckCircle size={16} style={{ color: 'var(--amber)' }} />
              <h3 style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: 17, lineHeight: '18px', margin: 0, color: 'var(--text)' }}>
                Pre-Trade Checklist
              </h3>
            </div>
            <p style={{ margin: '10px 0 0', fontSize: 12.5, lineHeight: '19px', color: 'var(--muted)' }}>
              All items must be checked before you can proceed.
            </p>
          </div>

          <div style={{ display: 'grid', gap: 8 }}>
            {CHECKLIST_ITEMS.map((item, i) => (
              <label
                key={i}
                className="inset"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  padding: '13px 16px',
                  cursor: 'pointer',
                  borderColor: checklist[i] ? 'var(--green)' : 'var(--line)',
                  transition: 'border-color .15s',
                }}
              >
                <input
                  type="checkbox"
                  checked={checklist[i]}
                  onChange={e => setChecklist(prev => prev.map((v, j) => j === i ? e.target.checked : v))}
                  style={{ width: 15, height: 15, flex: 'none', accentColor: 'var(--green)' }}
                />
                <span style={{ fontSize: 12.5, lineHeight: '18px', color: checklist[i] ? 'var(--text)' : 'var(--muted)' }}>
                  {item}
                </span>
              </label>
            ))}
          </div>

          {!allChecked && (
            <p style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8, fontSize: 11.5, color: 'var(--muted-2)' }}>
              <Lock size={12} /> Complete all items to proceed
            </p>
          )}
        </div>
      )}

      {/* Stage 2: Self-Reflection */}
      {stage === 2 && (
        <div className="animate-in" style={{ display: 'grid', gap: 20 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Brain size={16} style={{ color: 'var(--amber)' }} />
              <h3 style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: 17, lineHeight: '18px', margin: 0, color: 'var(--text)' }}>
                Self-Reflection
              </h3>
            </div>
            <p style={{ margin: '10px 0 0', fontSize: 12.5, lineHeight: '19px', color: 'var(--muted)' }}>
              Explain your trade thesis. Writing it down forces clarity and exposes weak reasoning.
            </p>
          </div>

          <div className="field">
            <label>WHY ARE YOU ENTERING THIS TRADE? WHAT&apos;S YOUR EDGE?</label>
            <textarea
              value={reasoning}
              onChange={e => setReasoning(e.target.value)}
              rows={5}
              placeholder="Describe your trade setup, the catalyst, your entry/exit plan, and why the risk/reward is favorable..."
              style={{
                width: '100%',
                border: '1px solid var(--line)',
                borderRadius: 2,
                background: 'var(--panel-2)',
                color: 'var(--text)',
                padding: '12px 16px',
                fontSize: 13,
                lineHeight: '20px',
                resize: 'vertical',
              }}
            />
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8, flexWrap: 'wrap' }}>
              <span
                style={{
                  fontFamily: 'var(--mono)',
                  fontSize: 11.5,
                  color: reasoningValid ? 'var(--green)' : 'var(--muted-2)',
                }}
              >
                {reasoning.length}/100 minimum characters
              </span>
              {!reasoningValid && (
                <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: 'var(--red)' }}>
                  <Lock size={10} /> {100 - reasoning.length} more characters needed
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Stage 3: Analysis & Review */}
      {stage === 3 && (
        <div className="animate-in" style={{ display: 'grid', gap: 16 }}>
          {showCooldown && activeCooldownType ? (
            <CooldownOverlay
              expiresAt={new Date(Date.now() + getCooldownDuration(activeCooldownType)).toISOString()}
              breakerType={activeCooldownType}
              reason={breakerResults.find(r => r.type === activeCooldownType)?.message || 'Cooldown active'}
              onExpired={handleCooldownExpired}
              onOverride={handleCooldownOverride}
            />
          ) : (
            <>
              {/* Circuit Breaker Results */}
              {breakerResults.length > 0 && (
                <div style={{ display: 'grid', gap: 8 }}>
                  <p className="lbl b10" style={{ marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Warning size={12} style={{ color: 'var(--amber)' }} />
                    CIRCUIT BREAKER RESULTS
                  </p>
                  {breakerResults.map((result, i) => {
                    const c = result.severity === 'block' ? 'var(--red)' : 'var(--amber)';
                    return (
                      <div
                        key={i}
                        className="inset"
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: 12,
                          borderLeft: `3px solid ${c}`,
                          padding: '13px 16px',
                          fontSize: 12.5,
                          lineHeight: '19px',
                          color: 'var(--text-2)',
                        }}
                      >
                        {result.severity === 'block'
                          ? <XOctagon size={14} style={{ color: c, flex: 'none', marginTop: 2 }} />
                          : <Warning size={14} style={{ color: c, flex: 'none', marginTop: 2 }} />
                        }
                        <span>{result.message}</span>
                      </div>
                    );
                  })}
                </div>
              )}

              {breakerResults.length === 0 && (
                <div
                  className="inset"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    borderLeft: '3px solid var(--green)',
                    padding: '13px 16px',
                    fontSize: 12.5,
                    color: 'var(--green)',
                  }}
                >
                  <CheckCircle size={14} style={{ flex: 'none' }} />
                  No circuit breakers triggered. You&apos;re clear to proceed.
                </div>
              )}

              {/* AI Coach */}
              <div className="card" style={{ padding: '19px 24px 22px' }}>
                <span className="accent" style={{ width: 44, background: 'var(--teal)' }} />
                <div className="cardhead" style={{ alignItems: 'center', gap: 10 }}>
                  <Sparkle size={14} style={{ color: 'var(--teal)' }} />
                  <h4>AI Emotion Coach</h4>
                </div>
                <p style={{ margin: '14px 0 0', fontSize: 13, lineHeight: '21px', color: 'var(--text-2)', whiteSpace: 'pre-line' }}>
                  {aiAdvice}
                </p>
              </div>

              {/* Summary */}
              <div className="inset" style={{ padding: '4px 16px 6px' }}>
                <div className="mrow">
                  <span className="lb" style={{ marginLeft: 0 }}>Emotion</span>
                  <span className="val">
                    {EMOTION_OPTIONS.find(e => e.value === emotion)?.emoji} {emotion} ({intensity}/10)
                  </span>
                </div>
                <div className="mrow">
                  <span className="lb" style={{ marginLeft: 0 }}>Checklist</span>
                  <span className="val" style={{ color: 'var(--green)' }}>All items confirmed</span>
                </div>
                <div className="mrow" style={{ alignItems: 'flex-start' }}>
                  <span className="lb" style={{ marginLeft: 0, flex: 'none' }}>Reasoning</span>
                  <span
                    style={{
                      marginLeft: 24,
                      textAlign: 'right',
                      fontSize: 12,
                      lineHeight: '18px',
                      color: 'var(--text)',
                    }}
                  >
                    {reasoning.slice(0, 80)}...
                  </span>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Navigation */}
      {!showCooldown && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            flexWrap: 'wrap',
            paddingTop: 18,
            borderTop: '1px solid var(--line)',
          }}
        >
          <div>
            {stage > 0 ? (
              <button onClick={handleBack} className="btn-g">
                <CaretLeft size={14} /> Back
              </button>
            ) : (
              <button onClick={onCancel} className="btn-g">
                Cancel
              </button>
            )}
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {stage < 3 ? (
              <button
                onClick={handleNext}
                disabled={!canProceedStage(stage)}
                className="btn-a"
                style={{ opacity: canProceedStage(stage) ? 1 : 0.5 }}
              >
                Next <CaretRight size={14} />
              </button>
            ) : (
              <>
                {hasBlocks && !showCooldown ? (
                  <button
                    onClick={handleProceedDespiteWarnings}
                    className="btn-a"
                    style={{ background: 'var(--red)', color: '#fff' }}
                  >
                    Proceed Despite Risks
                  </button>
                ) : hasWarnings ? (
                  <>
                    <button onClick={onCancel} className="btn-g">
                      Review &amp; Reconsider
                    </button>
                    <button onClick={handleProceedDespiteWarnings} className="btn-a">
                      Proceed with Caution
                    </button>
                  </>
                ) : (
                  <button
                    onClick={handleProceed}
                    className="btn-a"
                    style={{ background: 'var(--green)', color: 'var(--ink)' }}
                  >
                    <CheckCircle size={14} /> Proceed to Trade
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
