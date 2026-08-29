'use client';

import { useEffect } from 'react';

/* Hover shimmer for the three hero/navbar CTAs. Renders nothing and adds no
   markup — it only toggles a class on elements that already exist. The sweep
   itself is a ::before pseudo-element defined in app/atlas.css.

   The class is added on mouseenter and removed on animationend rather than
   leaning on :hover, so the animation restarts cleanly on every hover instead
   of only running the first time. */

const SHIMMER_BUTTONS = '.hero-actions .btn-amber, .hero-actions .btn-ghost, .nav-cta';

export default function ButtonShimmer() {
  useEffect(() => {
    // reduced motion: never attach, so hover stays completely static
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const buttons = Array.from(document.querySelectorAll<HTMLElement>(SHIMMER_BUTTONS));
    if (!buttons.length) return;

    const enter = (event: Event) => {
      (event.currentTarget as HTMLElement).classList.add('is-shimmer');
    };

    const end = (event: AnimationEvent) => {
      if (event.animationName !== 'shimmerSweep') return;
      (event.currentTarget as HTMLElement).classList.remove('is-shimmer');
    };

    buttons.forEach((el) => {
      el.addEventListener('mouseenter', enter);
      el.addEventListener('animationend', end as EventListener);
    });

    return () => {
      buttons.forEach((el) => {
        el.removeEventListener('mouseenter', enter);
        el.removeEventListener('animationend', end as EventListener);
        el.classList.remove('is-shimmer');
      });
    };
  }, []);

  return null;
}
