'use client';

import { useState, useEffect } from 'react';
import { EmotionState, CircuitBreakerResult } from '@/lib/types';
import { getVisualFeedback, getEmotionRiskLevel } from '@/lib/discipline-engine';
import { Warning as AlertTriangle, ShieldWarning as ShieldAlert, CheckCircle, X } from '@phosphor-icons/react';
import { EMOTION_OPTIONS } from '@/lib/utils';

/* ── ATLAS raw tokens ────────────────────────────────────────────────────────
   Everything in this file is a full-viewport overlay (or wraps one), so it can
   render outside the `.atlas-dash` scope. All ATLAS values are inlined.       */
const T = {
  amber: '#d99405',
  green: '#24c88a',
  red: '#ff4d5e',
  ink: '#0a0a0a',
  bg: '#05080d',
  panel: '#0a0f17',
  panel2: '#0c1119',
  line: '#182432',
  line2: '#24344a',
  rail: '#141e2a',
  text: '#edf2f7',
  text2: '#9fb0c2',
  muted: '#7f8ea3',
  muted2: '#5c6b7e',
  display: "'Archivo', system-ui, sans-serif",
  mono: "'Geist Mono', ui-monospace, monospace",
};

const LABEL: React.CSSProperties = {
  fontWeight: 700,
  fontSize: 9,
  letterSpacing: '.04em',
  color: T.muted2,
  margin: 0,
  textTransform: 'uppercase',
};

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

  const critical = blocks.length > 0;
  const accent = critical || risk === 'danger' ? T.red : T.amber;

  const corner: React.CSSProperties = { position: 'absolute', width: 16, height: 16, border: `1px solid ${T.line2}` };

  return (
    <div
      className="animate-in"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        background: 'rgba(0,0,0,.8)',
      }}
    >
      <div
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: 560,
          maxHeight: '90vh',
          overflowY: 'auto',
          border: `1px solid ${critical ? accent : T.line2}`,
          borderRadius: 2,
          background: '#080d14',
          padding: '32px 28px 28px',
          textAlign: 'center',
        }}
      >
        <span style={{ position: 'absolute', left: 0, top: -1, width: 120, height: 3, background: accent }} />
        <span style={{ ...corner, left: -1, top: -1, borderRight: 0, borderBottom: 0 }} />
        <span style={{ ...corner, right: -1, bottom: -1, borderLeft: 0, borderTop: 0 }} />

        <button
          onClick={onCancel}
          aria-label="Close"
          style={{
            position: 'absolute',
            top: 16,
            right: 16,
            width: 26,
            height: 26,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: `1px solid ${T.line}`,
            borderRadius: 2,
            color: T.muted,
            background: 'none',
            cursor: 'pointer',
          }}
        >
          <X size={14} />
        </button>

        {/* Icon and title */}
        <div>
          <div
            style={{
              width: 52,
              height: 52,
              margin: '0 auto 24px',
              borderRadius: 3,
              border: `1px solid ${accent}`,
              background: T.panel2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {critical
              ? <ShieldAlert size={24} className="animate-pulse" style={{ color: accent }} />
              : <AlertTriangle size={24} style={{ color: accent }} />}
          </div>
          <h2 style={{ fontFamily: T.display, fontWeight: 700, fontSize: 28, lineHeight: '31px', margin: 0, color: T.text }}>
            {critical ? 'Critical Warning' : 'Emotional Warning'}
          </h2>
          <p style={{ margin: '14px 0 0', fontSize: 13.5, lineHeight: '21px', color: T.muted }}>
            {emotionEmoji} You are currently feeling{' '}
            <strong style={{ color: T.text, fontWeight: 700 }}>{emotion}</strong> at intensity{' '}
            <strong style={{ fontFamily: T.mono, fontWeight: 500, color: accent }}>{intensity}/10</strong>
          </p>
        </div>

        {/* Circuit breaker messages */}
        {circuitBreakers.length > 0 && (
          <div style={{ display: 'grid', gap: 8, marginTop: 26, textAlign: 'left' }}>
            {circuitBreakers.map((cb, i) => {
              const c = cb.severity === 'block' ? T.red : T.amber;
              return (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 12,
                    border: `1px solid ${T.line}`,
                    borderLeft: `3px solid ${c}`,
                    borderRadius: 2,
                    background: T.panel2,
                    padding: '12px 16px',
                    fontSize: 12.5,
                    lineHeight: '19px',
                    color: T.text2,
                  }}
                >
                  {cb.severity === 'block'
                    ? <ShieldAlert size={14} style={{ color: c, flex: 'none', marginTop: 2 }} />
                    : <AlertTriangle size={14} style={{ color: c, flex: 'none', marginTop: 2 }} />}
                  <span>{cb.message}</span>
                </div>
              );
            })}
          </div>
        )}

        {/* Confirmation progress */}
        <div style={{ marginTop: 28, textAlign: 'left' }}>
          <p style={LABEL}>
            CONFIRMATIONS · {Math.min(confirmCount, requiredConfirms)}/{requiredConfirms}
          </p>
          <div style={{ display: 'flex', gap: 4, marginTop: 10 }}>
            {Array.from({ length: requiredConfirms }).map((_, i) => (
              <div
                key={i}
                style={{
                  flex: 1,
                  height: 2,
                  background: i < confirmCount ? T.red : T.rail,
                  transition: 'background .2s',
                }}
              />
            ))}
          </div>

          <div style={{ display: 'flex', gap: 12, marginTop: 22, flexWrap: 'wrap' }}>
            <button
              onClick={onCancel}
              style={{
                flex: '1 1 200px',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 9,
                height: 44,
                padding: '0 20px',
                borderRadius: 2,
                border: `1px solid ${T.green}`,
                background: 'none',
                color: T.green,
                fontWeight: 700,
                fontSize: 13,
                cursor: 'pointer',
              }}
            >
              <CheckCircle size={14} /> Step Away (Safe Choice)
            </button>
            <button
              onClick={handleConfirmClick}
              style={{
                flex: '1 1 200px',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                height: 44,
                padding: '0 20px',
                borderRadius: 2,
                border: `1px solid ${accent}`,
                background: 'none',
                color: accent,
                fontWeight: 700,
                fontSize: 13,
                cursor: 'pointer',
              }}
            >
              {confirmCount < requiredConfirms - 1
                ? confirmMessages[confirmCount] ?? 'Confirm'
                : 'Proceed Despite Warnings'
              }
              {requiredConfirms > 1 && (
                <span style={{ fontFamily: T.mono, fontWeight: 500, fontSize: 11, opacity: 0.6 }}>
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

  const barColor =
    feedback.level === 'critical' || feedback.level === 'danger' ? T.red :
    feedback.level === 'caution' ? T.amber : T.green;

  return (
    <div style={{ border: `1px solid ${T.line}`, borderTop: `3px solid ${barColor}`, borderRadius: 2, background: T.panel }}>
      {/* Status indicator bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 9,
          padding: '11px 18px',
          borderBottom: `1px solid ${T.line}`,
          background: T.panel2,
          fontWeight: 700,
          fontSize: 10,
          letterSpacing: '.04em',
          textTransform: 'uppercase',
          color: barColor,
        }}
      >
        {feedback.level === 'critical' && <><ShieldAlert size={13} className="animate-pulse" /> Critical: High emotional risk detected</>}
        {feedback.level === 'danger' && <><AlertTriangle size={13} /> Warning: Dangerous emotional state</>}
        {feedback.level === 'caution' && <><AlertTriangle size={13} /> Caution: Elevated emotional state</>}
        {feedback.level === 'safe' && <><CheckCircle size={13} /> Clear: Emotional state is stable</>}
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
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 200,
        pointerEvents: 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: `rgba(255, 77, 94, ${opacity * 0.14})`,
        transition: 'background-color 0.5s ease-out',
      }}
    >
      {opacity > 0.5 && (
        <div className="animate-in" style={{ textAlign: 'center' }}>
          <div
            style={{
              width: 52,
              height: 52,
              margin: '0 auto 20px',
              borderRadius: 3,
              border: `1px solid ${T.red}`,
              background: 'rgba(10,15,23,.85)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ShieldAlert size={24} style={{ color: T.red }} />
          </div>
          <p
            style={{
              margin: 0,
              fontFamily: T.display,
              fontWeight: 700,
              fontSize: 20,
              letterSpacing: '.04em',
              color: T.red,
            }}
          >
            HIGH RISK DETECTED
          </p>
        </div>
      )}
    </div>
  );
}
