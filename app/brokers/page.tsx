'use client';

import type { CSSProperties } from 'react';
import Link from 'next/link';
import LandingNav from '@/components/landing/LandingNav';
import Footer from '@/components/landing/Footer';

function scrollTo(id: string) {
  const t = document.getElementById(id);
  if (t) t.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

export default function BrokersPage() {
  return (
    <div className="atlas-site">
      <LandingNav />

      <div className="phero" style={{ '--band': '430px', padding: '145px 0 0' } as CSSProperties}>
        <div className="panelgrid" style={{ width: '560px' }}></div>
        <div className="wrap">
          <p className="kicker" style={{ paddingLeft: '2px', marginBottom: '14px' }}>67+ supported brokers &amp; exchanges</p>
          <h1>Connect every broker you<em>already trade on</em></h1>
          <p className="sub" style={{ marginTop: '32px' }}>Crypto, forex, stocks, futures, prop firms — Atlas speaks the language of every major broker. Read-only, secure, and instant.</p>
          <div className="dirlist">
            <p className="hd">DIRECTORY</p>
            <a role="button" tabIndex={0} onClick={() => scrollTo('crypto')} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') scrollTo('crypto'); }}>CRYPTO EXCHANGES</a>
            <a role="button" tabIndex={0} onClick={() => scrollTo('forex')} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') scrollTo('forex'); }}>FOREX / CFD</a>
            <a role="button" tabIndex={0} onClick={() => scrollTo('stocks')} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') scrollTo('stocks'); }}>STOCKS / FUTURES</a>
            <a role="button" tabIndex={0} onClick={() => scrollTo('prop')} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') scrollTo('prop'); }}>PROP FIRMS</a>
          </div>
        </div>
      </div>

      <div style={{ borderTop: '1px solid var(--line)', marginTop: '72px' }}>
        <div className="wrap">
          <div className="bprin">
            <div><h4>Read-only API keys</h4><p>We never request withdrawal permissions. Your funds stay where they are.</p></div>
            <div><h4>Auto-sync trades</h4><p>Trades flow into Atlas within seconds of close. No manual logging.</p></div>
            <div><h4>CSV fallback</h4><p>No API? Upload a CSV from any broker — Atlas auto-detects the format.</p></div>
          </div>

          <hr className="inset-rule" style={{ marginTop: '132px' }} />
          <h2 style={{ fontFamily: 'var(--display)', fontWeight: 600, fontSize: '48px', lineHeight: '52px', margin: '19px 0 0' }}>Broker directory</h2>

          <div className="brokgroup" id="crypto" style={{ marginTop: '82px' }}>
            <div className="gh">CRYPTO EXCHANGES<em>12</em></div>
            <div className="brokgrid">
              <span className="brok">Binance</span><span className="brok">Bybit</span><span className="brok">OKX</span><span className="brok">Coinbase</span>
              <span className="brok">Kraken</span><span className="brok">KuCoin</span><span className="brok">Bitget</span><span className="brok">Gate.io</span>
              <span className="brok">MEXC</span><span className="brok">Bitfinex</span><span className="brok">Crypto.com</span><span className="brok">HTX</span>
            </div>
          </div>

          <div className="brokgroup" id="forex" style={{ marginTop: '74px' }}>
            <div className="gh">FOREX / CFD<em>12</em></div>
            <div className="brokgrid">
              <span className="brok">MetaTrader 4</span><span className="brok">MetaTrader 5</span><span className="brok">cTrader</span><span className="brok">IC Markets</span>
              <span className="brok">Pepperstone</span><span className="brok">OANDA</span><span className="brok">Forex.com</span><span className="brok">FXCM</span>
              <span className="brok">IG</span><span className="brok">Saxo Bank</span><span className="brok">XM</span><span className="brok">FxPro</span>
            </div>
          </div>

          <div className="brokgroup" id="stocks" style={{ marginTop: '74px' }}>
            <div className="gh">STOCKS / FUTURES<em>12</em></div>
            <div className="brokgrid">
              <span className="brok">Interactive Brokers</span><span className="brok">TD Ameritrade</span><span className="brok">TradeStation</span><span className="brok">NinjaTrader</span>
              <span className="brok">Tradovate</span><span className="brok">Webull</span><span className="brok">eToro</span><span className="brok">Robinhood</span>
              <span className="brok">ThinkorSwim</span><span className="brok">Tastytrade</span><span className="brok">AMP Futures</span><span className="brok">Charles Schwab</span>
            </div>
          </div>

          <div className="brokgroup" id="prop" style={{ marginTop: '74px' }}>
            <div className="gh">PROP FIRMS<em>10</em></div>
            <div className="brokgrid">
              <span className="brok prop">FTMO</span><span className="brok prop">MyForexFunds</span><span className="brok prop">Apex Trader Funding</span><span className="brok prop">Topstep</span>
              <span className="brok prop">Earn2Trade</span><span className="brok prop">The Funded Trader</span><span className="brok prop">E8 Funding</span><span className="brok prop">FundedNext</span>
              <span className="brok prop">OFP</span><span className="brok prop">TrueForexFunds</span>
            </div>
          </div>
        </div>
      </div>

      <div className="pcta" style={{ marginTop: '86px' }}>
        <div className="gridwash"></div><div className="glow"></div>
        <div className="wrap">
          <h2>Don’t see your broker?</h2>
          <p className="sub">CSV import works with any broker. We add new native integrations every month — request yours.</p>
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
