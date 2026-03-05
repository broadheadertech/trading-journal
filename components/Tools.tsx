'use client';

import { useState, useMemo } from 'react';
import { useCurrency } from '@/hooks/useCurrency';
import {
  Crosshair, DollarSign, Scale, Percent, CircleDot, Timer, TrendingDown, TrendingUp,
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

/* ── Calculator definitions ──────────────────────────────── */

type ToolId = 'position-size' | 'profit-loss' | 'risk-reward' | 'margin-leverage' | 'pip-value' | 'liquidation' | 'drawdown' | 'compound';

interface ToolDef {
  id: ToolId;
  label: string;
  description: string;
  icon: React.ReactNode;
}

const TOOLS: ToolDef[] = [
  { id: 'position-size', label: 'Position Size', description: 'Optimal size based on your risk tolerance', icon: <Crosshair size={20} /> },
  { id: 'profit-loss', label: 'Profit / Loss', description: 'Calculate trade outcome and ROI', icon: <DollarSign size={20} /> },
  { id: 'risk-reward', label: 'Risk / Reward', description: 'Analyze risk-to-reward and breakeven win rate', icon: <Scale size={20} /> },
  { id: 'margin-leverage', label: 'Margin & Leverage', description: 'Required margin or effective leverage', icon: <Percent size={20} /> },
  { id: 'pip-value', label: 'Pip Value', description: 'Pip value for forex and CFD pairs', icon: <CircleDot size={20} /> },
  { id: 'liquidation', label: 'Liquidation Price', description: 'Find your liquidation price for leveraged positions', icon: <Timer size={20} /> },
  { id: 'drawdown', label: 'Drawdown Recovery', description: 'How much gain is needed to recover from a drawdown', icon: <TrendingDown size={20} /> },
  { id: 'compound', label: 'Compound Growth', description: 'Project compounding returns over many trades', icon: <TrendingUp size={20} /> },
];

/* ── Direction toggle component ──────────────────────────── */

function DirectionToggle({ value, onChange }: { value: 'long' | 'short'; onChange: (v: 'long' | 'short') => void }) {
  return (
    <div className="grid grid-cols-2 border border-[var(--border)] rounded-lg overflow-hidden">
      <button
        onClick={() => onChange('long')}
        className={`py-3 text-sm font-semibold transition-colors ${
          value === 'long' ? 'bg-green-500/10 border-r border-green-500 text-green-400' : 'text-[var(--muted-foreground)]'
        }`}
      >
        Buy / Long
      </button>
      <button
        onClick={() => onChange('short')}
        className={`py-3 text-sm font-semibold transition-colors ${
          value === 'short' ? 'bg-red-500/10 border-l border-red-500 text-red-400' : 'text-[var(--muted-foreground)]'
        }`}
      >
        Sell / Short
      </button>
    </div>
  );
}

/* ── Input field helpers ─────────────────────────────────── */

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="block text-sm font-medium mb-1.5">{children}</label>;
}

function FieldHint({ children }: { children: React.ReactNode }) {
  return <p className="text-xs text-[var(--muted-foreground)] mt-1">{children}</p>;
}

