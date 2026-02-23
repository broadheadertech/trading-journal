'use client';

import { useState, useEffect } from 'react';
import { EmotionState, CircuitBreakerResult } from '@/lib/types';
import { getVisualFeedback, getEmotionRiskLevel } from '@/lib/discipline-engine';
import { AlertTriangle, ShieldAlert, CheckCircle, X } from 'lucide-react';
import { EMOTION_OPTIONS } from '@/lib/utils';

interface WarningModalProps {
  emotion: EmotionState;
  intensity: number;
  circuitBreakers: CircuitBreakerResult[];
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Large warning modal that requires multiple confirmations
 * for high-risk emotional states
 */
export function WarningModal({ emotion, intensity, circuitBreakers, onConfirm, onCancel }: WarningModalProps) {
  const [confirmCount, setConfirmCount] = useState(0);
  const risk = getEmotionRiskLevel(emotion);
  const blocks = circuitBreakers.filter(cb => cb.severity === 'block');
  const requiredConfirms = blocks.length > 0 ? 3 : risk === 'danger' ? 2 : 1;

  const emotionEmoji = EMOTION_OPTIONS.find(e => e.value === emotion)?.emoji ?? '';

  const handleConfirmClick = () => {
    const next = confirmCount + 1;
    if (next >= requiredConfirms) {
      onConfirm();
    } else {
      setConfirmCount(next);
    }
  };

  const confirmMessages = [
    'I understand the risks',
    'I accept responsibility for this trade',
    'I am overriding all warnings deliberately',
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 animate-in">
      <div className={`relative w-full max-w-lg mx-4 rounded-2xl border-2 p-6 space-y-5 ${
        blocks.length > 0
          ? 'border-red-500 bg-red-950/90 shadow-[0_0_60px_rgba(239,68,68,0.4)]'
          : risk === 'danger'
          ? 'border-red-500/60 bg-[var(--card)] shadow-[0_0_40px_rgba(239,68,68,0.2)]'
          : 'border-yellow-500/60 bg-[var(--card)] shadow-[0_0_30px_rgba(234,179,8,0.2)]'
      }`}>
        <button onClick={onCancel} className="absolute top-4 right-4 p-1 hover:bg-white/10 rounded-lg">
          <X size={18} />
        </button>

        {/* Icon and title */}
        <div className="text-center">
          {blocks.length > 0 ? (
            <ShieldAlert size={48} className="mx-auto text-red-400 animate-pulse mb-3" />
          ) : (
            <AlertTriangle size={48} className="mx-auto text-yellow-400 mb-3" />
          )}
          <h2 className="text-xl font-bold">
            {blocks.length > 0 ? 'CRITICAL WARNING' : 'Emotional Warning'}
          </h2>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">
            {emotionEmoji} You are currently feeling <strong className="text-[var(--foreground)]">{emotion}</strong> at intensity <strong className="text-[var(--foreground)]">{intensity}/10</strong>
          </p>
        </div>

        {/* Circuit breaker messages */}
        {circuitBreakers.length > 0 && (
          <div className="space-y-2">
            {circuitBreakers.map((cb, i) => (
              <div
                key={i}
                className={`p-3 rounded-lg border text-sm ${
                  cb.severity === 'block'
                    ? 'border-red-500/40 bg-red-500/10 text-red-300'
                    : 'border-yellow-500/40 bg-yellow-500/10 text-yellow-300'
                }`}
              >
                {cb.severity === 'block' ? '🛑' : '⚠️'} {cb.message}
              </div>
            ))}
          </div>
        )}

        {/* Confirmation progress */}
        <div className="space-y-3">
          <div className="flex gap-1">
            {Array.from({ length: requiredConfirms }).map((_, i) => (
              <div
                key={i}
                className={`h-1.5 flex-1 rounded-full transition-all ${
                  i < confirmCount ? 'bg-red-500' : 'bg-[var(--border)]'
                }`}
              />
            ))}
          </div>

          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="flex-1 py-3 text-sm bg-green-500/10 hover:bg-green-500/20 text-green-400 border border-green-500/30 rounded-xl font-medium transition-colors"
            >
              <CheckCircle size={16} className="inline mr-1" /> Step Away (Safe Choice)
            </button>
            <button
              onClick={handleConfirmClick}
              className={`flex-1 py-3 text-sm rounded-xl font-medium transition-all ${
                blocks.length > 0
                  ? 'bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/40'
                  : 'bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
              }`}
            >
              {confirmCount < requiredConfirms - 1
                ? confirmMessages[confirmCount] ?? 'Confirm'
                : 'Proceed Despite Warnings'
              }
              {requiredConfirms > 1 && (
                <span className="text-xs opacity-60 ml-1">
                  ({confirmCount + 1}/{requiredConfirms})
                </span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface FeedbackBorderProps {
  emotion: EmotionState;
  intensity: number;
  hasActiveBreakers: boolean;
  children: React.ReactNode;
}

/**
 * Wraps content with visual feedback borders based on emotional state
 */
export function FeedbackBorder({ emotion, intensity, hasActiveBreakers, children }: FeedbackBorderProps) {
  const feedback = getVisualFeedback(emotion, intensity, hasActiveBreakers);

  return (
    <div className={`rounded-xl border-2 transition-all duration-500 ${feedback.borderClass} ${feedback.bgClass} ${feedback.pulseClass}`}>
      {/* Status indicator bar */}
      <div className={`flex items-center gap-2 px-4 py-2 text-xs font-medium border-b ${
        feedback.level === 'critical' ? 'border-red-500/40 text-red-400 bg-red-500/10' :
        feedback.level === 'danger' ? 'border-red-500/20 text-red-400 bg-red-500/5' :
        feedback.level === 'caution' ? 'border-yellow-500/20 text-yellow-400 bg-yellow-500/5' :
        'border-green-500/20 text-green-400 bg-green-500/5'
      }`}>
        {feedback.level === 'critical' && <><ShieldAlert size={14} className="animate-pulse" /> CRITICAL: High emotional risk detected</>}
        {feedback.level === 'danger' && <><AlertTriangle size={14} /> WARNING: Dangerous emotional state</>}
        {feedback.level === 'caution' && <><AlertTriangle size={14} /> CAUTION: Elevated emotional state</>}
        {feedback.level === 'safe' && <><CheckCircle size={14} /> Clear: Emotional state is stable</>}
      </div>
      {children}
    </div>
  );
}

interface RedScreenProps {
  show: boolean;
  onDismiss: () => void;
}

/**
 * Full-screen red flash overlay for critical emotional states
 */
export function RedScreenOverlay({ show, onDismiss }: RedScreenProps) {
  const [opacity, setOpacity] = useState(0);

  useEffect(() => {
    if (show) {
      setOpacity(1);
      const timer = setTimeout(() => setOpacity(0), 2000);
      const dismiss = setTimeout(onDismiss, 2500);
      return () => { clearTimeout(timer); clearTimeout(dismiss); };
    }
  }, [show, onDismiss]);

  if (!show && opacity === 0) return null;

  return (
    <div
      className="fixed inset-0 z-[200] pointer-events-none flex items-center justify-center"
      style={{
        backgroundColor: `rgba(239, 68, 68, ${opacity * 0.15})`,
        transition: 'background-color 0.5s ease-out',
      }}
    >
      {opacity > 0.5 && (
        <div className="text-center animate-in">
          <ShieldAlert size={64} className="mx-auto text-red-500/60 mb-2" />
          <p className="text-red-400/80 text-lg font-bold">HIGH RISK DETECTED</p>
        </div>
      )}
    </div>
  );
}
