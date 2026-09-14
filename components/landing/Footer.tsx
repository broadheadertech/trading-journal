'use client';

import Link from 'next/link';

export default function Footer() {
  return (
    /* ============================= FOOTER ============================= */
    <footer className="footer">
      <div className="wrap">
        <div className="footcols">
          <div className="foot-brand">
            <Link href="/" style={{ display: 'flex', alignItems: 'center' }} aria-label="Atlas home">
              {/* plain <img>, deliberately not next/image — its optimizer
                  pipeline (srcset + lazy-loading heuristics) was never
                  actually delivering this file to the browser, even with
                  loading="eager" set; a direct request removes every one
                  of those moving parts */}
              <img src="/atlasnewslogo1banner.png" alt="Atlas" style={{ display: 'block', height: '42px', width: 'auto' }} />
            </Link>
            <p>Find the trading mistakes costing you thousands &mdash; and prove you fixed them.</p>
            <div className="news">
              <h5>NEWSLETTER</h5>
              <p>Weekly insights from the trading desk. No spam.</p>
              <form onSubmit={(e) => e.preventDefault()}>
                <input type="email" placeholder="you@email.com" aria-label="Email address" />
                <button type="submit">Subscribe</button>
              </form>
            </div>
          </div>

          <div className="footcol">
            <h5>PRODUCT</h5>
            <span className="dead">Features</span>
            <span className="dead">How It Works</span>
            <Link href="/pricing">Pricing</Link>
            <Link href="/integrations">Integrations</Link>
            <Link href="/use-cases">Use Cases</Link>
            <Link href="/demo">Interactive Demo</Link>
          </div>

          <div className="footcol">
            <h5>COMPANY</h5>
            <Link href="/about">About</Link>
            <Link href="/security">Security</Link>
            <Link href="/contact">Contact</Link>
            <Link href="/blog">Blog</Link>
            <Link href="/brokers">Brokers</Link>
            <Link href="/affiliate">Affiliate</Link>
            <Link href="/changelog">Changelog</Link>
          </div>

          <div className="footcol">
            <h5>FREE TOOLS</h5>
            <span className="dead">Position Size Calculator</span>
            <span className="dead">Risk/Reward Calculator</span>
            <span className="dead">Economic Calendar</span>
            <span className="dead">World Monitoring</span>
          </div>

          <div className="footcol">
            <h5>POPULAR ARTICLES</h5>
            <Link href="/blog">What Is Revenge Trading?</Link>
            <Link href="/blog">The Hidden Cost of Overtrading</Link>
            <Link href="/blog">Find Your Worst Trading Hours</Link>
            <Link href="/blog">Journal vs Behavioral Analytics</Link>
            <Link href="/blog">50 Trading Metrics Guide</Link>
          </div>
        </div>

        <div className="footbar">
          <span>&copy; 2026 Atlas. All rights reserved.</span>
          <nav>
            <span className="dead">Privacy Policy</span>
            <span className="dead">Terms of Service</span>
            <span className="dead">Risk Disclosure</span>
            <span className="dead">Cookie Policy</span>
          </nav>
        </div>
      </div>
    </footer>
  );
}