function NumInput({ value, onChange, prefix, suffix, placeholder = '0' }: {
  value: string; onChange: (v: string) => void; prefix?: string; suffix?: string; placeholder?: string;
}) {
  return (
    <div className="relative">
      {prefix && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[var(--muted-foreground)]">{prefix}</span>}
      <input
        type="number"
        step="any"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full py-3 bg-[var(--muted)] border border-[var(--border)] rounded-lg text-sm ${prefix ? 'pl-7' : 'pl-3'} ${suffix ? 'pr-8' : 'pr-3'}`}
      />
      {suffix && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-[var(--muted-foreground)]">{suffix}</span>}
    </div>
  );
}

/* ── Result display ──────────────────────────────────────── */

function ResultRow({ label, value, hint, accent }: { label: string; value: string; hint?: string; accent?: boolean }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-[var(--border)] last:border-b-0">
      <span className="text-sm text-[var(--muted-foreground)]">{label}</span>
      <div className="text-right">
        <span className={`text-sm font-bold ${accent ? 'text-[var(--accent)]' : ''}`}>{value}</span>
        {hint && <p className="text-[10px] text-[var(--muted-foreground)]">{hint}</p>}
      </div>
    </div>
  );
}

/* ── Position Size Calculator ────────────────────────────── */

function PositionSizeCalc() {
  const [balance, setBalance] = useState('10000');
  const [riskPercent, setRiskPercent] = useState('2');
  const [entryPrice, setEntryPrice] = useState('');
  const [stopLoss, setStopLoss] = useState('');
  const [leverage, setLeverage] = useState('1');
  const [direction, setDirection] = useState<'long' | 'short'>('long');

  const [copied, setCopied] = useState(false);

  const result = useMemo(() => {
    const bal = parseFloat(balance) || 0;
    const risk = parseFloat(riskPercent) || 0;
    const entry = parseFloat(entryPrice) || 0;
    const sl = parseFloat(stopLoss) || 0;
    const lev = parseFloat(leverage) || 1;
    if (bal <= 0 || entry <= 0 || sl <= 0) return null;

    const riskAmount = bal * (risk / 100);
    const priceDiff = direction === 'long' ? entry - sl : sl - entry;
    if (priceDiff <= 0) return null;

    const riskPerUnit = priceDiff / entry;
    const positionSize = riskAmount / riskPerUnit;
    const units = positionSize / entry;
    const margin = positionSize / lev;
    const slDistance = Math.abs(entry - sl);
    const slDistPct = (slDistance / entry) * 100;

    return { riskAmount, positionSize, units, margin, slDistance, slDistPct, riskPct: risk };
  }, [balance, riskPercent, entryPrice, stopLoss, leverage, direction]);

  const handleCopy = () => {
    if (!result) return;
    const text = `Position Size: ${result.units.toFixed(4)} units | Value: $${result.positionSize.toFixed(2)} | Margin: $${result.margin.toFixed(2)} | Risk: $${result.riskAmount.toFixed(2)}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleReset = () => {
    setBalance('10000'); setRiskPercent('2'); setEntryPrice(''); setStopLoss(''); setLeverage('1'); setDirection('long');
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div><FieldLabel>Account Balance</FieldLabel><NumInput value={balance} onChange={setBalance} prefix="$" placeholder="10000" /></div>
        <div><FieldLabel>Risk Per Trade</FieldLabel><NumInput value={riskPercent} onChange={setRiskPercent} suffix="%" /><FieldHint>Recommended: 0.5-2%</FieldHint></div>
        <div><FieldLabel>Entry Price</FieldLabel><NumInput value={entryPrice} onChange={setEntryPrice} prefix="$" placeholder="0.00" /></div>
        <div><FieldLabel>Stop Loss Price</FieldLabel><NumInput value={stopLoss} onChange={setStopLoss} prefix="$" placeholder="0.00" /></div>
        <div><FieldLabel>Leverage</FieldLabel><NumInput value={leverage} onChange={setLeverage} suffix="x" placeholder="1" /><FieldHint>1x = no leverage</FieldHint></div>
        <div><FieldLabel>Direction</FieldLabel><DirectionToggle value={direction} onChange={setDirection} /></div>
      </div>

      {result && (
        <>
          {/* POSITION section */}
          <div className="border border-[var(--border)] rounded-xl p-5 bg-[var(--muted)]/20">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--accent)] mb-3">Position</p>
            <ResultRow label="Position Size" value={`${result.units.toFixed(4)} units`} accent />
            <ResultRow label="Position Value" value={`$${result.positionSize.toFixed(2)}`} hint="Notional exposure" />
            <ResultRow label="Required Margin" value={`$${result.margin.toFixed(2)}`} hint={`At ${leverage}x leverage`} />
            <ResultRow label="Risk Amount" value={`$${result.riskAmount.toFixed(2)}`} hint={`${result.riskPct.toFixed(2)}% of balance`} accent />
            <ResultRow label="SL Distance" value={`${result.slDistance.toFixed(5)} (${result.slDistPct.toFixed(2)}%)`} />
          </div>

          {/* FOREX LOTS section */}
          <div className="border border-[var(--border)] rounded-xl p-5 bg-[var(--muted)]/20">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--accent)] mb-3">Forex Lots</p>
            <ResultRow label="Standard (100K)" value={(result.units / 100000).toFixed(4)} accent />
            <ResultRow label="Mini (10K)" value={(result.units / 10000).toFixed(4)} />
            <ResultRow label="Micro (1K)" value={(result.units / 1000).toFixed(4)} />
          </div>

          <CopyResetFooter onCopy={handleCopy} onReset={handleReset} copied={copied} />
          <InfoBanner>Position sizing is based on risk, not leverage. Leverage lets you hold a bigger position with less margin, but your dollar risk stays the same. Never risk more than 1-2% per trade.</InfoBanner>
        </>
      )}
    </div>
  );
}

/* ── Profit / Loss Calculator ────────────────────────────── */

