'use client';

import { useEffect } from 'react';

/* Fires once the solution card scrolls into view, adding a single class to
   .sec07 that drives every CSS rule for this sequence (card lift, bloom,
   rule-draw, heading words, body fade, and the fail rows receding). By the
   time .solve is 25% visible the fail rows above it — which run their own,
   earlier .sec07.is-in entrance (see app/atlas.css) — have long since
   scrolled by and settled, so no extra sequencing between the two is
   needed. */

const THRESHOLD = 0.25;

export default function WhyTradersFailAnimated() {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const section = document.querySelector<HTMLElement>('.sec07');
    const card = section?.querySelector<HTMLElement>('.solve');
    if (!section || !card) return;

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          io.disconnect(); // fires once, never resets
          section.classList.add('solved');
        }
      },
      { threshold: THRESHOLD },
    );
    io.observe(card);

    return () => io.disconnect();
  }, []);

  return null;
}
