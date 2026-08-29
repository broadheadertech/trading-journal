'use client';

import { ReactNode, useEffect, useRef } from 'react';

/* Parallax breakout stage for the demo page's feature rows. It wraps an
   existing browser mockup without restructuring it: the tilt, sway, entrance
   and the two floating cards all live on wrappers, and the internal bars are
   only re-tinted and animated in place. */

export type Tone = 'green' | 'red' | 'amber';

export type CardSpec = {
  tag: string;
  value: string;
  tone: Tone;
  sub: [string, string];
  pill?: string;
  place: 'tl' | 'tr' | 'bl' | 'br';
};

type Props = {
  /** mirrors the sway for rows whose mockup sits on the left */
  flip?: boolean;
  /** seconds — alternate per section so the four never sway together */
  sway: number;
  status: { label: string; dot?: 'red' | 'green' };
  cards: [CardSpec, CardSpec];
  children: ReactNode;
};

/* Bars carry their colour inline, so the gradient is derived from whatever is
   already there — the designed colour is never replaced, only extended. */
const gradient = (c: string) =>
  `linear-gradient(90deg, ${c}, color-mix(in srgb, ${c} 35%, transparent))`;

export default function FeatureScene({ flip, sway, status, cards, children }: Props) {
  const stageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = stageRef.current;
    if (!root) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // horizontal bar fills — gradient + staggered wipe
    const bars = root.querySelectorAll<HTMLElement>(
      '.track i, .bar2 i, .fscene-compliance i',
    );
    bars.forEach((bar, i) => {
      const colour = bar.style.background || bar.style.backgroundColor;
      if (colour && !colour.startsWith('linear-gradient')) {
        bar.style.background = gradient(colour);
      }
      bar.style.animationDelay = `${(0.35 + i * 0.12).toFixed(2)}s`;
    });

    // hourly columns rise from the axis
    root.querySelectorAll<HTMLElement>('.hours i').forEach((col, i) => {
      col.style.animationDelay = `${(0.6 + i * 0.03).toFixed(2)}s`;
    });

    // only the active streak dots animate; the dimmed ones are already there
    root.querySelectorAll<HTMLElement>('.streak i.on').forEach((dot, i) => {
      dot.style.animationDelay = `${(0.8 + i * 0.07).toFixed(2)}s`;
    });

    // discipline ring draws from empty to its designed offset
    const ring = root.querySelector<SVGCircleElement>('.dial2 svg circle:nth-of-type(2)');
    if (ring && !reduced) {
      const dash = ring.getAttribute('stroke-dasharray');
      const offset = ring.getAttribute('stroke-dashoffset');
      if (dash && offset) {
        ring.style.setProperty('--ring-from', dash);
        ring.style.setProperty('--ring-to', offset);
      }
    }

    if (reduced) return;

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          io.disconnect();
          root.classList.add('is-in');
        }
      },
      { threshold: 0.18 },
    );

    io.observe(root);
    return () => io.disconnect();
  }, []);

  return (
    <div
      className={`fstage${flip ? ' is-flip' : ''}`}
      ref={stageRef}
      style={{ ['--sway' as string]: `${sway}s` }}
    >
      <div className="fenter">
        <div className="fscene">
          {children}

          <div className="fstatus" aria-hidden="true">
            {status.dot && <i className={`fstatus-dot is-${status.dot}`} />}
            <span>{status.label}</span>
          </div>

          {cards.map((c, i) => (
            <div
              key={c.tag}
              className={`fcard is-${c.place} is-${c.tone}${i === 1 ? ' is-far' : ''}`}
              aria-hidden="true"
            >
              <div className="fcard-in">
                <b>{c.tag}</b>
                <em>{c.value}</em>
                <span>{c.sub[0]}</span>
                <span className="fcard-dim">{c.sub[1]}</span>
                {c.pill && <span className="fcard-pill">{c.pill}</span>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
