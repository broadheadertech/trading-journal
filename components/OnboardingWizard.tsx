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
  body: 'Atlas analyzes your trading behavior — rule compliance, streaks, and discipline patterns — to power your Neuro Score, Brain stage, and coaching messages. This data is used only within your account and is never shared with third parties. You can delete your Brain data at any time from Settings.',
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
    <div className="atlas-dash min-h-screen flex items-center justify-center px-4 py-10">
      <div className="modal w-full" style={{ maxWidth: 520 }}>
        <span className="accent" />
        <span className="corner" style={{ left: 0, top: 0, borderRight: 0, borderBottom: 0 }} />
        <span className="corner" style={{ right: 0, top: 0, borderLeft: 0, borderBottom: 0 }} />
        <span className="corner" style={{ left: 0, bottom: 0, borderRight: 0, borderTop: 0 }} />
        <span className="corner" style={{ right: 0, bottom: 0, borderLeft: 0, borderTop: 0 }} />

        {/* Progress rail */}
        <div className="flex justify-center items-center gap-2" style={{ marginBottom: 6 }}>
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              style={{
                height: 3,
                width: i === step ? 34 : 14,
                borderRadius: 2,
                background: i <= step ? 'var(--amber)' : 'var(--line-2)',
                opacity: i < step ? 0.55 : 1,
                transition: 'width .3s',
              }}
            />
          ))}
        </div>
        <p className="lbl" style={{ marginTop: 12 }}>STEP {step + 1} OF 4</p>

        {/* Step 0: Welcome */}
        {step === 0 && (
          <div style={{ marginTop: 22 }}>
            <div className="flex justify-center">
              <BrainMascot size={64} glow />
            </div>
            <h2 style={{ marginTop: 20 }}>Welcome to Atlas!</h2>
            <p className="sub">
              Your AI-powered trading journal for better decisions. Let&apos;s set up your account in 30 seconds.
            </p>
            <button
              onClick={() => setStep(1)}
              className="btn-a"
              style={{ width: '100%', height: 44, marginTop: 28 }}
            >
              Get Started
            </button>
          </div>
        )}

        {/* Step 1: Market Selection */}
        {step === 1 && (
          <div style={{ marginTop: 22 }}>
            <h2 style={{ fontSize: 24, lineHeight: '28px' }}>What do you trade?</h2>
            <p className="sub">We&apos;ll tailor your experience</p>

            <div className="grid grid-cols-2 gap-3" style={{ marginTop: 24, textAlign: 'left' }}>
              {MARKETS.map((m) => {
                const Icon = m.icon;
                const selected = market === m.id;
                return (
                  <button
                    key={m.id}
                    onClick={() => setMarket(m.id)}
                    className="inset"
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'flex-start',
                      gap: 8,
                      padding: '16px 16px 14px',
                      borderColor: selected ? 'var(--amber)' : 'var(--line)',
                      background: selected ? '#14100a' : 'var(--panel-2)',
                    }}
                  >
                    <Icon size={20} style={{ color: selected ? 'var(--amber)' : 'var(--muted-2)' }} />
                    <span
                      style={{
                        fontFamily: 'var(--display)',
                        fontWeight: 700,
                        fontSize: 14,
                        color: selected ? 'var(--amber)' : 'var(--text)',
                      }}
                    >
                      {m.label}
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--muted-2)', lineHeight: '15px' }}>{m.desc}</span>
                  </button>
                );
              })}
            </div>

            <div className="flex gap-3" style={{ marginTop: 26 }}>
              <button onClick={() => setStep(0)} className="btn-g" style={{ flex: 1 }}>
                Back
              </button>
              <button
                onClick={() => setStep(2)}
                disabled={!market}
                className={market ? 'btn-a' : 'btn-d'}
                style={{ flex: 1 }}
              >
                Next
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Capital & Currency */}
        {step === 2 && (
          <div style={{ marginTop: 22 }}>
            <h2 style={{ fontSize: 24, lineHeight: '28px' }}>Set your starting capital</h2>
            <p className="sub">This helps track your portfolio growth</p>

            <div style={{ marginTop: 24, textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="field">
                <label>CURRENCY</label>
                <div className="box" style={{ padding: 0 }}>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    style={{
                      width: '100%',
                      height: '100%',
                      padding: '0 14px',
                      background: 'transparent',
                      border: 0,
                      outline: 'none',
                      color: 'var(--text)',
                      fontSize: 13,
                    }}
                  >
                    {CURRENCIES.map((c) => (
                      <option key={c} value={c} style={{ background: '#0c1119' }}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="field">
                <label>STARTING CAPITAL</label>
                <div className="box" style={{ padding: 0 }}>
                  <input
                    type="number"
                    placeholder="e.g. 10000"
                    value={capital}
                    onChange={(e) => setCapital(e.target.value)}
                    style={{
                      width: '100%',
                      height: '100%',
                      padding: '0 14px',
                      background: 'transparent',
                      border: 0,
                      outline: 'none',
                      color: 'var(--text)',
                      fontFamily: 'var(--mono)',
                      fontSize: 13,
                    }}
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3" style={{ marginTop: 26 }}>
              <button onClick={() => setStep(1)} className="btn-g" style={{ flex: 1 }}>
                Back
              </button>
              <button
                onClick={() => setStep(3)}
                disabled={!capital || parseFloat(capital) <= 0}
                className={!capital || parseFloat(capital) <= 0 ? 'btn-d' : 'btn-a'}
                style={{ flex: 1 }}
              >
                Next
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Ready */}
        {step === 3 && (
          <div style={{ marginTop: 22 }}>
            <div className="flex justify-center">
              <BrainMascot size={56} glow />
            </div>
            <h2 style={{ marginTop: 20 }}>You&apos;re all set!</h2>
            <p className="sub">
              Start logging trades to unlock insights, analytics, and AI coaching.
            </p>

            {/* Story 6.6 — behavioral data collection disclosure (FR49) */}
            <div className="warn" style={{ textAlign: 'left', display: 'block' }}>
              <b>{BEHAVIORAL_DATA_DISCLOSURE.title}</b>
              <p style={{ margin: '8px 0 0', fontSize: 12.5, lineHeight: '20px', color: 'var(--muted)' }}>
                {BEHAVIORAL_DATA_DISCLOSURE.body}
              </p>
            </div>

            <div className="flex flex-col gap-3" style={{ marginTop: 26 }}>
              <button
                onClick={() => handleFinish('trade')}
                disabled={busy}
                className="btn-a"
                style={{ width: '100%', height: 44, opacity: busy ? 0.6 : 1 }}
              >
                {busy ? 'Setting up...' : 'Log First Trade'}
              </button>
              <button
                onClick={() => handleFinish('dashboard')}
                disabled={busy}
                className="btn-g"
                style={{ width: '100%', height: 44, opacity: busy ? 0.6 : 1 }}
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
