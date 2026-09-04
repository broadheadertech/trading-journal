'use client';

import type { CSSProperties } from 'react';
import { useState } from 'react';
import Link from 'next/link';
import LandingNav from '@/components/landing/LandingNav';
import Footer from '@/components/landing/Footer';
import ScrollReveal from '@/components/landing/ScrollReveal';

const FAQ: { q: string; a?: string }[] = [
  {
    q: 'Who built Atlas?',
    a: 'A small team of traders and engineers tired of journals that were either pretty notebooks or unreadable spreadsheets. We built the tool we wanted to use ourselves.',
  },
  { q: 'Where is your infrastructure hosted?' },
  { q: 'Do you ever execute trades?' },
  { q: 'What markets do you support?' },
];

export default function AboutPage() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <div className="atlas-site">
      <LandingNav />
      <ScrollReveal selector=".aboutHero" threshold={0.2} />

      <div className="phero aboutHero" style={{ '--band': '440px', padding: '140px 0 0' } as CSSProperties}>
        <div className="panelgrid"></div>
        <div className="wrap">
          <h1 className="aboutHeadline">Built to make trading<em><span className="aboutAmber">review</span> <span className="aboutAmber">measurable</span></em></h1>
          <p className="sub aboutLead" style={{ marginTop: '32px', maxWidth: '620px' }}>Atlas exists because most traders never see the dollar cost of their own behavior. We built the platform to fix that — and to make discipline something you can prove, not something you hope you have.</p>
        </div>
      </div>

      <div className="aboutPrinciples" style={{ borderTop: '1px solid var(--line)', marginTop: '72px' }}>
        <div className="wrap">
          <div className="numbered">
            <div className="np"><span className="ab-ring" /><span className="n">01</span><h4>Make trading review measurable</h4><p>Atlas turns raw trade history into evidence — costly patterns ranked by dollar impact, discipline tracked over time.</p></div>
            <div className="np"><span className="ab-ring" /><span className="n">02</span><h4>Behavioral, not advisory</h4><p>We don’t hand out signals or pick trades. We measure what already happened and quantify the gap between your plan and your execution.</p></div>
            <div className="np"><span className="ab-ring" /><span className="n">03</span><h4>Read-only by design</h4><p>Atlas never holds funds, never executes orders, never asks for withdrawal permissions. Analytics-only is a hard product boundary, not a marketing line.</p></div>
            <div className="np"><span className="ab-ring" /><span className="n">04</span><h4>Privacy-first infrastructure</h4><p>Hosted in Europe under GDPR. Idempotent imports, scoped data usage, isolated background tasks — engineered to be the safest place your trade history can live.</p></div>
          </div>

          <hr className="inset-rule" style={{ marginTop: '67px' }} />
          <div className="scope">
            <div>
              <h4 className="yes"><svg width="14" height="11" viewBox="0 0 14 11" fill="none"><path d="M0 5.5 L5 11 L14 0" stroke="#24c88a" strokeWidth="2" /></svg>WHO ATLAS IS FOR</h4>
              <ul>
                <li className="yes" style={{ fontSize: '15.5px' }}><svg width="14" height="11" viewBox="0 0 14 11" fill="none"><path d="M0 5.5 L5 11 L14 0" stroke="#24c88a" strokeWidth="2" /></svg>Active traders — crypto, futures, forex, stocks, options</li>
                <li className="yes" style={{ fontSize: '15.5px' }}><svg width="14" height="11" viewBox="0 0 14 11" fill="none"><path d="M0 5.5 L5 11 L14 0" stroke="#24c88a" strokeWidth="2" /></svg>Prop firm traders working toward funded accounts</li>
                <li className="yes" style={{ fontSize: '15.5px' }}><svg width="14" height="11" viewBox="0 0 14 11" fill="none"><path d="M0 5.5 L5 11 L14 0" stroke="#24c88a" strokeWidth="2" /></svg>Trading coaches reviewing student performance</li>
                <li className="yes" style={{ fontSize: '15.5px' }}><svg width="14" height="11" viewBox="0 0 14 11" fill="none"><path d="M0 5.5 L5 11 L14 0" stroke="#24c88a" strokeWidth="2" /></svg>Trading teams enforcing playbook discipline at scale</li>
              </ul>
            </div>
            <div>
              <h4 className="no"><svg width="11" height="11" viewBox="0 0 11 11" fill="none"><path d="M0 0 L11 11 M11 0 L0 11" stroke="#5c6b7e" strokeWidth="1.6" /></svg>OUTSIDE OUR SCOPE</h4>
              <ul>
                <li className="no" style={{ fontSize: '15.5px' }}><svg width="11" height="11" viewBox="0 0 11 11" fill="none"><path d="M0 0 L11 11 M11 0 L0 11" stroke="#3a4a5c" strokeWidth="1.6" /></svg>Auto-trading or copy-trading</li>
                <li className="no" style={{ fontSize: '15.5px' }}><svg width="11" height="11" viewBox="0 0 11 11" fill="none"><path d="M0 0 L11 11 M11 0 L0 11" stroke="#3a4a5c" strokeWidth="1.6" /></svg>Buy/sell signals or trade picks</li>
                <li className="no" style={{ fontSize: '15.5px' }}><svg width="11" height="11" viewBox="0 0 11 11" fill="none"><path d="M0 0 L11 11 M11 0 L0 11" stroke="#3a4a5c" strokeWidth="1.6" /></svg>Guaranteed-profit promises</li>
                <li className="no" style={{ fontSize: '15.5px' }}><svg width="11" height="11" viewBox="0 0 11 11" fill="none"><path d="M0 0 L11 11 M11 0 L0 11" stroke="#3a4a5c" strokeWidth="1.6" /></svg>Broker, execution, or custody services</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <div style={{ borderTop: '1px solid var(--line)', marginTop: '52px', paddingTop: '55px' }}>
        <div className="wrap">
          <hr className="inset-rule" />
          <h2 style={{ fontFamily: 'var(--display)', fontWeight: 600, fontSize: '48px', lineHeight: '52px', margin: '35px 0 0' }}>Frequently asked</h2>
          <div className="faq">
            {FAQ.map((f, i) => {
              const isOpen = f.a ? open === i : false;
              return (
                <div
                  key={f.q}
                  className={isOpen ? 'faq-item open' : 'faq-item'}
                  onClick={() => { if (f.a) setOpen(isOpen ? null : i); }}
                >
                  <h4>{f.q}</h4>
                  <svg className="chev" viewBox="0 0 16 8" fill="none">
                    <path d={isOpen ? 'M0 8 L8 0 L16 8' : 'M0 0 L8 8 L16 0'} stroke={isOpen ? '#d99405' : '#7f8ea3'} strokeWidth="1.6" />
                  </svg>
                  {f.a ? <p>{f.a}</p> : null}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="pcta" style={{ marginTop: '120px' }}>
        <div className="gridwash"></div><div className="glow"></div>
        <div className="wrap">
          <h2>See your own dashboard</h2>
          <p className="sub">14-day free trial. No credit card. Setup in 60 seconds.</p>
          <div className="row">
            <Link className="btn btn-amber" href="/pricing">Start Free Trial<svg className="arrow-r" viewBox="0 0 12 9" fill="none"><path d="M0 4.5 H12 M12 4.5 L7 0 M12 4.5 L7 9" stroke="#0a0a0a" strokeWidth="1.7" strokeLinecap="round" /></svg></Link>
            <Link className="btn btn-ghost" href="/demo">See Demo</Link>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
