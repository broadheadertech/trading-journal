'use client';

import { ReactNode, useEffect, useRef } from 'react';

/* 3D stage for the demo page's dashboard row. It wraps the existing browser
   mockup — never restructures it — and adds two breakout cards that hang past
   the frame on their own Z-planes. The entrance, count-ups, curve draw and
   heatmap pop are driven from here; the sway and bobs are pure CSS. */

const NUM = /^([^\p{L}\p{N}]*)([\d,]+(?:\.\d+)?)(.*)$/u;

const COUNT_DELAY = 400;
const COUNT_DURATION = 1400;

type Target = {
  el: HTMLElement;
  prefix: string;
  suffix: string;
  end: number;
  decimals: number;
  grouped: boolean;
  original: string;
};

function parse(el: HTMLElement | null): Target | null {
  if (!el) return null;
  const original = el.textContent ?? '';
  const m = original.trim().match(NUM);
  if (!m) return null;
  const [, prefix, num, suffix] = m;
  const end = parseFloat(num.replace(/,/g, ''));
  if (!Number.isFinite(end)) return null;
  return {
    el,
    prefix,
    suffix,
    end,
    decimals: num.includes('.') ? num.split('.')[1].length : 0,
    grouped: num.includes(','),
    original,
  };
}

function render(t: Target, value: number) {
  const text = t.grouped
    ? value.toLocaleString('en-US', {
        minimumFractionDigits: t.decimals,
        maximumFractionDigits: t.decimals,
      })
    : value.toFixed(t.decimals);
  t.el.textContent = t.prefix + text + t.suffix;
}

export default function DashboardScene({ children }: { children: ReactNode }) {
  const stageRef = useRef<HTMLDivElement>(null);
  const cardValueRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const root = stageRef.current;
    if (!root) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // per-cell stagger for the heatmap pop
    root.querySelectorAll<HTMLElement>('.heat i').forEach((cell, i) => {
      cell.style.animationDelay = `${(1.1 + i * 0.04).toFixed(2)}s`;
    });

    // the equity stroke needs its own length before it can draw itself on
    const stroke = root.querySelector<SVGPathElement>('.win svg path[stroke]');
    if (stroke && !reduced) {
      const len = stroke.getTotalLength();
      stroke.style.setProperty('--dash-len', String(len));
      stroke.style.strokeDasharray = String(len);
    }

    // reduced motion: everything already renders at its resting state, so
    // there is nothing to observe and no values to animate
    if (reduced) return;

    const targets = [
      ...Array.from(root.querySelectorAll<HTMLElement>('.kpis .tile em')),
      cardValueRef.current,
    ]
      .map(parse)
      .filter((t): t is Target => t !== null);

    let raf = 0;
    let startedAt = 0;

    const tick = (now: number) => {
      if (!startedAt) startedAt = now;
      const elapsed = Math.min(now - startedAt, COUNT_DURATION);
      const p = elapsed / COUNT_DURATION;
      const eased = 1 - Math.pow(1 - p, 3);

      for (const t of targets) {
        const scale = Math.pow(10, t.decimals);
        render(t, Math.round(eased * t.end * scale) / scale);
      }

      if (elapsed < COUNT_DURATION) {
        raf = requestAnimationFrame(tick);
      } else {
        // settle on the original strings so they are character-identical
        for (const t of targets) t.el.textContent = t.original;
      }
    };

    let countTimer: ReturnType<typeof setTimeout>;

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          io.disconnect();
          root.classList.add('is-in');
          for (const t of targets) render(t, 0);
          countTimer = setTimeout(() => {
            raf = requestAnimationFrame(tick);
          }, COUNT_DELAY);
        }
      },
      { threshold: 0.2 },
    );

    io.observe(root);

    return () => {
      io.disconnect();
      clearTimeout(countTimer);
      cancelAnimationFrame(raf);
      for (const t of targets) t.el.textContent = t.original;
    };
  }, []);

  return (
    <div className="dash-stage" ref={stageRef}>
      <div className="dash-enter">
        <div className="dash-scene">
          {children}

          <div className="dash-card dash-c1" aria-hidden="true">
            <div className="dash-card-in">
              <b>NET P&amp;L · 30D</b>
              <em ref={cardValueRef} style={{ color: 'var(--green)' }}>+$4,230</em>
            </div>
          </div>

          <div className="dash-card dash-c2" aria-hidden="true">
            <div className="dash-card-in">
              <b>DISCIPLINE SCORE</b>
              <em style={{ color: 'var(--amber)' }}>78/100</em>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
