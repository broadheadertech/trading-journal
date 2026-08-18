import Link from 'next/link';
import LandingNav from '@/components/landing/LandingNav';
import Footer from '@/components/landing/Footer';

export default function ChangelogPage() {
  return (
    <div className="atlas-site">
      <LandingNav />

      <div className="phero" style={{ '--band': '400px', padding: '148px 0 0' } as React.CSSProperties}>
        <div className="panelgrid"></div>
        <div className="wrap">
          <h1>Changelog</h1>
          <p className="sub" style={{ marginTop: '20px', paddingLeft: '3px' }}>What we’ve shipped recently — features, fixes, and platform improvements.</p>
        </div>
      </div>

      <div style={{ borderTop: '1px solid var(--line)', marginTop: '72px' }}>
        <div className="wrap">
          <div className="timeline">
            <div className="rel latest">
              <span className="ring"></span><span className="node"></span>
              <div className="when"><b>2026-05-04</b><span className="pill">LATEST</span></div>
              <div className="body">
                <h3>Brokers &amp; Affiliate pages</h3>
                <ul>
                  <li><i></i><span>Dedicated /brokers page listing 46+ supported broker tiles across crypto, forex, stocks, and prop firms</span></li>
                  <li><i></i><span>New affiliate program at /affiliate with 30/40/50% recurring commission tiers and lifetime payouts</span></li>
                  <li><i></i><span>Nav and footer updated to surface both routes</span></li>
                </ul>
              </div>
            </div>
            <div className="rel">
              <span className="node"></span>
              <div className="when"><b>2026-05-01</b></div>
              <div className="body">
                <h3>Launch preparation &amp; content sprint</h3>
                <ul>
                  <li><i></i><span>120+ blog articles published with category, search, and popular-article surfacing</span></li>
                  <li><i></i><span>Sample-data onboarding tour for first-time accounts</span></li>
                  <li><i></i><span>Improved demo page with five alternating feature blocks</span></li>
                </ul>
              </div>
            </div>
            <div className="rel">
              <span className="node"></span>
              <div className="when"><b>2026-04-22</b></div>
              <div className="body">
                <h3>Teams, email sequences &amp; accessibility</h3>
                <ul>
                  <li><i></i><span>Full-scale Teams workspace with shared playbooks and reviewer roles</span></li>
                  <li><i></i><span>Onboarding email sequences for new sign-ups</span></li>
                  <li><i></i><span>WCAG AA color-contrast pass across landing and app surfaces</span></li>
                </ul>
              </div>
            </div>
            <div className="rel">
              <span className="node"></span>
              <div className="when"><b>2026-04-09</b></div>
              <div className="body">
                <h3>Conversion &amp; SEO optimization</h3>
                <ul>
                  <li><i></i><span>Enhanced 404 pages with smart article suggestions</span></li>
                  <li><i></i><span>Structured data and Atom feed for the blog</span></li>
                  <li><i></i><span>Comparison pages for top trading-journal alternatives</span></li>
                </ul>
              </div>
            </div>
            <div className="rel">
              <span className="node"></span>
              <div className="when"><b>2026-03-27</b></div>
              <div className="body">
                <h3>Import engine &amp; broker support</h3>
                <ul>
                  <li><i></i><span>67 YAML-driven CSV broker definitions with auto-detection</span></li>
                  <li><i></i><span>5 live API connectors (Binance, Bybit, OKX, Alpaca, OANDA)</span></li>
                  <li><i></i><span>Idempotent import pipeline with deterministic deduplication hashes</span></li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="pcta" style={{ marginTop: '108px' }}>
        <div className="gridwash"></div><div className="glow"></div>
        <div className="wrap">
          <h2>Try the latest build</h2>
          <p className="sub mid" style={{ marginTop: '8px' }}>14-day free trial. No credit card. Setup in 60 seconds.</p>
          <div className="row" style={{ marginTop: '23px' }}><Link className="btn btn-amber" href="/pricing">Start Free Trial<svg className="arrow-r" viewBox="0 0 12 9" fill="none"><path d="M0 4.5 H12 M12 4.5 L7 0 M12 4.5 L7 9" stroke="#0a0a0a" strokeWidth="1.7" strokeLinecap="round" /></svg></Link></div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
