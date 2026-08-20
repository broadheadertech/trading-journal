import Link from 'next/link';

/* ---------- hero world map (graticule + routes + exchange nodes) ----------
   Ported from the inline <script> in uiux/atlass.html. The generation is
   fully deterministic, so it is evaluated during render instead of in an
   effect — no client boundary needed. */

const LAND: [number, number, number, number][] = [
  [30, 60, 120, 55], [50, 120, 90, 70], [105, 255, 60, 110], [255, 75, 60, 45], [240, 125, 120, 120],
  [300, 60, 120, 50], [350, 120, 120, 90], [240, 255, 80, 110], [400, 95, 120, 110], [430, 60, 150, 60],
  [470, 180, 110, 90], [520, 250, 70, 60], [560, 300, 60, 50], [195, 40, 60, 30],
];

const ROUTES_ARC: [string, string][] = [
  ['M192.6 71.6 C232.8 19.6 277.6 8 327 36.8', '#3fd0c9'],
  ['M327 85.9 C332.8 83.4 338.1 84.9 343 90.4', '#d6459c'],
  ['M342.9 91.6 C379 99.6 407.2 126.4 427.6 171.9', '#3fd0c9'],
  ['M427.6 171.8 C464.5 178 493.9 203.7 515.8 248.9', '#3fd0c9'],
  ['M515.8 248.9 C513.7 221 520 198.5 534.7 181.2', '#d6459c'],
  ['M534.7 181.2 C544.4 152.8 559.9 138.4 581.1 138', '#3fd0c9'],
  ['M516.2 248.9 C532.8 307.5 561.5 345.3 602.3 362.4', '#3fd0c9'],
  ['M192.6 121.9 C185.4 203.9 202 272.9 242.5 328.9', '#d6459c'],
  ['M192.6 121.9 C319.6 259.8 449.1 265.2 581 138', '#3fd0c9'],
];

const NODES: [number, number, string, string, 'start' | 'end'][] = [
  [187.7, 114.5, 'NYSE', '40.7N', 'start'], [322, 79.7, 'LSE', '51.5N', 'start'], [338, 84.2, 'FWB', '50.1N', 'start'],
  [576.1, 130.6, 'TSE', '35.7N', 'end'], [529.8, 173.8, 'HKEX', '22.3N', 'end'], [510.8, 241.5, 'SGX', '1.3N', 'end'],
  [597, 355, 'ASX', '33.9S', 'end'], [422.7, 164.4, 'DFM', '25.2N', 'start'], [237.5, 321.5, 'B3', '23.5S', 'start'],
];

function landDots() {
  const dots: { x: number; y: number }[] = [];
  for (let b = 0; b < LAND.length; b++) {
    const r = LAND[b];
    for (let x = r[0]; x < r[0] + r[2]; x += 6) {
      for (let y = r[1]; y < r[1] + r[3]; y += 6) {
        let n = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
        n = n - Math.floor(n);
        if (n < 0.55) continue;
        dots.push({ x, y });
      }
    }
  }
  return dots;
}

function HeroMapSvg() {
  const meridians = Array.from({ length: 11 }, (_, i) => i * 65.42);
  const parallels = Array.from({ length: 7 }, (_, i) => 1.6 + i * 72.2);
  const dots = landDots();

  return (
    <svg viewBox="0 0 655 418" id="heromap" fill="none" aria-hidden="true">
      {/* graticule — 11 meridians / 7 parallels, exactly as spaced in Figma */}
      {meridians.map((x, i) => (
        <line key={`m${i}`} x1={x} y1={1.6} x2={x} y2={416.8} stroke="#111823" strokeWidth={0.49} />
      ))}
      {parallels.map((y, i) => (
        <line key={`p${i}`} x1={0} y1={y} x2={654.2} y2={y} stroke="#111823" strokeWidth={0.49} />
      ))}

      {/* landmass dot field (procedural — the Figma landmass is a 57KB dot-matrix path) */}
      <g fill="#869aac" opacity=".6">
        {dots.map((d, i) => (
          <rect key={`d${i}`} x={d.x} y={d.y} width={1.6} height={1.6} />
        ))}
      </g>

      {/* great-circle routes (exact curves from Figma, translated into map space) */}
      {ROUTES_ARC.map((r, i) => (
        <path key={`r${i}`} d={r[0]} stroke={r[1]} strokeWidth={0.54} opacity={0.5} fill="none" />
      ))}

      {/* exchange nodes — exact positions, tickers and latitudes from Figma */}
      {NODES.map((n, i) => {
        const px = n[0];
        const py = n[1];
        const anchor = n[4];
        const tx = anchor === 'start' ? px + 10.4 : px - 11.5;
        return (
          <g key={`n${i}`}>
            <rect x={px} y={py} width={9.8} height={14.8} rx={1.5} fill="none" stroke="#d99405" strokeWidth={0.49} opacity={0.28} />
            <rect x={px + 3.6} y={py + 5.3} width={2.7} height={4.1} fill="#d99405" opacity={0.49} />
            <text x={tx} y={py + 3} textAnchor={anchor} fill="#e9edf3" fontFamily="'IBM Plex Mono',monospace" fontSize="4.93">{n[2]}</text>
            <text x={tx} y={py + 13.7} textAnchor={anchor} fill="#5b6675" fontFamily="'IBM Plex Mono',monospace" fontSize="4.44">{n[3]}</text>
          </g>
        );
      })}
    </svg>
  );
}

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
        <div className="hero-map"><HeroMapSvg /></div>
      </div>
    </div>
  );
}
