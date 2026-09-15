'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const CHEV = (
  <svg className="chev" viewBox="0 0 8 4.5" fill="none" aria-hidden="true"><path d="M0 0 L4 4.5 L8 0" stroke="#7f8ea3" strokeWidth="1.3" strokeLinecap="round" /></svg>
);

// The three desktop hover dropdowns, as data — the mobile panel renders them
// as accordions from this list so the two never drift apart.
const MOBILE_GROUPS: { id: string; label: string; items: [string, string][] }[] = [
  { id: 'platform', label: 'PLATFORM', items: [['/integrations', 'Integrations'], ['/use-cases', 'Use Cases']] },
  { id: 'explore', label: 'EXPLORE', items: [['/brokers', 'Brokers'], ['/affiliate', 'Affiliate']] },
  {
    id: 'about', label: 'ABOUT', items: [
      ['/about', 'About Atlas'], ['/security', 'Security'],
      ['/contact', 'Contact'], ['/changelog', 'Changelog'],
    ],
  },
];

export default function LandingNav() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  // Mobile menu only: the three desktop hover dropdowns become accordions, so
  // they need their own open state — `openGroup` is driven by mouseenter/leave
  // and would collapse the panel the moment a thumb moved off the button.
  const [openAcc, setOpenAcc] = useState<string | null>(null);
  const toggleAcc = (g: string) => setOpenAcc((v) => (v === g ? null : g));

  const cls = (base: string, href: string) =>
    pathname === href ? base + ' is-active' : base;
  const act = (href: string) => (pathname === href ? 'is-active' : undefined);
  // Every link in the panel calls this, which is what closes the overlay on
  // navigation — the nav does not unmount between marketing routes, so
  // nothing else would.
  const closeMenu = () => { setMenuOpen(false); setOpenAcc(null); };

  // The panel is a fixed overlay, so the page behind it stays scrollable and a
  // swipe on the menu drags the body instead. Lock it while the menu is open.
  useEffect(() => {
    if (!menuOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [menuOpen]);

  const ddStyle = (group: string) =>
    openGroup === group ? ({ display: 'block' } as const) : undefined;

  return (
    <>
      {/* ============================= HEADER ============================= */}
      <header className="nav">
        <div className="wrap nav-in">
          <Link className="brand" href="/" aria-label="Atlas home">
            {/* width/height must match the file's real intrinsic size: next/image
                reserves space from this ratio before the bitmap decodes. They said
                2172x724 (ratio 3.00) while the asset is 1983x793 (ratio 2.50), so
                the logo was laid out 156px wide and then snapped to 130px on load
                — a visible shift in the header on every cold page view. */}
            <Image src="/atlasnewslogo1banner.png" alt="Atlas" width={1983} height={793} style={{ height: '52px', width: 'auto' }} priority />
          </Link>

          <nav className="nav-links" aria-label="Primary">
            <div className="nav-item"><Link className={cls('nav-link', '/')} href="/">Home</Link></div>
            <div className="nav-item"><Link className={cls('nav-link', '/demo')} href="/demo">Demo</Link></div>
            <div className="nav-item"><Link className={cls('nav-link', '/pricing')} href="/pricing">Pricing</Link></div>
            <div className="nav-item"><Link className={cls('nav-link', '/blog')} href="/blog">Blog</Link></div>

            <div
              className="nav-item"
              onMouseEnter={() => setOpenGroup('platform')}
              onMouseLeave={() => setOpenGroup(null)}
              onFocus={() => setOpenGroup('platform')}
              onBlur={() => setOpenGroup(null)}
            >
              <button className="nav-link" aria-expanded={openGroup === 'platform'}>Platform
                {CHEV}
              </button>
              <div className="dd" style={ddStyle('platform')}>
                <Link className={act('/integrations')} href="/integrations">Integrations</Link>
                <Link className={act('/use-cases')} href="/use-cases">Use Cases</Link>
              </div>
            </div>

            <div
              className="nav-item"
              onMouseEnter={() => setOpenGroup('explore')}
              onMouseLeave={() => setOpenGroup(null)}
              onFocus={() => setOpenGroup('explore')}
              onBlur={() => setOpenGroup(null)}
            >
              <button className="nav-link" aria-expanded={openGroup === 'explore'}>Explore
                {CHEV}
              </button>
              <div className="dd" style={ddStyle('explore')}>
                <Link className={act('/brokers')} href="/brokers">Brokers</Link>
                <Link className={act('/affiliate')} href="/affiliate">Affiliate</Link>
              </div>
            </div>

            <div
              className="nav-item"
              onMouseEnter={() => setOpenGroup('about')}
              onMouseLeave={() => setOpenGroup(null)}
              onFocus={() => setOpenGroup('about')}
              onBlur={() => setOpenGroup(null)}
            >
              <button className="nav-link" aria-expanded={openGroup === 'about'}>About
                {CHEV}
              </button>
              <div className="dd" style={ddStyle('about')}>
                <Link className={act('/about')} href="/about">About Atlas</Link>
                <Link className={act('/security')} href="/security">Security</Link>
                <Link className={act('/contact')} href="/contact">Contact</Link>
                <Link className={act('/changelog')} href="/changelog">Changelog</Link>
              </div>
            </div>
          </nav>

          <div className="nav-right">
            {/* The reference mockup has no auth, so it points these at / and
                /pricing. Real routes restored — visual treatment unchanged. */}
            <Link className="nav-login" href="/sign-in">Log in</Link>
            <Link className="nav-cta" href="/sign-up">
              <svg width="10" height="16" viewBox="0 0 10 16" fill="none" aria-hidden="true"><path d="M6 0 L0 9 L5 9 L3 16 L10 7 L5 7 L6 0 Z" fill="#0a0a0a" /></svg>
              Start Free Trial
            </Link>
            <button
              className="burger"
              id="burger"
              aria-label="Menu"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((v) => !v)}
            >
              <span></span>
            </button>
          </div>
        </div>
      </header>

      {/* mobile menu */}
      <div className={menuOpen ? 'mnav open' : 'mnav'} id="mnav">
        <div className="wrap">
          <Link onClick={closeMenu} className={act('/')} href="/">Home</Link>
          <Link onClick={closeMenu} className={act('/demo')} href="/demo">Demo</Link>
          <Link onClick={closeMenu} className={act('/pricing')} href="/pricing">Pricing</Link>
          <Link onClick={closeMenu} className={act('/blog')} href="/blog">Blog</Link>

          {MOBILE_GROUPS.map((g) => (
            <div className={openAcc === g.id ? 'macc open' : 'macc'} key={g.id}>
              <button
                className="macc-head"
                aria-expanded={openAcc === g.id}
                aria-controls={`macc-${g.id}`}
                onClick={() => toggleAcc(g.id)}
              >
                {g.label}
                {CHEV}
              </button>
              <div className="macc-body" id={`macc-${g.id}`} hidden={openAcc !== g.id}>
                {g.items.map(([href, label]) => (
                  <Link onClick={closeMenu} className={act(href)} href={href} key={href}>{label}</Link>
                ))}
              </div>
            </div>
          ))}

          <div className="mnav-cta">
            <Link onClick={closeMenu} className="btn btn-ghost" href="/sign-in">Log in</Link>
            <Link onClick={closeMenu} className="btn btn-amber" href="/sign-up">Start Free Trial</Link>
          </div>
        </div>
      </div>
    </>
  );
}