function ProfitLossCalc() {
  const [entryPrice, setEntryPrice] = useState('');
  const [exitPrice, setExitPrice] = useState('');
  const [quantity, setQuantity] = useState('');
  const [direction, setDirection] = useState<'long' | 'short'>('long');
  const [leverage, setLeverage] = useState('1');
  const [feePercent, setFeePercent] = useState('0.1');
  const [copied, setCopied] = useState(false);

  const result = useMemo(() => {
    const entry = parseFloat(entryPrice) || 0;
    const exit = parseFloat(exitPrice) || 0;
    const qty = parseFloat(quantity) || 0;
    const lev = parseFloat(leverage) || 1;
    const fee = parseFloat(feePercent) || 0;
    if (entry <= 0 || exit <= 0 || qty <= 0) return null;

    const notional = qty * entry;
    const priceDiff = direction === 'long' ? exit - entry : entry - exit;
    const grossPnL = (priceDiff / entry) * notional * lev;
    const feePerSide = notional * (fee / 100);
    const totalFees = feePerSide * 2;
    const netPnL = grossPnL - totalFees;
    const roiOnMargin = (netPnL / (notional / lev)) * 100;
    const margin = notional / lev;
    const pnlPerUnit = netPnL / qty;
    // Breakeven: price where netPnL = 0 (including fees)
    const feeFraction = fee / 100;
    const breakevenPrice = direction === 'long'
      ? entry * (1 + 2 * feeFraction)
      : entry * (1 - 2 * feeFraction);

    return { grossPnL, totalFees, feePerSide, netPnL, roiOnMargin, notional, margin, pnlPerUnit, breakevenPrice };
  }, [entryPrice, exitPrice, quantity, direction, leverage, feePercent]);

  const handleCopy = () => {
    if (!result) return;
    const text = `Net PnL: ${result.netPnL >= 0 ? '+' : ''}$${result.netPnL.toFixed(2)} | ROI: ${result.roiOnMargin.toFixed(2)}% | Gross: $${result.grossPnL.toFixed(2)} | Fees: $${result.totalFees.toFixed(2)}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleReset = () => {
    setEntryPrice(''); setExitPrice(''); setQuantity(''); setDirection('long'); setLeverage('1'); setFeePercent('0.1');
  };

  const lev = parseFloat(leverage) || 1;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div><FieldLabel>Entry Price</FieldLabel><NumInput value={entryPrice} onChange={setEntryPrice} prefix="$" placeholder="0.00" /></div>
        <div><FieldLabel>Exit Price</FieldLabel><NumInput value={exitPrice} onChange={setExitPrice} prefix="$" placeholder="0.00" /></div>
        <div><FieldLabel>Quantity / Size</FieldLabel><NumInput value={quantity} onChange={setQuantity} placeholder="0" /></div>
        <div><FieldLabel>Direction</FieldLabel><DirectionToggle value={direction} onChange={setDirection} /></div>
        <div><FieldLabel>Leverage</FieldLabel><NumInput value={leverage} onChange={setLeverage} suffix="x" placeholder="1" /><FieldHint>1x = spot / no leverage</FieldHint></div>
        <div><FieldLabel>Fee Per Side</FieldLabel><NumInput value={feePercent} onChange={setFeePercent} suffix="%" placeholder="0.1" /><FieldHint>Applied on both entry and exit</FieldHint></div>
      </div>

      {result && (
        <>
          {/* TRADE OUTCOME */}
          <div className="border border-[var(--border)] rounded-xl p-5 bg-[var(--muted)]/20">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--accent)] mb-3">Trade Outcome</p>
            <ResultRow label="Net PnL" value={`${result.netPnL >= 0 ? '' : '-'}$${Math.abs(result.netPnL).toFixed(2)}`} accent />
            <ResultRow label="ROI (on margin)" value={`${result.roiOnMargin >= 0 ? '' : '-'}${Math.abs(result.roiOnMargin).toFixed(2)}%`} hint="Spot return" />
            <ResultRow label="Gross PnL" value={`${result.grossPnL >= 0 ? '' : '-'}$${Math.abs(result.grossPnL).toFixed(2)}`} />
            <ResultRow label="Total Fees" value={`$${result.totalFees.toFixed(2)}`} hint={`$${result.feePerSide.toFixed(2)} per side`} />
          </div>

          {/* POSITION DETAILS */}
          <div className="border border-[var(--border)] rounded-xl p-5 bg-[var(--muted)]/20">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--accent)] mb-3">Position Details</p>
            <ResultRow label="Notional Value" value={`$${result.notional.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} />
            <ResultRow label="Margin Used" value={`$${result.margin.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} hint={`At ${lev}x leverage`} />
            <ResultRow label="PnL Per Unit" value={`${result.pnlPerUnit >= 0 ? '' : '-'}$${Math.abs(result.pnlPerUnit).toFixed(4)}`} />
            <ResultRow label="Breakeven Price" value={`$${result.breakevenPrice.toFixed(5)}`} hint="Including fees" accent />
          </div>

          <CopyResetFooter onCopy={handleCopy} onReset={handleReset} copied={copied} />
        </>
      )}
    </div>
  );
}

/* ── Risk / Reward Calculator ────────────────────────────── */

function RiskRewardCalc() {
  const [entryPrice, setEntryPrice] = useState('');
  const [stopLoss, setStopLoss] = useState('');
  const [takeProfit, setTakeProfit] = useState('');
  const [direction, setDirection] = useState<'long' | 'short'>('long');
  const [quantity, setQuantity] = useState('');
  const [leverage, setLeverage] = useState('1');
  const [copied, setCopied] = useState(false);

  const result = useMemo(() => {
    const entry = parseFloat(entryPrice) || 0;
    const sl = parseFloat(stopLoss) || 0;
    const tp = parseFloat(takeProfit) || 0;
    const qty = parseFloat(quantity) || 0;
    const lev = parseFloat(leverage) || 1;
    if (entry <= 0 || sl <= 0 || tp <= 0) return null;

    const risk = direction === 'long' ? entry - sl : sl - entry;
    const reward = direction === 'long' ? tp - entry : entry - tp;
    if (risk <= 0 || reward <= 0) return null;

    const rr = reward / risk;
    const breakeven = 1 / (1 + rr) * 100;
    const riskPct = (risk / entry) * 100;
    const rewardPct = (reward / entry) * 100;
    const riskDollar = qty > 0 ? (risk / entry) * qty * entry * lev : null;
    const rewardDollar = qty > 0 ? (reward / entry) * qty * entry * lev : null;

    return { rr, breakeven, risk, reward, riskPct, rewardPct, riskDollar, rewardDollar };
  }, [entryPrice, stopLoss, takeProfit, direction, quantity, leverage]);

  const handleCopy = () => {
    if (!result) return;
    const text = `R:R = 1:${result.rr.toFixed(2)} | Breakeven WR: ${result.breakeven.toFixed(1)}%${result.riskDollar !== null ? ` | Risk: $${result.riskDollar.toFixed(2)} | Reward: $${result.rewardDollar?.toFixed(2)}` : ''}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleReset = () => {
    setEntryPrice(''); setStopLoss(''); setTakeProfit(''); setDirection('long'); setQuantity(''); setLeverage('1');
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div><FieldLabel>Entry Price</FieldLabel><NumInput value={entryPrice} onChange={setEntryPrice} prefix="$" placeholder="0.00" /></div>
        <div><FieldLabel>Direction</FieldLabel><DirectionToggle value={direction} onChange={setDirection} /></div>
        <div><FieldLabel>Stop Loss</FieldLabel><NumInput value={stopLoss} onChange={setStopLoss} prefix="$" placeholder="0.00" /></div>
        <div><FieldLabel>Take Profit</FieldLabel><NumInput value={takeProfit} onChange={setTakeProfit} prefix="$" placeholder="0.00" /></div>
        <div><FieldLabel>Quantity (optional)</FieldLabel><NumInput value={quantity} onChange={setQuantity} placeholder="0" /><FieldHint>For dollar amounts</FieldHint></div>
        <div><FieldLabel>Leverage (optional)</FieldLabel><NumInput value={leverage} onChange={setLeverage} suffix="x" placeholder="1" /><FieldHint>For dollar amounts</FieldHint></div>
      </div>
      {result && (
        <>
          <div className="border border-[var(--border)] rounded-xl p-5 bg-[var(--muted)]/20">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--accent)] mb-3">Risk / Reward</p>
            <ResultRow label="Risk : Reward" value={`1 : ${result.rr.toFixed(2)}`} accent />
            <ResultRow label="Breakeven Win Rate" value={`${result.breakeven.toFixed(1)}%`} hint="Minimum WR to be profitable" />
            <ResultRow label="Risk (price)" value={`$${result.risk.toFixed(5)}`} hint={`${result.riskPct.toFixed(2)}% from entry`} />
            <ResultRow label="Reward (price)" value={`$${result.reward.toFixed(5)}`} hint={`${result.rewardPct.toFixed(2)}% from entry`} />
          </div>

          {(result.riskDollar !== null || result.rewardDollar !== null) && (
            <div className="border border-[var(--border)] rounded-xl p-5 bg-[var(--muted)]/20">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--accent)] mb-3">Dollar Values</p>
              {result.riskDollar !== null && <ResultRow label="Risk ($)" value={`$${result.riskDollar.toFixed(2)}`} />}
              {result.rewardDollar !== null && <ResultRow label="Reward ($)" value={`$${result.rewardDollar.toFixed(2)}`} accent />}
            </div>
          )}

          <CopyResetFooter onCopy={handleCopy} onReset={handleReset} copied={copied} />
          <InfoBanner>A 1:2 risk-reward ratio means you only need to win 33% of your trades to break even. Higher R:R ratios allow lower win rates while remaining profitable.</InfoBanner>
        </>
      )}
    </div>
  );
}

