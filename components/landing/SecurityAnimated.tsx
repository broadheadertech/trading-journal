'use client';

import { useEffect } from 'react';

/* Drives the /security page's entrance sequence. Renders nothing and adds
   no markup of its own — it only toggles classes on elements that already
   exist (see app/security/page.tsx). Every visual — the ping rings, the
   perimeter trace, the shield draw, the checkmark, the verify ring, the
   text rise — is a CSS animation gated by the `.armed` class; this
   component's only job is timing: when to add it, and staggering it
   correctly across the six cards. */

export default function SecurityAnimated() {
  useEffect(() => {
    const boundsEl = document.querySelector<HTMLElement>('.bounds');
    if (!boundsEl) return;

    const lock = document.querySelector<HTMLElement>('.ic-lock');
    const cards = Array.from(document.querySelectorAll<HTMLElement>('.bound'));
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const timers: ReturnType<typeof setTimeout>[] = [];

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          io.disconnect(); // fires once, never repeats

          lock?.classList.add('is-armed'); // radar ping — begins immediately, no delay

          if (reduced) {
            cards.forEach((card) => card.classList.add('armed'));
            continue;
          }

          // card 1 at 500ms, then +420ms per card after — extends the
          // spec's three-card stagger (500 / 920 / 1340ms) across all six
          cards.forEach((card, i) => {
            timers.push(setTimeout(() => card.classList.add('armed'), 500 + i * 420));
          });
        }
      },
      { threshold: 0.2 },
    );

    io.observe(boundsEl);

    return () => {
      io.disconnect();
      timers.forEach(clearTimeout);
    };
  }, []);

  return null;
}
