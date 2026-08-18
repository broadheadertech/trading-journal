'use client';

import type { CSSProperties } from 'react';
import { useState } from 'react';
import Link from 'next/link';
import LandingNav from '@/components/landing/LandingNav';
import Footer from '@/components/landing/Footer';

const FAQ = [
  { q: 'How long does the cookie last?', a: '90 days. If someone clicks your link and signs up within 90 days, you get credited.' },
  { q: 'When do I get paid?', a: 'Monthly, on the 5th of every month, for the previous month’s validated referrals. Minimum payout is $50.' },
  { q: 'Is the commission really lifetime?', a: 'Yes. As long as your referral keeps their Atlas subscription active, you keep earning the commission percentage.' },
  { q: 'Can I run paid ads?', a: 'Yes, but not on branded keywords (e.g., “Atlas”, “Atlas review”). Full guidelines in the affiliate agreement.' },
  { q: 'Do you offer custom deals for large audiences?', a: 'Absolutely. If you have 10K+ engaged trader followers, reach out for an Ambassador-tier conversation.' },
];

export default function AffiliatePage() {
  const [openFaq, setOpenFaq] = useState<number[]>([0]);

  const toggleFaq = (i: number) =>
    setOpenFaq(prev => (prev.includes(i) ? prev.filter(n => n !== i) : [...prev, i]));

  const scrollToTiers = () => {
    document.getElementById('tiers')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="atlas-site">
      <LandingNav />

      <div className="phero" style={{ '--band': '470px', padding: '145px 0 0' } as CSSProperties}>
        <div className="panelgrid" style={{ width: '560px' }}></div>
        <div className="wrap">
          <p className="kicker" style={{ paddingLeft: '5px', marginBottom: '11px' }}>Lifetime recurring commissions</p>
          <h1 style={{ fontSize: '58px', lineHeight: '63px' }}>Get paid to share<em>Atlas</em></h1>
          <p className="sub" style={{ marginTop: '32px' }}>Earn 30–50% recurring commission on every trader you refer. Lifetime. No caps. Monthly payouts.</p>
          <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', marginTop: '34px' }}>
            <Link className="btn btn-amber" href="/pricing">Become an Affiliate<svg className="arrow-r" viewBox="0 0 12 9" fill="none"><path d="M0 4.5 H12 M12 4.5 L7 0 M12 4.5 L7 9" stroke="#0a0a0a" strokeWidth="1.7" strokeLinecap="round" /></svg></Link>
            <button className="btn btn-ghost" onClick={scrollToTiers}>See commission tiers</button>
          </div>
        </div>
      </div>

      <div style={{ borderTop: '1px solid var(--line)', marginTop: '42px' }}>
        <div className="wrap">
          <div className="bignums">
            <div className="bignum"><b>50%</b><i></i><span>TOP COMMISSION</span></div>
            <div className="bignum"><b>90d</b><i></i><span>COOKIE WINDOW</span></div>
            <div className="bignum"><b>∞</b><i></i><span>LIFETIME PAYOUTS</span></div>
            <div className="bignum"><b>$50</b><i></i><span>MINIMUM PAYOUT</span></div>
          </div>

          <hr className="inset-rule" style={{ marginTop: '97px' }} />
          <h2 style={{ fontFamily: 'var(--display)', fontWeight: '700', fontSize: '40px', lineHeight: '44px', margin: '19px 0 0' }}>How it works</h2>
          <p className="lede-lg" style={{ marginTop: '16px' }}>Three steps from sign-up to your first payout.</p>
          <div className="howsteps">
            <div className="howstep"><i className="tick" style={{ background: 'var(--teal)' }}></i><i className="dot" style={{ background: 'var(--teal)' }}></i><span className="n" style={{ color: 'var(--teal)' }}>STEP 1</span>
              <h4>Get your link</h4><p>Sign up free, grab your unique referral link from the affiliate dashboard.</p></div>
            <div className="howstep"><i className="tick" style={{ background: 'var(--teal)' }}></i><i className="dot" style={{ background: 'var(--teal)' }}></i><span className="n" style={{ color: 'var(--teal)' }}>STEP 2</span>
              <h4>Share with traders</h4><p>Drop the link in Twitter, YouTube, Discord, blogs — anywhere traders gather.</p></div>
            <div className="howstep"><i className="tick" style={{ background: 'var(--amber)' }}></i><i className="dot" style={{ background: 'var(--amber)' }}></i><span className="n" style={{ color: 'var(--amber)' }}>STEP 3</span>
              <h4>Earn recurring</h4><p>Get paid every month they stay subscribed. Lifetime commissions, no caps.</p></div>
          </div>
        </div>
      </div>

      <div id="tiers" style={{ borderTop: '1px solid var(--line)', marginTop: '44px', paddingTop: '55px' }}>
        <div className="wrap">
          <hr className="inset-rule" />
          <h2 style={{ fontFamily: 'var(--display)', fontWeight: '700', fontSize: '40px', lineHeight: '44px', margin: '19px 0 0' }}>Commission tiers</h2>
          <p className="lede-lg" style={{ marginTop: '16px' }}>Earn more as you grow. Tiers unlock automatically.</p>
          <div className="tiers">
            <div className="tier">
              <p className="lbl teal" style={{ margin: '0' }}>AFFILIATE</p>
              <div className="pct"><b>30%</b><span>/ referral / month</span></div>
              <p className="cond">Recurring, lifetime</p>
              <ul>
                <li><svg width="12" height="9" viewBox="0 0 11.5 9" fill="none"><path d="M0 4.5 L4 9 L11.5 0" stroke="#2fd3c4" strokeWidth="1.6" /></svg><span>Personal referral link &amp; dashboard</span></li>
                <li><svg width="12" height="9" viewBox="0 0 11.5 9" fill="none"><path d="M0 4.5 L4 9 L11.5 0" stroke="#2fd3c4" strokeWidth="1.6" /></svg><span>Real-time click &amp; conversion tracking</span></li>
                <li><svg width="12" height="9" viewBox="0 0 11.5 9" fill="none"><path d="M0 4.5 L4 9 L11.5 0" stroke="#2fd3c4" strokeWidth="1.6" /></svg><span>Monthly payouts (PayPal / Wise / USDT)</span></li>
                <li><svg width="12" height="9" viewBox="0 0 11.5 9" fill="none"><path d="M0 4.5 L4 9 L11.5 0" stroke="#2fd3c4" strokeWidth="1.6" /></svg><span>$50 minimum payout</span></li>
              </ul>
            </div>
            <div className="tier hot">
              <p className="lbl amber" style={{ margin: '0' }}>PARTNER</p>
              <div className="pct"><b>40%</b><span>/ referral / month</span></div>
              <p className="cond">After 25 paid referrals</p>
              <ul>
                <li><svg width="12" height="9" viewBox="0 0 11.5 9" fill="none"><path d="M0 4.5 L4 9 L11.5 0" stroke="#d99405" strokeWidth="1.6" /></svg><span>Higher commission tier unlocked</span></li>
                <li><svg width="12" height="9" viewBox="0 0 11.5 9" fill="none"><path d="M0 4.5 L4 9 L11.5 0" stroke="#d99405" strokeWidth="1.6" /></svg><span>Custom landing page &amp; promo codes</span></li>
                <li><svg width="12" height="9" viewBox="0 0 11.5 9" fill="none"><path d="M0 4.5 L4 9 L11.5 0" stroke="#d99405" strokeWidth="1.6" /></svg><span>Priority affiliate support</span></li>
                <li><svg width="12" height="9" viewBox="0 0 11.5 9" fill="none"><path d="M0 4.5 L4 9 L11.5 0" stroke="#d99405" strokeWidth="1.6" /></svg><span>Co-marketing opportunities</span></li>
              </ul>
            </div>
            <div className="tier">
              <p className="lbl teal" style={{ margin: '0' }}>AMBASSADOR</p>
              <div className="pct"><b>50%</b><span>/ referral / month</span></div>
              <p className="cond">By invitation</p>
              <ul>
                <li><svg width="12" height="9" viewBox="0 0 11.5 9" fill="none"><path d="M0 4.5 L4 9 L11.5 0" stroke="#2fd3c4" strokeWidth="1.6" /></svg><span>Top-tier recurring commission</span></li>
                <li><svg width="12" height="9" viewBox="0 0 11.5 9" fill="none"><path d="M0 4.5 L4 9 L11.5 0" stroke="#2fd3c4" strokeWidth="1.6" /></svg><span>Direct line to founding team</span></li>
                <li><svg width="12" height="9" viewBox="0 0 11.5 9" fill="none"><path d="M0 4.5 L4 9 L11.5 0" stroke="#2fd3c4" strokeWidth="1.6" /></svg><span>Exclusive content &amp; early features</span></li>
                <li><svg width="12" height="9" viewBox="0 0 11.5 9" fill="none"><path d="M0 4.5 L4 9 L11.5 0" stroke="#2fd3c4" strokeWidth="1.6" /></svg><span>Revenue-share on enterprise deals</span></li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <div style={{ borderTop: '1px solid var(--line)', marginTop: '20px', paddingTop: '55px' }}>
        <div className="wrap">
          <hr className="inset-rule" />
          <h2 style={{ fontFamily: 'var(--display)', fontWeight: '700', fontSize: '44px', lineHeight: '48px', margin: '21px 0 0' }}>Frequently asked</h2>
          <div className="faq" style={{ marginTop: '94px' }}>
            {FAQ.map((f, i) => (
              <div
                key={f.q}
                className={openFaq.includes(i) ? 'faq-item open' : 'faq-item'}
                onClick={() => toggleFaq(i)}
              >
                <h4>{f.q}</h4><p>{f.a}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="pcta" style={{ marginTop: '110px' }}>
        <div className="gridwash"></div><div className="glow"></div>
        <div className="wrap">
          <h2>Ready to start earning?</h2>
          <p className="sub">Free to join. Get your link in 60 seconds. Questions? <a href="mailto:affiliates@atlas.app">affiliates@atlas.app</a></p>
          <div className="row"><Link className="btn btn-amber" href="/pricing">Become an Affiliate<svg className="arrow-r" viewBox="0 0 12 9" fill="none"><path d="M0 4.5 H12 M12 4.5 L7 0 M12 4.5 L7 9" stroke="#0a0a0a" strokeWidth="1.7" strokeLinecap="round" /></svg></Link></div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