/* ── Copy / Reset footer ──────────────────────────────────── */

function CopyResetFooter({ onCopy, onReset, copied }: { onCopy: () => void; onReset: () => void; copied: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <button onClick={onCopy} className="flex items-center gap-1.5 px-4 py-2 text-sm rounded-lg border border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:border-[var(--accent)]/40 transition-colors font-medium">
        {copied ? 'Copied!' : 'Copy'}
      </button>
      <button onClick={onReset} className="flex items-center gap-1.5 px-4 py-2 text-sm rounded-lg border border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:border-[var(--accent)]/40 transition-colors font-medium">
        Reset
      </button>
    </div>
  );
}

function InfoBanner({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2.5 p-4 rounded-xl bg-[var(--accent)]/5 border border-[var(--accent)]/20">
      <span className="text-[var(--accent)] mt-0.5 shrink-0">&#x24D8;</span>
      <p className="text-xs text-[var(--muted-foreground)]">{children}</p>
    </div>
  );
}

/* ── Margin & Leverage Calculator ────────────────────────── */

function MarginLeverageCalc() {
  const [mode, setMode] = useState<'margin' | 'leverage'>('margin');
  const [positionSize, setPositionSize] = useState('1');
  const [entryPrice, setEntryPrice] = useState('1000');
  const [leverage, setLeverage] = useState('10');
  const [direction, setDirection] = useState<'long' | 'short'>('long');
  const [accountBalance, setAccountBalance] = useState('1000');
  const [copied, setCopied] = useState(false);

  const result = useMemo(() => {
    const size = parseFloat(positionSize) || 0;
    const entry = parseFloat(entryPrice) || 0;
    const lev = parseFloat(leverage) || 1;
    const bal = parseFloat(accountBalance) || 0;
    if (size <= 0 || entry <= 0) return null;

    const notional = size * entry;

    if (mode === 'margin') {
      const margin = notional / lev;
      const marginRate = (1 / lev) * 100;
      return { notional, margin, effectiveLeverage: lev, marginRate, availableMargin: null };
    } else {
      if (bal <= 0) return null;
      const effectiveLev = notional / bal;
      const marginRate = (1 / effectiveLev) * 100;
      return { notional, margin: null, effectiveLeverage: effectiveLev, marginRate, availableMargin: bal };
    }
  }, [mode, positionSize, entryPrice, leverage, accountBalance]);

  const handleCopy = () => {
    if (!result) return;
    const text = mode === 'margin'
      ? `Notional: $${result.notional.toFixed(2)} | Margin: $${result.margin?.toFixed(2)} | Leverage: ${result.effectiveLeverage.toFixed(1)}x | Margin Rate: ${result.marginRate.toFixed(2)}%`
      : `Notional: $${result.notional.toFixed(2)} | Available Margin: $${result.availableMargin?.toFixed(2)} | Effective Leverage: ${result.effectiveLeverage.toFixed(1)}x | Margin Rate: ${result.marginRate.toFixed(2)}%`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleReset = () => {
    setPositionSize('1'); setEntryPrice('1000'); setLeverage('10'); setDirection('long'); setAccountBalance('1000');
  };

  return (
    <div className="space-y-5">
      <div>
        <FieldLabel>Calculate</FieldLabel>
        <div className="grid grid-cols-2 border border-[var(--border)] rounded-lg overflow-hidden">
          <button onClick={() => setMode('margin')} className={`py-3 text-sm font-semibold transition-colors ${mode === 'margin' ? 'bg-[var(--accent)] text-white' : 'text-[var(--muted-foreground)]'}`}>Required Margin</button>
          <button onClick={() => setMode('leverage')} className={`py-3 text-sm font-semibold transition-colors ${mode === 'leverage' ? 'bg-[var(--accent)] text-white' : 'text-[var(--muted-foreground)]'}`}>Effective Leverage</button>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div><FieldLabel>Position Size (units)</FieldLabel><NumInput value={positionSize} onChange={setPositionSize} placeholder="1" /></div>
        <div><FieldLabel>Entry Price</FieldLabel><NumInput value={entryPrice} onChange={setEntryPrice} prefix="$" placeholder="1000" /></div>
        {mode === 'margin' ? (
          <div><FieldLabel>Leverage</FieldLabel><NumInput value={leverage} onChange={setLeverage} suffix="x" placeholder="10" /></div>
        ) : (
          <div><FieldLabel>Available Margin</FieldLabel><NumInput value={accountBalance} onChange={setAccountBalance} prefix="$" placeholder="1000" /></div>
        )}
        <div><FieldLabel>Direction</FieldLabel><DirectionToggle value={direction} onChange={setDirection} /></div>
      </div>
      {result && (
        <>
          <div className="border border-[var(--border)] rounded-xl p-5 bg-[var(--muted)]/20">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--accent)] mb-3">Results</p>
            <ResultRow label="Notional Value" value={`$${result.notional.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} />
            {result.margin !== null && <ResultRow label="Required Margin" value={`$${result.margin.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} accent />}
            {result.availableMargin !== null && <ResultRow label="Available Margin" value={`$${result.availableMargin.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} accent />}
            <ResultRow label={mode === 'margin' ? 'Leverage' : 'Effective Leverage'} value={`${result.effectiveLeverage.toFixed(1)}x`} />
            <ResultRow label="Margin Rate" value={`${result.marginRate.toFixed(2)}%`} />
          </div>
          <CopyResetFooter onCopy={handleCopy} onReset={handleReset} copied={copied} />
        </>
      )}
    </div>
  );
}

/* ── Pip Value Calculator ────────────────────────────────── */

function PipValueCalc() {
  const [pipSize, setPipSize] = useState('0.0001');
  const [lotType, setLotType] = useState('100000');
  const [lots, setLots] = useState('1');
  const [direction, setDirection] = useState<'long' | 'short'>('long');
  const [currentPrice, setCurrentPrice] = useState('1000');
  const [leverage, setLeverage] = useState('1');
  const [copied, setCopied] = useState(false);

  const result = useMemo(() => {
    const pip = parseFloat(pipSize) || 0;
    const lot = parseFloat(lotType) || 0;
    const numLots = parseFloat(lots) || 0;
    const price = parseFloat(currentPrice) || 0;
    const lev = parseFloat(leverage) || 1;
    if (pip <= 0 || lot <= 0 || numLots <= 0) return null;

    const totalUnits = lot * numLots;
    const onePip = pip * totalUnits;
    const tenPips = onePip * 10;
    const fiftyPips = onePip * 50;
    const hundredPips = onePip * 100;
    const notional = price > 0 ? totalUnits * price : null;
    const margin = price > 0 ? (totalUnits * price) / lev : null;

    return { onePip, tenPips, fiftyPips, hundredPips, totalUnits, notional, margin };
  }, [pipSize, lotType, lots, currentPrice, leverage]);

  const handleCopy = () => {
    if (!result) return;
    const text = `1 Pip: $${result.onePip.toFixed(4)} | 10 Pips: $${result.tenPips.toFixed(2)} | 50 Pips: $${result.fiftyPips.toFixed(2)} | 100 Pips: $${result.hundredPips.toFixed(2)} | Units: ${result.totalUnits.toLocaleString()}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleReset = () => {
    setPipSize('0.0001'); setLotType('100000'); setLots('1'); setDirection('long'); setCurrentPrice('1000'); setLeverage('1');
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div><FieldLabel>Pip Size</FieldLabel><NumInput value={pipSize} onChange={setPipSize} placeholder="0.0001" /><FieldHint>0.0001 for most pairs, 0.01 for JPY</FieldHint></div>
        <div>
          <FieldLabel>Lot Type</FieldLabel>
          <select value={lotType} onChange={e => setLotType(e.target.value)} className="w-full py-3 px-3 bg-[var(--muted)] border border-[var(--border)] rounded-lg text-sm">
            <option value="100000">Standard (100,000)</option>
            <option value="10000">Mini (10,000)</option>
            <option value="1000">Micro (1,000)</option>
            <option value="100">Nano (100)</option>
          </select>
        </div>
        <div><FieldLabel>Number of Lots</FieldLabel><NumInput value={lots} onChange={setLots} placeholder="1" /></div>
        <div><FieldLabel>Direction</FieldLabel><DirectionToggle value={direction} onChange={setDirection} /></div>
        <div><FieldLabel>Current Price (optional)</FieldLabel><NumInput value={currentPrice} onChange={setCurrentPrice} prefix="$" placeholder="1000" /><FieldHint>For margin calculation</FieldHint></div>
        <div><FieldLabel>Leverage</FieldLabel><NumInput value={leverage} onChange={setLeverage} suffix="x" placeholder="1" /><FieldHint>For margin calculation</FieldHint></div>
      </div>
      {result && (
        <>
          <div className="border border-[var(--border)] rounded-xl p-5 bg-[var(--muted)]/20">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--accent)] mb-3">Pip Values</p>
            <ResultRow label="1 Pip" value={`$${result.onePip.toFixed(4)}`} accent />
            <ResultRow label="10 Pips" value={`$${result.tenPips.toFixed(2)}`} />
            <ResultRow label="50 Pips" value={`$${result.fiftyPips.toFixed(2)}`} />
            <ResultRow label="100 Pips" value={`$${result.hundredPips.toFixed(2)}`} />
            <ResultRow label="Total Units" value={result.totalUnits.toLocaleString()} />
          </div>

          {result.notional !== null && (
            <div className="border border-[var(--border)] rounded-xl p-5 bg-[var(--muted)]/20">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--accent)] mb-3">Margin</p>
              <ResultRow label="Notional Value" value={`$${result.notional.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} />
              {result.margin !== null && <ResultRow label="Required Margin" value={`$${result.margin.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} hint={`At ${leverage}x leverage`} accent />}
            </div>
          )}

          <CopyResetFooter onCopy={handleCopy} onReset={handleReset} copied={copied} />
          <InfoBanner>Pip value is independent of leverage — leverage only affects the margin required to hold the position. For EUR/USD with a standard lot: 1 pip = $10.</InfoBanner>
        </>
      )}
    </div>
  );
}

