'use client';

import { useState, useMemo } from 'react';
import { Trade, EmotionState, CircuitBreakerResult, CircuitBreakerType, CircuitBreakerEvent, CooldownState } from '@/lib/types';
import { EMOTION_OPTIONS } from '@/lib/utils';
import { runAllCircuitBreakers, getEmotionWarning, generateEmotionCoachAdvice, getCooldownDuration } from '@/lib/emotional-engine';
import {
  Shield, Brain, CheckCircle, AlertTriangle, XOctagon,
  ChevronRight, ChevronLeft, Sparkles, Lock,
} from 'lucide-react';
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

const RISK_COLORS = {
  safe: 'border-[var(--green)] bg-green-500/10 text-[var(--green)]',
  caution: 'border-[var(--yellow)] bg-yellow-500/10 text-[var(--yellow)]',
  danger: 'border-[var(--red)] bg-red-500/10 text-[var(--red)]',
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
      <div className="space-y-4">
        <CooldownOverlay
          expiresAt={existingCooldown.expiresAt}
          breakerType={existingCooldown.type}
          reason={existingCooldown.reason}
          onExpired={() => onClearCooldown(existingCooldown.type)}
          onOverride={() => onClearCooldown(existingCooldown.type)}
        />
        <button onClick={onCancel} className="w-full py-2 text-sm text-[var(--muted-foreground)] hover:bg-[var(--muted)] rounded-lg">
          Cancel
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Progress Steps */}
      <div className="flex items-center gap-1 sm:gap-2">
        {stageLabels.map((label, i) => (
          <div key={i} className="flex items-center gap-1 sm:gap-2 flex-1">
            <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-colors ${
              i < stage ? 'bg-[var(--green)] text-white' :
              i === stage ? 'bg-[var(--accent)] text-white' :
              'bg-[var(--muted)] text-[var(--muted-foreground)]'
            }`}>
              {i < stage ? <CheckCircle size={14} /> : i + 1}
            </div>
            <span className="text-[10px] sm:text-xs text-[var(--muted-foreground)] hidden sm:block truncate">{label}</span>
            {i < stageLabels.length - 1 && <div className="flex-1 h-px bg-[var(--border)]" />}
          </div>
        ))}
      </div>

      {/* Stage 0: Emotional State */}
      {stage === 0 && (
        <div className="space-y-4 animate-in">
          <div className="flex items-center gap-2 mb-1">
            <Shield size={18} className="text-[var(--accent)]" />
            <h3 className="font-semibold">How are you feeling right now?</h3>
          </div>
          <p className="text-sm text-[var(--muted-foreground)]">Be completely honest. This helps protect you from emotional decisions.</p>

          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {EMOTION_OPTIONS.map(opt => {
              const risk = EMOTION_RISK[opt.value] || 'caution';
              const isSelected = emotion === opt.value;
              return (
                <button
                  key={opt.value}
                  onClick={() => setEmotion(opt.value as EmotionState)}
                  className={`py-2.5 sm:py-3 text-xs sm:text-sm rounded-xl border-2 transition-all ${
                    isSelected ? RISK_COLORS[risk] : 'border-[var(--border)] text-[var(--muted-foreground)] hover:border-[var(--accent)]/50'
                  }`}
                >
                  <div className="text-lg sm:text-xl mb-0.5">{opt.emoji}</div>
                  <div className="text-[10px] sm:text-xs">{opt.label}</div>
                </button>
              );
            })}
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Intensity: <span className={`font-bold ${intensity >= 7 ? 'text-[var(--red)]' : intensity >= 5 ? 'text-[var(--yellow)]' : 'text-[var(--green)]'}`}>{intensity}/10</span>
            </label>
            <input
              type="range"
              min="1"
              max="10"
              value={intensity}
              onChange={e => setIntensity(parseInt(e.target.value))}
              className="w-full accent-[var(--accent)]"
            />
            <div className="flex justify-between text-xs text-[var(--muted-foreground)]">
              <span>Mild</span>
              <span>Moderate</span>
              <span>Intense</span>
            </div>
          </div>

          {emotionWarning && (
            <div className={`p-3 rounded-xl border text-sm ${
              emotionWarning.includes('drops') || emotionWarning.includes('loss')
                ? 'bg-red-500/10 border-red-500/20 text-[var(--red)]'
                : emotionWarning.includes('well')
                  ? 'bg-green-500/10 border-green-500/20 text-[var(--green)]'
                  : 'bg-yellow-500/10 border-yellow-500/20 text-[var(--yellow)]'
            }`}>
              <div className="flex items-start gap-2">
                <Brain size={16} className="shrink-0 mt-0.5" />
                <span>{emotionWarning}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Stage 1: Pre-Trade Checklist */}
      {stage === 1 && (
        <div className="space-y-4 animate-in">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle size={18} className="text-[var(--accent)]" />
            <h3 className="font-semibold">Pre-Trade Checklist</h3>
          </div>
          <p className="text-sm text-[var(--muted-foreground)]">All items must be checked before you can proceed.</p>

          <div className="space-y-2">
            {CHECKLIST_ITEMS.map((item, i) => (
              <label
                key={i}
                className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                  checklist[i]
                    ? 'border-[var(--green)] bg-green-500/5'
                    : 'border-[var(--border)] hover:border-[var(--accent)]/50'
                }`}
              >
                <input
                  type="checkbox"
                  checked={checklist[i]}
                  onChange={e => setChecklist(prev => prev.map((v, j) => j === i ? e.target.checked : v))}
                  className="w-5 h-5 rounded accent-[var(--green)] shrink-0"
                />
                <span className={`text-sm ${checklist[i] ? 'text-[var(--foreground)]' : 'text-[var(--muted-foreground)]'}`}>
                  {item}
                </span>
              </label>
            ))}
          </div>

          {!allChecked && (
            <p className="text-xs text-[var(--muted-foreground)] flex items-center gap-1.5">
              <Lock size={12} /> Complete all items to proceed
            </p>
          )}
        </div>
      )}

      {/* Stage 2: Self-Reflection */}
      {stage === 2 && (
        <div className="space-y-4 animate-in">
          <div className="flex items-center gap-2 mb-1">
            <Brain size={18} className="text-[var(--accent)]" />
            <h3 className="font-semibold">Self-Reflection</h3>
          </div>
          <p className="text-sm text-[var(--muted-foreground)]">
            Explain your trade thesis. Writing it down forces clarity and exposes weak reasoning.
          </p>

          <div>
            <label className="block text-sm font-medium mb-1">
              Why are you entering this trade? What&apos;s your edge?
            </label>
            <textarea
              value={reasoning}
              onChange={e => setReasoning(e.target.value)}
              rows={5}
              placeholder="Describe your trade setup, the catalyst, your entry/exit plan, and why the risk/reward is favorable..."
              className="text-sm"
            />
            <div className="flex items-center justify-between mt-1">
              <span className={`text-xs ${reasoningValid ? 'text-[var(--green)]' : 'text-[var(--muted-foreground)]'}`}>
                {reasoning.length}/100 minimum characters
              </span>
              {!reasoningValid && (
                <span className="text-xs text-[var(--red)] flex items-center gap-1">
                  <Lock size={10} /> {100 - reasoning.length} more characters needed
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Stage 3: Analysis & Review */}
      {stage === 3 && (
        <div className="space-y-4 animate-in">
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
                <div className="space-y-2">
                  <h4 className="text-sm font-medium flex items-center gap-2">
                    <AlertTriangle size={16} className="text-[var(--yellow)]" />
                    Circuit Breaker Results
                  </h4>
                  {breakerResults.map((result, i) => (
                    <div
                      key={i}
                      className={`p-3 rounded-xl border text-sm flex items-start gap-2 ${
                        result.severity === 'block'
                          ? 'bg-red-500/10 border-red-500/20'
                          : 'bg-yellow-500/10 border-yellow-500/20'
                      }`}
                    >
                      {result.severity === 'block'
                        ? <XOctagon size={16} className="text-[var(--red)] shrink-0 mt-0.5" />
                        : <AlertTriangle size={16} className="text-[var(--yellow)] shrink-0 mt-0.5" />
                      }
                      <span>{result.message}</span>
                    </div>
                  ))}
                </div>
              )}

              {breakerResults.length === 0 && (
                <div className="p-3 rounded-xl border border-green-500/20 bg-green-500/10 text-sm flex items-center gap-2 text-[var(--green)]">
                  <CheckCircle size={16} />
                  No circuit breakers triggered. You&apos;re clear to proceed.
                </div>
              )}

              {/* AI Coach */}
              <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Sparkles size={16} className="text-[var(--purple)]" />
                  <span className="text-sm font-medium">AI Emotion Coach</span>
                </div>
                <p className="text-sm text-[var(--foreground)] whitespace-pre-line leading-relaxed">{aiAdvice}</p>
              </div>

              {/* Summary */}
              <div className="bg-[var(--muted)]/50 rounded-xl p-4 space-y-2 text-sm">
                <div className="flex items-center gap-2 text-[var(--muted-foreground)]">
                  <span>Emotion:</span>
                  <span className="font-medium text-[var(--foreground)]">
                    {EMOTION_OPTIONS.find(e => e.value === emotion)?.emoji} {emotion} ({intensity}/10)
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[var(--muted-foreground)]">
                  <span>Checklist:</span>
                  <span className="text-[var(--green)]">All items confirmed</span>
                </div>
                <div className="text-[var(--muted-foreground)]">
                  <span>Reasoning: </span>
                  <span className="text-[var(--foreground)]">{reasoning.slice(0, 80)}...</span>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Navigation */}
      {!showCooldown && (
        <div className="flex items-center justify-between pt-3 border-t border-[var(--border)]">
          <div>
            {stage > 0 ? (
              <button
                onClick={handleBack}
                className="flex items-center gap-1 px-3 py-2 text-sm text-[var(--muted-foreground)] hover:bg-[var(--muted)] rounded-lg"
              >
                <ChevronLeft size={16} /> Back
              </button>
            ) : (
              <button
                onClick={onCancel}
                className="px-3 py-2 text-sm text-[var(--muted-foreground)] hover:bg-[var(--muted)] rounded-lg"
              >
                Cancel
              </button>
            )}
          </div>
          <div className="flex gap-2">
            {stage < 3 ? (
              <button
                onClick={handleNext}
                disabled={!canProceedStage(stage)}
                className="flex items-center gap-1 px-5 py-2 text-sm bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                Next <ChevronRight size={16} />
              </button>
            ) : (
              <>
                {hasBlocks && !showCooldown ? (
                  <button
                    onClick={handleProceedDespiteWarnings}
                    className="px-4 py-2 text-sm bg-[var(--red)] hover:bg-red-600 text-white rounded-lg font-medium"
                  >
                    Proceed Despite Risks
                  </button>
                ) : hasWarnings ? (
                  <>
                    <button
                      onClick={onCancel}
                      className="px-4 py-2 text-sm border border-[var(--border)] rounded-lg hover:bg-[var(--muted)]"
                    >
                      Review & Reconsider
                    </button>
                    <button
                      onClick={handleProceedDespiteWarnings}
                      className="px-4 py-2 text-sm bg-[var(--yellow)] hover:bg-yellow-600 text-black rounded-lg font-medium"
                    >
                      Proceed with Caution
                    </button>
                  </>
                ) : (
                  <button
                    onClick={handleProceed}
                    className="flex items-center gap-2 px-5 py-2 text-sm bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white rounded-lg font-medium"
                  >
                    <CheckCircle size={16} /> Proceed to Trade
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
