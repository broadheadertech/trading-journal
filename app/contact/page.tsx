'use client';

import type { CSSProperties } from 'react';
import { useState } from 'react';
import Link from 'next/link';
import LandingNav from '@/components/landing/LandingNav';
import Footer from '@/components/landing/Footer';

const FAQ: { q: string; a?: string }[] = [
  {
    q: 'How fast do you respond?',
    a: 'Standard response is typically within one business day. Pro subscribers get priority routing.',
  },
  { q: 'What are your support hours?' },
  { q: 'Do you offer phone support?' },
  { q: 'Can I request a new broker integration?' },
];

export default function ContactPage() {
  // the reference build opens the first answer-bearing item and toggles on click
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  return (
    <div className="atlas-site">
      <LandingNav />

      <div className="phero" style={{ '--band': '420px', padding: '132px 0 0' } as CSSProperties}>
        <div className="panelgrid"></div>
        <div className="wrap">
          <h1>Talk to the<em>Atlas team</em></h1>
          <p className="sub" style={{ marginTop: '32px' }}>Email-routed support so your question lands with the right specialist on the first try.</p>
          <p style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '52px 0 0', fontSize: '12.5px', color: 'var(--text-4)' }}>
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><rect x=".65" y=".65" width="11.7" height="11.7" rx="2" stroke="#2fd3c4" strokeWidth="1.3"/><path d="M6.5 4v.5M6.5 6.2v3" stroke="#2fd3c4" strokeWidth="1.3" strokeLinecap="round"/></svg>
            Monday-Friday, UTC business hours · Priority response for Pro subscribers
          </p>
        </div>
      </div>

      <div style={{ borderTop: '1px solid var(--line)', marginTop: '72px' }}>
        <div className="wrap">
          <div className="channels">
            <a className="channel" href="mailto:support@atlas.app">
              <div className="top"><svg width="30" height="21" viewBox="0 0 30 21" fill="none"><rect x=".65" y=".65" width="28.7" height="19.7" rx="2" stroke="#2fd3c4" strokeWidth="1.3"/><path d="M0 2 L15 14 L30 2" stroke="#2fd3c4" strokeWidth="1.3"/></svg><span className="lbl">Product &amp; onboarding</span></div>
              <p className="mail">support@atlas.app</p>
              <svg className="go" width="16" height="14" viewBox="0 0 16 14" fill="none"><path d="M9 0 L16 7 L9 14 M0 7 H14" stroke="#d99405" strokeWidth="1.5"/></svg>
            </a>
            <a className="channel" href="mailto:sales@atlas.app">
              <div className="top"><svg width="30" height="21" viewBox="0 0 30 21" fill="none"><rect x=".65" y=".65" width="28.7" height="19.7" rx="2" stroke="#2fd3c4" strokeWidth="1.3"/><path d="M0 2 L15 14 L30 2" stroke="#2fd3c4" strokeWidth="1.3"/></svg><span className="lbl">Pricing &amp; plans</span></div>
              <p className="mail">sales@atlas.app</p>
              <svg className="go" width="16" height="14" viewBox="0 0 16 14" fill="none"><path d="M9 0 L16 7 L9 14 M0 7 H14" stroke="#d99405" strokeWidth="1.5"/></svg>
            </a>
            <a className="channel" href="mailto:ops@atlas.app" style={{ marginTop: '32px' }}>
              <div className="top"><svg width="30" height="21" viewBox="0 0 30 21" fill="none"><rect x=".65" y=".65" width="28.7" height="19.7" rx="2" stroke="#2fd3c4" strokeWidth="1.3"/><path d="M0 2 L15 14 L30 2" stroke="#2fd3c4" strokeWidth="1.3"/></svg><span className="lbl">Integrations &amp; imports</span></div>
              <p className="mail">ops@atlas.app</p>
              <svg className="go" width="16" height="14" viewBox="0 0 16 14" fill="none"><path d="M9 0 L16 7 L9 14 M0 7 H14" stroke="#d99405" strokeWidth="1.5"/></svg>
            </a>
            <a className="channel" href="mailto:security@atlas.app" style={{ marginTop: '32px' }}>
              <div className="top"><svg width="30" height="21" viewBox="0 0 30 21" fill="none"><rect x=".65" y=".65" width="28.7" height="19.7" rx="2" stroke="#2fd3c4" strokeWidth="1.3"/><path d="M0 2 L15 14 L30 2" stroke="#2fd3c4" strokeWidth="1.3"/></svg><span className="lbl">Security &amp; privacy</span></div>
              <p className="mail">security@atlas.app</p>
              <svg className="go" width="16" height="14" viewBox="0 0 16 14" fill="none"><path d="M9 0 L16 7 L9 14 M0 7 H14" stroke="#d99405" strokeWidth="1.5"/></svg>
            </a>
          </div>

          <hr className="inset-rule" style={{ marginTop: '55px' }} />
          <div className="scope">
            <div>
              <h4 className="yes"><svg width="14" height="11" viewBox="0 0 14 11" fill="none"><path d="M0 5.5 L5 11 L14 0" stroke="#2fd3c4" strokeWidth="2"/></svg>WHAT WE CAN HELP WITH</h4>
              <ul>
                <li className="yes"><svg width="14" height="11" viewBox="0 0 14 11" fill="none"><path d="M0 5.5 L5 11 L14 0" stroke="#2fd3c4" strokeWidth="2"/></svg>Product and workflow questions</li>
                <li className="yes"><svg width="14" height="11" viewBox="0 0 14 11" fill="none"><path d="M0 5.5 L5 11 L14 0" stroke="#2fd3c4" strokeWidth="2"/></svg>Import and integration guidance</li>
                <li className="yes"><svg width="14" height="11" viewBox="0 0 14 11" fill="none"><path d="M0 5.5 L5 11 L14 0" stroke="#2fd3c4" strokeWidth="2"/></svg>Plan and pricing questions</li>
                <li className="yes"><svg width="14" height="11" viewBox="0 0 14 11" fill="none"><path d="M0 5.5 L5 11 L14 0" stroke="#2fd3c4" strokeWidth="2"/></svg>Security and privacy requests</li>
                <li className="yes"><svg width="14" height="11" viewBox="0 0 14 11" fill="none"><path d="M0 5.5 L5 11 L14 0" stroke="#2fd3c4" strokeWidth="2"/></svg>Partnership and collaboration inquiries</li>
              </ul>
            </div>
            <div>
              <h4 className="no"><svg width="11" height="11" viewBox="0 0 11 11" fill="none"><path d="M0 0 L11 11 M11 0 L0 11" stroke="#5c6b7e" strokeWidth="1.6"/></svg>OUTSIDE OUR SCOPE</h4>
              <ul>
                <li className="no"><svg width="11" height="11" viewBox="0 0 11 11" fill="none"><path d="M0 0 L11 11 M11 0 L0 11" stroke="#3a4a5c" strokeWidth="1.6"/></svg>Investment advice</li>
                <li className="no"><svg width="11" height="11" viewBox="0 0 11 11" fill="none"><path d="M0 0 L11 11 M11 0 L0 11" stroke="#3a4a5c" strokeWidth="1.6"/></svg>Trade execution or signals</li>
                <li className="no"><svg width="11" height="11" viewBox="0 0 11 11" fill="none"><path d="M0 0 L11 11 M11 0 L0 11" stroke="#3a4a5c" strokeWidth="1.6"/></svg>Buy/sell recommendations</li>
                <li className="no"><svg width="11" height="11" viewBox="0 0 11 11" fill="none"><path d="M0 0 L11 11 M11 0 L0 11" stroke="#3a4a5c" strokeWidth="1.6"/></svg>Managed trading</li>
                <li className="no"><svg width="11" height="11" viewBox="0 0 11 11" fill="none"><path d="M0 0 L11 11 M11 0 L0 11" stroke="#3a4a5c" strokeWidth="1.6"/></svg>Guaranteed profitability claims</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <div style={{ borderTop: '1px solid var(--line)', marginTop: '48px', paddingTop: '55px' }}>
        <div className="wrap">
          <hr className="inset-rule" />
          <h2 style={{ fontFamily: 'var(--display)', fontWeight: 600, fontSize: '48px', lineHeight: '52px', margin: '35px 0 0' }}>Frequently asked</h2>
          <div className="faq">
            {FAQ.map((item, i) => {
              const open = item.a !== undefined && openIdx === i;
              return (
                <div
                  key={item.q}
                  className={open ? 'faq-item open' : 'faq-item'}
                  onClick={() => { if (item.a !== undefined) setOpenIdx(open ? null : i); }}
                >
                  <h4>{item.q}</h4>
                  <svg className="chev" viewBox="0 0 16 8" fill="none">
                    <path d={open ? 'M0 8 L8 0 L16 8' : 'M0 0 L8 8 L16 0'} stroke={open ? '#d99405' : '#7f8ea3'} strokeWidth="1.6"/>
                  </svg>
                  {open && <p>{item.a}</p>}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="pcta" style={{ marginTop: '120px' }}>
        <div className="gridwash"></div><div className="glow"></div>
        <div className="wrap">
          <h2>Or just start the trial</h2>
          <p className="sub">Most product questions get answered faster by the app itself.</p>
          <div className="row"><Link className="btn btn-amber" href="/pricing">Start Free Trial<svg className="arrow-r" viewBox="0 0 12 9" fill="none"><path d="M0 4.5 H12 M12 4.5 L7 0 M12 4.5 L7 9" stroke="#0a0a0a" strokeWidth="1.7" strokeLinecap="round"/></svg></Link></div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