/* ── Liquidation Price Calculator ────────────────────────── */

function LiquidationCalc() {
  const [entryPrice, setEntryPrice] = useState('1000');
  const [leverage, setLeverage] = useState('10');
  const [direction, setDirection] = useState<'long' | 'short'>('long');
  const [maintenanceRate, setMaintenanceRate] = useState('0.5');
  const [copied, setCopied] = useState(false);

  const result = useMemo(() => {
    const entry = parseFloat(entryPrice) || 0;
    const lev = parseFloat(leverage) || 1;
    const mmr = parseFloat(maintenanceRate) || 0;
    if (entry <= 0 || lev <= 0) return null;

    const liqPercent = (1 / lev) - (mmr / 100);
    const liqPrice = direction === 'long'
      ? entry * (1 - liqPercent)
      : entry * (1 + liqPercent);
    const distPercent = Math.abs(liqPrice - entry) / entry * 100;
    const distDollar = Math.abs(liqPrice - entry);
    const initialMargin = (1 / lev) * 100;

    return { liqPrice: Math.max(0, liqPrice), distPercent, distDollar, initialMargin };
  }, [entryPrice, leverage, direction, maintenanceRate]);

  const handleCopy = () => {
    if (!result) return;
    const text = `Liquidation Price: $${result.liqPrice.toFixed(2)} | Distance: ${result.distPercent.toFixed(2)}% ($${result.distDollar.toFixed(2)}) | Initial Margin: ${result.initialMargin.toFixed(2)}%`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleReset = () => {
    setEntryPrice('1000'); setLeverage('10'); setDirection('long'); setMaintenanceRate('0.5');
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div><FieldLabel>Entry Price</FieldLabel><NumInput value={entryPrice} onChange={setEntryPrice} prefix="$" placeholder="1000" /></div>
        <div><FieldLabel>Leverage</FieldLabel><NumInput value={leverage} onChange={setLeverage} suffix="x" placeholder="10" /></div>
        <div><FieldLabel>Direction</FieldLabel><DirectionToggle value={direction} onChange={setDirection} /></div>
        <div><FieldLabel>Maintenance Margin Rate</FieldLabel><NumInput value={maintenanceRate} onChange={setMaintenanceRate} suffix="%" placeholder="0.5" /><FieldHint>Varies by exchange (0.4-1%)</FieldHint></div>
      </div>
      {result && (
        <>
          <div className="border border-[var(--border)] rounded-xl p-5 bg-[var(--muted)]/20">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--accent)] mb-3">Liquidation</p>
            <ResultRow label="Liquidation Price" value={`$${result.liqPrice.toFixed(2)}`} hint={`$${result.distDollar.toFixed(2)} from entry`} accent />
            <ResultRow label="Distance to Liquidation" value={`${result.distPercent.toFixed(2)}%`} accent />
            <ResultRow label="Initial Margin" value={`${result.initialMargin.toFixed(2)}%`} />
          </div>

          {/* Liquidation distance bar */}
          <div className="border border-[var(--border)] rounded-xl p-5 bg-[var(--muted)]/20">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--muted-foreground)] mb-3">Liquidation Distance</p>
            <div className="relative h-3 rounded-full bg-[var(--muted)] overflow-hidden">
              <div
                className="absolute left-0 top-0 h-full rounded-full transition-all"
                style={{
                  width: `${Math.min(result.distPercent, 100)}%`,
                  backgroundColor: result.distPercent < 5 ? '#ef4444' : result.distPercent < 15 ? '#eab308' : 'var(--accent)',
                }}
              />
            </div>
            <div className="flex items-center justify-between mt-1.5">
              <span className="text-[10px] text-[var(--muted-foreground)]">High risk</span>
              <span className="text-xs font-semibold">{result.distPercent.toFixed(2)}%</span>
              <span className="text-[10px] text-[var(--muted-foreground)]">Low risk</span>
            </div>
          </div>

          <CopyResetFooter onCopy={handleCopy} onReset={handleReset} copied={copied} />
          <InfoBanner>Higher leverage means a closer liquidation price. At 100x, your position liquidates with just a ~1% move against you. Use stop losses to exit before liquidation.</InfoBanner>
        </>
      )}
    </div>
  );
}

