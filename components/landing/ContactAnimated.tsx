'use client';

import { useEffect } from 'react';

/* Drives the /contact page's entrance sequence. Renders nothing and adds no
   markup — it only computes the connector web's line coordinates (the only
   piece that can't be pure CSS, since card positions depend on real layout)
   and toggles a handful of classes that every other animation in the CSS is
   keyed off. Per-card and per-row stagger is handled entirely by :nth-child
   delays in CSS; this component only decides *when* the sequence starts. */

// TL, TR, BL, BR — matches .channel's natural DOM order in a 2-col grid
const WEB_PAIRS: [number, number][] = [
  [0, 1], // top edge
  [2, 3], // bottom edge
  [0, 2], // left edge
  [1, 3], // right edge
  [0, 3], // diagonal
  [1, 2], // diagonal
];

export default function ContactAnimated() {
  useEffect(() => {
    const channels = document.querySelector<HTMLElement>('.channels');
    if (!channels) return;

    const svg = channels.querySelector<SVGSVGElement>('.web-svg');
    const lines = svg ? Array.from(svg.querySelectorAll<SVGLineElement>('.web-line')) : [];
    const cards = Array.from(channels.querySelectorAll<HTMLElement>('.channel'));
    const scope = document.querySelector<HTMLElement>('.scope');
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const layoutWeb = () => {
      if (!svg || cards.length < 4) return;
      const wrap = channels.getBoundingClientRect();
      svg.setAttribute('width', String(wrap.width));
      svg.setAttribute('height', String(wrap.height));

      const centers = cards.map((card) => {
        const r = card.getBoundingClientRect();
        return { x: r.left + r.width / 2 - wrap.left, y: r.top + r.height / 2 - wrap.top };
      });

      WEB_PAIRS.forEach(([a, b], i) => {
        const line = lines[i];
        if (!line) return;
        line.setAttribute('x1', String(centers[a].x));
        line.setAttribute('y1', String(centers[a].y));
        line.setAttribute('x2', String(centers[b].x));
        line.setAttribute('y2', String(centers[b].y));
      });
    };

    // positions stay correct across viewport changes even after the
    // one-shot entrance has already played
    layoutWeb();
    window.addEventListener('resize', layoutWeb);

    const timers: ReturnType<typeof setTimeout>[] = [];

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          io.disconnect(); // fires once, never repeats

          layoutWeb(); // final measurement right before revealing
          channels.classList.add('armed');
          scope?.classList.add('armed');

          if (reduced) {
            channels.classList.add('typed', 'entered');
            continue;
          }

          timers.push(setTimeout(() => channels.classList.add('typed'), 1400));
          timers.push(setTimeout(() => channels.classList.add('entered'), 1500));
        }
      },
      { threshold: 0.2 },
    );

    io.observe(channels);

    return () => {
      io.disconnect();
      window.removeEventListener('resize', layoutWeb);
      timers.forEach(clearTimeout);
    };
  }, []);

  return null;
}
