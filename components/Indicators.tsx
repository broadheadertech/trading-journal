'use client';

import { Activity, Download, ExternalLink } from 'lucide-react';

const INDICATORS = [
  { name: 'Liquidity Sweep Pro',     platform: 'TradingView', tag: 'Smart Money',    desc: 'Detects stop-hunt liquidity grabs in real time.' },
  { name: 'Volatility Regime Map',   platform: 'TradingView', tag: 'Regime',         desc: 'Color-codes the chart by current volatility regime.' },
  { name: 'Session Levels HUD',      platform: 'TradingView', tag: 'Levels',         desc: 'Auto-plots Asia, London, NY session highs and lows.' },
  { name: 'Order Block Finder',      platform: 'TradingView', tag: 'Smart Money',    desc: 'Highlights institutional order blocks with mitigation tracking.' },
  { name: 'RSI Divergence Scanner',  platform: 'TradingView', tag: 'Momentum',       desc: 'Live alerts on RSI divergences across multiple timeframes.' },
  { name: 'Trend Quality Score',     platform: 'TradingView', tag: 'Trend',          desc: 'Single-number score for current trend strength + cleanliness.' },
];

export default function Indicators() {
  return (
    <div className="relative space-y-10">
      <div className="hero-glow" />

      <header className="space-y-3 anim-fade-up">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass text-xs font-medium text-[var(--muted-foreground)]">
          <Activity size={12} /> TradingView library
        </div>
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-[var(--foreground)]">
          Premium <span className="gradient-text">indicators</span>
        </h1>
        <p className="text-base text-[var(--muted-foreground)] max-w-xl">
          Custom-built indicators included with your subscription. One click to install.
        </p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {INDICATORS.map((ind, idx) => (
          <div key={ind.name} style={{ animationDelay: `${idx * 60}ms` }} className="glass rounded-3xl p-6 card-lift anim-fade-up flex flex-col">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-teal-500/20 to-emerald-500/10 flex items-center justify-center mb-3">
              <Activity size={20} className="text-teal-400" />
            </div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-400 font-medium">{ind.tag}</span>
            </div>
            <h3 className="font-bold text-lg text-[var(--foreground)] tracking-tight">{ind.name}</h3>
            <p className="text-sm text-[var(--muted-foreground)] mt-1 flex-1">{ind.desc}</p>
            <div className="mt-4 pt-3 border-t border-[var(--border)] flex items-center justify-between">
              <span className="text-xs text-[var(--muted-foreground)]">{ind.platform}</span>
              <button className="flex items-center gap-1.5 text-sm font-medium text-teal-400 hover:gap-2 transition-all">
                <Download size={14} /> Install <ExternalLink size={11} />
              </button>
            </div>
          </div>
        ))}
      </div>

      <p className="text-xs text-[var(--muted-foreground)] text-center">
        Install links go live once we publish to the TradingView store.
      </p>
    </div>
  );
}
