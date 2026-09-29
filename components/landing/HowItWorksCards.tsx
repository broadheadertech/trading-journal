'use client';

import { useEffect, useRef } from 'react';

/* "Connect / Discover / Build Consistency", as a rising equity curve with a
   checkpoint above each card. All copy, labels and data values are verbatim
   from the previous version — what changed is the shell: the 3D tilt, the
   floating idle loop, the extruded card edges and the 01/02/03 badges are all
   gone, and with them the blur the rotateX/rotateY was causing.

   Everything now plays exactly once on scroll-enter. The old version ran three
   infinite @keyframes loops plus two permanent rAF loops rewriting digits
   forever; the numbers were therefore never reliably at their real values
   (measured live: the four discipline bars rendered 1px tall and the labels
   read "50% 0% 0% 0%" mid-cycle). */

const LEAKS = [
  { label: 'revenge trading', value: 1420, width: 100, color: '#F0485E' },
  { label: 'overtrading', value: 890, width: 62, color: '#F0485E' },
  { label: 'late session', value: 540, width: 38, color: '#D99405' },
  { label: 'no stop loss', value: 140, width: 12, color: '#D99405' },
];

const WEEKS = [
  { label: 'W1', score: 62 },
  { label: 'W2', score: 71 },
  { label: 'W3', score: 78 },
  { label: 'W4', score: 86 },
];

/* The three checkpoints, in card order. `y` is the curve's height at that
   point in viewBox units, which equal CSS pixels here because the SVG is
   160px tall with preserveAspectRatio="none". */
const CHECKPOINTS = [
  { label: 'Drawdown', y: 112, color: '#D99405' },
  { label: 'Recovery', y: 72, color: '#D99405' },
  { label: 'New high', y: 26, color: '#24C88A' },
];

/* Authored at 1000 wide; preserveAspectRatio="none" stretches it to the
   container, so every x is a fixed percentage of the width. */
const CURVE = 'M0 122 L70 132 L166 112 L250 104 L330 110 L420 88 L500 72 L600 66 L700 48 L833 26 L1000 10';

const COUNT_MS = 900;
const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

