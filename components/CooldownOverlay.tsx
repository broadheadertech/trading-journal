'use client';

import { useState, useEffect, useRef } from 'react';
import { CircuitBreakerType } from '@/lib/types';
import { getReflectivePrompts } from '@/lib/emotional-engine';
import { Timer, Wind, AlertOctagon } from 'lucide-react';

interface Props {
  expiresAt: string;
  breakerType: CircuitBreakerType;
  reason: string;
  onExpired: () => void;
  onOverride: (acknowledgment: string) => void;
}

const BREATHING_PHASES = [
  { label: 'Breathe In', duration: 4000, scale: 1.5 },
  { label: 'Hold', duration: 4000, scale: 1.5 },
  { label: 'Breathe Out', duration: 4000, scale: 1 },
  { label: 'Hold', duration: 4000, scale: 1 },
];

export default function CooldownOverlay({ expiresAt, breakerType, reason, onExpired, onOverride }: Props) {
  const [remaining, setRemaining] = useState(0);
  const [promptIndex, setPromptIndex] = useState(0);
  const [breathPhase, setBreathPhase] = useState(0);
  const [showOverride, setShowOverride] = useState(false);
  const [acknowledgment, setAcknowledgment] = useState('');
  const breathRef = useRef<NodeJS.Timeout | null>(null);

  const prompts = getReflectivePrompts(breakerType);

  // Countdown timer
  useEffect(() => {
    const tick = () => {
      const now = Date.now();
      const expires = new Date(expiresAt).getTime();
      const diff = expires - now;
      if (diff <= 0) {
        setRemaining(0);
        onExpired();
      } else {
        setRemaining(diff);
      }
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [expiresAt, onExpired]);

  // Rotate prompts every 15s
  useEffect(() => {
    const interval = setInterval(() => {
      setPromptIndex(prev => (prev + 1) % prompts.length);
    }, 15000);
    return () => clearInterval(interval);
  }, [prompts.length]);

  // Breathing cycle
  useEffect(() => {
    let phaseIndex = 0;
    const advancePhase = () => {
      phaseIndex = (phaseIndex + 1) % BREATHING_PHASES.length;
      setBreathPhase(phaseIndex);
      breathRef.current = setTimeout(advancePhase, BREATHING_PHASES[phaseIndex].duration);
    };
    breathRef.current = setTimeout(advancePhase, BREATHING_PHASES[0].duration);
    return () => {
      if (breathRef.current) clearTimeout(breathRef.current);
    };
  }, []);

  const minutes = Math.floor(remaining / 60000);
  const seconds = Math.floor((remaining % 60000) / 1000);
  const totalMs = new Date(expiresAt).getTime() - (Date.now() - remaining + remaining);
  const initialTotal = new Date(expiresAt).getTime() - (new Date(expiresAt).getTime() - (remaining > 0 ? remaining : 1));
  const progress = remaining > 0 ? (remaining / (new Date(expiresAt).getTime() - (Date.now() - remaining))) : 0;

  // SVG circle progress
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - Math.min(progress, 1));

  const currentBreath = BREATHING_PHASES[breathPhase];

  return (
    <div style={{ display: 'grid', gap: 20 }}>
      {/* Header */}
      <div
        className="inset"
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 16,
          borderLeft: '3px solid var(--red)',
          padding: '16px 20px',
        }}
      >
        <AlertOctagon size={20} style={{ color: 'var(--red)', flex: 'none', marginTop: 2 }} />
        <div>
          <h4 style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: 15, lineHeight: '16px', margin: 0, color: 'var(--red)' }}>
            Cooldown Active
          </h4>
          <p style={{ margin: '9px 0 0', fontSize: 12.5, lineHeight: '19px', color: 'var(--muted)' }}>{reason}</p>
        </div>
      </div>

      {/* Timer Ring */}
      <div className="card" style={{ textAlign: 'center', padding: '30px 22px' }}>
        <span className="accent" style={{ width: 56, background: 'var(--red)' }} />
        <div style={{ position: 'relative', width: 176, height: 176, margin: '0 auto' }}>
          <svg width="100%" height="100%" viewBox="0 0 160 160" style={{ transform: 'rotate(-90deg)' }}>
            <circle cx="80" cy="80" r={radius} fill="none" stroke="var(--rail)" strokeWidth="4" />
            <circle
              cx="80"
              cy="80"
              r={radius}
              fill="none"
              stroke="var(--red)"
              strokeWidth="4"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              className="transition-all duration-1000"
            />
          </svg>
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 4,
            }}
          >
            <Timer size={16} style={{ color: 'var(--muted-2)' }} />
            <span style={{ fontFamily: 'var(--mono)', fontWeight: 500, fontSize: 34, lineHeight: '40px', color: 'var(--text)' }}>
              {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
            </span>
            <span className="lbl">REMAINING</span>
          </div>
        </div>
      </div>

      {/* Breathing Exercise */}
      <div className="card" style={{ padding: '19px 28px 28px' }}>
        <div className="cardhead" style={{ alignItems: 'center', gap: 10, justifyContent: 'center' }}>
          <Wind size={14} style={{ color: 'var(--teal)' }} />
          <h4>Breathing Exercise</h4>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18, marginTop: 26 }}>
          <div
            style={{
              width: 76,
              height: 76,
              borderRadius: 3,
              background: 'rgba(47,211,196,.10)',
              border: '1px solid var(--teal)',
              transition: 'transform 4000ms ease-in-out',
              transform: `scale(${currentBreath.scale})`,
            }}
          />
          <span style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: 16, color: 'var(--teal)' }}>
            {currentBreath.label}
          </span>
          <p style={{ margin: 0, fontSize: 11.5, lineHeight: '18px', color: 'var(--muted-2)', textAlign: 'center' }}>
            Follow the square. Breathe in as it expands, out as it contracts.
          </p>
        </div>
      </div>

      {/* Reflective Prompt */}
      <div className="inset" style={{ padding: '20px 24px', textAlign: 'center' }}>
        <p style={{ margin: 0, fontStyle: 'italic', fontSize: 13.5, lineHeight: '21px', color: 'var(--text-2)' }}>
          &ldquo;{prompts[promptIndex]}&rdquo;
        </p>
      </div>

      {/* Override Section */}
      <div style={{ borderTop: '1px solid var(--line)', paddingTop: 18 }}>
        {!showOverride ? (
          <button
            onClick={() => setShowOverride(true)}
            className="ghostbtn"
            style={{ marginTop: 0, width: '100%', fontSize: 12.5, color: 'var(--muted)' }}
          >
            I understand the risks and want to override this cooldown
          </button>
        ) : (
          <div style={{ display: 'grid', gap: 14 }} className="animate-in">
            <p style={{ margin: 0, fontSize: 12, lineHeight: '18px', color: 'var(--red)' }}>
              Explain why you believe this trade is justified despite the warning (min 50 characters):
            </p>
            <textarea
              value={acknowledgment}
              onChange={e => setAcknowledgment(e.target.value)}
              rows={3}
              placeholder="I am overriding this because..."
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
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <span
                style={{
                  fontFamily: 'var(--mono)',
                  fontSize: 11.5,
                  color: acknowledgment.length >= 50 ? 'var(--green)' : 'var(--muted-2)',
                }}
              >
                {acknowledgment.length}/50 characters
              </span>
              <div style={{ marginLeft: 'auto', display: 'flex', gap: 10 }}>
                <button
                  onClick={() => { setShowOverride(false); setAcknowledgment(''); }}
                  className="btn-g"
                  style={{ height: 32, padding: '0 16px', fontSize: 12 }}
                >
                  Cancel
                </button>
                <button
                  onClick={() => onOverride(acknowledgment)}
                  disabled={acknowledgment.length < 50}
                  className="btn-a"
                  style={{
                    height: 32,
                    padding: '0 16px',
                    fontSize: 12,
                    background: 'var(--red)',
                    color: '#fff',
                    opacity: acknowledgment.length < 50 ? 0.5 : 1,
                  }}
                >
                  Override Cooldown
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
