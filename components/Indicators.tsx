'use client';

const INDICATORS = [
  { name: 'Liquidity Sweep Pro',     platform: 'TradingView', tag: 'Smart Money',    desc: 'Detects stop-hunt liquidity grabs in real time.' },
  { name: 'Volatility Regime Map',   platform: 'TradingView', tag: 'Regime',         desc: 'Color-codes the chart by current volatility regime.' },
  { name: 'Session Levels HUD',      platform: 'TradingView', tag: 'Levels',         desc: 'Auto-plots Asia, London, NY session highs and lows.' },
  { name: 'Order Block Finder',      platform: 'TradingView', tag: 'Smart Money',    desc: 'Highlights institutional order blocks with mitigation tracking.' },
  { name: 'RSI Divergence Scanner',  platform: 'TradingView', tag: 'Momentum',       desc: 'Live alerts on RSI divergences across multiple timeframes.' },
  { name: 'Trend Quality Score',     platform: 'TradingView', tag: 'Trend',          desc: 'Single-number score for current trend strength + cleanliness.' },
];

// Presentation-only: accent colour per tag, mirroring the ATLAS reference.
const TAG_ACCENT: Record<string, string> = {
  'Smart Money': '#2fd3c4',
  'Regime': '#d99405',
  'Levels': '#2fd3c4',
  'Momentum': '#ff3d87',
  'Trend': '#d99405',
};

export default function Indicators() {
  return (
    <div style={{ position: 'relative' }}>
      <div className="phead">
        <p className="eyebrow" style={{ fontWeight: 500 }}>TradingView library</p>
        <h2>Premium indicators</h2>
        <p className="sub">
          Custom-built indicators included with your subscription. One click to install.
        </p>
      </div>

      <div className="split-3">
        {INDICATORS.map((ind) => {
          const accent = TAG_ACCENT[ind.tag] ?? '#2fd3c4';
          return (
            <div key={ind.name} className="ind">
              <span className="accent" style={{ background: accent }} />
              <span
                className="ic"
                style={{
                  border: `1px solid ${accent}8c`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <svg width="23" height="17" viewBox="0 0 23 17" fill="none" aria-hidden="true">
                  <path d="M0 12 L5 5 L10 9 L15 2 L23 8" stroke={accent} strokeWidth="1.4" />
                </svg>
              </span>
              <p className="kick" style={{ color: accent }}>{ind.tag.toUpperCase()}</p>
              <h4>{ind.name}</h4>
              <p>{ind.desc}</p>
              <div className="foot">
                {ind.platform}
                <button className="go" type="button">
                  Install
                  <svg width="8" height="8" viewBox="0 0 8 8" fill="none" aria-hidden="true">
                    <path d="M0 8 L8 0M2 0h6v6" stroke="#d99405" strokeWidth="1.2" />
                  </svg>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <p className="footnote">
        Install links go live once we publish to the TradingView store.
      </p>
    </div>
  );
}
