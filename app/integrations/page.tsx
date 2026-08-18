import type { CSSProperties } from 'react';
import Link from 'next/link';
import LandingNav from '@/components/landing/LandingNav';
import Footer from '@/components/landing/Footer';

export default function IntegrationsPage() {
  return (
    <div className="atlas-site">
      <LandingNav />

      <div className="phero" style={{ '--band': '440px', padding: '153px 0 0' } as CSSProperties}>
        <div className="panelgrid" style={{ width: '560px' }}></div>
        <div className="wrap">
          <p className="kicker" style={{ fontWeight: '300', paddingLeft: '5px', marginBottom: '11px' }}>67+ broker &amp; exchange integrations</p>
          <h1 style={{ fontSize: '54px', lineHeight: '59px' }}>Connect every broker.<em>Read-only, instant.</em></h1>
          <p className="sub" style={{ marginTop: '32px', maxWidth: '660px' }}>Five live API connectors plus 67+ broker CSV/XLSX formats — auto-detected and normalized into a single trade structure.</p>
          <div className="covstats">
            <p className="hd">COVERAGE</p>
            <div className="r"><b>67+</b><span>BROKER FORMATS</span></div>
            <div className="r"><b>5</b><span>LIVE API CONNECTORS</span></div>
            <div className="r"><b>8</b><span>ASSET CLASSES</span></div>
          </div>
        </div>
      </div>

      <div style={{ borderTop: '1px solid var(--line)', marginTop: '72px' }}>
        <div className="wrap">
          <div className="principles">
            <div className="principle"><h4>Live API sync</h4><p>Five direct connectors stream trades into Atlas within seconds of close. Read-only keys only — no withdrawal, no execution.</p></div>
            <div className="principle"><h4>CSV &amp; XLSX import</h4><p>Upload trade history from any broker that exports CSV or Excel. Auto-detected and auto-normalized across 67+ formats.</p></div>
            <div className="principle"><h4>Cross-market normalization</h4><p>Every trade — crypto, forex, stocks, options — lands in the same unified schema. Run analytics across portfolios, not silos.</p></div>
            <div className="principle"><h4>Idempotent re-imports</h4><p>Deterministic dedupe hashes mean you can re-import the same file safely. No phantom trades, ever.</p></div>
          </div>

          <hr className="inset-rule" style={{ marginTop: '142px' }} />
          <h2 style={{ fontFamily: 'var(--display)', fontWeight: '400', fontSize: '40px', lineHeight: '44px', margin: '19px 0 0' }}>Live API connectors</h2>
          <p className="lede-lg" style={{ marginTop: '16px' }}>Direct read-only connections. No withdrawal, no execution access.</p>
          <div className="conns">
            <div className="conn"><svg className="ic" width="24" height="24" viewBox="0 0 24 24" fill="#2fd3c4"><path d="M12 0l3.1 3.1L8.9 9.3 5.8 6.2 12 0zm6.2 6.2L21.3 9.3 12 18.6 2.7 9.3l3.1-3.1L12 12.4l6.2-6.2zM12 15.5l3.1 3.1L12 21.7l-3.1-3.1L12 15.5z" /></svg><b>Binance</b><span>Spot + Perp Futures</span></div>
            <div className="conn"><svg className="ic" width="24" height="24" viewBox="0 0 24 24" fill="#2fd3c4"><path d="M12 0L1 6v12l11 6 11-6V6L12 0zm0 3.2l8 4.4v8.8l-8 4.4-8-4.4V7.6l8-4.4z" /></svg><b>Bybit</b><span>Spot + Derivatives</span></div>
            <div className="conn"><svg className="ic" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#2fd3c4"><rect x="1" y="1" width="6.6" height="6.6" /><rect x="8.7" y="8.7" width="6.6" height="6.6" /><rect x="16.4" y="16.4" width="6.6" height="6.6" /><rect x="16.4" y="1" width="6.6" height="6.6" /><rect x="1" y="16.4" width="6.6" height="6.6" /></svg><b>OKX</b><span>Spot + Perp + Options</span></div>
            <div className="conn"><svg className="ic" width="24" height="24" viewBox="0 0 24 24" fill="#2fd3c4"><path d="M12 1c2.6 0 4.7 1.4 5.9 3.7 1.4 2.7 2 6 2 8.9 0 3.4-2.6 6.2-6 6.9l-1.1-3.3c1.9-.4 3.3-1.8 3.3-3.6 0-2.4-.5-5.1-1.6-7.2C13.8 5 12.9 4.4 12 4.4S10.2 5 9.5 6.4C8.4 8.5 7.9 11.2 7.9 13.6c0 1.8 1.4 3.2 3.3 3.6L10 20.5c-3.4-.7-6-3.5-6-6.9 0-2.9.6-6.2 2-8.9C7.3 2.4 9.4 1 12 1z" /></svg><b>Alpaca</b><span>US Equities + Crypto</span></div>
            <div className="conn"><svg className="ic" width="25" height="25" viewBox="0 0 25 25" fill="#2fd3c4"><path d="M12.5 1l10 5.5v12L12.5 24l-10-5.5v-12L12.5 1zm0 3L5 8.1v8.8l7.5 4.1 7.5-4.1V8.1L12.5 4zm0 4.2a4.3 4.3 0 110 8.6 4.3 4.3 0 010-8.6z" /></svg><b>OANDA</b><span>Forex + CFD</span></div>
          </div>
        </div>
      </div>

      <div style={{ borderTop: '1px solid var(--line)', marginTop: '52px', paddingTop: '74px' }}>
        <div className="wrap">
          <h2 style={{ fontFamily: 'var(--display)', fontWeight: '400', fontSize: '40px', lineHeight: '44px', margin: '0' }}>Supported markets</h2>
          <p className="lede-lg" style={{ marginTop: '16px' }}>Eight asset classes, one normalized schema.</p>
          <div className="markets">
            <div className="market"><h4>Crypto Spot</h4><span>12 brokers</span><div className="bar"><i style={{ width: '86%' }}></i></div></div>
            <div className="market"><h4>Crypto Futures</h4><span>10 brokers</span><div className="bar"><i style={{ width: '71%' }}></i></div></div>
            <div className="market"><h4>Forex</h4><span>14 brokers</span><div className="bar"><i style={{ width: '100%' }}></i></div></div>
            <div className="market"><h4>Equities</h4><span>12 brokers</span><div className="bar"><i style={{ width: '86%' }}></i></div></div>
            <div className="market row2"><h4>Options</h4><span>6 brokers</span><div className="bar"><i style={{ width: '43%' }}></i></div></div>
            <div className="market row2"><h4>Futures</h4><span>8 brokers</span><div className="bar"><i style={{ width: '57%' }}></i></div></div>
            <div className="market row2"><h4>CFDs</h4><span>11 brokers</span><div className="bar"><i style={{ width: '79%' }}></i></div></div>
            <div className="market row2"><h4>ETFs</h4><span>9 brokers</span><div className="bar"><i style={{ width: '64%' }}></i></div></div>
          </div>
          <hr className="hr" style={{ marginTop: '54px' }} />
          <Link className="seeall" href="/brokers">See all 67+ supported brokers
            <svg width="9" height="12" viewBox="0 0 9 12" fill="none"><path d="M3 0 L9 6 M9 6 L3 12 M9 6 H0" stroke="#d99405" strokeWidth="1.6" /></svg>
          </Link>
        </div>
      </div>

      <div className="pcta" style={{ marginTop: '117px', paddingBottom: '132px' }}>
        <div className="gridwash"></div><div className="glow" style={{ bottom: '28px' }}></div>
        <div className="wrap">
          <h2 className="semi">Don’t see your broker?</h2>
          <p className="sub">Email <a href="mailto:ops@atlas.app">ops@atlas.app</a> with a sample export. We aim to add new formats within 48 hours.</p>
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
