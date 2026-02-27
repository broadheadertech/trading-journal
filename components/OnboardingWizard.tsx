'use client';

import { useState } from 'react';
import { TrendingUp, BarChart3, DollarSign, Globe } from 'lucide-react';
import BrainMascot from './BrainMascot';

interface OnboardingWizardProps {
  onComplete: (data: { initialCapital: number; currency: string; primaryMarket: string }) => Promise<unknown>;
  onLogFirstTrade: () => void;
  onGoToDashboard: () => void;
}

const MARKETS = [
  { id: 'crypto', label: 'Crypto', icon: TrendingUp, desc: 'Bitcoin, Ethereum, altcoins' },
  { id: 'stocks', label: 'Stocks', icon: BarChart3, desc: 'Equities, ETFs, indices' },
  { id: 'forex', label: 'Forex', icon: DollarSign, desc: 'Currency pairs, FX markets' },
  { id: 'multi', label: 'Multiple', icon: Globe, desc: 'I trade across markets' },
] as const;

const CURRENCIES = ['USD', 'EUR', 'GBP', 'PHP', 'JPY', 'AUD'] as const;

// Story 6.6 — behavioral data collection disclosure (FR49)
// Legal/product: update the body text here for any regulatory or copy changes
export const BEHAVIORAL_DATA_DISCLOSURE = {
  title: 'About your Brain data',
  body: 'PsychSync analyzes your trading behavior — rule compliance, streaks, and discipline patterns — to power your Neuro Score, Brain stage, and coaching messages. This data is used only within your account and is never shared with third parties. You can delete your Brain data at any time from Settings.',
} as const;

export default function OnboardingWizard({ onComplete, onLogFirstTrade, onGoToDashboard }: OnboardingWizardProps) {
  const [step, setStep] = useState(0);
  const [market, setMarket] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [capital, setCapital] = useState('');
  const [busy, setBusy] = useState(false);

  const handleFinish = async (action: 'trade' | 'dashboard') => {
    setBusy(true);
    try {
      await onComplete({
        initialCapital: parseFloat(capital) || 0,
        currency,
        primaryMarket: market,
      });
      if (action === 'trade') onLogFirstTrade();
      else onGoToDashboard();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--background)] px-4">
      <div className="max-w-md w-full bg-[var(--card)] border border-[var(--border)] rounded-2xl p-8 space-y-6">
        {/* Progress dots */}
        <div className="flex justify-center gap-2">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === step ? 'w-6 bg-[var(--accent)]' : i < step ? 'w-1.5 bg-[var(--accent)]/50' : 'w-1.5 bg-[var(--muted)]'
              }`}
            />
          ))}
        </div>

        {/* Step 0: Welcome */}
        {step === 0 && (
          <div className="text-center space-y-4">
            <div className="mx-auto">
              <BrainMascot size={64} glow />
            </div>
            <div>
              <h2 className="text-xl font-bold text-[var(--foreground)]">Welcome to PsychSync!</h2>
              <p className="text-sm text-[var(--muted-foreground)] mt-2">
                Your AI-powered trading journal for better decisions. Let&apos;s set up your account in 30 seconds.
              </p>
            </div>
            <button
              onClick={() => setStep(1)}
              className="w-full py-3 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white rounded-xl font-medium transition-colors"
            >
              Get Started
            </button>
          </div>
        )}

        {/* Step 1: Market Selection */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="text-center">
              <h2 className="text-lg font-bold text-[var(--foreground)]">What do you trade?</h2>
              <p className="text-sm text-[var(--muted-foreground)] mt-1">
                We&apos;ll tailor your experience
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {MARKETS.map((m) => {
                const Icon = m.icon;
                const selected = market === m.id;
                return (
                  <button
                    key={m.id}
                    onClick={() => setMarket(m.id)}
                    className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-all ${
                      selected
                        ? 'border-[var(--accent)] bg-[var(--accent)]/10'
                        : 'border-[var(--border)] hover:border-[var(--accent)]/40'
                    }`}
                  >
                    <Icon size={24} className={selected ? 'text-[var(--accent)]' : 'text-[var(--muted-foreground)]'} />
                    <span className={`text-sm font-medium ${selected ? 'text-[var(--accent)]' : 'text-[var(--foreground)]'}`}>
                      {m.label}
                    </span>
                    <span className="text-[10px] text-[var(--muted-foreground)]">{m.desc}</span>
                  </button>
                );
              })}
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setStep(0)}
                className="flex-1 py-2.5 border border-[var(--border)] text-[var(--muted-foreground)] rounded-xl text-sm font-medium hover:bg-[var(--muted)] transition-colors"
              >
                Back
              </button>
              <button
                onClick={() => setStep(2)}
                disabled={!market}
                className="flex-1 py-2.5 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Capital & Currency */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="text-center">
              <h2 className="text-lg font-bold text-[var(--foreground)]">Set your starting capital</h2>
              <p className="text-sm text-[var(--muted-foreground)] mt-1">
                This helps track your portfolio growth
              </p>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-[var(--muted-foreground)] mb-1 block">Currency</label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--input-bg)] text-sm text-[var(--foreground)]"
                >
                  {CURRENCIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-[var(--muted-foreground)] mb-1 block">Starting Capital</label>
                <input
                  type="number"
                  placeholder="e.g. 10000"
                  value={capital}
                  onChange={(e) => setCapital(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--input-bg)] text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]"
                />
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setStep(1)}
                className="flex-1 py-2.5 border border-[var(--border)] text-[var(--muted-foreground)] rounded-xl text-sm font-medium hover:bg-[var(--muted)] transition-colors"
              >
                Back
              </button>
              <button
                onClick={() => setStep(3)}
                disabled={!capital || parseFloat(capital) <= 0}
                className="flex-1 py-2.5 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Ready */}
        {step === 3 && (
          <div className="text-center space-y-4">
            <div className="mx-auto">
              <BrainMascot size={56} glow />
            </div>
            <div>
              <h2 className="text-xl font-bold text-[var(--foreground)]">You&apos;re all set!</h2>
              <p className="text-sm text-[var(--muted-foreground)] mt-2">
                Start logging trades to unlock insights, analytics, and AI coaching.
              </p>
            </div>
            {/* Story 6.6 — behavioral data collection disclosure (FR49) */}
            <div className="text-left bg-[var(--muted)]/30 border border-[var(--border)] rounded-xl p-3 space-y-1">
              <p className="text-xs font-medium text-[var(--muted-foreground)]">
                {BEHAVIORAL_DATA_DISCLOSURE.title}
              </p>
              <p className="text-[11px] text-[var(--muted-foreground)]/80 leading-relaxed">
                {BEHAVIORAL_DATA_DISCLOSURE.body}
              </p>
            </div>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => handleFinish('trade')}
                disabled={busy}
                className="w-full py-3 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white rounded-xl font-medium transition-colors disabled:opacity-60"
              >
                {busy ? 'Setting up...' : 'Log First Trade'}
              </button>
              <button
                onClick={() => handleFinish('dashboard')}
                disabled={busy}
                className="w-full py-3 border border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] rounded-xl font-medium transition-colors disabled:opacity-60"
              >
                Go to Dashboard
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
