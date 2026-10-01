import { BROKER_MARKS } from '@/components/landing/BrokerMarks';
import type { CSSProperties } from 'react';
import Link from 'next/link';
import LandingNav from '@/components/landing/LandingNav';
import Footer from '@/components/landing/Footer';

/* Keys match the BROKER_MARKS map, so a connector cannot be listed without a
   mark to draw it with. */
const CONNECTORS = [
  { name: 'Binance', markets: 'Spot + Perp Futures' },
  { name: 'Bybit', markets: 'Spot + Derivatives' },
  { name: 'OKX', markets: 'Spot + Perp + Options' },
  { name: 'Alpaca', markets: 'US Equities + Crypto' },
  { name: 'OANDA', markets: 'Forex + CFD' },
] as const;

export default function IntegrationsPage() {
  return (
    <div className="atlas-site">
      <LandingNav />

      <div className="phero" style={{ '--band': '440px', padding: '153px 0 0' } as CSSProperties}>
        <div className="panelgrid" style={{ width: '560px' }}></div>
        <div className="wrap">
          <p className="kicker" style={{ fontWeight: '300', paddingLeft: '5px', marginBottom: '11px' }}>67+ broker &amp; exchange integrations</p>
          <h1>Connect every broker.<em>Read-only, instant.</em></h1>
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
          <h2 style={{ fontFamily: 'var(--display)', fontWeight: '600', fontSize: '40px', lineHeight: '44px', margin: '19px 0 0' }}>Live API connectors</h2>
          <p className="lede-lg" style={{ marginTop: '16px' }}>Direct read-only connections. No withdrawal, no execution access.</p>
          <div className="conns">
            {CONNECTORS.map(({ name, markets }) => {
              const Mark = BROKER_MARKS[name];
              return (
                <div className="conn" key={name}>
                  <Mark className="ic" />
                  <b>{name}</b><span>{markets}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div style={{ borderTop: '1px solid var(--line)', marginTop: '52px', paddingTop: '74px' }}>
        <div className="wrap">
          <h2 style={{ fontFamily: 'var(--display)', fontWeight: '600', fontSize: '40px', lineHeight: '44px', margin: '0' }}>Supported markets</h2>
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
