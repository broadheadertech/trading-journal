import Link from 'next/link';
import GlobeRoutes from './GlobeRoutes';

export default function Hero() {
  return (
    <div className="hero">
      <div className="wrap">
        <p className="hero-eyebrow">A GLOBAL TRADING COMMUNITY</p>
        <h1>The Complete Trading<em>ECOSYSTEM</em>for Modern Traders</h1>
        <p className="hero-copy">Atlas is a global trading community designed to help aspiring traders develop the skills, discipline, and mindset required to achieve long-term profitability and funded trader success.</p>
        <div className="hero-actions">
          <Link className="btn btn-amber" href="/pricing">Join Atlas Now</Link>
          <Link className="btn btn-ghost" href="/demo">Watch Free Training</Link>
        </div>
        <div className="hero-checks">
          <div className="hero-check"><svg viewBox="0 0 11 9" fill="none"><path d="M0 4 L4 9 L11 0" stroke="#24c88a" strokeWidth="1.8" strokeLinecap="round" /></svg>Daily Live Market Analysis</div>
          <div className="hero-check"><svg viewBox="0 0 11 9" fill="none"><path d="M0 4 L4 9 L11 0" stroke="#24c88a" strokeWidth="1.8" strokeLinecap="round" /></svg>Trade Journal &amp; Analytics</div>
          <div className="hero-check"><svg viewBox="0 0 11 9" fill="none"><path d="M0 4 L4 9 L11 0" stroke="#24c88a" strokeWidth="1.8" strokeLinecap="round" /></svg>Funded Trader Roadmap</div>
          <div className="hero-check"><svg viewBox="0 0 11 9" fill="none"><path d="M0 4 L4 9 L11 0" stroke="#24c88a" strokeWidth="1.8" strokeLinecap="round" /></svg>Global Trading Community</div>
        </div>
        <div className="hero-badge"><b>128,326+</b><span>TRADERS WORLDWIDE</span></div>
      </div>
      {/* sits outside .wrap so it can occupy the hero's right half outright,
          rather than being scoped to the centred copy column. Same amber
          palette (#D99405 dots/outline/grid, #05070c ocean) as the
          Originkit hero-24 globe preview at /originkit-preview, plus real
          3D circulating trade routes riding on the globe's own rotation. */}
      <div className="hero-map">
        <GlobeRoutes />
      </div>
    </div>
  );
}
