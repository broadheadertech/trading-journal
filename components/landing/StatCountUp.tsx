'use client';

import { useEffect } from 'react';

/* Homepage stat odometer reveal. Display-only: it rewrites nothing but the
   numeric portion of text already on the page, and only after the number
   scrolls into view. No markup is added to the tree until the moment the
   animation is about to run — until then the server-rendered plain text is
   all that exists (progressive enhancement, and the reduced-motion/no-JS
   fallback for free). Targets are found by the classes the stat blocks
   already carry. */

/* The 1.1s / cubic-bezier(.16,1,.3,1) reel duration and easing live in
   app/atlas.css's .odo-spin rule — nothing here drives per-frame timing. */
const DIGIT_STAGGER = 80;
const GROUP_STAGGER = 150;
const THRESHOLD = 0.25;

/* Stat figures. Deliberately an allowlist rather than "every bold element":
   HowItWorks' W1..W4 week labels and the pricing figures (which have their own
   monthly/annual toggle writing to them) must not be touched.

   .hero-badge b is deliberately NOT in this list. It used to be
   display:none at wide viewports (the world map carried its own duplicate
   stat chip instead — see [class*="statValue"] below), so this path never
   actually ran there. Now that .hero-badge shows at every width, the digits
   were rendering blank — this element sits inside .hero's own opacity/blur
   entrance reveal, and IntersectionObserver fires on geometric visibility
   regardless of that CSS opacity, so the odometer swap was racing the
   hero's own fade-in in a way this simple badge doesn't need to survive.
   It's a static trust number, not a stat that benefits from a count-up —
   left out entirely so the plain, always-correct server-rendered text is
   guaranteed to show. */
const TARGETS = [
  '[class*="statValue"]', // world-map stat block (CSS-module hashed class)
  '.statrow .stat b',
  '.numbers .num b',
  '.dial .score b',
  '.edge .kpi b',
  '.leakrow .v',
].join(',');

/* Containers whose stats read as one group, for the stagger. */
const GROUPS = '.statrow, .numbers, .edge, .leakcard';

/* prefix may hold symbols only ($, −, +) — never letters, so "W1" is not a
   stat — then the number, then any suffix (+, ×, %, K+, " SEC", " YEAR"). */
const STAT_RE = /^([^\p{L}\p{N}]*)(\d[\d,]*(?:\.\d+)?)(.*)$/u;

type Target = {
  el: HTMLElement;
  original: string;
  prefix: string;
  numText: string;
  suffix: string;
  groupDelay: number;
};

const DIGITS = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];

function escapeHtml(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/* Builds the per-digit odometer markup for one stat, matching t.original
   character-for-character once every strip settles. Digits become vertical
   reels; everything else (commas, +/×, unit text) is plain static text. */
function buildOdometerHTML(t: Target): string {
  let html = escapeHtml(t.prefix);
  let digitIndex = 0;

  for (const ch of t.numText) {
    if (ch >= '0' && ch <= '9') {
      const finalDigit = Number(ch);
      // 9 wraps: the overshoot spins one step past the last real digit, so a
      // duplicate 0 is appended for it to land on — the settle from there
      // back up to the real 9 is a continuous, in-view scroll, not a jump.
      const reel = finalDigit === 9 ? [...DIGITS, '0'] : DIGITS;
      const delay = t.groupDelay + digitIndex * DIGIT_STAGGER;
      const strip = reel.map((d) => `<span>${d}</span>`).join('');
      html += `<span class="odo-digit"><span class="odo-strip" style="--final:${finalDigit};animation-delay:${delay}ms">${strip}</span></span>`;
      digitIndex += 1;
    } else {
      html += escapeHtml(ch);
    }
  }

  return html + escapeHtml(t.suffix);
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
    // for both the digit reels and the final resting text
    document.querySelectorAll<HTMLElement>(TARGETS).forEach((el) => {
      const original = el.textContent ?? '';
      const match = original.trim().match(STAT_RE);
      if (!match) return; // not a standalone number — leave it alone

      const [, prefix, numText, suffix] = match;
      if (!Number.isFinite(parseFloat(numText.replace(/,/g, '')))) return;

      const group = el.closest(GROUPS) ?? el;
      const index = groupCounts.get(group) ?? 0;
      groupCounts.set(group, index + 1);

      targets.push({ el, original, prefix, numText, suffix, groupDelay: index * GROUP_STAGGER });
    });

    if (!targets.length) return;

    const byElement = new Map(targets.map((t) => [t.el, t]));

    const run = (t: Target) => {
      // DOM is untouched until this exact moment — nothing before this line
      // mutates the page.
      t.el.setAttribute('aria-label', t.original);
      t.el.innerHTML = buildOdometerHTML(t);
      // let the resting (translateY(0)) frame paint before the animation
      // class is applied, so every strip visibly starts from the top.
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          t.el.querySelectorAll<HTMLElement>('.odo-strip').forEach((strip) => {
            strip.classList.add('odo-spin');
          });
        });
      });
    };

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const target = byElement.get(entry.target as HTMLElement);
          io.unobserve(entry.target); // fires once per element, never resets
          if (target) run(target);
        }
      },
      { threshold: THRESHOLD },
    );

    targets.forEach((t) => io.observe(t.el));

    return () => {
      io.disconnect();
      // leave every number showing its true value
      targets.forEach((t) => {
        t.el.removeAttribute('aria-label');
        t.el.textContent = t.original;
      });
    };
  }, []);

  return null;
}
