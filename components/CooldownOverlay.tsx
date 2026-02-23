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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
        <AlertOctagon size={24} className="text-[var(--red)] shrink-0" />
        <div>
          <h3 className="font-bold text-[var(--red)]">Cooldown Active</h3>
          <p className="text-sm text-[var(--muted-foreground)]">{reason}</p>
        </div>
      </div>

      {/* Timer Circle */}
      <div className="flex justify-center">
        <div className="relative w-44 h-44">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 160 160">
            <circle cx="80" cy="80" r={radius} fill="none" stroke="var(--border)" strokeWidth="6" />
            <circle
              cx="80"
              cy="80"
              r={radius}
              fill="none"
              stroke="var(--red)"
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              className="transition-all duration-1000"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <Timer size={20} className="text-[var(--muted-foreground)] mb-1" />
            <span className="text-3xl font-bold font-mono">
              {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
            </span>
            <span className="text-xs text-[var(--muted-foreground)]">remaining</span>
          </div>
        </div>
      </div>

      {/* Breathing Exercise */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4 justify-center">
          <Wind size={16} className="text-[var(--accent)]" />
          <span className="text-sm font-medium">Breathing Exercise</span>
        </div>
        <div className="flex flex-col items-center gap-4">
          <div
            className="w-20 h-20 rounded-full bg-[var(--accent)]/20 border-2 border-[var(--accent)] transition-transform duration-[4000ms] ease-in-out"
            style={{ transform: `scale(${currentBreath.scale})` }}
          />
          <span className="text-lg font-medium text-[var(--accent)]">{currentBreath.label}</span>
          <p className="text-xs text-[var(--muted-foreground)] text-center">
            Follow the circle. Breathe in as it expands, out as it contracts.
          </p>
        </div>
      </div>

      {/* Reflective Prompt */}
      <div className="bg-[var(--muted)]/50 border border-[var(--border)] rounded-xl p-5 text-center">
        <p className="text-sm italic text-[var(--foreground)] leading-relaxed">
          &ldquo;{prompts[promptIndex]}&rdquo;
        </p>
      </div>

      {/* Override Section */}
      <div className="border-t border-[var(--border)] pt-4">
        {!showOverride ? (
          <button
            onClick={() => setShowOverride(true)}
            className="w-full text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors py-2"
          >
            I understand the risks and want to override this cooldown...
          </button>
        ) : (
          <div className="space-y-3 animate-in">
            <p className="text-xs text-[var(--red)]">
              Explain why you believe this trade is justified despite the warning (min 50 characters):
            </p>
            <textarea
              value={acknowledgment}
              onChange={e => setAcknowledgment(e.target.value)}
              rows={3}
              placeholder="I am overriding this because..."
              className="text-sm"
            />
            <div className="flex items-center justify-between">
              <span className="text-xs text-[var(--muted-foreground)]">
                {acknowledgment.length}/50 characters
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => { setShowOverride(false); setAcknowledgment(''); }}
                  className="px-3 py-1.5 text-xs rounded-lg hover:bg-[var(--muted)]"
                >
                  Cancel
                </button>
                <button
                  onClick={() => onOverride(acknowledgment)}
                  disabled={acknowledgment.length < 50}
                  className="px-3 py-1.5 text-xs bg-[var(--red)] text-white rounded-lg disabled:opacity-50"
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
