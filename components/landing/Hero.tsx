import Link from 'next/link';
import GlobeRoutes from './GlobeRoutes';

export default function Hero() {
  return (
    <div className="hero">
<<<<<<< HEAD
      <div className="wrap">
=======
      {/* Abstract ambient streaks, parented to .hero rather than the globe
          stage — the empty space they fill is the section's outer corners.
          Purely decorative, and dropped entirely below 480px. */}
      <div className="hero-beam hero-beam-1" aria-hidden="true" />
      <div className="hero-beam hero-beam-2" aria-hidden="true" />

      <div className="hero-content">
>>>>>>> 328174d (adjusted globe 3d hero structure from flat to underneath style)
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
<<<<<<< HEAD
        <div className="hero-badge"><b>128,326+</b><span>TRADERS WORLDWIDE</span></div>
      </div>
      {/* sits outside .wrap so it can occupy the hero's right half outright,
          rather than being scoped to the centred copy column. Same amber
          palette (#D99405 dots/outline/grid, #05070c ocean) as the
          Originkit hero-24 globe preview at /originkit-preview, plus real
          3D circulating trade routes riding on the globe's own rotation. */}
      <div className="hero-map">
        <GlobeRoutes />
=======
      </div>

      {/* Globe sits centred below the copy instead of occupying the hero's
          right half. The stage is width-capped (not full-bleed) so the two
          float cards' small fixed insets land on the globe's edges — same
          amber palette (#D99405 dots/outline/grid, #05070c ocean) as the
          Originkit hero-24 globe preview at /originkit-preview, plus the
          real 3D circulating trade routes, both carried over unchanged. */}
      <div className="hero-globe-stage">
        <div className="hero-globe-glow" aria-hidden="true" />
        <div className="hero-globe-container">
          <GlobeRoutes />
        </div>

        {/* the existing trust stat, moved out of the hero's bottom-right
            corner into a card clipping the globe's upper-left edge */}
        <div className="float-card float-card-top">
          <div className="hero-badge"><b>128,326+</b><span>TRADERS WORLDWIDE</span></div>
        </div>

        {/* .avatar is the testimonial carousel's own badge, reused as-is */}
        <div className="float-card float-card-bottom">
          <p className="float-card-quote">&#8220;Finally stopped revenge trading.&#8221;</p>
          <div className="float-card-by">
            <div className="avatar">MR</div>
            <div><b>Marcus R.</b><span>Futures Trader</span></div>
          </div>
        </div>
>>>>>>> 328174d (adjusted globe 3d hero structure from flat to underneath style)
      </div>
    </div>
  );
}
