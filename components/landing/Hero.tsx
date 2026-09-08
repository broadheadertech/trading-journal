import Link from 'next/link';
import GlobeRoutes from './GlobeRoutes';

export default function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* Dark overlay so copy stays readable */}
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-[var(--background)]/80 via-[var(--background)]/70 to-[var(--background)]" />
      {/* Northern Lights aurora ambient pattern */}
      <div className="aurora-bg" />
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/3 left-1/4 w-[500px] h-[400px] bg-pink-500 opacity-[0.06] rounded-full blur-[140px]" />
        <div className="absolute top-1/4 right-1/3 w-[420px] h-[360px] bg-cyan-400 opacity-[0.05] rounded-full blur-[130px]" />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[350px] bg-emerald-400 opacity-[0.04] rounded-full blur-[120px]" />
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
      </div>
    </section>
  );
}