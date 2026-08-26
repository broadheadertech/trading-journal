'use client';

import { useEffect } from 'react';

/* Homepage stat count-up. Display-only: it rewrites nothing but the numeric
   portion of text already on the page, and only after the number scrolls into
   view. No markup, classes or data attributes are added — targets are found by
   the classes the stat blocks already carry. */

const DURATION = 1800;
const STAGGER = 120;
const THRESHOLD = 0.25;

/* Stat figures. Deliberately an allowlist rather than "every bold element":
   HowItWorks' W1..W4 week labels and the pricing figures (which have their own
   monthly/annual toggle writing to them) must not be touched. */
const TARGETS = [
  '.hero-badge b',
  '[class*="statValue"]', // world-map stat block (CSS-module hashed class)
  '.statrow .stat b',
  '.numbers .num b',
  '.dial .score b',
  '.edge .kpi b',
  '.leakrow .v',
].join(',');

/* Containers whose stats read as one group, for the stagger. */
const GROUPS = '.statrow, .numbers, .edge, .leakcard, .hero-badge';

/* prefix may hold symbols only ($, −, +) — never letters, so "W1" is not a
   stat — then the number, then any suffix (+, ×, %, K+, " SEC", " YEAR"). */
const STAT_RE = /^([^\p{L}\p{N}]*)(\d[\d,]*(?:\.\d+)?)(.*)$/u;

type Target = {
  el: HTMLElement;
  original: string;
  prefix: string;
  suffix: string;
  end: number;
  decimals: number;
  grouped: boolean;
  delay: number;
};

function format(value: number, decimals: number, grouped: boolean) {
  return grouped
    ? value.toLocaleString('en-US', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })
    : value.toFixed(decimals);
}

export default function StatCountUp() {
  useEffect(() => {
    // homepage only — stat counters elsewhere stay static
    if (window.location.pathname !== '/') return;

    // reduced motion: never observe, never mutate, leave the real value alone
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const groupCounts = new Map<Element, number>();
    const targets: Target[] = [];

    // read every original value once, up front — this is the source of truth
    // for both the end value and the formatting
    document.querySelectorAll<HTMLElement>(TARGETS).forEach((el) => {
      const original = el.textContent ?? '';
      const match = original.trim().match(STAT_RE);
      if (!match) return; // not a standalone number — leave it alone

      const [, prefix, numText, suffix] = match;
      const end = parseFloat(numText.replace(/,/g, ''));
      if (!Number.isFinite(end)) return;

      const group = el.closest(GROUPS) ?? el;
      const index = groupCounts.get(group) ?? 0;
      groupCounts.set(group, index + 1);

      targets.push({
        el,
        original,
        prefix,
        suffix,
        end,
        decimals: numText.includes('.') ? numText.split('.')[1].length : 0,
        grouped: numText.includes(','),
        delay: index * STAGGER,
      });
    });

    if (!targets.length) return;

    const timers: ReturnType<typeof setTimeout>[] = [];
    const frames = new Map<HTMLElement, number>();

    const run = (t: Target) => {
      const startedAt = performance.now();
      const scale = Math.pow(10, t.decimals);

      const step = (now: number) => {
        // clamped so a backgrounded tab resumes at the end rather than
        // overshooting on a huge elapsed delta
        const elapsed = Math.min(now - startedAt, DURATION);
        const progress = elapsed / DURATION;
        const eased = 1 - Math.pow(1 - progress, 3);
        const current = Math.round(eased * t.end * scale) / scale;

        if (elapsed < DURATION) {
          t.el.textContent = t.prefix + format(current, t.decimals, t.grouped) + t.suffix;
          frames.set(t.el, requestAnimationFrame(step));
        } else {
          // restore the original string verbatim so the resting value is
          // character-for-character what the server rendered
          t.el.textContent = t.original;
          frames.delete(t.el);
        }
      };

      frames.set(t.el, requestAnimationFrame(step));
    };

    const byElement = new Map(targets.map((t) => [t.el, t]));

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const target = byElement.get(entry.target as HTMLElement);
          io.unobserve(entry.target); // fires once per element, never resets
          if (!target) continue;
          timers.push(setTimeout(() => run(target), target.delay));
        }
      },
      { threshold: THRESHOLD },
    );

    targets.forEach((t) => io.observe(t.el));

    return () => {
      io.disconnect();
      timers.forEach(clearTimeout);
      frames.forEach((id) => cancelAnimationFrame(id));
      // leave every number showing its true value
      targets.forEach((t) => {
        t.el.textContent = t.original;
      });
    };
  }, []);

  return null;
}
