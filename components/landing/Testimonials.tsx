'use client';

import { useCallback, useEffect, useState } from 'react';

const REVIEWS = [
  {
    initials: 'SK',
    name: 'Sarah K.',
    role: 'Multi-Market Day Trader',
    quote: 'I trade both crypto and stocks. The AI Coach caught patterns across both markets I never noticed my win rate improved 15% in two months.',
  },
  {
    initials: 'MR',
    name: 'Marcus R.',
    role: 'Futures Trader',
    quote: 'Finally stopped revenge trading. The discipline score kept me honest every single session — I could see the damage before I did it again.',
  },
  {
    initials: 'JT',
    name: 'Jordan T.',
    role: 'Options Trader',
    quote: 'Journaling used to eat my whole evening. Now every trade is scored the moment I close it, and the lesson is right there.',
  },
  {
    initials: 'PN',
    name: 'Priya N.',
    role: 'Forex Swing Trader',
    quote: 'The leak report was brutal in the best way. It ranked exactly where my money was going FOMO entries, every time.',
  },
  {
    initials: 'DL',
    name: 'David L.',
    role: 'Metals & Commodities',
    quote: 'Six months in and my equity curve finally looks like the ones they show you. The edge metrics don’t let me lie to myself.',
  },
];

const INTERVAL = 5500;

export default function Testimonials() {
  const [active, setActive] = useState(0);
  const [leaving, setLeaving] = useState<number | null>(null);
  const [paused, setPaused] = useState(false);

  const goTo = useCallback(
    (next: number) => {
      setActive((current) => {
        if (next === current) return current;
        setLeaving(current);
        return next;
      });
    },
    [],
  );

  const step = useCallback(
    (delta: number) => goTo((active + delta + REVIEWS.length) % REVIEWS.length),
    [active, goTo],
  );

  /* Auto-advance. Keyed on `active`, so any manual arrow/dot interaction
     restarts the countdown rather than letting it fire immediately after. */
  useEffect(() => {
    if (paused) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const id = setTimeout(() => goTo((active + 1) % REVIEWS.length), INTERVAL);
    return () => clearTimeout(id);
  }, [active, paused, goTo]);

  const slideClass = (i: number) =>
    i === active ? ' is-active' : i === leaving ? ' is-leaving' : '';

  return (
    <div className="sec10">
      <div className="wrap">
        <p className="eyebrow">TRUSTED BY TRADERS</p>
        <h2 className="h2" style={{ marginTop: '13px' }}>What traders are saying</h2>
        <p className="lede-lg" style={{ marginTop: '12px' }}>See what crypto, stock, forex, futures, options, and metals traders find inside Atlas.</p>

        <p className="quotemark">&#8221;</p>

        <div
          className="quote-deck"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
        >
          {REVIEWS.map((r, i) => (
            <p key={r.name} className={`quote quote-slide${slideClass(i)}`} aria-hidden={i !== active}>
              &#8220;{r.quote}&#8221;
            </p>
          ))}
        </div>

        <div className="byline">
          {/* flips on the same timeline as the quote, so the person shown can
              never be mismatched with the words */}
          <div
            className="byline-deck"
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
          >
            {REVIEWS.map((r, i) => (
              <div key={r.name} className={`byline-slide${slideClass(i)}`} aria-hidden={i !== active}>
                <div className="avatar">{r.initials}</div>
                <div><b>{r.name}</b><span>{r.role}</span></div>
              </div>
            ))}
          </div>

          <div className="dots">
            {REVIEWS.map((r, i) => (
              <i
                key={r.name}
                className={i === active ? 'on' : undefined}
                role="button"
                tabIndex={0}
                aria-label={`Show review ${i + 1} of ${REVIEWS.length}`}
                aria-current={i === active}
                onClick={() => goTo(i)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    goTo(i);
                  }
                }}
              />
            ))}
          </div>

          <div className="pager">
            <button aria-label="Previous" onClick={() => step(-1)}><svg width="7" height="16" viewBox="0 0 7 16" fill="none"><path d="M7 0 L0 8 L7 16" stroke="#edf2f7" strokeWidth="1.1" /></svg></button>
            <button aria-label="Next" onClick={() => step(1)}><svg width="7" height="16" viewBox="0 0 7 16" fill="none"><path d="M0 0 L7 8 L0 16" stroke="#edf2f7" strokeWidth="1.1" /></svg></button>
          </div>
        </div>
      </div>
    </div>
  );
}