export default function HowItWorksCards() {
  const stageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    // base CSS already renders every figure at its finished value
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let raf = 0;
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          io.disconnect();
          stage.classList.add('is-in');

          const leaks = stage.querySelectorAll<HTMLElement>('.hiwc-leakval');
          const weeks = stage.querySelectorAll<HTMLElement>('.hiwc-weekval');
          const start = performance.now();

          /* One pass, then stop — the elements keep whatever the last frame
             wrote, which is the real value. */
          const tick = (now: number) => {
            const t = now - start;
            let done = true;
            leaks.forEach((n, i) => {
              const p = Math.min(1, Math.max(0, (t - (700 + i * 110)) / COUNT_MS));
              if (p < 1) done = false;
              n.textContent = `−$${Math.round(easeOutCubic(p) * LEAKS[i].value).toLocaleString('en-US')}`;
            });
            weeks.forEach((n, i) => {
              const p = Math.min(1, Math.max(0, (t - (900 + i * 110)) / COUNT_MS));
              if (p < 1) done = false;
              n.textContent = `${Math.round(easeOutCubic(p) * WEEKS[i].score)}%`;
            });
            if (!done) raf = requestAnimationFrame(tick);
          };
          raf = requestAnimationFrame(tick);
        }
      },
      { threshold: 0.2 },
    );

    io.observe(stage);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
      // never leave a number frozen mid-count
      stage.querySelectorAll<HTMLElement>('.hiwc-leakval').forEach((n, i) => {
        n.textContent = `−$${LEAKS[i].value.toLocaleString('en-US')}`;
      });
      stage.querySelectorAll<HTMLElement>('.hiwc-weekval').forEach((n, i) => {
        n.textContent = `${WEEKS[i].score}%`;
      });
    };
  }, []);

  return (
    <div className="hiwc" ref={stageRef}>
      {/* ---------- the curve ---------- */}
      {/* Hidden below 900px, where the rail inside the card column takes over.
          aria-hidden throughout: it is a decorative restatement of the three
          card headings. */}
      <div className="hiwc-curve" aria-hidden="true">
        <svg viewBox="0 0 1000 160" preserveAspectRatio="none" fill="none">
          <defs>
            <linearGradient id="hiwcLine" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="#D99405" /><stop offset="1" stopColor="#24C88A" />
            </linearGradient>
            <linearGradient id="hiwcArea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#24C88A" stopOpacity=".14" /><stop offset="1" stopColor="#24C88A" stopOpacity="0" />
            </linearGradient>
          </defs>
          {/* where the curve started, so the climb has something to read against */}
          <path className="hiwc-base" d="M0 122 H1000" stroke="#131E2C" strokeWidth="1" strokeDasharray="4 5" vectorEffect="non-scaling-stroke" />
          <path className="hiwc-area" d={`${CURVE} L1000 160 L0 160 Z`} fill="url(#hiwcArea)" />
          {/* pathLength normalises the dash maths to 100 regardless of the real
              arc length, so the draw-on works at any width */}
          <path className="hiwc-line" d={CURVE} pathLength={100} stroke="url(#hiwcLine)" strokeWidth="2.2"
            strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        </svg>

        {CHECKPOINTS.map((c, i) => (
          <span className={`hiwc-cp hiwc-cp${i + 1}`} key={c.label} style={{ ['--cp' as string]: c.color, top: `${c.y}px` }}>
            <em>{c.label}</em>
          </span>
        ))}
      </div>

      {/* ---------- cards ---------- */}
      <div className="hiwc-cards">
        {/* ----- connect ----- */}
        <div className="hiwc-card" style={{ ['--cp' as string]: CHECKPOINTS[0].color }}>
          {/* only rendered below 900px, where it sits on the vertical rail */}
          <span className="hiwc-raildot" aria-hidden="true"><em>{CHECKPOINTS[0].label}</em></span>

          <div className="hiwc-vis">
            <div className="hiwc-drop">
              <span className="hiwc-arrow">
                <svg width="12" height="14" viewBox="0 0 12 14" fill="none"><path d="M6 0 V14 M6 0 L0 6 M6 0 L12 6" stroke="#d99405" strokeWidth="1.6" strokeLinecap="round" /></svg>
              </span>
              <small>trades_q4_2026.csv</small>
            </div>

            <div className="hiwc-rows">
              {['Broker detected: IC Markets', 'Normalizing 482 fills', 'Computing 50+ metrics'].map((t, i) => (
                <div className={`hiwc-row hiwc-row${i + 1}`} key={t}>
                  <span className="hiwc-tick">
                    <svg width="9" height="7" viewBox="0 0 9 7" fill="none"><path d="M0 3.5 L3 7 L9 0" stroke="#24c88a" strokeWidth="1.4" /></svg>
                  </span>
                  <span>{t}</span>
                </div>
              ))}
            </div>
          </div>

          <h4>Connect Your Trading Data</h4>
          <p>40+ brokers supported. CSV or API. Auto-detected, auto-normalized. Takes 60 seconds.</p>
        </div>

        {/* ----- discover ----- */}
        <div className="hiwc-card" style={{ ['--cp' as string]: CHECKPOINTS[1].color }}>
          <span className="hiwc-raildot" aria-hidden="true"><em>{CHECKPOINTS[1].label}</em></span>

          <div className="hiwc-vis">
            <p className="hiwc-hd">RANKED BY $ IMPACT</p>
            {LEAKS.map((l) => (
              <div className="hiwc-leak" key={l.label}>
                <div className="hiwc-leaktop">
                  <span>{l.label}</span>
                  <b className="hiwc-leakval" style={{ color: l.color }}>{`−$${l.value.toLocaleString('en-US')}`}</b>
                </div>
                <div className="hiwc-leakbar"><i style={{ background: l.color, width: `${l.width}%` }} /></div>
              </div>
            ))}
          </div>

          <h4>Discover Costly Habits</h4>
          <p>20+ patterns detected and ranked by dollar impact — revenge trading, overtrading, bad sessions, with evidence.</p>
        </div>

        {/* ----- build consistency ----- */}
        <div className="hiwc-card" style={{ ['--cp' as string]: CHECKPOINTS[2].color }}>
          <span className="hiwc-raildot" aria-hidden="true"><em>{CHECKPOINTS[2].label}</em></span>

          <div className="hiwc-vis">
            <p className="hiwc-hd">DISCIPLINE · 4 WEEKS</p>
            <div className="hiwc-weeks">
              {WEEKS.map((w) => (
                <div className="hiwc-week" key={w.label}>
                  <span className="hiwc-weekval">{w.score}%</span>
                  {/* height comes from the percentage itself — the old version
                      carried a separate hand-typed height per week that could
                      disagree with the number printed above it */}
                  <span className="hiwc-weektrack"><i style={{ height: `${w.score}%` }} /></span>
                  <b>{w.label}</b>
                </div>
              ))}
            </div>
          </div>

          <h4>Build Consistency</h4>
          <p>Set rules, track compliance, run what-if simulations. Watch your discipline score climb.</p>
        </div>
      </div>
    </div>
  );
}
