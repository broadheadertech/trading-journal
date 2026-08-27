'use client';

import { useEffect, useRef } from 'react';

/* Deep 3D floating cards for the "Connect / Discover / Build Consistency"
   row. All copy, labels and data values below are verbatim from the
   original HowItWorks.tsx markup — the redesign is the 3D shell (tilt,
   float, edges, badge), the internal micro-demo structure, and the looping
   entrance/animation timing around that existing content.

   The tilt/float/bar/spinner/scan-line/shimmer/badge motion is done entirely
   in CSS: each card's internal loop is a set of infinite @keyframes sharing
   one period, started in phase by toggling `is-loop` at the same moment (the
   same "declare paused, flip to running" pattern used by ScrollReveal and
   the other landing sections). The one thing CSS cannot do — rewriting
   digits as a value counts up — is driven by a small rAF loop that computes
   phase = elapsed % period and writes text directly to refs, matching the
   approach already used in StatCountUp / InsightChart / DashboardScene. */

/* Card 2 and Card 3 verbatim data, exactly as authored in the original
   markup (see git history of HowItWorks.tsx) — only the visual encoding
   (gradient fill, count-up, bar height mapping) is new. */
const LEAKS = [
  { label: 'revenge trading', value: 1420, width: 100, color: '#F0485E' },
  { label: 'overtrading', value: 890, width: 62, color: '#F0485E' },
  { label: 'late session', value: 540, width: 38, color: '#D99405' },
  { label: 'no stop loss', value: 140, width: 12, color: '#D99405' },
];

const WEEKS = [
  { label: 'W1', score: 62, height: 38, color: 'rgba(36,200,138,.55)' },
  { label: 'W2', score: 71, height: 54, color: 'rgba(36,200,138,.70)' },
  { label: 'W3', score: 78, height: 72, color: 'rgba(36,200,138,.85)' },
  { label: 'W4', score: 86, height: 92, color: '#24C88A' },
];

const CARD2_PERIOD = 5900;
const CARD3_PERIOD = 6100;

// each card's internal loop starts 0.4s after its own entrance finishes
const LOOP_START = [0.05 + 0.75 + 0.4, 0.2 + 0.75 + 0.4, 0.35 + 0.75 + 0.4].map((s) => s * 1000);

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

function fmt(n: number, prefix: string, suffix: string) {
  return prefix + Math.round(n).toLocaleString('en-US') + suffix;
}

