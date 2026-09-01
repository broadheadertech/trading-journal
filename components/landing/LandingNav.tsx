'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const CHEV = (
  <svg className="chev" viewBox="0 0 8 4.5" fill="none" aria-hidden="true"><path d="M0 0 L4 4.5 L8 0" stroke="#7f8ea3" strokeWidth="1.3" strokeLinecap="round" /></svg>
);

export default function LandingNav() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [openGroup, setOpenGroup] = useState<string | null>(null);

  const cls = (base: string, href: string) =>
    pathname === href ? base + ' is-active' : base;
  const act = (href: string) => (pathname === href ? 'is-active' : undefined);
  const closeMenu = () => setMenuOpen(false);
  const ddStyle = (group: string) =>
    openGroup === group ? ({ display: 'block' } as const) : undefined;

  return (
    <>
      {/* ============================= HEADER ============================= */}
      <header className="nav">
        <div className="wrap nav-in">
          <Link className="brand" href="/" aria-label="Atlas home">
            <Image src="/atlanewslogo1banner.png" alt="Atlas" width={2172} height={724} style={{ height: '52px', width: 'auto' }} priority />
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
          <h4>PLATFORM</h4>
          <Link onClick={closeMenu} className={act('/integrations')} href="/integrations">Integrations</Link>
          <Link onClick={closeMenu} className={act('/use-cases')} href="/use-cases">Use Cases</Link>
          <h4>EXPLORE</h4>
          <Link onClick={closeMenu} className={act('/brokers')} href="/brokers">Brokers</Link>
          <Link onClick={closeMenu} className={act('/affiliate')} href="/affiliate">Affiliate</Link>
          <h4>ABOUT</h4>
          <Link onClick={closeMenu} className={act('/about')} href="/about">About Atlas</Link>
          <Link onClick={closeMenu} className={act('/security')} href="/security">Security</Link>
          <Link onClick={closeMenu} className={act('/contact')} href="/contact">Contact</Link>
          <Link onClick={closeMenu} className={act('/changelog')} href="/changelog">Changelog</Link>
          <div className="mnav-cta">
            <Link onClick={closeMenu} className="btn btn-ghost" href="/sign-in">Log in</Link>
            <Link onClick={closeMenu} className="btn btn-amber" href="/sign-up">Start Free Trial</Link>
          </div>
        </div>
      </div>
    </>
  );
}
