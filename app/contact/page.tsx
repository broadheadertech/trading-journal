'use client';

import type { CSSProperties } from 'react';
import { useState } from 'react';
import Link from 'next/link';
import LandingNav from '@/components/landing/LandingNav';
import Footer from '@/components/landing/Footer';
import ContactAnimated from '@/components/landing/ContactAnimated';

/* Stroke-animatable envelope, replacing the old single flat-fill SVG icon.
   Same role in the .top flex row (flex: none, 15px gap to the label) — see
   the "Envelope SVG dimensions" note in the CSS for the one deliberate
   size deviation. */
function EnvelopeIcon() {
  return (
    <span className="env" aria-hidden="true">
      <svg className="env-seal-svg" viewBox="0 0 22 15" fill="none">
        <path className="env-seal" d="M0 0 L11 8 L22 0" />
      </svg>
      <span className="env-ping" />
    </span>
  );
}

/* Wraps the existing send arrow so the hover trail dashes (::before/::after)
   have their own anchor, independent of the arrow's own slide transform. */
function SendArrow() {
  return (
    <span className="arrow-wrap">
      <svg className="go" width="16" height="14" viewBox="0 0 16 14" fill="none"><path d="M9 0 L16 7 L9 14 M0 7 H14" stroke="#d99405" strokeWidth="1.5"/></svg>
    </span>
  );
}

/* Stroke-animatable replacements for the scope list's static tick/X icons.
   Only the 10 list-item icons are swapped — the two column-header icons
   (h4.yes / h4.no) are titles, not staggered "rows", and are left as-is. */
function CanTick() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <polyline className="can-tick" points="2,6 5,9 10,3" />
    </svg>
  );
}
function OutX() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <path className="out-x" d="M3,3 L9,9 M9,3 L3,9" />
    </svg>
  );
}

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
          <p style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '52px 0 0', fontSize: '12.5px', color: 'var(--text-3)' }}>
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><rect x=".65" y=".65" width="11.7" height="11.7" rx="2" stroke="#d99405" strokeWidth="1.3"/><path d="M6.5 4v.5M6.5 6.2v3" stroke="#d99405" strokeWidth="1.3" strokeLinecap="round"/></svg>
            Monday-Friday, UTC business hours · Priority response for Pro subscribers
          </p>
        </div>
      </div>

      <div style={{ borderTop: '1px solid var(--line)', marginTop: '72px' }}>
        <div className="wrap">
          <div className="channels">
            {/* connector web — purely decorative, sits behind the cards;
                line coordinates are filled in by ContactAnimated once the
                cards have their real rendered positions */}
            <svg className="web-svg" aria-hidden="true">
              <line className="web-line" />
              <line className="web-line" />
              <line className="web-line" />
              <line className="web-line" />
              <line className="web-line" />
              <line className="web-line" />
            </svg>

            <a className="channel" href="mailto:support@atlas.app">
              <div className="top"><EnvelopeIcon /><span className="lbl">Product &amp; onboarding</span></div>
              <p className="mail">support@atlas.app</p>
              <SendArrow />
            </a>
            <a className="channel" href="mailto:sales@atlas.app">
              <div className="top"><EnvelopeIcon /><span className="lbl">Pricing &amp; plans</span></div>
              <p className="mail">sales@atlas.app</p>
              <SendArrow />
            </a>
            <a className="channel" href="mailto:ops@atlas.app" style={{ marginTop: '32px' }}>
              <div className="top"><EnvelopeIcon /><span className="lbl">Integrations &amp; imports</span></div>
              <p className="mail">ops@atlas.app</p>
              <SendArrow />
            </a>
            <a className="channel" href="mailto:security@atlas.app" style={{ marginTop: '32px' }}>
              <div className="top"><EnvelopeIcon /><span className="lbl">Security &amp; privacy</span></div>
              <p className="mail">security@atlas.app</p>
              <SendArrow />
            </a>
          </div>

          <hr className="inset-rule" style={{ marginTop: '55px' }} />
          <div className="scope">
            <div>
              <h4 className="yes"><svg width="14" height="11" viewBox="0 0 14 11" fill="none"><path d="M0 5.5 L5 11 L14 0" stroke="#24c88a" strokeWidth="2"/></svg>WHAT WE CAN HELP WITH</h4>
              <ul>
                <li className="yes"><CanTick />Product and workflow questions</li>
                <li className="yes"><CanTick />Import and integration guidance</li>
                <li className="yes"><CanTick />Plan and pricing questions</li>
                <li className="yes"><CanTick />Security and privacy requests</li>
                <li className="yes"><CanTick />Partnership and collaboration inquiries</li>
              </ul>
            </div>
            <div>
              <h4 className="no"><svg width="11" height="11" viewBox="0 0 11 11" fill="none"><path d="M0 0 L11 11 M11 0 L0 11" stroke="#5c6b7e" strokeWidth="1.6"/></svg>OUTSIDE OUR SCOPE</h4>
              <ul>
                <li className="no"><OutX />Investment advice</li>
                <li className="no"><OutX />Trade execution or signals</li>
                <li className="no"><OutX />Buy/sell recommendations</li>
                <li className="no"><OutX />Managed trading</li>
                <li className="no"><OutX />Guaranteed profitability claims</li>
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

      <ContactAnimated />
      <Footer />
    </div>
  );
}