/* ── Drawdown Recovery Calculator ────────────────────────── */

function DrawdownCalc() {
  const [drawdown, setDrawdown] = useState('20');

  const dd = parseFloat(drawdown) || 0;
  const recovery = dd > 0 && dd < 100 ? ((1 / (1 - dd / 100)) - 1) * 100 : 0;

  const referenceTable = [
    [-5, -10], [-15, -20], [-25, -30], [-40, -50], [-60, -70], [-80, -90],
  ];

  const handleReset = () => setDrawdown('20');

  return (
    <div className="space-y-5">
      <div className="max-w-sm">
        <FieldLabel>Drawdown</FieldLabel>
        <NumInput value={drawdown} onChange={setDrawdown} suffix="%" placeholder="20" />
        <FieldHint>How much of your account is lost</FieldHint>
      </div>

      {dd > 0 && dd < 100 && (
        <div className="border border-[var(--border)] rounded-xl p-5 bg-[var(--muted)]/20">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--accent)] mb-3">Recovery Required</p>
          <ResultRow label="Gain Needed" value={`${recovery.toFixed(2)}%`} hint="To return to original balance" accent />
        </div>
      )}

      <div className="border border-[var(--border)] rounded-xl p-5 bg-[var(--muted)]/20">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--accent)] mb-3">Reference Table</p>
        <div className="grid grid-cols-2 gap-x-8 gap-y-1">
          {referenceTable.map(([left, right]) => {
            const leftRecovery = ((1 / (1 + left / 100)) - 1) * -100;
            const rightRecovery = ((1 / (1 + right / 100)) - 1) * -100;
            return (
              <div key={`${left}-${right}`} className="contents">
                <div className="flex items-center justify-between py-1.5 border-b border-[var(--border)]">
                  <span className={`text-sm ${left <= -80 ? 'text-red-400 font-semibold' : ''}`}>{left}%</span>
                  <span className={`text-sm font-bold ${leftRecovery >= 50 ? 'text-yellow-400' : leftRecovery >= 100 ? 'text-red-400' : 'text-[var(--accent)]'}`}>+{leftRecovery.toFixed(1)}%</span>
                </div>
                <div className="flex items-center justify-between py-1.5 border-b border-[var(--border)]">
                  <span className="text-sm">{right}%</span>
                  <span className={`text-sm font-bold ${rightRecovery >= 100 ? 'text-red-400' : rightRecovery >= 50 ? 'text-yellow-400' : 'text-[var(--accent)]'}`}>+{rightRecovery.toFixed(1)}%</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex justify-end">
        <button onClick={handleReset} className="flex items-center gap-1.5 px-4 py-2 text-sm rounded-lg border border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:border-[var(--accent)]/40 transition-colors font-medium">
          Reset
        </button>
      </div>

      <InfoBanner>Drawdown recovery is exponential, not linear. A 50% loss requires a 100% gain, and a 90% loss requires 900%. This is why capital preservation is the first rule of trading.</InfoBanner>
    </div>
  );
}

/* ── Compound Growth Calculator ──────────────────────────── */

function CompoundGrowthCalc() {
  const [mode, setMode] = useState<'fixed' | 'winrate'>('fixed');
  const [startBalance, setStartBalance] = useState('10000');
  const [numTrades, setNumTrades] = useState('50');
  const [gainPercent, setGainPercent] = useState('2');
  const [winRate, setWinRate] = useState('55');
  const [avgWinPct, setAvgWinPct] = useState('3');
  const [avgLossPct, setAvgLossPct] = useState('1.5');
  const [copied, setCopied] = useState(false);

  const { chartData, avgReturnPerTrade } = useMemo(() => {
    const start = parseFloat(startBalance) || 0;
    const trades = parseInt(numTrades) || 0;
    if (start <= 0 || trades <= 0) return { chartData: [], avgReturnPerTrade: 0 };

    const data: { trade: number; balance: number }[] = [{ trade: 0, balance: start }];
    let bal = start;
    let avgRet = 0;

    if (mode === 'fixed') {
      const gain = parseFloat(gainPercent) || 0;
      avgRet = gain;
      for (let i = 1; i <= trades; i++) {
        bal *= (1 + gain / 100);
        data.push({ trade: i, balance: Math.round(bal * 100) / 100 });
      }
    } else {
      const wr = (parseFloat(winRate) || 0) / 100;
      const avgW = (parseFloat(avgWinPct) || 0) / 100;
      const avgL = (parseFloat(avgLossPct) || 0) / 100;
      const ev = wr * avgW - (1 - wr) * avgL;
      avgRet = ev * 100;
      for (let i = 1; i <= trades; i++) {
        bal *= (1 + ev);
        data.push({ trade: i, balance: Math.round(bal * 100) / 100 });
      }
    }

    return { chartData: data, avgReturnPerTrade: avgRet };
  }, [mode, startBalance, numTrades, gainPercent, winRate, avgWinPct, avgLossPct]);

  const start = parseFloat(startBalance) || 0;
  const trades = parseInt(numTrades) || 0;
  const finalBalance = chartData.length > 0 ? chartData[chartData.length - 1].balance : 0;
  const totalProfit = finalBalance - start;
  const totalReturn = start > 0 ? ((finalBalance / start) - 1) * 100 : 0;

  const handleCopy = () => {
    if (chartData.length <= 1) return;
    const text = `Final Balance: $${finalBalance.toFixed(2)} | Total Profit: $${totalProfit.toFixed(2)} | Total Return: ${totalReturn.toFixed(2)}% | Avg Return/Trade: ${avgReturnPerTrade.toFixed(3)}% | Trades: ${trades}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleReset = () => {
    setStartBalance('10000'); setNumTrades('50'); setGainPercent('2'); setWinRate('55'); setAvgWinPct('3'); setAvgLossPct('1.5');
  };

  return (
    <div className="space-y-5">
      <div>
        <FieldLabel>Mode</FieldLabel>
        <div className="grid grid-cols-2 border border-[var(--border)] rounded-lg overflow-hidden">
          <button onClick={() => setMode('fixed')} className={`py-3 text-sm font-semibold transition-colors ${mode === 'fixed' ? 'bg-[var(--accent)] text-white' : 'text-[var(--muted-foreground)]'}`}>Fixed Return</button>
          <button onClick={() => setMode('winrate')} className={`py-3 text-sm font-semibold transition-colors ${mode === 'winrate' ? 'bg-[var(--accent)] text-white' : 'text-[var(--muted-foreground)]'}`}>Win Rate Model</button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div><FieldLabel>Starting Balance</FieldLabel><NumInput value={startBalance} onChange={setStartBalance} prefix="$" placeholder="10000" /></div>
        <div><FieldLabel>Number of Trades</FieldLabel><NumInput value={numTrades} onChange={setNumTrades} placeholder="50" /></div>
        {mode === 'fixed' ? (
          <div><FieldLabel>Gain Per Trade</FieldLabel><NumInput value={gainPercent} onChange={setGainPercent} suffix="%" placeholder="2" /></div>
        ) : (
          <>
            <div><FieldLabel>Win Rate</FieldLabel><NumInput value={winRate} onChange={setWinRate} suffix="%" placeholder="55" /></div>
            <div><FieldLabel>Avg Win</FieldLabel><NumInput value={avgWinPct} onChange={setAvgWinPct} suffix="%" placeholder="3" /><FieldHint>% gain on winning trades</FieldHint></div>
            <div><FieldLabel>Avg Loss</FieldLabel><NumInput value={avgLossPct} onChange={setAvgLossPct} suffix="%" placeholder="1.5" /><FieldHint>% loss on losing trades</FieldHint></div>
          </>
        )}
      </div>

      {chartData.length > 1 && (
        <>
          <div className="border border-[var(--border)] rounded-xl p-4 bg-[var(--muted)]/20">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--accent)] mb-3">Projected Growth Curve</p>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.4} />
                <XAxis dataKey="trade" tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }} tickLine={false} axisLine={{ stroke: 'var(--border)' }} />
                <YAxis tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }} tickLine={false} axisLine={{ stroke: 'var(--border)' }} tickFormatter={(v: number) => `$${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v.toFixed(0)}`} />
                <Tooltip
                  contentStyle={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: '0.75rem', fontSize: 12 }}
                  formatter={((v: number) => [`$${v.toFixed(2)}`, 'Balance']) as any}
                  labelFormatter={((l: number) => `Trade ${l}`) as any}
                />
                <Line type="monotone" dataKey="balance" stroke="var(--accent)" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="border border-[var(--border)] rounded-xl p-5 bg-[var(--muted)]/20">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--accent)] mb-3">Projection</p>
            <ResultRow label="Final Balance" value={`$${finalBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} accent />
            <ResultRow label="Total Profit" value={`$${totalProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} accent />
            <ResultRow label="Total Return" value={`${totalReturn.toFixed(2)}%`} />
            <ResultRow label="Avg Return / Trade" value={`${avgReturnPerTrade.toFixed(3)}%`} />
            <ResultRow label="Number of Trades" value={`${trades}`} />
          </div>

          <CopyResetFooter onCopy={handleCopy} onReset={handleReset} copied={copied} />
          <InfoBanner>Compounding is powerful but assumes consistent risk management. In reality, drawdowns will interrupt the curve. Use this as a best-case scenario, not a guarantee.</InfoBanner>
        </>
      )}
    </div>
  );
}

/* ── Main Component ───────────────────────────────────────── */

export default function Tools() {
  const [activeTool, setActiveTool] = useState<ToolId>('position-size');
  const active = TOOLS.find(t => t.id === activeTool)!;

  const renderCalc = () => {
    switch (activeTool) {
      case 'position-size': return <PositionSizeCalc />;
      case 'profit-loss': return <ProfitLossCalc />;
      case 'risk-reward': return <RiskRewardCalc />;
      case 'margin-leverage': return <MarginLeverageCalc />;
      case 'pip-value': return <PipValueCalc />;
      case 'liquidation': return <LiquidationCalc />;
      case 'drawdown': return <DrawdownCalc />;
      case 'compound': return <CompoundGrowthCalc />;
    }
  };

  return (
    <div className="max-w-[1400px] mx-auto px-3 sm:px-6 py-6 space-y-6">
      <div>
        <h1 className="text-3xl sm:text-4xl font-black mb-1">Tools & Calculators</h1>
        <p className="text-sm text-[var(--muted-foreground)]">
          Essential trading calculators for position sizing, risk management, and trade planning.
        </p>
      </div>

      {/* Tool tabs — horizontally scrollable */}
      <div className="relative">
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {TOOLS.map(tool => (
            <button
              key={tool.id}
              onClick={() => setActiveTool(tool.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm rounded-full border whitespace-nowrap font-medium transition-colors shrink-0 ${
                activeTool === tool.id
                  ? 'border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]'
                  : 'border-[var(--border)] text-[var(--muted-foreground)] hover:border-[var(--accent)]/40'
              }`}
            >
              {tool.icon} {tool.label}
            </button>
          ))}
        </div>
        {/* Scroll fade indicator */}
        <div className="absolute right-0 top-0 bottom-2 w-8 bg-gradient-to-l from-[var(--background)] to-transparent pointer-events-none" />
      </div>

      {/* Active calculator card */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5 sm:p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-[var(--accent)]/10 flex items-center justify-center text-[var(--accent)]">
            {active.icon}
          </div>
          <div>
            <h2 className="text-lg font-bold">{active.label}</h2>
            <p className="text-xs text-[var(--muted-foreground)]">{active.description}</p>
          </div>
        </div>

        {renderCalc()}
      </div>
    </div>
  );
}
