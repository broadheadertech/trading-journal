'use client';

import { useEffect } from 'react';

/* Entrance-animation trigger. Renders nothing and adds no markup: it watches
   an element that already exists and adds `is-in` to it the first time the
   element is 15% visible, then disconnects. The animations themselves live
   entirely in CSS — see the "entrance animations" block in app/atlas.css. */

export default function ScrollReveal({
  selector,
  threshold = 0.15,
}: {
  selector: string;
  threshold?: number;
}) {
  useEffect(() => {
    const el = document.querySelector(selector);
    if (!el) return;

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add('is-in');
          io.disconnect(); // plays once, never repeats
        }
      },
      { threshold },
    );

    io.observe(el);
    return () => io.disconnect();
  }, [selector, threshold]);

  return null;
}