export default function HowItWorksCards() {
  const stageRef = useRef<HTMLDivElement>(null);
  const card1Ref = useRef<HTMLDivElement>(null);
  const card2Ref = useRef<HTMLDivElement>(null);
  const card3Ref = useRef<HTMLDivElement>(null);
  const cardRefs = [card1Ref, card2Ref, card3Ref];

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) return; // base CSS already renders every card at its finished state

    const timers: ReturnType<typeof setTimeout>[] = [];
    let raf2 = 0;
    let raf3 = 0;

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          io.disconnect();
          stage.classList.add('is-in');

          cardRefs.forEach((ref, i) => {
            const el = ref.current;
            if (!el) return;
            timers.push(
              setTimeout(() => {
                el.classList.add('is-loop');
                if (i === 1) raf2 = requestAnimationFrame((t) => tickCard2(el, t, t));
                if (i === 2) raf3 = requestAnimationFrame((t) => tickCard3(el, t, t));
              }, LOOP_START[i]),
            );
          });
        }
      },
      { threshold: 0.2 },
    );

    io.observe(stage);

    function tickCard2(el: HTMLElement, now: number, start: number) {
      const phase = (now - start) % CARD2_PERIOD;
      const values = el.querySelectorAll<HTMLElement>('.hiw3d-leak-value');
      values.forEach((node, i) => {
        const from = 320 + i * 460;
        const p = Math.min(1, Math.max(0, (phase - from) / 950));
        node.textContent = fmt(easeOutCubic(p) * LEAKS[i].value, '−$', '');
      });
      raf2 = requestAnimationFrame((t) => tickCard2(el, t, start));
    }

    function tickCard3(el: HTMLElement, now: number, start: number) {
      const phase = (now - start) % CARD3_PERIOD;
      const values = el.querySelectorAll<HTMLElement>('.hiw3d-weekval');
      values.forEach((node, i) => {
        const from = 280 + i * 390;
        const p = Math.min(1, Math.max(0, (phase - from) / 720));
        node.textContent = fmt(easeOutCubic(p) * WEEKS[i].score, '', '%');
      });
      raf3 = requestAnimationFrame((t) => tickCard3(el, t, start));
    }

    return () => {
      io.disconnect();
      timers.forEach(clearTimeout);
      cancelAnimationFrame(raf2);
      cancelAnimationFrame(raf3);
      // leave every number at the value the server rendered, not mid-count
      cardRefs[1].current?.querySelectorAll<HTMLElement>('.hiw3d-leak-value').forEach((n, i) => {
        n.textContent = `−$${LEAKS[i].value.toLocaleString('en-US')}`;
      });
      cardRefs[2].current?.querySelectorAll<HTMLElement>('.hiw3d-weekval').forEach((n, i) => {
        n.textContent = `${WEEKS[i].score}%`;
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="hiw hiw3d-stage" ref={stageRef}>
      {/* ---------- card 1 · connect ---------- */}
      <div>
        <div className="hiw3d-card hiw3d-c1" ref={card1Ref}>
          <div className="hiw3d-badge">01</div>
          <div className="hiw3d-panel">
            <span className="hiw3d-edge-l" />
            <span className="hiw3d-edge-b" />
            <div className="hiw3d-face hiw3d-face1">
              <div className="hiw3d-drop">
                <span className="hiw3d-arrow">
                  <svg width="12" height="14" viewBox="0 0 12 14" fill="none"><path d="M6 0 V14 M6 0 L0 6 M6 0 L12 6" stroke="#d99405" strokeWidth="1.6" strokeLinecap="round" /></svg>
                </span>
                <small>trades_q4_2026.csv</small>
              </div>

              <div className="hiw3d-rows">
                <div className="hiw3d-row hiw3d-row1">
                  <span className="hiw3d-icon"><i className="hiw3d-spinner" /><svg className="hiw3d-tick" width="9" height="7" viewBox="0 0 9 7" fill="none"><path d="M0 3.5 L3 7 L9 0" stroke="#24c88a" strokeWidth="1.4" /></svg></span>
                  <span>Broker detected: IC Markets</span>
                </div>
                <div className="hiw3d-row hiw3d-row2">
                  <span className="hiw3d-icon"><i className="hiw3d-spinner" /><svg className="hiw3d-tick" width="9" height="7" viewBox="0 0 9 7" fill="none"><path d="M0 3.5 L3 7 L9 0" stroke="#24c88a" strokeWidth="1.4" /></svg></span>
                  <span>Normalizing 482 fills</span>
                </div>
                <div className="hiw3d-row hiw3d-row3">
                  <span className="hiw3d-icon"><i className="hiw3d-spinner" /><svg className="hiw3d-tick" width="9" height="7" viewBox="0 0 9 7" fill="none"><path d="M0 3.5 L3 7 L9 0" stroke="#24c88a" strokeWidth="1.4" /></svg></span>
                  <span>Computing 50+ metrics</span>
                </div>
              </div>

              <div className="hiw3d-progress"><i /></div>
            </div>
          </div>
        </div>
        <h4>Connect Your Trading Data</h4>
        <p>40+ brokers supported. CSV or API. Auto-detected, auto-normalized. Takes 60 seconds.</p>
      </div>

      {/* ---------- card 2 · discover ---------- */}
      <div>
        <div className="hiw3d-card hiw3d-c2" ref={card2Ref}>
          <div className="hiw3d-badge">02</div>
          <div className="hiw3d-panel">
            <span className="hiw3d-edge-l" />
            <span className="hiw3d-edge-b" />
            <div className="hiw3d-face hiw3d-face2">
              <span className="hiw3d-scan" />
              <p className="hiw3d-hd">RANKED BY $ IMPACT</p>
              {LEAKS.map((l) => (
                <div className="hiw3d-leak-row" key={l.label}>
                  <div className="hiw3d-leak-top">
                    <span>{l.label}</span>
                    <b className="hiw3d-leak-value" style={{ color: l.color }}>{`−$${l.value.toLocaleString('en-US')}`}</b>
                  </div>
                  <div className="hiw3d-leak-bar"><i style={{ ['--fill' as string]: l.color, width: `${l.width}%` }} /></div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <h4>Discover Costly Habits</h4>
        <p>20+ patterns detected and ranked by dollar impact — revenge trading, overtrading, bad sessions, with evidence.</p>
      </div>

      {/* ---------- card 3 · build consistency ---------- */}
      <div>
        <div className="hiw3d-card hiw3d-c3" ref={card3Ref}>
          <div className="hiw3d-badge">03</div>
          <div className="hiw3d-panel">
            <span className="hiw3d-edge-l" />
            <span className="hiw3d-edge-b" />
            <div className="hiw3d-face hiw3d-face3">
              <p className="hiw3d-hd">DISCIPLINE · 4 WEEKS</p>
              <div className="hiw3d-weekbars">
                <span className="hiw3d-score-badge">+24 pts ↑</span>
                {WEEKS.map((w, i) => (
                  <div className="hiw3d-weekbar" key={w.label}>
                    <span className="hiw3d-weekval">{w.score}%</span>
                    <i className="hiw3d-weekfill" style={{ ['--h' as string]: `${w.height}%`, ['--fill' as string]: w.color }} />
                    {i === 3 && <span className="hiw3d-w4glow" />}
                    <b>{w.label}</b>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        <h4>Build Consistency</h4>
        <p>Set rules, track compliance, run what-if simulations. Watch your discipline score climb.</p>
      </div>
    </div>
  );
}
