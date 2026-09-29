import Link from 'next/link';

/* The five leaks. Held as data, not as hand-written rows: the share-of-total
   bar, the legend swatches and the total all derive from these amounts, so the
   segment widths cannot silently disagree with the figures beside them. */
const LEAKS = [
  { name: 'Overtrading', amount: 1420 },
  { name: 'Poor Risk Management', amount: 890 },
  { name: 'Emotional Decision Making', amount: 540 },
  { name: 'FOMO Entries', amount: 280 },
  { name: 'No Stop Loss', amount: 140 },
];
const LEAK_TOTAL = LEAKS.reduce((s, l) => s + l.amount, 0);

/* Opacity steps 100% -> 32%, largest to smallest. Computed from the index so
   adding a sixth leak cannot leave it with no step of its own. */
const leakAlpha = (i: number) => 1 - (0.68 * i) / (LEAKS.length - 1);

/* Strong days are the ones at or above the score itself; the rest render in
   the faded green, so the chart agrees with the 78 next to it. */
const WEEK = [
  { d: 'M', v: 62 }, { d: 'T', v: 38 }, { d: 'W', v: 77 }, { d: 'T', v: 100 },
  { d: 'F', v: 46 }, { d: 'S', v: 92 }, { d: 'S', v: 85 },
];
const DISCIPLINE = 78;

const EQUITY = 'M0 44 L18 37 L36 40 L54 30 L72 32 L90 21 L108 25 L126 12 L144 16 L162 5 L180 0';

const money = (n: number) => `−$${n.toLocaleString('en-US')}`;

export default function DashboardPreview() {
  return (
    <div className="sec01" style={{ borderTop: '1px solid var(--line)' }}>
      <div className="wrap">
        <div className="sechead">
          <div>
            <p className="eyebrow">CAPABILITY MAP</p>
            <h2 className="h2" style={{ marginTop: '13px' }}>Everything You Need To<br />Become A Better Trader</h2>
          </div>
          <div className="right"><p className="lede">Atlas combines education, performance analytics, journaling, discipline tracking, and community support into one powerful platform.</p></div>
        </div>

        <div className="cap-bento">
          {/* ---- leaks: tall, left ---- */}
          <div className="tile tile-leaks">
            <p className="tlabel">FIND YOUR LEAKS</p>
            <p className="thero neg"><b>{money(LEAK_TOTAL)}</b></p>
            <p className="tsub">30-DAY TOTAL · LEAKS RANKED BY $ IMPACT</p>

            {/* One bar, five segments proportional to dollar value — the share
                of the total each pattern accounts for, which five separate
                tracks could not show. */}
            <div className="sharebar" aria-hidden="true">
              {LEAKS.map((l, i) => (
                <i key={l.name} style={{ flex: l.amount, background: `rgba(240,72,94,${leakAlpha(i).toFixed(3)})` }} />
              ))}
            </div>

            <div className="legend">
              {LEAKS.map((l, i) => (
                <div className="lrow" key={l.name}>
                  <span className="swatch" style={{ background: `rgba(240,72,94,${leakAlpha(i).toFixed(3)})` }} />
                  <span className="lname">{l.name}</span>
                  <span className="lval">{money(l.amount)}</span>
                </div>
              ))}
            </div>

            <p className="tnote">Every costly pattern ranked by dollar impact. Revenge trading, overtrading, FOMO — each measured in real money lost.</p>
          </div>

          {/* ---- discipline: wide, top right ---- */}
          <div className="tile tile-disc">
            <div className="discgrid">
              <div className="discnum">
                <p className="tlabel">TRACK YOUR DISCIPLINE</p>
                {/* the ring is gone — the number carries the score now */}
                <p className="thero pos"><b>{DISCIPLINE}</b><i>/100</i></p>
                <p className="tsub">30-DAY DISCIPLINE SCORE</p>
              </div>

              <div className="week">
                {WEEK.map((w, i) => (
                  <div key={i}>
                    <span className="wtrack">
                      <i className={w.v >= DISCIPLINE ? 'strong' : undefined} style={{ height: `${w.v}%` }} />
                    </span>
                    <span className="wday">{w.d}</span>
                  </div>
                ))}
              </div>
            </div>

            <p className="tnote">Your behavioral health score, emotional pressure tracking, and session-by-session discipline monitoring.</p>
          </div>

          {/* ---- edge curve: bottom middle ---- */}
          <div className="tile tile-edge">
            <p className="tlabel">MEASURE YOUR EDGE</p>
            <div className="edge">
              <div className="kpi"><b className="pos">93%</b><span>WIN RATE</span></div>
              <div className="kpi"><b>2.14</b><span>PROFIT FACTOR</span></div>
            </div>

            <div className="curve">
              <span className="ctag">EQUITY CURVE · 30D</span>
              <svg viewBox="0 0 180 48" width="100%" height="100%" fill="none" preserveAspectRatio="none" aria-hidden="true">
                <defs><linearGradient id="capfill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor="#24c88a" stopOpacity=".10" /><stop offset="1" stopColor="#24c88a" stopOpacity="0" />
                </linearGradient></defs>
                <path d={`${EQUITY} L180 48 L0 48 Z`} fill="url(#capfill)" />
                {/* pathLength normalises the dash maths to 100 regardless of
                    the real arc length, so the draw-on works at any width */}
                <path className="cline" d={EQUITY} pathLength={100} stroke="#24c88a" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </div>

          {/* ---- risk stats: bottom right ---- */}
          <div className="tile tile-risk">
            <div className="riskrows">
              <div><span>SHARPE</span><b>1.84</b></div>
              <div><span>MAX DD</span><b>8.2%</b></div>
              <div><span>WORST DAY</span><b className="neg">{money(4230)}</b></div>
            </div>
            <p className="tnote">Win rate, profit factor, equity curve, symbol breakdown — all the metrics that matter, computed automatically.</p>
          </div>
        </div>

        <Link className="btn btn-amber" style={{ marginTop: '28px' }} href="/pricing">{'Start Free  · See Your Own Dashboard'}
          <svg className="arrow-r" viewBox="0 0 12 9" fill="none"><path d="M0 4.5 H12 M12 4.5 L7 0 M12 4.5 L7 9" stroke="#0a0a0a" strokeWidth="1.7" strokeLinecap="round" /></svg>
        </Link>
      </div>
    </div>
  );
}
